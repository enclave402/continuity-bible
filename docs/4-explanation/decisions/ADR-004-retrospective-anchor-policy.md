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

1. `scripts/anchor.mjs` takes one row per image (path, order, embedding, optional tags) from whatever encoder the user trusts, normalises the vectors, and chooses under a stated policy: `origin` (first), `terminal` (last), `consensus` (nearest the centroid, after optional z-score outlier pruning), `mode` (most frequent tag combination, nearest its own centroid). Pure functions (`chooseAnchor`, `comparePolicies`) are exported and tested.
2. The report always includes the regeneration list (images below a cosine threshold against the chosen anchor) and a one-line comparison of all four policies, so the cheapest choice is visible and a budget can be checked against it.
3. The registry declares the defaults (`drift_resolution`: policy, metric, threshold, pruning, budget, default embeddings file) at the top level with per-entry overrides, and `--write` records the choice under `characters.<id>.anchor` (image, hash, policy, metric, order, time, source file, stats). Vectors never enter the registry.
4. Embedding production stays outside the engine: the how-to names the encoder families and their licence caveats; the repository ships a synthetic example set, never model weights or a dependency on one.

## Consequences

- The feature is honest about what it is: selection and bookkeeping over the user's own measurements. No accuracy claim is made for any encoder, and no face-recognition weights with restrictive licences are bundled.
- Once an anchor is recorded, the registry is the single place a prompt compiler, an adapter slot or a QA gate looks for the reference image, which is the same discipline the registry applies to names.
- The design matches the research's recommendation that gates compare against one declared reference, and extends it backward to projects that started without one.
- Tag-based `mode` depends on a classifier or hand tags the user supplies; without tags the policy says so instead of guessing.
