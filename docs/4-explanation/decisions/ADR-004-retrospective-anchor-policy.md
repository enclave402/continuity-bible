---
title: ADR-004 Retrospective anchor policy for drifted characters
doc_id: adr-004-retrospective-anchor-policy
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/decisions/ADR-004-retrospective-anchor-policy.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# ADR-004: a policy engine picks and records a visual anchor after drift, over embeddings from any encoder

**Status:** accepted, 2026-10-17.
**Deciders:** the owner's note on fixing character drift proposed an engine feature (anchor policies origin, terminal and consensus; a configuration block; a CLI flag) and asked for it to be built; the research report's drift-gate and SOP sections supplied the measurements it should expose; the agent built it dependency-free.

## Context

Tools for character consistency prevent drift going forward: adapters that need a pristine reference from the first generation, trained weights that bake a muddy average out of an uncurated folder, frame-chaining made for video. Few answer the question a creator actually has halfway through a project: the character has already mutated, which image should become the anchor so that the least work is thrown away?

The research report carded in this repository (ask for "drift gates") describes production gates that score every output against an anchor by cosine similarity on a face embedding, by patch similarity on a self-supervised vision transformer, and by a vision-language judge; and a procedure that casts one master and conditions everything later on it. Those gates assume an anchor exists. This decision supplies it retrospectively.

## Decision

1. `scripts/anchor.mjs` takes one row per image (path, order, embedding, optional tags) from whatever encoder the user trusts, normalises the vectors, and chooses under a stated policy: `origin` (first), `terminal` (last), `consensus` (nearest the centroid, after optional z-score outlier pruning), `mode` (most frequent tag combination, nearest its own centroid), `canon` (only images matching the entry's owner-written `canon_tags`, nearest their centroid). Pure functions (`chooseAnchor`, `comparePolicies`) are exported and tested. `canon` was added the same evening the owner described a lead who began mixed-race and darker-skinned and drifted lighter over the book. The owner's own choice for that case is the least-regeneration state (`consensus`, cross-checked by `mode`): the goal there is consistency throughout, not a particular endpoint. `canon` exists for the user whose drift is a defect that must be undone. The engine prints every policy's regeneration bill and never chooses for the person.
2. The report always includes the regeneration list (images below a cosine threshold against the chosen anchor) and a one-line comparison of all four policies, so the cheapest choice is visible and a budget can be checked against it.
3. The registry declares the defaults (`drift_resolution`: policy, metric, threshold, pruning, budget, default embeddings file) at the top level with per-entry overrides, and `--write` records the choice under `characters.<id>.anchor` (image, hash, policy, metric, order, time, source file, stats). Vectors never enter the registry.
4. Embedding production stays outside the engine: the how-to names the encoder families and their licence caveats; the repository ships a synthetic example set, never model weights or a dependency on one.

## Consequences

- The feature is honest about what it is: selection and bookkeeping over the user's own measurements. No accuracy claim is made for any encoder, and no face-recognition weights with restrictive licences are bundled.
- Once an anchor is recorded, the registry is the single place a prompt compiler, an adapter slot or a QA gate looks for the reference image, which is the same discipline the registry applies to names.
- The design matches the research's recommendation that gates compare against one declared reference, and extends it backward to projects that started without one.
- Tag-based `mode` and `canon` depend on a classifier or hand tags the user supplies; without tags the policy says so instead of guessing. With tags alone, a person with a browser chatbot and no API can still run `origin`, `terminal`, `mode` and `canon`.
- `canon_tags` are written by the owner. The engine never infers canon from the drifted images, because the majority of the images is exactly what is in question.

## Amendment, 2026-10-17: the bill is by tags when there are no embeddings

**Context.** The layperson proof case (`PRODUCT.md`) drives the image model from a browser chatbot, so the user has hand-written tags and no embeddings. Until this amendment the report in that case named the anchor and printed no regeneration list, and the how-to told the reader to read the list off the tags file.

**Decision.** When no similarity score can be computed (the anchor row has no embedding), `chooseAnchor` bills by tags. `canon` lists every image that does not match `canon_tags`. `mode`, `origin` and `terminal` list every image whose tags differ from the anchor's, an untagged image included, because nothing shows it matches. `consensus` stays unavailable. `stats.bill_basis` records `"cosine"`, `"tags"` or `"none"` (no embeddings and no tags on the anchor); `stats.tag_mismatches` carries the count; `stats.below_threshold` stays `null`, so a tag count is never read as a similarity count. The CLI says "bill by tags, not by similarity", the comparison line says "to redo, by tags", and the budget applies to either bill. Tag comparison is exact and case-insensitive, the same rule `canon` already used.

**Consequences.** With hand tags alone the report now gives the whole decision: the anchor, the bill, the comparison and the budget. Only the measurement of how far each image drifted is left to a model. A tag bill is only as good as the tagging, so the hand-tag conventions in the browser-chatbot how-to (same keys as `canon_tags`, canon values copied from the registry, `unclear` when unsure) carry more weight. On the synthetic example set with its embeddings removed, the tag bill reproduces the cosine bill exactly (origin 8, terminal 10, mode 4, canon 8), which is what a clean tagging should do.
