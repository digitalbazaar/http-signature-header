const crypto = require('crypto');
const httpSigs = require('../lib/');
const jsprim = require('jsprim');

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
  dsa: [/^rsa/i, /^hmac/i, /^ed25519/i, /^ec/i, /^p256/i],
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
 * Simple validator for a private key that ensures
 * the key is either secret for hmac or private.
 *
 * @param {Object} keyObj - A node Private Key Object.
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
async function createHttpSignatureRequest({
  algorithm = 'hs2019', privateKey, keyType,
  requestOptions, includeHeaders = []
}) {
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
  const keyObj = crypto.createPrivateKey(privateKey);
  validatePrivateKey(keyObj);
  const keyTypes = keyType.trim().toLowerCase() || keyObj.asymmetricKeyType;
  const valid = httpSignatureAlgorithm.validKey(keyTypes);
  if(!valid) {
    throw new Error(`Unsupported signing algorithm ${keyTypes}`);
  }
  if(keyTypes === 'hmac') {
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
}

exports.canonicalize = async function({program, message: requestOptions}) {
  const {headers, created, expires} = program;
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
};

exports.sign = async function(
  {program, message: requestOptions, privateKeyFile}) {
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
};

exports.verify = async function(
  {program, message: requestOptions, publicKeyFile}) {
  /**
    * 1. recreate the canonzied string (not hashed, not signed, not base 64)
    * 1a. might need to hash canonized
    * 2. get the public key from key id
    * 3. if there is an algorithm check key is in types
    * 4. decode the actual `signature` paramter to bytes (not base 64)
    * 5. pass publicKey, canonziedString, and decoded signature bytes to verify
   */
  const {headers = '', keyType, algorithm = 'hs2019'} = program;
  validate(program);
  const includeHeaders = headers;
  let canonicalizedString = httpSigs.
    createSignatureString({includeHeaders, requestOptions});
  const dereferencedPublicKey = crypto.createPublicKey(publicKeyFile);
  const httpSignatureAlgorithm = getHTTPSignatureAlgorithm(algorithm);
  const kType = keyType || dereferencedPublicKey.asymmetricKeyType;
  const valid = httpSignatureAlgorithm.validKey(kType);
  if(!valid) {
    throw new Error(`Unsupported signing algorithm ${kType}`);
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
