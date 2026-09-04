/*
 * Web Push, no dependencies.
 *
 * The usual way to do this is the `web-push` npm package, but this repo has no
 * package.json and no node_modules: the functions are plain files that Netlify
 * ships as-is. Adding a dependency would add an install step to the whole site's
 * build just for the notification feature, so the two specs are implemented here
 * directly against node:crypto instead.
 *
 *   RFC 8291  Message Encryption for Web Push   (aes128gcm)
 *   RFC 8292  VAPID                             (ES256 JWT, server identity)
 *
 * Verified against the test vector in RFC 8291 section 5.
 */
const crypto = require('crypto');

const b64 = (b) => Buffer.from(b).toString('base64url');
const ub64 = (s) => Buffer.from(String(s), 'base64url');

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

/* HKDF as Web Push uses it: one-block expand, so info is always info || 0x01. */
function hkdf(salt, ikm, info, len) {
  const prk = hmac(salt, ikm);
  return hmac(prk, Buffer.concat([info, Buffer.from([1])])).slice(0, len);
}

/* A raw P-256 point (0x04 || X || Y) as a node KeyObject, via a DER wrapper. */
const SPKI_P256 = Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex');
function rawToPublicKey(raw) {
  return crypto.createPublicKey({ key: Buffer.concat([SPKI_P256, raw]), format: 'der', type: 'spki' });
}
function publicKeyToRaw(key) {
  return key.export({ type: 'spki', format: 'der' }).slice(-65);
}
/* A P-256 private scalar as a KeyObject, via JWK (needs the matching point). */
function rawToPrivateKey(d, pub) {
  return crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d: b64(d), x: b64(pub.slice(1, 33)), y: b64(pub.slice(33, 65)) },
    format: 'jwk',
  });
}

/*
 * Encrypt one message for one subscription.
 * `keys.p256dh` and `keys.auth` come from the browser's PushSubscription.
 * `salt` and `asKeys` are only passed by the test, to reproduce a fixed vector.
 */
function encrypt(plaintext, keys, salt, asKeys) {
  const uaPublicRaw = ub64(keys.p256dh);
  const authSecret = ub64(keys.auth);
  const uaPublic = rawToPublicKey(uaPublicRaw);

  let asPrivate, asPublicRaw;
  if (asKeys) {
    asPublicRaw = asKeys.publicRaw;
    asPrivate = rawToPrivateKey(asKeys.privateD, asPublicRaw);
  } else {
    const pair = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    asPrivate = pair.privateKey;
    asPublicRaw = publicKeyToRaw(pair.publicKey);
  }
  salt = salt || crypto.randomBytes(16);

  const shared = crypto.diffieHellman({ privateKey: asPrivate, publicKey: uaPublic });

  // The pseudo-random key mixes the shared secret with the subscription's auth
  // secret, so a message is readable only by that exact subscription.
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublicRaw, asPublicRaw]);
  const ikm = hkdf(authSecret, shared, keyInfo, 32);

  const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);

  // 0x02 is the padding delimiter that marks this as the last (only) record.
  const record = Buffer.concat([Buffer.from(plaintext, 'utf8'), Buffer.from([2])]);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([c.update(record), c.final(), c.getAuthTag()]);

  const header = Buffer.alloc(5);
  header.writeUInt32BE(4096, 0); // record size
  header.writeUInt8(asPublicRaw.length, 4);
  return Buffer.concat([salt, header, asPublicRaw, body]);
}

/* The VAPID Authorization header: proves who is sending, to the push service. */
function vapidHeader(endpoint, publicKey, privateKey, subject) {
  const aud = new URL(endpoint).origin;
  const head = b64(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }));
  const signing = `${head}.${claims}`;

  const pubRaw = ub64(publicKey);
  const key = rawToPrivateKey(ub64(privateKey), pubRaw);
  // JOSE wants the raw r||s pair, not the DER sequence node signs by default.
  const sig = crypto.sign('sha256', Buffer.from(signing), { key, dsaEncoding: 'ieee-p1363' });

  return `vapid t=${signing}.${b64(sig)}, k=${publicKey}`;
}

/*
 * Send one notification. Returns the push service's status.
 * 404 and 410 mean the subscription is dead and the caller should drop it.
 */
async function send(sub, payload, opts) {
  const body = encrypt(typeof payload === 'string' ? payload : JSON.stringify(payload), sub.keys);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      TTL: String(opts.ttl || 3600),
      Urgency: opts.urgency || 'normal',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(body.length),
      Authorization: vapidHeader(sub.endpoint, opts.publicKey, opts.privateKey, opts.subject),
    },
    body,
  });
  return { status: res.status, ok: res.ok, gone: res.status === 404 || res.status === 410, text: res.ok ? '' : await res.text().catch(() => '') };
}

module.exports = { send, encrypt, vapidHeader, publicKeyToRaw, b64, ub64 };
