---
title: Prop disposition and visual continuity
doc_id: ref-prop-disposition-and-visual-continuity
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/PROP-DISPOSITION-AND-VISUAL-CONTINUITY-STANDARDS.md
status: active
last_reviewed: 2026-10-22
canonical: true
---

# Prop disposition and visual continuity

This page is the lookup for objects and clothes in the public example. The commands are in [How to track props and wardrobe](../2-how-to/HOW-TO-TRACK-PROPS-AND-WARDROBE.md). The shape of the checklist is `scripts/prop-index.v1.schema.json`. The commercial story is not in this repository, and this page does not copy it.

## Two ways to list the same objects

| Way | Key | Question it answers |
| :--- | :--- | :--- |
| Scene first | a page slug | What is on this page? |
| Prop first | a prop id | Which pages show this object, who has it, and which hand is it in? |

The scene file, the shot sheet, and the wardrobe are scene-first or character-first. `scripts/compile-prop-index.mjs` writes the prop-first file `examples/continuity/prop-index.json`. Rebuild it. Do not edit it by hand. `--check` fails when the saved file is not a fresh compile, or when the compile breaks the schema or the chirality rules.

Spread numbers come from `examples/story/editions/sam-first.json` (the reading order that opens on the porch). The other edition renumbers the same scenes. A retired scene is not a page in that order, so it is not a row.

A row is written only when the object is on that page:

- A watch from the wardrobe is on a page when its owner is in the shot (or, if that scene has no shot sheet, in the scene's cast).
- A prop listed on the scene is on that page. If a shot names who holds it, the row says so. If the shot does not name a hand, `side` is `unspecified`. If the prop is in frame and not in a hand, `presence` is `exempt` and `side` is `none`.

## Index fields

| Field | Meaning |
| :--- | :--- |
| `item_id` | The prop id. It is also the key in `props`. |
| `character` | The owner id. A hand-off does not change the owner. The timeline `reason` names who holds it in that scene. |
| `worn_on` | `LEFT_WRIST_ONLY`, `RIGHT_WRIST_ONLY`, `EITHER_WRIST`, `NECK`, `TORSO`, `HAND_HELD`, `POCKET`, or `NONE`. |
| `intrinsic_laterality` | The body side, or `NONE` when the object has no left or right. |
| `screen_projection_rules` | Where that body side lands on screen when the person faces the camera, and when their back is to the camera. A left wrist faces the camera on screen right. |
| `total_scenes`, `worn_count`, `removed_count` | Row count, rows marked `worn`, rows marked `removed`. Rows marked `exempt` are in the total and in neither count. |
| `timeline[].slug` | The scene id. Once per prop. |
| `timeline[].spread_number` | The place in the edition, starting at 1. |
| `timeline[].story_day` | From the shot sheet when the scene has one. Otherwise `day-1`, or `day-2` when the scene's weekday is not the first scene's weekday. |
| `timeline[].presence` | `worn`, `removed`, or `exempt`. |
| `timeline[].side` | `left`, `right`, `none`, or `unspecified`. A worn left-wrist prop must say `left`. |

`node scripts/check-prop-continuity.mjs` checks the wardrobe file's wrist rules. The prop index check uses the same projection.

## Wardrobe layers

`examples/continuity/wardrobe-and-props.json` is the clothes file the continuity cards link. An outfit's `layers` are `outer`, `hood_or_cowl`, `top`, `bottom`, `footwear`, and `fabric_spec`. `negative_tokens` are the mistakes that outfit tends to cause (a bare leg, a hood that is not attached). The three people in the public cast each have two outfits and a turnaround.

## Turnaround

A `turnaround` has `front`, `back`, `profile_left`, and `profile_right`. Each view has a `path` and a `description`. The description is what must stay true from that angle: hair, a scar, which wrist is near the camera. The picture at `path` may not exist yet.

## A companion

`examples/continuity/archie-terrier.json` is the public companion shape (a young-world companion subworld). The id `archie-terrier` is the collar-tag prop token `{{archie-terrier}}`. It is not a scene in the example edition. Register a companion in your own registry before a scene uses the token. This repository's example registry is unchanged so the public cast stays three people and two story props.
