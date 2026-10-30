---
title: Wardrobe exclusivity invariant
doc_id: ref-wardrobe-exclusivity-invariant
triadic_leg: diataxis
diataxis_mode: reference
canonical_path: docs/3-reference/WARDROBE-EXCLUSIVITY-INVARIANT.md
status: active
last_reviewed: 2026-10-30
canonical: true
what: The wardrobe exclusivity rule. Each signature item has one owner, and no one else may wear it.
why: Image tools copy a lead's signature item onto other people in a group picture. A clear rule and a check stop that.
how: Look up who owns an item in the table, then put it in the avoid list for everyone else in the picture.
next: Run npm test. The prop check must pass with no clashes.
---

<!-- WHAT THIS IS: Single Source of Truth (SSOT) invariant for character signature wardrobe exclusivity. -->
<!-- WHY IT MATTERS (MONEY / SEO / SPEED): Stops AI diffusion models from leaking signature items (like Alexandra's pink sequin boots) onto background or secondary characters, preventing costly regeneration loops ($0.04-$0.12/image) and broken brand continuity. -->
<!-- HOW TO USE IT (1 LINE): npm test (or node scripts/check-prop-continuity.mjs) -->
<!-- WHERE ITS DATA LIVES (COLLOCATION): scripts/wardrobe-and-props.v1.schema.json + character-registry.json -->
<!-- WHERE ITS AUTH LIVES (ENV SSOT): Invariant rule locked by owner mandate (2026-10-19 & 2026-10-25). -->

# Wardrobe Exclusivity Invariant & Anti-Collision Rule

*Terms:* [character card](../4-explanation/concepts/CHARACTER-CARD.md) · [rules the computer checks](../4-explanation/concepts/RULES-THE-COMPUTER-CHECKS.md) · [gate](../4-explanation/concepts/GATE.md) · [fresh render, not a patch](../4-explanation/concepts/FRESH-RENDER-NOT-A-PATCH.md). All terms: [concept index](../3-reference/CONCEPT-INDEX.md).

> **[Amnesiac](../4-explanation/concepts/SELF-EXPLAINING-PART.md) Landing:** You do not need prior context to understand this rule. Read the 8th-grade summary, check the schema table, and follow the Karpathian troubleshooting steps below.

---

## 1. 8th-Grade Explanation (The Superhero Cloak Rule)

Think of a **signature wardrobe item** like Thor's hammer, Cinderella's glass slipper, or Batman's cape:
* **Only ONE character is allowed to have it.**
* In the Rel8r universe:
  * **Aleksandra** owns the **metallic magenta sequined 4-inch boots** and **Barnaby Bear**.
  * **Coach Hype** owns the **3D block COACH baseball cap**, **leather chest harness**, and **firefighter bunker pants**.
  * **Milo** owns the **oversized cream chunky fisherman cable-knit sweater**.
  * **Soren** owns the **ultralight titanium wheelchair with neon yellow hubs** and **architectural rectangular sunglasses**.
  * **Vesper** owns the **asymmetrical dark hair with the neon-magenta streak** and **industrial welding goggles around the neck**.

### The Problem (Why Computers Make Mistakes)
When AI image generators (like ChatGPT DALL-E, Stable Diffusion, or Midjourney) draw a picture of a group of people standing together, the computer gets "confused." It sees the words *"metallic magenta sequined boots"* and starts putting sparkly pink boots on **every woman in the picture**.

### The Solution (The Law)
Whenever you create an image with more than one character:
1. Put the signature item **only** in the prompt for the character who owns it.
2. Put the signature item into the **negative prompt (AVOID)** for **every other character in the scene**.
3. If any other character wears it, the build fails immediately.

---

## 2. Technical Invariant Schema

Governed by [`scripts/wardrobe-and-props.v1.schema.json`](../../scripts/wardrobe-and-props.v1.schema.json).

```json
{
  "exclusive_signature": true,
  "prohibited_on_others": [
    "metallic magenta sequined boots",
    "pink sequin boots",
    "pink glitter stiletto boots",
    "Barnaby Bear",
    "pink plush teddy bear"
  ]
}
```

### The Invariant Gate: `[CONSTRAINT_GATE: SIGNATURE_WARDROBE_EXCLUSIVITY]`

```yaml
[CONSTRAINT_GATE: SIGNATURE_WARDROBE_EXCLUSIVITY]
Status: HARD_INVARIANT
Enforcement: Automated CI Gate & Jev Vision Check
Rule:
  FOR EACH Character C in Image:
    IF C.id != Owner.id:
      ASSERT C does not contain Owner.exclusive_signature
      ASSERT C.negative_prompt CONTAINS Owner.prohibited_on_others
```

---

## 3. Andrej Karpathian Troubleshooting Tiers

When a wardrobe collision or leak occurs, follow the 5-tier diagnostic ladder linearly:

| Tier | Level | Symptom / Signal | Action |
| :--- | :--- | :--- | :--- |
| **Tier 0** | **Docs / State** | Unsure which character owns which item | Open this document or [`character-registry.json`](../../character-registry.json). Do not guess. |
| **Tier 1** | **Exact Error** | Visual check shows multiple women wearing pink sequin boots | Read the prompt JSON in `chatgpt-studio-queue/`. Verify if `AVOID` contains the prohibited tokens. |
| **Tier 2** | **Payload / Prompt** | Secondary character prompt omits negative tokens | Inject `prohibited_on_others` directly into that character's block of the full prompt, then make a [fresh full render](../4-explanation/concepts/FRESH-RENDER-NOT-A-PATCH.md). |
| **Tier 3** | **Engineering / Code** | Prompt generator script failed to copy `prohibited_on_others` | Patch `scripts/compile-shot.mjs` or `scripts/character-registry/check.mjs`. Run `npm test`. |
| **Tier 4** | **Vendor / Diffusion** | Diffusion model ignores negative prompt across whole image | Make a **[fresh full render](../4-explanation/concepts/FRESH-RENDER-NOT-A-PATCH.md) from the model sheet** with a separate prompt zone per character. Never patch with regional inpainting masks: an inpaint on a figure causes identity drift, and each patch moves the face and look further from the model sheet. Fail cleanly rather than accepting contaminated images. |

---

## 4. Verification

* Run `npm test` in this repository — must exit `0`.
* Run `node scripts/check-prop-continuity.mjs` — must pass with `0` collisions.
