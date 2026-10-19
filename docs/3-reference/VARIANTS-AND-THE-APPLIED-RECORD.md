---
title: Variant names and the applied record
doc_id: ref-variants-and-the-applied-record
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/VARIANTS-AND-THE-APPLIED-RECORD.md
status: active
last_reviewed: 2026-10-19
canonical: true
---

# Variant names and the applied record

A story folder may hold a **variants file** (`variants.json`, `scripts/variants.v1.schema.json`): named, composable edits to the story's text. `scripts/story-variants.mjs` renders an edition with a variant applied, shows the difference, and writes the winning variant back into the records (**apply**), leaving an **applied record** (`variants-applied.json`) and, for an added spread, a **slot** in the scene file. How to use them: [HOW-TO-TEST-A-CHANGE-BEFORE-YOU-MAKE-IT.md](../2-how-to/HOW-TO-TEST-A-CHANGE-BEFORE-YOU-MAKE-IT.md). Why: [ADR-007](../4-explanation/decisions/ADR-007-variants-round-trip-and-owners-words.md). The records themselves: [SCENE-AND-EDITION-FIELDS.md](SCENE-AND-EDITION-FIELDS.md). The example: `examples/story/variants.json`.

Keys starting with `_` are notes anywhere: never validated, never scanned. Every other string in the variants file is a token source: a written-out name fails the names gate with the token to write.

## The variants file

```json
{
  "variants": {
    "night-in-the-time-line": {
      "about": "every evening TIME line says night",
      "steps": [{ "replace": "Thursday, ", "with": "Thursday night, ", "in": "every spread" }]
    },
    "the-hallway": {
      "about": "a spread between the porch and the kitchen; a slot if it wins",
      "steps": [{ "add": "new-the-hallway", "after": "the-porch", "draft": { "title": "The hallway", "picture": "...", "time": "...", "paragraphs": ["..."], "dialogue": [{ "speaker": "{{chloe-jenkins}}", "text": "..." }] } }]
    }
  }
}
```

| Field | Required | Meaning |
|---|---|---|
| `variants` | yes | variants keyed by name: lower-case letters, digits and hyphens. `base` is reserved: the text as the records are |
| `<name>.about` | yes | one line: what the variant tests |
| `<name>.steps[]` | yes, at least one | the edits, in order, each one of the four shapes below |

**Composition.** On the command line, `a+b` applies the steps of `a`, then `b`, and the result is named `a+b` everywhere (the applied record, a parked picture's reason, a slot's origin). `base` alone, or `base+a`, is allowed.

## The four step shapes

Every phrase is resolved through the registry before it is used (`{{sam-hayes}}` becomes Sam), so a phrase matches the rendered text. Matching is exact: capital letters, punctuation and spaces count. A step must do what it says, or the render fails naming the variant, the step number and the fix; nothing renders in that case.

| Step | Shape | Does | Fails when |
|---|---|---|---|
| replace in one named spread | `{ "replace": "<phrase>", "with": "<phrase>", "in": "<slug>" }` | every occurrence of the phrase in that spread's text becomes the other phrase (an empty `with` takes the phrase out) | the slug is not a scene; the spread is read nowhere in the edition (retired, dropped by this variant, or not placed); the spread is a slot; the spread does not hold the phrase; `replace` and `with` are the same |
| replace in every spread | `"in": "every spread"` | the same, in every spread of the edition that holds the phrase | no spread holds it |
| replace in the one spread that holds it | `"in": "one spread"` | the same, in exactly one spread | no spread holds it; two or more do (named, with the fix: name the spread, or say every spread) |
| drop | `{ "drop": ["<slug>", ...] }` (or one slug as text) | the spreads are left out of the text and the rest renumber; on apply they move to `retired` in every edition and their pictures are parked | a slug is not a scene |
| banner | `{ "banner": "<one line>" }` | one line to the reader, printed as `BANNER:` under the title line, above the first spread; on apply it is written to the tested edition's `banner` field | the text is empty or more than one line |
| add | `{ "add": "new-<slug>", "after": "<slug>", "draft": { ... } }` (or `"before"`) | the draft is rendered as a spread right after (or before) its neighbour, with the edition's numbering; on apply it becomes a slot | the name does not start with `new-`; the story already has it; it is added twice; the neighbour is not a scene; the draft has no `title`, `picture` or `time`, says nothing (no paragraphs and no dialogue), carries `layout` or `art`, or holds an unknown token |

