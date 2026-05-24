/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * @typedef {'SyntaxError'|'ConstraintError'|'DataError'|'InvalidStateError'} HttpSignatureErrorType
 */

class HTTPSignatureError extends Error {
  /**
   * @param {string} message
   * @param {HttpSignatureErrorType} name - Error type identifier.
   */
  constructor(message, name) {
    super(message);
    this.name = name;
    if(Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export const HttpSignatureError = HTTPSignatureError;
