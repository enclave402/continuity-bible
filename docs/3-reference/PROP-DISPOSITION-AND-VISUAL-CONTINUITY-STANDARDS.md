# Prop Disposition, Script Breakdown & Visual Continuity Standards

> **Canonical SSOT Reference:** `narrative-token-ssot` (Master 2 Framework)  
> **Production Pairing:** `relator-app` (Master 1 Storefront & Reader)  
> **Date:** 2026-10-21  
> **Author:** Antigravity / Coach Hype Continuity Architecture

---

## 1. Executive Summary & Production Ground Truth Audit

### What Exists in Production Today
In our production dataset (`scripts/dating-red-flags/wardrobe_and_props_registry.json`), the complete underlying continuity dataset already exists under `story_day_matrix`. It tracks **99 scenes**, with **95 explicit watch dispositions** (76 scenes where watches are worn, 19 where removed or exempt), complete with story days, in-universe times of day, and wardrobe layers.

```json
"the-soap-bubble-rupture": {
  "story_day": "day-1-morgan-thursday",
  "in_universe_time": "Thursday, Late October 2026 — 7:00 AM",
  "layers": {
    "sam-hayes": {
      "outer": "none",
      "mid": "ivory lace silk slip dress",
      "base": "none",
      "footwear": "bare feet"
    }
  },
  "watch": {
    "sam-hayes": {
      "presence": "removed",
      "side": "left",
      "reason": "Removed for bath and sitting on bathroom vanity table."
    }
  }
}
```

### What Is Missing from the SSOT Architecture
1. **The Inverted Index (Reverse Lookup)**: The data is currently indexed strictly *Scene-First* (Scene Slug $\rightarrow$ Props/Wardrobe/Time) rather than *Prop-First* (Prop ID $\rightarrow$ List of Scenes/Statuses/Thumbnails).
2. **The Visual Continuity Contact Sheet (Lookbook Dashboard)**: There is no quick HTML visualizer or CLI view that pulls all 76 watch panels side-by-side with their art images for a 2-second visual eyeball check.

---

## 2. Technical Terms Across Production & Engineering Domains

### A. Film, Television & Script Supervision (The Entertainment Standard)

| Industry Term | What It Is in Production | What It Means for Us |
| :--- | :--- | :--- |
| **Script Supervisor's Continuity Log** *(or Script Breakdown)* | The master production document kept by the Script Supervisor on set, logging the exact state of actors, props, and actions for every shot. | The role our `wardrobe_and_props_registry.json` serves. |
| **Prop Continuity Log** *(or Hand Prop Tracking Sheet)* | A dedicated matrix listing every hand prop (e.g., watch, lighter, cigarette, briefcase), recording its state per scene: **Worn**, **Held**, **Removed**, or **Off-Camera**, plus which hand/wrist it was on. | Our `story_day_matrix[<slug>].watch` block (`presence: "worn"`, `side: "left"`). |
| **Wardrobe Continuity Breakdown** *(Costume Sheet)* | Tracks an actor's clothing by **Story Day** and **Scene**, listing specific costume changes (outerwear, mid-layer, shoes, accessories) across non-chronological shooting. | Our `story_day_matrix[<slug>].layers` (`outer`, `mid`, `base`, `footwear`). |
| **Story Day / Script Day Matrix** | The canonical timeline tracking in-universe time (e.g., *Day 1 — Late Afternoon*, *Day 2 — 2:13 AM Fire Escape*), ensuring costumes and props do not magically change between scenes taking place on the same story day. | Our `story_days` array (`day-1-morgan-thursday` through `day-5-earned-2060`) and `in_universe_time` stamps. |
| **Continuity Book** *(or Continuity Photo Board)* | The physical binder (or iPad software like ScriptE) where the supervisor pastes polaroids/photos of the actor from the prior setup so the director and crew can **visually eyeball** continuity before rolling the next shot. | **The primary missing UI layer.** We have the data, but no single page showing the thumbnail images alongside the prop rules. |

