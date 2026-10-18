# Owner direction (evening): layperson-first, browser-flow proof case, canon beats cheapest; recorded in PRODUCT.md. Added the canon anchor policy + canon_tags, carded the continuity-norms research prompt

- **Logged:** 2026-10-17T20:44:56-04:00
- **Type:** decision · **Scope:** product · **Status:** closed
- **Author:** agent:claude · **HEAD:** b53d2e3 · **Id:** `wl-b939ce37-91fc-4cc5-9480-dcc596329204`
- **Tags:** product, decision, anchor
- **References:** PRODUCT.md, scripts/anchor.mjs, research/corpus/prompts/continuity-norms-and-structures-prompt.md

## Details

The pasted deep-research excerpt framed anchor choice as minimising regeneration (the lead drifted toward white for most of the book, so keeping her white is cheapest). The owner's intent is the opposite: the lead's canon is mixed-race and darker-skinned; the drift is the defect. anchor.mjs gains a canon policy that keeps only images matching owner-written canon_tags and prints the price; comparePolicies shows every policy. Planned pieces (layperson pass, before-and-after journey, shot-to-shot continuity) are in PRODUCT.md and STATE.md as next steps; none is built.

## Run record

- **files:** scripts/anchor.mjs, scripts/character-registry.v1.schema.json, test/anchor.test.mjs, docs/2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md, docs/3-reference/REGISTRY-FIELDS.md, docs/4-explanation/decisions/ADR-004-retrospective-anchor-policy.md, README.md, PRODUCT.md, research/corpus/prompts/continuity-norms-and-structures-prompt.md, research/INDEX.*, worklog/STATE.md
- **before:** four anchor policies; PRODUCT.md described the team buyer
- **after:** five policies incl. canon; PRODUCT.md leads with the layperson and lists three planned pieces; prompt card indexed
- **removed:** none
- **verified by:** node --test 21/21; node scripts/anchor.mjs --policy canon --canon hair='copper red' picks p02 with 8 to regenerate; npm run verify green
- **next:** commit, push; propose the three sessions
