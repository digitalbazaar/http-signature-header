/**
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {promises as fs} from 'fs';
import httpMessageParser from 'http-message-parser';

/**
 * This opens a file from disk asynchronously.
 *
 * @param {string} path - A file path.
 *
 * @returns {string|Buffer} The result of opening the file.
 */
export const readFile = fs.readFile;

/**
 * Simple wrapper around node's process.stdin.
 * This allows us to get the result of cat and other commands.
 *
 * @param {string} [encoding='utf8'] - The http message's encoding.
 *
 * @returns {Promise<string>} Should return the http message.
 */
export async function getStdin(encoding = 'utf8') {
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

export async function getHTTPMessage() {
  const HTTPMessage = await getStdin();
  if(!HTTPMessage) {
    throw new Error(
      'An HTTP Message must be passed to stdin for this command.');
  }
  // this will create a request or response object
  // similar to node's default request object.
  return httpMessageParser(HTTPMessage);
}
