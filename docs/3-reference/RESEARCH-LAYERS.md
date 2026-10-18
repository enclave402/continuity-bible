---
title: Research layers
doc_id: ref-research-layers
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/RESEARCH-LAYERS.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# Research layers

The contracts behind `research/` and `scripts/research/`. Procedure: [HOW-TO-INGEST-RESEARCH.md](../2-how-to/HOW-TO-INGEST-RESEARCH.md).

## Configuration (`research/research.config.json`)

| Key | Default | Environment override |
|---|---|---|
| `llm.base_url`, `llm.model` | a local OpenAI-compatible server, a small instruct model | `RESEARCH_LLM_BASE_URL`, `RESEARCH_LLM_MODEL` |
| `embedding.base_url`, `embedding.model` | a local server, an embedding model | `RESEARCH_EMBED_BASE_URL`, `RESEARCH_EMBED_MODEL` |
| `llm.api_key_env` | `RESEARCH_API_KEY` | the variable itself |
| `embedding.query_instruction` | an asymmetric task line prepended to queries, not to documents | edit the file |
| `chunking` | 600-token targets, 120 overlap, 4 chars per token, works-cited dropped | edit the file |
| `retrieval` | k 5, reciprocal rank fusion k 60, dense floor 0.3, findings boost 1.15 | edit the file |
| `overlap` | covered 0.70, partial 0.55 | edit the file |
| `evidence_domains.primary` | venues and preprint servers counted as primary when tallying works cited | edit the file |

An embedding base URL ending in `/v1` is treated as OpenAI-style (`/v1/embeddings`); anything else as an Ollama server (`/api/embed`). Vectors are normalised and cached per model under `research/.vectors/`; two models never share a cache.

## Card (`research/corpus/<id>.md`)

Front matter keys: `id` (= file stem), `title`, `kind`, `subjects[]`, `constructs[]`, `evidence`, `source_keys[]`, `origin`, `origin_title`, `captured`, `status` (`raw` | `reviewed`), `summary`, plus provenance written by `card.mjs`: `source_sha256`, `source_words`, `citations`, `cited_primary`, `cited_web`, `figures`. Body: the document verbatim; embedded data-URI figures become files under `corpus/assets/<id>/`. Kinds, subjects, evidence levels and strengths: `research/SUBJECTS.json`.

## Finding (`research/FINDINGS.jsonl`, one object per line)

```json
{"id": "<card-id>-sNN-kK", "situation": "plain words", "finding": "what the evidence says, hedges and numbers kept", "best_move": "the action", "why": "the mechanism", "avoid": "the mistake", "source_key": "<SOURCES key>", "corpus_refs": ["<card-id>#L<a>-<b>"], "strength": "study", "caveat": "what it does not show", "status": "checked", "subjects": ["identity-locking"]}
```

Rules enforced by `index.mjs --check`: `id`, `situation`, `finding`, `strength`, `caveat`, `status` present; `strength` from the taxonomy; `checked` requires a `source_key` present in `SOURCES.json`; `unchecked` requires a `corpus_refs` card that exists; `caution` marks a correction of an earlier finding; ids unique. `merge=union` on the file lets two branches append.

## Source (`research/SOURCES.json`)

```json
{"sources": {"arxiv-2404-16022": {"kind": "arxiv", "id": "2404.16022", "url": "...", "title": "...", "authors": [...], "year": "2024", "venue": "arXiv preprint", "abstract_excerpt": "...", "checked_at": "<iso>", "checked_how": "arxiv-api", "finding_used": "...", "caveat": "..."}}}
```

Written only by `verify.mjs` after a successful load. Keys: lower-case, digits, hyphens, underscores.

## Candidates (`research/_inbox/findings-candidates-<id>.jsonl`)

What `extract.mjs` wrote: the candidate fields plus `section`, `section_index`, `corpus_refs`, `quote`, `quote_found`, `strength_hint`, `model`, `extracted_at`, `status: candidate | empty | error`. A manifest alongside records model, counts and duration. Nothing in the inbox is cited.

## Retrieval pack (`research/retrieval/<id>/`, derived, gitignored)

`manifest.json`, `document.json`, `parents.jsonl` (one per heading section: `parent_chunk_id`, `section_path`, `source_locator`, `citation_anchor`, `chunk_ids`, `text`), `chunks.jsonl` (`chunk_id`, `parent_chunk_id`, `section_path`, `citation_anchor`, `chunk_kind`, `adjacent_chunk_ids`, `text`), `citations.json` (id → `<card path>#L<a>-L<b>`), `retrieval_guide.md`. Ids derive from content hashes; identical input gives identical output.

## Ask (`ask.mjs`)

Documents = findings + chunks of every pack present. Keyword rank (BM25) and meaning rank (dense cosine) fused by reciprocal rank fusion; findings boosted so distilled guidance outranks raw prose; `--checked` restricts to checked findings. Without an embedding endpoint it says `keyword only` and continues.
