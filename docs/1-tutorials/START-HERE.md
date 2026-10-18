---
title: Start here: one scene, two characters, a browser chatbot
doc_id: tutorial-start-here
triadic_leg: diataxis
diataxis_mode: learn
canonical_path: docs/1-tutorials/START-HERE.md
status: active
last_reviewed: 2026-10-18
canonical: true
---

# Start here: one scene, two characters, a browser chatbot

You will make one scene with two characters, get four pictures from a chatbot, and pick the one picture all later pictures should match. Along the way you write each character down once. The first time, it takes about an hour, plus the time your chatbot needs to draw.

## Before you start

You need three things:

- **Node**, a free program that runs the tool's scripts, version 18 or newer. Go to [nodejs.org](https://nodejs.org), download the version marked *LTS*, and run the installer. On a Mac it asks for the computer's password, so you may need a parent's help. School computers often block installing programs; use a home computer if so.
- **A terminal**, a window where you type a command and press Enter. On a Mac: press Cmd and Space, type `Terminal`, press Enter. On Windows: press the Windows key, type `PowerShell`, press Enter.
- **A browser chatbot that can make pictures.** Any one you already use.

**How to make a file.** On this page, each file's text is in a grey box.

1. Press the copy button on the box, or select all of its text and copy it.
2. In the terminal, *type* the command shown under the box and press Enter. Do not copy that command: copying it would replace the text you just copied. It prints nothing: that means it worked.

On a Mac the command is `pbpaste >` and the file name. On Windows it is `Get-Clipboard | Set-Content` and the file name. This way nothing can change the text on the way. You can copy the other commands on these pages, like `mkdir my-story`; only the `pbpaste` line has to be typed. A word processor such as TextEdit can turn quotes curly, save rich text, or add `.txt` to the name, and any of those breaks the file. If you use TextEdit anyway, choose Format, then Make Plain Text, before you paste.

**How to open a file to change it.** On a Mac, `open -e scene-01.md` opens it in TextEdit; change it, save, and close it. **How to see your folder.** `open .` shows the folder you are in, in Finder.

**Coming back another day?** Open a terminal, type `cd ` with a space after it, drag your `my-story` folder onto the terminal window, and press Enter.

**The quickest win needs no terminal at all.** Keep the one picture where your character looks right. Attach it to every new request, and start your message with: *Keep the characters exactly as in the attached picture.* Step 11 builds on that habit.

These steps were tested on a Mac. Once you have the folder, nothing here talks to any service: the scripts only read and write files on your computer.

## 1. Get the folder

**Did the README's quick start already?** Then you have the folder and `my-story`. Make sure the terminal is inside `my-story`: type `pwd` and press Enter, and the last part should be `my-story`. Then skip to step 3.

