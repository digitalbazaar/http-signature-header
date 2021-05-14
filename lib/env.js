/*!
 * Copyright (c) 2018-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

// determine if using node.js or browser
export const nodejs = (
  typeof process !== 'undefined' && process.versions && process.versions.node);
export const browser = !nodejs &&
  (typeof window !== 'undefined' || typeof self !== 'undefined');
