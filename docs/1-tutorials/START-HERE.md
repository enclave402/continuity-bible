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

By the end you will have two characters written down once, one scene that uses them, a prompt sheet you pasted into a chatbot, four saved pictures, and a recorded answer to two questions: what about each character must never change, and which picture every later picture should match. It takes about 30 minutes plus the time your chatbot needs to draw.

You need:

- [Node](https://nodejs.org), version 18 or newer. It is free. The commands below run in a terminal (on a Mac: Terminal; on Windows: PowerShell or Command Prompt).
- A browser chatbot that can make pictures. Any one you already use.
- A text editor. Notepad, TextEdit (in plain-text mode) or VS Code all work.

Once you have the folder, nothing here talks to any service. The scripts only read and write files on your computer.

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
      "canon_tags": { "skin": "dark brown" }
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
      "canon_tags": { "skin": "light brown", "beard": "white" }
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
| `canon_tags` | The character's *fixed traits*: what must never change, as short tags you can read off a picture. June's dark brown skin is a story fact. Her hairstyle and coat are left out on purpose; step 9 shows why. Write what the character *is*, never what the AI happened to draw. |
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

Now you be the judge. Open each picture and, for each character, write down what you actually see for three things: the fixed traits in that character's `canon_tags`, plus whatever tends to drift (for June, her hair and her coat; for Abel, his beard and his sweater). Not what you asked for. What the picture shows.

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

Rules that keep this honest: use the same keys on every line, and for a fixed trait use the key from `canon_tags`; when the picture matches, write the value exactly as it is in the registry; when it does not, write what you see in two or three words. Every line is one picture, in order. Keep the double quotes and commas exactly as shown: this is a strict format, and a missing quote gives you a long error that says `JSON` in it.

No model, no account and no internet were needed for this step. Your eyes did it.

## 9. Answer two questions and read the answer

The *anchor* is the one picture every later picture should match. Picking it is a decision, so the tool asks you two questions in plain words and tells you what each answer would cost. Run it for June:

```bash
node ../scripts/anchor.mjs tags-june.jsonl --character june-okafor --ask
```

Press Enter at both questions, then answer `n` when it offers to record:

```text
What about June must never change? Type tag=value pairs separated by commas, or press Enter for none.
  The registry says: skin=dark brown. Press Enter to keep that, or type your own.
> 
For everything else, which look do you want?
  1. fewest redraws (default)
  2. the first look
  3. the last look
> 
Keep renders/scene-01-02.png as the one true picture of June.
Redraw 1 picture: renders/scene-01-01.png.
  Counted by your tags, not measured by a model.
If you answered differently: the first look would keep renders/scene-01-01.png and redraw 3; the last look would keep renders/scene-01-04.png and redraw 1.
Record this as June's anchor in the registry? [y/N] n
Not recorded. Ask again when you have decided, or add --write to the command.
```

What happened:

- **Question 1** is what must never change. The registry already answers it with June's fixed traits (`canon_tags`), so Enter keeps that answer. Only pictures that have every fixed trait can be the anchor; pictures without them are always redrawn. All four pictures have dark brown skin, so all four qualify.
- **Question 2** is which look you want for everything else. *Fewest redraws* keeps the look most of the pictures already have. The AI drew loose curls three times out of four, so that is the look it keeps: picture 2, and only picture 1 (two puffs) would be redrawn. *The first look* is picture 1, at the price of three redraws. *The last look* is picture 4, same loose curls, one redraw.
- **Counted by your tags.** You gave tags, not numbers. An *embedding* is a long list of numbers a model computes from a picture so that similar pictures get similar numbers. Without embeddings the tool cannot measure how far a picture drifted, so it counts the pictures whose tags differ from the chosen one, and says so.

Now the decision is yours, and it is a real one. The registry's `look` asked for two puffs; the AI gave you loose curls, and loose curls is cheapest. If you are happy with loose curls, take the default and change `look` in the registry to say loose curls, so your next prompt asks for what you are keeping. If two puffs is part of who June is, it belongs in question 1. Ask again, and this time type the answer:

```bash
node ../scripts/anchor.mjs tags-june.jsonl --character june-okafor --ask
```

```text
What about June must never change? Type tag=value pairs separated by commas, or press Enter for none.
  The registry says: skin=dark brown. Press Enter to keep that, or type your own.
> skin=dark brown, hair=two puffs
For everything else, which look do you want?
  1. fewest redraws (default)
  2. the first look
  3. the last look
> 
Keep renders/scene-01-01.png as the one true picture of June.
Redraw 3 pictures: renders/scene-01-02.png, renders/scene-01-03.png, renders/scene-01-04.png.
  3 pictures lack what must never change (skin=dark brown, hair=two puffs) and are always redrawn.
  Counted by your tags, not measured by a model.
If you answered differently: the first look would keep renders/scene-01-01.png and redraw 3; the last look would keep renders/scene-01-01.png and redraw 3.
Record this as June's anchor in the registry? [y/N] y
Recorded in character-registry.json. Next time, attach renders/scene-01-01.png to your chatbot message and paste the picture prompt.
```

Three redraws instead of one. That is the price of insisting, and the tool shows it rather than deciding for you. If you want this answer to stick, add `"hair": "two puffs"` to June's `canon_tags` in the registry, and next time Enter is enough.

Now Abel. His fixed traits are his skin and his white beard; the one picture where the beard went grey is out, whatever you answer:

```bash
node ../scripts/anchor.mjs tags-abel.jsonl --character abel-marsh --ask
```

```text
What about Abel must never change? Type tag=value pairs separated by commas, or press Enter for none.
  The registry says: skin=light brown, beard=white. Press Enter to keep that, or type your own.
> 
For everything else, which look do you want?
  1. fewest redraws (default)
  2. the first look
  3. the last look
> 
Keep renders/scene-01-01.png as the one true picture of Abel.
Redraw 1 picture: renders/scene-01-03.png.
  1 picture lacks what must never change (skin=light brown, beard=white) and is always redrawn.
  Counted by your tags, not measured by a model.
If you answered differently: the first look would keep renders/scene-01-01.png and redraw 1; the last look would keep renders/scene-01-04.png and redraw 1.
Record this as Abel's anchor in the registry? [y/N] y
Recorded in character-registry.json. Next time, attach renders/scene-01-01.png to your chatbot message and paste the picture prompt.
```

Your pictures and tags will differ from these, and so will the pictures it names. That is right: it is reading your judgement, not guessing.

If no picture has the fixed traits, the tool says so instead of picking the least bad one:

```text
None of the pictures has what must never change (skin=dark brown). Paste the prompt sheet again, tag the new pictures, and ask again.
```

Then go back to step 6, paste the same sheet again, and tag the new pictures as `05`, `06` and so on.

## 10. Read what was recorded

You answered `y`, so the choice is saved in the registry, next to the character it belongs to. Open `character-registry.json` and look at June. A block like this has appeared (the long `sha256` is a fingerprint of your picture file and `chosen_at` is the time, so yours will differ):

```json
"anchor": {
  "image": "renders/scene-01-01.png",
  "sha256": "b8fc6f9a…",
  "policy": "consensus",
  "prefer": "fewest-redraws",
  "keep": { "skin": "dark brown", "hair": "two puffs" },
  "metric": "cosine",
  "order": 1,
  "chosen_at": "2026-10-18T01:56:57.713Z",
  "embeddings": "tags-june.jsonl",
  "stats": { "n": 4, "with_embedding": 0, "pruned": 0, "threshold": 0.6, "kept": 1, "excluded": 3, "cannot_tell": 0, "below_threshold": null, "bill_basis": "tags", "tag_mismatches": 3, "tag_differ": 0 },
  "why": "no embeddings, so the most frequent tag combination [[\"coat\",\"yellow\"],[\"hair\",\"two puffs\"],[\"skin\",\"dark brown\"]] (1 of 1 images) among the 1 image(s) that keep {\"skin\":\"dark brown\",\"hair\":\"two puffs\"} (of 4)"
}
```

Now the registry says not only who June is, but which picture shows it, what you said must never change (`keep`), which look you preferred for the rest (`prefer`), and that the bill of three was counted by tags, not measured by a model. Run the gate once more:

```bash
node ../scripts/check.mjs
```

```text
character registry: pass (2 entries, 0 labels resolved on 0 surfaces, 1 token sources, 4 files scanned)
```

The same two answers fit on one line, for a script or for a second run you do not want to type through. `--keep` is question 1 (repeat it for each trait), `--prefer` is question 2 (`fewest-redraws`, `first-look` or `last-look`), and `--write` records:

```bash
node ../scripts/anchor.mjs tags-june.jsonl --character june-okafor --keep "skin=dark brown" --keep "hair=two puffs" --prefer fewest-redraws
```

```text
anchor: policy consensus: renders/scene-01-01.png (order 1; no embeddings, so the most frequent tag combination [["coat","yellow"],["hair","two puffs"],["skin","dark brown"]] (1 of 1 images) among the 1 image(s) that keep {"skin":"dark brown","hair":"two puffs"} (of 4))
anchor: keep {"skin":"dark brown","hair":"two puffs"}: 1 of 4 image(s) keep it; 3 do not and are always on the bill
anchor: 4 image(s), none with an embedding; 3 to redo (3 lack a kept tag, 0 differ from the anchor's tags) -> regenerate (bill by tags, not by similarity)
  regenerate renders/scene-01-02.png
  regenerate renders/scene-01-03.png
  regenerate renders/scene-01-04.png
anchor: compare: origin=renders/scene-01-01.png (3 to redo, by tags); terminal=renders/scene-01-01.png (3 to redo, by tags); consensus=renders/scene-01-01.png (3 to redo, by tags); mode=renders/scene-01-01.png (3 to redo, by tags); canon=renders/scene-01-01.png (3 to redo, by tags)
```

That is the same decision in the tool's own words: the policy names on the last line are what the three answers are called under the hood (fewest redraws is `consensus`, the first look is `origin`, the last look is `terminal`).

## 11. What to paste next time

For scene 2, write `scene-02.md` with tokens, render it, and paste the picture prompt. Then add one thing: the anchor.

- If your chatbot lets you attach a picture, attach `renders/scene-01-01.png` (the anchor named in the registry) and start your message with: *Keep the two characters exactly as in the attached picture.* Then paste the picture prompt.
- If it does not, paste the picture prompt as before. The words are the same every time, and that is the most a text-only chatbot can be held to.

After every batch: save, name in order, tag, ask the two questions again, and redraw the pictures on the `Redraw` line. Keep the recorded anchor unless you decide, on purpose, to change it; then answer `y` again. The decision is always in the registry, never in your memory.

## Where to go next

- The whole loop in detail, with file naming, tagging conventions, how to answer the two questions, and what an API adds: [How to work from a browser chatbot](../2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md).
- You already have pages with names typed out: `node ../scripts/tokenize.mjs old-draft.md --text --dry-run` shows what it would change; drop `--dry-run` to do it.
- Every field of the registry, with what the gate does for each: [Registry fields](../3-reference/REGISTRY-FIELDS.md).
- You have an API or a local model and want the tool to score pictures and price the drift: [How to resolve character drift after the fact](../2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md).
