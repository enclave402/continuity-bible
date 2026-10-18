# Continuity cards (per character, per story day) and a shot sheet (per scene) carry wardrobe, hair, accessories, marks, carried props, place and time from shot to shot; compile-shot.mjs renders one pasteable block per shot; the gate checks both; ADR-005 cites the carded research; the continuity-norms research was not yet run, so its design choices are open loops

- **Logged:** 2026-10-17T22:02:49-04:00
- **Type:** action · **Scope:** engine/continuity · **Status:** closed
- **Author:** agent:claude · **HEAD:** 8f4410c · **Id:** `wl-233cfa38-964e-4f07-baf7-e244499c1c21`
- **Tags:** continuity, engine, adr, docs, schema

## Details

Checked Downloads before designing: nothing newer than the already-carded pipeline report, so the continuity-norms prompt has no answer yet and the design rests on the private system's proven structure (story days, layered wardrobe with a transition reason, props by id with where they are, state verbs, a compiled character line) and on findings accp-08, -13, -14, -16, -17, -20, -26, -27, -30. Two new registry surface types, continuity-cards and shot-sheet, reuse exclusive_markers and add required and lead; carryContinuity() in lib.mjs is one pure engine the gate and compile-shot.mjs share; every change needs a reason; a character holds only what the card gave or a change handed over; a new story day starts from the cards and a vanished mark is a gap; the sheet must agree with the story's scene file on time_of_day, story_day and stage; the block puts the character first (accp-26), labels people CHARACTER n, and builds AVOID from held props' negative tokens and the other values of every exclusive marker. The validator gained anyOf. The example registry gained look forms, a second prop and two scenes so the hand-over, the layered wardrobe and a contextual form all compile; the tokens test's example count moved from 4 entries, 7 labels, 2 surfaces to 5, 34, 4 for that reason.

## Run record

- **files:** scripts/lib.mjs, scripts/compile-shot.mjs, scripts/character-registry.v1.schema.json, scripts/continuity-cards.v1.schema.json, scripts/shot-sheet.v1.schema.json, character-registry.json, examples/scenes.json, examples/continuity/cards.json, examples/continuity/shot-sheet.json, test/continuity.test.mjs, test/tokens.test.mjs, docs/2-how-to/HOW-TO-KEEP-CONTINUITY-SHOT-TO-SHOT.md, docs/3-reference/CONTINUITY-CARD-AND-SHOT-SHEET-FIELDS.md, docs/4-explanation/decisions/ADR-005-continuity-card-and-shot-sheet.md, docs/3-reference/REGISTRY-FIELDS.md, docs/README.md, docs/_registry/doc_index.json, docs/_registry/open_loops.md, README.md, PRODUCT.md, .context/_index.md
- **before:** the registry held who a character is; nothing carried wardrobe, props, marks, place or time between shots; the sibling continuity system had no public home
- **after:** two cards and one sheet compile to a block per shot; the gate names a missing reason, a prop in the wrong hand, a missing card, a contradicted time or place, a typed name, a sheet that disagrees with the page; 43 tests
- **removed:** none
- **verified by:** npm run verify green (names gate 5 entries, 34 labels, 4 surfaces; 43 tests; publication, worklog, research index, docs gates); the June and Abel walk in the how-to was run command by command in a scratch story folder and its outputs pasted verbatim, planted problems included
- **next:** rewrite STATE.md, commit on claude/continuity-card-and-shot-sheet, push, open a pull request to main stacked on pull requests 5, 4 and 3
