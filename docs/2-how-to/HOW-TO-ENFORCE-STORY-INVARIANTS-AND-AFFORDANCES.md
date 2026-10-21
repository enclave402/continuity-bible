---
title: How to enforce story invariants and affordances
doc_id: how-to-enforce-story-invariants-and-affordances
triadic_leg: diataxis
diataxis_mode: solve
canonical_path: docs/2-how-to/HOW-TO-ENFORCE-STORY-INVARIANTS-AND-AFFORDANCES.md
status: active
last_reviewed: 2026-10-21
canonical: true
---

# How to Enforce Story Invariants, Affordances, and Layered Wardrobe

When writing stories and generating art with AI, you will quickly hit four recurring, maddening problems:

1. **Plot Hallucinations**: You deleted a plot point three days ago, but the AI suddenly brings it back (like having a deceased pet approve of a new date).
2. **Backwards Phones**: An image generator renders a character looking at their phone, but the screen is turned toward the viewer while the character stares at the blank metal back chassis!
3. **Wardrobe Conflation**: An image generator draws a character in a hooded pantsuit with bare legs under a long coat, or forgets the hood entirely.
4. **Angle Drift**: A character looks right from the front, but when they turn around or get into a car, their clothes, hair, or body completely change.

This guide shows you how to use `narrative-token-ssot` to lock down all four automatically.

---

## 1. Stop AI From Re-Introducing Banished Plot Points (Story Invariants)

### Why this happens
Large language models love familiar tropes. If you tell an AI to write a dinner scene, it might pull in an old character who passed away, or reintroduce a conversation you deliberately cut.

### How to solve it
Open your `character-registry.json` and add a rule under `"invariants"`:

```json
{
  "invariants": [
    {
      "pattern": "approved of (Theo|\\{\\{theo-vance\\}\\})",
      "name": "Bob Barker approved of Theo",
      "why": "Bob Barker was not alive when Sam met Theo; Bob Barker never met Theo on their date."
    }
  ]
}
```

Now, whenever you run your verification command:

```bash
npm run check:invariants
```

If any file contains that forbidden line, the test will halt immediately and show you the exact file and line number:

```text
❌ Story Invariant Violated! Found banished assertion:
  File: examples/story/scenes.json (line 84)
  Matched: "Bob Barker approved of Theo."
  Rule: Bob Barker approved of Theo
  Why: Bob Barker was not alive when Sam met Theo; Bob Barker never met Theo on their date.

FIX: Edit the file to remove or fix the sentence, or update your rule in character-registry.json.
```

---

## 2. Stop AI From Drawing Backwards Phones (Gaze-Affordance Decoupling)

### Why this happens
In computer vision, this bug is caused by two things:
- **Canonical View Bias**: AI models have seen millions of pictures of phone screens, so they default to showing the screen facing the camera lens.
- **Gaze-Affordance Decoupling**: The character's gaze points downward, but the interactive screen is pointing outward.

### How to solve it
Whenever you prompt an AI to draw a person looking at a handheld device from a front or 3/4 view, include these exact grounding tokens:

> *"back chassis facing camera, screen angled inward toward face"*

You can test your prompt using the affordance tool:

```bash
node scripts/check-affordance.mjs --check-prompt "Front medium shot of Sam looking down at her phone, back chassis facing camera, screen angled inward toward face."
```

If the prompt is missing those safety words, the tool warns you before you waste generation tokens or credits:

```text
⚠️ Affordance Warning:
Prompt describes character looking at a phone without specifying "back chassis facing camera". High risk of AI backwards-screen generation.
```

### Check a whole folder of pictures at once

A good prompt lowers the risk; it does not remove it. After the pictures are made, check all of them in one go.

1. Give each picture and the rubric (`node scripts/check-affordance.mjs --prompt`) to the vision AI you already use.
2. Save its JSON answer next to the picture, named after it: `ch01-p02.png` gets `ch01-p02.png.affordance.json`.
3. Run the batch check on the folder (or a pattern such as `"renders/ch01-*.png"`):

```bash
node scripts/check-affordance.mjs --batch renders/
```

