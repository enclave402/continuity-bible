---
title: How to ingest research
doc_id: how-to-ingest-research
triadic_leg: diataxis
diataxis_mode: solve
canonical_path: docs/2-how-to/HOW-TO-INGEST-RESEARCH.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# How to ingest research

Outcome: a document someone handed you becomes a card anyone can find, a retrieval pack a lean agent can query, a set of candidate findings a person validates, verified sources, and findings the whole repository can ask. Layer contracts: [RESEARCH-LAYERS.md](../3-reference/RESEARCH-LAYERS.md). Why it is built this way: [ADR-002](../4-explanation/decisions/ADR-002-research-process-in-repo.md).

Everything below talks to the endpoints in `research/research.config.json`; override any of them with `RESEARCH_LLM_BASE_URL`, `RESEARCH_LLM_MODEL`, `RESEARCH_EMBED_BASE_URL`, `RESEARCH_EMBED_MODEL`, `RESEARCH_API_KEY`. The defaults are a local server; no step needs a paid service.

## 0. Read it all

Before filing anything, read the whole document. You will write its summary yourself, and you will judge the model's candidates against it. Never publish or summarise what you have not read.

## 1. Card it

```bash
node scripts/research/card.mjs <document.md> --id <kebab-id> --kind owner-research \
  --subjects <a,b> --constructs <x,y> --origin "<where it came from>" --status raw
```

The card is the document verbatim with front matter. Embedded images are decoded to `research/corpus/assets/<id>/`; the works-cited domains are tallied and an evidence label suggested (`--evidence` to override); the publication gate runs on the card and deletes it on a hit. Unknown subjects or kinds are refused: add one to `research/SUBJECTS.json` only when none fits.

Then set `summary:` (one or two sentences, yours) and `status: reviewed` in the front matter.

## 2. Index

```bash
node scripts/research/index.mjs            # writes research/INDEX.json and INDEX.md
node scripts/research/index.mjs --check    # what npm run verify runs
```

## 3. Pack

```bash
node scripts/research/pack.mjs <id>        # research/retrieval/<id>/ (gitignored, deterministic)
```

Parents are heading sections; chunks are question-answerable spans (about 600 tokens, 120 overlap, code fences never split); every id derives from content, so an unchanged card repacks byte-for-byte.

## 4. See what it adds

```bash
node scripts/research/overlap.mjs <id>     # NEW / PARTIAL / COVERED per section against existing findings
```

Extract from the NEW and PARTIAL sections.

## 5. Extract candidates with a local model

```bash
node scripts/research/extract.mjs <id> [--limit N]
```

One call per section; the section is handed over as data inside `<retrieved_evidence>`, and instructions inside it are never followed. Output goes to `research/_inbox/findings-candidates-<id>.jsonl` with the section's real line range, a supporting quote and whether that quote was found verbatim (`quote_found`). Nothing here writes `FINDINGS.jsonl`.

## 6. Verify the sources you will rely on

```bash
node scripts/research/verify.mjs --key <key> --arxiv <id>      # or --doi <doi> | --url <url>
```

Loads the primary source (arXiv API, Crossref, or the page) and records title, authors, year, venue, an abstract excerpt and when it was checked in `research/SOURCES.json`. A finding may be `checked` only when it names such a key. Watch for citation laundering: a report citing a blog that cites a paper is checked against the paper, not the blog. Frequency across weak sources is not evidence.

## 7. Validate and merge

For each candidate: read the lines it cites; keep hedges and numbers as written; set `strength` from the source (a benchmark number from a paper is `benchmark` or `study`; a blog's recommendation is `expert-opinion`); write the `caveat` (what the source does not show); set `status` to `checked` (with `source_key`) or `unchecked` (with `corpus_refs`). Append the line to `research/FINDINGS.jsonl`, rebuild the index, re-embed:

```bash
node scripts/research/index.mjs && node scripts/research/ask.mjs --build
```

A finding that contradicts an earlier one is added as `status: caution` stating what the stronger source shows, so the correction ranks first.

## 8. Ask

```bash
node scripts/research/ask.mjs "<situation or question>" [--k 5] [--checked] [--json]
```

Ask before opening a card. `--checked` when the answer will reach users: only checked findings, no raw chunks.

## 9. Log

Append a worklog entry (files, before, after, verified-by) and commit the card, the index, the findings and the sources together. The retrieval pack and vector cache are derived and stay out of git.
