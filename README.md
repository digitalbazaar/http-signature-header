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

```js
import {
  createAuthzHeader, createSignatureString
} from '@digitalbazaar/http-signature-header';

const requestOptions = {
  url,
  method: 'POST',
  headers
}
const includeHeaders = ['expires', 'host', '(request-target)'];
const plaintext = createSignatureString({includeHeaders, requestOptions});

const data = new TextEncoder().encode(plaintext);
const signature = base64url.encode(await signer.sign({data}));

const Authorization = createAuthzHeader({
  includeHeaders,
  keyId: signer.id,
  signature
});
```

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
