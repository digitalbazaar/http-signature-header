#!/usr/bin/env node

/**
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */

// this module is the binary used by the http signature spec test suites
// @see https://github.com/w3c-dvcg/http-signatures-test-suite
import {program} from 'commander';
import {canonicalize, sign, verify} from './util.js';
import {getHTTPMessage, readFile} from './io.js';
import {extractPseudoHeaders} from '../lib/index.js';

program
  .command('c14n')
  .alias('canonicalize')
  .action(async () => {
    try {
      const opts = program.opts();
      const _message = await getHTTPMessage();
      const message = extractPseudoHeaders(opts, _message);
      const result = await canonicalize({opts, message});
      process.stdout.write(result);
      process.exit(0);
    } catch(e) {
      console.error('canonicalize command failed : ' + e);
      process.exit(1);
    }
  });

program
  .command('sign')
  .action(async () => {
    try {
      const opts = program.opts();
      const message = await getHTTPMessage();
      const privateKeyFile = await readFile(opts.privateKey);
      const result = await sign({opts, message, privateKeyFile});
      process.stdout.write(result);
      process.exit(0);
    } catch(e) {
      console.error('Sign Error', e);
      process.exit(1);
    }
  });

// TODO implement verify
program
  .command('verify')
  .action(async () => {
    try {
      const opts = program.opts();
      const message = await getHTTPMessage();
      const publicKeyFile = await readFile(opts.publicKey);
      const result = await verify({opts, message, publicKeyFile});
      process.stdout.write(result);
      process.exit(0);
    } catch(e) {
      console.error('Verification Error:', e);
      process.exit(1);
    }
  });

function parseHeaders(val) {
  if(!val) {
    return '';
  }
  return val.split(/\s+/);
}
// all of the common options are accessed
// from program.opt().name i.e. program.opt().headers etc
program
  .version('0.0.1')
  .option('-d, --headers [headers]', 'A list of header names.', parseHeaders)
  .option('-k, --keyId <keyId>', 'A Key Id string.')
  .option('-p, --private-key <privateKey>.',
    'A private key file name filename.')
  .option('-t, --key-type <keyType>',
    'The type of the keys.')
  .option('-u, --public-key <publicKey>.',
    'A public key file name filename.')
  .option('-a, --algorithm [algorithm]',
    'One of: rsa-sha1, hmac-sha1, rsa-sha256, hmac-sha256, hs2019.',
    /^(rsa-sha1|hmac-sha1|rsa-sha256|hmac-sha256|hs2019)$/i)
  .option('-c, --created [created]', 'The created param for the signature.')
  .option('-e, --expires [expires]', 'The expires param for the signature.')
  .parse(process.argv);
