/*
 * This implementation was based in part on
 * https://github.com/joyent/node-http-signature
 * Copyright 2012 Joyent, Inc.  All rights reserved.
 *
 * Copyright (c) 2018-2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import {
  decodeDict,
  encodeDict,
  encodeItem,
  encodeList,
  decodeList
} from 'structured-field-values';
import HttpSignatureError from './HttpSignatureError.js';
import check from 'check-types';
import Url from './url.js';

// expose HttpSignatureError class for use in other modules
const api = {HttpSignatureError};

/**
 * Iterates over all keys in an object (not recursive)
 * and lower cases them.
 *
 * @param {object} obj - Any javascript object.
 *
 * @returns {object} A new object with the keys lowercased.
 */
function lowerCaseObjectKeys(obj) {
  const newObject = {};
  for(const k of Object.keys(obj)) {
    newObject[k.toLowerCase()] = obj[k];
  }
  return newObject;
}

// these fields do not fetch values directly
// from the HTTP message's header
const specialityContentFields = [
  '@request-target',
  '@signature-params',
  'host'
];

/**
 * Gets the values from the headers even in cases where the header field value
 * is a structured field.
 *
 * @param {object} options - Options to use.
 * @param {Array<object>} options.coveredContent - An Array containing
 *  structured list items.
 * @param {object} options.headers - Lower-cased header field names with values.
 *
 * @returns {object} An object with lower-cased header field name and parsed
 *  field values.
*/
const _getCoveredValues = ({coveredContent, headers}) => {
  const coveredValues = {};
  for(const {value, params} of coveredContent) {
    const headerFieldValue = headers[value];
    if(!(value in headers) && !specialityContentFields.includes(value)) {
      // FIXME change to http-sigs error
      throw new HttpSignatureError(
        `Failed to find header field name "${value}"`, 'DataError');
    }
    if(!params) {
      coveredValues[value] = headerFieldValue;
      continue;
    }
    // if we find a key we need to find the value in dictionary
    if(params.key) {
      const dict = decodeDict(headerFieldValue);
      if(!(params.key in dict)) {
        throw new Error(`Failed to find key ${params.key} in dictionary`);
      }
      const item = dict[params.key];
      coveredValues[value] = item.value;
      continue;
    }
    // if we find a prefix we need to find the value in the list
    if(params.prefix) {
      const list = decodeList(headerFieldValue);
      if(!Array.isArray(list)) {
        throw new TypeError(`Expected ${value} to be an Array`);
      }
      if(params.prefix >= list.length) {
        throw new Error(`${value } Prefix ${params.prefix} out of bounds.`);
      }
      coveredValues[value] = list[params.prefix];
      continue;
    }
  }
  return coveredValues;
};

/**
 * Takes in a strutured fields inner list containing a signature's inputs
 * and outputs a string to be signed.
 *
 * @param {object} options - Options to use.
 * @param {object} options.signatureInput - A structured field dictionary.
 * @param {object} options.httpMessage - A request or response message.
 *
 * @returns {string} The string to be signed.
*/
api.createSignatureInputString = ({signatureInput, httpMessage}) => {
  check.assert.object(httpMessage, 'requestOptions');
  check.assert.object(httpMessage.headers, 'requestOption.headers');
  check.assert.string(httpMessage.url, 'requestOption.url');
  const {headers, method = '', url} = httpMessage;
  const _headers = lowerCaseObjectKeys(headers);
  // FIXME structued fields library does not expose inner list serialization
  const encodeInnerList = i => {
    // take the sig and put it in a dictionary with one value
    const dict = encodeDict({dict: i});
    // remove the example key to get the inner list
    return dict.replace('dict=', '');
  };
  // @signature-params
  const sigParams = encodeInnerList(signatureInput);
  // the covered content should be a structured field list value
  const coveredContent = signatureInput.value;
  const coveredValues = _getCoveredValues({coveredContent, headers: _headers});
  // this turns a structured list into a list of strings
  const includeHeaders = coveredContent.map(item => item.value);
  const {host, path} = _parseHostAndPath(url);
  const signingString = _signingString({
    includeHeaders, headers: coveredValues, method, host,
    path, httpMessage, validate: _validateSendHeader
  });
  // append sig params to the signature string
  return `${signingString}\n"@signature-parameters": ${sigParams}`;
};

