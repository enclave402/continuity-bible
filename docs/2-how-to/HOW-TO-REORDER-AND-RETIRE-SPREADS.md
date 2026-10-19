---
title: How to retire a spread without losing it, and tell the same story in two orders
doc_id: how-to-reorder-and-retire-spreads
triadic_leg: diataxis
diataxis_mode: solve
canonical_path: docs/2-how-to/HOW-TO-REORDER-AND-RETIRE-SPREADS.md
status: active
last_reviewed: 2026-10-19
canonical: true
---

# How to retire a spread without losing it, and tell the same story in two orders

Outcome: your story is a set of records, not a stack of pages. Each spread (the picture and the words a reader meets at one time) is written once, in one file, with no number on it. A reading order is a separate list of those records' names. So you can move a spread, open the book on a different character, or take a spread out of the book without deleting anything, and every page that is built from the records follows. Three checks stop the three ways this goes wrong: a built page that no longer matches the records, a picture that is lost or kept by accident, and a retirement that quietly became a deletion. Field by field: [Scene and edition fields](../3-reference/SCENE-AND-EDITION-FIELDS.md). Why it is built this way: [ADR-006](../4-explanation/decisions/ADR-006-story-as-records-and-editions.md).

This page uses the repository's own example story, `examples/story`, so every command runs as written from the repository folder (the one with `scripts/` in it). The last section says how to set up the same files for your own story.

Three words first. A **scene record** is one spread's title, words, picture description and picture files, kept under a short name called its **slug** (`the-porch`). An **edition** is one reading order: a list of slugs. A story can have several editions and the records never change between them. A **retired** scene is one that an edition reads nowhere; its record and its pictures stay.

## 1. See where every spread is

```bash
node scripts/story.mjs list examples/story
```

```text
Six Hours: 6 scene(s), 2 edition(s) (sam-first, theo-first), 1 retired in every edition.
slug                      sam-first  theo-first  title
the-porch                 1          3           The porch
read-at-1152              2          4           Read at 11:52
the-napkin-timeline       retired    retired     The napkin timeline
across-town               3          1           Across town
morning-at-the-workbench  4          2           Morning at the workbench
the-text-sent             5          5           The text, sent
```

The porch is spread 1 in one edition and spread 3 in the other. Nobody typed those numbers: each is the slug's position in its edition's list. The napkin scene has a record and a picture, and neither edition reads it.

The story folder holds:

| File | What it is |
|---|---|
| `scenes.json` | one record per scene, keyed by slug; names are `{{id}}` tokens |
| `editions/sam-first.json`, `editions/theo-first.json` | one reading order each: `order` (slugs) and `retired` (slugs) |
| `art/` | every picture, named after its scene (`main_the-porch.png`) |
| `parked-art.json` | every picture nothing loads, with a reason; and a note for any picture that was removed |
| `built/sam-first.txt`, `built/theo-first.txt` | output: each edition as a reader meets it, rebuilt, never edited |

## 2. Read an edition, and check the story

```bash
node scripts/story.mjs render examples/story theo-first
```

The first spread it prints is the workshop, because that edition's list starts with `across-town`:

```text
SIX HOURS (Six Hours, Theo first): 5 spreads, read in order.
Each spread has a picture; the PICTURE line says what it shows.

=== SPREAD 1 OF 5 ===
PART: Part one: six hours
TITLE: Across town
PICTURE: A man alone in a carpenter's workshop under a hanging bulb, a phone face down beside the plane, a brass key on a nail by the door.
TIME: Thursday, 11:55 PM
```

Every spread prints the same way: the title, the PICTURE line (what the picture shows, in one sentence), the time, the paragraphs, the dialogue, the margin note, the footnote. The same text is kept in `built/`, so a change to the records shows up as a diff. The three checks run together:

```bash
node scripts/story.mjs check examples/story
```

```text
check-story-built: pass (2 edition(s) built from 6 scene(s), output equal to the source)
check-story-art: pass (7 picture(s) loaded by 5 placed scene(s), 2 parked with a reason, 9 in examples/story/art/)
check-story-retired: pass (1 scene(s) retired in every edition with their records and pictures kept, 0 picture(s) removed with a note, 0 deletion(s) in git)
story: pass (6 scenes, 2 editions: built output current, every picture accounted for, nothing deleted)
```

## 3. Retire a spread without losing it

Say the workshop scene, `across-town`, comes too early and you want it out of the book for now. You will not delete anything. You move its slug, rebuild, and park its picture.

**Move the slug.** Open `examples/story/editions/sam-first.json`. Take `"across-town"` out of `order` and add it to `retired`, so the file reads:

