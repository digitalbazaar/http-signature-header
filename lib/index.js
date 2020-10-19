/*
 * This implementation was based in part on
 * https://github.com/joyent/node-http-signature
 * Copyright 2012 Joyent, Inc.  All rights reserved.
 *
 * Copyright (c) 2018-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const env = require('./env');
let assert;
let Url;
if(env.nodejs) {
  assert = require('assert-plus');
  Url = require('url').URL;
} else {
  Url = URL;
  // assertions disabled in browsers
  assert = new Proxy({}, {
    get() {
      return () => {};
    }
  });
}
const HttpSignatureError = require('./HttpSignatureError');

// expose HttpSignatureError class for use in other modules
const api = {HttpSignatureError};

module.exports = api;

/**
 * Parses either an Authorization or Signature header.
 *
 * @param {string} sigString - A string containing the full header value.
 *
 * @returns {Object} Parsed options.
 */
function parseSignatureHeader(sigString) {
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

api.parseSignatureHeader = parseSignatureHeader;

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
 * @param {Object} params - Signature parameters.
 * @param {Object} requestOptions - A parsed request.
 *
 * @returns {Object} Headers.
 */
function extractPseudoHeaders(params, requestOptions) {
  for(const key of Object.values(PSEUDO_HEADERS)) {
    if(key in params) {
      requestOptions[key] = params[key];
    }
  }
  return requestOptions;
}
api.extractPseudoHeaders = extractPseudoHeaders;

api.createAuthzHeader = (
  {algorithm, includeHeaders, keyId, signature, created, expires}) => {
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
  const dates = validateDates({created, expires});
  if((typeof dates.created) == 'number') {
    params.created = dates.created;
  }
  if((typeof dates.expires) === 'number') {
    params.expires = dates.expires;
  }
  return 'Signature ' +
    Object.keys(params).map(k => `${k}="${params[k]}"`).join(',');
};

/**
 * Iterates over all keys in an object (not recursive)
 * and lower cases them.
 *
 * @param {Object} obj - Any javascript object.
 *
 * @returns {Object} A new object with the keys lowercased.
 */
function lowerCaseObjectKeys(obj) {
  const newObject = {};
  for(const k of Object.keys(obj)) {
    newObject[k.toLowerCase()] = obj[k];
  }
  return newObject;
}

function validateDate(date, key) {
  // created & expires are not required
  if((date === undefined) || (date === null)) {
    return date;
  }
  if(date instanceof Date) {
    return (Math.round(date.getTime() / 1000));
  } else if(Number.isInteger(date)) {
    // we need to accept that the integer is a unix time stamp
    return date;
  } else if(typeof(date) === 'string') {
    // we assume this is a unix time stamp too
    const number = Number(date);
    if(!Number.isNaN(number)) {
      return number;
    }
  } else {
    throw new TypeError(
      `"${key}" must be a UNIX timestamp or JavaScript Date.`);
  }
}

/**
 * Validates and formats date psuedo-headers.
 *
 * @param {Object} options - Options to use.
 *
 * @returns {Object} Formatted options.
*/
function validateDates(options) {
  // we need now in seconds
  const now = Math.round(Date.now() / 1000);
  // created could be a number
  const possibleCreated = validateDate(options.created, 'created');
  if(typeof(possibleCreated) === 'number') {
    if(possibleCreated > now) {
      throw new Error(
        'Invalid created. Your created psuedo-header is in the future');
    }
    options.created = possibleCreated;
  }
  // expires could be a number
  const possibleExpires = validateDate(options.expires, 'expires');
  if(typeof(possibleExpires) === 'number') {
    if(possibleExpires < now) {
      throw new Error('Your signature has expired.');
    }
    options.expires = possibleExpires;
  }
  return options;
}

api.createSignatureString = ({includeHeaders, requestOptions} = {}) => {
  assert.object(requestOptions, 'requestOptions');
  assert.object(requestOptions.headers, 'requestOption.headers');
  assert.string(requestOptions.method, 'requestOption.method');
  assert.string(requestOptions.url, 'requestOption.url');
  assert.optionalArrayOfString(includeHeaders, 'headers');
  validateDates(requestOptions);
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

api.parseRequest = (request, options) => {
  assert.object(request, 'request');
  assert.object(request.headers, 'request.headers');
  if(options === undefined) {
    options = {};
  }
  if(options.headers === undefined) {
    options.headers = [request.headers['x-date'] ? 'x-date' : 'date'];
  }
  assert.object(options, 'options');
  assert.arrayOfString(options.headers, 'options.headers');
  assert.optionalFinite(options.clockSkew, 'options.clockSkew');

  const authzHeaderName = options.authorizationHeaderName || 'authorization';

  if(!request.headers[authzHeaderName]) {
    throw new HttpSignatureError('no ' + authzHeaderName + ' header ' +
      'present in the request', 'SyntaxError');
  }

  options.clockSkew = options.clockSkew || 300;
  const authz = request.headers[authzHeaderName];
  const parsed = parseSignatureHeader(authz);

  if(!parsed.params.headers) {
    if(request.headers['x-date']) {
      parsed.params.headers = ['x-date'];
    } else {
      parsed.params.headers = ['date'];
    }
  } else {
    parsed.params.headers = parsed.params.headers.split(/\s+/);
  }

  // Minimally validate the parsed object
  if(!parsed.scheme || parsed.scheme !== 'Signature') {
    throw new HttpSignatureError('scheme was not "Signature"', 'SyntaxError');
  }
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
    includeHeaders[i] = includeHeaders[i].toLowerCase();
  }
  const {headers: rawHeaders, method, url} = request;
  const headers = lowerCaseObjectKeys(rawHeaders);
  const requestOptions = extractPseudoHeaders(parsed.params, headers);
  const {host, path} = _parseHostAndPath(url);
  parsed.signingString = _signingString({
    includeHeaders, headers,
    method, host, path, requestOptions, validate: _validateReceiveHeader
  });

  // Check against the constraints
  if(request.headers.expires ||
    request.headers.date || request.headers['x-date']) {
    const now = new Date();
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
    // only PSEUDO_HEADERS created & expires have to be unix timestamps
    if(label in PSEUDO_HEADERS) {
      value = value.getTime();
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
