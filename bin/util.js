import crypto from 'node:crypto';
import * as httpSigs from '../lib/index.js';
import jsprim from 'jsprim';

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

/**
 * Creates a signature validadtor.
 *
 * @param {object} options - Options to use.
 * @param {Array<RegExp>} options.dsa - A list of RegExp(s) to verify the key.
 * @param {Function} options.hash - An optional hash.
 *
 * @returns {object} A signature object.
*/
const createSignatureVerifier = ({dsa, hash}) => ({
  hash, dsa,
  validKey(key) {
    return dsa
      .reduce((any, current) => {
        // if any of the keys matched return true
        if(any) {
          return any;
        }
        return current.test(key);
      }, false);
  }
});

function getHTTPSignatureAlgorithm(algorithm = '') {
  // FIXME this is definitely not a good pattern
  if(algorithm === true) {
    throw new Error(
      'Your algorithm is not in the current HTTP Signatures registry');
  }
  switch(algorithm.toLowerCase()) {
    case 'hs2019': {
      return createSignatureVerifier({
        dsa: [/^rsa/i, /^hmac/i, /^ed25519/i, /^ec/i, /^p256/i],
      });
    }
    default: {
      // all other registered HTTP sig algorithms are deprecated in v12.
      throw new Error(`${algorithm} is deprecated or unsupported}`);
    }
  }
}

/**
 * Simple validator for a private key that ensures
 * the key is either secret for hmac or private.
 *
 * @param {object} keyObj - A node Private Key object.
 *
 * @throws If the key is neither secret nor private.
 *
 * @returns {undefined}
 */
function validatePrivateKey(keyObj) {
  if(!['secret', 'private'].includes(keyObj.type)) {
    throw new Error(
      `Invalid key type "${keyObj.type}".` +
      ' Key type must be "secret" or "private".');
  }
}

// FIXME this should only contain the string, keyType, and privateKey
async function getBase64Signature({
  canonicalizedString,
  keyType,
  privateKey,
  keyObj
}) {
  if(keyType === 'hmac') {
    return crypto.createHmac('SHA512', privateKey)
      .update(canonicalizedString).digest('base64');
  }
  const textBuffer = Buffer.from(canonicalizedString);
  // sign the textBuffer and return it as a base64 string
  return crypto.sign(null, textBuffer, keyObj).toString('base64');
}

/**
 * Add HTTPSignatures headers to a given requestOptions object.
 * This is compatible with both request and axios libraries.
 * TODO: factor out to new npm package.
 *
 * @param {object} options - Options for the request.
 * @param {string} options.algorithm - The signing algorithm
 * to use (rsa-sha256, hs2019).
 * @param {object} options.requestOptions - The request options.
 * @param {string} options.keyType - The key type.
 * @param {object} options.privateKey - The private key to sign with.
 * @param {Array<string>} options.includeHeaders - Which headers
 * to use in the Signing String.
 *
 * @returns {object} The response headers.
*/
async function createHttpSignatureRequest({
  algorithm = 'hs2019', privateKey, keyType: providedKeyType = '',
  requestOptions, includeHeaders = []
}) {
  requestOptions.headers = requestOptions.headers || {};
  // if there is no date set the date to now
  if(!requestOptions.headers.date) {
    requestOptions.headers.date = jsprim.rfc1123(new Date());
  }
  // the signature algorithm is used for the algorithm  key-type check
  const httpSignatureAlgorithm = getHTTPSignatureAlgorithm(algorithm);
  const canonicalizedString = httpSigs.createSignatureString(
    {includeHeaders, requestOptions});
  const authzHeaderOptions = {includeHeaders, keyId: 'test-key'};
  // FIXME this can be abstracted into a helper function else where
  // this creates the private key using node's crypto to sign with
  const keyObj = crypto.createPrivateKey(privateKey);
  // ensures the key includes either a "secret" or "private" property
  validatePrivateKey(keyObj);
  // gets the keyType provided in as lowercase or the private key's type
  const keyType = providedKeyType.trim().toLowerCase() ||
    keyObj.asymmetricKeyType.trim().toLowerCase();
  // checks that the key type is one allowed by the algorithm
  const valid = httpSignatureAlgorithm.validKey(keyType);
  if(!valid) {
    throw new Error(
      `Unsupported key type ${keyType} for algorithm ${algorithm}`);
  }
  authzHeaderOptions.signature = await getBase64Signature({
    keyType, privateKey, canonicalizedString, keyObj
  });
  requestOptions.headers.Authorization = httpSigs.createAuthzHeader(
    authzHeaderOptions);
  return requestOptions.headers;
}

export async function canonicalize({opts, message: requestOptions}) {
  const {headers, created, expires} = opts;
  if(headers === true) {
    return '';
  }
  requestOptions.headers['(created)'] = created;
  requestOptions.headers['(expires)'] = expires;
  const noHeaders = !headers || headers.length === 0;
  const includeHeaders = noHeaders ? ['(created)'] : headers;
  const result = httpSigs.
    createSignatureString({includeHeaders, requestOptions});
  return result;
}

export async function sign({
  opts, message: requestOptions, privateKeyFile
}) {
  const {
    headers, keyType, privateKey,
    algorithm
  } = opts;
  if(!privateKey) {
    throw new Error('A private key is required for signing');
  }
  const includeHeaders = headers;
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
}

export async function verify({
  opts, message: requestOptions, publicKeyFile
}) {
  /**
    * 1. Recreate the canonzied string (not hashed, not signed, not base 64).
    * 1a. Might need to hash canonized.
    * 2. Get the public key from key id.
    * 3. If there is an algorithm check key is in types.
    * 4. Decode the actual `signature` paramter to bytes (not base 64).
    * 5. Pass publicKey, canonziedString, and decoded signature bytes to verify.
   */
  const {headers = '', keyType} = opts;
  const includeHeaders = headers;
  let canonicalizedString = Buffer.from(httpSigs.
    createSignatureString({includeHeaders, requestOptions}));
  const dereferencedPublicKey = crypto.createPublicKey(publicKeyFile);
  const kType = keyType || dereferencedPublicKey.asymmetricKeyType;
  const options = {
    authorizationHeaderName: 'Authorization',
    headers: includeHeaders
  };
  const request = httpSigs.parseRequest(requestOptions, options);
  const signature = new Buffer(request.params.signature, 'base64');
  if(request.algorithm) {
    const httpSignatureAlgorithm = getHTTPSignatureAlgorithm(request.algorithm);
    const valid = httpSignatureAlgorithm.validKey(kType);
    if(!valid) {
      throw new Error(`Unsupported signing algorithm ${kType}`);
    }
    if(httpSignatureAlgorithm.hash) {
      httpSignatureAlgorithm.hash.update(canonicalizedString);
      canonicalizedString = Buffer.from(httpSignatureAlgorithm.hash.digest());
    }
  }
  // TODO: get options from program env variables.
  const verified = crypto.verify(
    null, canonicalizedString, publicKeyFile, signature);
  if(verified) {
    return canonicalizedString.toString();
  }
  return 'Signature verification failed.';
}
