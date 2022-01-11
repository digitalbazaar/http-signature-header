# http-signature-header

## 3.0.0 - 2022-01-xx

### Changed
- **BREAKING**: Rename package to `@digitalbazaar/http-signature-header`.

## 2.0.2 - 2021-06-09

### Fixed
- Ensure that clock skew is considered when comparing dates.

## 2.0.1 - 2021-03-02

### Added
- A `files` entry to `package.json` to remove the dirs `test` & `bin` from npm releases.

## 2.0.0 - 2021-02-25

### Fixed
- **BREAKING**: Pseudo-headers `created` & `expires` must be unix time stamps or JavaScript Dates.
- `hs2019` does not hash signature string before signing a signature string.

### Changed
- **BREAKING**: Library throws if the signature parameter headers is a zero-length string.
- **BREAKING**: Library adds default `(created)` if no signature parameter header is present.
- Validate `sigString` parameter in the `parseSignatureHeader` API.

### Added
- **BREAKING**: Support for the
  [Signing HTTP Messages](https://tools.ietf.org/html/draft-cavage-http-signatures-12)
  version 12 specification.  Note that an updated
  [version](https://tools.ietf.org/html/draft-ietf-httpbis-message-signatures)
  is currently being developed.
- **BREAKING**: Validators for `created` & `expires`.
- Tests for `parseRequest`.
- Tests for headers parameter order.
- Tests for unrecognized parameters in a signature.
- JSDoc strings for library functions and methods.
- **BREAKING**: Validation is algorithm specific in some cases.
- Test browser support with karma.

## 1.3.1 - 2019-07-18

### Fixed
- Do not use full URL in `(request-target)`.

## 1.3.0 - 2019-06-29

### Added
- Include `created` and `expires` in authz header.
- Accept Date objects for parameters and header values.
- Support `hs2019`.
- Support `(key-id)` and `(algorithm)` pseudo headers.

## 1.2.0 - 2019-03-02

### Added
- Enable use of this library in the browser.

### Removed
- Remove unnecessary `jsprim` dependency.

## 1.1.1 - 2018-07-24

### Fixed
- Fix serialization of values for headers that
  appear multiple times (join using `, `
  rather than just `,`) per Section 2.3.2 of RFC.

## 1.1.0 - 2018-05-18

### Added
- Expose HttpSignatureError class.

## 1.0.0 - 2018-05-12

- See git history for changes.
