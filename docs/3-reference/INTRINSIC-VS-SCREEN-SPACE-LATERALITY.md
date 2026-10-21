---
title: "Self-Announcing Architecture: Intrinsic Anatomical Laterality and Camera-Space Projection Matrix"
doc_id: ref-intrinsic-vs-screen-space-laterality
triadic_leg: diataxis
diataxis_mode: reference
canonical_path: docs/3-reference/INTRINSIC-VS-SCREEN-SPACE-LATERALITY.md
status: active
last_reviewed: 2026-10-21
canonical: true
---

# Self-Announcing Architecture: Intrinsic Anatomical Laterality and Camera-Space Projection Matrix

> **Core Philosophy (Andrej Karpathy Transparency Standard):**  
> *"Every data structure and continuity schema in this repository must self-announce its own WHY, WHAT, and HOW. Zero magic, zero hidden heuristics. If a developer, creator, or buyer inspects this repository, the system must immediately declare what failure mode it eliminates and the mathematical coordinate logic governing it."*

---

## 1. The Core Failure Mode: Why Generative AI Flips Wrists and Props

When generating sequential graphic novel panels or visual narratives using 2D text-to-image diffusion models (e.g. Midjourney, DALL-E 3, Stable Diffusion / Flux), asymmetrical props (such as wristwatches, holsters, rings, or armbands) frequently exhibit **Bilateral Chirality Inversion** &mdash; flipping randomly between the character's left and right limbs across adjacent panels.

### The Root Cause: Latent Reflection Invariance & The Coordinate Paradox

1. **The Viewer vs. Character Coordinate Paradox:**
   - When a character stands **facing the viewer** (camera-facing):
     - The character's anatomical **right** hand appears on the viewer's **screen-left**.
     - The character's anatomical **left** hand appears on the viewer's **screen-right**.
   - When a character stands with their **back to the viewer** (dorsal view):
     - The character's anatomical **right** hand appears on the viewer's **screen-right**.
     - The character's anatomical **left** hand appears on the viewer's **screen-left**.

2. **Diffusion Reflectional Symmetry Bias:**
   Text-to-image models are trained on internet-scale 2D image datasets containing millions of mirrored photographs and mirror selfies. Convolutional feature maps and cross-attention spatial layers lack an innate 3D skeletal rig. Consequently:
   - An unprojected prompt directive like `"watch on left wrist"` carries ambiguous signal.
   - The model defaults to **global compositional symmetry priors** &mdash; placing the prop on whichever arm is active or balances the visual weight of the frame.
   - In two-character compositions (e.g. two people reaching for a shared bag handle), the model enforces visual harmony by making them mirror images of each other, flipping one character's watch to the wrong wrist.

---

## 2. Formal Technical Taxonomy Across Disciplines

To eliminate semantic drift and establish deterministic contracts, this repository grounds prop laterality across five rigorous academic and engineering disciplines:

