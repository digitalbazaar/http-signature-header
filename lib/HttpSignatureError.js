/*!
 * Copyright (c) 2018-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

export default class HTTPSignatureError extends Error {
  constructor(message, name) {
    super(message);
    this.name = name;
    if(Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
};
