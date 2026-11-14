// Lead data is stored encrypted, so phone numbers in it are never public.
// Writers (the reading sessions) only need the public key; the desk unlocks
// the private key with the team passphrase.

const te = new TextEncoder();
const td = new TextDecoder();

export function toB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromB64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function passKey(pass, salt, iter) {
  const base = await crypto.subtle.importKey('raw', te.encode(pass.trim()), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, [
    'decrypt',
  ]);
}

/** Unlocks the private key; throws if the passphrase is wrong. */
export async function unlock(keys, pass) {
  const aes = await passKey(pass, fromB64(keys.salt), keys.iter);
  const pkcs8 = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(keys.iv) }, aes, fromB64(keys.wrapped));
  return crypto.subtle.importKey('pkcs8', pkcs8, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
}

/** Opens one encrypted batch file. */
export async function openBatch(batch, privateKey) {
  const raw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, fromB64(batch.key));
  const aes = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(batch.iv) }, aes, fromB64(batch.data));
  return JSON.parse(td.decode(plain));
}

/** Short links: JSON → URL-safe base64 and back. */
export function pack(obj) {
  return toB64(te.encode(JSON.stringify(obj))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function unpack(s) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(td.decode(fromB64(b + '='.repeat((4 - (b.length % 4)) % 4))));
}
