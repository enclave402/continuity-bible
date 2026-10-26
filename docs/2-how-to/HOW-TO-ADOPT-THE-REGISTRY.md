---
title: How to adopt the registry in your repo
doc_id: how-to-adopt-the-registry
triadic_leg: diataxis
diataxis_mode: solve
canonical_path: docs/2-how-to/HOW-TO-ADOPT-THE-REGISTRY.md
status: active
last_reviewed: 2026-10-18
canonical: true
---

# How to adopt the registry in your repo

Outcome: every name in your project is written once, every source holds tokens, and the gate can never be silent about a file. Field meanings: [REGISTRY-FIELDS.md](../3-reference/REGISTRY-FIELDS.md). The failure classes this guards against: [CONTINUITY-ISSUE-CLASSES.md](../3-reference/CONTINUITY-ISSUE-CLASSES.md).

## 1. Copy the engine

Copy `scripts/names.mjs`, `scripts/lib.mjs`, `scripts/check.mjs`, `scripts/tokenize.mjs`, `scripts/render.mjs`, `scripts/anchor.mjs`, `scripts/tag.mjs`, `scripts/new-character.mjs` and `scripts/character-registry.v1.schema.json` into your repo (one folder, any name; the scripts find each other relatively). Node 18+, no packages.

## 2. Write the registry

Create `character-registry.json` at your project root (or point `--registry` / `CHARACTER_REGISTRY` at it). One entry per person, companion, voice, group or prop. Write each name once: `name`, `full_name`, `forms`. Put every other spelling a file already uses under `aliases`; put spellings that must never return under `retired`. To add one person at a time without typing JSON, `node scripts/new-character.mjs` asks for the name, full name, id, role, look and fixed traits, checks them against the schema, and adds the entry, leaving every other line of the file as it was.

```bash
node scripts/check.mjs --suggest   # prints a stub entry for every label it cannot resolve
```

## 3. Declare the files

| You have | Declare | The gate then |
|---|---|---|
| Scene data (`{ scenes: { slug: {...} } }`) | `surfaces[] { type: "scenes" }` | resolves cast, props and speakers; scans prose for retired names, wrong-story names, species mix-ups |
| Story-scoped data keyed by story (an art manifest, pack data) | `surfaces[] { type: "prose", root, story_field, stories }` | renders each entry for its story, then scans it |
| A document with one heading per character | `surfaces[] { type: "headings" }` | resolves each heading label |
| JSON with name fields at known paths | `surfaces[] { type: "names", paths }` | resolves each value |
| Pages, partials, templates, manifests, run notes a builder reads | `token_sources[] { file: "<glob>" }` | fails any written-out name or variant, naming the token, and any token with an unknown id or form or a lookalike (`{{June-okafor}}`); add `other_placeholders: true` for a file whose other `{{...}}` belong to another template tool |
| Dated history (logs, transcripts, decision records, past prompt records) | `records: ["<glob>"]` | leaves it alone |
| Documentation that shows names on purpose (a README's examples, tests) | `coverage.ignore: ["<glob>"]` | leaves it alone |

Every tracked text file must land in one of those rows. A file in none of them that names a character is reported as `gap: <file>:<line>: names "<label>" but is no surface, token source or record`. Set `coverage.strict: true` to make that a failure once the backlog is clear.

## 4. Migrate sources to tokens

```bash
node scripts/tokenize.mjs <file.json> [--story <id>] [--skip k,k] [--label-fields k,k] [--dry-run]
node scripts/tokenize.mjs <page.html> --text [--story <id>]
```

Rebuild, then compare the built output's hash before and after: a migration is correct only when the build is byte-identical. A script that copies free text into a source file calls `tokenizeText(text, storyId)` from `tokenize.mjs`, so a source never regains a name.

## 5. Render built output

Anything a person or a model reads that a builder does not already render:

```bash
node scripts/render.mjs <token-source> --out <built-file> [--story <id>]
```

Source holds tokens; built output holds names and is never edited by hand. An unknown token exits 1 instead of printing.

## 6. Reference objects by id, never by substring

A prop or companion is an entry (`kind: "prop"` or `"companion"`) with its look written once (`prompt_tokens`, `negative_tokens`). A scene lists it under `props: ["<id>"]`; a prompt compiler reads the entry. Nothing matches a prop's name inside prose: a renamed prop or a paraphrase would silently stop matching.

## 7. Compile attributes that depend on a dimension

When an attribute varies by a scene field (life stage, story day, season), declare a contextual form on the entry and let the unit's own field pick it:

```json
"forms": { "attitude": { "by": "stage", "values": { "childhood": "clutched like a toy", "adult": "kept in a drawer", "default": "on the side table" } } }
```

A scene with `"stage": "adult"` renders `{{brass-key:attitude}}` as "kept in a drawer". No matching value and no `default` fails the build with the field named. "The prompt writer picks the mode" is not a rule; this is.

## 8. Keep a field in one place

If a builder needs a scene's description, it reads the scene. Forbid the copy where it would go stale:

```json
{ "type": "prose", "file": "examples/art.json", "forbid_keys": [{ "key": "visualDescription", "owner": "examples/scenes.json" }] }
```

## 9. Keep labels and text from contradicting

Declare the vocabularies a label implies; the gate fails a scene whose text borrows another value's words:

```json
"exclusive_markers": [{ "field": "time_of_day", "values": { "morning": ["morning", "sunrise", "dawn"], "evening": ["evening", "dusk", "lamplight"] } }]
```

Add `"required": true` when every scene must carry the field.

## 10. Gate it

```bash
node scripts/check.mjs            # exit 1 on any failure; gaps print and pass
```

Run it in pre-commit and before every push. A rename is one registry edit, a rebuild and the check. Never `sed`, never a multi-file replace.
