/*!
 * Copyright (c) 2018-2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const chai = require('chai');
chai.should();

const {expect} = chai;
const httpSignatureHeader = require('../lib');
const HttpSignatureError = require('../lib/HttpSignatureError');

describe('http-signature', () => {

  describe('createSignatureString API', () => {
    it('uses `date` header if specified', () => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['date'], requestOptions});
      stringToSign.should.equal(`date: ${date}`);
    });
    it('properly encodes `(request-target)` with root path', () => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['date', '(request-target)'], requestOptions});
      stringToSign.should.equal(`date: ${date}\n(request-target): get /`);
    });
    it('properly encodes `(request-target)` with a path', () => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com/1/2/3',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['date', '(request-target)'], requestOptions});
      stringToSign.should.equal(`date: ${date}\n(request-target): get /1/2/3`);
    });
    it('properly encodes `(request-target)` with a relative path', () => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'GET',
        url: '/relative/path',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['date', '(request-target)'], requestOptions});
      stringToSign.should.equal(
        `date: ${date}\n(request-target): get /relative/path`);
    });
    it('properly encodes `(request-target)` with post method', () => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'POST',
        url: 'https://example.com',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['date', '(request-target)'], requestOptions});
      stringToSign.should.equal(`date: ${date}\n(request-target): post /`);
    });

    it('properly encodes `host`', () => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com/1/2/3',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['host', 'date', '(request-target)'], requestOptions});
      stringToSign.should.equal(
        `host: example.com\ndate: ${date}\n(request-target): get /1/2/3`);
    });

    it('properly encodes `host` with a port', () => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['host', 'date', '(request-target)'], requestOptions});
      stringToSign.should.equal(
        `host: example.com:18443\ndate: ${date}\n(request-target): get /1/2/3`);
    });

    it('properly encodes a header with a zero-length value', () => {
      const date = new Date().toUTCString();
      const zero = '';
      const requestOptions = {
        headers: {date, zero},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['host', 'date', 'zero'], requestOptions});
      stringToSign.should.equal(
        `host: example.com:18443\ndate: ${date}\nzero: `);
    });

    it('properly encodes a header that\'s value is all white spaces', () => {
      const date = new Date().toUTCString();
      const zero = '  ';
      const requestOptions = {
        headers: {date, zero},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['host', 'date', 'zero'], requestOptions});
      stringToSign.should.equal(
        `host: example.com:18443\ndate: ${date}\nzero: `);
    });

    it('properly encodes a header with multiple values', () => {
      const date = new Date().toUTCString();
      const multiple = 'true, false';
      const requestOptions = {
        headers: {date, multiple},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['host', 'date', 'multiple'], requestOptions});
      stringToSign.should.equal(
        `host: example.com:18443\ndate: ${date}\nmultiple: true, false`);
    });

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

    it('properly encodes a header with multiple values', () => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date, 'x-custom': ['val1', 'val2']},
        method: 'GET',
        url: 'https://example.com/1/2/3',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['x-custom', 'host', 'date', '(request-target)'],
          requestOptions});
      stringToSign.should.equal(
        `x-custom: val1, val2\nhost: example.com\ndate: ` +
        `${date}\n(request-target): get /1/2/3`);
    });

    it('properly encodes using header parameter order', () => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com/1/2/3',
      };
      // 2 different signatures with the same parameters
      // in a different order
      const firstString = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['host', 'date', '(request-target)'],
          requestOptions});
      firstString.should.equal(
        `host: example.com\ndate: ${date}\n` +
        `(request-target): get /1/2/3`);
      // the header parameters have the same value, but are in a different order
      const secondString = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['(request-target)', 'host', 'date'],
          requestOptions});
      secondString.should.not.equal(firstString);
      secondString.should.equal(
        `(request-target): get /1/2/3\nhost: example.com\ndate: ` +
        `${date}`);
    });

    it('throws when an unknown header is specified', () => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      expect(() => httpSignatureHeader.createSignatureString(
        {includeHeaders: ['foo', 'date'], requestOptions}))
        .to.throw(HttpSignatureError, /foo was not found/);
    });
    it('throws when an invalid header is specified', () => {
      const requestOptions = {
        headers: {'(bad)': true},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      expect(() => httpSignatureHeader.createSignatureString(
        {includeHeaders: ['(bad)'], requestOptions}))
        .to.throw(HttpSignatureError, /Illegal header "[A-z\(\)]+"/i);
    });
  });

  describe('createAuthzHeader API', () => {
    it('header with an algorithm and one specified header', () => {
      const authz = httpSignatureHeader.createAuthzHeader({
        algorithm: 'rsa-sha256',
        includeHeaders: ['date'],
        keyId: 'https://example.com/key/1',
        signature: 'mockSignature'
      });
      authz.should.be.a('string');
      authz.should.equal('Signature keyId="https://example.com/key/1",' +
        'algorithm="rsa-sha256",headers="date",signature="mockSignature"');
    });
    it('header with an algorithm and two specified headers', () => {
      const authz = httpSignatureHeader.createAuthzHeader({
        algorithm: 'rsa-sha256',
        includeHeaders: ['date', 'host'],
        keyId: 'https://example.com/key/1',
        signature: 'mockSignature'
      });
      authz.should.be.a('string');
      authz.should.equal('Signature keyId="https://example.com/key/1",' +
        'algorithm="rsa-sha256",headers="date host",signature="mockSignature"');
    });
    it('header with an algorithm and three specified headers', () => {
      const authz = httpSignatureHeader.createAuthzHeader({
        algorithm: 'rsa-sha256',
        includeHeaders: ['date', 'host', '(request-target)'],
        keyId: 'https://example.com/key/1',
        signature: 'mockSignature'
      });
      authz.should.be.a('string');
      authz.should.equal('Signature keyId="https://example.com/key/1",' +
        'algorithm="rsa-sha256",headers="date host (request-target)",' +
        'signature="mockSignature"');
    });
    it('header without an algorithm and one specified header', () => {
      const authz = httpSignatureHeader.createAuthzHeader({
        includeHeaders: ['date'],
        keyId: 'https://example.com/key/1',
        signature: 'mockSignature'
      });
      authz.should.be.a('string');
      authz.should.equal('Signature keyId="https://example.com/key/1",' +
        'headers="date",signature="mockSignature"');
    });
    it('header without an algorithm and two specified headers', () => {
      const authz = httpSignatureHeader.createAuthzHeader({
        includeHeaders: ['date', 'host'],
        keyId: 'https://example.com/key/1',
        signature: 'mockSignature'
      });
      authz.should.be.a('string');
      authz.should.equal('Signature keyId="https://example.com/key/1",' +
        'headers="date host",signature="mockSignature"');
    });
    it('header without an algorithm and three specified headers', () => {
      const authz = httpSignatureHeader.createAuthzHeader({
        includeHeaders: ['date', 'host', '(request-target)'],
        keyId: 'https://example.com/key/1',
        signature: 'mockSignature'
      });
      authz.should.be.a('string');
      authz.should.equal('Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target)",' +
        'signature="mockSignature"');
    });
    it('header with integer (created)', () => {
      const created = Math.floor(Date.now() / 1000);
      const authz = httpSignatureHeader.createAuthzHeader({
        includeHeaders: ['date', 'host', '(request-target)', '(created)'],
        keyId: 'https://example.com/key/1',
        signature: 'mockSignature',
        created
      });
      authz.should.be.a('string');
      authz.should.equal('Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (created)",' +
        `signature="mockSignature",created="${created}"`);
    });
    it('header with string (created)', () => {
      const created = String(Math.floor(Date.now() / 1000));
      const authz = httpSignatureHeader.createAuthzHeader({
        includeHeaders: ['date', 'host', '(request-target)', '(created)'],
        keyId: 'https://example.com/key/1',
        signature: 'mockSignature',
        created
      });
      authz.should.be.a('string');
      authz.should.equal('Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (created)",' +
        `signature="mockSignature",created="${created}"`);
    });
    it('should throw if (created) is not a unix timestamp', () => {
      const created = 'invalid-date-time';
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.createAuthzHeader({
          includeHeaders: ['date', 'host', '(request-target)', '(created)'],
          keyId: 'https://example.com/key/1',
          signature: 'mockSignature',
          created
        });
      } catch(e) {
        error = e;
      }
      expect(result).to.be.null;
      expect(error).to.not.be.null;
      error.message.should.equal(
        '"created" must be a UNIX timestamp or JavaScript Date.');
    });
    it('header with integer (expires)', () => {
      const expires = Math.floor(Date.now() / 1000);
      const authz = httpSignatureHeader.createAuthzHeader({
        includeHeaders: ['date', 'host', '(request-target)', '(expires)'],
        keyId: 'https://example.com/key/1',
        signature: 'mockSignature',
        expires
      });
      authz.should.be.a('string');
      authz.should.equal('Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (expires)",' +
        `signature="mockSignature",expires="${expires}"`);
    });
    it('header with string (expires)', () => {
      const expires = String(Math.floor(Date.now() / 1000));
      const authz = httpSignatureHeader.createAuthzHeader({
        includeHeaders: ['date', 'host', '(request-target)', '(expires)'],
        keyId: 'https://example.com/key/1',
        signature: 'mockSignature',
        expires
      });
      authz.should.be.a('string');
      authz.should.equal('Signature keyId="https://example.com/key/1",' +
        'headers="date host (request-target) (expires)",' +
        `signature="mockSignature",expires="${expires}"`);
    });
    it('should throw if (expires) is not a unix timestamp', () => {
      const expires = 'invalid-date-time';
      let error = null;
      let result = null;
      try {
        result = httpSignatureHeader.createAuthzHeader({
          includeHeaders: ['date', 'host', '(request-target)', '(expires)'],
          keyId: 'https://example.com/key/1',
          signature: 'mockSignature',
          expires
        });
      } catch(e) {
        error = e;
      }
      expect(result).to.be.null;
      expect(error).to.not.be.null;
      error.message.should.equal(
        '"expires" must be a UNIX timestamp or JavaScript Date.');
    });

  });
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
});
