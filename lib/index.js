/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

// translate `main.js` to CommonJS
require = require('esm')(module, {
  cache: false,
  force: true
});
module.exports = require('./main.js');
