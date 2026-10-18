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

1. Characters live in `character-registry.json`: id, name, `forms.look`, `canon_tags`.
2. Each scene is a file with tokens (`scene-NN.md`): story text and a picture prompt.
3. `node ../scripts/check.mjs` passes.
4. `node ../scripts/render.mjs scene-NN.md --out built/scene-NN.md` makes the prompt sheet.
5. Paste the picture prompt (and attach the anchor picture if the chatbot allows it).
6. Download into `renders/`, named by scene and order.
7. Tag each picture by hand, one file per character.
8. `node ../scripts/anchor.mjs tags-<id>.jsonl --policy canon --character <id>` and read the comparison.
9. `--write` when you accept the choice. Back to 2.

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
- **Write the vocabulary before you tag.** The keys and the canon values are the character's `canon_tags` in the registry. Three to five keys per character, the ones that drift in practice: skin, hair, build, one garment, one signature object. Put them in the registry first; the tags file follows them.
- **Same keys on every line.** A key missing from a line means that line cannot match canon.
- **Canon values exactly as written in the registry.** The comparison is a case-insensitive exact match on the value, so `two puffs` matches `Two Puffs` but not `2 puffs`. Copy and paste the value.
- **Anything else in two or three plain words.** `loose curls`, `grey`, `too light`. If you cannot tell from the picture, write `unclear`; it will not match canon, which is the honest result.
- **Tag what the picture shows, not what you asked for.** The prompt is not evidence. Open the picture at full size.
- **Keep `order` ascending and matching the file names.**
- **Double quotes, commas between fields, no comma before a closing brace.** A broken line stops the tool with an error that mentions `JSON` and a position; fix that line.
- Keep the tags files in the story folder next to the registry. They are small text files and they are your record of what the AI actually produced.

## 4. When to use canon, and when consensus

| Policy | Picks | Right when | With hand tags only |
|---|---|---|---|
| `canon` | among the pictures matching every `canon_tags` value, the one nearest their middle | the drift is a mistake and the character has a definition you wrote down | works; with no embeddings the first matching picture is taken |
| `mode` | the most common tag combination, nearest its middle | a classifier or you can name the states and the common one is the right one | works; with no embeddings the first picture of the common group is taken |
| `origin` | the first picture | the beginning is right and everything after is drift | works |
| `terminal` | the last picture | the drift was a deliberate change you want to keep | works |
| `consensus` | the picture nearest the middle of all pictures | you want the fewest corrections and you trust that the middle is the character | needs embeddings: `n/a` |

Default to `canon`. The cheapest choice (`consensus`, or `mode`) keeps whatever most pictures already show, and most pictures show the drift. A lead who began mixed-race and darker-skinned and drifted lighter over a book is cheapest to keep light. That is arithmetic, not a decision. `canon_tags` is where you make the decision, in words you wrote before looking at the pile, and the comparison line prints every policy side by side so nobody picks the cheap one by accident.

Use `consensus` when you have embeddings (section 5), the character has no written definition yet, and you genuinely want the centre of what exists. Use `terminal` when you changed the character on purpose mid-story and want the new look to win. Use `origin` when you cast carefully and the first picture is the casting.

Set the default in the registry so it is declared, not remembered:

```json
"drift_resolution": { "policy": "canon" }
```

## 5. What the engine cannot do without an API

An *embedding* is a long list of numbers a model computes from a picture so that similar pictures get similar numbers. Producing one needs a model: an API you pay for, or one running on your computer. A browser chatbot does not give you embeddings.

Without them, in the anchor report:

- There are no similarity scores, so there is no mean, no minimum and no threshold.
- There is no regeneration list. The tool cannot tell you which pictures are too far from the anchor, because "far" is a number it does not have. With tags only, the pictures to redo are the ones whose tags differ from canon. Read them off the tags file; for four to ten pictures a scene, that takes a minute.
- `consensus` is unavailable, and outlier pruning (`--prune-outliers`) does nothing.
- `canon` and `mode` pick the first picture of their group instead of the one nearest the group's middle, since there is no middle to measure.
- The `budget` in `drift_resolution` is never checked against anything, because the bill is not computed.

What tags still give you, with no model at all: a stated policy, a recorded anchor with the file's fingerprint and the reason, and a comparison that shows when the cheap policy would have picked the drift. That is the decision; the API would only price it.

When you do have a model, each tags line gains an `"embedding": [...]` field and everything above switches on: scores, the regeneration list, `consensus`, pruning, the budget. How to produce the rows, which encoder family fits which job, and the licence caveats: [How to resolve character drift after the fact](HOW-TO-RESOLVE-CHARACTER-DRIFT.md).

## 6. Change a name or a look

Edit the registry only. Render every scene again. Paste again. Pictures you already made do not change: decide whether the old anchor still stands (a renamed character looks the same) or whether the look changed on purpose (then the next good picture is the new anchor; `terminal` is the policy for that, or `--write` after you pick it).

Never edit `built/`. Never edit a scene to match a picture. The registry is upstream of everything.

## 7. Messages you will see, and what they mean

| Message | Meaning | Do |
|---|---|---|
| `registry missing: .../character-registry.json` | you ran the command outside your story folder | `cd` into it |
| `token_sources "scene-*.md" matches no tracked file` | the registry names scene files that do not exist yet | write the first scene, then run again |
| `names "June" in a token source. Fix: write {{june-okafor}}` | a name or a look was typed into a scene file | replace it with the token |
| `unknown token {{june-okafer}}` | a token with a typo, or an id not in the registry | fix the spelling, or add the character |
| `canon needs the character's canon_tags in the registry or --canon tag=value` | you ran `canon` without `--character <id>`, or the entry has no `canon_tags` | add `--character <id>`; write the tags |
| `no image matches canon {...}: every image has drifted off canon` | nothing you tagged matches the definition | paste the sheet again, tag the new pictures, run again |
| `consensus needs embeddings on the rows` | tags only | use `canon`, `mode`, `origin` or `terminal` |
| `--write needs --character <id> that exists in .../character-registry.json` | `--write` without a character, or an id that is not in the registry | add `--character <id>` with the id as written in the registry |
| `SyntaxError: ... JSON at position N` | a broken line in a tags file | fix the quotes or commas on that line |
| `gap: <id>.anchor.image ... is not on disk here` | the registry names an anchor picture the folder no longer holds | restore the file, or re-run `--write` |
