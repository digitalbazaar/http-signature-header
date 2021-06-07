import {createPrivateKey, createPublicKey} from 'crypto';

export async function getKey({
  keyData,
  format = 'pem',
  type,
  secret = true
}) {
  if(secret) {
    return createPrivateKey(keyData, format, type);
  }
  return createPublicKey(keyData, format, type);
}
