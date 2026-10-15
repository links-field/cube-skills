# Cube API quick reference

Source: https://apidoc-en.iotcube.link (Overview, Signature v2, Error Code, Test API). Check the live docs when in doubt.

## Environments

| | Base URL | Console |
|---|---|---|
| Production | `https://api.linksfield.net/cube/v4` | https://www.iotcube.link (stable) · https://new.iotcube.link (new console, trial rollout) |
| UAT | `https://api-uat.io.linksfield.net/cube/v4` | provided by Linksfield for testing |

Keys are per environment: a UAT key does not work on production.

## Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `LF {keyId}/{sign}` |
| `timestamp` | yes | epoch milliseconds, within 10 minutes of the request |
| `nonce` | yes (always send it) | random integer |
| `X-LF-Signature-Type` | recommended | `2.0` |
| `Content-Type` | no | `application/json` |
| `Accept-Language` | no | `en-US` (default) |
| `X-LF-Api-Version` | no | pins an API version; default is the latest minus one |

## Conventions

- Times in parameters are epoch milliseconds, UTC.
- Lists return at most 100 items per request: `page_no` + `page_size`, or `page_size` + `last_cursor` for big-data stores.
- At most two versions of an API live at once; a deprecated version is retired 12 months after its successor ships.

## Limits

- 10 queries per second per IP, 3 concurrent connections, 5,000 queries per day per IP. Over the limit: HTTP 429.
- SLA 99%; average response 5 s, p99 under 4 s (excluding network).

## Status codes

200 success · 400 invalid parameter · 401 unauthorised (no Authorization) · 403 invalid signature · 429 rate limited · 500 service error.

## Docs map

- Index of all pages: `https://apidoc-en.iotcube.link/llms.txt`
- Any page as Markdown: add `.md` to its URL.
- Overview `/doc-1488943` · Signature v2 `/doc-2092731` · Error codes `/doc-1488944` · Test API (Apifox, with a pre-configured UAT key) `/doc-2154441`
- Groups: SIM, Service (activate, suspend, resume, reset, add bundle…), Usage, SMS, CDR, Others, SKU, Order.

## Testing in Apifox

The Test API page explains how to run any endpoint from the docs in Apifox: choose the UAT environment (a test key is pre-configured), pick the preset case, send; the console prints every signing step. Its `sign-v2` pre-processor is the reference implementation these scripts follow.
