---
title: How to work from a browser chatbot
doc_id: how-to-work-from-a-browser-chatbot
triadic_leg: diataxis
diataxis_mode: solve
canonical_path: docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# How to work from a browser chatbot

Outcome: you make every picture for a story by pasting into a chatbot tab, and the characters still hold, because the words you paste come from one registry and the reference picture is chosen by a stated rule, not by whichever picture you happened to like last. No API, no node graph, no model on your computer. First time? Do the [tutorial](../1-tutorials/START-HERE.md) once; this page is the reference for the loop afterwards.

## The loop

1. Characters live in `character-registry.json`: id, name, `forms.look`, `canon_tags` (the fixed traits: what must never change).
2. Each scene is a file with tokens (`scene-NN.md`): story text and a picture prompt.
3. `node ../scripts/check.mjs` passes.
4. `node ../scripts/render.mjs scene-NN.md --out built/scene-NN.md` makes the prompt sheet.
5. Paste the picture prompt (and attach the anchor picture if the chatbot allows it).
6. Download into `renders/`, named by scene and order.
7. Tag each picture by hand, one file per character.
8. `node ../scripts/anchor.mjs tags-<id>.jsonl --character <id> --ask`, answer the two questions, read the redraw list and the prices of the other answers.
9. Answer `y` to record the choice. Back to 2.

Everything below is one of those steps in detail. All commands run inside your story folder, with the scripts one folder up.

## 1. Keep names out of pasted prompts

Three reasons, then the method.

- An image model does not know your characters. A name gives it nothing to draw and sometimes gives it the wrong thing: a famous person, a stranger, or the name itself lettered onto the picture.
- A name typed into a prompt is a second copy of something the registry already owns. Second copies drift. The gate exists to refuse them.
- The look is the thing that has to match from page to page, so the look is the thing that has to be written once.

The method:

- Put the look on the character as a form: `"forms": { "look": "..." }`. Write it as the model should read it: physical, concrete, in the order a stranger would notice (age, skin, hair, clothes, one odd detail). Twenty to forty words.
- In the scene file, the picture prompt refers to characters only through `{{id:look}}`. Story text uses `{{id}}`, `{{id:full}}`, `{{id:nickname}}` and so on. Keep the two under separate headings so you can copy the picture prompt alone.
- Paste only the picture prompt into the image chatbot. The story text is for your pages or for a writing chatbot.
- When the chatbot rewrites your prompt and shows you its version, do not paste its version back into your scene file. If one of its phrases genuinely helps, move that phrase into the registry's `look` and render again. The registry changes; the scene does not.
- A typed name or a typed look in a scene file fails the gate with the token to write instead: `names "June" in a token source. Fix: write {{june-okafor}}`.

If you must mention a character by name inside a picture prompt (a sign on a door, a name tag), it is text in the picture, and the model will try to letter it. Decide whether you want that. If you do, it is still a token: `{{june-okafor}}` in the prompt renders the name from the registry.

## 2. Name downloaded files by scene and order

```text
renders/scene-01-01.png
renders/scene-01-02.png
renders/scene-02-01.png
```

- Two digits for the scene, two for the order within the scene. Order is the order you received the pictures, not the order you prefer them.
- A retry is the next number, never a replacement. If `scene-01-02.png` is bad and you ask again, the new picture is `scene-01-05.png` (or whatever comes next). The anchor policies `origin` and `terminal` read the order; overwriting a file rewrites history.
- Never rename a file after it has been tagged. The tags file names it.
- One `renders/` folder per story. If the chatbot gives you several pictures in one message, number them left to right, top to bottom.
- Keep the chatbot's own file names out of it. Rename on download or right after.

## 3. Hand-tag conventions

The easy way is `node ../scripts/tag.mjs <id>`: it lists the pictures in `renders/`, asks which traits to track, and asks what you see in each picture, then writes the file below for you. From the second picture on, Enter repeats the answer for the picture before. It writes a fixed trait's value exactly as the registry spells it, and says so when what you saw differs.

