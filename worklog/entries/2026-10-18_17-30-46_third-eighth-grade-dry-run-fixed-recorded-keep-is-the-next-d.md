# Third eighth-grade dry run fixed: recorded keep is the next default and a replacing yes is said; wrong tags file named; tag.mjs shows what Enter repeats and re-asks after a note; curly values located; JUNE, empty and command-filled scenes fail

- **Logged:** 2026-10-18T17:30:46-04:00
- **Type:** fix · **Scope:** docs/layperson · **Status:** closed
- **Author:** agent:claude · **HEAD:** d7787f9 · **Id:** `wl-1658d7f6-30a7-4221-b53b-a1ea20f6ed5b`
- **Tags:** fix, layperson, dry-run, anchor, tag, gate, docs

## Details

Third fresh agent on 337747e: documented path matched exactly with no stuck step; off it, a curly-quoted value got an error with no line, a typed command typo looped on 'wrong folder', invalid ids were offered as fixes, and eight silent misses (root registry overwritten without cd, empty or command scenes passing, JUNE in capitals passing, near-duplicate tag values, tag.mjs note then next trait, asking again ignoring the recorded keep, wrong tags file sending the reader to redraw, Character-Registry.json read silently). All in scope fixed with tests except overwriting the root registry, which the docs now prevent with a pwd check before the first paste.

## Run record

- **files:** scripts/anchor.mjs, scripts/tag.mjs, scripts/lib.mjs, scripts/names.mjs, scripts/render.mjs, scripts/check.mjs, test/anchor.test.mjs, test/gate.test.mjs, README.md, docs/1-tutorials/START-HERE.md, docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md, docs/4-explanation/decisions/ADR-003-continuity-gate-extensions.md, docs/4-explanation/decisions/ADR-004-retrospective-anchor-policy.md
- **before:** asking again reverted to canon_tags and a yes replaced the anchor unsaid; tag.mjs Enter could carry a grey beard forward unseen; curly value error had no line; JUNE and empty scenes passed
- **after:** recorded keep is the default and replacing is said; Enter shows its value; errors located; capitals, empty and command scenes fail
- **removed:** none
- **verified by:** 75 tests (5 new); npm run verify green; README and tutorial replay 0 mismatches, both tag.mjs transcripts included; continuity how-to replay 0 mismatches; pseudo-terminal: anchor 6 of 6, tag.mjs 2 of 2 exit
- **next:** update pull request 12 with the third run's results; a human merges pull request 10, then 12
