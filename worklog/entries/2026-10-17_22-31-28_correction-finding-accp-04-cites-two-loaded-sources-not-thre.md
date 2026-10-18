# Correction: finding accp-04 cites two loaded sources, not three; the third (a Medium-hosted post) answered HTTP 403 to the loader

- **Logged:** 2026-10-17T22:31:28-04:00
- **Type:** fix · **Scope:** research · **Status:** closed
- **Author:** agent:claude · **HEAD:** 12c1fc6 · **Id:** `wl-7212cd17-0c35-4ab2-9031-4a8dc43ca687`
- **Tags:** correction, research
- **References:** wl-f2d06db0-9ca3-47e6-a084-9074bac15061

## Run record

- **files:** research/FINDINGS.jsonl, research/INDEX.*
- **before:** caveat said three write-ups were loaded
- **after:** caveat names two loaded and one refused
- **removed:** none
- **verified by:** research/SOURCES.json holds cite3 and cite16, no cite1; node scripts/research/index.mjs --check
- **next:** report
