/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const chai = require('chai');
chai.should();

const {expect} = chai;
const httpSignatureHeader = require('..');
const jsprim = require('jsprim');
const HttpSignatureError = require('../lib/HttpSignatureError');

describe('http-signature', () => {

  describe('createSignatureString API', () => {
    it('uses `date` header if specified', done => {
      const date = jsprim.rfc1123(new Date());
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
      const date = jsprim.rfc1123(new Date());
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
      const date = jsprim.rfc1123(new Date());
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
      const date = jsprim.rfc1123(new Date());
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
      const date = jsprim.rfc1123(new Date());
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
      const date = jsprim.rfc1123(new Date());
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
    it('properly encodes a header with multiple values', done => {
      const date = jsprim.rfc1123(new Date());
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
      const date = jsprim.rfc1123(new Date());
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
