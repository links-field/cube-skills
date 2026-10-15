---
name: cube-api
description: Integrate with the Linksfield Cube API (Cube API Enterprise, api.linksfield.net/cube/v4) — get an API key, find the right endpoint in the official docs, sign requests with Signature v2 (SHA1withRSA, "Authorization: LF {keyId}/{sign}"), call it, and debug 401/403/429 errors. Ships tested signing scripts for Node and Python. Use whenever the user mentions Cube, Linksfield, iotcube, managing IoT SIM cards / eSIMs / plans / bundles / usage / SMS / CDRs through an API, a Cube key ID or private key, "LF" authorization, X-LF-Signature-Type, or a Cube signature that fails — even if they do not say "Cube API" explicitly.
---

# Cube API

Cube is Linksfield's IoT connectivity platform. Cube API Enterprise lets a customer's own systems manage their SIM cards: status, plans (bundles), usage, SMS, CDRs, orders. This skill takes someone from zero to a working, signed request.

The official reference is **https://apidoc-en.iotcube.link** (Chinese: apidoc-cn.iotcube.link). It is the source of truth for endpoints and fields — read it rather than guessing, because it changes.

## The path to a first successful call

### 1. Make sure the organisation can use the API

The API is for enterprise customers. The person creating keys must be an **Admin** of the organisation in Cube; other members can see keys but cannot create or delete them. If they lack access, they should contact their Linksfield account manager.

### 2. Create an API key

In the Cube console (https://www.iotcube.link, sign in): **Developer → API Keys** → type a name (e.g. "Production integration") → **Create**.

- The new row shows a **Key ID**; the **private key** is available from the row's actions (show / copy). The pair is an RSA key — the private key is the credential.
- An organisation can hold several keys (the page shows "n of 5 keys used").
- Anyone in the organisation can view keys, so treat every key as shared: keep it in a secret manager, never in a document, chat or ticket. If a key may have leaked, delete it and create a new one.

Then set it in the environment where the code will run — never paste it into this conversation:

```bash
export CUBE_KEY_ID="<key ID>"
export CUBE_PRIVATE_KEY_FILE="$HOME/.cube/private_key"    # or CUBE_PRIVATE_KEY="<base64 private key>"
export CUBE_ENV=prod                                      # or uat for a UAT test key
```

If the user offers to paste a private key, stop them and point them to the environment variable instead.

### 3. Find the endpoint

The docs site publishes machine-readable pages, so fetch them instead of scraping HTML:

- `https://apidoc-en.iotcube.link/llms.txt` — index of every page with titles and links.
- Any page as Markdown: append `.md`, e.g. `https://apidoc-en.iotcube.link/api-419973166.md`. Endpoint pages include an OpenAPI fragment with parameters, the response schema and examples.

Read the endpoint's page before calling it: required path/query/body fields, enum values, whether it is asynchronous (async endpoints return a task to poll), and whether it is tagged **Sign2.0** (all current endpoints are; Signature v1 is legacy).

Base URLs: production `https://api.linksfield.net/cube/v4`, UAT `https://api-uat.io.linksfield.net/cube/v4`. More detail in `reference/quickstart.md`.

### 4. Sign and send

Use the bundled scripts; they are ported from the official sign-v2 reference script and checked against it.

```bash
node scripts/cube-call.mjs GET '/sims/89852202306250040073/bundles?status=1'
node scripts/cube-call.mjs POST /sims/<sim_id>/bundle --body '{"bundle_id":"LP...","bundle_type":10,"cycles":3}'
node scripts/cube-call.mjs GET '/sims/<sim_id>/bundles' --dry-run      # show what is signed, send nothing
```

For the user's own code, give them `scripts/cube-sign.mjs` (Node 18+, no dependencies) or `scripts/cube_sign.py` (needs `cryptography`) and show how to call `signRequest` / `sign_request`. Java users can use Linksfield's official SDK (`PartnerClient`, shown on each endpoint page under "SDK API Call").

**Signature v2, exactly:**

1. Message = an object holding
   - header `nonce` (random integer) and `timestamp` (epoch milliseconds, within 10 minutes of now), **both as strings**;
   - every non-empty **query** parameter under its own name, value as a string (array → comma-joined);
   - `x-sign-uri` = the full request path including `/cube/v4`, with path parameters filled in;
   - the **JSON body** fields merged in at the top level with their original types (POST/PUT/PATCH/DELETE).
2. Sort keys alphabetically (a nested object one level deep too; arrays keep their order) and serialise as compact JSON — no spaces, no newlines.
3. SHA1withRSA with the private key (PKCS#8; Cube shows it as base64 without a PEM header), Base64-encode.
4. Send headers `nonce`, `timestamp`, `X-LF-Signature-Type: 2.0`, `Authorization: LF {keyId}/{signature}`.

The docs' own GET example writes `"category_type"` in the signed message while the URL says `category`; that is a typo in the docs — sign with the parameter's real name, as the scripts do.

### 5. Confirm on the Cube side

**Developer → API Logs** shows every call made with the organisation's keys for the last 30 days (request, client IP, trace ID, status). It is the quickest way to see whether a request reached Cube and what came back.

## When a call fails

| Status | Meaning | What to check |
|---|---|---|
| 400 | Invalid parameter | Required fields, enum values, formats, against the endpoint's `.md` page |
| 401 | Unauthorised | `Authorization` header missing or not `LF {keyId}/{sign}` |
| 403 | Invalid signature | Run with `--dry-run` and compare the signed message to the rules above: `x-sign-uri` includes `/cube/v4`; nonce/timestamp are strings and match the headers; timestamp is fresh; query names are spelt as in the URL; body sent byte-for-byte as signed; key ID belongs to this private key; the right environment (a UAT key fails on production) |
| 429 | Rate limited | 10 requests/s per IP, 3 concurrent connections, 5,000 requests/day per IP |
| 500 | Service error | Retry later; if it persists, give Linksfield support the request ID from the response headers |

Error codes in the response body are listed at `https://apidoc-en.iotcube.link/doc-1488944.md`.

## Not covered here

Notifications (Cube calling the customer's server, verified with the organisation's **notification key**) and webhooks have their own pages in the docs (Developer → Webhooks / Notification Logs in the console).

## Files

- `scripts/cube-sign.mjs` — Signature v2 for Node, no dependencies: `buildMessage`, `stringifyMessage`, `sign`, `signRequest`.
- `scripts/cube_sign.py` — the same for Python (`pip install cryptography`).
- `scripts/cube-call.mjs` — sign and send one request from the command line; `--dry-run` to inspect.
- `reference/quickstart.md` — base URLs, headers, limits, docs map.
