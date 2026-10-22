# Public prop index, layered wardrobe, turnarounds, companion exemplar, and the 8th-grade how-to

- **Logged:** 2026-10-22T14:10:22-04:00
- **Type:** action · **Scope:** continuity · **Status:** closed
- **Author:** agent:grok · **HEAD:** bdbcfe1 · **Id:** `wl-f135df75-5b21-4002-b049-ebef317b681d`
- **Tags:** prop-index, wardrobe

## Details

scripts/compile-prop-index.mjs reads the public example (registry, examples/story/scenes.json, editions/sam-first.json, wardrobe, cards, shot sheet) and writes examples/continuity/prop-index.json. --check is on npm run verify. chloe-jenkins, sam-hayes, and theo-vance each have two layered outfits and a four-view turnaround. examples/continuity/archie-terrier.json is the collar-tag companion exemplar and is not a page in the example edition. The prop disposition reference was rewritten so it no longer cites a private production file. npm run verify exited 0 (183 tests).

Master 1 (product): relator-app keeps the commercial story; this commit does not copy it.
Master 2 (framework): the public prop index, wardrobe layers, turnarounds, and the 8th-grade how-to are the framework.

## Run record

- **files:** scripts/compile-prop-index.mjs,scripts/prop-index.v1.schema.json,scripts/wardrobe-and-props.v1.schema.json,test/compile-prop-index.test.mjs,test/prop-index.test.mjs,examples/continuity/prop-index.json,examples/continuity/wardrobe-and-props.json,examples/continuity/archie-terrier.json,package.json,docs/2-how-to/HOW-TO-TRACK-PROPS-AND-WARDROBE.md,docs/3-reference/PROP-DISPOSITION-AND-VISUAL-CONTINUITY-STANDARDS.md,docs/README.md,docs/_registry/doc_index.json,worklog/STATE.md
- **before:** the public example had no prop-first index, one outfit for two people, and no turnaround paths in the wardrobe file
- **after:** the prop index compiles from the public example and --check is on npm run verify; three leads have two layered outfits and four turnaround views; the how-to is registered
- **removed:** none
- **verified by:** npm run verify exit 0, 183 tests, prop index --check, publication gate, docs gate 32 docs
- **next:** the owner reviews the pull request

Master 1 (product): relator-app keeps the commercial story; this commit does not copy it.
Master 2 (framework): the public prop index, wardrobe layers, turnarounds, and the 8th-grade how-to are the framework.
