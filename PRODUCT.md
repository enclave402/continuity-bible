# PRODUCT.md: what this repository ships

**What this is:** the list of what this repo ships, who it is for, and when each piece is done.
**Why it exists:** so WHAT we build lives in one place, apart from HOW we work (`AGENTS.md`).
**How to use it:** find the piece you are touching in Deliverables. Then meet its "Done when" line.
**Next step:** if a spoken change alters what ships, write it here in the same turn.

> Half-life: weeks. A spoken change to WHAT is written here in the same turn. HOW: `AGENTS.md`.

## Buyer and job

- **Buyer:** a layperson who wants to tell an illustrated story with AI without the characters drifting: a parent making a picture book, a coach illustrating a short narrative, a hobbyist making a comic, a writer who wants unique art for a book. Secondary: teams and agents running long-form narrative pipelines.
- **Job:** keep every character the same person from the first picture to the last, keep the story's names, props and continuity straight across every prompt and page, and recover when a character has already drifted; with whatever model the person has, including a browser chatbot driven by copy and paste.
- **Positioning (owner, 2026-10-17):** completely layperson-friendly and intuitive first. "Want to use AI to tell stories without AI slop? Want unique art, or to make a book?" LLM-agnostic and API-agnostic: the proof case runs through a browser tab, not an expert node graph or an API, and the engine must still hold. Every anchor policy shows its regeneration bill and the person chooses: the proof case takes the least-regeneration state (consistency throughout over any particular endpoint); `canon` is there for whoever needs the drift undone. Drift resolution is two questions: what must never change, and for everything else fewest redraws, first look or last look.
- **Not the job:** making the images (any image tool plugs in), hosting, any single vendor's agent harness. **Part of the job:** saying exactly how each character looks, and checking every image against that.

## Why this exists: two masters

The framework is sold because its methods were proven first on a product, with measured simulated-reader numbers. Those runs showed what works. This repository writes the methods down so a layperson can get the same kind of output in an easier way.

Master 1 is the product. It is the story a reader follows, finishes, and remembers, and the price they would gladly have paid. Nothing in this repository changes that story or its price.

Master 2 is the framework. It is the process: how a change is tested, how a lesson is kept, and how the next person can run it. The lessons are in `docs/LESSONS.md`. Each one names the framework element the lesson itself names, and that element's public state.

Today the eleven elements stand at the counts the feed printed: `public states: shipped 2, partial 1, to extract 8`. Shipped means the piece is already in this repository. Partial means part of it is here. To extract means the method was proven on the product and is not here yet.

Wherever this page mentions the product's numbers, they are simulated-reader numbers. They are not a count of a human audience.

## Deliverables

