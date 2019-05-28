const crypto = require('crypto');
const httpSigs = require('../lib/');
const fs = require('fs');
const util = require('util');
const httpMessageParser = require('http-message-parser');
const jsprim = require('jsprim');

// this can be use to await paths to private keys and other files.
// also can get be used to dereference keyId in middleware
const readFile = util.promisify(fs.readFile);

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
    }
    catch(e) {
      reject(e);
    }
  });
}

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

function makeHTTPHeaders(headers = {}) {
  let message = '';
  for(const key in headers) {
    let value = headers[key];
    if(Array.isArray(value)) {
      value = value.join(',');
    }
    message += `${key}: ${value}\n`;
  }
  return message;
}

const hs2019 = {
  hash: crypto.createHash('SHA512'),
  dsa: [/^rsa/i, /^hmac/i, /^ed25519/i, /^ecdsa/i, /^p256/i],
  validKey(key) {
    return hs2019.dsa
      .reduce((any, current) => {
        if(any) {
          return any;
        }
        return current.test(key);
      }, false);
  }
};

function getHTTPSignatureAlgorithm(algorithm) {
  if(algorithm === true) {
    throw new Error(
      'Your algorithm is not in the current HTTP Signatures registry');
  }
  switch(algorithm.toLowerCase()) {
    case 'hs2019': {
      return hs2019;
    }
    default: {
      throw new Error(`${algorithm} is deprecated or unsupported}`);
    }
  }
}

/**
 * Runs validates on various fields.
 *
 * @param {Object} options - Command line options.
 */
function validate(options) {
  const now = Date.now();
  if(!isNaN(options.created)) {
    if(options.created > now) {
      throw new Error(
        'Invalid created. Your created parameter is in the future');
    }
  }
  if(!isNaN(options.expires)) {
    if(options.expires < now) {
      throw new Error('Your signature has expired.');
    }
  }
}

/**
 * Add HTTPSignatures headers to a given requestOptions object.
 * This is compatible with both request and axios libraries.
 * TODO: factor out to new npm package.
 *
 * @param {Object} options - Options for the request.
 * @param {string} options.algorithm - The signing algorithm
 * to use (rsa-sha256, hs2019).
 * @param {Object} options.requestOptions - The request options.
 * @param {string} options.keyId - A valid IRI
 * that resolves to a public key.
 * @param {Array<string>} options.includeHeaders - Which headers
 * to use in the Signing String.
 *
 * @returns {Object} The response headers.
*/
const createHttpSignatureRequest = async (
  {algorithm = 'hs2019', privateKey, keyType,
    requestOptions, includeHeaders = []}) => {
  // get metadata from public key
  if(!keyType) {
    throw new Error('Expected to recieve keyType');
  }
  requestOptions.headers = requestOptions.headers || {};
  if(!requestOptions.headers.date) {
    requestOptions.headers.date = jsprim.rfc1123(new Date());
  }
  const httpSignatureAlgorithm = getHTTPSignatureAlgorithm(algorithm);
  const plaintext = httpSigs.createSignatureString(
    {includeHeaders, requestOptions});
  httpSignatureAlgorithm.hash.update(plaintext);
  const authzHeaderOptions = {includeHeaders, keyId: 'test-key'};
  // TODO add signing support for HMAC, P-256,
  // Ed25519ph, Ed25519ctx,
  // ANSI X9.62-2005
  const keyTypes = keyType.trim().toLowerCase();
  const valid = httpSignatureAlgorithm.validKey(keyTypes);
  if(!valid) {
    throw new Error(`Unsupported signing algorithm ${keyType}`);
  }
  const keyObj = crypto.createPrivateKey(privateKey);
  if(keyType === 'hmac') {
    authzHeaderOptions.signature = crypto.createHmac('SHA512', privateKey)
      .update(plaintext).digest('base64');
  } else {
    const hashText = Buffer.from(
      httpSignatureAlgorithm.hash.digest('utf8'), 'utf8');
    authzHeaderOptions.signature = await crypto.sign(
      null, hashText, keyObj).toString('base64');
  }
  requestOptions.headers.Authorization = httpSigs.createAuthzHeader(
    authzHeaderOptions);
  return requestOptions.headers;
};

exports.canonicalize = async function(program) {
  const {headers} = program;
  if(headers === '') {
    return '';
  }
  const requestOptions = await getHTTPMessage();
  const includeHeaders = headers.split(/\s+/);
  const result = httpSigs.
    createSignatureString({includeHeaders, requestOptions});
  return result;
};

exports.sign = async function(program) {
  const {
    headers, keyType, privateKey,
    algorithm
  } = program;
  validate(program);
  if(!keyType) {
    throw new Error('key type is required for signing');
  }
  if(!privateKey) {
    throw new Error('A private key is required for signing');
  }
  const privateKeyFile = await readFile(privateKey);
  const includeHeaders = headers ? program.headers.split(/\s+/) : '';
  const requestOptions = await getHTTPMessage();
  const options = {
    keyType,
    algorithm,
    includeHeaders,
    requestOptions,
    privateKey: privateKeyFile
  };
  const result = await createHttpSignatureRequest(options);
  const message = makeHTTPHeaders(result);
  return message;
};

exports.verify = async function(program) {
  /**
 * 1. recreate the canonzied string (not hashed, not signed, not base 64)
 * 1a. might need to hash canonized
 * 2. get the public key from key id
 * 3. if there is an algorithm check key is in types
 * 4. decode the actual `signature` paramter to bytes (not base 64)
 * 5. pass publicKey, canonziedString, and decoded signature bytes to verify
 */
  const requestOptions = await getHTTPMessage();
  const {
    headers = '', keyType, publicKey,
    algorithm = 'hs2019'
  } = program;
  validate(program);
  const includeHeaders = headers.split(/\s+/);
  let canonicalizedString = httpSigs.
    createSignatureString({includeHeaders, requestOptions});
  const publicKeyFile = await readFile(publicKey);
  const httpSignatureAlgorithm = getHTTPSignatureAlgorithm(algorithm);
  const valid = httpSignatureAlgorithm.validKey(keyType);
  if(!valid) {
    throw new Error(`Unsupported signing algorithm ${keyType}`);
  }
  const options = {
    authorizationHeaderName: 'Authorization',
    headers: includeHeaders
  };
  const request = httpSigs.parseRequest(requestOptions, options);
  const signature = new Buffer(request.params.signature, 'base64');
  if(!signature) {
    throw new Error('No signature parameter found in Authorization header');
  }
  if(!request.params.keyId) {
    throw new Error('keyId is required for verification.');
  }
  if(httpSignatureAlgorithm.hash) {
    httpSignatureAlgorithm.hash.update(canonicalizedString);
    canonicalizedString = Buffer.from(
      httpSignatureAlgorithm.hash.digest('utf8'), 'utf8');
  }
  // TODO: abstract middleware verify in this.
  // TODO: get options from program env variables.
  const verified = crypto.verify(
    null, canonicalizedString, publicKeyFile, signature);
  if(verified) {
    return canonicalizedString.toString('utf8');
  }
  return 'Signature verification failed.';
};
