---
title: Scene and edition fields
doc_id: ref-scene-and-edition-fields
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/SCENE-AND-EDITION-FIELDS.md
status: active
last_reviewed: 2026-10-19
canonical: true
---

# Scene and edition fields

A story folder holds the story as data: one **scene file** with a record per spread (`scripts/scene.v1.schema.json`), one **edition** file per reading order (`scripts/edition.v1.schema.json`), the pictures, a **parked-art manifest** that accounts for every picture nothing loads, and **built output** that renders each edition the way a reader meets it. `scripts/story.mjs` loads, lists, renders and builds; three gate scripts check the folder. How to use them: [HOW-TO-REORDER-AND-RETIRE-SPREADS.md](../2-how-to/HOW-TO-REORDER-AND-RETIRE-SPREADS.md). Why they look like this: [ADR-006](../4-explanation/decisions/ADR-006-story-as-records-and-editions.md). The example: `examples/story/`.

Keys starting with `_` are notes anywhere: never validated, never scanned. Every other string in the scene file, the edition files and the manifest is a token source: a written-out name of a character or a prop fails the names gate with the token to write (`names "the cracked phone" in a token source. Fix: write {{cracked-phone}}`).

## The story folder

| Path | Role | Written by |
|---|---|---|
| `scenes.json` | the records | you |
| `editions/<id>.json` | one reading order each; the file name is the edition id (lower-case letters, digits, hyphens) | you |
| `art/` (or the `art_folder` the scene file names) | every picture of the story | you (and your image tool) |
| `parked-art.json` | every picture no placed scene loads, with a reason; the notes for removed pictures | `check-story-art.mjs --park`, then you for `removed` |
| `built/<id>.txt` | each edition as a reader meets it | `story.mjs build`; never edited |

## The scene file

```json
{
  "title": "Six Hours",
  "story": "main-story",
  "art_folder": "art",
  "art_prefix": "main_",
  "layouts": {
    "single": { "pictures": 1, "about": "one picture above the text" },
    "triptych": { "pictures": 3, "about": "three pictures in a row above the text" }
  },
  "scenes": {
    "the-porch": {
      "title": "The porch",
      "part": "Part one: six hours",
      "narrator": "{{chloe-jenkins}}",
      "characters": ["{{sam-hayes}}", "{{chloe-jenkins}}"],
      "props": ["cracked-phone"],
      "paragraphs": ["{{chloe-jenkins}} dug through her bag for her keys while {{sam-hayes}} read the message again under the porch bulb."],
      "dialogue": [{ "speaker": "{{sam-hayes}}", "text": "He read it. Look, it says read." }],
      "margin_note": "I counted the hours like they were evidence.",
      "margin_author": "{{sam-hayes}} (looking back)",
      "footnote": "A read receipt says a screen was open. It does not say a person was ready.",
      "picture": "Two women on a narrow front porch at night, one bent over a glowing phone.",
      "time": "Thursday, 11:50 PM",
      "layout": "single",
      "art": ["main_the-porch.png"]
    }
  }
}
```

Top level:

| Field | Required | Meaning |
|---|---|---|
| `title` | yes | the story's title; the first line of every built edition prints it in capitals |
| `story` | yes | the registry story id the characters belong to; every token resolves against it |
| `art_folder` | no (`art`) | the folder, relative to the scene file, that holds every picture |
| `art_prefix` | no (none) | what every picture file name starts with; after it comes the scene's slug |
| `layouts` | yes, at least one | the page shapes the story uses, keyed by a short id: `pictures` (how many picture files a scene of that shape lists) and `about` (one line for a person) |
| `scenes` | yes | one record per scene, keyed by slug: lower-case letters, digits and hyphens. The slug is the scene's identity in every edition and in its picture file names, and it never changes when the scene moves |

Each scene record:

