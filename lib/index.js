/*
 * This implementation was based in part on
 * https://github.com/joyent/node-http-signature
 * Copyright 2012 Joyent, Inc.  All rights reserved.
 *
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
const Url = URL;
import {assert} from './util.js';

import {HttpSignatureError} from './HttpSignatureError.js';

export {HttpSignatureError};

/**
 * Parses either an Authorization or Signature header.
 *
 * @param {string} sigString - A string containing the full header value.
 *
 * @returns {object} Parsed options.
 */
export function parseSignatureHeader(sigString) {
  assert.string(sigString, 'sigString');

  const ParamsState = {
    Name: 0,
    Quote: 1,
    Value: 2,
    Comma: 3
  };

  const State = {
    New: 0,
    Params: 1
  };

  let state = State.New;
  let substate = ParamsState.Name;
  let tmpName = '';
  let tmpValue = '';

  const parsed = {
    scheme: '',
    params: {},
    signingString: ''
  };

  for(let i = 0; i < sigString.length; i++) {
    const c = sigString.charAt(i);

    switch(Number(state)) {

      case State.New:
        if(c !== ' ') {
          parsed.scheme += c;
        } else {
          state = State.Params;
        }
        break;

      case State.Params:
        switch(Number(substate)) {

          case ParamsState.Name:
            const code = c.charCodeAt(0);
            // restricted name of A-Z / a-z
            if((code >= 0x41 && code <= 0x5a) || // A-Z
                (code >= 0x61 && code <= 0x7a)) { // a-z
              tmpName += c;
            } else if(c === '=') {
              if(tmpName.length === 0) {
                throw new HttpSignatureError('bad param format', 'SyntaxError');
              }
              substate = ParamsState.Quote;
            } else {
              throw new HttpSignatureError('bad param format', 'SyntaxError');
            }
            break;

          case ParamsState.Quote:
            if(c === '"') {
              tmpValue = '';
              substate = ParamsState.Value;
            } else {
              throw new HttpSignatureError('bad param format', 'SyntaxError');
            }
            break;

          case ParamsState.Value:
            if(c === '"') {
              parsed.params[tmpName] = tmpValue;
              substate = ParamsState.Comma;
            } else {
              tmpValue += c;
            }
            break;

          case ParamsState.Comma:
            if(c === ',') {
              tmpName = '';
              substate = ParamsState.Name;
            } else {
              throw new HttpSignatureError('bad param format', 'SyntaxError');
            }
            break;

          default:
            throw new HttpSignatureError(
              'Invalid substate', 'InvalidStateError');
        }
        break;

      default:
        throw new HttpSignatureError('Invalid substate', 'InvalidStateError');
    }

  }
  return parsed;
}

// pseudo headers from the spec
const PSEUDO_HEADERS = {
  '(created)': 'created',
  '(expires)': 'expires',
  '(algorithm)': 'algorithm',
  '(key-id)': 'keyId'
};

/**
 * Extracts any pseudo headers (see: PSEUDO_HEADERS)
 * from the parameters of a signature string.
 *
 * @param {object} params - Signature parameters.
 * @param {object} requestOptions - A parsed request.
 *
 * @returns {object} Headers.
 */
export function extractPseudoHeaders(params, requestOptions) {
  for(const key of Object.values(PSEUDO_HEADERS)) {
    if(key in params) {
      requestOptions[key] = params[key];
    }
  }
  return requestOptions;
}

/**
 * Creates an http-sig header for either a request or response.
 *
 * @param {object} options - Options to use.
 * @param {string} [options.algorithm] - A HTTP Sig algorithm.
 * @param {Array<string>} options.includeHeaders - Headers for the signature's
 *   headers parameter.
 * @param {string} options.keyId - The id of the key to verify with.
 * @param {string} options.signature - A valid http signature.
 * @param {string|number} [options.created] - A valid unix time stamp for
 *   the signature parameter (created).
 * @param {string|number} [options.expires] - A valid unix time stamp for
 *  the signature parameter (expires).
 *
 * @returns {string} A valid http signature header.
*/
export function createAuthzHeader({
  algorithm, includeHeaders, keyId, signature, created, expires
}) {
  assert.optionalString(algorithm);
  assert.string(keyId);
  assert.arrayOfString(includeHeaders);
  assert.string(signature);

  const params = {keyId};
  if(algorithm) {
    params.algorithm = algorithm;
  }
  params.headers = includeHeaders.join(' ');
  params.signature = signature;
  const _created = validateDate(created, 'created');
  if(typeof _created === 'number') {
    params.created = _created;
  }
  const _expires = validateDate(expires, 'expires');
  if(typeof _expires === 'number') {
    params.expires = _expires;
  }
  return 'Signature ' +
    Object.keys(params).map(k => `${k}="${params[k]}"`).join(',');
}

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
export function createSignatureString({includeHeaders, requestOptions} = {}) {
  assert.object(requestOptions, 'requestOptions');
  assert.object(requestOptions.headers, 'requestOption.headers');
  assert.string(requestOptions.method, 'requestOption.method');
  assert.string(requestOptions.url, 'requestOption.url');
  assert.optionalArrayOfString(includeHeaders, 'headers');

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
}