| Discipline | Character Body Frame | Observer / 2D Canvas Frame | Failure Mode / Boundary Condition |
|---|---|---|---|
| **Cognitive Linguistics (Levinson)** | **Intrinsic Frame of Reference** (anchored to object's inherent asymmetry) | **Relative (Deictic) Frame of Reference** (projected from observer viewpoint) | Deictic-Intrinsic Conflation |
| **Robotics & Computer Vision** | **Egocentric Coordinates** ($X_{\text{ego}}, Y_{\text{ego}}, Z_{\text{ego}}$) | **Allocentric / Camera-Space Coordinates** ($X_{\text{cam}}, Y_{\text{cam}}, Z_{\text{cam}}$) | Uncalibrated Camera Extrinsics |
| **Theatrical & Film Production** | **Stage Right / Stage Left** (actor-centric looking at audience) | **House Right / House Left (Screen Right / Left)** (audience/camera-centric) | 180-Degree Line Violation |
| **Anatomical Medicine** | **Anatomical Position (Dexter / Sinister)** (patient-relative) | **Clinical Observer View** (physician-facing) | Laterality Inversion Error |
| **Generative Machine Learning** | **Skeletal / Object-Space Coordinates** | **2D Latent Pixel Grid Projection** | Bilateral Chirality Inversion |

---

## 3. The Mathematical Transformation Matrix

All narrative prompts in this repository compile through a deterministic projection function prior to dispatching to image generators:

$$\text{Screen Wrist} = \begin{cases} 
\text{SCREEN RIGHT}, & \text{if } \text{Anatomical Wrist} = \text{LEFT} \text{ and Subject Faces Camera} \\ 
\text{SCREEN LEFT}, & \text{if } \text{Anatomical Wrist} = \text{RIGHT} \text{ and Subject Faces Camera} \\ 
\text{SCREEN LEFT}, & \text{if } \text{Anatomical Wrist} = \text{LEFT} \text{ and Subject Back to Camera} \\ 
\text{SCREEN RIGHT}, & \text{if } \text{Anatomical Wrist} = \text{RIGHT} \text{ and Subject Back to Camera} \\ 
\text{NEAR SIDE (FOREGROUND)}, & \text{if } \text{Anatomical Wrist} = \text{LEFT} \text{ and Subject Profiles Screen-Left} \\ 
\text{FAR SIDE (OCCLUDED)}, & \text{if } \text{Anatomical Wrist} = \text{LEFT} \text{ and Subject Profiles Screen-Right} 
\end{cases}$$

---

## 4. Self-Announcing Schema Specification

In [`scripts/wardrobe-and-props.v1.schema.json`](../../scripts/wardrobe-and-props.v1.schema.json), every prop definition self-announces its purpose and transformation rule:

```json
{
  "_comment": "CONTINUITY STRUCTURE: Intrinsic Anatomical Laterality & Chirality Invariant (Andrej Karpathy Self-Announcing Standard)",
  "_engineering_purpose": "Prevents Diffusion Laterality Inversion by enforcing Intrinsic Coordinates over Deictic Screen Coordinates",
  "_projection_rule": "When the character faces the camera, their Intrinsic Left hand projects to Screen Right. When their back is to the camera, their Intrinsic Left hand projects to Screen Left. All prompts compile through this projection matrix.",
  "item_id": "sam-tonneau-watch",
  "name": "Art Deco tonneau watch",
  "worn_on": "LEFT_WRIST_ONLY",
  "intrinsic_laterality": "ANATOMICAL_LEFT_WRIST",
  "screen_projection_rules": {
    "facing_camera": "SCREEN_RIGHT",
    "back_to_camera": "SCREEN_LEFT",
    "profile_facing_screen_left": "NEAR_SIDE_FOREGROUND",
    "profile_facing_screen_right": "FAR_SIDE_OCCLUDED"
  },
  "geometry": "tonneau-rectangular with curved flanks and cream vellum dial",
  "reference_image": "examples/anchor/sam_watch_iso.png",
  "prompt_tokens": "vintage tonneau-shaped gold watch on cognac leather strap, worn on left wrist only",
  "negative_tokens": [
    "round watch",
    "circular dial",
    "right wrist",
    "smartwatch"
  ]
}
```

---

## 5. The Verification Linter Gate (`check-prop-continuity.mjs`)

A schema alone does not prevent regressions; it must be backed by an automated CI gate. The gate enforces:

1. **Schema Validation:** Rejects any prop marked with `worn_on: "LEFT_WRIST_ONLY"` or `"RIGHT_WRIST_ONLY"` that lacks `intrinsic_laterality` and `screen_projection_rules`.
2. **Prompt Coordinate Disambiguation:** Fails any prompt that mixes screen coordinates (`"Left: ... Right: ..."`) with anatomical words (`"left wrist"`) without explicit projection.
3. **Dual-Limb Action Binding:** Requires prompts depicting manual actions to explicitly state which hand acts and which hand bears the prop.
4. **Pixel Vision Reading Verification:** Compares post-render vision readings (e.g. `found.side: "left", frame: "anatomical"`) against the canonical registry, failing the build on mismatch.

---

## 6. Commercial Asset Viability

By productizing this self-announcing architecture:
- The repository becomes **transparent and auditable** to prospective buyers, licensors, and technical teams.
- Creators do not need to memorize ad-hoc prompt tricks; the system compiler automatically injects correct 2D screen projections based on scene blocking.
- Narrative continuity transitions from speculative LLM memory into an empirical, testable software engineering discipline.
