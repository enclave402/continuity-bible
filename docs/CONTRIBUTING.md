# Documentation placement policy

Three legs, no invented buckets. Put a document where its reader's intent is, not where it was written.

## Legs

| Leg | Path | Content |
|---|---|---|
| C4 | `docs/c4/` | Diagrams, system maps |
| Arc42 | `docs/arc42/` | Formal architecture sections |
| Diataxis | `docs/1-tutorials/` | Learn: guided walkthroughs |
| Diataxis | `docs/2-how-to/` | Solve: operational procedures |
| Diataxis | `docs/3-reference/` | Look up: specs, field lists, catalogues |
| Diataxis | `docs/4-explanation/` | Understand: rationale, decisions (ADRs), reviews |

## Decision tree

1. Primarily a diagram or map? `docs/c4/`.
2. A formal architecture section? `docs/arc42/`.
3. Otherwise by reader intent: learn, solve, look up, understand.
4. One file serving two intents? Split it.
5. Genuinely unresolved? Log it in `docs/_registry/open_loops.md` rather than inventing a folder.

## Anti-buckets (never create)

`docs/meta`, `docs/artifacts`, `docs/research`, `docs/notes`, `docs/handoff`, `docs/tasks`, ad-hoc numbered prefixes. Research corpora live in `research/` at the repo root; their how-to lives in `docs/2-how-to/`.

## Naming

`UPPER-KEBAB-CASE.md` for documents; ADRs as `ADR-NNN-short-slug.md`; data companions lowercase with underscores.

## Frontmatter (canonical docs)

```yaml
---
title: <title>
doc_id: <unique-id>
triadic_leg: c4 | arc42 | diataxis
diataxis_mode: learn | solve | lookup | understand
canonical_path: docs/<path>
status: active | planned | deprecated
last_reviewed: YYYY-MM-DD
canonical: true
---
```

Register every canonical doc in `docs/_registry/doc_index.json` and link it from `docs/README.md`. `node scripts/check-docs.mjs` fails on an unregistered canonical doc, a registered path that does not exist, or missing frontmatter.
