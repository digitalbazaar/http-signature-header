/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const chai = require('chai');
chai.should();

const {expect} = chai;
const httpSignatureHeader = require('..');
const HttpSignatureError = require('../lib/HttpSignatureError');

describe('http-signature', () => {

  describe('createDigestString', () => {
    it('should create a digest of a given string', async () => {
      const data = `{"hello": "world"}`;
      const result = await httpSignatureHeader.
        createDigestString({data, algorithm: 'sha256', useMultihash: false});
      result.should
        .equal('SHA-256=X48E9qOokqqrvdts8nOJRJN3OWDUoyWxBf7kbu9DBPE=');
    });
  });

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

    it('properly encodes `(created)` with a timestamp', () => {
      const date = Date.now();
      const requestOptions = {
        headers: {},
        created: date,
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders:
          ['host', '(created)', '(request-target)'], requestOptions});
      stringToSign.should.equal(
        `host: example.com:18443\n(created): ${date}\n` +
        `(request-target): get /1/2/3`);
    });

    it('convert Date objects to unix timestamps', () => {
      const date = new Date();
      const requestOptions = {
        headers: {},
        created: date,
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders:
          ['host', '(created)', '(request-target)'], requestOptions});
      stringToSign.should.equal(
        `host: example.com:18443\n(created): ${date.getTime()}\n` +
        `(request-target): get /1/2/3`);
    });

    it('properly encodes `(expires)` with a timestamp', () => {
      const date = Date.now() + 1000;
      const requestOptions = {
        headers: {},
        expires: date,
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders:
          ['host', '(expires)', '(request-target)'], requestOptions});
      stringToSign.should.equal(
        `host: example.com:18443\n(expires): ${date}\n` +
        `(request-target): get /1/2/3`);
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
  });
});
