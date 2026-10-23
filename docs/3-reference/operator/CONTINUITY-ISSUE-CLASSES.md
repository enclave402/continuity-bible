---
title: Continuity Issue Classes
doc_id: continuity-issue-classes
triadic_leg: reference
canonical_path: docs/3-reference/operator/CONTINUITY-ISSUE-CLASSES.md
status: active
last_reviewed: 2026-10-22
canonical: true
---

# Continuity Issue Classes

The four canonical classes of visual continuity breaks that every story
project inherits from narrative-token-ssot. Any story with sequential panels
must guard against these.

---

## 1. Environmental Polarity Inversion

**Class tag:** `polarity`

**Definition:** A scene's declared `environment_polarity` (indoor or outdoor)
disagrees with its own visual description.

**Example fail:**
- `environment_polarity: "indoor"` but `visualDescription` contains "umbrella on a wet sidewalk"

**Example fail:**
- `environment_polarity: "outdoor"` but `visualDescription` contains "candlelit café booth"

**Severity:** FAIL — this is a hard gate. An image generator given a visualDescription
that contradicts the declared environment will produce a panel that cannot be placed
in the correct scene slot.

**Fix:** Split the scene, correct the polarity declaration, or rewrite the
visualDescription to match the environment.

---

## 2. Precipitation Contradiction

**Class tag:** `precipitation`

**Definition:** A scene's `visualDescription` references rain, mist, or wet surfaces
but its `visualGroundTruth` does not, or rain appears in an indoor scene without
explanation (e.g. rain streaming down a window).

**Example warn:**
- `visualDescription`: "Walking through the rain with an umbrella"  
- `visualGroundTruth`: "Two people walking on a dry sidewalk"

**Severity:** WARN — precipitation is often omitted from ground-truth descriptions
by accident. A warn prompts the author to reconcile.

**Fix:** Add rain/wet to visualGroundTruth, or remove it from visualDescription.

---

## 3. Wardrobe Ownership Contradiction

**Class tag:** `wardrobe`

**Definition:** A garment owned by one character (as declared in the wardrobe
registry or character-registry) appears on a different character without an
explicit transfer verb (`placed`, `set`, `gave`, `handed`, `draped`).

**Example warn:**
- Scene N: Theo wears his charcoal wool coat
- Scene N+1: Sam wears the charcoal wool coat, but no transfer is described

**Severity:** WARN — wardrobe transfers are valid story beats but must be
explicitly authored. An unwritten transfer reads as an image continuity error.

**Fix:** Either insert a transfer beat (Theo placing the coat on Sam's shoulders)
or remove the coat from the non-owner's description.

---

## 4. Unguarded Screen Affordance

**Class tag:** `screen`

**Definition:** A scene contains a phone, screen, iMessage thread, or other
handheld illuminated device in its prose or visual description but does not
declare a `screen_affordance` guard.

**The guard format:**

```json
{
  "screen_affordance": {
    "device": "iPhone 15 Pro Max",
    "sub_surface": "matte screen protector over black titanium bezel",
    "screen_is_lit": true,
    "screen_is_visible_to_reader": "yes | no",
    "note": "one sentence describing why the screen is or is not visible"
  }
}
```

**Why this matters:** AI image generators exhibit "Canonical View Bias" — they
turn the screen toward the camera so the viewer can read it, forcing the
character to stare at the blank back chassis. The guard locks the orientation.

**Severity:** WARN — informational only; becomes a FAIL when the project opts
into strict mode.

**Fix:** Add a `screen_affordance` block to the scene record.

---

## Linter

The reference linter is `scripts/check-story-coherence.mjs`. Downstream projects
inherit these four classes and implement their own linter (e.g.
relator-app's `scripts/check-story-visual-coherence.mjs`).

Run it:

```bash
node scripts/check-story-coherence.mjs [--registry path/to/scenes.json] [--edition path/to/edition.json]
```

Exit code 0 means zero hard-fails. Warnings print to stderr but do not fail the build.
