---
title: How to test a change to the words before you make it, and let the machine write the winner back
doc_id: how-to-test-a-change-before-you-make-it
triadic_leg: diataxis
diataxis_mode: solve
canonical_path: docs/2-how-to/HOW-TO-TEST-A-CHANGE-BEFORE-YOU-MAKE-IT.md
status: active
last_reviewed: 2026-10-19
canonical: true
---

# How to test a change to the words before you make it, and let the machine write the winner back

Outcome: you can try a change to your story's words on readers before it touches your files, and when a version wins, the machine writes exactly that version into your records, names as tokens, and proves it did. An AI can propose and test as much as it likes; it never writes a new spread into your story. A spread the tests say the story needs becomes a labelled empty place, with the draft kept beside it, until you write it. Field by field: [Variant names and the applied record](../3-reference/VARIANTS-AND-THE-APPLIED-RECORD.md). Why it is built this way: [ADR-007](../4-explanation/decisions/ADR-007-variants-round-trip-and-owners-words.md).

This page uses the repository's own example story, `examples/story`, so every command runs as written from the repository folder (the one with `scripts/` in it). It assumes you have read [how the story is kept as records and editions](HOW-TO-REORDER-AND-RETIRE-SPREADS.md): a story folder with `scenes.json`, `editions/`, `art/` and `built/`. The last section says how to set up your own.

Three words first. A **variant** is a named change to the story's text, kept in `variants.json` in the story folder: replace a phrase in one spread, or in every spread; leave a spread out; put one line to the reader above the first spread; add a spread from a draft. It is applied to the text a reader meets, never to your records, so the text a reader tested can always be made again from the variant's name. **base** is the text as the records are now. A **slot** is a spread the story has a place for and no words in yet; its name starts with `new-`.

## 1. See the variants, and read the text two ways

```bash
node scripts/story-variants.mjs list examples/story
```

```text
examples/story/variants.json: 6 variants. base is the text as the records are; join names with + to test them together (a+b).
night-in-the-time-line: every evening TIME line says night, so a reader who skims the time lines still knows when they are
  replace "Thursday, " with "Thursday night, " in every spread
shorter-porch: the porch opens with a shorter second sentence
  replace "It was the fourth time since the cab." with "The fourth time since the cab." in the-porch
a-bill-not-invoices: {{theo-vance}} reads the text the way he reads a bill, not invoices; one spread holds the phrase
  replace "the way he read invoices" with "the way he read a bill" in one spread
rest-the-workshop: the reader meets {{theo-vance}} for the first time in the morning, not in the workshop at night
  drop across-town
a-note-first: one line to the reader before the first spread
  banner "Read it in one sitting if you can: the whole ..."
the-hallway: a spread between the porch and the kitchen, where {{sam-hayes}} still has not looked up; a draft to test, and a slot if it wins
  add new-the-hallway after the-porch (draft: "The hallway")
```

Each variant is a few lines in `examples/story/variants.json`. The first one reads:

```json
"night-in-the-time-line": {
  "about": "every evening TIME line says night, so a reader who skims the time lines still knows when they are",
  "steps": [
    { "replace": "Thursday, ", "with": "Thursday night, ", "in": "every spread" }
  ]
}
```

Names in a variant are tokens, like everywhere else in this repository (`{{sam-hayes}}`, never Sam); the machine puts the name in before it looks for the phrase. `"in"` is a spread's slug, `"every spread"`, or `"one spread"`, which means exactly one spread must hold the phrase, and the variant fails if none or several do, so a phrase that moved does not change the wrong page by accident.

Now make the two texts you will compare. Both go to files in the repository folder; you delete them at the end.

```bash
node scripts/story-variants.mjs render examples/story sam-first base > base.txt
```

```bash
node scripts/story-variants.mjs render examples/story sam-first night-in-the-time-line+shorter-porch > night.txt
```

The `+` joins two variants: the steps of the first, then the second. `base.txt` is the same text as `examples/story/built/sam-first.txt`. `night.txt` is the story as a reader would meet it with both changes made, and nothing in `examples/story` has changed.

