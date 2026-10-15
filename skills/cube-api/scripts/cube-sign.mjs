// Cube API Signature v2 — zero dependencies, Node 18+.
//
// Ported line for line from the sign-v2 pre-request script used by the Cube API docs
// (apidoc-en.iotcube.link → Test API). Keep the two in step: test/ checks that both
// produce the same message string and signature for the same request.
//
//   import { signRequest } from './cube-sign.mjs'
//   const { headers, message } = signRequest({ method, url, body, keyId, privateKey })

import crypto from 'node:crypto';

/** Collect everything that is signed: header nonce/timestamp, query, path, JSON body. */
export function buildMessage({ url, nonce, timestamp, body }) {
  const u = new URL(url);
  const message = { nonce: String(nonce), timestamp: String(timestamp) };
  // Query: original parameter names, values as strings, empty values skipped.
  // A repeated key is an array parameter: the docs join its elements with commas.
  const query = {};
  for (const [k, v] of u.searchParams) {
    if (v === '') continue;
    query[k] = k in query ? `${query[k]},${v}` : v;
  }
  Object.assign(message, query);
  // The full request path, path parameters already filled in, e.g. /cube/v4/sims/8985.../bundles
  message['x-sign-uri'] = u.pathname;
  // JSON body fields join the message at the top level with their original types.
  // null fields are left out: the docs exclude empty parameters (and the reference script
  // cannot sign a null at all).
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    for (const [k, v] of Object.entries(body)) if (v !== null && v !== undefined) message[k] = v;
  }
  return message;
}

/**
 * Sort and stringify exactly like the reference script: top-level keys sorted, a nested
 * object sorted one level deep, arrays and deeper levels kept as they are, no whitespace.
 */
export function stringifyMessage(message) {
  return '{' + Object.keys(message).sort().map((key) => {
    const value = message[key];
    let single;
    if (Array.isArray(value)) single = { [key]: value };
    else if (value !== null && typeof value === 'object')
      single = { [key]: Object.entries(value).sort().reduce((o, [k, v]) => ((o[k] = v), o), {}) };
    else single = { [key]: value };
    return JSON.stringify(single).slice(1, -1);
  }).join(',') + '}';
}

/**
 * Cube issues the private key as base64 without a PEM header; the bytes are PKCS#8.
 * A full PEM (any header) is accepted as well.
 */
export function loadPrivateKey(keyText) {
  const text = keyText.trim();
  if (text.startsWith('-----BEGIN')) {
    const b64 = text.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    return crypto.createPrivateKey({ key: Buffer.from(b64, 'base64'), format: 'der', type: 'pkcs8' });
  }
  return crypto.createPrivateKey({ key: Buffer.from(text.replace(/\s+/g, ''), 'base64'), format: 'der', type: 'pkcs8' });
}

/** SHA1withRSA, Base64. */
export function sign(messageString, privateKey) {
  const key = typeof privateKey === 'string' ? loadPrivateKey(privateKey) : privateKey;
  return crypto.sign('sha1', Buffer.from(messageString, 'utf8'), key).toString('base64');
}

/** Everything a request needs: the headers to send, plus the signed message for debugging. */
export function signRequest({ url, body, keyId, privateKey, nonce, timestamp }) {
  const n = nonce ?? Math.floor(Math.random() * 100);
  const ts = timestamp ?? Date.now();
  const message = stringifyMessage(buildMessage({ url, nonce: n, timestamp: ts, body }));
  const signature = sign(message, privateKey);
  return {
    message,
    headers: {
      nonce: String(n),
      timestamp: String(ts),
      'X-LF-Signature-Type': '2.0',
      Authorization: `LF ${keyId}/${signature}`,
      'Content-Type': 'application/json',
    },
  };
}
