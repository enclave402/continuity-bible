# Two questions replace five policy names: anchor.mjs gains keep (what must never change), prefer (fewest-redraws, first-look, last-look, most-common) and --ask; canon is keep + consensus; tutorial, README, both how-tos, field reference, PRODUCT and ADR-004 rewritten around the questions

- **Logged:** 2026-10-17T22:03:40-04:00
- **Type:** action · **Scope:** engine/anchor · **Status:** closed
- **Author:** agent:claude · **HEAD:** 6b48ac9 · **Id:** `wl-6035e371-2652-4353-b7a2-b3cb6a318045`
- **Tags:** anchor, engine, adr, docs, layperson

## Details

Decided with the owner tonight and relayed by the parent session. keep filters first (only images carrying every kept tag are eligible; the rest are always billed) and composes with any policy; canon stays as the alias keep + consensus so existing tests pass; fewest redraws without embeddings falls back to the most frequent tag combination among the eligible images (two interim assertions from this branch that encoded 'consensus needs embeddings' were updated to the decided fallback, and the change is named in the commit). --ask asks both questions in plain words, prints 'Keep X as the one true picture of <name>. Redraw N pictures: ...', the price of the other two answers, and offers to record. drift_resolution accepts prefer; the anchor record carries prefer and keep; canon_tags is documented as fixed traits. Proof case in the wording: a lead who is one quarter Black (story fact), amber-brown eyes fixed, skin tone and hair following fewest redraws. 27 tests; the doc harness drove the three interactive transcripts through piped stdin.

## Run record

- **files:** scripts/anchor.mjs, scripts/character-registry.v1.schema.json, test/anchor.test.mjs, docs/4-explanation/decisions/ADR-004-retrospective-anchor-policy.md, docs/2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md, docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md, docs/1-tutorials/START-HERE.md, docs/3-reference/REGISTRY-FIELDS.md, docs/README.md, examples/anchor/README.md, README.md, PRODUCT.md
- **before:** five policy names in the CLI and the docs; canon the tutorial's default; no interactive mode; the bill by tags listed only tag mismatches
- **after:** two questions (--keep, --prefer, --ask) with the policy names as the developer spelling; fewest redraws the default; the bill includes every image lacking a kept tag; the recorded anchor carries prefer and keep
- **removed:** none
- **verified by:** npm run verify green (27 tests); doc harness: 7 tutorial and 5 README commands from their own code blocks, 0 mismatches, --ask transcripts fed through stdin
- **next:** commit, push (pull request 5 updates itself), retitle pull request 5, report the CLI usage lines to the parent session
