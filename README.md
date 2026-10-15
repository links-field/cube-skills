# Cube skills

Skills that teach AI coding agents (Claude Code and others that read `SKILL.md`) to work with **Linksfield Cube**, the IoT connectivity platform.

| Skill | What it does |
|---|---|
| [`cube-api`](skills/cube-api/SKILL.md) | Integrate with Cube API Enterprise: create an API key, find endpoints in the [API docs](https://apidoc-en.iotcube.link), sign requests (Signature v2), call them, debug 401/403/429. Ships signing scripts for Node and Python, checked against the official reference implementation. |

## Install

```bash
npx skills add links-field/cube-skills
```

Or as a Claude Code plugin:

```bash
claude plugin marketplace add links-field/cube-skills
claude plugin install cube@linksfield
```

## Then ask

> Use the Cube API to list the plans on SIM 89852202306250040073.

The agent walks through getting a key, finds the endpoint, signs and sends the request, and explains any error.

Your private key never needs to enter the conversation: the scripts read it from `CUBE_PRIVATE_KEY` or `CUBE_PRIVATE_KEY_FILE`.

## Development

```bash
node test/check.mjs      # Node signer against reference vectors
python3 test/check.py    # Python signer (pip install cryptography)
```

`test/vectors.json` was produced by the docs' Apifox `sign-v2` script with a throwaway key generated only for these tests.
