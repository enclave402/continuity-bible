---
title: How to track props and wardrobe
doc_id: how-to-track-props-and-wardrobe
triadic_leg: diataxis
diataxis_mode: solve
canonical_path: docs/2-how-to/HOW-TO-TRACK-PROPS-AND-WARDROBE.md
status: active
last_reviewed: 2026-10-22
canonical: true
---

# How to track props and wardrobe

You want a watch, a key, or a coat to stay the same on every page. This page is the commands to copy. Field by field: [Prop disposition and visual continuity](../3-reference/PROP-DISPOSITION-AND-VISUAL-CONTINUITY-STANDARDS.md).

Run every command from the repository folder.

## 1. Look up an object, not a page

A scene file lists what is on one page. The prop index flips that. You look up the object and see every page, who has it, and which hand it is in when the sheet says.

Write the checklist:

```bash
node scripts/compile-prop-index.mjs
```

That writes `examples/continuity/prop-index.json`. Do not edit that file. Edit the scene, the shot sheet, or the wardrobe, then run the command again.

Check that the saved file still matches the story:

```bash
node scripts/compile-prop-index.mjs --check
```

A match ends with `prop index: examples/continuity/prop-index.json matches the public example`. If it is out of date, the command exits 1 and tells you to run the first command.

`npm run prop-index` is the same as the first command. `npm run verify` runs the check.

## 2. Clothes in layers

Open `examples/continuity/wardrobe-and-props.json`. Each outfit is layers, not one phrase:

- `outer` is the coat, or the words "no coat"
- `hood_or_cowl` says whether a hood is attached
- `top`, `bottom`, and `footwear` are the pieces under the coat
- `fabric_spec` is the cloth
- `negative_tokens` are the mistakes to forbid, such as a bare leg or a hood that fell off

Give each person at least two outfits when the story has more than one day. The example does this for `chloe-jenkins`, `sam-hayes`, and `theo-vance`.

## 3. A turnaround sheet

The same file has a `turnaround` for each of those three people: `front`, `back`, `profile_left`, and `profile_right`. Each view has a `path` and a `description` of what must stay true when the person turns. The picture file can come later. The words are the contract until then.

## 4. A pet

A pet is one id, not a paragraph of names. The public example is `examples/continuity/archie-terrier.json`. The id is `archie-terrier`. The collar tag is the same prop token:

```text
{{archie-terrier}}
```

Write that token in a scene. Do not type a pet's name. The example is not a page in the sample story. It shows the shape for a young-world companion subworld.

## 5. Check the whole repository

```bash
npm run verify
```

That runs the name gate, the tests, the prop index check, and the other gates. It must exit 0.
