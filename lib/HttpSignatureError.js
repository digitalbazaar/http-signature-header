/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

module.exports = class HTTPSignatureError extends Error {
  constructor(message, name) {
    super(message);
    this.name = name;
    Error.captureStackTrace(this, this.constructor);
  }
};
