# http-signature-header

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
