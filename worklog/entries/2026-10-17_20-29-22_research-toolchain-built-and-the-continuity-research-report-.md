# Research toolchain built and the continuity research report ingested end to end on local models

- **Logged:** 2026-10-17T20:29:22-04:00
- **Type:** action · **Scope:** research · **Status:** closed
- **Author:** agent:claude · **HEAD:** 29c7f4c · **Id:** `wl-8a9a1c46-1f54-4a5b-af17-aa02eb743f18`
- **Tags:** research, ingest
- **References:** research/corpus/ai-character-continuity-pipeline-research.md, research/SOURCES.json, research/_inbox/findings-candidates-ai-character-continuity-pipeline-research.jsonl

## Details

scripts/research: config, embed (Ollama or OpenAI-style), llm (OpenAI-style chat), card, index, pack, overlap, extract, verify, ask. Report carded as ai-character-continuity-pipeline-research (13,601 words, 221 figures decoded to assets, 160 citations: 39 primary / 121 web -> evidence mixed), read in full, summary written, status reviewed. Pack: 30 parents, 58 chunks, ~27.9k tokens. 58 chunks embedded with the configured embedding model. Extraction with the configured local instruct model: 26 sections, 75 candidates in research/_inbox. 20 cited arXiv papers verified through the arXiv API into research/SOURCES.json.

## Run record

- **files:** scripts/research/*.mjs, research/**
- **before:** no research folder
- **after:** card, index, pack, vectors, 75 candidates, 20 verified sources; FINDINGS.jsonl still empty
- **removed:** none
- **verified by:** node scripts/research/index.mjs --check pass; ask --build 58 vectors; overlap: all NEW; ask demo returns the wardrobe/prop sections
- **next:** validate candidates and merge findings
