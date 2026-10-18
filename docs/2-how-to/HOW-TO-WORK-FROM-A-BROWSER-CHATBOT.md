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

A tags file is one line per picture, in order, in a strict format called JSON Lines:

```json
{"image": "renders/scene-01-01.png", "order": 1, "tags": {"skin": "dark brown", "hair": "two puffs", "coat": "yellow"}}
```

- **One file per character:** `tags-june.jsonl`, `tags-abel.jsonl`. A picture appears in a character's file only if that character is in it; `order` keeps the picture's number, so gaps are fine.
- **Write the vocabulary before you tag.** Three to five keys per character: the fixed traits in `canon_tags` (what must never change), plus the things that drift in practice and that you want question 2 to weigh: hair, build, one garment, one signature object. Put the fixed traits in the registry first; the tags file follows them.
- **Same keys on every line.** A key missing from a line means that line cannot match canon.
- **Fixed-trait values exactly as written in the registry.** The comparison is a case-insensitive exact match on the value, so `two puffs` matches `Two Puffs` but not `2 puffs`. Copy and paste the value.
- **Anything else in two or three plain words.** `loose curls`, `grey`, `too light`. If you cannot tell from the picture, write `unclear`; it will never match a fixed trait, which is the honest result.
- **Tag what the picture shows, not what you asked for.** The prompt is not evidence. Open the picture at full size.
- **Keep `order` ascending and matching the file names.**
- **Double quotes, commas between fields, no comma before a closing brace.** A broken line stops the tool with an error that mentions `JSON` and a position; fix that line.
- Keep the tags files in the story folder next to the registry. They are small text files and they are your record of what the AI actually produced.

## 4. The two questions

```bash
node ../scripts/anchor.mjs tags-june.jsonl --character june-okafor --ask
```

**Question 1: what about this character must never change?** Zero or more `tag=value` pairs. The registry answers it by default with the character's `canon_tags`; press Enter to accept, or type your own for this run. Only pictures carrying every one of these tags can be the anchor, and pictures without them are always on the redraw list, whatever you answer next. Put here what is a story fact (heritage markers, eye colour, a scar) and nothing that is merely what you asked for.

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
| `registry missing: .../character-registry.json` | you ran the command outside your story folder | `cd` into it |
| `token_sources "scene-*.md" matches no tracked file` | the registry names scene files that do not exist yet | write the first scene, then run again |
| `names "June" in a token source. Fix: write {{june-okafor}}` | a name or a look was typed into a scene file | replace it with the token |
| `unknown token {{june-okafer}}` | a token with a typo, or an id not in the registry | fix the spelling, or add the character |
| `None of the pictures has what must never change (...)` (or, on one line, `no image keeps {...}: every image has drifted off what must never change`) | nothing you tagged carries every fixed trait | paste the sheet again, tag the new pictures, ask again |
| `unknown --prefer ...` | a misspelled answer on the command line | one of `fewest-redraws`, `first-look`, `last-look`, `most-common` |
| `consensus needs embeddings or tags on the rows` | the pictures have neither embeddings nor tags | tag them (section 3) |
| `canon needs the character's canon_tags in the registry or --canon tag=value` | the old `--policy canon` spelling without fixed traits | use `--ask`, or `--keep tag=value` |
| `--write needs --character <id> that exists in .../character-registry.json` | `--write` without a character, or an id that is not in the registry | add `--character <id>` with the id as written in the registry |
| `SyntaxError: ... JSON at position N` | a broken line in a tags file | fix the quotes or commas on that line |
| `gap: <id>.anchor.image ... is not on disk here` | the registry names an anchor picture the folder no longer holds | restore the file, or re-run `--write` |
