# Story element continuity: the story as one record per scene and one list per reading order, with a retired list, parked art and three gates (ADR-006); the first extraction from the private system's reusable-framework capture

- **Logged:** 2026-10-19T12:28:53-04:00
- **Type:** action · **Scope:** story · **Status:** closed
- **Author:** agent:claude · **HEAD:** 80718f3 · **Id:** `wl-2760c141-60e6-4c31-87ff-4150b6862d1d`
- **Tags:** story, editions, parked-art, extraction
- **References:** ADR-006

## Details

scene.v1 and edition.v1 schemas; scripts/story.mjs loads a story folder (scenes.json, editions/<id>.json, art/, parked-art.json, built/), derives every spread number from position, refuses an unknown slug, a slug listed twice, a scene both placed and retired or neither, a picture count that disagrees with the layout, a picture not named after its scene and a spread that says nothing; list, render, build and check. check-story-built.mjs: built output equals the source, first differing line named. check-story-art.mjs: every picture a placed scene lists exists and is tracked, every picture nothing loads is parked with a reason, --park --reason writes the list. check-story-retired.mjs: a retired scene keeps its record and pictures; a picture deleted in git fails unless parked-art.json carries the author's note under removed. The example story (six spreads of the repository's own cast, placeholder pictures) renders in both editions with one spread retired and nothing deleted; the scene file is a scenes surface, editions and the manifest are token sources, built output is coverage-ignored; the names gate caught two prop names in picture sentences and two names in edition titles while it was written. Nothing of the private story (prose, names, art, paths) crossed.

## Run record

- **files:** scripts/scene.v1.schema.json, scripts/edition.v1.schema.json, scripts/story.mjs, scripts/check-story-built.mjs, scripts/check-story-art.mjs, scripts/check-story-retired.mjs, examples/story/**, test/story.test.mjs, test/tokens.test.mjs, character-registry.json, package.json, docs/2-how-to/HOW-TO-REORDER-AND-RETIRE-SPREADS.md, docs/3-reference/SCENE-AND-EDITION-FIELDS.md, docs/4-explanation/decisions/ADR-006-story-as-records-and-editions.md, docs/README.md, docs/_registry/doc_index.json, .context/_index.md, PRODUCT.md, README.md, worklog/STATE.md
- **before:** the public repo kept characters steady but held no story: no records, no reading orders, no retired list, no account of parked pictures
- **after:** a story folder with records and editions builds to diffable text; a spread moves, is told from another character first or is retired without a page touched or a picture lost; npm run verify runs the three story gates on the example
- **removed:** none
- **verified by:** npm run verify green: names gate (69 labels on 5 surfaces, 9 token sources), 96 tests (13 new: loader refusals, built-output diff, parked and missing pictures, --park, retirement without deletion, git deletions with and without a note, a third edition), story gates on examples/story, publication gate on every added file (5 private terms loaded), docs gate (20 docs); the how-to's 11 commands replayed from its own code blocks in a fresh git checkout, output equal to the doc
- **next:** the owner merges the pull request; the private capture marks elements 3 and 7 shipped; next extraction is the round trip and the owner's-words boundary
