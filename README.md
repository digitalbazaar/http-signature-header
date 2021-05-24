# HTTP Signature Header _(http-signature-header)_

[![NPM Version](https://img.shields.io/npm/v/http-signature-header.svg)](https://npm.im/http-signature-header)
[![Build status](https://img.shields.io/github/workflow/status/digitalbazaar/http-signature-header/Node.js%20CI)](https://github.com/digitalbazaar/http-signature-header/actions?query=workflow%3A%22Node.js+CI%22)
[![Coverage status](https://img.shields.io/codecov/c/github/digitalbazaar/http-signature-header)](https://codecov.io/gh/digitalbazaar/http-signature-header)
[![Dependency Status](https://img.shields.io/david/digitalbazaar/http-signature-header.svg)](https://david-dm.org/digitalbazaar/http-signature-header)

> A JavaScript library for creating and verifying HTTP Signature headers

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [Contribute](#contribute)
- [Commercial Support](#commercial-support)
- [License](#license)

## Background

**[HTTP Signatures IETF draft](https://tools.ietf.org/html/draft-cavage-http-signatures)**

## Install

To install locally (for development):

```
git clone https://github.com/digitalbazaar/http-signature-header.git
cd http-signature-header
npm install
```

## Usage

This library implements [Signing HTTP Messages](https://www.ietf.org/archive/id/draft-ietf-httpbis-message-signatures-04.html)
In order for this library to work each HTTP request must contain 2 headers:

`Signature-Input` A structured field dictionary in which each entry is a list of covered content with params.
`Signature` A structured field field dictionary in which each value is a Binary Sequence.


Example: 
```
X-Forwarded-For: 192.0.2.123
Signature-Input: sig1=("@request-target" "host" "date" "cache-control" \
    "x-empty-header" "x-example");created=1618884475\
    ;keyid="test-key-rsa-pss", \
  proxy_sig=("signature";key="sig1" x-forwarded-for);created=1618884480\
    ;keyid="test-key-rsa";alg="rsa-v1_5-sha256"
Signature: sig1=:H00a6KdNCRWgOWBMvuRtxh6c/wrVxwt2p5KyqBJqmtPbNTd980hWwk\
    UE6H4NWiTs5f2Ef0qJ3iypXT2bR9Pc+PVU9U2gAzTcZKK8MDJLjYKfaE835zg/9sOdG\
    R+tlRJ1cbCoWMVoCgEPi4t6QewbI0xgdx8AmP5ItTunYmhe8G0JR42lfvz60+szb8Sp\
    wJEmkMPr5dBOz6DLEeM3IgKNoBlJPp94WSJkgvwTM64rXw049ZkYenl9jwKlcXEmA1a\
    4MNWoUElr6eh5k20djMZftCYTPUUPMxZUavcQy+cp6lfKonz6HIDe3+n3VOTOo8uu1a\
    SVfKQQzR+ZEwSaZQBrdQ==:, \
  proxy_sig=:NgQsRJwOL/EgoRXdcmHMOLZM+KWqLDsO76CrqoiLH279VJs9Fj6bn4V+pe\
    rAEUbHBEMFCbl6tucEVgKrU+5IIyDMBI85FExQeuBrNPALczjCdxne6LUoBcWBAk8No\
    Ryjfd++DXIAjAZcf/hBUXLll+5veI0ynzBRFTZ4v8AbluYODjJlSprYEwUb2ndbFr12\
    vzgIpy0uTQCslN+3rUUZ+lQWlrILvbR0CIvtGwk2+hE0dTRAG0R3wmlR24mhSqiE5RA\
    DyoSWQVjVxntp98XHAB6MZE92bbu2a8Uo951Hvah03XHWEk/WiYdq+mt3hwXVPLXlBU\
    9DWCo2AaYD/rkXtQ==:
```

You can make those headers by using the functions `createSignatureInputHeader` and `createSignatureHeader`.

`createSignatureInputHeader` takes a Map and turns that Map into a `Signature-Input` header.

example: 
```js
const dict = httpSignatureHeader.createSignatureInputHeader({
  // here we have 1 signatures for the request
  signatures: new Map([
    ['sig1', {coveredContent: ['one']}],
  ]),
  // this will add the params to all the signatures
  params: {alg: 'foo'}
});
// this is a valid `Signature-Input` header:
console.log(dict);
//sig1=("one");alg="foo"
```

example: 
```js
const dict = httpSignatureHeader.createSignatureInputHeader({
  // here we have 2 signatures for the request
  signatures: new Map([
    ['sig1', {coveredContent: [{value: 'one'}]}],
    ['sig2', {coveredContent: [{value: 'two'}]}]
  ]),
  // this will add the params to all the signatures
  params: {alg: 'foo'}
});
// this is a valid `Signature-Input` header:
console.log(dict);
//sig1=("one");alg="foo", sig2=("two");alg="foo"
```
example: 
```js
const dict = httpSignatureHeader.createSignatureInputHeader({
  // here we have 2 signatures for the request
  signatures: new Map([
    ['sig1', {coveredContent: [{value: 'one'}], params: {alg: 'foo'}}],
  // sig2 uses a different signing algorithm `bar`
    ['sig2', {coveredContent: [{value: 'two'}], params: {alg: 'bar'}}]
  ]),
});
// this is a valid `Signature-Input` header:
console.log(dict);
//sig1=("one");alg="foo", sig2=("two");alg="bar"
```

`createSignatureInputString`

```js
const date = new Date().toUTCString();
const httpMessage = {
  headers: {date},
  method: 'GET',
  url: 'https://example.com',
};
const coveredContent = [{value: 'one'}];
const params = {alg: 'foo'};
// this turns the coveredContent etc into SF Items
const stringToSign = httpSignatureHeader.createSignatureInputString({
  coveredContent,
  params,
  httpMessage
});
const data = new TextEncoder().encode(stringToSign);
// invocationSigner being a key
const signature = await invocationSigner.sign({data});
```

`createSignatureHeader` is much easier. Sign the signing string for your signature
and pass it as a `Uint8Array`.

example: 
```js
const signature = new Uint8Array([1, 2, 3])
const sigs = {sig1: signature};
const dict = httpSignatureHeader.createSignatureHeader(sigs);
console.log(dict);
//'sig1=:AQID:'
```


`parseRequest` takes in a request that is expected to be similar to
a request object in `express.js`. It then parses the `Signature-Input` header and returns
a Map with the signature id and then an object with everything you need to sign:
```js
const request = {
  method: 'Post',
  url: '/foo?param=value&pet=dog',
  headers: {
    Host: 'example.com',
    Date: 'Tue, 20 Apr 2021 02:07:55 GMT',
    'Content-Type': 'application/json',
    Digest: 'SHA-256=X48E9qOokqqrvdts8nOJRJN3OWDUoyWxBf7kbu9DBPE=',
    'Content-Length': 18,
  }
};
request.headers['Signature-Input'] = 'sig1=();created=1618884475;' +
    'keyid="test-key-rsa-pss";alg="rsa-pss-sha512"'
request.headers.Signature = 'sig1=:qGKjr1213+iZCU1MCV8w2NTr/HvMGWYDzpqAWx7SrPE1y6gOkIQ3k2' +
  'GlZDu9KnKnLN6LKX0JRa2M5vU9v/b0GjV0WSInMMKQJExJ/e9Y9K8q2eE0G9saGebEaWd' +
  'R3Ao47odxLh95hBtejKIdiUBmQcQSAzAkoQ4aOZgvrHgkmvQDZQL0w30+8lMz3VglmN73' +
  'CKp/ijZemO1iPdNwrdhAtDvj9OdFVJ/wiUECfU78aQWkQocvwrZXTmHCX9BMVUHGneXMY' +
  'NQ0Y8umEHjxpnnLLvxUbw2KZrflp+l6m7WlhwXGJ15eAt1+mImanxUCtaKQJvEfcnOQ0S' +
  '2jHysSRLheTA==:'
const result = httpSignatureHeader.parseRequest(request);
const sig1 = result.get('sig1');
console.log(sig1);
/**
{
  errors: [],
  signatureInput: Item {
    value: [],
    params: {
      created: 1618884475,
      keyid: 'test-key-rsa-pss',
      alg: 'rsa-pss-sha512'
    }
  },
  signature: Item {
    value: Uint8Array(256) [
      168,  98, 163, 175,  93, 181, 223, 232, 153,   9,  77,  76,
        9,  95,  48, 216, 212, 235, 252, 123, 204,  25, 102,   3,
      206, 154, 128,  91,  30, 210, 172, 241,  53, 203, 168,  14,
      144, 132,  55, 147,  97, 165, 100,  59, 189,  42, 114, 167,
       44, 222, 139,  41, 125,   9,  69, 173, 140, 230, 245,  61,
      191, 246, 244,  26,  53, 116,  89,  34,  39,  48, 194, 144,
       36,  76,  73, 253, 239,  88, 244, 175,  42, 217, 225,  52,
       27, 219,  26,  25, 230, 196, 105, 103,  81, 220,  10,  56,
      238, 135, 113,  46,
      ... 156 more items
    ],
    params: null
  },
  signingString: '"@signature-parameters": ();created=1618884475;keyid="test-key-rsa-pss";alg="rsa-pss-sha512"'                                                                                                       
}
*/
```

[See `api.md` for more documentation](https://github.com/digitalbazaar/http-signature-header/blob/master/api.md)

## Contribute

Please follow the existing code style.

PRs accepted.

If editing the Readme, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## Commercial Support

Commercial support for this library is available upon request from
Digital Bazaar: support@digitalbazaar.com

## License

[BSD-3-Clause](LICENSE.md) © Digital Bazaar
