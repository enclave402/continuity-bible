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

Outcome: a character whose look mutated halfway through a project gets one declared anchor image, chosen by answering two questions, with the regeneration bill known before anyone re-renders. Rationale and limits: [ADR-004](../4-explanation/decisions/ADR-004-retrospective-anchor-policy.md).

Most tools prevent drift going forward and assume you had a pristine reference from minute one. This procedure looks backward at the folder you actually have.

## 1. Embed what you have

Produce one row per generated image with an embedding from the encoder you trust for the job:

| You care about | Encoder family | Notes |
|---|---|---|
| Face identity | a face-recognition embedding (ArcFace-style, or a commercially licensed equivalent) | crop the face first; check the model's licence before commercial use |
| Whole-figure structure, wardrobe silhouette | a self-supervised vision transformer (DINOv2-style) | crop the character's bounding box |
| General semantics, style | a CLIP-style image encoder | least discriminative between similar characters |

Write `embeddings.jsonl` (any script, any language): `{"image": "<path>", "order": <n>, "embedding": [..], "tags": {"hair": "auburn"}, "sha256": "<optional>"}`. Order is the generation sequence. Tags are discrete attributes from a classifier or written by hand while looking at the image; the first question (what must never change) is answered through them, and with tags alone (no embeddings, no API, no model) every answer still works: fewest redraws then falls back to the most frequent tag combination, and the bill is counted by tags instead of measured by cosine. Never mix two encoders in one file.

## 2. Answer the two questions

```bash
node scripts/anchor.mjs embeddings.jsonl --character <id> --ask
```

1. **What about this character must never change?** Zero or more `tag=value` pairs: eye colour, a scar, heritage markers, a signature garment. The registry answers this by default with the entry's `canon_tags` (its fixed traits); type your own to override. Only images carrying every one of them are eligible to be the anchor, and images without them are always on the redraw list.
2. **For everything else, which look do you want?** *Fewest redraws* (the default), *the first look* or *the last look*. The answer is applied to the eligible images only.

The same two answers on one line, for scripts and for a second run:

```bash
node scripts/anchor.mjs embeddings.jsonl --character <id> --keep "eyes=amber-brown" --prefer fewest-redraws --threshold 0.6 --prune-outliers 2
```

The report names the chosen image, how many images keep the fixed traits, the mean and minimum cosine to the anchor, the regeneration list (every image that lacks a kept tag, plus every eligible image below the threshold) and a one-line comparison of every answer within the same kept tags, so the cheapest one is visible and a budget can be checked against it.

### Under the hood

| You answer | The engine runs | Picks, among the eligible images |
|---|---|---|
| fewest redraws (`--prefer fewest-redraws`) | `consensus` | the image nearest the centroid of their embeddings (after optional outlier pruning); with no embeddings, the most frequent tag combination |
| the first look (`--prefer first-look`) | `origin` | the first in order |
| the last look (`--prefer last-look`) | `terminal` | the last in order |
| most common (`--prefer most-common`) | `mode` | the most frequent tag combination, nearest its own centroid |
| what must never change (`--keep tag=value`) | the filter every policy runs inside | eligible = images carrying every kept tag; the rest are always billed |

`--policy origin|terminal|consensus|mode` is the developer spelling of the second question; `--policy canon` with `--canon tag=value` is the old spelling of keep + fewest redraws and stays as an alias. `comparePolicies` applies the kept tags to every policy.

## Which look: a decision, not arithmetic

The cheapest anchor is often the drifted one. A lead who began mixed-race and darker-skinned and drifted lighter for most of a book is "cheapest" to keep light: fewest redraws will say so, and the regeneration list will be short. Both answers are legitimate; they serve different goals. If the goal is consistency throughout and the endpoint does not matter (the author of this repository's own proof case chose this: fewest regenerations, lighter or darker as long as she is the same person on every page), answer *fewest redraws* and leave skin tone and hair out of question 1. If a trait is a story fact that must not move (that lead is one quarter Black, and her eyes are amber-brown), it is the answer to question 1: write it into the registry as `canon_tags` (by the owner, never read off the drifted images), and read the longer regeneration list as the price of the drift. The comparison line prints every answer side by side so the choice is made on purpose, and the engine never makes it for you.

Set `drift_resolution` in the registry (`prefer` or `policy`, threshold, pruning, budget, default embeddings file) so the defaults are declared, not remembered. An entry may override the registry.

## 3. Record the anchor

```bash
node scripts/anchor.mjs embeddings.jsonl --character <id> --prefer fewest-redraws --write
```

(`--ask` offers to record at the end, so `--write` is only needed on one line.) This writes `characters.<id>.anchor` (image, hash, policy, the plain-named `prefer`, the kept tags, metric, order, when, which embeddings file, the stats) into the registry. The vectors stay out. From now on every prompt, adapter or reference slot for this character conditions on that image, and the choice is auditable.

## 4. Regenerate within budget

The regeneration list is the bill. If it exceeds `max_regeneration_budget`, try another answer before spending; the comparison line shows the counts. Regenerate those images conditioned on the anchor, re-embed, and re-run step 2: the list should empty.

## 5. Keep it from happening again

The research behind this repository (ask `node scripts/research/ask.mjs "drift gates"`) points to the same three habits: cast one high-resolution master with named asymmetries before production; condition every later generation on that master rather than on the previous output; gate every output with a similarity check against the anchor and send failures back automatically. The anchor you just recorded is the input to all three.

## When you cannot tell

Some pictures cannot be judged on a trait: her eyes are closed, his face is turned away. Tag that trait `unknown` instead of guessing (or name your own word in the registry: `"drift_resolution": { "unreadable": ["unknown", "closed"] }`). A picture you could not judge is never counted as drift: it cannot become the anchor, and it is not put on the redraw list for that trait. It still goes on the list if something you could see has drifted.

## See it on one page

```bash
node scripts/sheet.mjs examples/anchor/embeddings.jsonl --out sheet.html
```

Open `sheet.html` in a browser. Every picture appears in the order it was made, with its tags. Green is the anchor, red is on the redraw list, amber could not be judged, grey stays as it is. The page uses the same rules as the report, so the two never disagree. Nothing to install.

## Keep a record of what you replaced

Each time a redrawn picture replaces an old one, add one line to a replacements file and name it in the registry (`"drift_resolution": { "replacements": "replacements.jsonl" }`):

```json
{"scene": "chapter 1, page 2", "before": "renders/ch01-p02.png", "after": "renders/ch01-p02-redo.png", "anchor": "renders/ch01-p10.png", "date": "2026-10-17"}
```

The sheet shows every line as a before-and-after pair, and marks the old picture purple: replaced.
