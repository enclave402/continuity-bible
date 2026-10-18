# PRODUCT.md: what this repository ships

> Half-life: weeks. A spoken change to WHAT is written here in the same turn. HOW: `AGENTS.md`. NOW: `worklog/STATE.md`.

## Buyer and job

- **Buyer:** anyone producing long-form AI-assisted narrative (graphic novels, illustrated stories, game writing, serialized fiction) with coding agents and image models, alone or in a team.
- **Job:** one name per character across every source, prompt and built page; a gate that fails drift before it ships; a repeatable way to turn a research document into checked, retrievable findings; a policy engine that picks a visual anchor after a character has already drifted.
- **Not the job:** wardrobe, prop and blocking continuity cards (a sibling system this registry references), image generation itself, hosting, any single vendor's agent harness.

## Deliverables

| Piece | Files | Done when |
|---|---|---|
| Registry and resolver | `character-registry.json`, `scripts/character-registry.v1.schema.json`, `scripts/names.mjs` | a registry-only rename renders everywhere with no source edit; an unknown token throws |
| Gate | `scripts/check.mjs`, `scripts/lib.mjs` | exits 1 on a written-out name, a duplicate, a cross-story name, a retired form, a forbidden duplicated field, a contradicted exclusive marker, an unresolved prop; reports unclassified files |
| Migration and render | `scripts/tokenize.mjs`, `scripts/render.mjs` | a source migrates byte-identically; a token source renders to built output with names |
| Research process | `research/`, `scripts/research/*.mjs`, `research/research.config.json` | card → index → retrieval pack → local-LLM candidates → verified sources → findings → ask; every endpoint and model configurable |
| Drift anchor policy | `scripts/anchor.mjs`, `examples/anchor/` | origin, terminal, consensus and mode policies over any encoder's embeddings; the chosen anchor is recorded in the registry |
| Repository norms | `AGENTS.md`, `.context/`, `worklog/`, `docs/`, `scripts/check-private.mjs`, `scripts/git-hooks/` | `npm run verify` green on a clean clone; nothing private in the tree |

## Evidence class

- **Production use:** the registry and resolver run the name build of a published illustrated story (see README). That is this product's live use, not a category analog.
- **Research findings:** graded per finding in `research/FINDINGS.jsonl` (`checked` only when the primary source was loaded and recorded in `research/SOURCES.json`). Everything else is `unchecked` and says so.
- **Drift policies:** mathematical selection over embeddings supplied by the user's encoder; no accuracy claim is made for any specific encoder.

## Definition of done for a change

`npm run verify` passes; new docs are registered in `docs/_registry/doc_index.json`; the trail has the entry; `STATE.md` says what is now true; the change ships as a pull request.
