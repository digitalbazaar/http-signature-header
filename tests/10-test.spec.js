/*!
 * Copyright (c) 2018-2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import chai from 'chai';
import {decodeDict} from 'structured-field-values';
import * as httpSignatureHeader from '../lib/index.js';
import {
  signatureInputs,
  signatures,
  requests
} from './mockData.js';

const {HttpSignatureError} = httpSignatureHeader;
chai.should();
const {expect} = chai;

describe('http-signature', () => {
  describe('createSignatureHeader', () => {
    it('should create a dictionary with one signature', () => {
      const sigs = {sig1: new Uint8Array([1, 2, 3])};
      const dict = httpSignatureHeader.createSignatureHeader(sigs);
      expect(dict).to.be.a('string');
      dict.should.be.equal('sig1=:AQID:');
    });
    it('should create a dictionary with multiple signatures', () => {
      const sigs = {
        sig1: new Uint8Array([1, 2, 3]),
        sig2: new Uint8Array([4, 5, 6])
      };
      const dict = httpSignatureHeader.createSignatureHeader(sigs);
      expect(dict).to.be.a('string');
      dict.should.be.equal('sig1=:AQID:, sig2=:BAUG:');
    });
  });
  describe('createSignatureInputHeader', () => {
    const shouldBeAnFSDict = (actualDict, expectedDict) => {
      expect(
        actualDict, 'Expected dict to be a string').to.be.a('string');
      actualDict.should.equal(expectedDict);
      // should be able to parse it
      const o = decodeDict(actualDict);
      expect(o, 'expected decoded dict to be an object').to.be.an('object');
    };
    it('encodes a single signature input with no covered content', () => {
      const dict = httpSignatureHeader.createSignatureInputHeader({
        signatures: new Map([['sig1', {coveredContent: []}]]),
        params: {alg: 'foo'}
      });
      shouldBeAnFSDict(dict, signatureInputs.empty);
    });
    it('encodes multiple signature inputs with no covered content', () => {
      const dict = httpSignatureHeader.createSignatureInputHeader({
        signatures: new Map([
          ['sig1', {coveredContent: []}],
          ['sig2', {coveredContent: []}]
        ]),
        params: {alg: 'foo'}
      });
      shouldBeAnFSDict(dict, signatureInputs.multipleEmpty);
    });
    it('encodes a single signature input with covered content' +
      ' as strings', () => {
      const dict = httpSignatureHeader.createSignatureInputHeader({
        signatures: new Map([['sig1', {coveredContent: ['one']}]]),
        params: {alg: 'foo'}
      });
      shouldBeAnFSDict(dict, signatureInputs.one);
    });
    it('encodes multiple signature inputs with covered content' +
      ' as strings', () => {
      const dict = httpSignatureHeader.createSignatureInputHeader({
        signatures: new Map([
          ['sig1', {coveredContent: ['one']}],
          ['sig2', {coveredContent: ['two']}]
        ]),
        params: {alg: 'foo'}
      });
      shouldBeAnFSDict(dict, signatureInputs.oneMultiple);
    });
    it('encodes a single signature input with covered content' +
      ' as Items with no params', () => {
      const dict = httpSignatureHeader.createSignatureInputHeader({
        signatures: new Map([['sig1', {coveredContent: [{value: 'one'}]}]]),
        params: {alg: 'foo'}
      });
      shouldBeAnFSDict(dict, signatureInputs.one);
    });
    it('encodes multiple signature inputs with covered content' +
      ' as Items with no params', () => {
      const dict = httpSignatureHeader.createSignatureInputHeader({
        signatures: new Map([
          ['sig1', {coveredContent: [{value: 'one'}]}],
          ['sig2', {coveredContent: [{value: 'two'}]}]
        ]),
        params: {alg: 'foo'}
      });
      shouldBeAnFSDict(dict, signatureInputs.oneMultiple);
    });
    it('encodes a single signature input with covered content' +
      ' as Items with prefix params', () => {
      const dict = httpSignatureHeader.createSignatureInputHeader({
        signatures: new Map([
          ['sig1', {coveredContent: [{value: 'one', params: {prefix: 3}}]}]
        ]),
        params: {alg: 'foo'}
      });
      shouldBeAnFSDict(dict, signatureInputs.onePrefix);
    });
    it('encodes multiple signature inputs with covered content' +
      ' as Items with prefix params', () => {
      const dict = httpSignatureHeader.createSignatureInputHeader({
        signatures: new Map([
          ['sig1', {coveredContent: [{value: 'one', params: {prefix: 1}}]}],
          ['sig2', {coveredContent: [{value: 'two', params: {prefix: 1}}]}]
        ]),
        params: {alg: 'foo'}
      });
      shouldBeAnFSDict(dict, signatureInputs.multiplePrefix);
    });
    it('encodes a single signature input with covered content' +
      ' as Items with key params', () => {
      const dict = httpSignatureHeader.createSignatureInputHeader({
        signatures: new Map([
          ['sig1', {coveredContent: [{value: 'one', params: {key: 'one'}}]}]
        ]),
        params: {alg: 'foo'}
      });
      shouldBeAnFSDict(dict, signatureInputs.oneKey);
    });
    it('encodes multiple signature inputs with covered content' +
      ' as Items with key params', () => {
      const dict = httpSignatureHeader.createSignatureInputHeader({
        signatures: new Map([
          ['sig1', {coveredContent: [{value: 'one', params: {key: 'one'}}]}],
          ['sig2', {coveredContent: [{value: 'two', params: {key: 'two'}}]}]
        ]),
        params: {alg: 'foo'}
      });
      shouldBeAnFSDict(dict, signatureInputs.multipleKey);
    });

  });
  describe('createSignatureInputString', () => {
    it('uses `date` header if specified', () => {
      const date = new Date().toUTCString();
      const httpMessage = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com',
      };
      const {sig1} = decodeDict(signatureInputs.date);
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(`"date": ${date}\n` +
        '"@signature-parameters": ("date");keyid="foo";alg="bar"');
    });
    it('properly encodes `@request-target` with root path', () => {
      const date = new Date().toUTCString();
      const httpMessage = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com',
      };
      const {sig1} = decodeDict(signatureInputs.requestTarget);
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(`"date": ${date}\n"@request-target": get /` +
        '\n"@signature-parameters": ("date" "@request-target");keyid="foo"' +
        ';alg="bar"');
    });
    it('properly encodes `@request-target` with a path', () => {
      const date = new Date().toUTCString();
      const httpMessage = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com/1/2/3',
      };
      const {sig1} = decodeDict(signatureInputs.requestTarget);
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(
        `"date": ${date}\n"@request-target": get /1/2/3` +
        '\n"@signature-parameters": ("date" "@request-target");keyid="foo"' +
        ';alg="bar"'
      );
    });
    it('properly encodes `@request-target` with a relative path', () => {
      const date = new Date().toUTCString();
      const httpMessage = {
        headers: {date},
        method: 'GET',
        url: '/relative/path',
      };
      const {sig1} = decodeDict(signatureInputs.requestTarget);
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(
        `"date": ${date}\n"@request-target": get /relative/path` +
        '\n"@signature-parameters": ("date" "@request-target");keyid="foo"' +
        ';alg="bar"'
      );
    });
    it('properly encodes `@request-target` with post method', () => {
      const date = new Date().toUTCString();
      const httpMessage = {
        headers: {date},
        method: 'POST',
        url: 'https://example.com',
      };
      const {sig1} = decodeDict(signatureInputs.requestTarget);
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(
        `"date": ${date}\n"@request-target": post /` +
        '\n"@signature-parameters": ("date" "@request-target");keyid="foo"' +
        ';alg="bar"'
      );
    });

    it('properly encodes `host`', () => {
      const date = new Date().toUTCString();
      const httpMessage = {
        headers: {date, host: 'example.com'},
        method: 'GET',
        url: 'https://example.com/1/2/3',
      };
      const {sig1} = decodeDict(signatureInputs.host);
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(
        `"host": example.com\n"date": ${date}\n"@request-target": get /1/2/3` +
        '\n"@signature-parameters": ("host" "date" "@request-target")' +
        ';keyid="foo";alg="bar"'
      );
    });
    it('properly encodes `host` with a port', () => {
      const date = new Date().toUTCString();
      const httpMessage = {
        headers: {date, host: 'example.com:18443'},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(signatureInputs.host);
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(
        `"host": example.com:18443\n"date": ${date}\n"@request-target": get ` +
        '/1/2/3\n"@signature-parameters": ("host" "date" "@request-target")' +
        ';keyid="foo";alg="bar"'
      );
    });
    it('properly encodes a header with a zero-length value', () => {
      const date = new Date().toUTCString();
      const zero = '';
      const httpMessage = {
        headers: {date, zero},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(
        'sig1=("date" "zero");keyid="foo";alg="bar"');
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(
        `"date": ${date}\n"zero": ` +
        '\n"@signature-parameters": ("date" "zero")' +
        ';keyid="foo";alg="bar"'
      );
    });

    it('properly encodes a header that\'s value is all white spaces', () => {
      const date = new Date().toUTCString();
      const zero = '  ';
      const httpMessage = {
        headers: {date, zero},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(signatureInputs.zero);
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(
        `"date": ${date}\n"zero": ` +
        '\n"@signature-parameters": ("date" "zero")' +
        ';keyid="foo";alg="bar"'
      );
    });
    it('properly encodes a header with multiple values', () => {
      const date = new Date().toUTCString();
      const multiple = 'true, false';
      const httpMessage = {
        headers: {date, multiple},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(signatureInputs.multipleValues);
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(
        `"date": ${date}\n"multiple": true, false` +
        '\n"@signature-parameters": ("date" "multiple")' +
        ';keyid="foo";alg="bar"'
      );
    });
    it('properly encodes a header with a dictionary value', () => {
      const date = new Date().toUTCString();
      const dictionary = 'test="foo"';
      const httpMessage = {
        headers: {date, dictionary},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(signatureInputs.dict);
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(
        `"date": ${date}\n"dictionary": foo` +
        '\n"@signature-parameters": ("date" "dictionary";key="test")' +
        ';keyid="foo";alg="bar"'
      );
    });
    it('throws when a content identifier has a key param but header ' +
      'is not a dictionary', () => {
      const date = new Date().toUTCString();
      const dictionary = '("foo")';
      const httpMessage = {
        headers: {date, dictionary},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(signatureInputs.dict);
      expect(() => httpSignatureHeader.createSignatureInputString(
        {signatureInput: sig1, httpMessage}))
        .to.throw(Error, /failed to parse/i);
    });
    it('throws when a content identifier has a key param but the key ' +
      'is not found in the dictionary', () => {
      const date = new Date().toUTCString();
      const dictionary = 'test="foo"';
      const httpMessage = {
        headers: {date, dictionary},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(
        'sig1=("date" "dictionary";key="bar");keyid="foo";alg="bar"');
      expect(() => httpSignatureHeader.createSignatureInputString(
        {signatureInput: sig1, httpMessage}))
        .to.throw(HttpSignatureError, /Failed to find key/i);
    });
    it('properly encodes a header with a list value', () => {
      const date = new Date().toUTCString();
      const list = '("foo" "bar")';
      const httpMessage = {
        headers: {date, list},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(
        'sig1=("date" "list";prefix=1);keyid="foo";alg="bar"');
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(
        `"date": ${date}\n"list": (foo)` +
        '\n"@signature-parameters": ("date" "list";prefix=1)' +
        ';keyid="foo";alg="bar"'
      );
    });
    it('properly encodes when a prefix parameter should return' +
      ' multiple values', () => {
      const date = new Date().toUTCString();
      const list = '(1 2 3 4 5 6)';
      const httpMessage = {
        headers: {date, list},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(
        'sig1=("date" "list";prefix=3);keyid="foo";alg="bar"');
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(
        `"date": ${date}\n"list": (1, 2, 3)` +
        '\n"@signature-parameters": ("date" "list";prefix=3)' +
        ';keyid="foo";alg="bar"'
      );
    });

    it('properly encodes when a prefix parameter should return' +
      ' no values', () => {
      const date = new Date().toUTCString();
      const list = '(1 2 3 4 5 6)';
      const httpMessage = {
        headers: {date, list},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(
        'sig1=("date" "list";prefix=0);keyid="foo";alg="bar"');
      const stringToSign = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      stringToSign.should.equal(
        `"date": ${date}\n"list": ()` +
        '\n"@signature-parameters": ("date" "list";prefix=0)' +
        ';keyid="foo";alg="bar"'
      );
    });

    it('throws when a content identifier has a prefix param but ' +
      'the header is not a list', () => {
      const date = new Date().toUTCString();
      const list = 'test="foo"';
      const httpMessage = {
        headers: {date, list},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(
        'sig1=("date" "list";prefix=0);keyid="foo";alg="bar"');
      expect(() => httpSignatureHeader.createSignatureInputString(
        {signatureInput: sig1, httpMessage}))
        .to.throw(Error, /Failed to parse/i);
    });
    it('throws when a content identifier has a prefix param but ' +
      'the prefix is out of bounds', () => {
      const date = new Date().toUTCString();
      const list = '("foo" "bar")';
      const httpMessage = {
        headers: {date, list},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(
        'sig1=("date" "list";prefix=3);keyid="foo";alg="bar"');
      expect(() => httpSignatureHeader.createSignatureInputString(
        {signatureInput: sig1, httpMessage}))
        .to.throw(Error, /out of bounds/i);
    });

    it('properly encodes using header parameter order', () => {
      const date = new Date().toUTCString();
      const httpMessage = {
        headers: {date, host: 'example.com'},
        method: 'GET',
        url: 'https://example.com/1/2/3',
      };
      // 2 different signatures with the same parameters
      // in a different order
      const {sig1} = decodeDict(
        'sig1=("host" "date" "@request-target");keyid="foo";alg="bar"');
      const stringToSign1 = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig1,
        httpMessage
      });
      // the header parameters have the same value, but are in a different order
      const {sig2} = decodeDict(
        'sig2=("date" "host" "@request-target");keyid="foo";alg="bar"');
      const stringToSign2 = httpSignatureHeader.createSignatureInputString({
        signatureInput: sig2,
        httpMessage
      });
      stringToSign2.should.not.equal(stringToSign1);
    });

    it('throws when an unknown header is specified', () => {
      const date = new Date().toUTCString();
      const httpMessage = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(
        'sig1=("foo" "date");keyid="foo";alg="bar"');
      expect(() => httpSignatureHeader.createSignatureInputString(
        {signatureInput: sig1, httpMessage}))
        .to.throw(HttpSignatureError, `Failed to find header field name "foo"`);
    });
    it('throws when an invalid header is specified', () => {
      const httpMessage = {
        headers: {'(bad)': true},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const {sig1} = decodeDict(
        'sig1=("(bad)");keyid="foo";alg="bar"');
      expect(() => httpSignatureHeader.createSignatureInputString(
        {signatureInput: sig1, httpMessage}))
        .to.throw(HttpSignatureError, /Illegal header "[A-z\(\)]+"/i);
    });
  });
  /*
  describe.skip('createSignatureString API', () => {

    it('properly encodes `(key-id)` with an iri', () => {
      const iri = 'https://example.com/key.pub';
      const requestOptions = {
        headers: {},
        keyId: iri,
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders:
          ['host', '(key-id)', '(request-target)'], requestOptions});
      stringToSign.should.equal(
        `host: example.com:18443\n(key-id): ${iri}\n` +
        `(request-target): get /1/2/3`);
    });
    it('properly encodes `(algorithm)` with a string', () => {
      const algorithm = 'hs2019';
      const requestOptions = {
        headers: {},
        algorithm,
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders:
          ['host', '(algorithm)', '(request-target)'], requestOptions});
      stringToSign.should.equal(
        `host: example.com:18443\n(algorithm): ${algorithm}\n` +
        `(request-target): get /1/2/3`);
    });

    const algorithms = ['rsa', 'hmac', 'ecdsa'];

    for(const algorithm of algorithms) {
      it(`properly encodes when using algorithm ${algorithm}`, () => {
        const requestOptions = {
          headers: {},
          algorithm,
          method: 'GET',
          url: 'https://example.com:18443/1/2/3',
        };
        const includeHeaders = ['host', '(algorithm)', '(request-target)'];
        const stringToSign = httpSignatureHeader.createSignatureString(
          {includeHeaders, requestOptions});
        stringToSign.should.equal(
          `host: example.com:18443\n(algorithm): ${algorithm}\n` +
        `(request-target): get /1/2/3`);
      });

      it('throws when `(created)` is used with algorithm ' + algorithm, () => {
        const requestOptions = {
          headers: {},
          algorithm,
          method: 'GET',
          url: 'https://example.com:18443/1/2/3',
        };
        const includeHeaders = ['(created)', '(algorithm)', '(request-target)'];
        let result;
        let error;
        try {
          result = httpSignatureHeader.createSignatureString(
            {includeHeaders, requestOptions});
        } catch(e) {
          error = e;
        }
        expect(result).to.be.undefined;
        expect(error).to.not.be.undefined;
        error.message.should.equal(
          `Algorithm ${algorithm} does not support "(created)".`);
      });

      it('throws when `(expires)` is used with algorithm ' + algorithm, () => {
        const requestOptions = {
          headers: {},
          algorithm,
          method: 'GET',
          url: 'https://example.com:18443/1/2/3',
        };
        const includeHeaders = ['(expires)', '(algorithm)', '(request-target)'];
        let result;
        let error;
        try {
          result = httpSignatureHeader.createSignatureString(
            {includeHeaders, requestOptions});
        } catch(e) {
          error = e;
        }
        expect(result).to.be.undefined;
        expect(error).to.not.be.undefined;
        error.message.should.equal(
          `Algorithm ${algorithm} does not support "(expires)".`);
      });

    }
  });
*/
  describe('parseRequest API', function() {
    it('should parse a Signature with no covered content', () => {
      const request = {...requests.exampleOne};
      request.headers['Signature-Input'] = signatureInputs.exampleOne;
      request.headers.Signature = signatures.exampleOne;
      const result = httpSignatureHeader.parseRequest(request);
      expect(result).to.be.a('Map');
      const sig1 = result.get('sig1');
      console.log(sig1);
    });
  });
