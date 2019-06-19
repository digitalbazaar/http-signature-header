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

  describe('createSignatureString API', () => {
    it('uses `date` header if specified', done => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['date'], requestOptions});
      stringToSign.should.equal(`date: ${date}`);
      done();
    });
    it('properly encodes `(request-target)` with root path', done => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['date', '(request-target)'], requestOptions});
      stringToSign.should.equal(`date: ${date}\n(request-target): get /`);
      done();
    });
    it('properly encodes `(request-target)` with a path', done => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com/1/2/3',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['date', '(request-target)'], requestOptions});
      stringToSign.should.equal(`date: ${date}\n(request-target): get /1/2/3`);
      done();
    });
    it('properly encodes `(request-target)` with post method', done => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'POST',
        url: 'https://example.com',
      };
      const stringToSign = httpSignatureHeader.createSignatureString(
        {includeHeaders: ['date', '(request-target)'], requestOptions});
      stringToSign.should.equal(`date: ${date}\n(request-target): post /`);
      done();
    });
    it('properly encodes `host`', done => {
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
      done();
    });
    it('properly encodes `host` with a port', done => {
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
      done();
    });
    it('properly encodes `(created)` with a timestamp', done => {
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
      done();
    });
    it('properly encodes `(expires)` with a timestamp', done => {
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
      done();
    });
    it('properly encodes `(key-id)` with an iri', done => {
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
      done();
    });
    it('properly encodes `(algorithm)` with a string', done => {
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
      done();
    });

    it('properly encodes a header with multiple values', done => {
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
      done();
    });
    it('throws when an unknown header is specified', done => {
      const date = new Date().toUTCString();
      const requestOptions = {
        headers: {date},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      expect(() => httpSignatureHeader.createSignatureString(
        {includeHeaders: ['foo', 'date'], requestOptions}))
        .to.throw(HttpSignatureError, /foo was not found/);
      done();
    });
    it('throws when an invalid header is specified', done => {
      const requestOptions = {
        headers: {'(bad)': true},
        method: 'GET',
        url: 'https://example.com:18443/1/2/3',
      };
      expect(() => httpSignatureHeader.createSignatureString(
        {includeHeaders: ['(bad)'], requestOptions}))
        .to.throw(HttpSignatureError, /Illegal header "[A-z\(\)]+"/i);
      done();
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