| Field | Required | Meaning | In the built text |
|---|---|---|---|
| `title` | yes | the spread's title | `TITLE:` |
| `part` | no | the part, act or chapter it belongs to | `PART:`, above the title |
| `narrator` | no | whose voice tells the spread, as a token; must resolve to one character of the story | not printed |
| `characters[]` | no | who is in the spread, as tokens; each must resolve to one character allowed in the story | not printed |
| `props[]` | no | registry ids of props (`kind: "prop"`); never a prop's name | not printed |
| `paragraphs[]` | one of these two | the narration, one paragraph per item | each paragraph, a blank line after it |
| `dialogue[]` | one of these two | `{ speaker, text }` in order; the speaker is a token | `DIALOGUE:` then one line per item, `  Name: text` |
| `margin_note` | no | a short note in the margin | `MARGIN NOTE: ...` |
| `margin_author` | no | who the note is by, as a token (a qualifier in parentheses is allowed: `{{sam-hayes}} (looking back)`) | after the note, ` — Name` |
| `footnote` | no | a note under the spread | `FOOTNOTE: ...` |
| `picture` | yes | what the picture shows, in one sentence, tokens inside; the words of the spread may not contradict it | `PICTURE:` |
| `time` | yes | when in the story this spread happens, in the story's own words | `TIME:` |
| `layout` | yes | a key of `layouts` | not printed; sets how many files `art` lists |
| `art[]` | yes | the picture file names inside the art folder, in reading order, exactly as many as the layout's `pictures`; each starts with `art_prefix` and the slug (`main_the-porch.png`, `main_the-text-sent-1.png`) | not printed |

What the loader refuses in a scene record, beyond the schema: a `layout` that is not a key of `layouts`; an `art` list whose length is not the layout's `pictures`; a picture name with a folder in it or not named after its scene (the message gives the name to use); a spread with no paragraphs and no dialogue ("says nothing"); a slug with a capital letter or a space (the message gives the slug to use, to change here and in every edition); a token that is no character of the story.

## An edition file

```json
{
  "title": "Six Hours, {{sam-hayes}} first",
  "order": ["the-porch", "read-at-1152", "across-town", "morning-at-the-workbench", "the-text-sent"],
  "retired": ["the-napkin-timeline"]
}
```

| Field | Required | Meaning |
|---|---|---|
| the file name | yes | `editions/<id>.json`: the id, lower-case letters, digits and hyphens |
| `title` | yes | the edition's title as a reader sees it; a token source (a character's name is a token, and the built text prints the name) |
| `order[]` | yes, at least one | scene slugs in reading order; position 1 is spread 1 |
| `retired[]` | no | scene slugs read in no spread of this edition; their records and pictures stay |

What the loader refuses, listing every problem of every edition in one run: a slug in `order` or `retired` that `scenes.json` lacks (with the nearest slug when there is one); a slug listed twice in `order`; a slug in both `order` and `retired`; a scene in neither list ("neither placed nor retired", naming the scene and the edition that forgot it). A scene is **placed** when any edition reads it, and **retired in every edition** when none does; the picture gates use that distinction.

## The parked-art manifest

```json
{
  "parked": [
    { "file": "main_the-napkin-timeline.png", "reason": "its spread was retired from both editions on 2026-10-19; the record and the picture stay" }
  ],
  "removed": [
    { "file": "main_old-cover.png", "note": "the author, 2026-10-19: replaced by the new cover and not kept" }
  ]
}
```

| List | Entry | Meaning |
|---|---|---|
| `parked[]` | `{ file, reason }` | a picture in the art folder that no placed scene loads, and why it is kept. Written by `node scripts/check-story-art.mjs <story-folder> --park --reason "<why>"`: every unreferenced picture gets an entry, existing reasons are kept, an entry for a picture that is now loaded is dropped |
| `removed[]` | `{ file, note }` | a picture that has left the folder, and the note of who decided, when and why. Written by hand: this is the only thing that lets a story picture go |

File names are relative to the art folder. A reason or note that names a character writes a token.

## The built text

`node scripts/story.mjs build <story-folder>` writes `built/<id>.txt` for every edition and removes a built file whose edition no longer exists. `render <story-folder> <id>` prints the same text. The format, which the built-output gate diffs:

```text
SIX HOURS (Six Hours, Sam first): 5 spreads, read in order.
Each spread has a picture; the PICTURE line says what it shows.

=== SPREAD 1 OF 5 ===
PART: Part one: six hours
TITLE: The porch
PICTURE: Two women on a narrow front porch at night, one bent over a glowing phone, one at the door with her keys out.
TIME: Thursday, 11:50 PM

Chloe dug through her bag for her keys while Sam read the message again under the porch bulb. It was the fourth time since the cab.

DIALOGUE:
  Sam: He read it. Look, it says read.
  Chloe: I see it. Come inside.

MARGIN NOTE: I counted the hours like they were evidence. They were not evidence. They were hours. — Sam (looking back)

```

