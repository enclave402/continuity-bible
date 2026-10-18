---
title: Start here: one scene, two characters, a browser chatbot
doc_id: tutorial-start-here
triadic_leg: diataxis
diataxis_mode: learn
canonical_path: docs/1-tutorials/START-HERE.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# Start here: one scene, two characters, a browser chatbot

By the end you will have two characters written down once, one scene that uses them, a prompt sheet you pasted into a chatbot, four saved pictures, and a recorded decision about which picture every later picture should match. It takes about 30 minutes plus the time your chatbot needs to draw.

You need:

- [Node](https://nodejs.org), version 18 or newer. It is free. The commands below run in a terminal (on a Mac: Terminal; on Windows: PowerShell or Command Prompt).
- A browser chatbot that can make pictures. Any one you already use.
- A text editor. Notepad, TextEdit (in plain-text mode) or VS Code all work.

Nothing here talks to any service. The scripts read and write files in one folder on your computer.

## 1. Get the folder

```bash
git clone https://github.com/enclave402/narrative-token-ssot.git
cd narrative-token-ssot
node --version
```

No git? On the GitHub page press **Code**, then **Download ZIP**, unzip it, and open a terminal in that folder. `node --version` should print `v18` or higher. If it prints an error, install Node first.

## 2. Make a folder for your story

```bash
mkdir my-story
cd my-story
```

Every command from here on runs inside `my-story`. The scripts live one folder up, which is why each command starts with `node ../scripts/`.

## 3. Write two characters into the registry

The *registry* is one file that says who each character is. It is the only place a name or a look is ever written. Create `my-story/character-registry.json` with this text, exactly:

```json
{
  "registry_version": 1,
  "token_sources": [
    { "file": "scene-*.md", "why": "my scenes hold tokens, never a typed name" }
  ],
  "coverage": {
    "ignore": ["built/**"]
  },
  "characters": {
    "june-okafor": {
      "name": "June",
      "full_name": "June Okafor",
      "kind": "person",
      "story": "the-lighthouse",
      "role": "Nine-year-old who wants to see the lamp lit",
      "prose_only": true,
      "forms": {
        "look": "a nine-year-old girl with dark brown skin, black curls tied in two puffs, a yellow raincoat and red boots"
      },
      "canon_tags": { "skin": "dark brown", "hair": "two puffs", "coat": "yellow" }
    },
    "abel-marsh": {
      "name": "Abel",
      "full_name": "Abel Marsh",
      "kind": "person",
      "story": "the-lighthouse",
      "role": "The last keeper of the lighthouse",
      "prose_only": true,
      "forms": {
        "look": "a tall old man with light brown skin, a short white beard, a navy wool sweater and a flat grey cap"
      },
      "canon_tags": { "skin": "light brown", "beard": "white", "sweater": "navy" }
    }
  }
}
```

What each part means:

| Part | Meaning |
|---|---|
| `june-okafor`, `abel-marsh` | The *id*: how you will refer to the character in every scene. Lower-case letters, digits and hyphens. Pick it once and never change it. |
| `name`, `full_name` | What the words come out as. `name` is what the story usually calls them. |
| `kind`, `story`, `role` | Required bookkeeping: a person, which story they belong to, one line on who they are. |
| `prose_only` | Tells the checker these characters live in written scenes, not in a scene table, so it does not ask where they are listed. |
| `forms.look` | How the character looks, written once. The picture prompt will ask for it with `{{june-okafor:look}}`. You can add other forms (`nickname`, `formal`) the same way. |
| `canon_tags` | Who the character is, as short tags you can read off a picture. You will use these in step 9 to pick the reference picture. Write what the character *is*, not what the AI happened to draw. |
| `token_sources` | Which files must never contain a typed name: here, every `scene-*.md`. |
| `coverage.ignore` | Files that are allowed to contain names: the rendered output in `built/`. |

Use your own characters if you like. Keep the shape; change the words.

## 4. Write the scene with tokens

A *token* is a placeholder in double curly braces. `{{june-okafor}}` becomes *June*. `{{june-okafor:full}}` becomes *June Okafor*. `{{june-okafor:look}}` becomes her whole look. Create `my-story/scene-01.md`:

```markdown
# Scene 1: The ladder

## Story text

{{june-okafor}} held the bottom of the ladder with both hands. "Is it heavy?" she called up.

{{abel-marsh}} did not answer. {{abel-marsh:full}} had climbed this ladder every evening for forty years, and tonight his knees were telling him so.

## Picture prompt

Children's picture-book illustration, soft watercolor, warm dusk light. Inside the top of a lighthouse, a big brass lamp in the middle. Two characters:

- {{june-okafor:look}}, holding the bottom of a wooden ladder, looking up.
- {{abel-marsh:look}}, halfway up the ladder, reaching for the lamp.

Avoid: text, letters, extra people, modern clothes.
```

Notice that the picture prompt never says *June* or *Abel*. An image model does not know your characters by name. It knows them by look, and the look comes from the registry.

Now run the checker. The rest of the docs call it the *gate*: it stops anything with a typed name from going further.

```bash
node ../scripts/check.mjs
```

```text
character registry: pass (2 entries, 0 labels resolved on 0 surfaces, 1 token sources, 1 files scanned)
```

Want to see it catch something? Change `{{june-okafor}}` on line 5 of the scene to `June`, run the same command, and read:

```text
scene-01.md: line 5: names "June" in a token source. Fix: write {{june-okafor}}
character registry: fail (1 problem(s))
```

Put the token back. A misspelled token fails too: `{{june-okafer}}` stops the next step with `unknown token {{june-okafer}}` instead of guessing a name.

## 5. Render the prompt sheet

*Rendering* swaps every token for its words and writes the result to a file you can paste from. That file is your *prompt sheet*.

```bash
node ../scripts/render.mjs scene-01.md --out built/scene-01.md
```

```text
render: scene-01.md -> built/scene-01.md (785 bytes; built output, do not edit)
```

The byte count follows your text. Open `built/scene-01.md`:

```markdown
# Scene 1: The ladder

## Story text

June held the bottom of the ladder with both hands. "Is it heavy?" she called up.

Abel did not answer. Abel Marsh had climbed this ladder every evening for forty years, and tonight his knees were telling him so.

## Picture prompt

Children's picture-book illustration, soft watercolor, warm dusk light. Inside the top of a lighthouse, a big brass lamp in the middle. Two characters:

- a nine-year-old girl with dark brown skin, black curls tied in two puffs, a yellow raincoat and red boots, holding the bottom of a wooden ladder, looking up.
- a tall old man with light brown skin, a short white beard, a navy wool sweater and a flat grey cap, halfway up the ladder, reaching for the lamp.

Avoid: text, letters, extra people, modern clothes.
```

Never edit this file. If you want different words, change the scene or the registry and render again. (Leave out `--out` to print to the screen instead of a file.)

## 6. Paste the sheet into your chatbot

Open your chatbot in the browser. Copy everything under **Picture prompt** in `built/scene-01.md` (not the story text; the picture does not need the names) and paste it with one line in front:

```text
Make this picture:

Children's picture-book illustration, soft watercolor, warm dusk light. Inside the top of a lighthouse, a big brass lamp in the middle. Two characters:

- a nine-year-old girl with dark brown skin, black curls tied in two puffs, a yellow raincoat and red boots, holding the bottom of a wooden ladder, looking up.
- a tall old man with light brown skin, a short white beard, a navy wool sweater and a flat grey cap, halfway up the ladder, reaching for the lamp.

Avoid: text, letters, extra people, modern clothes.
```

Ask for four pictures in total. Either ask once for four, or ask, then say "again, same two characters" three times. Four is enough to see the AI slip. If the chatbot rewrites your prompt and shows you its version, ignore it: your words come from the registry, and they will be the same next time. The chatbot's will not.

## 7. Download the pictures and name them

Save each picture into `my-story/renders/` and name it by scene and the order you got it in:

```text
my-story/renders/scene-01-01.png
my-story/renders/scene-01-02.png
my-story/renders/scene-01-03.png
my-story/renders/scene-01-04.png
```

The order matters later. The first picture you got is `01`, the last is `04`. If you ask for a fifth, it is `05`, even if it replaces a bad one.

## 8. Look at each picture and write tags by hand

Now you be the judge. Open each picture and, for each character, write down what you actually see for the three things in that character's `canon_tags`. Not what you asked for. What the picture shows.

Create `my-story/tags-june.jsonl`, one line per picture, in order. This is what one honest set might look like after the AI lost June's two puffs on the second try and never got them back:

```json
{"image": "renders/scene-01-01.png", "order": 1, "tags": {"skin": "dark brown", "hair": "two puffs", "coat": "yellow"}}
{"image": "renders/scene-01-02.png", "order": 2, "tags": {"skin": "dark brown", "hair": "loose curls", "coat": "yellow"}}
{"image": "renders/scene-01-03.png", "order": 3, "tags": {"skin": "dark brown", "hair": "loose curls", "coat": "yellow"}}
{"image": "renders/scene-01-04.png", "order": 4, "tags": {"skin": "dark brown", "hair": "loose curls", "coat": "yellow"}}
```

And `my-story/tags-abel.jsonl`, the same four pictures, judged for Abel:

```json
{"image": "renders/scene-01-01.png", "order": 1, "tags": {"skin": "light brown", "beard": "white", "sweater": "navy"}}
{"image": "renders/scene-01-02.png", "order": 2, "tags": {"skin": "light brown", "beard": "white", "sweater": "navy"}}
{"image": "renders/scene-01-03.png", "order": 3, "tags": {"skin": "light brown", "beard": "grey", "sweater": "navy"}}
{"image": "renders/scene-01-04.png", "order": 4, "tags": {"skin": "light brown", "beard": "white", "sweater": "navy"}}
```

Rules that keep this honest: use the same three keys as the character's `canon_tags`; when the picture matches, write the canon value exactly as it is in the registry; when it does not, write what you see in two or three words. Every line is one picture, in order. Keep the double quotes and commas exactly as shown: this is a strict format, and a missing quote gives you a long error that says `JSON` in it.

No model, no account and no internet were needed for this step. Your eyes did it.

## 9. Ask for the anchor and read the comparison

The *anchor* is the one picture every later picture should match. Which picture that should be is a decision, so the tool makes you pick a rule, called a *policy*, and shows you what every rule would have picked.

Start with `canon`: keep only the pictures that match who June is, as you wrote in `canon_tags`.

```bash
node ../scripts/anchor.mjs tags-june.jsonl --policy canon --character june-okafor
```

```text
anchor: policy canon: renders/scene-01-01.png (order 1; nearest the centroid of the 1 image(s) matching canon {"skin":"dark brown","hair":"two puffs","coat":"yellow"} (of 4); the cheapest state is not canon's job)
anchor: 4 image(s), none with an embedding: no similarity scores and no regeneration list (tags alone pick the anchor; embeddings would price the drift)
anchor: compare: origin=renders/scene-01-01.png (no scores); terminal=renders/scene-01-04.png (no scores); consensus=n/a; mode=renders/scene-01-02.png (no scores); canon=renders/scene-01-01.png (no scores)
```

Read it line by line.

- **Line 1.** Only one of the four pictures matches all three canon tags: the first. So that is the anchor. "Nearest the centroid" means "closest to the middle of the matching group", which with one match is that match.
- **Line 2.** You gave tags, not numbers. An *embedding* is a long list of numbers a model computes from a picture so that similar pictures get similar numbers. Without embeddings the tool cannot score how far each picture is from the anchor, so it cannot print the list of pictures to redo. With tags only, that list is simply every picture whose tags differ from canon: here pictures 2, 3 and 4 for June.
- **Line 3.** What each policy would have picked. `origin` is the first picture. `terminal` is the last. `mode` is the most common look, and here the most common look is the drifted one: three of four pictures have loose curls, so `mode` would have made the mistake the reference. `consensus` needs embeddings, so it is `n/a`. `canon` picked the picture that matches who she is.

That is the point of the comparison line. The cheapest choice (keep what most pictures already show) is often the wrong one. Run `mode` yourself to see it say so in its own words:

```bash
node ../scripts/anchor.mjs tags-june.jsonl --policy mode --character june-okafor
```

```text
anchor: policy mode: renders/scene-01-02.png (order 2; most frequent tag combination [["coat","yellow"],["hair","loose curls"],["skin","dark brown"]] (3 of 4 images))
anchor: 4 image(s), none with an embedding: no similarity scores and no regeneration list (tags alone pick the anchor; embeddings would price the drift)
anchor: compare: origin=renders/scene-01-01.png (no scores); terminal=renders/scene-01-04.png (no scores); consensus=n/a; mode=renders/scene-01-02.png (no scores); canon=renders/scene-01-01.png (no scores)
```

And `consensus`, to see what you cannot do without a model:

```bash
node ../scripts/anchor.mjs tags-june.jsonl --policy consensus --character june-okafor
```

```text
anchor: consensus needs embeddings on the rows
```

Now Abel:

```bash
node ../scripts/anchor.mjs tags-abel.jsonl --policy canon --character abel-marsh
```

```text
anchor: policy canon: renders/scene-01-01.png (order 1; nearest the centroid of the 3 image(s) matching canon {"skin":"light brown","beard":"white","sweater":"navy"} (of 4); the cheapest state is not canon's job)
anchor: 4 image(s), none with an embedding: no similarity scores and no regeneration list (tags alone pick the anchor; embeddings would price the drift)
anchor: compare: origin=renders/scene-01-01.png (no scores); terminal=renders/scene-01-04.png (no scores); consensus=n/a; mode=renders/scene-01-01.png (no scores); canon=renders/scene-01-01.png (no scores)
```

Three of Abel's four pictures match canon. With tags alone the tool takes the first of them. Your pictures and tags will differ from these, and so will the picture it names. That is right: it is reading your judgement, not guessing.

If every picture has drifted, the tool says so instead of picking the least bad one:

```text
anchor: no image matches canon {"skin":"dark brown","hair":"two puffs","coat":"yellow"}: every image has drifted off canon. Fix: recast or regenerate from the master, tag the result, run again
```

Then go back to step 6, paste the same sheet again, and tag the new pictures as `05`, `06` and so on.

## 10. Record the anchor

Add `--write` and the choice is saved into the registry, next to the character it belongs to:

```bash
node ../scripts/anchor.mjs tags-june.jsonl --policy canon --character june-okafor --write
node ../scripts/anchor.mjs tags-abel.jsonl --policy canon --character abel-marsh --write
```

Each prints the same report as before, then one more line:

```text
anchor: recorded characters.june-okafor.anchor in character-registry.json; next: node scripts/check.mjs
```

Open `character-registry.json` and look at June. A block like this has appeared (the long `sha256` is a fingerprint of your picture file and `chosen_at` is the time, so yours will differ):

```json
"anchor": {
  "image": "renders/scene-01-01.png",
  "sha256": "b8fc6f9a…",
  "policy": "canon",
  "metric": "cosine",
  "order": 1,
  "chosen_at": "2026-10-18T01:02:16.983Z",
  "embeddings": "tags-june.jsonl",
  "stats": { "n": 4, "with_embedding": 0, "pruned": 0, "threshold": 0.6, "below_threshold": null },
  "why": "nearest the centroid of the 1 image(s) matching canon {\"skin\":\"dark brown\",\"hair\":\"two puffs\",\"coat\":\"yellow\"} (of 4); the cheapest state is not canon's job"
}
```

Now the registry says not only who June is, but which picture shows it, and why that picture was chosen. The last line suggests `node scripts/check.mjs`; from inside `my-story` that is:

```bash
node ../scripts/check.mjs
```

```text
character registry: pass (2 entries, 0 labels resolved on 0 surfaces, 1 token sources, 4 files scanned)
```

## 11. What to paste next time

For scene 2, write `scene-02.md` with tokens, render it, and paste the picture prompt. Then add one thing: the anchor.

- If your chatbot lets you attach a picture, attach `renders/scene-01-01.png` (the anchor named in the registry) and start your message with: *Keep the two characters exactly as in the attached picture.* Then paste the picture prompt.
- If it does not, paste the picture prompt as before. The words are the same every time, and that is the most a text-only chatbot can be held to.

After every batch: save, name in order, tag, run `anchor` with `--policy canon`. Keep the recorded anchor unless you decide, on purpose, to change it; then run `--write` again. The decision is always in the registry, never in your memory.

## Where to go next

- The whole loop in detail, with file naming, tagging conventions, when `canon` beats `consensus`, and what an API adds: [How to work from a browser chatbot](../2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md).
- You already have pages with names typed out: `node ../scripts/tokenize.mjs old-draft.md --text --dry-run` shows what it would change; drop `--dry-run` to do it.
- Every field of the registry, with what the gate does for each: [Registry fields](../3-reference/REGISTRY-FIELDS.md).
- You have an API or a local model and want the tool to score pictures and price the drift: [How to resolve character drift after the fact](../2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md).