A tags file is one line per picture, in order, in a strict format called JSON Lines:

```json
{"image": "renders/scene-01-01.png", "order": 1, "tags": {"skin": "dark brown", "hair": "two puffs", "coat": "yellow"}}
```

- **One file per character:** `tags-june.jsonl`, `tags-abel.jsonl`. A picture appears in a character's file only if that character is in it; `order` keeps the picture's number, so gaps are fine.
- **Write the vocabulary before you tag.** Three to five keys per character: the fixed traits in `canon_tags` (what must never change), plus the things that drift in practice and that you want question 2 to weigh: hair, build, one garment, one signature object. Put the fixed traits in the registry first; the tags file follows them.
- **Same keys on every line.** A key missing from a line means that picture does not carry that trait, and a fixed trait it does not carry counts as drift. If you could not look, write `unknown` (below), not nothing.
- **Fixed-trait values exactly as written in the registry.** The comparison is a case-insensitive exact match on the value, so `two puffs` matches `Two Puffs` but not `2 puffs`. Copy and paste the value.
- **Anything else in two or three plain words.** `loose curls`, `grey`, `too light`.
- **If you cannot tell, write `unknown`.** Her eyes are closed, his face is turned away: tag that trait `unknown` instead of guessing. A picture you could not judge on a fixed trait is not counted as drift for it: it cannot become the anchor, it is not put on the redraw list for that trait, and the report says how many it left out. It still goes on the list if something you could see has drifted. Any other word, `unclear` included, is read as what you saw, and a fixed trait that does not match is billed as drift. To use your own word instead, see [When you cannot tell](HOW-TO-RESOLVE-CHARACTER-DRIFT.md#when-you-cannot-tell).
- **Tag what the picture shows, not what you asked for.** The prompt is not evidence. Open the picture at full size.
- **Keep `order` ascending and matching the file names.**
- **Double quotes, commas between fields, no comma before a closing brace.** A broken line stops the tool with an error that mentions `JSON` and a position; fix that line.
- Keep the tags files in the story folder next to the registry. They are small text files and they are your record of what the AI actually produced.

## 4. The two questions

```bash
node ../scripts/anchor.mjs tags-june.jsonl --character june-okafor --ask
```

**Question 1: what about this character must never change?** Zero or more traits, typed as `skin=dark brown` or `skin: dark brown`, with commas between them; capital letters do not matter. The registry answers it by default with the character's `canon_tags`; press Enter to accept, or type the whole list you want for this run. A typed list replaces the registry's, and the tool says which traits are not kept this time. After each answer it says back what it will use (`Using: skin=dark brown.`); if it cannot read an answer, it says what it could not read and asks again. Only pictures carrying every one of these tags can be the anchor, and pictures without them are always on the redraw list, whatever you answer next. Put here what is a story fact (heritage markers, eye colour, a scar) and nothing that is merely what you asked for.

**Question 2: for everything else, which look do you want?**

| Answer | Keeps | Right when | With hand tags only |
|---|---|---|---|
| fewest redraws (default) | the look most of the eligible pictures already have | consistency throughout matters more than any particular endpoint | works; the most frequent tag combination among the eligible pictures |
| the first look | the first eligible picture | you cast carefully and the first picture is the casting | works |
| the last look | the last eligible picture | you changed the character on purpose and want the new look to win | works |

The answer is applied to the eligible pictures only, and the tool prints what the other two answers would have cost, so the choice is made on purpose. It never chooses for you.

**Which to choose.** The cheapest answer keeps whatever most pictures already show, and most pictures may show the drift. A lead who began mixed-race and darker-skinned and drifted lighter over a book is cheapest to keep light. Both answers are legitimate; they serve different goals. The author of this repository's own case took *fewest redraws* for skin tone and hair (consistency throughout over any particular endpoint) and put the story facts in question 1 (she is one quarter Black; her eyes are amber-brown). If a look must not move, it is a fixed trait: write it into `canon_tags` once, and the price of insisting shows up as a longer redraw list.

**Under the hood**, for developers and for scripts, each answer is a policy name, and the questions are flags:

| Answer | Flag | Policy |
|---|---|---|
| what must never change | `--keep tag=value` (repeatable; the registry's `canon_tags` when absent) | the filter every policy runs inside |
| fewest redraws | `--prefer fewest-redraws` | `consensus` |
| the first look | `--prefer first-look` | `origin` |
| the last look | `--prefer last-look` | `terminal` |
| most common | `--prefer most-common` | `mode` |

`--policy canon` is keep + fewest redraws and stays as an alias. Set the default in the registry so it is declared, not remembered:

```json
"drift_resolution": { "prefer": "fewest-redraws" }
```

## 5. What the engine cannot do without an API

An *embedding* is a long list of numbers a model computes from a picture so that similar pictures get similar numbers. Producing one needs a model: an API you pay for, or one running on your computer. A browser chatbot does not give you embeddings.

Without them, in the anchor report:

- There are no similarity scores, so there is no mean, no minimum and no threshold. The tool cannot measure *how far* a picture drifted.
- *Fewest redraws* is the most frequent tag combination among the eligible pictures, not the centre of a cloud of numbers. It picks the first picture of that group.
- The redraw list is counted by tags, not by similarity: every picture that lacks a fixed trait, plus every eligible picture whose tags differ from the chosen one. A picture you did not tag is on the list, because nothing shows it matches. The answer says `Counted by your tags, not measured by a model`, the developer report says `bill by tags, not by similarity`, and the recorded anchor carries `"bill_basis": "tags"`. A tag bill is exactly as good as your tagging (section 3).
- Outlier pruning (`--prune-outliers`) does nothing.
- The `budget` in `drift_resolution` is checked against the tag bill as it would be against a similarity bill.

What tags give you, with no model at all: your two answers, a recorded anchor with the file's fingerprint and the reason, the list of pictures to redraw, and the price of each other answer. That is the whole decision. A model would add the measurement: how far each picture is from the anchor, as a number, and with it a centroid instead of a head count and pruning of broken renders.

When you do have a model, each tags line gains an `"embedding": [...]` field and the report switches to similarity: scores, a threshold, pruning, and a bill by distance instead of by tags. How to produce the rows, which encoder family fits which job, and the licence caveats: [How to resolve character drift after the fact](HOW-TO-RESOLVE-CHARACTER-DRIFT.md).

## 6. Change a name or a look

Edit the registry only. Render every scene again. Paste again. Pictures you already made do not change: decide whether the old anchor still stands (a renamed character looks the same) or whether the look changed on purpose (then ask again and answer *the last look*, so the new look wins).

Never edit `built/`. Never edit a scene to match a picture. The registry is upstream of everything.

## 7. Messages you will see, and what they mean

| Message | Meaning | Do |
|---|---|---|
| `registry missing: .../character-registry.json` | you ran the command outside your story folder, or the file was saved under another name | `cd` into it; if the message names a file such as `character-registry.json.txt`, rename that file |
| `Cannot find module '.../scripts/check.mjs'` (with a long list of lines under it) | the terminal is not inside `my-story`, `../` was left off, or the command has a typo (`script` for `scripts`, `.js` for `.mjs`) | `pwd` should end in `my-story`; then check the command letter by letter |
| `character-registry.json: line 11, column 7: this is not valid JSON. Likely cause: ...` | the registry has a typing slip; the message says the line and the usual cause (curly quotes, a comma before `}`, a file saved as rich text) | fix that line, or paste the file again (see *How to make a file* in the tutorial) |
| `token_sources "scene-*.md" matches no tracked file` | the registry names scene files that do not exist yet, or the scene's name differs in a capital letter (`Scene-01.md`) | write the first scene, or rename it to match exactly |
| `names "June" in a token source. Fix: write {{june-okafor}}` | a name or a look was typed into a scene file | replace it with the token |
| `{{june-okafer}} is not a character in the registry. Fix: check the spelling: did you mean {{june-okafor}}?` | a token with a typo, or an id not in the registry | fix the spelling, or add the character |
| `{{June-okafor}} looks like a token but is not one` | a capital letter or a space inside a token | write the token it suggests |
| `june-okafor has no form "looks"` | the part after the colon is not one of the character's forms | use one of the forms it lists |
| `I could not read: ... Type each trait like skin=dark brown` | an answer to question 1 that is not a trait | type it as `trait=value`, or press Enter |
| `Check this: no picture's tags say hair=two puff; your tags say ...` | a trait or value in your answer that no picture's tags have, usually a typo | type it the way the tags say it; type the same answer again to keep it anyway |
| `None of the pictures has what must never change (...). Your tags say: ...` | the tags and the fixed traits do not match anywhere | if they mean the same thing, write it the same way in both places; if the pictures drifted, make new ones |
| `there is no character "June-okafor" ... Did you mean june-okafor?` | `--character` (or `tag.mjs`) was given an id that is not in the registry | use the id exactly as the registry writes it |
| `{june-okafor} has single braces`, `has a {{ without a matching }}`, `has three braces in a row` | a token typed with the wrong number of braces | two braces on each side: `{{june-okafor}}` |
| `was saved as rich text, not plain text` | a scene saved by a word processor | in TextEdit choose Format, then Make Plain Text, or paste it again from the terminal |
| `is empty` or `holds a command instead of the scene's text` | the scene was made by copying the command instead of the box, or before copying anything | copy the box with the scene, then type the command |
| `names "JUNE" in a token source` | a name typed in capital letters | write the token; the name is printed the way the registry spells it |
| `Did you mean scene-01.md?` | the file's ending was left off the command | type the whole name |
| `character id "Mika Tanaka" is not allowed` | an id with capitals or spaces | use the id it suggests, in the registry and in the tokens |
| `Check your tags: hair has both "loose curl" and "loose curls"` | one look written two ways in a tags file | write it the same way everywhere |
| `These tags have no beard at all, so they are probably not Abel's tags` | `--character` and the tags file are for different characters | use the character's own tags file |
| `Last time you recorded: ...` / `This replaces the anchor you recorded before` | you are asking again after recording | Enter keeps what you recorded; a `y` that would change it is said first |
| `note: the registry file is named Character-Registry.json` | the registry's name has capital letters | rename it to `character-registry.json` |
| `note: this checked character-registry.json in this folder. my-story/ has its own registry` | the checker was run one folder above your story | `cd my-story` and run `node ../scripts/check.mjs` |
| `Note: renders/scene-01-02.png is not in this folder` | the tags file names a picture that is not there, often because of its ending (`.jpg`, `.webp`) | rename the picture or fix the name in the tags file |
| `None of the pictures has what must never change (...)` (or, on one line, `no image keeps {...}: every image has drifted off what must never change`) | nothing you tagged carries every fixed trait | paste the sheet again, tag the new pictures, ask again |
| `unknown --prefer ...` | a misspelled answer on the command line | one of `fewest-redraws`, `first-look`, `last-look`, `most-common` |
| `N picture(s) could not be judged on that (tagged unknown); they are not counted as drift.` | you tagged a fixed trait `unknown` on those pictures | nothing to fix: they are left out of the anchor choice and the bill for that trait |
| `consensus needs embeddings or tags on the rows` | the pictures have neither embeddings nor tags | tag them (section 3) |
| `canon needs the character's canon_tags in the registry or --canon tag=value` | the old `--policy canon` spelling without fixed traits | use `--ask`, or `--keep tag=value` |
| `--write needs --character <id> that exists in .../character-registry.json` | `--write` without a character, or an id that is not in the registry | add `--character <id>` with the id as written in the registry |
| `tags-june.jsonl: line 2, column 104: this is not valid JSON.` | a broken line in a tags file | fix the quotes or commas on that line |
| `gap: <id>.anchor.image ... is not on disk here` | the registry names an anchor picture the folder no longer holds | restore the file, or re-run `--write` |