/**
 * Takes in a list of covered content and a request
 * and turns them into a canonicalized signature string.
 *
 * @param {object} [options = {}] - Options to use.
 * @param {object} options.includeHeaders - A list of covered content.
 * @param {object} options.requestOptions - A request with headers &
 *   a method.
 *
 * @returns {string} A canonicalized signature string.
*/
api.createSignatureString = ({includeHeaders = [], requestOptions} = {}) => {
  check.assert.object(requestOptions, 'requestOptions');
  check.assert.object(requestOptions.headers, 'requestOption.headers');
  check.assert.string(requestOptions.method, 'requestOption.method');
  check.assert.string(requestOptions.url, 'requestOption.url');

  // normalize headers to lowercase
  const headers = lowerCaseObjectKeys(requestOptions.headers);
  if(!includeHeaders) {
    includeHeaders = ['(created)'];
  } else {
    includeHeaders = includeHeaders.map(h => {
      if(typeof h !== 'string') {
        throw new TypeError('`includeHeaders` must be an array of Strings');
      }
      return h.toLowerCase();
    });
  }

  const {url, method = ''} = requestOptions;
  const {host, path} = _parseHostAndPath(url);
  return _signingString({
    includeHeaders, headers, method, host,
    path, requestOptions, validate: _validateSendHeader
  });
};

const _parseDictionaryHeader = (fieldName, request) => {
  const fieldValue = request.headers.get(fieldName);
  if(!fieldValue) {
    throw new Error(`Header "${fieldName}" is required`);
  }
  return decodeDict(fieldValue);
};

/**
 * Takes in a request object and options and parses & validates
 * the request creating a signature & AuthzHeader.
 *
 * @param {object} request - A request object.
 * @param {object} [options={}] - Options for parsing such as clockSkew.
 *
 * @returns {object} A parsed request with a signed header.
*/
api.parseRequest = (request, options = {}) => {
  check.assert.object(request, 'request');
  // headers make up the major of coverted content used to create a signature
  // so headers are required
  check.assert.object(request.headers, 'request.headers');
  // options are optional, but should always be an object
  check.assert.object(options, 'options');

  options.clockSkew = options.clockSkew || 300;
  // options.headers are also required, but is an array of covered content names
  check.assert.array.of.string(options.headers, 'options.headers');
  // clockSkew can't be infinite
  if(check.number(options.clockSkew)) {
    if(!Number.isFinite(options.clockSkew)) {
      throw new TypeError('options.clockSkew must be finite');
    }
  }
  // gets a structured field dictionary from the header
  const signatureInputs = _parseDictionaryHeader('Signature-Input', request);
  // gets a structured field dictionary with keys that should match inputs
  const signatures = _parseDictionaryHeader('Signature', request);
  /*
  // throw if headers is a zero-length string
  if(parsed.params.headers === '') {
    throw new HttpSignatureError(
      'The "headers" parameter must not be a zero-length string.',
      'SyntaxError');
  }
  // the signature parameter headers is optional and defaults to (created)
  if(!parsed.params.headers) {
    // latest spec (draft-ietf-httpbis-message-signatures-00) specifies this
    // as the default headers
    parsed.params.headers = ['(created)'];
  } else {
    // if the signature had a headers parameter we should be able to split it
    parsed.params.headers = parsed.params.headers.split(/\s+/);
  }
  // Minimally validate the parsed object
  if(!parsed.scheme || parsed.scheme !== 'Signature') {
    throw new HttpSignatureError('scheme was not "Signature"', 'SyntaxError');
  }
  // the key id is used to sign or verify the signature
  if(!parsed.params.keyId) {
    throw new HttpSignatureError('keyId was not specified', 'SyntaxError');
  }

  if(!parsed.params.signature) {
    throw new HttpSignatureError('signature was not specified', 'SyntaxError');
  }

  if(parsed.params.algorithm) {
    parsed.params.algorithm = parsed.params.algorithm.toLowerCase();

  }
*/
  // build the signingString
  const includeHeaders = parsed.params.headers;
  for(let i = 0; i < includeHeaders.length; i++) {
    // the first step in canonicalization is to lower case all the header names
    includeHeaders[i] = includeHeaders[i].toLowerCase();
  }
  const {headers: rawHeaders, method, url} = request;
  const headers = lowerCaseObjectKeys(rawHeaders);
  // pseudo-headers are not directly headers and must be extracted
  // separately
  let requestOptions = extractPseudoHeaders(parsed.params, headers);
  // now is a unix time stamp
  const _now = options.now || Math.floor(Date.now() / 1000);
  // if (created) and/or (expires) are specified validate them using now
  requestOptions = validateDateRange(requestOptions, _now);
  const {host, path} = _parseHostAndPath(url);
  parsed.signingString = _signingString({
    includeHeaders, headers,
    method, host, path, requestOptions, validate: _validateReceiveHeader
  });
  // Check against the constraints
  if(request.headers.expires ||
    request.headers.date || request.headers['x-date']) {
    // _now is a unix timestamp so multiply by 1000 to get a valid JS Date
    const now = new Date(_now * 1000);
    if(request.headers.expires) {
      const date = new Date(request.headers.expires);
      if(now > date) {
        throw new HttpSignatureError(
          'The request has expired.', 'ConstraintError');
      }
    } else {
      let date;
      if(request.headers['x-date']) {
        date = new Date(request.headers['x-date']);
      } else {
        date = new Date(request.headers.date);
      }
      const skew = Math.abs(now.getTime() - date.getTime());
      if(skew > options.clockSkew * 1000) {
        throw new HttpSignatureError('Clock skew of ' +
          (skew / 1000) + 's was greater than ' +
          options.clockSkew + 's', 'ConstraintError');
      }
    }
  }

  options.headers.forEach(hdr => {
    // Remember that we already checked any headers in the params
    // were in the request, so if this passes we're good.
    if(parsed.params.headers.indexOf(hdr.toLowerCase()) < 0) {
      throw new HttpSignatureError(
        hdr + ' was not a signed header', 'SyntaxError');
    }
  });

  parsed.algorithm = parsed.params.algorithm ?
    parsed.params.algorithm.toUpperCase() : undefined;
  parsed.keyId = parsed.params.keyId;
  return parsed;
};

