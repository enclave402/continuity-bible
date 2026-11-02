---
title: Registry fields
doc_id: ref-registry-fields
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/REGISTRY-FIELDS.md
status: active
last_reviewed: 2026-10-21
canonical: true
---

# Registry fields

`character-registry.json`, validated by `scripts/character-registry.v1.schema.json` and checked by `scripts/check.mjs`. The schema is the contract; this page says what the gate does with each field.

## Top level

| Field | Type | The gate |
|---|---|---|
| `registry_version` | integer | required, 1 |
| `invariants[]` | `{ pattern, name?, why, surfaces?[] }` | negative story invariants gate: scans all story scenes, prose, and tokens for forbidden phrases or impossible assertions (e.g. deceased characters meeting someone after death); stops the build and points directly to the line and why. Checked by `scripts/check-story-invariants.mjs` |
| `surfaces[]` | list | files whose labels must resolve: see below |
| `token_sources[]` | `{ file, skip_keys?, other_placeholders?, why? }` | a written-out registry label in the file fails, naming the token; so does a token whose id is not in the registry (with the closest id suggested), a form the entry does not have, and a lookalike such as `{{June-okafor}}` or `{{ june-okafor }}`; `other_placeholders: true` exempts a file that also feeds another template tool from the token checks (typed names are still checked); a glob that matches no tracked file fails. `render.mjs` runs the same checks on a token source before it writes anything |
| `records[]` | globs | dated history: not scanned at all |
| `coverage` | `{ ignore[], strict? }` | a tracked text file that is no surface, token source, record or ignored path and names a character is a gap (`strict`: a failure) |
| `species` | `{ name: [words] }` | a story's text may name only species of companions allowed in it; a companion called by another species' word fails |
| `known[]` | `{ file, text, owner, task, date, why? }` | a matching failure prints as a gap while listed; a listed problem that no longer occurs asks to be removed |
| `visual_continuity`, `skip_stories` | path, map | a sibling continuity manifest whose stories' scene and card files become surfaces |
| `render_surfaces` | `{ id: { name, style_lock?, must_keep?, exclude?, size? or aspect?, no_text?, hands_rule?, why?, continuity? } }` | where a picture will be used, each place's look rules written once in the author's words; a shot-sheet shot names one (`surface`), required once any is declared, an unknown one fails; `scripts/compile-shot.mjs` appends KEEP and AVOID from it; a template, token source or structured surface that retypes a phrase of two or more words verbatim fails with the file, the phrase and "read it from the surface". Fields: [CONTINUITY-CARD-AND-SHOT-SHEET-FIELDS.md](CONTINUITY-CARD-AND-SHOT-SHEET-FIELDS.md) |
| `render_templates` | globs | the templates, builders and scripts that assemble prompts; scanned for retyped surface phrases; a glob matching no tracked file fails |
| `drift_resolution` | object | defaults for `scripts/anchor.mjs`: `prefer` (`fewest-redraws`, `first-look`, `last-look`, `most-common`) or its developer spelling `policy` (`consensus`, `origin`, `terminal`, `mode`, `canon`), `metric`, `pass_threshold`, `prune_outliers_z`, `max_regeneration_budget`, `embeddings`; `unreadable` (words that mean the person could not tell; default `unknown`); `replacements` (a JSON-lines record of pictures replaced, shown by `scripts/sheet.mjs`) |

## Surfaces

Common: `file`, `type`, `story`, `split[]` (extra label separators), `skip_keys[]`.

| Type | Fields | The gate |
|---|---|---|
| `scenes` | `root` (default `scenes`), `filter`, `fields[]` (default `characters`, `props`, `speaker`, `marginAuthor`, `dialogue[].speaker`), `prose` | each label field value resolves to exactly one entry allowed in the story; prose is scanned |
| `prose` | `root`, `story_field`, `stories{}` | each entry is rendered for its story and scanned |
| `names` | `paths[]` | each string at the paths resolves |
| `headings` | `pattern`, `within`, `ignore[]` | each heading label resolves |
| any of `scenes`, `prose` | `forbid_keys[] { key, owner, why? }` | an entry holding the key fails: the field lives once, in `owner` |
| `scenes`, `shot-sheet` | `exclusive_markers[] { field, values{ value: [words] }, fields[]?, required?, why? }` | a scene whose text uses a word of another value than its own fails; a scene without the field is skipped, or fails with `required`; on a shot sheet the other values' words become the compiled block's AVOID line |
| `continuity-cards` | `required[]` (default `wardrobe`) | how each character starts each story day (`scripts/continuity-cards.v1.schema.json`); every card fills the required fields, every day is a key of `story_days`, `carries` lists prop ids; one per story. Fields: [CONTINUITY-CARD-AND-SHOT-SHEET-FIELDS.md](CONTINUITY-CARD-AND-SHOT-SHEET-FIELDS.md) |
| `shot-sheet` | `required[]` (default `story_day`, `location`, `time_of_day`), `lead` (default `look`) | scenes and shots in reading order (`scripts/shot-sheet.v1.schema.json`); state carries from the cards shot by shot; every change needs a reason; a character holds only what they carry; the header agrees with the story's scene file; compiled by `scripts/compile-shot.mjs`; one per story, paired with the story's `continuity-cards` surface |

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
| `turnaround` | `{ front, back, profile_left?, profile_right?, sheet?, notes? }`: multi-angle reference comps and [model sheet](../4-explanation/concepts/CHARACTER-CARD.md) ensuring 360-degree character and wardrobe continuity across scene camera angles. Paths are relative to the registry. `scripts/sheet.mjs --character <id>` shows them, with the notes, above the picture cards |
| `facial_dna` | `{ bone_structure?, skin_phenotype?, eyes_and_brows?, nose_and_mouth?, rooted_hair?, negative_drift_tokens[]? }`: the fixed face of a person, written once for prompt compilers; the one-line form is `forms.face` (`{{id:face}}`) |
| `pronouns` | `{ subject, object, possessive, possessive_pronoun?, reflexive?, source }` copied from canon, with `source` the file that states them (it must exist), or the word `unknown`, which is a gap. Never inferred from a picture or a name |
| `model_sheet` | `{ anchors, face, skin, hair, body, signature_items, never, sources, todo? }`: what a judge model must see, or must never see, in every picture of this character. Each fact field is a list of one-line visible facts, or the word `unknown`. A missing field fails; a line with a mood word from `scripts/model-sheet.config.json` (`confident`, `vulnerable`), a written-out name (write `{{id}}`) or over `max_chars` fails; a `sources` file that does not exist fails; an unknown field without a `todo` line fails and is listed as a gap; an anchor that is not on disk is a gap. An entry with a sheet must also carry `pronouns`. `modelSheetStatus(entry)` in `scripts/lib.mjs` says whether a sheet is complete, for a repo that tracks the rest as a shrinking list |
| `drift_resolution` | per-entry override of the top-level defaults |

## Tokens

`{{id}}`, `{{id:first}}`, `{{id:short}}`, `{{id:full}}`, `{{id:initial}}`, `{{id:<form>}}`. Resolved by `scripts/names.mjs`; an unknown token or an unresolvable contextual form throws. `resolveDeep` gives each object's strings that object's own scalar fields as context (nested objects inherit and override).

## Exit codes

`check.mjs`: 0 with `character registry: pass (...)`; 1 with one line per failure and the fix. Gaps print on stdout and do not fail. `render.mjs`, `tokenize.mjs`, `anchor.mjs`, `compile-shot.mjs`: 0 on success, 1 on a named problem, 2 on usage. `compile-shot.mjs` runs the whole gate first and compiles nothing when it fails.
