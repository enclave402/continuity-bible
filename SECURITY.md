# Security

## Reporting

Use GitHub's private vulnerability reporting on this repository (Security tab, "Report a vulnerability"). If that is unavailable, open an issue titled `security` with no exploit details and a maintainer will move the conversation to a private channel. Expect an acknowledgement within seven days.

## Scope

This project is a set of Node scripts that read and write files in your own repository and, optionally, call an LLM endpoint you configure. It runs no server, collects no telemetry and sends nothing anywhere unless you point `research/research.config.json` or the environment at a remote endpoint.

## Secrets and private data

- No credentials are stored in this repository. If a hosted endpoint needs a key, set `RESEARCH_API_KEY` in your environment or a local `.env` (gitignored).
- `scripts/check-private.mjs` refuses commits containing keys, tokens, emails, local home paths, LAN or overlay-network addresses and private-key blocks. Keep your own private words in a gitignored `.private-terms` so the gate knows them.
- Text retrieved from a corpus and handed to a model is wrapped as data (`<retrieved_evidence>`); instructions inside it are never followed.

## Supported versions

The `main` branch. Node 18 or newer.
