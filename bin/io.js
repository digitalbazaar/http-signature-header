/**
 * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const fs = require('fs');
const util = require('util');
const httpMessageParser = require('http-message-parser');

/**
 * This opens a file from disk asynchronously.
 *
 * @param {string} path - A file path.
 *
 * @returns {string|Buffer} The result of opening the file.
 */
exports.readFile = util.promisify(fs.readFile);

/**
 * Simple wrapper around node's process.stdin.
 * This allows us to get the result of cat and other commands.
 *
 * @param {string} [encoding='utf8'] - The http message's encoding.
 *
 * @returns {Promise<string>} Should return the http message.
 */
async function getStdin(encoding = 'utf8') {
  const {stdin} = process;
  let message = '';
  return new Promise((resolve, reject) => {
    try {
      stdin.setEncoding(encoding);
      stdin.on('readable', () => {
        let chunk;
        while((chunk = stdin.read())) {
          message += chunk;
        }
      });
      stdin.on('end', () => resolve(message));
      stdin.on('error', reject);
    } catch(e) {
      reject(e);
    }
  });
}
exports.getStdIn = getStdin;

async function getHTTPMessage() {
  const HTTPMessage = await getStdin();
  if(!HTTPMessage) {
    throw new Error(
      'An HTTP Message must be passed to stdin for this command.');
  }
  // this will create a request or response object
  // similar to node's default request object.
  return httpMessageParser(HTTPMessage);
}
exports.getHTTPMessage = getHTTPMessage;