/*
  describe('parseRequest API', function() {
    // takes the result of parseRequest and tests it
    const shouldBeParsed = parsed => {
      parsed.should.have.property('params');
      parsed.params.should.be.an('object');
      parsed.should.have.property('scheme');
      parsed.scheme.should.be.a('string');
      parsed.should.have.property('signingString');
      parsed.signingString.should.be.a('string');
      parsed.should.have.property('algorithm');
      parsed.should.have.property('keyId');
      parsed.keyId.should.be.a('string');
    };
    // tests occur 3 seconds after the epoch
    const now = 3;
    it('should use Date.now() when now is not specified', () => {
      const created = Math.floor(Date.now() / 1000);
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (created)",' +
        `signature="mockSignature",created="${created}"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date: new Date().toUTCString(),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(created)', '(request-target)'];
      const parsed = httpSignatureHeader.parseRequest(
        request, {headers: expectedHeaders});
      expect(parsed, 'expected the parsing result to be an object').
        to.be.an('object');
      shouldBeParsed(parsed);
      expect(parsed.params.created, 'expected created to be a string').
        to.be.a('string');
      parsed.params.created.should.equal(String(created));
      parsed.signingString.should.contain(`(created): ${created}`);
    });
    it('properly encodes `(created)` with a timestamp', () => {
      const created = 1;
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (created)",' +
        `signature="mockSignature",created="${created}"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date: new Date(created).toUTCString(),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(created)', '(request-target)'];
      const parsed = httpSignatureHeader.parseRequest(
        request, {headers: expectedHeaders, now});
      expect(parsed, 'expected the parsing result to be an object').
        to.be.an('object');
      shouldBeParsed(parsed);
      expect(parsed.params.created, 'expected created to be a string').
        to.be.a('string');
      parsed.params.created.should.equal(String(created));
      parsed.signingString.should.contain(`(created): ${created}`);
    });
    it('properly encodes `(created)` as a string', () => {
      const created = 1;
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (created)",' +
        `signature="mockSignature",created="${created}"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date: new Date(created).toUTCString(),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(created)', '(request-target)'];
      const parsed = httpSignatureHeader.parseRequest(
        request, {headers: expectedHeaders, now});
      expect(parsed, 'expected the parsing result to be an object').
        to.be.an('object');
      shouldBeParsed(parsed);
      expect(parsed.params.created, 'expected created to be a string').
        to.be.a('string');
      parsed.params.created.should.equal(String(created));
      parsed.signingString.should.contain(`(created): ${created}`);
    });
    it('rejects `(created)` in the future', () => {
      const created = 4;
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (created)",' +
        `signature="mockSignature",created="${created}"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date: new Date(created).toUTCString(),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(created)', '(request-target)'];
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.parseRequest(
          request, {headers: expectedHeaders, now});
      } catch(e) {
        error = e;
      }
      expect(result, 'result should not exist').to.be.null;
      expect(error, 'error should exist').to.not.be.null;
      error.message.should.equal(
        'Invalid signature; the signature creation time is in the future.');
    });
    it('rejects `(created)` that is not a unix timestamp', () => {
      const created = 'not a date';
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (created)",' +
        `signature="mockSignature",created="${created}"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date: new Date(created).toUTCString(),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(created)', '(request-target)'];
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.parseRequest(
          request, {headers: expectedHeaders, now});
      } catch(e) {
        error = e;
      }
      expect(result, 'result should not exist').to.be.null;
      expect(error, 'error should exist').to.not.be.null;
      error.message.should.equal(
        '"created" must be a UNIX timestamp or JavaScript Date.');
    });
    it('convert (created) Date objects to unix timestamps', () => {
      const date = new Date(1000);
      const timestamp = Math.floor(date.getTime() / 1000);
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (created)",' +
        `signature="mockSignature",created="${timestamp}"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date,
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(created)', '(request-target)'];
      const parsed = httpSignatureHeader.parseRequest(
        request, {headers: expectedHeaders, now});
      expect(parsed, 'expected the parsing result to be an object').
        to.be.an('object');
      shouldBeParsed(parsed);
      expect(parsed.params.created, 'expected created to be a string').
        to.be.a('string');
      parsed.params.created.should.equal(String(timestamp));
      parsed.signingString.should.contain(`(created): ${timestamp}`);
    });

    it('properly encodes `(expires)` with a timestamp', () => {
      const expires = 3;
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (expires)",' +
        `signature="mockSignature",expires="${expires}"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date: new Date(now * 1000),
          // convert the unix time to milliseconds for the header
          expires: new Date(Number(expires) * 1000),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(expires)', '(request-target)'];
      const parsed = httpSignatureHeader.parseRequest(
        request, {headers: expectedHeaders, now});
      expect(parsed, 'expected the parsing result to be an object').
        to.be.an('object');
      shouldBeParsed(parsed);
      expect(parsed.params.expires, 'expected created to be a string').
        to.be.a('string');
      parsed.params.expires.should.equal(String(expires));
      parsed.signingString.should.contain(`(expires): ${expires}`);
    });
    it('properly encodes `(expires)` with a timestamp & x-date', () => {
      const expires = 3;
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="x-date host (request-target) (expires)",' +
        `signature="mockSignature",expires="${expires}"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          'x-date': new Date(now * 1000),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(expires)', '(request-target)'];
      const parsed = httpSignatureHeader.parseRequest(
        request, {headers: expectedHeaders, now});
      expect(parsed, 'expected the parsing result to be an object').
        to.be.an('object');
      shouldBeParsed(parsed);
      expect(parsed.params.expires, 'expected created to be a string').
        to.be.a('string');
      parsed.params.expires.should.equal(String(expires));
      parsed.signingString.should.contain(`(expires): ${expires}`);
    });
    it('properly encodes `(expires)` as a string', () => {
      const expires = String(3);
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (expires)",' +
        `signature="mockSignature",expires="${expires}"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date: new Date(now * 1000),
          // convert the unix time to milliseconds for the header
          expires: new Date(Number(expires) * 1000),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(expires)', '(request-target)'];
      const parsed = httpSignatureHeader.parseRequest(
        request, {headers: expectedHeaders, now});
      expect(parsed, 'expected the parsing result to be an object').
        to.be.an('object');
      shouldBeParsed(parsed);
      expect(parsed.params.expires, 'expected created to be a string').
        to.be.a('string');
      parsed.params.expires.should.equal(expires);
      parsed.signingString.should.contain(`(expires): ${expires}`);
    });
    it('rejects `(expires)` that is not a unix timestamp', () => {
      const expires = 'not a date';
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (expires)",' +
        `signature="mockSignature",expires="${expires}"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date: new Date(expires),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(expires)', '(request-target)'];
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.parseRequest(
          request, {headers: expectedHeaders, now});
      } catch(e) {
        error = e;
      }
      expect(result, 'result should not exist').to.be.null;
      expect(error, 'error should exist').to.not.be.null;
      error.message.should.equal(
        '"expires" must be a UNIX timestamp or JavaScript Date.');
    });
    it('rejects `(expires)` that is in the past', () => {
      const expires = 1;
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (expires)",' +
        `signature="mockSignature",expires="${expires}"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date: new Date(expires),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(expires)', '(request-target)'];
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.parseRequest(
          request, {headers: expectedHeaders, now});
      } catch(e) {
        error = e;
      }
      expect(result, 'result should not exist').to.be.null;
      expect(error, 'error should exist').to.not.be.null;
      error.message.should.equal('The signature has expired.');
    });
    it('rejects expires header that is in the past', () => {
      const expires = 1;
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target)",' +
        `signature="mockSignature"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date: new Date(now * 1000),
          expires: new Date(expires * 1000),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(request-target)'];
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.parseRequest(
          request, {headers: expectedHeaders, now});
      } catch(e) {
        error = e;
      }
      expect(result, 'result should not exist').to.be.null;
      expect(error, 'error should exist').to.not.be.null;
      error.message.should.equal('The request has expired.');
    });
    it('rejects if skew is greater then clockSkew', () => {
      const _now = 1603386114;
      const date = _now - 350;
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="x-date host (request-target)",' +
        `signature="mockSignature"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          'x-date': new Date(date * 1000),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(request-target)'];
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.parseRequest(
          request, {headers: expectedHeaders, now: _now});
      } catch(e) {
        error = e;
      }
      expect(result, 'result should not exist').to.be.null;
      expect(error, 'error should exist').to.not.be.null;
      error.message.should.equal('Clock skew of 350s was greater than 300s');
    });
    it('rejects if signature is missing from AuthzHeader', () => {
      const _now = 1000;
      const date = _now - 300;
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="x-date host (request-target)",';
      const request = {
        headers: {
          host: 'example.com:18443',
          'x-date': new Date(date * 1000),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(request-target)'];
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.parseRequest(
          request, {headers: expectedHeaders, now: _now});
      } catch(e) {
        error = e;
      }
      expect(result, 'result should not exist').to.be.null;
      expect(error, 'error should exist').to.not.be.null;
      error.message.should.equal('signature was not specified');
    });
    it('rejects if schema is not Signature', () => {
      const date = now - 1;
      const authorization = 'NotSignature keyId="https://example.com/key/1",' +
        'headers="x-date host (request-target)",' +
        `signature="mockSignature"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          'x-date': new Date(date * 1000),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(request-target)'];
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.parseRequest(
          request, {headers: expectedHeaders, now});
      } catch(e) {
        error = e;
      }
      expect(result, 'result should not exist').to.be.null;
      expect(error, 'error should exist').to.not.be.null;
      error.message.should.equal('scheme was not "Signature"');
    });
    it('rejects if no keyId', () => {
      const date = now - 1;
      const authorization = 'Signature ' +
        'headers="x-date host (request-target)",' +
        `signature="mockSignature"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          'x-date': new Date(date * 1000),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(request-target)'];
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.parseRequest(
          request, {headers: expectedHeaders, now});
      } catch(e) {
        error = e;
      }
      expect(result, 'result should not exist').to.be.null;
      expect(error, 'error should exist').to.not.be.null;
      error.message.should.equal('keyId was not specified');
    });
    it('should ignore unrecognized signature parameters', () => {
      const created = Math.floor(Date.now() / 1000);
      // note: this test adds a single unrecognized signature parameter
      const unrecognized = 'unrecognized';
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (created)",' +
        `signature="mockSignature",created="${created}",` +
        `unrecognized="${unrecognized}"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date: new Date().toUTCString(),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['host', '(created)', '(request-target)'];
      const parsed = httpSignatureHeader.parseRequest(
        request, {headers: expectedHeaders});
      expect(parsed, 'expected the parsing result to be an object').
        to.be.an('object');
      shouldBeParsed(parsed);
      expect(parsed.params.created, 'expected created to be a string').
        to.be.a('string');
      parsed.params.created.should.equal(String(created));
      parsed.signingString.should.contain(`(created): ${created}`);
      parsed.signingString.should.not.contain(unrecognized);
    });

    // this is for covered content
    it('default headers should be (created)', () => {
      const created = 1;
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        `signature="mockSignature",created="${created}"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          'x-date': new Date(created * 1000).toUTCString(),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const parsed = httpSignatureHeader.parseRequest(
        request, {now});
      expect(parsed, 'expected the parsing result to be an object').
        to.be.an('object');
      shouldBeParsed(parsed);
      expect(parsed.params.created, 'expected created to be a string').
        to.be.a('string');
      parsed.params.created.should.equal(String(created));
      parsed.signingString.should.contain(`(created): ${created}`);
    });
    it('should error if headers parameter is zero-length', () => {
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        `headers="",signature="mockSignature"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.parseRequest(
          request, {now});
      } catch(e) {
        error = e;
      }
      expect(result, 'result should not exist').to.be.null;
      expect(error, 'error should exist').to.not.be.null;
      error.message.should.equal(
        'The "headers" parameter must not be a zero-length string.');
    });

    it('should error if both created and headers are not set', () => {
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        `signature="mockSignature"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date: new Date(now * 1000).toUTCString(),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.parseRequest(
          request, {now});
      } catch(e) {
        error = e;
      }
      expect(result, 'result should not exist').to.be.null;
      expect(error, 'error should exist').to.not.be.null;
      error.message.should.equal('created was not in the request');
    });
    it('should error if expires is in options.headers, but not request', () => {
      const authorization = 'Signature keyId="https://example.com/key/1",' +
        `signature="mockSignature",created="1"`;
      const request = {
        headers: {
          host: 'example.com:18443',
          date: new Date(now * 1000).toUTCString(),
          authorization
        },
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const expectedHeaders = ['(expires)'];
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.parseRequest(
          request, {headers: expectedHeaders, now});
      } catch(e) {
        error = e;
      }
      expect(result, 'result should not exist').to.be.null;
      expect(error, 'error should exist').to.not.be.null;
      error.message.should.equal('(expires) was not a signed header');
    });
  });
*/
});
