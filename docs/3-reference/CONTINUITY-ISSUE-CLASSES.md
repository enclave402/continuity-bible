---
title: Continuity issue classes
doc_id: ref-continuity-issue-classes
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/CONTINUITY-ISSUE-CLASSES.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# Continuity issue classes

Eight ways a character-and-continuity system goes silent, found in production use of this registry on 2026-10-17 and generalised here so any project can check itself. Each class names the symptom, why it happens, the mechanism in this repository that answers it, and how to adopt it. The mechanisms are declared in the registry; none hardcodes a project's data. Decision record: [ADR-003](../4-explanation/decisions/ADR-003-continuity-gate-extensions.md).

| # | Class | Mechanism |
|---|---|---|
| 1 | Prose data the gate never reads | `token_sources` globs + `scripts/render.mjs` + coverage report |
| 2 | One field living in two files | `surfaces[].forbid_keys` |
| 3 | An object found by substring, not by id | `kind: "prop"`, `props: [id]`, `prompt_tokens` on the entry |
| 4 | An attribute left to "the prompt writer picks" | contextual `forms` picked by the unit's field |
| 5 | Records of different kinds forced through one template | a `kind` discriminator per record; one template per kind |
| 6 | A label that contradicts its own text | `surfaces[].exclusive_markers` |
| 7 | A gate that covers one file of a family | `coverage` (unclassified files are reported) |
| 8 | Dated output failing after a rename | `records` + rendering, by design |

## 1. Prose data the gate never reads

**Symptom.** Run notes, session notes, runbooks or export manifests carry written-out names. A rename leaves them stale and nothing says so.

**Why.** They were never declared, and the script that writes them copies notes straight into built files.

**Mechanism.** List them under `token_sources` (globs allowed) so a written-out name fails with the token to write; render them to built output with `node scripts/render.mjs <src> --out <dest>` (or `loadNames(root).resolveTokens` inside the generator); built output may hold names, the source holds tokens. The coverage report (class 7) catches the next file like this before anyone declares it.

## 2. One field living in two files

**Symptom.** A scene's description exists in the scene registry and again in the art manifest. An edit lands in one; the other describes the old image.

**Why.** The second copy was convenient for a builder that could have read the first.

**Mechanism.** The builder reads the owner; the registry forbids the copy: `forbid_keys: [{ "key": "visualDescription", "owner": "examples/scenes.json" }]` on the manifest's surface. The gate fails any entry that still carries it.

## 3. An object found by substring, not by id

**Symptom.** A prompt compiler prints a prop's look only when the prop's name string occurs in the scene text. The text says "the four things"; the prop is named "the four earned tools"; the line never fires, and after a restage the prop's tokens are wrong with no error.

**Why.** Matching prose is a guess. Ids are a contract.

**Mechanism.** The prop is a registry entry (`kind: "prop"`, `prompt_tokens`, `negative_tokens`); the scene lists it under `props: ["<id>"]` exactly as it lists its cast; the gate resolves each id; the compiler prints what the entry says. Nothing matches names in prose.

## 4. An attribute left to "the prompt writer picks"

**Symptom.** A prop or companion has a different attitude, look or state by life stage or story day, written on its card as prose with the note that the writer chooses. It is never compiled; every prompt gets the default.

**Why.** The selecting dimension existed on the scene, but no rule mapped it to the variant.

**Mechanism.** A contextual form: `forms.attitude = { "by": "stage", "values": { "childhood": "...", "adult": "...", "default": "..." } }`. The scene's own `stage` picks the text when `{{brass-key:attitude}}` is resolved; no match and no default fails the build naming the field. If the dimension lives one level up (a story day's stage), the builder copies that one scalar onto the scene before resolving, and the gate's exclusive markers (class 6) keep the copy honest.

## 5. Records of different kinds forced through one template

**Symptom.** A fixes file holds face edits by tool; a full restage of a master has no template, so its record is hand-written once and nothing checks it.

**Why.** The record schema had no discriminator, so the template had no branch.

**Mechanism.** Give each record a `kind` from a declared list (`face`, `restage`, ...); the template branches on it; the gate validates the enum and that each kind's required fields are present. In this repository the registry's `known` and `anchor` records show the shape: a typed object with required keys, validated by schema, never free prose. A restage record takes the scene's description (read from its owner, class 2) and the compiled continuity block, so it is generated like every other record.

## 6. A label that contradicts its own text

**Symptom.** A story day is labelled "an evening at home" while its scene's description says morning daylight. Both were edited by hand, by different people, and no gate compares them.

**Why.** The label implies a vocabulary nobody declared.

**Mechanism.** `exclusive_markers` on the scenes surface: `{ "field": "time_of_day", "values": { "morning": [...], "evening": [...] } }`. A scene whose text uses a word of another value fails: `says "sunrise" (time_of_day morning) but time_of_day is "evening"`. The words are the project's own; the engine ships none.

## 7. A gate that covers one file of a family

**Symptom.** The "program data" rule checks the fixes file; the masters file and the sessions file are the same kind of data and are never read.

**Why.** Files were enumerated one at a time.

**Mechanism.** Declare families as globs (`token_sources`, `records`, `coverage.ignore`), and let the coverage report list every tracked text file that is still unclassified and names a character. Set `coverage.strict: true` to fail on them. The question "does the gate read file X?" always has an answer in the output.

## 8. Dated output failing after a rename

**Symptom.** Prompt records already sent to a studio hold written-out names; after a rename, the check fails every unrendered record until it is rewritten from its template.

**Why.** This is the design: a record is dated output, and a renamed character must not be sent under the old name.

**Mechanism.** Records that are history go under `records` and are never rewritten. Records that are still to be sent are regenerated from their token source with `render.mjs`. Nobody edits a built file by hand, and nobody "fixes" the gate to accept the old name.
