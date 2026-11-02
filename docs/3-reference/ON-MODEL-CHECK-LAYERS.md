---
title: On-model check layers
doc_id: ref-on-model-check-layers
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/ON-MODEL-CHECK-LAYERS.md
status: active
last_reviewed: 2026-11-01
canonical: true
---

# On-model check layers

**What this is:** the generic [on-model check](../4-explanation/concepts/ON-MODEL-CHECK.md) for a new picture: its layers, the judge role and its adapter interface, and how the check is calibrated.
**Why it exists:** so any project can check its art against its [character cards](../4-explanation/concepts/CHARACTER-CARD.md) the same way, with any vendor's models. The framework lives here; each project keeps its own cut-offs and labelled pictures.
**How to use it:** pick the layers your project needs, write one adapter for your judge model, label a [golden set](../4-explanation/concepts/GOLDEN-SET.md), and run the calibration before you trust the check.
**Next step:** read "The judge role" below, then write your first adapter.

## The layers

Each layer uses the most reliable tool for its question. A model's eyes are used only where a measuring tool can't do the job, because vision models miscount and miss fine detail.

| Layer | Question | Measured by | Fails when |
| -- | -- | -- | -- |
| 0 File | Right size, format and transparency? | an image library | the file breaks the slot's rules |
| 1 Uniqueness and origin | A copy of another live picture? Made new, or edited? | perceptual hash against every live picture; the [made-by record](../4-explanation/concepts/MADE-BY-RECORD.md) | a near copy, or an edit where a new render was needed |
| 2 Cast | Exactly the people the brief names? | a face or person detector counts; the judge confirms each character is there | a named character is missing, or someone extra is there |
| 3 Signature items | Each lead's own items only on that lead? | the judge, from the signature lock; an object detector when one is installed | an item shows up on the wrong person |
| 4 Identity | Same face as the approved art? | a face detector and face embeddings (for example ArcFace), cosine against the character's approved faces | below the calibrated cut-off |
| 5 Look | Hair, skin, marks, the never-list | the judge, one question per card line; skin tone by colour distance (CIELAB Delta E) against the card's colour | a card line fails, or a never-list item is there |
| 6 Body | Build as the card says? | the judge, from the card's body lines | a body line fails |
| 7 Wardrobe | The signature outfit, nothing borrowed? | the judge, from the card's items | an item is wrong or borrowed |
| 8 Anatomy | Hands, limbs, matching pairs, edit seams | a hand-landmark tool finds each hand; the judge checks an enlarged crop of each | a broken hand, limb or pair, or a seam |
| 9 Style | The project's visual language, not a stray style | the judge, one question per item of the style's forbidden list; a style-embedding model when one is installed | warns until calibration shows it is reliable, then fails |
| 10 Text | No text unless the brief asks; spelled right when it does | OCR | any wrong text |
| 11 Slot fit | Survives the slot's crops | crop to each layout, then re-run layers 2 and 4 | the face or key subject leaves the frame |

**Order matters.** Questions form a dependency graph: "Is this character in the picture?" comes first, and their face, body and outfit questions run only if it passes. Each answer keeps its evidence: the crop, the score and the cut-off.

**One source for prompt and check.** The character card compiles into both the picture prompt and the question list, so what the maker is told to draw is exactly what the checker checks.

**Which layers fail and which warn** is a project's choice, written in its config. A safe start: every layer fails except style, which warns until the golden set proves the style questions agree with the labels.

## The judge role

The judge is a role, not a company. Any vision model can fill it if it meets this spec.

| Need | Why | How it is checked |
| -- | -- | -- |
| Not the maker's model family | a model grading its own family's work shares its blind spots ([second checker](../4-explanation/concepts/SECOND-CHECKER.md)) | the config names the maker's family; the check refuses a judge of the same family |
| Close-ups of small parts | small faces and hands get lost in a group shot | the check always sends native-resolution face and hand crops with the full picture |
| Several pictures per request | side-by-side with the approved art agrees with people more than scoring alone | the adapter states its limit; the check keeps the most important pictures |
| Answers that match a JSON schema | answers must be machine-readable | the provider's schema mode, or constrained decoding for a local model; invalid JSON counts as unsure |
| A pinned version | a silent model update changes the grades | the model id and version are written into every result |
| Repeatable answers | one run is noisy | the lowest randomness the provider allows, and each question asked 3 times; the majority wins, and no majority counts as unsure |
| Unsure fails | a refusal or a guess must never pass a picture | unsure, a refusal and a failed request all fail |
| Passes calibration | the real test of any judge | it must reach the agreement and catch-rate bars on the golden set; the best scorer is chosen, not a favourite |

### The adapter interface

One small adapter per provider. Swapping the judge is a config change followed by a new calibration run, nothing else.

```text
judge(images, questions, schema) -> answers
  images:    a list of { label, file, crop box or none, enlarge factor }, sent in order
             (the candidate first, then one reference per character, then close-ups)
  questions: a list of { id, text }; the expected answer is kept by the check, never sent
  schema:    the JSON schema every answer must match
  answers:   { id: { answer: yes | no | unsure | not_visible, confidence 0-1, reason } }, plus the model id the server ran

limits() -> { max_long_edge, max_images, schema_support }
```

Most providers fit one adapter for the OpenAI-compatible chat API (local servers such as mlx-vlm, vLLM or llama.cpp, and hosted routers). A provider with its own API gets its own adapter of about a page. Model ids, endpoints, the vote count, question templates and cut-offs live in config files, never in code. Keys are read at run time and never printed.

**Questions name no one.** A character is "character N, the person in reference picture N". Hosted models may refuse to name people; the check never asks them to.

**Known limits, designed around:** vision judges miscount (counts come from a detector), miss fine detail (crops), can't tell if a picture is AI-made (that comes from the made-by record), and may decline some pictures (a decline is unsure and fails).

## Calibration method

1. **Golden set.** Goods: live art no review has flagged. Bads: every known mistake, each with its evidence and exact file hash. No separate labelling step is needed when the project's records already name the mistakes.
2. **Run.** Each golden picture gets the full check with one judge. Save every raw vote, so the scoring can be re-run without the model.
3. **Score.** Verdict: bad if any failing layer fails. Report Cohen's kappa between verdict and label with a bootstrap 95% interval, the catch rate on bads, the false-alarm rate on goods, and seconds per picture on the machine that ran it. Score the judge's own layers alone, and the whole check.
4. **Choose.** Try each confidence floor from config (an answer below it counts as unsure) and keep the best kappa. Calibrate at least two judges from different vendors, one of them open-weight and run locally. The best scorer that passes the bars becomes the judge.
5. **Write.** The run writes the chosen judge and its cut-offs into the project's config. Nobody types them.
6. **Keep catching.** Every mistake found later joins the golden set as a bad in the same change; a test proves the check still fails it ([backslide](../4-explanation/concepts/BACKSLIDE.md)). Calibrate again when the maker, the judge or the style changes.

## Where it runs

At render time, before a picture is wired into a slot: a fail sends the maker back to make a [fresh render, not a patch](../4-explanation/concepts/FRESH-RENDER-NOT-A-PATCH.md), with the failed questions added to the [brief](../4-explanation/concepts/BRIEF.md). The full result goes into the picture's made-by record. The project's [gate](../4-explanation/concepts/GATE.md) checks that a passing result exists for the exact file in every slot; the gate itself never calls a model.

*Also called:* automated visual QA, acceptance testing for images, LLM-as-a-judge, VLM judge, TIFA, Davidsonian Scene Graph (DSG), model calibration.