function _validateSendHeader(header, value) {
  if(value === undefined) {
    throw new HttpSignatureError(
      header + ' was not found in `requestOptions.headers`', 'DataError');
  }
  if(header.startsWith('(')) {
    throw new HttpSignatureError(`Illegal header "${header}"; ` +
      'headers must not start with "(".');
  }
}

function _validateReceiveHeader(header, value) {
  if(value === undefined) {
    throw new HttpSignatureError(
      header + ' was not in the request', 'SyntaxError');
  }
}

function addValue({result, validate, key, values, label}) {
  let value = values[key];
  validate(key, value);
  if(Array.isArray(value)) {
    value = value.join(', ');
  }
  if(value instanceof Date) {
    // only created & expires have to be unix timestamps
    if(label in ['created', 'expires']) {
      value = Math.floor(value.getTime() / 1000);
    } else {
      // normal Headers are UTC Time Strings
      value = value.toUTCString();
    }
  }
  // trim the string so it conforms to
  // HTTP Signatures spec v 11 section 2.3 step 4.2
  // header value (after removing leading and trailing whitespace)
  if(typeof value === 'string') {
    value = value.trim();
  }
  result.push(`"${label || key}": ${value}`);
}

function _signingString({
  includeHeaders, headers, method,
  host, path, httpMessage, validate
}) {
  const {alg} = httpMessage;
  // we need to check that the covered content
  // is allowed by the algorithm
  validateByAlgorithm(alg, includeHeaders);
  const result = [];
  for(const h of includeHeaders) {
    if(h === '@request-target') {
      result.push(`"@request-target": ${method.toLowerCase()} ${path || '/'}`);
    } else if(h === 'host' && host) {
      result.push(`"host": ${host}`);
    } else {
      if(h in specialityContentFields) {
        addValue({
          result, validate, key: specialityContentFields[h],
          values: httpMessage, label: h
        });
      } else {
        addValue({result, validate, key: h, values: headers});
      }
    }
  }
  // 2.5 step 5 Append a single new line "\\n"
  return result.join('\n');
}

