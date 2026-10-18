# STATE: narrative-token-ssot

**Last rewritten:** 2026-10-18 00:20 EDT
**HEAD:** aca876c
**Date:** 2026-10-18
**Session:** integration of pull requests 6 and 7 into pull request 8, so one merge lands all three; loop-closing fixes

## 1. Current verified facts

- WHAT: `PRODUCT.md`. HOW: `AGENTS.md` (alias `CLAUDE.md`). Routing: `.context/_index.md`. Norms: `docs/4-explanation/REPOSITORY-NORMS.md`.
- `main` is at 11cbd2c (pull requests 3, 4 and 5, merged by the owner on 2026-10-17 22:18 EDT). Branch `claude/close-open-loops` (pull request 8) now contains pull request 6 (`claude/continuity-card-and-shot-sheet`) and pull request 7 (`claude/before-and-after-journey`) merged in, with their conflicts resolved once; merging pull request 8 lands all three, and GitHub marks 6 and 7 merged.
- Gate: `npm run verify` (names gate, tests, publication gate, worklog gate, research index, docs registry), green on this branch. The worklog gate counts helm lag on first-parent, non-merge commits.
- Names: one registry, `{{id}}` tokens, render to built output, props by id, contextual forms, forbidden duplicate keys, exclusive markers, a coverage report (ADR-003). `tokenize.mjs` never rewrites a card's own `scene_name`.
- Drift: two questions (ADR-004 and its amendments). What must never change (`--keep`, or the entry's `canon_tags`); for everything else, fewest redraws, first look, last look or most common (`--prefer`); `--ask` asks both in plain words. A kept tag the person could not read (default word `unknown`, the registry's `drift_resolution.unreadable` replaces it) is never drift: such a picture is not eligible as the anchor and is not billed for the kept tag. The bill is by cosine with embeddings and by tags without. `scripts/sheet.mjs` writes one static HTML page of every picture in the order it was made, coloured anchor, redraw, replaced, cannot tell, keep, from the same engine as the report, with the dated replacements record (`drift_resolution.replacements`) shown as before-and-after pairs. Both scripts run through a symlinked folder.
- Shot-to-shot continuity (ADR-005, from pull request 6): continuity cards per character per story day and a shot sheet per scene; carried state passes forward by itself, every change needs a reason; `scripts/compile-shot.mjs` prints one pasteable block per shot ending in KEEP and AVOID; the gate catches a missing reason, a prop in the wrong hand, a missing card, a contradicted time or place, a typed name, a sheet that disagrees with the scene file.
- Render surfaces (from pull request 6, owner 2026-10-17: hardcoded rules are brittle, this must be a structure in the deliverable): `render_surfaces` in the registry, one per kind of picture, written once in the author's words; every shot names its surface; the block compiles KEEP and AVOID from it; a template, prompt or token source that retypes a rule fails with the file, the phrase and "read it from the surface".
- Before-and-after journey (from pull request 7): `docs/4-explanation/BEFORE-AND-AFTER-A-DRIFTED-LEAD.md` shows the engine on the published story's lead with real pictures, every answer's anchor and bill from the engine's own output, and the owner's reason (eyes kept, fewest redraws for the rest, heritage in prose). The owner confirmed the anchor (the sacred confession) and the 21-picture list; the anchor is recorded privately; redraws run privately and are shown to the owner in batches; each approved pair is added to the page.
- Layperson pass: README for a non-technical reader, `docs/1-tutorials/START-HERE.md`, `docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md`; every command in them was executed and matched.
- Research: 2 cards (the continuity report, reviewed; the continuity-norms prompt, not yet run), 35 findings (15 checked, 1 caution, 19 unchecked), 25 recorded sources (20 arXiv through the arXiv API, 5 web pages loaded at their URLs; one refused automated access). Blog sources never make a finding checked.
- Docs: 17 canonical documents registered.
- Private consumer repository: issues 1 to 5 and 7 of the owner's log are on its main (props by id and the stage-compiled attitude, one owner per scene description, program data through the registry, a kind on each fix, surface rules as data); issue 6's label contradiction was fixed by relabelling the day, and its gate is being added; issue 8 stays as designed. The corrections to the drift-journey merge request are open there.

## 2. Closed directions, with evidence

- **CLOSED:** look and style rules typed into prompts, templates or builders; they are `render_surfaces`, written once; the gate refuses a retyped phrase.
- **CLOSED:** waiting for the continuity-norms research before shipping shot-to-shot continuity; built on the private system's proven shape and the carded findings, with every choice to confirm listed in ADR-005.
- **CLOSED:** writing carried state on every shot; only cards and changes are written, and a change without a reason fails.
- **CLOSED:** naming characters or props in compiled blocks or shot text; people are CHARACTER 1, 2 with the registry's `look` form; props are ids or `{{prop-id}}` tokens.
- **CLOSED:** policy names as the user-facing vocabulary, and "canon beats cheapest" as the rule; the user answers two questions; fewest redraws is the default.
- **CLOSED:** counting a trait the person could not see (eyes closed, face turned away) as drift.
- **CLOSED:** seeing drift only through a Python image library; `scripts/sheet.mjs` is one static page with no dependencies.
- **CLOSED:** a tutorial that needs an API, a local model or a node graph; the proof case is a browser chatbot.
- **CLOSED:** copying the machine-wide agent instruction block into this repo; hosted continuous integration; committing retrieval packs and vector caches; matching prop names in prose; a Markdown sidecar log; root-level temp dumps; files that point at a private machine folder or name the owner; `checked` findings without a loaded source.

### Conflicts with AGENTS (must be empty)

- None.

## 3. Prioritised next steps

- [ ] **Next action:** the owner merges pull request 8 (`gh pr merge 8 --merge`), which lands 6 and 7 with it.
- [ ] Owner, optional: run `research/corpus/prompts/continuity-norms-and-structures-prompt.md` in a deep-research tool and drop the answer in Downloads; it is then carded, mined and verified, and each ADR-005 open loop closes against a finding id.
- [ ] Each redraw batch the owner approves adds before-and-after pairs to the drift page and lines to the private replacements record.
