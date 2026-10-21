---
title: How to enforce story invariants and affordances
doc_id: how-to-enforce-story-invariants-and-affordances
triadic_leg: diataxis
diataxis_mode: solve
canonical_path: docs/2-how-to/HOW-TO-ENFORCE-STORY-INVARIANTS-AND-AFFORDANCES.md
status: active
last_reviewed: 2026-10-20
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

---

## Summary of Commands

| What you want to do | Command |
|---|---|
| Check that no banished plot mistakes appear | `npm run check:invariants` |
| Check an image prompt for backwards-phone safeguards | `node scripts/check-affordance.mjs --check-prompt "<prompt>"` |
| Get the VLM vision rubric to inspect rendered panels | `node scripts/check-affordance.mjs --prompt` |
| Run all gates (names, tokens, art, story, invariants, docs) | `npm run verify` |
