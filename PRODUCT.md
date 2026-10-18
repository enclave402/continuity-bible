# PRODUCT.md: what this repository ships

> Half-life: weeks. A spoken change to WHAT is written here in the same turn. HOW: `AGENTS.md`. NOW: `worklog/STATE.md`.

## Buyer and job

- **Buyer:** a layperson who wants to tell an illustrated story with AI without the characters drifting: a parent making a picture book, a coach illustrating a short narrative, a hobbyist making a comic, a writer who wants unique art for a book. Secondary: teams and agents running long-form narrative pipelines.
- **Job:** keep every character the same person from the first picture to the last, keep the story's names, props and continuity straight across every prompt and page, and recover when a character has already drifted; with whatever model the person has, including a browser chatbot driven by copy and paste.
- **Positioning (owner, 2026-10-17):** completely layperson-friendly and intuitive first. "Want to use AI to tell stories without AI slop? Want unique art, or to make a book?" LLM-agnostic and API-agnostic: the proof case runs through a browser tab, not an expert node graph or an API, and the engine must still hold. Every anchor policy shows its regeneration bill and the person chooses: the proof case takes the least-regeneration state (consistency throughout over any particular endpoint); `canon` is there for whoever needs the drift undone. Drift resolution is two questions: what must never change, and for everything else fewest redraws, first look or last look.
- **Not the job:** image generation itself, hosting, any single vendor's agent harness.

## Deliverables

| Piece | Files | Done when |
|---|---|---|
| Registry and resolver | `character-registry.json`, `scripts/character-registry.v1.schema.json`, `scripts/names.mjs` | a registry-only rename renders everywhere with no source edit; an unknown token throws |
| Gate | `scripts/check.mjs`, `scripts/lib.mjs` | exits 1 on a written-out name, a duplicate, a cross-story name, a retired form, a forbidden duplicated field, a contradicted exclusive marker, an unresolved prop; reports unclassified files |
| Migration and render | `scripts/tokenize.mjs`, `scripts/render.mjs` | a source migrates byte-identically; a token source renders to built output with names |
| Drift anchor policy | `scripts/anchor.mjs`, `examples/anchor/` | two questions (`--keep` what must never change; `--prefer` fewest redraws, first look, last look; `--ask` asks them in plain words) over the developer policies origin, terminal, consensus, mode and canon, on any encoder's embeddings or hand tags alone; the chosen anchor, the kept tags and the preference are recorded in the registry; the comparison line shows every answer's regeneration bill within the kept tags, by similarity with embeddings and by tags without |
| Research process | `research/`, `scripts/research/*.mjs`, `research/research.config.json` | card → index → retrieval pack → local-model candidates → verified sources → findings → ask; every endpoint and model configurable |
| Repository norms | `AGENTS.md`, `.context/`, `worklog/`, `docs/`, `scripts/check-private.mjs`, `scripts/git-hooks/` | `npm run verify` green on a clean clone; nothing private in the tree |
| Layperson pass | `README.md`, `docs/1-tutorials/START-HERE.md`, `docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md` | a first-time, non-technical reader makes one consistent two-character scene with a browser chatbot from the docs alone; every command in them runs as written; hand tags drive `origin`, `terminal`, `mode` and `canon` with no API |
| Shot-to-shot continuity | `examples/continuity/`, `scripts/compile-shot.mjs`, `scripts/continuity-cards.v1.schema.json`, `scripts/shot-sheet.v1.schema.json`, `docs/2-how-to/HOW-TO-KEEP-CONTINUITY-SHOT-TO-SHOT.md` | a layperson fills two continuity cards (per character, per story day) and one shot sheet (per scene) from the how-to and gets one block to paste per shot; wardrobe, hair, accessories, marks, carried props, place and time carry forward by themselves; every change needs a reason; the gate catches a missing reason, a prop in the wrong hand, a missing card, a contradicted time or place, a typed name, and a sheet that disagrees with the page. Designed on the private system's proven shape and the carded research (ADR-005); the continuity-norms research prompt is still to be run, and its findings close the open loops listed there |
| Render surfaces | `character-registry.json` (`render_surfaces`, `render_templates`), `scripts/compile-shot.mjs`, `scripts/lib.mjs`, `examples/templates/` | where a picture will be used is a structure written once in the author's words (name, style_lock, must_keep, exclude, size, no_text, hands_rule, why); every shot names its surface; the block ends with KEEP and AVOID compiled from it; the same prop compiles to a story panel without packaging and to a product card that is packaging; a template, prompt or token source that retypes a rule fails with the file, the phrase and "read it from the surface" (owner, 2026-10-17: hardcoded rules are brittle; this must be a structure in the deliverable) |
| Before-and-after journey | `docs/4-explanation/BEFORE-AND-AFTER-A-DRIFTED-LEAD.md`, `docs/4-explanation/assets/before-after/` | the page shows the published story's own drift with real pictures (the lead's 85 scenes found by token, 58 faces tagged by hand with one fixed trait), every answer's anchor and bill side by side from the engine's own output, the owner's stated reason for the choice (eyes kept, fewest redraws for the rest, story facts in prose), the proposed list, and the before-and-after pairs as the author approves each redo |

## Planned (owner direction 2026-10-17; not yet built)

| Piece | What it is | Done when |
|---|---|---|
| Continuity norms research | run `research/corpus/prompts/continuity-norms-and-structures-prompt.md` in a deep-research tool and ingest the answer (card, index, pack, overlap, extract, verify, merge) | the open loops of ADR-005 each close against a finding id, by confirmation or by an amendment to the card and sheet fields |

## Evidence class

- **Production use:** the registry and resolver run the name build of a published illustrated story (see README). That is this product's live use, not a category analog. The same story's visual drift is the demonstration case for the anchor policies.
- **Research findings:** graded per finding in `research/FINDINGS.jsonl` (`checked` only when the primary source was loaded and recorded in `research/SOURCES.json`). Everything else is `unchecked` and says so.
- **Drift policies:** mathematical selection over embeddings or tags supplied by the user; no accuracy claim is made for any specific encoder.

## Definition of done for a change

`npm run verify` passes; new docs are registered in `docs/_registry/doc_index.json`; the trail has the entry; `STATE.md` says what is now true; the change ships as a pull request; a layperson could follow any new user-facing step.
