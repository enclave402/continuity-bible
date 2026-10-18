# Before-and-after journey page: the engine on the published story's lead, real pictures, every policy's bill, the first pair

- **Logged:** 2026-10-17T22:05:42-04:00
- **Type:** action · **Scope:** docs/journey · **Status:** open
- **Author:** agent:claude · **HEAD:** 8f4410c · **Id:** `wl-96386970-ab95-4f9c-82dd-51e996d4c871`
- **Tags:** docs, anchor, journey, canon

## Details

docs/4-explanation/BEFORE-AND-AFTER-A-DRIFTED-LEAD.md with assets/before-after (reading-order sheet, face strip in generation order, anchor-report.txt from the engine's own output, the prosecutor's finger before 2026-10-15 and after 2026-10-16). Evidence in the story's private repository: 85 scenes by token, 58 readable faces hand-tagged with a fixed vocabulary (skin_tone, heritage, hair), insightface embeddings, git dates for generation order. Dry run with the author's default canon: mode and consensus keep the light-olive lead (19 to redo by tags), canon bills 40; by face similarity canon bills 9 (an encoder ignores the shading that drifted). The local vision model agreed with the hand tags on 3 of 58. The private registry now declares token_sources for the art program, forbid_keys on the art manifest, props by id, a contextual attitude form, exclusive time_of_day markers and coverage; its gates pass.

## Run record

- **files:** docs/4-explanation/BEFORE-AND-AFTER-A-DRIFTED-LEAD.md, docs/4-explanation/assets/before-after/*, docs/_registry/doc_index.json, docs/README.md, PRODUCT.md
- **before:** the journey was a Planned row in PRODUCT.md; no page, no pictures
- **after:** the page is registered and linked; PRODUCT.md lists it under Deliverables with its done-when; one real pair on the page, the rest wait for the author's go per picture
- **removed:** none
- **verified by:** npm run verify in the worktree (gate, tests, publication gate, worklog, research index, docs)
- **next:** the author's canon_tags in their own words, then anchor --write, then one canon fix per picture with the author's go, each pair added to the page