function _parseHostAndPath(url) {
  // handle relative URLs w/absolute path and special case `*` as these are
  // acceptable in the HTTP request line
  if(url.startsWith('/') || url === '*') {
    return {
      host: null,
      path: url
    };
  }

  try {
    const u = new Url(url);
    const {host, pathname, search} = u;
    return {host, path: pathname + search};
  } catch(e) {
    // throw invalid URL error
    throw new HttpSignatureError(
      `An invalid url "${url}" was specified.`, 'SyntaxError');
  }
}

/**
 * Validates a single potential unix time stamp or Javascript date.
 *
 * @param {string|number|Date} date - A potential unix timestamp or js Date.
 * @param {'created'|'expires'} key - An identifier for the date.
 *
 * @throws {TypeError} Throws if the date is invalid.
 *
 * @returns {undefined|null|number} Returns a number if there was a valid
 *  date passed in and undefined or null if there was no date.
*/
function validateDate(date, key) {
  // created & expires are not required
  if(date === undefined || date === null) {
    return date;
  }
  if(date instanceof Date) {
    const timestamp = date.getTime() / 1000;
    if(key === 'created' || key === 'expires') {
      return Math.floor(timestamp);
    }
    throw new TypeError(`Unknown date pseudo-header "${key}".`);
  }
  if(Number.isInteger(date)) {
    // we assume the integer is a unix time stamp
    return date;
  }
  if(typeof date === 'string') {
    // we assume this is a unix time stamp too
    const number = Number(date);
    if(Number.isInteger(number)) {
      return number;
    }
  }
  throw new TypeError(
    `"${key}" must be a UNIX timestamp or JavaScript Date.`);
}

/**
 * Ensures the given algorithm and the headers parameters from the signature
 * are compatible with one another.
 *
 * @param {string} [algorithm=''] - The algorithm from the signature.
 * @param {Array<string>} [includeHeaders=[]] - The covered content from
 *   the signature.
 *
 * @throws {HttpSignatureError} - If the includeHeaders contains a header
 *   not allowed by the algorithm.
 *
 * @returns {boolean} Is the algorithm valid?
*/
function validateByAlgorithm(algorithm = '', includeHeaders = []) {
  // algorithm is optional so no need to check if not specified
  if(!algorithm) {
    return true;
  }
  // these 3 older algorithms can not use some pseudo-headers
  const olderAlgorithms = [/^rsa/i, /^hmac/i, /^ecdsa/i];
  // in order to prevent an attack with an extremely long string
  // we only use the first 5 characters after a trim
  const algorithmStart = algorithm.trim().substr(0, 5);
  for(const check of olderAlgorithms) {
    if(check.test(algorithmStart)) {
      if(includeHeaders.includes('(created)')) {
        throw new HttpSignatureError(
          `Algorithm ${algorithm} does not support "(created)".`,
          'SyntaxError');
      }
      if(includeHeaders.includes('(expires)')) {
        throw new HttpSignatureError(
          `Algorithm ${algorithm} does not support "(expires)".`,
          'SyntaxError');
      }
    }
  }
  return true;
}

/**
 * Ensures date based psuedo-headers are valid timestamps and
 *  are not invalid or expired.
 *
 * @param {object} options - Options to use.
 * @param {number} now - A unix timestamp to use as the current time.
 *
 * @returns {object} Formatted options.
*/
function validateDateRange(options, now) {
  // shallow copy options
  options = {...options};
  const possibleCreated = validateDate(options.created, 'created');
  if(typeof possibleCreated === 'number') {
    if(options.created > now) {
      throw new Error(
        'Invalid signature; the signature creation time is in the future.');
    }
    options.created = possibleCreated;
  }
  const possibleExpires = validateDate(options.expires, 'expires');
  if(typeof possibleExpires === 'number') {
    if(options.expires < now) {
      throw new Error('The signature has expired.');
    }
    options.expires = possibleExpires;
  }
  return options;
}

export default api;
