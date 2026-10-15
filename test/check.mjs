// Signature regression check. vectors.json holds requests signed by the reference sign-v2
// script (Cube API docs → Test API) with a throwaway key generated for this test only.
//   node test/check.mjs
import { readFileSync } from 'node:fs';
import { buildMessage, stringifyMessage, sign } from '../skills/cube-api/scripts/cube-sign.mjs';
const v = JSON.parse(readFileSync(new URL('./vectors.json', import.meta.url)));
let failed = 0;
for (const c of v.cases) {
  const m = stringifyMessage(buildMessage({ url: c.url, nonce: c.nonce, timestamp: c.timestamp, body: c.body }));
  const s = sign(m, v.privateKey);
  const ok = m === c.message && s === c.signature;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.name}${ok ? '' : `\n  got:      ${m}\n  expected: ${c.message}`}`);
}
process.exit(failed ? 1 : 0);
