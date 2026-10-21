# Continuity actions 1 to 3: compile-shot pulls garment layers and outfit avoid words; check-affordance --batch prints a PASS/FAIL table; sheet.mjs shows the turnaround model sheet above the cards. npm run verify green, 134 tests.

- **Logged:** 2026-10-21T15:26:03-04:00
- **Type:** action · **Scope:** continuity · **Status:** closed
- **Author:** agent:claude · **HEAD:** 7531f00 · **Id:** `wl-74ad47fc-1d67-4123-b24b-0a05ad8ed4e7`
- **Tags:** worklog

## Details

Commits d75baff, c343f0a, 7531f00. Batch: a picture with no vision answer is Not checked and counts as FAIL; the script calls no model. Sheet: missing views show as not drawn yet; --out folder now created. End-to-end: --batch on a real folder exited 1 with one FAIL and one unchecked, 0 on the passing pattern; sheet.html rendered with example art, every turnaround image path resolved, screenshot checked.

## Run record

- **files:** scripts/lib.mjs,scripts/compile-shot.mjs,character-registry.json,scripts/character-registry.v1.schema.json,test/continuity.test.mjs,scripts/check-affordance.mjs,test/affordance.test.mjs,scripts/sheet.mjs,test/anchor.test.mjs,docs/2-how-to/HOW-TO-ENFORCE-STORY-INVARIANTS-AND-AFFORDANCES.md,docs/3-reference/REGISTRY-FIELDS.md,worklog/STATE.md
- **removed:** none
- **verified by:** npm test; npm run verify
- **next:** open the pull request; the owner merges
