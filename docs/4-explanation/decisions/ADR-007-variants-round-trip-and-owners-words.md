---
title: ADR-007 A change to the words is a named variant of the rendered text, written back by the machine that measured it; a new spread is a slot whose words are the author's
doc_id: adr-007-variants-round-trip-and-owners-words
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/decisions/ADR-007-variants-round-trip-and-owners-words.md
status: active
last_reviewed: 2026-10-19
canonical: true
---

# ADR-007: a change to the words is a named variant of the rendered text, written back by the machine that measured it; a new spread is a slot whose words are the author's

**Status:** accepted, 2026-10-19.
**Deciders:** the owner asked for the private story system's innovations to be captured as reusable, automated elements of this public framework in the order of its capture document; after records and editions (ADR-006) come the edit round trip and the owner's-words boundary. The agent designed the variant shapes, the parser, the apply step, the slot and the gates on the private system's proven pattern, with nothing of its story, names, art or paths copied.

## Context

With the story as records and editions, a change to the words is an edit to a record. That leaves two problems the private system met and solved. First, a change made in the records cannot be measured before it is made: a reader panel sees the built text, so an edit has to be written to be tested, and an edit written on a hunch is in canon before anyone read it. The private system tested 146 spreads' worth of edits on a simulated panel before writing them; what made that safe was that the edit had a name, the tested text was reproducible from the name, and the step that wrote the winner back proved that the records it wrote render as the text the panel saw. Second, an AI that proposes and tests edits will, sooner or later, propose a spread the story does not have, and the draft that tests best is the one most likely to be written into canon by the same loop. The private system drew the line as a mechanism, not a reminder: a spread the tests want becomes a named empty place with its position recorded and the draft quoted in a task for the author, and nothing is written into the story; three such slots were left that way on 2026-10-19.

## Decision

1. **A variant is a named, composable edit to the rendered text.** `scripts/variants.v1.schema.json`, `<story-folder>/variants.json`: a map of names to `about` and `steps`. Four step shapes, each with its refusal: replace a phrase in one named spread (the spread must hold it), in every spread (at least one must), or in the one spread that holds it (exactly one must); drop spreads; set a banner line; add a spread from a draft after or before a neighbour. Names compose with `+` and the composed name is what is recorded. The records are never touched by a render, so the text a test saw is reproducible from the name alone, and `base` is the text as the records are.
2. **Phrases are token sources.** A variant writes `{{sam-hayes}}`, resolved against the story before the phrase is looked for, so the names gate reads the variants file like any source and a rename in the registry reaches the tests too.
3. **Apply is a round trip with a gate at both ends.** Before writing: every record must read back from its own built text (the parser is checked against the whole story first), the tested file, when given, must be what the variant renders now, each tested spread must parse back into its fields, and each changed field must come back as tokens that resolve to the tested words again (a speaker as one token, a margin author holding one, no label two entries share). Only the fields that differ are written; a field or line that did not change keeps its token text byte for byte. After writing: `built/` is rebuilt, the written records are rendered again and must equal the tested text spread for spread, and the names gate must pass; otherwise every file touched is put back, created files included. The run is appended to `variants-applied.json`: what was changed, retired, parked and set, what was left, and the check that passed.
4. **Dropping is retiring.** A dropped spread moves to `retired` in every edition and its pictures are parked with the variant's name as the reason; ADR-006's rule that a retirement is never a deletion holds through the round trip.
5. **A new spread is a slot, and a slot is a renaming away from a page.** An added spread is tested as a real spread, and on apply it becomes a `new-*` record holding two notes, `_slot` (the variant, the time, the neighbour, the position in every edition) and `_draft` (the draft as it was tested, as tokens), and no field. The loader refuses a slot with `paragraphs` or `dialogue` ("a slot's words are the author's") or with any other field ("it holds notes only"), the scene schema refuses the same, a replace step cannot name a slot, and the equality gate compares a slot by position only, so the apply step can never write words into one. The author claims a slot by renaming it to a slug without `new-` and filling in a scene's fields: the words are theirs because they typed them under a name of their own.
6. **The banner has a home.** A line to the reader above the first spread is a reader-facing element the private system tested; it is an optional `banner` field on an edition, printed as the third header line, so a tested banner is written where it belongs and diffed like every other line.
7. **The measurement is not the machine's.** The script makes the two texts exactly and proves the words shipped are the words tested; which text wins is the author's or their readers' call. The how-to says how to ask readers (or a browser chatbot, cold, the same question of each text) and why one reader seeing both texts is worse than none. A simulated reader panel is the capture's next element and is not built here.

## Consequences

- A layperson's loop is four commands: render two texts, measure them outside the machine, diff, apply with the tested file. Every refusal names the variant, the step and the fix.
- An AI working on the story has a place for its prose (the variants file) and no path from there into a page except through a human renaming a slot. The boundary is enforced by the loader every time the story is loaded, not by instruction.
- The format of the built text is now a contract both ways: a record whose text would not read back (a paragraph with a line break, a margin note holding ` — ` with no author) stops the apply step with the field named, before anything is written. Rendering and the three story gates are unaffected.
- `examples/story/variants.json` holds six variants on the repository's own cast, one of each kind, and the tests apply them to a copy of the example and compare the written records with the tested text: zero differences, every gate green.

## Left out on purpose

- The simulated reader panel and the price-perception test (elements 5 and 6 of the capture): the measurement itself. This ADR ships the texts and the proof, not the judge.
- A variant that edits structured fields (`characters`, `props`, `art`, `layout`) directly: a variant is a change to what a reader meets; structure is edited in the records, where the loader checks it.
- Per-edition variants: a variant is story-level and is tested on one edition; `--tested` binds the apply to that edition's text, and the other editions are rebuilt from the same records. A banner is the exception and is written to the tested edition only.
- Writing a slot's `title`, `picture` or `time` from the draft as a convenience: every field of a spread is the author's, and a slot with a title is half a page nobody wrote.
- Claiming a slot by command: the renaming is deliberately a hand edit, so the act of ownership is the author's and leaves a diff in their name.
