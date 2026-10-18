---
title: Registry fields
doc_id: ref-registry-fields
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/REGISTRY-FIELDS.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# Registry fields

`character-registry.json`, validated by `scripts/character-registry.v1.schema.json` and checked by `scripts/check.mjs`. The schema is the contract; this page says what the gate does with each field.

## Top level

| Field | Type | The gate |
|---|---|---|
| `registry_version` | integer | required, 1 |
| `surfaces[]` | list | files whose labels must resolve: see below |
| `token_sources[]` | `{ file, skip_keys?, why? }` | a written-out registry label in the file fails, naming the token; a glob that matches no tracked file fails |
| `records[]` | globs | dated history: not scanned at all |
| `coverage` | `{ ignore[], strict? }` | a tracked text file that is no surface, token source, record or ignored path and names a character is a gap (`strict`: a failure) |
| `species` | `{ name: [words] }` | a story's text may name only species of companions allowed in it; a companion called by another species' word fails |
| `known[]` | `{ file, text, owner, task, date, why? }` | a matching failure prints as a gap while listed; a listed problem that no longer occurs asks to be removed |
| `visual_continuity`, `skip_stories` | path, map | a sibling continuity manifest whose stories' scene and card files become surfaces |
| `drift_resolution` | object | defaults for `scripts/anchor.mjs`: `prefer` (`fewest-redraws`, `first-look`, `last-look`, `most-common`) or its developer spelling `policy` (`consensus`, `origin`, `terminal`, `mode`, `canon`), `metric`, `pass_threshold`, `prune_outliers_z`, `max_regeneration_budget`, `embeddings` |

## Surfaces

Common: `file`, `type`, `story`, `split[]` (extra label separators), `skip_keys[]`.

| Type | Fields | The gate |
|---|---|---|
| `scenes` | `root` (default `scenes`), `filter`, `fields[]` (default `characters`, `props`, `speaker`, `marginAuthor`, `dialogue[].speaker`), `prose` | each label field value resolves to exactly one entry allowed in the story; prose is scanned |
| `prose` | `root`, `story_field`, `stories{}` | each entry is rendered for its story and scanned |
| `names` | `paths[]` | each string at the paths resolves |
| `headings` | `pattern`, `within`, `ignore[]` | each heading label resolves |
| any of `scenes`, `prose` | `forbid_keys[] { key, owner, why? }` | an entry holding the key fails: the field lives once, in `owner` |
| `scenes` | `exclusive_markers[] { field, values{ value: [words] }, fields[]?, required?, why? }` | a scene whose text uses a word of another value than its own fails; a scene without the field is skipped, or fails with `required` |

## Entries (`characters.<id>`)

Ids: lower-case letters, digits, hyphens.

| Field | The gate |
|---|---|
| `name` | the one canonical form; a label two entries share fails |
| `kind` | `person`, `companion` (needs `species`), `voice`, `group` (needs `members`), `prop` (listed by id in `props`, never matched in prose) |
| `story`, `also_in[]` | where the entry may be named; `"*"` everywhere |
| `role` | one line |
| `full_name`, `forms{}` | the written forms: `{{id:full}}`, `{{id:<form>}}`. A form is a string, or a contextual form `{ by, values }` picked by the resolved unit's field; every variant is a label the gate protects |
| `aliases[]` | other exact labels a surface uses |
| `retired[]` | forms that may never return; found in any live file outside `records` unless a live name of the same entry is beside it |
| `prompt_tokens`, `negative_tokens[]` | a prop's or companion's look, written once for prompt compilers |
| `canon_tags{}` | fixed traits: what must never change, as image-readable tags written by the owner; the default answer to the first drift question, so only images carrying every one are eligible to be the anchor and the rest are always on the redraw list (`--keep` overrides for one run) |
| `continuity_ids[]`, `sources[]`, `first_appearance`, `born`, `ages{}`, `members[]`, `questions[]`, `prose_only`, `generic`, `notes` | cross-references the gate checks exist and agree |
| `anchor` | `{ image, sha256?, policy, prefer?, keep?, metric?, order?, chosen_at, embeddings?, stats?, why? }`: the visual anchor chosen after drift; `prefer` is the plain-named second answer, `keep` the fixed traits the choice was made within, `stats.kept` and `stats.excluded` how many images did and did not carry them; `stats.bill_basis` says whether the regeneration bill was by `cosine`, by `tags` (hand tags, no embeddings; `stats.tag_mismatches` is the count) or `none`; a missing image file is a gap |
| `drift_resolution` | per-entry override of the top-level defaults |

## Tokens

`{{id}}`, `{{id:first}}`, `{{id:short}}`, `{{id:full}}`, `{{id:initial}}`, `{{id:<form>}}`. Resolved by `scripts/names.mjs`; an unknown token or an unresolvable contextual form throws. `resolveDeep` gives each object's strings that object's own scalar fields as context (nested objects inherit and override).

## Exit codes

`check.mjs`: 0 with `character registry: pass (...)`; 1 with one line per failure and the fix. Gaps print on stdout and do not fail. `render.mjs`, `tokenize.mjs`, `anchor.mjs`: 0 on success, 1 on a named problem, 2 on usage.