### B. Animation, VFX & Game Production (Digital Pipelines)

| Pipeline Term | Technical Definition |
| :--- | :--- |
| **Shot Asset Manifest** *(or Scene Composition Descriptor)* | In Pixar USD (Universal Scene Description) or Maya pipelines, every shot has a manifest defining asset bindings (e.g. `Sam.Wrist.Left = TonneauWatch_Hero`). |
| **Asset Disposition Matrix** | A discrete state table declaring whether an asset is `Active`, `Dormant`, `Removed`, or `Exempt` for a given frame or shot. |
| **Chirality & Laterality Transform Matrix** | The coordinate mapping that binds an anatomical limb (intrinsic left wrist) to camera perspective (screen-right vs. screen-left). |

### C. Database Architecture & Computer Science

| Software / Data Term | Technical Definition |
| :--- | :--- |
| **Forward Index** *(What we currently have)* | Data keyed by document or scene: `Scene Slug -> { props, wardrobe, time }`. To find all watches, you have to loop through every scene. |
| **Inverted Index** *(What makes lookup instant)* | Data keyed by entity or prop: `Prop ID -> [ List of Scene Slugs, Statuses, Timestamps ]`. Allows querying `watch` to immediately get all 76 scenes without scanning. |
| **Contact Sheet / Inspection View** | A rendered secondary presentation tier that joins the Inverted Index with the rendered image files for human visual verification. |

---

## 3. Ground Truth Data Audit (Production Numbers)

From `scripts/dating-red-flags/wardrobe_and_props_registry.json`:
- **Total Cataloged Scenes:** 99 scenes.
- **Scenes with Explicit Watch Disposition:** 95 scenes.
- **Total Worn Watch Instances:** 116 records across Sam Hayes and Theo Vance.
- **Unique Scenes with Worn Watches:** 76 unique scenes.
- **Scenes with Watch Removed or Exempt:** 19 scenes (e.g. bath, morning chignon dressing, fire escape step, running fantasies).
- **Laterality Uniformity:** 100% of worn records specify `side: "left"`.

---

## 4. Implementation Blueprint & Unification Roadmap

To bridge the gap between our raw database structure and instant eyeball verification, the SSOT continuity framework requires the following two unified components:

### Component 1: Automated Inverted Prop Index Compiler (`scripts/compile-prop-index.mjs`)
A lightweight compiler that parses `wardrobe-and-props.json` and outputs a queryable secondary index:
```json
{
  "sam-hayes-tonneau-watch": {
    "item_id": "sam-hayes-tonneau-watch",
    "worn_on": "LEFT_WRIST_ONLY",
    "intrinsic_laterality": "ANATOMICAL_LEFT_WRIST",
    "scenes_worn": [
      { "slug": "the-gilbert-court-atrium", "time": "Thursday 5:20 PM", "panel": "drf_the_gilbert_court_atrium.png" },
      { "slug": "the-conservation-table", "time": "Thursday 5:45 PM", "panel": "drf_the_conservation_table.png" }
    ],
    "scenes_removed": [
      { "slug": "the-soap-bubble-rupture", "reason": "Removed for bath and sitting on vanity." }
    ]
  }
}
```

### Component 2: Visual Continuity Contact Sheet (`scripts/sheet.mjs` / `continuity-contact-sheet.html`)
An automated static lookbook generator:
- Takes `--prop <prop_id>` or `--all-props`.
- Generates a single zero-dependency HTML contact sheet.
- Displays thumbnail image plates in reading order.
- Overlays:
  - Character and prop status badge (`WORN [LEFT WRIST]`, `REMOVED`, `EXEMPT`).
  - Screen projection rule (`Camera Facing -> Screen-Right`).
  - In-universe story day and timestamp.
- Enables human visual inspection of all 76 watch panels in under 30 seconds.
