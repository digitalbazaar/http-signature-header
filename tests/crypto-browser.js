export async function getKey({
  keyData,
  format = 'jwk',
  name = 'RSA',
  hash}) {
  return crypto.subtle.importKey(format, keyData, {
    name, hash
  });
}