/**
 * Takes in a request object and options and parses & validates
 * the request creating a signature & AuthzHeader.
 *
 * @param {object} request - A request object.
 * @param {object} [options={}] - Options for parsing such as clockSkew.
 *
 * @returns {object} A parsed request with a signed header.
*/
export function parseRequest(request, options = {}) {
  assert.object(request, 'request');
  // headers make up the major of coverted content used to create a signature
  // so headers are required
  assert.object(request.headers, 'request.headers');
  // options are optional, but should always be an object
  assert.object(options, 'options');

  options = {...options};
  if(options.headers === undefined) {
    options.headers = ['(created)'];
  }
  if(options.clockSkew === undefined) {
    // default clock skew is 5 minutes (and units are seconds)
    options.clockSkew = 300;
  }
  // options.headers are also required, but is an array of covered content names
  assert.arrayOfString(options.headers, 'options.headers');
  // clockSkew can't be infinite
  assert.optionalFinite(options.clockSkew, 'options.clockSkew');
  // this is the header that should contain the http signature
  const authzHeaderName = options.authorizationHeaderName || 'authorization';

  if(!request.headers[authzHeaderName]) {
    throw new HttpSignatureError('no ' + authzHeaderName + ' header ' +
      'present in the request', 'SyntaxError');
  }

  // get the header with the http signature
  const authz = request.headers[authzHeaderName];
  // parse the signature returning an object
  const parsed = parseSignatureHeader(authz);
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
  requestOptions = validateDateRange(requestOptions, _now, options.clockSkew);
  const {host, path} = _parseHostAndPath(url);
  parsed.signingString = _signingString({
    includeHeaders, headers,
    method, host, path, requestOptions, validate: _validateReceiveHeader
  });
  // Check against the constraints
  if(request.headers.expires ||
    request.headers.date || request.headers['x-date']) {
    // _now is a unix timestamp (seconds) so multiply by 1000 to get a valid JS
    // Date (after subtracting clock skew which is also in seconds)
    const now = new Date((_now - options.clockSkew) * 1000);
    let expires;
    if(request.headers.expires) {
      expires = new Date(request.headers.expires);
    } else if(request.headers['x-date']) {
      expires = new Date(request.headers['x-date']);
    } else {
      expires = new Date(request.headers.date);
    }
    if(expires < now) {
      throw new HttpSignatureError(
        'The request has expired.', 'ConstraintError');
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
}

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
    // only PSEUDO_HEADERS created & expires have to be unix timestamps
    if(label in PSEUDO_HEADERS) {
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
  result.push(`${label || key}: ${value}`);
}

function _signingString({
  includeHeaders, headers, method,
  host, path, requestOptions, validate
}) {
  const {algorithm} = requestOptions;
  // we need to check that the covered content
  // is allowed by the algorithm
  validateByAlgorithm(algorithm, includeHeaders);
  const result = [];
  for(const h of includeHeaders) {
    if(h === '(request-target)') {
      result.push(`(request-target): ${method.toLowerCase()} ${path || '/'}`);
    } else if(h === 'host' && host) {
      result.push(`host: ${host}`);
    } else {
      if(h in PSEUDO_HEADERS) {
        addValue({
          result, validate, key: PSEUDO_HEADERS[h],
          values: requestOptions, label: h
        });
      } else {
        addValue({result, validate, key: h, values: headers});
      }
    }
  }
  // conform to HTTP signatures spec v 11
  // section 2.3 step 5
  // If value is not the last value then append an ASCII newline `\n`.
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
 * Ensures date based psuedo-headers are valid timestamps and are not invalid
 * or expired.
 *
 * @param {object} options - Options to use.
 * @param {number} now - A unix timestamp to use as the current time.
 * @param {number} clockSkew - The clock skew in milliseconds to apply.
 *
 * @returns {object} Formatted options.
 */
function validateDateRange(options, now, clockSkew) {
  // shallow copy options
  options = {...options};
  const possibleCreated = validateDate(options.created, 'created');
  if(typeof possibleCreated === 'number') {
    if(options.created > (now + clockSkew)) {
      throw new HttpSignatureError(
        'Invalid signature; the signature creation time is in the future.',
        'ConstraintError');
    }
    options.created = possibleCreated;
  }
  const possibleExpires = validateDate(options.expires, 'expires');
  if(typeof possibleExpires === 'number') {
    if(options.expires < (now - clockSkew)) {
      throw new HttpSignatureError(
        'The signature has expired.', 'ConstraintError');
    }
    options.expires = possibleExpires;
  }
  return options;
}
