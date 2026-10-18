# anchor.mjs bills by tags when there are no embeddings: canon lists every image off canon, mode/origin/terminal every image whose tags differ from the anchor's; ADR-004 amended; tutorial, how-to, README and field reference match the new report

- **Logged:** 2026-10-17T21:26:15-04:00
- **Type:** action · **Scope:** engine/anchor · **Status:** closed
- **Author:** agent:claude · **HEAD:** de49ef8 · **Id:** `wl-033a251d-3754-4035-b926-c3c2371b5f74`
- **Tags:** anchor, engine, adr, docs

## Details

Follow-up (a) from the layperson pass. With hand tags and no embeddings the report named the anchor and printed no regeneration list. chooseAnchor now sets stats.bill_basis (cosine, tags, none) and stats.tag_mismatches; below_threshold stays null so a tag count is never read as a similarity count; comparePolicies carries to_redo and bill_basis; the CLI prints 'bill by tags, not by similarity' and 'to redo, by tags', and applies the budget to either bill. mode's grouping key is now case-insensitive like canon's match. On the example set with embeddings removed the tag bill equals the cosine bill (origin 8, terminal 10, mode 4, canon 8). The interim test from the previous commit asserted the 'no scores' wording this change replaces by decision; it is replaced by three tests on the tag bill, the cosine bill and the no-bill case.

## Run record

- **files:** scripts/anchor.mjs, test/anchor.test.mjs, docs/4-explanation/decisions/ADR-004-retrospective-anchor-policy.md, docs/3-reference/REGISTRY-FIELDS.md, docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md, docs/1-tutorials/START-HERE.md, README.md, PRODUCT.md
- **before:** tags-only run: anchor named, '(no scores)' per policy, no regeneration list; the how-to told the reader to read the list off the tags file
- **after:** tags-only run: anchor named, 'N do not match canon -> regenerate (bill by tags, not by similarity)', one regenerate line per image, 'N to redo, by tags' per policy; recorded anchor carries bill_basis and tag_mismatches
- **removed:** none
- **verified by:** npm run verify green (24 tests); the doc harness ran 9 tutorial and 5 README commands from their own code blocks with 0 mismatches, including the recorded anchor block
- **next:** commit, push, open a pull request to main stacked on pull requests 4 and 3