Line by line: the story title in capitals with the edition title in parentheses and the spread count; a fixed second line; then, per spread, the `=== SPREAD n OF N ===` header (n is the position in `order`), `PART:` when the record has one, `TITLE:`, `PICTURE:`, `TIME:`, a blank line, each paragraph followed by a blank line, `DIALOGUE:` with its lines and a blank line when there is dialogue, `MARGIN NOTE:` with ` — author` and a blank line when there is one, `FOOTNOTE:` and a blank line when there is one. Names and forms are resolved through `scripts/names.mjs`; a token left in the text fails the build.

## The commands

All run from the folder that holds `character-registry.json`, or with `--registry <path>`.

| Command | Does |
|---|---|
| `node scripts/story.mjs list <story-folder>` | every scene with its spread number in each edition, `retired` where an edition does not read it |
| `node scripts/story.mjs render <story-folder> <edition>` | one edition as a reader meets it, to the screen |
| `node scripts/story.mjs build <story-folder>` | writes `built/<edition>.txt` for every edition |
| `node scripts/story.mjs check <story-folder>` | the three gates below, in order, each as its own run |
| `node scripts/check-story-built.mjs <story-folder>` | gate 1 |
| `node scripts/check-story-art.mjs <story-folder> [--park --reason "<why>"]` | gate 2, or write the parked list |
| `node scripts/check-story-retired.mjs <story-folder>` | gate 3 |
| `npm run check:story` | gate 1 to 3 on `examples/story`; part of `npm run verify` |

## The three gates

| Gate | Passes when | Fails with |
|---|---|---|
| **Built output equals the source** (`check-story-built.mjs`) | every edition's `built/<id>.txt` is byte for byte what the records and the edition render now | the edition, the first differing line (what the built file says, what the source renders) and the fix: build, then commit `built/`. A built file for an edition that no longer exists fails too. Nothing on disk is changed by the check |
| **Every picture is accounted for** (`check-story-art.mjs`) | every picture a placed scene lists exists in the art folder and, inside a git checkout, is tracked; every picture in the folder that no placed scene loads is in `parked[]` with a reason; `parked[]` is exact | the picture and the scene that lists it (missing, or on disk but not added to git); the unparked picture with the `--park` command; a parked entry whose picture is gone, is now loaded, repeats, or has no reason |
| **A retirement is never a deletion** (`check-story-retired.mjs`) | every scene retired in every edition still has its record (the loader) and its pictures on disk; no story picture is deleted in git (gone from the working tree, or staged for deletion) without a `removed[]` note; `removed[]` is exact | the retired scene whose picture is gone; the deleted picture, with the restore command and the note to add; a note for a picture still on disk, or one a placed scene still loads |

Outside a git checkout the two picture gates say so once and check what they can: a picture counts as present when it is on disk, and only missing pictures are deletions.

## Declaring the story in the registry

The scene file is a `scenes` surface, so the names gate resolves its `characters`, `props`, `narrator`, `margin_author` and `dialogue[].speaker` and scans every string for a typed name; the edition files and the manifest are `token_sources`; the built output may show names and is listed under `coverage.ignore`:

```json
"surfaces": [
  { "type": "scenes", "file": "examples/story/scenes.json", "story": "main-story", "fields": ["characters", "props", "narrator", "margin_author", "dialogue[].speaker"] }
],
"token_sources": [
  { "file": "examples/story/editions/*.json", "why": "reading orders hold slugs only; a reason or note that names a character writes a token" },
  { "file": "examples/story/parked-art.json", "why": "the parked and removed lists hold file names and reasons; never a typed name" }
],
"coverage": { "ignore": ["examples/story/built/**"] }
```

Fields of the surface declaration itself: [REGISTRY-FIELDS.md](REGISTRY-FIELDS.md). A shot sheet that plans the pictures of these spreads uses the same slugs for its scenes: [CONTINUITY-CARD-AND-SHOT-SHEET-FIELDS.md](CONTINUITY-CARD-AND-SHOT-SHEET-FIELDS.md).
