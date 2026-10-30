---
title: Universal facial DNA and character continuity
doc_id: ref-facial-dna-continuity
triadic_leg: diataxis
diataxis_mode: reference
canonical_path: docs/3-reference/FACIAL-DNA-AND-CHARACTER-CONTINUITY-SSOT.md
status: active
last_reviewed: 2026-10-30
canonical: true
what: The facial DNA rule. Every person in the registry has five written face facts, and no two people share them.
why: Image tools drift toward the same face for everyone. Written face facts give each person a face of their own.
how: Fill in the five fields under facial_dna for each person, then run npm test.
next: Read the roster table, then check your own cast against it.
---

<!-- WHAT THIS IS: Universal Single Source of Truth (SSOT) architecture for character facial bone structure, skin tone, and phenotypic DNA. -->
<!-- WHY IT MATTERS (MONEY / SEO / SPEED): Stops AI diffusion models from homogenizing characters (e.g. giving Milo and Soren identical jawlines, or drifting Alexandra's Slavic features), eliminating redraw loops and preserving cast demographic diversity. -->
<!-- HOW TO USE IT (1 LINE): node scripts/compile-shot.mjs --character <id> (or npm test) -->
<!-- WHERE ITS DATA LIVES (COLLOCATION): character-registry.json (under forms.facial_dna) + turnaround model sheets. -->
<!-- WHERE ITS AUTH LIVES (ENV SSOT): Invariant rule locked by owner mandate (2026-10-15, 2026-10-19, and 2026-10-25). -->

# Universal Facial DNA SSOT & Multi-Character Mapping Architecture

> **Amnesiac Landing (8th-Grade Clarity):**  
> **The Biometric School ID Rule:** When a school prints student IDs, it doesn't ask an artist to guess what each kid looks like from memory. It looks up their official photo and measurements in the central computer database.  
> In our doll universe, **every single character** (not just the main leads!) has an official biometric facial profile locked in the computer: exact jawline shape, skin tone hex, eye shape, brow arch, and hair texture. Whenever an AI draws a group picture, it **must** look up the official profile for *every person on the stage*. No one is ever drawn from memory, and no two characters are ever allowed to share the same face.

---

## 1. The Two Masters Architecture for Facial DNA

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           MASTER 2: CONTINUITY-BIBLE                             │
│                           (Universal Rules & Schema)                             │
│                                                                                  │
│   • character-registry.v1.schema.json: requires forms.facial_dna per character   │
│   • docs/3-reference/FACIAL-DNA-AND-CHARACTER-CONTINUITY-SSOT.md: Canonical Spec │
│   • test/facial-dna-invariants.test.mjs: Verifies all characters have unique DNA │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                 Synchronized via scripts/sync-continuity-ssot.mjs
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                            MASTER 1: RELATOR-APP                                 │
│                         (Production Web & Pipeline)                              │
│                                                                                  │
│   • character-registry.json: Character facial profiles (The Five + 19 Moments)   │
│   • scripts/compile-cast-prompt.mjs: Dynamic prompt compiler (pulls {{id:face}}) │
│   • site/data/jev-questions.ssot.mjs: Automated Jev Vision differentiation gate  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Canonical Facial DNA Registry Schema

Every character entry in `character-registry.json` must provide an immutable `forms.facial_dna` specification adhering to these five physical coordinates:

```json
{
  "forms": {
    "facial_dna": {
      "bone_structure": "Planar facial shape, jawline angle, cheekbone height, chin contour",
      "skin_phenotype": "Exact skin shade, undertone (cool/warm/olive/caramel), molded vinyl specular highlight response",
      "eyes_and_brows": "Eye shape (almond/round/hooded), iris color, brow arch, gaze direction",
      "nose_and_mouth": "Bridge profile (straight/aquiline/button), nostril definition, lip fullness and resting expression",
      "rooted_hair": "Hair texture (coils/waves/sleek), strand density, hairline shape, dimensional highlights",
      "negative_drift_tokens": ["Prohibited drift features e.g. beard on clean-shaven, rounded jaw on chiseled"]
    }
  }
}
```

---

## 3. The Universal Roster (Every Character on the Canvas)

No character is exempted. In the "WE REL8!" panoramic lineup:

| Character | Role / Archetype | Bone Structure | Skin & Eyes | Rooted Hair | Negative Tokens (`AVOID`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Jamal** | Relational Anchor | Broad, warm square jawline, relaxed smile | Deep rich espresso brown, warm dark eyes | Tight neat fade with natural line-up | `straight hair, pale skin, beard, angular scowl` |
| **2. Nia** | Anxious Lead | Soft feminine heart-shaped face, delicate chin | Warm caramel bronze skin, luminous amber eyes | High textured cloud puff bun with baby hairs | `blonde hair, flat hair, angular sharp jaw` |
| **3. Aleksandra** | Earned Security Lead | Regal Slavic sculpted cheekbones, straight nose bridge | Fair porcelain skin with warm specular sheen, emerald green eyes | Dimensional golden-blonde waves past shoulders | `ethnically ambiguous, button nose, dark curls, brown eyes` |
| **4. Coach Hype** | Sovereign Flagship | Athletic chiseled planar cheekbones, sharp jawline | Honey-bronze caramel skin (`#9B6B43`), warm honey-brown eyes | Groomed pencil goatee, diamond stud in left ear, black cap | `pale skin, clean-shaven chin, soft round cheeks, generic face` |
| **5. Milo Sterling** | Anxious Lead | Slender oval facial structure, soft rounded jawline | Warm olive-fair skin, gentle downward-tilted hazel eyes | Dense wavy honey-brown rooted curls | `square jaw, sharp angles, goatee, sunglasses, Soren clone face` |
| **6. Soren** | Dismissive-Avoidant Lead | High razor-sharp architectural cheekbones, severe square jaw | Cool pale porcelain skin, cool slate-grey eyes behind dark shades | Sleek jet-black wet-look side part | `soft cheeks, warm undertone, brown curls, smiling open mouth, Milo clone face` |
| **7. Vesper** | Fearful-Avoidant Lead | Sharp kinetic jaw, high angular brow | Pale alabaster skin, intense dark eyes | Asymmetrical dark textured crop with electric magenta streak | `long hair, blonde hair, warm makeup, soft round face` |
| **8. Malik** | Grounded Boundary Lead | Strong athletic oval jaw, completely clean-shaven upper lip/chin | Rich warm mahogany skin, deep observant dark eyes | Crisp short buzz cut with clean edges | `mustache, pencil line, stubble, facial hair, light skin` |

---

## 4. Andrej Karpathian Troubleshooting Ladder

| Tier | Diagnostic Level | Symptom | Self-Announcing Remedy |
| :--- | :--- | :--- | :--- |
| **Tier 0** | **Docs / State** | Character look is disputed or guessed | Open `character-registry.json` under `forms.facial_dna`. The written spec is law. |
| **Tier 1** | **Exact Error** | Jev `milo_soren_differentiation` score < 1.50 | Read raw API output. Identify which facial features collided. |
| **Tier 2** | **Payload / Compiler** | Prompt JSON in `chatgpt-studio-queue` was written by hand | Run `node scripts/compile-cast-prompt.mjs`. Banned: handwritten facial prompts. |
| **Tier 3** | **Engineering / Schema** | Registry is missing `facial_dna` for a character | Compiler halts with exit code 1: `MISSING_FACIAL_DNA_ERROR: {{id}} has no facial_dna block.` |
| **Tier 4** | **Vendor / Diffusion** | Diffusion model bleeds faces across adjacent bounding boxes | Switch to regional inpainting masks using the exact coordinate boxes from `barnaby_box` and facial landmarks. |
