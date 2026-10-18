---
title: ADR-002 The research process lives in the repo and runs on a local model
doc_id: adr-002-research-process-in-repo
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/decisions/ADR-002-research-process-in-repo.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# ADR-002: research is ingested by a repository-native toolchain that any agent can run on a local model

**Status:** accepted, 2026-10-17.
**Deciders:** the owner asked for the machine's research process, including its ingestion skill and local model, to be established in this repository and used on the continuity research report; the agent built the toolchain.

## Context

The machine-wide process has five layers (corpus cards, a generated index, atomic findings, checked sources, hybrid retrieval) and a knowledge-compile skill that produces deterministic retrieval packs. Its tools live in a private folder, import a private embedding client, and default to one machine's model registry. A public repository cannot depend on any of that, and a research document handed to it (here: an 860 KB owner-run deep-research report with 221 embedded figures and 160 citations) had to be filed, chunked, mined and verified without leaking anything.

## Decision

1. Port the process into `scripts/research/` as nine small Node scripts with no dependencies: `card`, `index`, `pack`, `overlap`, `extract`, `verify`, `ask`, plus the `embed` and `llm` clients and a `config` resolver. The retrieval pack keeps the knowledge-compile artifact contract (manifest, document, parents, chunks, citations, guide) and is deterministic.
2. Talk to models only through `research/research.config.json` and environment variables. The embedding client accepts an Ollama server or any OpenAI-compatible endpoint; the chat client accepts any OpenAI-compatible endpoint. The committed defaults are local; nothing in the flow needs a paid service, and nothing names a machine.
3. Keep humans in the loop where judgement is: the model writes candidates to `research/_inbox/` with line ranges and quotes; a person validates each against the card, verifies sources through `verify.mjs`, and merges into `FINDINGS.jsonl`. `checked` is reserved for findings whose source was loaded and recorded.
4. Treat retrieved and extracted text as data: section text is handed to the model inside `<retrieved_evidence>`, and instructions inside it are never followed.
5. Run the publication gate on every card, and refuse a card the gate rejects.
6. Commit the corpus, index, findings and sources; keep the retrieval pack and vector cache derived and gitignored, regenerable with one command each.

## Consequences

- The first ingestion ran end to end on this machine: the report was carded with its figures decoded to files, indexed, packed into 30 parents and 58 chunks, embedded, mined by a local 8-billion-parameter instruct model section by section, and twenty cited arXiv papers were verified through the arXiv API before any finding was marked checked.
- The same commands work on a hosted endpoint by setting two variables, so a user without a local model is not excluded.
- Evidence quality is visible, not assumed: the card's front matter records the works-cited tally (39 primary, 121 web), each finding carries a strength and a caveat, and the index counts checked against unchecked.
- The private machine's process and this one share schemas, so a card or a finding can move between them without translation.
