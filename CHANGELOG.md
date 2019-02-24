# http-signature-header

## 1.2.0 - 2019-xx-xx

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