## 2. Measure it

The machine does not judge the words. It makes the two texts exactly, and it makes sure the words you ship are the words that were tested. The judging is yours, or your readers': give `base.txt` and `night.txt` to two people who have not read the story, or paste each into a browser chatbot in a fresh conversation with the same question after it (for instance: "You are reading this cold. After spread 2, do you know what night it is and how long she has waited? Answer in two sentences, then say which line told you."). Ask the same question of both texts, and write down which name won and why. Three readers are better than one; the same reader seeing both texts in one conversation is worse than none, because the second text is read with the first in mind.

If you want a tested text to stand as the record of what the readers saw, keep the file: the next step takes it and refuses to write anything else.

## 3. See exactly what would change

Before writing anything, read the difference the way the machine sees it:

```bash
node scripts/story-variants.mjs diff examples/story sam-first night-in-the-time-line+shorter-porch
```

```text
night-in-the-time-line+shorter-porch on sam-first: 5 spreads (base has 5); 3 changed, 0 dropped, 0 added, banner unchanged
spread 1 of 5: the-porch: 2 line(s) out, 2 in
  - TIME: Thursday, 11:50 PM
  + TIME: Thursday night, 11:50 PM
  - Chloe dug through her bag for her keys while Sam read the message again under the porch bulb. It was the fourth time since the cab.
  + Chloe dug through her bag for her keys while Sam read the message again under the porch bulb. The fourth time since the cab.
spread 2 of 5: read-at-1152: 1 line(s) out, 1 in
  - TIME: Thursday, 11:58 PM
  + TIME: Thursday night, 11:58 PM
spread 3 of 5: across-town: 1 line(s) out, 1 in
  - TIME: Thursday, 11:55 PM
  + TIME: Thursday night, 11:55 PM
```

Three spreads hold "Thursday, " and all three change; the morning spreads do not. If a step cannot do what it says (the phrase is in no spread, or in two when you said one, or the slug is misspelled), the command stops and names the variant, the step and the fix, and nothing renders.

## 4. Write the winner back

Say the readers chose `night.txt`. Give the apply step the variant's name and the tested file:

```bash
node scripts/story-variants.mjs apply examples/story sam-first night-in-the-time-line+shorter-porch --tested night.txt
```

```text
story-variants: the-porch: time: written as tokens
story-variants: the-porch: paragraphs[0]: written as tokens
story-variants: read-at-1152: time: written as tokens
story-variants: across-town: time: written as tokens
story-variants: wrote examples/story/scenes.json, examples/story/built/sam-first.txt, examples/story/built/theo-first.txt, examples/story/variants-applied.json
story-variants: verified: sam-first renders equal to the tested text: 5 spreads compared, 0 differences
story-variants: next: node scripts/story.mjs check examples/story, then commit the story folder
```

What happened, in order. The machine first checked that every record of the story reads back from its own built text (if a record could not, it would stop here and say which). It made the tested text again from the variant's name and compared it with `night.txt`; had they differed, because the records or the variant changed since the test, it would have stopped. Then it read each spread of the tested text back into its fields, found the four that differ from the records, put the names back as tokens and checked that the tokens render to the tested words again, wrote only those four fields, rebuilt `built/` for both editions, and read the written records back one more time: the gate is that they render equal to the tested text spread for spread. Last it ran the names gate on the result. Had any of that failed, every file would have been put back as it was.

The records changed by exactly those lines (`git diff examples/story/scenes.json` shows them):

```diff
-        "{{chloe-jenkins}} dug through her bag for her keys while {{sam-hayes}} read the message again under the porch bulb. It was the fourth time since the cab.",
+        "{{chloe-jenkins}} dug through her bag for her keys while {{sam-hayes}} read the message again under the porch bulb. The fourth time since the cab.",
```

```diff
-      "time": "Thursday, 11:50 PM",
+      "time": "Thursday night, 11:50 PM",
```