A draft carries `title`, `picture`, `time`, `paragraphs`, `dialogue`, and optionally `part`, `margin_note`, `margin_author`, `footnote`: the fields of a scene the reader meets, nothing else. In an edition where the neighbour is not read, the added spread is not placed (the diff says so); on apply the slot goes to that edition's `retired`.

Steps run in the order written: a replace after an add also touches the added spread's text, and the slot's `_draft` keeps the draft as it was tested.

## The commands

All run from the folder that holds `character-registry.json`, or with `--registry <path>`. `<variant>` is a name, `base`, or names joined with `+`.

| Command | Does | Writes |
|---|---|---|
| `node scripts/story-variants.mjs list <story-folder>` | every variant with its `about` and its steps, tokens as written | nothing |
| `node scripts/story-variants.mjs render <story-folder> <edition> <variant>` | the edition's text with the variant applied, to the screen; `base` is byte for byte the built text | nothing |
| `node scripts/story-variants.mjs diff <story-folder> <edition> <variant>` | the summary line (spreads, changed, dropped, added, banner), the banner, every changed spread with its lines out (`-`) and in (`+`) and its old number when it moved, every added spread's text, every dropped spread, every spread not placed | nothing |
| `node scripts/story-variants.mjs apply <story-folder> <edition> <variant> [--tested <file>] [--dry-run]` | the round trip below | the records, `built/`, `parked-art.json`, `variants-applied.json`; `--dry-run` writes nothing and prints the plan |
| `npm run variants -- <command> ...` | the same script | |

## What apply does, in order

1. **The parser check.** Every scene record is rendered and read back; a record that does not read back as written stops the run before anything is written. The built text reads back when a paragraph is one line, a dialogue speaker holds no `: `, a margin note without an author holds no ` — `, and no paragraph starts with `DIALOGUE:`, `MARGIN NOTE:` or `FOOTNOTE:`.
2. **The tested text.** The variant is rendered from the records now. With `--tested <file>`, the file must be byte for byte that text; otherwise the run stops with the first differing spread and line (the records or the variant changed since the test).
3. **Fields that differ.** Each spread of the tested text is parsed back into `part`, `title`, `picture`, `time`, `paragraphs`, `dialogue`, `margin_note`, `margin_author`, `footnote`. A field equal to the record's rendered field is left alone, token text and all; a paragraph or dialogue line that merely moved keeps its token text. A field that differs is written with names put back as tokens (the registry's names, forms and full names, longest first, never inside a token already there) and verified: resolving the tokens again, with the record's own fields as context, must give the tested words; a label two registry entries share stops the run (write the token by hand). A dialogue speaker must come back as exactly one token and a margin author must hold one, or the run stops: a speaker is a character of the story. A field the text no longer has is removed from the record. A spread whose text no longer reads back (a label line changed, a blank line lost) stops the run.
4. **Dropped spreads** move from `order` to `retired` in every edition; their pictures are parked with the reason `retired on <date> by variant <name>`.
5. **The banner** is written to the tested edition's `banner` field, as tokens, verified the same way.
6. **Added spreads become slots** (below), placed after or before their neighbour in every edition that reads the neighbour, retired in the others.
7. **The write and the gate.** The scene file and every edition whose content changed are written, `built/` is rebuilt for every edition, and the written records are rendered again: they must equal the tested text spread for spread, a slot being compared by its header line only. Then the names gate (`scripts/check.mjs`) runs on the project. If either fails, every file touched is put back as it was, created files included, and the run fails saying so.
8. **The record.** One entry is appended to `variants-applied.json`.

`--dry-run` runs steps 1 to 3 and prints the plan; nothing is written and step 7 is not run.

## A slot

A slug that starts with `new-` is a slot: a spread the story has a place for and no words in. The apply step writes it from an `add` step:

