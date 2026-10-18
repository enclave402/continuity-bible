# Second eighth-grade dry run fixed: tag.mjs writes the tags file from questions; typos in traits are asked again, not billed as drift; near-tokens, rich-text scenes and .txt endings are named; each file box has its own typed command

- **Logged:** 2026-10-18T17:11:38-04:00
- **Type:** fix · **Scope:** docs/layperson · **Status:** closed
- **Author:** agent:claude · **HEAD:** 4470103 · **Id:** `wl-911bfac1-f71a-4bf4-b08d-d2d2d64c0226`
- **Tags:** fix, layperson, dry-run, tag, anchor, gate, docs

## Details

A fresh agent on ba2ec1a found the documented path matched exactly; off it, the make-a-file trap (copying the command), hand-written tags (likeliest quit point), a one-letter trait typo telling the reader to redraw everything, single or unbalanced braces reaching the chatbot, a wrong --character silently ignored, and .txt endings on scenes and tags not named. All fixed on this branch with tests; docs give per-box typed commands, file finding and editing, honest time and install caveats. Correction: STATE.md's Last rewritten on ba2ec1a said 17:05 EDT; the real time was 16:50 EDT.

## Run record

- **files:** scripts/tag.mjs, scripts/anchor.mjs, scripts/lib.mjs, scripts/names.mjs, scripts/render.mjs, scripts/check.mjs, test/anchor.test.mjs, test/gate.test.mjs, README.md, docs/1-tutorials/START-HERE.md, docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md, docs/2-how-to/HOW-TO-ADOPT-THE-REGISTRY.md, docs/4-explanation/decisions/ADR-004-retrospective-anchor-policy.md, PRODUCT.md, package.json
- **before:** copying the command emptied the file with a no-spot error; tags typed by hand in strict JSON; hiar=two puffs ended in 'redraw all'; {june-okafor} and {{june-okafor} reached the chatbot; --character June-okafor ran without the fixed traits
- **after:** plain causes for empty or command-filled files; tag.mjs writes the tags file; typos asked again with what the tags have; near-tokens fail with the token to write; wrong ids get did-you-mean
- **removed:** none
- **verified by:** 70 tests (9 new); npm run verify green; replay of every README and tutorial command, tag.mjs transcript included, 0 mismatches, and the file tag.mjs wrote equals the page's; continuity how-to replay 0 mismatches; pseudo-terminal: anchor 6 of 6 and tag.mjs 2 of 2 exit by themselves
- **next:** third fresh dry run on this branch as the acceptance check; then open the pull request
