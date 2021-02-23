# http-signature-header

## 2.0.0 -

### Fixed
- Pseudo-headers `created` & `expires` must be unix time stamps or js Dates.
- hs2019 does not hash signature string before signing a signature string.

### Changed
- Library throws if the signature parameter headers is a zero-length string.
- Library adds default `(created)` if no signature parameter header is present.
- Validate `sigString` parameter in the `parseSignatureHeader` API.

### Added
- Support for version 12 of the HTTP signature specification.
- Validators for `created` & `expires`.
- Tests for `parseRequest`.
- Tests for headers parameter order.
- Tests for unrecognized parameters in a signature.
- Jsdoc strings for library functions and methods.
- Validation is algorithm specific in some cases.
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
