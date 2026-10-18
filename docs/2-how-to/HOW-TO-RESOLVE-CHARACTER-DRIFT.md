---
title: How to resolve character drift after the fact
doc_id: how-to-resolve-character-drift
triadic_leg: diataxis
diataxis_mode: solve
canonical_path: docs/2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# How to resolve character drift after the fact

Outcome: a character whose look mutated halfway through a project gets one declared anchor image, chosen by a stated policy, with the regeneration bill known before anyone re-renders. Rationale and limits: [ADR-004](../4-explanation/decisions/ADR-004-retrospective-anchor-policy.md).

Most tools prevent drift going forward and assume you had a pristine reference from minute one. This procedure looks backward at the folder you actually have.

## 1. Embed what you have

Produce one row per generated image with an embedding from the encoder you trust for the job:

| You care about | Encoder family | Notes |
|---|---|---|
| Face identity | a face-recognition embedding (ArcFace-style, or a commercially licensed equivalent) | crop the face first; check the model's licence before commercial use |
| Whole-figure structure, wardrobe silhouette | a self-supervised vision transformer (DINOv2-style) | crop the character's bounding box |
| General semantics, style | a CLIP-style image encoder | least discriminative between similar characters |

Write `embeddings.jsonl` (any script, any language): `{"image": "<path>", "order": <n>, "embedding": [..], "tags": {"hair": "auburn"}, "sha256": "<optional>"}`. Order is the generation sequence. Tags are discrete attributes from a classifier or written by hand while looking at the image; `mode` and `canon` need them, and with tags alone (no embeddings, no API, no model) `origin`, `terminal`, `mode` and `canon` all work. Never mix two encoders in one file.

## 2. Compare the policies

```bash
node scripts/anchor.mjs embeddings.jsonl --policy consensus --threshold 0.6 --prune-outliers 2
```

The report names the chosen image, the mean and minimum cosine to it, every image below the threshold (the regeneration list) and a one-line comparison of all four policies:

- **origin**: the first image. Right when the drift was accidental and the beginning is canon.
- **terminal**: the last image. Right when the drift was a deliberate evolution you want to keep.
- **consensus**: the image nearest the centroid. The fewest corrections across the library.
- **mode**: the most frequent attribute combination, nearest its own centroid. Right when a classifier can name the states and one dominates.
- **canon**: only images whose tags match the character's declared `canon_tags`, nearest their centroid. Right whenever the drift is a defect rather than an evolution.

## When cheapest is wrong

The cheapest anchor is often the drifted one. A lead who began mixed-race and darker-skinned and drifted lighter for most of a book is "cheapest" to keep light: `mode` and `consensus` will both say so, and the regeneration list will be short. That is arithmetic, not a decision. Write who the character is into the registry (`canon_tags`, by the owner, never read off the drifted images), run `--policy canon`, and read the longer regeneration list as the price of the drift. The comparison line prints every policy side by side so nobody chooses the cheap one by accident.

Set `drift_resolution` in the registry (policy, threshold, pruning, budget, default embeddings file) so the defaults are declared, not remembered. An entry may override the registry.

## 3. Record the anchor

```bash
node scripts/anchor.mjs embeddings.jsonl --policy consensus --character <id> --write
```

This writes `characters.<id>.anchor` (image, hash, policy, metric, order, when, which embeddings file, the stats) into the registry. The vectors stay out. From now on every prompt, adapter or reference slot for this character conditions on that image, and the choice is auditable.

## 4. Regenerate within budget

The regeneration list is the bill. If it exceeds `max_regeneration_budget`, try another policy before spending; the comparison line shows the counts. Regenerate those images conditioned on the anchor, re-embed, and re-run step 2: the list should empty.

## 5. Keep it from happening again

The research behind this repository (ask `node scripts/research/ask.mjs "drift gates"`) points to the same three habits: cast one high-resolution master with named asymmetries before production; condition every later generation on that master rather than on the previous output; gate every output with a similarity check against the anchor and send failures back automatically. The anchor you just recorded is the input to all three.
