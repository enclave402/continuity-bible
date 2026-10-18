# 35 findings merged from 75 local-model candidates after validation against the card; 15 checked against verified arXiv abstracts, 1 caution, 19 unchecked with line-range refs

- **Logged:** 2026-10-17T20:35:39-04:00
- **Type:** milestone · **Scope:** research · **Status:** closed
- **Author:** agent:claude · **HEAD:** 29c7f4c · **Id:** `wl-f338025e-51af-4bd0-be16-663e28e39be1`
- **Tags:** research, findings
- **References:** research/FINDINGS.jsonl, research/SOURCES.json

## Details

Rejected or rewrote candidates whose numbers were figure placeholders or invented (e.g. a benchmark line with fabricated scores, a wrong VAE stride), merged near-duplicates, kept hedges. Caution finding accp-34: the report's cross-family latent-bridge claim exceeds what the cited abstract states. Overlap now reports COVERED on 10 of the first 11 sections.

## Run record

- **files:** research/FINDINGS.jsonl, research/INDEX.json, research/INDEX.md
- **before:** 0 findings
- **after:** 35 findings (15 checked, 1 caution, 19 unchecked); 93 documents embedded
- **removed:** none
- **verified by:** node scripts/research/index.mjs --check pass; ask --checked returns accp-15/11/18 for an edit-chaining question; overlap COVERED/PARTIAL across sections
- **next:** state rewrite, verify, commits, PR
