#!/usr/bin/env node
// Sign and send one Cube API request.
//
//   node cube-call.mjs GET /sims/89852202306250040073/bundles?status=1
//   node cube-call.mjs POST /sims/89852202306250040073/bundle --body '{"bundle_id":"LP...","cycles":3}'
//   node cube-call.mjs GET /sims/8985.../bundles --dry-run      # print what would be signed and sent
//
// Credentials come from the environment, never from arguments:
//   CUBE_KEY_ID            key ID from Cube → Developer → API Keys
//   CUBE_PRIVATE_KEY       the private key (base64, as Cube shows it), or
//   CUBE_PRIVATE_KEY_FILE  a file that holds it
//   CUBE_ENV               prod (default) | uat
//   CUBE_BASE_URL          optional override, e.g. https://api.linksfield.net/cube/v4
import { readFileSync } from 'node:fs';
import { signRequest } from './cube-sign.mjs';

const BASE = { prod: 'https://api.linksfield.net/cube/v4', uat: 'https://api-uat.io.linksfield.net/cube/v4' };
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const has = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };

const dryRun = has('--dry-run');
const bodyArg = flag('--body');
const env = flag('--env') ?? process.env.CUBE_ENV ?? 'prod';
const [methodArg, pathArg] = args;
if (!methodArg || !pathArg) {
  console.error('usage: node cube-call.mjs <METHOD> <path under /cube/v4> [--body JSON] [--env prod|uat] [--dry-run]');
  process.exit(2);
}
const method = methodArg.toUpperCase();
const base = (process.env.CUBE_BASE_URL ?? BASE[env] ?? BASE.prod).replace(/\/$/, '');
const url = /^https?:\/\//.test(pathArg) ? pathArg : base + (pathArg.startsWith('/') ? pathArg : `/${pathArg}`);
const body = bodyArg ? JSON.parse(bodyArg) : undefined;

const keyId = process.env.CUBE_KEY_ID;
const privateKey = process.env.CUBE_PRIVATE_KEY ?? (process.env.CUBE_PRIVATE_KEY_FILE && readFileSync(process.env.CUBE_PRIVATE_KEY_FILE, 'utf8'));
if (!keyId || !privateKey) {
  console.error('Set CUBE_KEY_ID and CUBE_PRIVATE_KEY (or CUBE_PRIVATE_KEY_FILE). Create a key in Cube → Developer → API Keys.');
  process.exit(2);
}

const { headers, message } = signRequest({ url, body, keyId, privateKey });
if (dryRun) {
  const shown = { ...headers, Authorization: headers.Authorization.replace(/\/(.{12}).*$/, '/$1…') };
  console.log(`${method} ${url}`);
  console.log('headers:', JSON.stringify(shown, null, 2));
  console.log('message signed:', message);
  if (body) console.log('body:', JSON.stringify(body));
  process.exit(0);
}

const res = await fetch(url, { method, headers, body: body && method !== 'GET' ? JSON.stringify(body) : undefined });
const requestId = res.headers.get('x-request-id') ?? res.headers.get('x-lf-request-id');
const text = await res.text();
console.log(`HTTP ${res.status}${requestId ? `  request-id: ${requestId}` : ''}`);
try { console.log(JSON.stringify(JSON.parse(text), null, 2)); } catch { console.log(text); }
if (res.status === 403) console.error('403 = signature rejected. Re-run with --dry-run and compare "message signed" with the rules in SKILL.md.');
process.exit(res.ok ? 0 : 1);