The easiest way, with nothing extra to install: on the [project page](https://github.com/enclave402/narrative-token-ssot) press **Code**, then **Download ZIP**, and open the ZIP to unzip it. In the terminal, type `cd ` with a space after it, drag the unzipped folder onto the terminal window, and press Enter.

If you use git, this does the same:

```bash
git clone https://github.com/enclave402/narrative-token-ssot.git
cd narrative-token-ssot
```

Then check that Node is installed:

```bash
node --version
```

It should print `v18` or higher. If it prints an error, install Node first (see *Before you start*).

## 2. Make a folder for your story

```bash
mkdir my-story
cd my-story
```

If it says `File exists`, you made the folder before: just type `cd my-story`.

Every command from here on runs inside `my-story`. The scripts live one folder up, which is why each command starts with `node ../scripts/` (`..` means "the folder above this one"). If a command ever prints `Cannot find module`, either the terminal is in the wrong folder or the command has a typo. Type `pwd` to see the folder; it should end in `my-story`. Then check the command letter by letter: `scripts`, not `script`, and `.mjs`, not `.js`.

## 3. Write two characters into the registry

The *registry* is one file that says who each character is. It is the only place a name or a look is ever written.

First type `pwd` and press Enter. The last part must be `my-story`; if it is not, type `cd my-story` first, or the file lands in the wrong folder.

There are two ways to write it. For **your own characters**, a helper asks about each one and writes the file for you. For **this page's June and Abel**, you copy one box. The rest of this page uses June and Abel; if you made your own, use your ids wherever it says `june-okafor` or `abel-marsh`.

### Your own characters: answer the questions

Run this once for each character:

```bash
node ../scripts/new-character.mjs
```

It asks one question at a time: type the answer and press Enter. This is the run that made June; your answers will be about your character. A line that shows only `> ` is where Enter was pressed alone:

```text
There is no character-registry.json here yet, so this makes one, with your character in it. Answer each question and press Enter.
What is your story called? A few words, like The Lighthouse.
> The Lighthouse
  Using: the-lighthouse.
What does the story call this character? Type the name you use most, like Mika.
> June
What is June's full name? Press Enter if it is just June.
> June Okafor
June's id will be june-okafor. You write it in scenes, like {{june-okafor}}. Press Enter to use it, or type another id.
> 
  Using: june-okafor.
Who is June, in one line? Like: Ten-year-old who builds robots in the garage.
> Nine-year-old who wants to see the lamp lit
How does June look? One line, in the words a picture prompt should use, like: a ten-year-old girl with brown skin, short black hair, round glasses and a green hoodie.
> a nine-year-old girl with dark brown skin, black curls tied in two puffs, a yellow raincoat and red boots
What about June must never change, in any picture? Type each trait like skin=dark brown, with commas between them. Press Enter for none.
> skin=dark brown
  Using: skin=dark brown.
Made character-registry.json with june-okafor in it, in the story the-lighthouse.
In your scenes, write these instead of June's name or look:
  {{june-okafor}}       becomes  June
  {{june-okafor:full}}  becomes  June Okafor
  {{june-okafor:look}}  becomes  a nine-year-old girl with dark brown skin, black curls tied in two puffs, a yellow raincoat and red boots
To add another character, run this again. Next: write your scene with these tokens, then check it with node ../scripts/check.mjs
```

The *id* is how every scene will refer to the character. The helper makes it from the full name, and Enter takes it. If you type your own, use only lower-case letters, digits and hyphens (`mika-tanaka`, not `Mika Tanaka`); the helper says so and asks again if it cannot use what you typed. What must never change are the character's *fixed traits*: short things you can read off a picture, like `skin=dark brown`. Write what the character *is*, never what the AI happened to draw; step 9 shows why. If the look does not mention a fixed trait, the helper points it out, because a picture prompt only asks for what the look says.

Now run the same command again for your second character. It does not ask for the story again: it uses the one your first character is in. Robots, animals and everyone else are written the same way. Came from the README's quick start? What you made there is already in the file, so run the helper only for the characters you have not made yet; if you copied June's box there, it adds yours next to her. Nothing is written until the last answer, so if you get stuck, press Ctrl and C together and start again.

### June and Abel: copy the box

Create `my-story/character-registry.json` (see *How to make a file*) with this text:

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

Then, in the terminal, type `pbpaste > character-registry.json` on a Mac, or `Get-Clipboard | Set-Content character-registry.json` on Windows, and press Enter. If you did the README's quick start, this file replaces the one you made there.

### What each part means

Either way, the registry has these parts. The helper writes the same ones with your words in them, spread over more lines.

| Part | Meaning |
|---|---|
| `june-okafor`, `abel-marsh` | The *id*: how you will refer to the character in every scene. Lower-case letters, digits and hyphens. Pick it once and never change it. |
| `name`, `full_name` | What the words come out as. `name` is what the story usually calls them. |
| `kind`, `story`, `role` | Required bookkeeping: `person` for any character, animals and robots included (the other kinds are for special cases, in [Registry fields](../3-reference/REGISTRY-FIELDS.md)), which story they belong to, one line on who they are. |
| `prose_only` | Tells the checker these characters live in written scenes, not in a scene table, so it does not ask where they are listed. |
| `forms.look` | How the character looks, written once. The picture prompt will ask for it with `{{june-okafor:look}}`. You can add other forms (`nickname`, `formal`) the same way. |
| `canon_tags` | The character's *fixed traits*: what must never change, as short tags you can read off a picture. June's dark brown skin is a story fact. Her hairstyle and coat are left out on purpose; step 9 shows why. Write what the character *is*, never what the AI happened to draw. |
| `token_sources` | Which files must never contain a typed name: here, every `scene-*.md`. |
| `coverage.ignore` | Files that are allowed to contain names: the rendered output in `built/`. |

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

Then, in the terminal, type `pbpaste > scene-01.md` on a Mac, or `Get-Clipboard | Set-Content scene-01.md` on Windows, and press Enter.

**Made your own characters?** Make the file from the box all the same. Then open it with `open -e scene-01.md` and change every `june-okafor` to your first character's id and every `abel-marsh` to your second's, the ids the helper printed. Keep the `{{` and `}}` around them, and save. The other words are about a lighthouse: you can keep them for now, because only the ids have to be yours for the next steps, or rewrite them for your story. In the picture prompt, write what to draw, never a name: *a messy garage*, not *Mika's garage*.

Notice that the picture prompt never says *June* or *Abel*. An image model does not know your characters by name. It knows them by look, and the look comes from the registry.

Now run the checker. The rest of the docs call it the *gate*: it stops anything with a typed name from going further.

```bash
node ../scripts/check.mjs
```

```text
character registry: pass (2 entries, 0 labels resolved on 0 surfaces, 1 token sources, 1 files scanned)
```

Want to see it catch something? Open the scene with `open -e scene-01.md` (on a Mac), change `{{june-okafor}}` on line 5 to `June` (count every line from the top, blank ones too), save, run the same command, and read:

```text
scene-01.md: line 5: names "June" in a token source. Fix: write {{june-okafor}}
character registry: fail (1 problem(s))
```

Put the token back. A misspelled token fails too, and the gate names the one you meant:

```text
scene-01.md: line 5: {{june-okafer}} is not a character in the registry. Fix: check the spelling: did you mean {{june-okafor}}?
character registry: fail (1 problem(s))
```

So does a token with a capital letter or a space in it, such as `{{June-okafor}}`: it would reach the chatbot as written, so the gate stops it.

If a scene calls June by another name, such as a nickname, add it to her `forms` in the registry, for example `"nickname": "Junie"`, and write `{{june-okafor:nickname}}` in the scene. The gate only knows the names the registry has.

## 5. Render the prompt sheet

*Rendering* swaps every token for its words and writes the result to a file you can paste from. That file is your *prompt sheet*.

```bash
node ../scripts/render.mjs scene-01.md --out built/scene-01.md
```

```text
render: scene-01.md -> built/scene-01.md (785 bytes; built output, do not edit)
```

The byte count follows your text. Open `built/scene-01.md` in your text editor (on a Mac, `open -e built/scene-01.md` does it):

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

Make a folder for the pictures:

```bash
mkdir renders
```

Your browser saves each picture in your Downloads folder, under a name the chatbot picked. Type `open renders` to see the new folder in Finder, then drag each picture into it and rename it by scene and the order you got it in:

```text
my-story/renders/scene-01-01.png
my-story/renders/scene-01-02.png
my-story/renders/scene-01-03.png
my-story/renders/scene-01-04.png
```

Keep the ending the file came with. If it downloaded as `.jpg` or `.webp`, name it `scene-01-01.jpg` or `scene-01-01.webp`, and use that same ending in the tags file in step 8. On a Mac, Finder may hide endings, which is how files end up as `scene-01-01.png.png`: in Finder choose Settings, then Advanced, and tick *Show all filename extensions*.

The order matters later. The first picture you got is `01`, the last is `04`. If you ask for a fifth, it is `05`, even if it replaces a bad one.

## 8. Look at each picture and write tags by hand

Now you be the judge. Open each of *your* pictures and write down what you actually see. Not what you asked for, and not the example below: what your picture shows.

For each character, track a few *traits*, things you can see: its fixed traits from `canon_tags`, plus whatever tends to drift. For June that is skin, hair and coat. For Abel it is skin, beard and sweater. In the file, each trait has a name, called its *key* (`skin`), and what you saw, called its *value* (`dark brown`).

The tool writes the file for you. Run it for June, look at each picture when it asks, and type what you see:

```bash
node ../scripts/tag.mjs june-okafor
```

This is one honest run, after the AI lost June's two puffs on the second try and never got them back. Your answers will be what your pictures show:

```text
Which traits do you want to write down for June? The fixed traits are: skin.
Type any others to track, with commas between them, like hair, coat. Press Enter for none.
> hair, coat
  Using: skin, hair, coat.
Look at each picture and type what you see. Type unknown if you cannot tell. From the second picture on, press Enter if a trait is the same as in the picture before.
Picture 1 of 4: renders/scene-01-01.png
  skin (fixed: dark brown)
> dark brown
  hair
> two puffs
  coat
> yellow
Picture 2 of 4: renders/scene-01-02.png
  skin (fixed: dark brown; Enter: dark brown)
> 
  hair (Enter: two puffs)
> loose curls
  coat (Enter: yellow)
> 
Picture 3 of 4: renders/scene-01-03.png
  skin (fixed: dark brown; Enter: dark brown)
> 
  hair (Enter: loose curls)
> 
  coat (Enter: yellow)
> 
Picture 4 of 4: renders/scene-01-04.png
  skin (fixed: dark brown; Enter: dark brown)
> 
  hair (Enter: loose curls)
> 
  coat (Enter: yellow)
> 
Wrote tags-june.jsonl: 4 pictures, 3 traits each.
Next: node ../scripts/anchor.mjs tags-june.jsonl --character june-okafor --ask
```

It wrote `tags-june.jsonl`, one line per picture, in order:

```json
{"image": "renders/scene-01-01.png", "order": 1, "tags": {"skin": "dark brown", "hair": "two puffs", "coat": "yellow"}}
{"image": "renders/scene-01-02.png", "order": 2, "tags": {"skin": "dark brown", "hair": "loose curls", "coat": "yellow"}}
{"image": "renders/scene-01-03.png", "order": 3, "tags": {"skin": "dark brown", "hair": "loose curls", "coat": "yellow"}}
{"image": "renders/scene-01-04.png", "order": 4, "tags": {"skin": "dark brown", "hair": "loose curls", "coat": "yellow"}}
```

Each question shows what Enter would repeat from the picture before. Read it before you press Enter: a beard that went grey in one picture is not grey in the next unless you look and see it.

Now Abel, with `sweater` as the extra trait. In this example his beard went grey in picture 3 only, so picture 4's beard is typed again:

```bash
node ../scripts/tag.mjs abel-marsh
```

```text
Which traits do you want to write down for Abel? The fixed traits are: skin, beard.
Type any others to track, with commas between them, like hair, coat. Press Enter for none.
> sweater
  Using: skin, beard, sweater.
Look at each picture and type what you see. Type unknown if you cannot tell. From the second picture on, press Enter if a trait is the same as in the picture before.
Picture 1 of 4: renders/scene-01-01.png
  skin (fixed: light brown)
> light brown
  beard (fixed: white)
> white
  sweater
> navy
Picture 2 of 4: renders/scene-01-02.png
  skin (fixed: light brown; Enter: light brown)
> 
  beard (fixed: white; Enter: white)
> 
  sweater (Enter: navy)
> 
Picture 3 of 4: renders/scene-01-03.png
  skin (fixed: light brown; Enter: light brown)
> 
  beard (fixed: white; Enter: white)
> grey
  Noted: that is not the fixed beard (white). If that is what this picture shows, type it exactly that way; press Enter to keep "grey".
> 
  sweater (Enter: navy)
> 
Picture 4 of 4: renders/scene-01-04.png
  skin (fixed: light brown; Enter: light brown)
> 
  beard (fixed: white; Enter: grey)
> white
  sweater (Enter: navy)
> 
Wrote tags-abel.jsonl: 4 pictures, 3 traits each.
Next: node ../scripts/anchor.mjs tags-abel.jsonl --character abel-marsh --ask
```

It wrote `tags-abel.jsonl`:

```json
{"image": "renders/scene-01-01.png", "order": 1, "tags": {"skin": "light brown", "beard": "white", "sweater": "navy"}}
{"image": "renders/scene-01-02.png", "order": 2, "tags": {"skin": "light brown", "beard": "white", "sweater": "navy"}}
{"image": "renders/scene-01-03.png", "order": 3, "tags": {"skin": "light brown", "beard": "grey", "sweater": "navy"}}
{"image": "renders/scene-01-04.png", "order": 4, "tags": {"skin": "light brown", "beard": "white", "sweater": "navy"}}
```

You can also write these files yourself, in the format above, the way you made the other files. Every line is one picture, in order. Use the same keys on every line, and copy the fixed traits' values exactly as the registry writes them. Keep the double quotes and commas exactly as shown: a missing quote stops the next step with a message that names the file and the line, like `tags-june.jsonl: line 2, column 104: this is not valid JSON.`

No model, no account and no internet were needed for this step. Your eyes did it.

## 9. Answer two questions and read the answer

The *anchor* is the one picture every later picture should match. Picking it is a decision, so the tool asks you two questions in plain words and tells you what each answer would cost. Run it for June:

```bash
node ../scripts/anchor.mjs tags-june.jsonl --character june-okafor --ask
```

Press Enter at both questions, then type `n` and press Enter when it offers to record:

```text
What about June must never change? Type each trait like skin=dark brown, with commas between them.
  The registry says: skin=dark brown. Press Enter to keep that, or type the whole list you want instead.
> 
  Using: skin=dark brown.
For everything else, which look do you want?
  1. fewest redraws (default)
  2. the first look
  3. the last look
> 
  Using: fewest redraws.
Keep renders/scene-01-02.png as the one true picture of June.
Redraw 1 picture: renders/scene-01-01.png.
  Counted by your tags, not measured by a model.
If you answered differently: the first look would keep renders/scene-01-01.png and redraw 3; the last look would keep renders/scene-01-04.png and redraw 1.
Record this as June's anchor in the registry? Type y and press Enter to record it, or just press Enter to skip.
> n
Not recorded. Ask again when you have decided, or add --write to the command.
```

After each answer the tool says back what it will use, so you can see that it understood you. You can type a trait as `skin=dark brown` or `skin: dark brown`, and capital letters do not matter. If it cannot read an answer, it says what it could not read and asks again.

What happened:

- **Question 1** is what must never change. The registry already answers it with June's fixed traits (`canon_tags`), so Enter keeps that answer. Only pictures that have every fixed trait can be the anchor; pictures without them are always redrawn. All four pictures have dark brown skin, so all four qualify.
- **Question 2** is which look you want for everything else. *Fewest redraws* keeps the look most of the pictures already have. The AI drew loose curls three times out of four, so that is the look it keeps: picture 2, and only picture 1 (two puffs) would be redrawn. *The first look* is picture 1, at the price of three redraws. *The last look* is picture 4, same loose curls, one redraw.
- **Counted by your tags.** You gave tags, not numbers. An *embedding* is a long list of numbers a model computes from a picture so that similar pictures get similar numbers. Without embeddings the tool cannot measure how far a picture drifted, so it counts the pictures whose tags differ from the chosen one, and says so.

Now the decision is yours, and it is a real one. The registry's `look` asked for two puffs; the AI gave you loose curls, and loose curls is cheapest. If you are happy with loose curls, take the default and change `look` in the registry to say loose curls, so your next prompt asks for what you are keeping. If two puffs is part of who June is, it belongs in question 1. Ask again, and this time type the whole list, skin included. A typed answer replaces what the registry says, and if you leave a trait out the tool tells you it is not kept this time:

```bash
node ../scripts/anchor.mjs tags-june.jsonl --character june-okafor --ask
```

```text
What about June must never change? Type each trait like skin=dark brown, with commas between them.
  The registry says: skin=dark brown. Press Enter to keep that, or type the whole list you want instead.
> skin=dark brown, hair=two puffs
  Using: skin=dark brown, hair=two puffs.
For everything else, which look do you want?
  1. fewest redraws (default)
  2. the first look
  3. the last look
> 
  Using: fewest redraws.
Keep renders/scene-01-01.png as the one true picture of June.
Redraw 3 pictures: renders/scene-01-02.png, renders/scene-01-03.png, renders/scene-01-04.png.
  3 pictures lack what must never change (skin=dark brown, hair=two puffs) and are always redrawn.
  Counted by your tags, not measured by a model.
If you answered differently: the first look would keep renders/scene-01-01.png and redraw 3; the last look would keep renders/scene-01-01.png and redraw 3.
Record this as June's anchor in the registry? Type y and press Enter to record it, or just press Enter to skip.
> y
Recorded in character-registry.json. Next time, attach renders/scene-01-01.png to your chatbot message and paste the picture prompt.
```

Three redraws instead of one. That is the price of insisting, and the tool shows it rather than deciding for you. If you want this answer to stick, add `"hair": "two puffs"` to June's `canon_tags` in the registry, and next time Enter is enough.

Now Abel. His fixed traits are his skin and his white beard; the one picture where the beard went grey is out, whatever you answer:

```bash
node ../scripts/anchor.mjs tags-abel.jsonl --character abel-marsh --ask
```

```text
What about Abel must never change? Type each trait like skin=dark brown, with commas between them.
  The registry says: skin=light brown, beard=white. Press Enter to keep that, or type the whole list you want instead.
> 
  Using: skin=light brown, beard=white.
For everything else, which look do you want?
  1. fewest redraws (default)
  2. the first look
  3. the last look
> 
  Using: fewest redraws.
Keep renders/scene-01-01.png as the one true picture of Abel.
Redraw 1 picture: renders/scene-01-03.png.
  1 picture lacks what must never change (skin=light brown, beard=white) and is always redrawn.
  Counted by your tags, not measured by a model.
If you answered differently: the first look would keep renders/scene-01-01.png and redraw 1; the last look would keep renders/scene-01-04.png and redraw 1.
Record this as Abel's anchor in the registry? Type y and press Enter to record it, or just press Enter to skip.
> y
Recorded in character-registry.json. Next time, attach renders/scene-01-01.png to your chatbot message and paste the picture prompt.
```

June's list and Abel's list are about the same four pictures. A picture on either list is one to make again: here, with two puffs kept, pictures 2, 3 and 4. Step 11 shows how to redraw one.

Your pictures and tags will differ from these, and so will the pictures it names. That is right: it is reading your judgement, not guessing.

If no picture has the fixed traits, the tool first asks you to check (the tags may say it another way), then says so instead of picking the least bad one. Here every picture was tagged `medium brown`, after June's anchor was recorded with two puffs kept:

```text
None of the pictures has what must never change (skin=dark brown, hair=two puffs). Your tags say: skin=medium brown (4 pictures); hair=two puffs (1 picture), hair=loose curls (3 pictures). If your tags mean the same thing, write it the same way in both places. If the pictures really drifted, paste the prompt sheet again, tag the new pictures, and ask again.
```

Then go back to step 6, paste the same sheet again, and tag the new pictures as `05`, `06` and so on.

## 10. Read what was recorded

You answered `y`, so the choice is saved in the registry. The tool rewrites the whole file when it saves, so the file is now longer and laid out differently. That is expected. Open `character-registry.json` and look at June. A block like this has appeared:

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

You do not need to read every line. Three matter. `image` is the picture every later picture should match. `keep` is your answer to question 1. `prefer` is your answer to question 2. The long `sha256` is a fingerprint of the picture file, and `chosen_at` is when you chose, so yours will differ. Run the gate once more:

```bash
node ../scripts/check.mjs
```

```text
character registry: pass (2 entries, 0 labels resolved on 0 surfaces, 1 token sources, 4 files scanned)
```

## 11. What to paste next time

Write `scene-02.md` the same way you wrote scene 1, with tokens. A short one is enough:

```markdown
# Scene 2: The lamp

## Story text

{{june-okafor}} struck the match. {{abel-marsh}} cupped his hands around the flame.

## Picture prompt

Children's picture-book illustration, soft watercolor, night. Outside the top of a lighthouse, on the iron walkway. Two characters:

- {{june-okafor:look}}, striking a match.
- {{abel-marsh:look}}, cupping his hands around the flame.

Avoid: text, letters, extra people, modern clothes.
```

Then, in the terminal, type `pbpaste > scene-02.md` on a Mac, or `Get-Clipboard | Set-Content scene-02.md` on Windows, and press Enter.

Run the gate, then render it. Render also refuses a scene with a typed name or a broken token in it, but the gate checks every file at once:

```bash
node ../scripts/check.mjs
node ../scripts/render.mjs scene-02.md --out built/scene-02.md
```

```text
character registry: pass (2 entries, 0 labels resolved on 0 surfaces, 2 token sources, 5 files scanned)
render: scene-02.md -> built/scene-02.md (570 bytes; built output, do not edit)
```

Paste the picture prompt from `built/scene-02.md`, and add one thing: the anchor.

- If your chatbot lets you attach a picture, attach `renders/scene-01-01.png` (the anchor named in the registry): type `open renders` and drag that picture onto the chat, or use the chat's attach button and find it in your `my-story` folder. Start your message with: *Keep the two characters exactly as in the attached picture.* Then paste the picture prompt.
- If it does not, paste the picture prompt as before. The words are the same every time, which is the best you can do when the chatbot cannot see your pictures.

To redraw one picture, paste its scene's picture prompt again with the anchor attached, and start your message with: *Make this picture again. Keep the characters exactly as in the attached picture.* Save the new picture with the next number (`05`), tag it, and ask again.

After every batch: save, name in order, tag, ask the two questions again, and redraw the pictures on the `Redraw` lines. When you ask again, question 1 starts from what you recorded last time (`Last time you recorded: ...`), so Enter keeps it. If an answer would change the recorded picture, the record question says so before you type `y`. The decision is always in the registry, never in your memory.

## Where to go next

- The whole loop in detail, with file naming, tagging conventions, how to answer the two questions, and what an API adds: [How to work from a browser chatbot](../2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md).
- Both answers on one line, for next time: `node ../scripts/anchor.mjs tags-june.jsonl --character june-okafor --keep "skin=dark brown" --keep "hair=two puffs" --prefer fewest-redraws`. Add `--write` to record. Its report uses the names the answers have inside the tool: fewest redraws is `consensus`, the first look `origin`, the last look `terminal`.
- You already have pages with names typed out: `node ../scripts/tokenize.mjs old-draft.md --text --dry-run` shows what it would change; drop `--dry-run` to do it.
- Every field of the registry, with what the gate does for each: [Registry fields](../3-reference/REGISTRY-FIELDS.md).
- You have an API or a local model and want the tool to score pictures and price the drift: [How to resolve character drift after the fact](../2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md).