The names are tokens in the file, as they were; the paragraph that did not change is byte for byte what it was. `examples/story/variants-applied.json` now holds one entry: the variant, the edition, the four fields, the check that passed, and the name of the tested file. It is the record of what the machine did to your words and why. Run the story's checks and commit the folder:

```bash
node scripts/story.mjs check examples/story
```

```text
check-story-built: pass (2 edition(s) built from 6 scene(s), output equal to the source)
check-story-art: pass (7 picture(s) loaded by 5 placed scene(s), 2 parked with a reason, 9 in examples/story/art/)
check-story-retired: pass (1 scene(s) retired in every edition with their records and pictures kept, 0 picture(s) removed with a note, 0 deletion(s) in git)
story: pass (6 scenes, 2 editions: built output current, every picture accounted for, nothing deleted)
```

From now on `base` is the new text; the variant you applied is done and can be deleted from `variants.json`, or kept as a note of what was tried. `--tested` is optional: without it the apply step writes what the variant renders now, which is the right thing when you tested a moment ago from the same records.

## 5. A spread the tests want is a slot, not a page

Now the other kind of change. The `the-hallway` variant adds a spread between the porch and the kitchen from a draft, and `rest-the-workshop` leaves the night-time workshop out. Test them together:

```bash
node scripts/story-variants.mjs diff examples/story sam-first the-hallway+rest-the-workshop
```

```text
the-hallway+rest-the-workshop on sam-first: 5 spreads (base has 5); 0 changed, 1 dropped, 1 added, banner unchanged
spread 2 of 5: new-the-hallway (added after the-porch; a slot when applied)
  + PART: Part one: six hours
  + TITLE: The hallway
  + PICTURE: A narrow hallway at night, Sam with one shoe off and the phone still lit in her hand, Chloe ahead of her at the kitchen door.
  + TIME: Thursday, 11:54 PM
  + 
  + In the hallway Sam took her shoes off one-handed. The phone stayed in the other hand, and she did not look up from it.
  + 
  + DIALOGUE:
  +   Chloe: Kitchen. Tea. Then the phone.
dropped: across-town (was spread 3 of 5; retired in every edition when applied)
```

Readers see the hallway as a real spread, with its words, in its place. Say they prefer this version. Apply it:

```bash
node scripts/story-variants.mjs apply examples/story sam-first the-hallway+rest-the-workshop
```

```text
story-variants: across-town: retired in every edition
story-variants: main_across-town.png: parked (retired on 2026-10-19 by variant the-hallway+rest-the-workshop)
story-variants: new-the-hallway: a slot after the-porch (sam-first: spread 2; theo-first: spread 3); its words are the author's: the tested draft is the _draft note on its record, nothing is in its fields
story-variants: wrote examples/story/scenes.json, examples/story/editions/sam-first.json, examples/story/editions/theo-first.json, examples/story/parked-art.json, examples/story/built/sam-first.txt, examples/story/built/theo-first.txt, examples/story/variants-applied.json
story-variants: verified: sam-first renders equal to the tested text: 5 spreads compared, 0 differences; 1 slot compared by position only (the words are the author's)
story-variants: next: node scripts/story.mjs check examples/story, then commit the story folder; the slot waits for your words
```

The dropped spread was retired in both editions and its picture parked with the variant's name as the reason, exactly as if you had done it by hand. The added spread was not written. In its place the story now has a slot:

```bash
node scripts/story.mjs list examples/story
```

```text
Six Hours: 7 scene(s), 2 edition(s) (sam-first, theo-first), 2 retired in every edition.
slug                      sam-first  theo-first  title
the-porch                 1          2           The porch
read-at-1152              3          4           Read at 11:52
the-napkin-timeline       retired    retired     The napkin timeline
across-town               retired    retired     Across town
morning-at-the-workbench  4          1           Morning at the workbench
the-text-sent             5          5           The text, sent
new-the-hallway           2          3           (slot: not written yet; the words are the author's)
```

Its place is held in both editions (after the porch, wherever the porch is), and the built text says so where a reader would meet it:

```text
=== SPREAD 2 OF 5 ===
SLOT: new-the-hallway
This spread is not written yet: its words are the author's. The draft that was tested is a note on its record, and nothing of it is printed.
```

In `examples/story/scenes.json` the slot's record holds two notes and no fields: `_slot` (which variant made it, when, after which spread, and its position in each edition) and `_draft` (the draft as it was tested, names as tokens). The same draft is quoted under `left` in `variants-applied.json`, so your to-do list and the record agree.

**When you write it.** Open `scenes.json`, read the draft, and write the spread yourself, in your words, as a scene record: give it its real name (rename `new-the-hallway` to `the-hallway`, in `scenes.json` and in both editions' `order`), fill in `title`, `picture`, `time`, `layout`, `art`, `paragraphs` and `dialogue`, add its picture to `art/`, and delete the notes if you like. Then build and check as always. The `new-` prefix is what makes it a slot; renaming it is how you say the words are yours.

**If words are typed into a slot.** Say an AI, or you in a hurry, writes `paragraphs` into `new-the-hallway` without renaming it. Every story command refuses to load the story:

```text
examples/story/scenes.json: new-the-hallway is a slot (its slug starts with new-), and a slot's words are the author's, but paragraphs is filled in. Fix: if the words are yours, give the spread its real name: rename new-the-hallway to a slug without new- here and in every edition, and fill in title, picture, time, layout and art; if they are a draft, keep it under _draft and take paragraphs out
```

The same goes for a title or a picture sentence typed into a slot: a slot holds notes only.

## 6. What an AI may never write into your story

Three rules, and the machine keeps all three.

1. **A draft is test material.** An AI's words go into `variants.json`, where readers can meet them. They are not in your records, and the names gate reads the variants file like any other source, so even there a name is a token.
2. **A spread the tests want is a slot.** The apply step never turns a draft into a page. It records where the spread goes, keeps the draft as a note, and leaves the words to you. Nothing fills a slot but a renaming by the author, and a slot with words in it stops every command until it is renamed or emptied.
3. **A change to existing words is written only after it was tested, as tokens, with the record kept.** The apply step refuses a text it cannot read back into fields, a name it cannot put back as a token, a speaker who is no character of the story, and a tested file that is not what the variant renders now. After it writes, it reads the records back and proves they render as the tested text; if that or the names gate fails, every file is put back, and the appended entry in `variants-applied.json` is the trail of every run that went through.

## 7. Undo everything on this page

```bash
git checkout -- examples/story
```

Then delete `examples/story/variants-applied.json`, `base.txt` and `night.txt`, which git does not track.

## 8. Your own story

In your story folder (the `book/` from the records how-to), write `variants.json` with a `variants` map like the example's, one entry per change you want to test, names as tokens. Tell the names gate about it in `character-registry.json`, next to the story's other token sources:

```json
"token_sources": [
  { "file": "book/variants*.json", "why": "test edits name a character by token; the applied record quotes drafts as tokens" }
]
```

Then, from your `my-story` folder:

```bash
node ../scripts/story-variants.mjs list book
node ../scripts/story-variants.mjs render book first-edition base > base.txt
node ../scripts/story-variants.mjs render book first-edition <variant> > tested.txt
node ../scripts/story-variants.mjs diff book first-edition <variant>
node ../scripts/story-variants.mjs apply book first-edition <variant> --tested tested.txt
node ../scripts/story.mjs check book
```

`apply --dry-run` prints what would be written and writes nothing. Every command takes `--registry <path>` when the registry is not in the folder you run from.

## Where to go next

- Every step kind, every refusal, the slot record and the applied record field by field: [Variant names and the applied record](../3-reference/VARIANTS-AND-THE-APPLIED-RECORD.md).
- How the records, editions and the retired list work, and what parking a picture means: [How to retire a spread without losing it](HOW-TO-REORDER-AND-RETIRE-SPREADS.md).
- Why the round trip is built this way, and why a slot is a renaming away from a page: [ADR-007](../4-explanation/decisions/ADR-007-variants-round-trip-and-owners-words.md).