```text
File          Device  Canonical view bias  Verdict  Reason
------------  ------  -------------------  -------  ------
ch01-p01.png  yes     no                   PASS     Back of the phone faces the camera; screen faces her.
ch01-p02.png  yes     yes                  FAIL     Screen faces the lens while she stares at the camera bump.

2 picture(s): 1 PASS, 1 FAIL.
FIX: redraw each FAIL with "back chassis facing camera, screen angled inward toward face" in the prompt.
```

The command exits 0 when every picture passes (a picture with no phone or tablet passes too) and 1 when any picture fails, so a build can stop on it. A picture with no saved answer is listed as `Not checked` and counts as a FAIL: nothing passes without being looked at. If you have a command that asks a vision AI for you, name it with `--inspector "<command>"` (or set `AFFORDANCE_INSPECTOR`); it gets each picture's path as its last argument and prints the JSON answer. Add `--json` for the results as data.

---

## 3. Stop AI From Confusing Outfits (Layered Wardrobes)

### Why this happens
When you describe an outfit with one flat sentence like `"cream silk hooded pantsuit"`, the AI doesn't know what parts attach to what. It might attach the hood to an inner blouse, give the character bare legs, or make the pantsuit look like shorts.

### How to solve it
Decompose the outfit into distinct, physical layers using `wardrobe-and-props.v1.schema.json`:

```json
{
  "layers": {
    "outer": "Floor-grazing cream silk-satin long overcoat with dramatic drape, slightly shorter than pant hem",
    "hood_or_cowl": "Deep Renaissance cowl hood attached to overcoat collar, draped softly down the back shoulders",
    "top": "Plunging crossover wrap bodice in matching cream silk crepe",
    "bottom": "Fluid wide-leg palazzo trousers resembling a long skirt until movement separates legs",
    "footwear": "Black pointed-toe kitten heels with narrow gap between hem and shoe, continuous trouser drape with zero bare leg",
    "fabric_spec": "Heavyweight matte silk crepe with muted ivory satin inner lining"
  },
  "negative_tokens": [
    "bare leg",
    "exposed calf",
    "short coat",
    "detached hood"
  ]
}
```

By explicitly separating the **outer coat and cowl hood** from the **inner bodice and palazzo pants**, the image generator understands the physical geometry and stops making bare-leg mistakes.

---

## 4. Multi-Angle Model Sheets (360-Degree Turnarounds)

### Why this happens
A single front-facing anchor picture only teaches the AI what a character looks like from the front. The AI will invent random details when they turn around.

### How to solve it
In `character-registry.json`, declare a `turnaround` for key characters:

```json
"sam-hayes": {
  "name": "Sam",
  "turnaround": {
    "front": "site/assets/comp-sam-front.png",
    "back": "site/assets/comp-sam-rear-cowl.png",
    "profile_left": "site/assets/comp-sam-profile.png",
    "sheet": "site/assets/comp-sam-2061-turnaround-sheet.png",
    "notes": "Cowl hood attaches to outer coat collar only; palazzo trousers drape fully to kitten heel shoe line with zero exposed calf."
  }
}
```

Before rendering expensive final panels, always generate and verify your turnaround model sheet so you have a baseline ground truth for all camera angles.

Once the entry has a `turnaround`, build the character's picture sheet to see it. The page opens with **Turnaround Model Sheet (360° Continuity Ground Truth)**, above the picture cards: each view with its angle badge, a "not drawn yet" card for any view you have not made, and your notes in full.

```bash
node scripts/sheet.mjs examples/anchor/embeddings.jsonl --character sam-hayes --out sheet.html
```

To try a turnaround before you record it, pass it with `--turnaround` (a JSON file, or the object itself in quotes). It wins over the registry entry. Paths in the registry are relative to the registry file; paths in a `--turnaround` file are relative to that file.

---

## Summary of Commands

| What you want to do | Command |
|---|---|
| Check that no banished plot mistakes appear | `npm run check:invariants` |
| Check an image prompt for backwards-phone safeguards | `node scripts/check-affordance.mjs --check-prompt "<prompt>"` |
| Get the VLM vision rubric to inspect rendered panels | `node scripts/check-affordance.mjs --prompt` |
| Check a whole folder of rendered pictures for backwards phones | `node scripts/check-affordance.mjs --batch <folder or "pattern">` |
| See a character's turnaround views and notes above their pictures | `node scripts/sheet.mjs <embeddings.jsonl> --character <id> --out sheet.html` |
| Run all gates (names, tokens, art, story, invariants, docs) | `npm run verify` |
