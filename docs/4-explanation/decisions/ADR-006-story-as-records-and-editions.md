---
title: ADR-006 The story is records and editions, and a retirement is never a deletion
doc_id: adr-006-story-as-records-and-editions
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/decisions/ADR-006-story-as-records-and-editions.md
status: active
last_reviewed: 2026-10-19
canonical: true
---

# ADR-006: the story is one record per scene and one list per reading order; built pages are output; a retirement keeps the record and the picture

**Status:** accepted, 2026-10-19.
**Deciders:** the owner asked for the private story system's innovations to be captured as reusable, automated elements of this public framework, naming this pair first: scenes as records with editions and a retired list, and parked art that is never deleted; the agent designed the schemas, the loader, the renderer and the gates on the private system's proven shape, with nothing of its story, names, art or paths copied.

## Context

The registry keeps who a character is, and the continuity cards and shot sheet keep what each picture shows from one shot to the next. Nothing yet kept the story itself straight: which spreads exist, in what order a reader meets them, and what happens to a spread and its pictures when the author takes it out. A story kept as pages has three failure modes, all seen in the private system before it was rebuilt this way: a spread numbered by hand that has to be renumbered when one moves, so nobody moves one; a second telling (the same story opened on another character) kept as a copy, so an edit lands in one copy and not the other; and a cut that becomes a deletion, so a spread the author may want back, and the picture that cost a render to make, are gone. The private system once lost twelve spreads and their art to a count typed into a script. Its answer, which this ADR generalises, was: records with no numbers, orders as separate manifests, a retired list, every built page rebuilt from the records, and a gate that refuses a silent deletion.

## Decision

1. **A scene is a record with no number.** `scripts/scene.v1.schema.json`: one file, `scenes` keyed by slug, each with its title, part, narrator, cast, props, paragraphs, dialogue, margin note and author, footnote, the picture sentence, the time, a layout and the picture file names. The slug is the scene's identity everywhere; a number is never stored.
2. **A reading order is a list, and there can be several.** `scripts/edition.v1.schema.json`: `editions/<id>.json` with `order[]` and `retired[]`. The loader (`scripts/story.mjs`) derives every spread number from position and refuses a slug the story lacks, a slug listed twice, a slug both placed and retired, and a scene in neither list, so a scene can only be read or retired, never forgotten.
3. **Retired is a state, not a deletion.** A retired scene keeps its record and its pictures. The retired list is per edition, so a scene can be read in one telling and rested in another; "retired in every edition" is the only state in which its pictures load nothing.
4. **Built output is rendered, diffed and never edited.** The renderer prints each spread the way a reader meets it (title, the picture sentence, the time, paragraphs, dialogue, margin note, footnote), names resolved. `built/<id>.txt` is committed so a change to the records shows as a diff, and gate 1 (`check-story-built.mjs`) fails a built file that differs from what the records render now.
5. **Every picture is accounted for.** Gate 2 (`check-story-art.mjs`): a picture a placed scene lists must exist (and be tracked in a git checkout); a picture nothing loads must be in `parked-art.json` with a reason; the parked list is exact. Parking is an explicit command (`--park --reason`), and picture files are named after their scene (`art_prefix` + slug), so a parked picture can always be traced to its spread.
6. **A deletion needs the owner's note.** Gate 3 (`check-story-retired.mjs`): a retired scene's picture that is gone fails; a story picture deleted in git fails; the only thing that lifts either is an entry under `removed[]` with a note saying who decided, when and why. The private system asks the owner at the terminal; a public tool cannot assume a terminal or an owner, so the note in the manifest is the approval, and it stays as the record.
7. **The story is a surface of the names gate.** The scene file is declared as a `scenes` surface, the edition files and the manifest as `token_sources`, built output under `coverage.ignore`. An edition's title is a token source too (`{{sam-hayes}} first`), because a reader meets the name in the built text.
8. **The layout is data, and the picture sentence is a field.** `layouts` declares how many pictures each page shape carries and the loader checks the count; `picture` is one sentence of what the picture shows, printed in the built text so a reader of the text alone knows what is on the page, and so a test or a reader can report a contradiction between the words and the picture.

## Consequences

- Moving a spread, opening the book on another character, or resting a spread is an edit to a list, and every built page follows. No copy of the story exists.
- A layperson's path is four commands: edit a list, build, park, check. The gates print the fix with each failure.
- The pictures gate and the deletion gate reach into git only when the story is in a git checkout; elsewhere they say so and check the disk.
- The story example (`examples/story/`) uses the repository's own three characters and two props, with placeholder pictures; it is the fixture of the tests and the subject of the how-to.

## Left out on purpose

- The private system's per-scene teaching fields, lens stamps and clinical footnote structure: specific to one product; the public record has `footnote` and nothing that assumes a curriculum.
- The export, variant and apply round trip (a measured edit written back by the machine that measured it) and the owner's-words boundary: the next extraction, on top of this record format.
- A reason per retirement inside the edition file: the edition keeps slugs only, with a `_about_retired` note if wanted; the reason that matters to the gates is the picture's, in `parked-art.json`.
- Transition reasons at the seam a retirement opens (two spreads that become neighbours across a change of place or dress): that belongs to the shot sheet, which already requires a reason for every change; a loader that writes that line itself is future work.

## Open loops

- A story told in editions whose shot sheet plans the pictures: the sheet's scenes use the same slugs, but nothing yet checks that every placed scene has shots, or that a retired scene's shots are marked so.
- The how-to was replayed from its own code blocks on a Mac only.