```json
{
  "$schema": "../../../scripts/edition.v1.schema.json",
  "_about": "The reading order that opens on the porch. Position in order is the spread number; nothing is numbered by hand.",
  "title": "Six Hours, {{sam-hayes}} first",
  "order": [
    "the-porch",
    "read-at-1152",
    "morning-at-the-workbench",
    "the-text-sent"
  ],
  "_about_retired": "the-napkin-timeline was retired from both editions on 2026-10-19: it stalled the kitchen scene. Its record stays in scenes.json and its picture stays in art/, parked in parked-art.json with that reason.",
  "retired": [
    "the-napkin-timeline",
    "across-town"
  ]
}
```

Do the same in `examples/story/editions/theo-first.json`: take `"across-town"` out of `order` and add it to `retired`. (A scene retired in one edition and read in another is fine too; it is only "retired in every edition" when no edition reads it.)

**Run the check.** It fails twice, and each line says what to do:

```bash
node scripts/story.mjs check examples/story
```

```text
examples/story/built/sam-first.txt differs from the source (first difference at line 1: built says "SIX HOURS (Six Hours, Sam first): 5 spreads, read in order.", the source renders "SIX HOURS (Six Hours, Sam first): 4 spreads, read in order."). Fix: node scripts/story.mjs build examples/story, then commit built/; built output is never edited by hand
examples/story/built/theo-first.txt differs from the source (first difference at line 1: built says "SIX HOURS (Six Hours, Theo first): 5 spreads, read in order.", the source renders "SIX HOURS (Six Hours, Theo first): 4 spreads, read in order."). Fix: node scripts/story.mjs build examples/story, then commit built/; built output is never edited by hand
check-story-built: fail (2 problem(s))
examples/story/art/main_across-town.png is in the art folder, loaded by no spread of any edition, and not listed in examples/story/parked-art.json. Fix: list it under a scene's art, or park it with a reason: node scripts/check-story-art.mjs examples/story --park --reason "<why it is kept>"
check-story-art: fail (1 problem(s))
check-story-retired: pass (2 scene(s) retired in every edition with their records and pictures kept, 0 picture(s) removed with a note, 0 deletion(s) in git)
story: fail (2 of 3 gates failed)
```

The built pages still say five spreads; the records now say four. And the workshop picture is now loaded by nothing, which is allowed only on purpose.

**Rebuild, and park the picture with a reason.** Two commands, in this order:

```bash
node scripts/story.mjs build examples/story
```

```text
story: wrote examples/story/built/sam-first.txt (built output, do not edit)
story: wrote examples/story/built/theo-first.txt (built output, do not edit)
```

```bash
node scripts/check-story-art.mjs examples/story --park --reason "retired on 2026-10-19: the workshop came too early"
```

```text
check-story-art: wrote examples/story/parked-art.json (3 parked picture(s))
check-story-art: pass (parked list written)
```

The reason is written next to the file name in `parked-art.json`; pictures already parked keep the reasons they had. Now the check passes, and the list shows the retirement:

```bash
node scripts/story.mjs check examples/story
```

```text
check-story-built: pass (2 edition(s) built from 6 scene(s), output equal to the source)
check-story-art: pass (6 picture(s) loaded by 4 placed scene(s), 3 parked with a reason, 9 in examples/story/art/)
check-story-retired: pass (2 scene(s) retired in every edition with their records and pictures kept, 0 picture(s) removed with a note, 0 deletion(s) in git)
story: pass (6 scenes, 2 editions: built output current, every picture accounted for, nothing deleted)
```

```bash
node scripts/story.mjs list examples/story
```

```text
Six Hours: 6 scene(s), 2 edition(s) (sam-first, theo-first), 2 retired in every edition.
slug                      sam-first  theo-first  title
the-porch                 1          2           The porch
read-at-1152              2          3           Read at 11:52
the-napkin-timeline       retired    retired     The napkin timeline
across-town               retired    retired     Across town
morning-at-the-workbench  3          1           Morning at the workbench
the-text-sent             4          4           The text, sent
```

Nothing was deleted: `scenes.json` still holds the workshop record, `art/` still holds its picture, and `parked-art.json` says why it is there. To bring the spread back, move the slug from `retired` to `order` wherever you want it read, rebuild, and run `--park` again with any reason (the entry for a loaded picture is dropped).

## 4. Tell the same story in another order

A second (or third) telling is one new file. Make `examples/story/editions/kitchen-first.json` with this in it:

```json
{
  "title": "Six Hours, the kitchen first",
  "order": ["read-at-1152", "the-porch", "morning-at-the-workbench", "the-text-sent"],
  "retired": ["the-napkin-timeline", "across-town"]
}
```

Every scene of the story must be in `order` or in `retired`, once; the loader refuses a slug it does not know, a slug listed twice, a slug in both lists, and a scene in neither, so no scene is lost by being forgotten. Build, and the new edition has its own numbers and its own built text:

```bash
node scripts/story.mjs build examples/story
```