```json
"new-the-hallway": {
  "_slot": {
    "from_variant": "the-hallway+rest-the-workshop",
    "tested_in": "sam-first",
    "applied": "2026-10-19T13:02:11-04:00",
    "after": "the-porch",
    "positions": { "sam-first": 2, "theo-first": 3 }
  },
  "_draft": {
    "title": "The hallway",
    "picture": "A narrow hallway at night, {{sam-hayes}} with one shoe off ...",
    "time": "Thursday night, 11:54 PM",
    "paragraphs": ["In the hallway {{sam-hayes}} took her shoes off one-handed. ..."],
    "dialogue": [{ "speaker": "{{chloe-jenkins}}", "text": "Kitchen. Tea. Then the phone." }],
    "part": "Part one: six hours"
  }
}
```

| Rule | Where it is kept |
|---|---|
| a slot holds notes only (keys starting with `_`): the loader refuses a slot with `paragraphs` or `dialogue` ("a slot's words are the author's, but paragraphs is filled in"), and one with any other field ("it holds notes only"), with the fix in both cases; the scene schema refuses the fields too | `scripts/story.mjs`, `scripts/scene.v1.schema.json` |
| a slot is placed or retired in every edition like any scene; its spread number is its position | the loader |
| a slot renders as `SLOT: <slug>` and one fixed line; nothing of the draft is printed; `list` shows `(slot: not written yet; the words are the author's)` | the renderer |
| a slot has no pictures: the picture gates skip it | `check-story-art.mjs`, `check-story-retired.mjs` |
| a replace step cannot name a slot ("it has no words to change") | the variants renderer |
| the author claims a slot by renaming it to a slug without `new-` in the scene file and in every edition, and filling in the fields of a scene; the `_slot` and `_draft` notes may stay or go | the author |

`_slot.positions` is each edition's spread number at the time of the apply, or `retired`; it is a note, and later moves in an edition do not update it (the edition's `order` is the truth).

## The banner

An optional `banner` field on an edition (`scripts/edition.v1.schema.json`): one line to the reader, a token source, printed as the third header line of the built text, `BANNER: ...`, above the first spread. Written by hand or by an applied banner step; the built-output gate diffs it like everything else.

## The applied record

`<story-folder>/variants-applied.json`, written by the apply step, one entry per run under `applied`, newest last. Read it as the record of what the machine did to the words and what it left.

```json
{
  "applied": [
    {
      "variant": "the-hallway+rest-the-workshop",
      "about": ["a spread between the porch and the kitchen ...", "the reader meets {{theo-vance}} for the first time in the morning ..."],
      "edition": "sam-first",
      "applied": "2026-10-19T13:02:11-04:00",
      "changed": [],
      "retired": ["across-town"],
      "parked": ["main_across-town.png"],
      "left": [{ "slot": "new-the-hallway", "after": "the-porch", "positions": { "sam-first": 2, "theo-first": 3 }, "draft": { "...": "..." }, "why": "the words of a new spread are the author's: ..." }],
      "verified": "sam-first renders equal to the tested text: 5 spreads compared, 0 differences; 1 slot compared by position only (the words are the author's)"
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `variant` | the composed name, as typed |
| `about` | the `about` line of each variant in it |
| `edition` | the edition the text was tested and compared on |
| `applied` | when, with the machine's offset |
| `changed[]` | every field written, as `<slug>: <field>` (`paragraphs[1]`, `dialogue[0].text`, `footnote (removed)`, `2 paragraph(s) removed`) |
| `retired[]` | the slugs moved to `retired` in every edition |
| `parked[]` | the pictures parked by this run |
| `banner` | the edition whose banner was written, when one was |
| `left[]` | one entry per slot: `slot`, `after` or `before`, `positions`, the `draft` as tested (tokens), and `why` |
| `verified` | the round-trip check that passed, in words |
| `tested_file` | the `--tested` file, when one was given |

The file is a token source like the variants file (`variants*.json`), so the drafts it quotes hold tokens.

## Declaring it in the registry

```json
"token_sources": [
  { "file": "examples/story/variants*.json", "why": "a test edit names a character by token and is resolved before the text is searched; the applied record quotes drafts as tokens" }
]
```

The scene file is already a `scenes` surface and the editions token sources ([SCENE-AND-EDITION-FIELDS.md](SCENE-AND-EDITION-FIELDS.md)); a slot record adds nothing to scan.
