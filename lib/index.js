/*!
 * This implementation was based in part on
 * https://github.com/joyent/node-http-signature
 * Copyright 2012 Joyent, Inc.  All rights reserved.
 *
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const assert = require('assert-plus');
const url = require('url');
const HttpSignatureError = require('./HttpSignatureError');

const api = {};

module.exports = api;

api.createAuthzHeader = ({algorithm, includeHeaders, keyId, signature}) => {
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
  return 'Signature ' +
    Object.keys(params).map(k => `${k}="${params[k]}"`).join(',');
};

api.createSignatureString = ({includeHeaders, requestOptions} = {}) => {
  assert.object(requestOptions, 'requestOptions');
  assert.object(requestOptions.headers, 'requestOption.headers');
  assert.string(requestOptions.method, 'requestOption.method');
  assert.string(requestOptions.url, 'requestOption.url');
  assert.optionalArrayOfString(includeHeaders, 'headers');

  const {headers} = requestOptions;

  if(!includeHeaders) {
    includeHeaders = [];
  }

  const {host, path} = url.parse(requestOptions.url);

  let stringToSign = '';
  for(let i = 0; i < includeHeaders.length; i++) {
    if(typeof includeHeaders[i] !== 'string') {
      throw new TypeError('`includeHeaders` must be an array of Strings');
    }

    const h = includeHeaders[i].toLowerCase();

    if(h === '(request-target)') {
      stringToSign +=
      `(request-target): ${requestOptions.method.toLowerCase()} ${path}`;
    } else if(h === 'host') {
      stringToSign += `host: ${host}`;
    } else {
      const value = getHeader(headers, h);
      if(value === undefined || value === '') {
        throw new HttpSignatureError(
          h + ' was not found in `requestOptions.headers`', 'DataError');
      }
      stringToSign += `${h}: ${value}`;
    }

    if((i + 1) < includeHeaders.length) {
      stringToSign += '\n';
    }
  }

  return stringToSign;
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

  const authz = request.headers[authzHeaderName];
  for(let i = 0; i < authz.length; i++) {
    const c = authz.charAt(i);

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

  if(!parsed.params.headers) {
    if(request.headers['x-date']) {
      parsed.params.headers = ['x-date'];
    } else {
      parsed.params.headers = ['date'];
    }
  } else {
    parsed.params.headers = parsed.params.headers.split(' ');
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

  // Build the signingString
  for(let i = 0; i < parsed.params.headers.length; i++) {
    const h = parsed.params.headers[i].toLowerCase();
    parsed.params.headers[i] = h;

    if(h === '(request-target)') {
      parsed.signingString +=
        '(request-target): ' + request.method.toLowerCase() + ' ' +
        request.url;
    } else {
      const value = request.headers[h];
      if(value === undefined) {
        throw new HttpSignatureError(
          h + ' was not in the request', 'SyntaxError');
      }
      parsed.signingString += h + ': ' + value;
    }

    if((i + 1) < parsed.params.headers.length) {
      parsed.signingString += '\n';
    }
  }

  // Check against the constraints
  let date;
  if(request.headers.date || request.headers['x-date']) {
    if(request.headers['x-date']) {
      date = new Date(request.headers['x-date']);
    } else {
      date = new Date(request.headers.date);
    }
    const now = new Date();
    const skew = Math.abs(now.getTime() - date.getTime());

    if(skew > options.clockSkew * 1000) {
      throw new HttpSignatureError('clock skew of ' +
        (skew / 1000) + 's was greater than ' +
        options.clockSkew + 's', 'SyntaxError');
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

// case insensitive search for headers
function getHeader(headers, key) {
  const t = Object.keys(headers).find(
    k => k.toLowerCase() === key.toLowerCase());
  if(!t) {
    return;
  }
  return headers[t];
}