| Piece | Files | Done when |
|---|---|---|
| Registry and resolver | `character-registry.json`, `scripts/character-registry.v1.schema.json`, `scripts/names.mjs` | a registry-only rename renders everywhere with no source edit; an unknown token throws |
| Gate | `scripts/check.mjs`, `scripts/lib.mjs` | exits 1 on a written-out name, a duplicate, a cross-story name, a retired form, a forbidden duplicated field, a contradicted exclusive marker, an unresolved prop; reports unclassified files |
| Migration and render | `scripts/tokenize.mjs`, `scripts/render.mjs` | a source migrates byte-identically; a token source renders to built output with names |
| Drift anchor policy | `scripts/anchor.mjs`, `examples/anchor/` | two questions (`--keep` what must never change; `--prefer` fewest redraws, first look, last look; `--ask` asks them in plain words) over the developer policies origin, terminal, consensus, mode and canon, on any encoder's embeddings or hand tags alone; the chosen anchor, the kept tags and the preference are recorded in the registry; the comparison line shows every answer's regeneration bill within the kept tags, by similarity with embeddings and by tags without |
| Research process | `research/`, `scripts/research/*.mjs`, `research/research.config.json` | card → index → retrieval pack → local-model candidates → verified sources → findings → ask; every endpoint and model configurable |
| Repository norms | `AGENTS.md`, `.context/`, `docs/`, `scripts/check-private.mjs`, `scripts/git-hooks/` | `npm run verify` green on a clean clone; nothing private in the tree |
| Layperson pass | `README.md`, `docs/1-tutorials/START-HERE.md`, `docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md`, `scripts/tag.mjs`, `scripts/new-character.mjs` | a first-time, non-technical reader makes one consistent two-character scene with a browser chatbot from the docs alone, with their own characters if they like, written by answering questions; every command in them runs as written; hand tags drive `origin`, `terminal`, `mode` and `canon` with no API |
| Shot-to-shot continuity | `examples/continuity/`, `scripts/compile-shot.mjs`, `scripts/continuity-cards.v1.schema.json`, `scripts/shot-sheet.v1.schema.json`, `docs/2-how-to/HOW-TO-KEEP-CONTINUITY-SHOT-TO-SHOT.md` | a layperson fills two continuity cards (per character, per story day) and one shot sheet (per scene) from the how-to and gets one block to paste per shot; wardrobe, hair, accessories, marks, carried props, place and time carry forward by themselves; every change needs a reason; the gate catches a missing reason, a prop in the wrong hand, a missing card, a contradicted time or place, a typed name, and a sheet that disagrees with the page. Designed on the private system's proven shape and the carded research (ADR-005); the continuity-norms research prompt is still to be run, and its findings close the open loops listed there |
| Render surfaces | `character-registry.json` (`render_surfaces`, `render_templates`), `scripts/compile-shot.mjs`, `scripts/lib.mjs`, `examples/templates/` | where a picture will be used is a structure written once in the author's words (name, style_lock, must_keep, exclude, size, no_text, hands_rule, why); every shot names its surface; the block ends with KEEP and AVOID compiled from it; the same prop compiles to a story panel without packaging and to a product card that is packaging; a template, prompt or token source that retypes a rule fails with the file, the phrase and "read it from the surface" (owner, 2026-10-17: hardcoded rules are brittle; this must be a structure in the deliverable) |
| Story element continuity | `scripts/scene.v1.schema.json`, `scripts/edition.v1.schema.json`, `scripts/story.mjs`, `scripts/check-story-built.mjs`, `scripts/check-story-art.mjs`, `scripts/check-story-retired.mjs`, `examples/story/`, `docs/2-how-to/HOW-TO-REORDER-AND-RETIRE-SPREADS.md`, `docs/3-reference/SCENE-AND-EDITION-FIELDS.md` | the story is one record per scene (title, words, the picture sentence, time, layout, picture files; names as tokens) and one list per reading order (`order`, `retired`); every spread number is derived from position; the loader refuses an unknown slug, a slug listed twice, a scene neither placed nor retired; the renderer prints each spread as a reader meets it and `built/` is diffed against the source; every picture a placed scene lists exists, every picture nothing loads is parked with a reason, and a picture leaves only with the author's note; the example story renders in both of its editions with one spread retired and nothing deleted; a layperson retires a spread and writes a second telling from the how-to alone (ADR-006) |
| Edit round trip and the owner's-words boundary | `scripts/story-variants.mjs`, `scripts/variants.v1.schema.json`, `examples/story/variants.json`, `docs/2-how-to/HOW-TO-TEST-A-CHANGE-BEFORE-YOU-MAKE-IT.md`, `docs/3-reference/VARIANTS-AND-THE-APPLIED-RECORD.md` | a change to the words is a named, composable variant applied to the rendered text and never to the records (replace a phrase in one spread, in every spread, or in the one spread that holds it, failing if none or several do; drop spreads; a banner line; add a spread from a draft), so a tested text is reproducible from its name; `apply` checks the parser against every record, renders the tested text (equal to the `--tested` file or it stops), parses each spread back into its fields, writes only the fields that differ with names put back as tokens and verified by resolving them again, retires dropped spreads in every edition and parks their pictures, and records what it did and what it left in `variants-applied.json`; the gate is that the written records render equal to the tested text spread for spread and the names gate passes, else every file is put back; a spread the tests want is a `new-*` slot whose position is recorded in every edition, whose draft is a `_draft` note, and whose fields the loader refuses to see filled: the words are the author's, claimed by renaming (ADR-007); the example's six variants round-trip with zero differences and a layperson runs the loop from the how-to alone |
| Simulated panel checks | `scripts/panel.mjs`, `examples/panel/`, `docs/2-how-to/HOW-TO-CHECK-A-SIMULATED-PANEL.md` | a quote is a verbatim substring of the spread it names, or the check fails; a no-read reader above the quiz ceiling throws the quiz out, and a file with no no-read reader fails; the paired difference for one numeric field is the mean over readers on both sides, unpaired readers are counted and not filled in, and `check-report` refuses a report that is not the script's own text; every report says the result is simulated, is not a human audience, and that the script does not decide which text wins (ADR-008). Persona records, a sandbox and price-perception questions are not in this slice |
| Intrinsic laterality & chirality invariant gate | `scripts/wardrobe-and-props.v1.schema.json`, `scripts/check-prop-continuity.mjs`, `examples/continuity/wardrobe-and-props.json`, `docs/3-reference/INTRINSIC-VS-SCREEN-SPACE-LATERALITY.md` | Karpathian self-announcing architecture; projects intrinsic anatomical limb coordinates (egocentric) into 2D viewer screen space (allocentric) across all camera facings; `npm run check:props` and `npm test` eliminate diffusion laterality inversion |
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

`npm run verify` passes; new docs are registered in `docs/_registry/doc_index.json`; the change ships as a pull request; a layperson could follow any new user-facing step.