```text
story: wrote examples/story/built/kitchen-first.txt (built output, do not edit)
story: wrote examples/story/built/sam-first.txt (built output, do not edit)
story: wrote examples/story/built/theo-first.txt (built output, do not edit)
```

```bash
node scripts/story.mjs list examples/story
```

```text
Six Hours: 6 scene(s), 3 edition(s) (kitchen-first, sam-first, theo-first), 2 retired in every edition.
slug                      kitchen-first  sam-first  theo-first  title
the-porch                 2              1          2           The porch
read-at-1152              1              2          3           Read at 11:52
the-napkin-timeline       retired        retired    retired     The napkin timeline
across-town               retired        retired    retired     Across town
morning-at-the-workbench  3              3          1           Morning at the workbench
the-text-sent             4              4          4           The text, sent
```

Not one record changed. An edit to a record (a line of dialogue, the picture sentence) lands in every edition the next time you build.

## 5. If a picture really must go

Deleting a story picture is the one thing the checks never let happen quietly. Delete `examples/story/art/main_across-town.png` and run the check:

```bash
node scripts/story.mjs check examples/story
```

```text
check-story-built: pass (3 edition(s) built from 6 scene(s), output equal to the source)
examples/story/parked-art.json: parked lists main_across-town.png, which is not in examples/story/art/ (a parked picture disappeared, or the entry is stale). Fix: put the picture back, or move the entry to removed with a note saying who decided and why
check-story-art: fail (1 problem(s))
examples/story/art/main_across-town.png is gone, but across-town is retired, not deleted: a retirement keeps the record and the picture. Fix: put the picture back in examples/story/art/ (parked with a reason), or, if it must go, add it to removed in examples/story/parked-art.json with a note saying who decided and why
examples/story/art/main_across-town.png is deleted in git (gone from the working tree) with no note. Story pictures are never deleted silently. Fix: git restore --staged --worktree -- examples/story/art/main_across-town.png, or add { "file": "main_across-town.png", "note": "<who decided, when, and why>" } under removed in examples/story/parked-art.json
check-story-retired: fail (2 problem(s))
story: fail (2 of 3 gates failed)
```

The usual answer is to put the picture back. If it must go, the author writes the note: in `parked-art.json`, take the file's entry out of `parked` and add it under `removed`:

```json
"removed": [
  { "file": "main_across-town.png", "note": "the author, 2026-10-19: the workshop picture was wrong and will not be redrawn" }
]
```

With that note the checks pass, and the note stays in the file as the record of who decided. The record of the scene itself stays in `scenes.json` either way. To undo everything you did on this page: `git checkout -- examples/story` and delete `examples/story/editions/kitchen-first.json` and `examples/story/built/kitchen-first.txt`.

## 6. Your own story

Make a folder next to your registry (the tutorial's `my-story/` is fine) and inside it a story folder, say `book/`, with `scenes.json`, an `editions/` folder and an `art/` folder. Copy `examples/story/scenes.json` as a start and replace its scenes with yours: for each spread a slug, a `title`, the `paragraphs` and `dialogue` with `{{id}}` tokens for every name (people and props alike), the `picture` sentence, the `time`, a `layout` from the `layouts` block, and the picture file names under `art`, each starting with the `art_prefix` and the slug. Copy `examples/story/editions/sam-first.json` as your first edition and list your slugs in `order`. Then tell the gate about the files in `character-registry.json`:

```json
"surfaces": [
  { "type": "scenes", "file": "book/scenes.json", "story": "the-lighthouse", "fields": ["characters", "props", "narrator", "margin_author", "dialogue[].speaker"] }
],
"token_sources": [
  { "file": "book/editions/*.json", "why": "reading orders; a title that names a character writes a token" },
  { "file": "book/parked-art.json", "why": "file names and reasons; never a typed name" }
],
"coverage": { "ignore": ["book/built/**"] }
```

(Keep whatever the three lists already hold and add these lines to them.) From then on, from `my-story`:

```bash
node ../scripts/check.mjs
node ../scripts/story.mjs build book
node ../scripts/check-story-art.mjs book --park --reason "first pictures, kept"
node ../scripts/story.mjs check book
```

The first command catches a typed name anywhere in the story (`names "June" in a token source. Fix: write {{june-okafor}}`); the other three are this page. `built/<edition>.txt` is what you paste, print, or diff; `scenes.json` is what you edit.

## Where to go next

- Every field, every check and the built-text format line by line: [Scene and edition fields](../3-reference/SCENE-AND-EDITION-FIELDS.md).
- Planning the pictures of each spread so clothes, props and places carry from one to the next: [How to keep continuity from shot to shot](HOW-TO-KEEP-CONTINUITY-SHOT-TO-SHOT.md); the shot sheet's scenes use the same slugs.
- Why the story is records and orders, and what was left out on purpose: [ADR-006](../4-explanation/decisions/ADR-006-story-as-records-and-editions.md).
