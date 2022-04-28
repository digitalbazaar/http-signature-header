/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
class HTTPSignatureError extends Error {
  constructor(message, name) {
    super(message);
    this.name = name;
    if(Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export const HttpSignatureError = HTTPSignatureError;
