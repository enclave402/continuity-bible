# Narrative Token SSOT

> Keep your characters the same people from the first picture to the last. One file says who they are. Your story pages and picture prompts point at that file instead of repeating it. A checker catches the slip before you paste.
>
> *SSOT* stands for single source of truth: one place where each fact about your story lives.

[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](LICENSE)
[![Used in: rel8r.me](https://img.shields.io/badge/Used_in-rel8r.me-ff1484.svg)](https://rel8r.me/reader.html?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot)
[![Ecosystem: SloppyXBaby](https://img.shields.io/badge/Developer_Kits-sloppyxbaby.com-black.svg)](https://sloppyxbaby.com/?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot)

**[Start here (about an hour)](docs/1-tutorials/START-HERE.md)** · **[Work from a browser chatbot](docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md)** · **[See it live](https://rel8r.me/reader.html?utm_source=github&utm_medium=readme-nav&utm_campaign=narrative-token-ssot)** · **[For developers](#for-developers)** · **[Using an AI coding agent? Read AGENTS.md](AGENTS.md)**

---

## The problem

You ask an AI for a picture of your hero. It is wonderful. On page 3 her hair is different. On page 7 she is a different child. By the end of the book you are pasting the same long description every time, and the AI still forgets.

Names slip too. Samantha turns into Sam, then Sammy, then the AI gives her a new last name. If you ever rename someone, you hunt through every page and every prompt and hope you caught them all.

A rule at the top of the chat ("always keep her hair red") makes this rarer. It does not make it impossible, because nothing checks.

## The promise

AI stories without AI slop, the generic pictures that change from page to page. Unique art that stays yours. Characters steady enough to make a book.

This is a small, free tool: a folder of scripts that run on your own computer. It does four things.

1. **Writes each character down once.** Name, full name, how they look. That file is the *registry*.
2. **Replaces names in your pages with tokens.** You write `{{june-okafor}}` instead of *June*. A *token* is a placeholder in double curly braces that the tool swaps for the real words. Because the words live in one place, the checker can tell you the moment a name or a look was typed by hand somewhere else, and a rename is one edit.
3. **Picks the reference picture after the AI has already drifted.** It asks you two questions: what about this character must never change, and, for everything else, do you want the fewest redraws, the first look or the last look. It shows what each answer costs, and writes your choice down so nobody has to remember it.
4. **Carries everything else from one picture to the next.** What each character wears, has on and holds, where they are and what time it is: written once per story day, carried forward shot by shot, with every change recorded with its reason. One block to paste per picture.

It works with whatever AI you already use. A browser chatbot that makes pictures is enough. Every script in this guide only reads and writes files on your computer and never goes on the internet. Nothing is installed beyond Node, and there is no account.

## The quickest win, no setup

Keep the one picture where your character looks right. Attach it to every new request, and start your message with: *Keep the characters exactly as in the attached picture.* That alone helps a lot. It still depends on you describing the character the same way every time, and on you noticing when the AI slips. The tool below does both for you.

## Quick start

You need three things:

- **Node**, a free program that runs the tool's scripts, version 18 or newer. Go to [nodejs.org](https://nodejs.org), download the version marked *LTS*, and run the installer. On a Mac it asks for the computer's password, so you may need a parent's help. School computers often block installing programs; use a home computer if so.
- **A terminal**, a window where you type a command and press Enter. On a Mac: press Cmd and Space, type `Terminal`, press Enter. On Windows: press the Windows key, type `PowerShell`, press Enter.
- **A browser chatbot that can make pictures.** Any one you already use.

**How to make a file.** Below, each file's text is in a grey box.

1. Press the copy button on the box, or select all of its text and copy it.
2. In the terminal, *type* the command shown under the box and press Enter. Do not copy that command: copying it would replace the text you just copied. It prints nothing: that means it worked.

On a Mac the command is `pbpaste >` and the file name. On Windows it is `Get-Clipboard | Set-Content` and the file name. This way nothing can change the text on the way. You can copy the other commands on these pages, like `mkdir my-story`; only the `pbpaste` line has to be typed. A word processor such as TextEdit can turn quotes curly, save rich text, or add `.txt` to the name, and any of those breaks the file. If you use TextEdit anyway, choose Format, then Make Plain Text, before you paste. These steps were tested on a Mac.

**Coming back another day?** Open a terminal, type `cd ` with a space after it, drag your `my-story` folder onto the terminal window, and press Enter.

### 1. Get the folder

On the [project page](https://github.com/enclave402/narrative-token-ssot) press **Code**, then **Download ZIP**, and open the ZIP to unzip it. In the terminal, type `cd ` with a space after it, drag the unzipped folder onto the terminal window, and press Enter. If you use git, `git clone https://github.com/enclave402/narrative-token-ssot.git` and `cd narrative-token-ssot` do the same.

Check that Node is installed:

```bash
node --version
```

It should print `v18` or higher.

### 2. Write one character and one scene

Make a folder for your story inside the one you just downloaded, and make two files in it (see *How to make a file* above).

```bash
mkdir my-story
cd my-story
```

Before you make a file, type `pwd` and press Enter. The last part must be `my-story`; if it is not, type `cd my-story` first, or the file lands in the wrong folder.

`my-story/character-registry.json` is the registry. **For your own character**, a helper asks about it and writes the file for you. Type the answer to each question and press Enter:

```bash
node ../scripts/new-character.mjs
```

<details>
<summary>What a run looks like (this one made June)</summary>

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

</details>

Then make `scene-01.md` from its box further down, open it with `open -e scene-01.md`, change both `june-okafor` to the id the helper gave you, and save. The [tutorial's step 3](docs/1-tutorials/START-HERE.md#3-write-two-characters-into-the-registry) says more about each question.

**For June instead**, copy this box. Skip it if the helper made your file: pasting it would replace your character.

```json
{
  "registry_version": 1,
  "token_sources": [{ "file": "scene-*.md" }],
  "coverage": { "ignore": ["built/**"] },
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
    }
  }
}
```

Then, in the terminal, type `pbpaste > character-registry.json` on a Mac, or `Get-Clipboard | Set-Content character-registry.json` on Windows, and press Enter.

`my-story/scene-01.md` is your scene. Names and looks are tokens. Copy this box:

```markdown
# Scene 1: The ladder

## Story text

{{june-okafor}} held the bottom of the ladder with both hands. "Is it heavy?" she called up.

## Picture prompt

Children's picture-book illustration, soft watercolor, warm dusk light. Inside the top of a lighthouse, a big brass lamp in the middle.
{{june-okafor:look}}, holding the bottom of a wooden ladder, looking up.
Avoid: text, letters, extra people, modern clothes.
```

Then, in the terminal, type `pbpaste > scene-01.md` on a Mac, or `Get-Clipboard | Set-Content scene-01.md` on Windows, and press Enter.

### 3. Turn the tokens into words, then paste

```bash
node ../scripts/render.mjs scene-01.md
```

```text
# Scene 1: The ladder

## Story text

June held the bottom of the ladder with both hands. "Is it heavy?" she called up.

## Picture prompt

Children's picture-book illustration, soft watercolor, warm dusk light. Inside the top of a lighthouse, a big brass lamp in the middle.
a nine-year-old girl with dark brown skin, black curls tied in two puffs, a yellow raincoat and red boots, holding the bottom of a wooden ladder, looking up.
Avoid: text, letters, extra people, modern clothes.
```

Copy the lines under **Picture prompt** into your chatbot and ask for the picture. For the next scene, write the tokens again. The look comes out word for word the same, because it exists in exactly one place.

**Next:** [Start here](docs/1-tutorials/START-HERE.md) adds a second character, saves the pictures, and shows what to do when the AI drifts anyway. You already have the folder and `my-story`, so start it at step 3.

## What it does, one command each

Every command below runs from inside your story folder (`my-story`).

### Catches a typed name before you paste it

```bash
node ../scripts/check.mjs
```

```text
character registry: pass (1 entries, 0 labels resolved on 0 surfaces, 1 token sources, 1 files scanned)
```

If you (or an AI helper) type *June* into a scene instead of the token, the same command stops and tells you the fix:

```text
scene-02.md: line 5: names "June" in a token source. Fix: write {{june-okafor}}
character registry: fail (1 problem(s))
```

A token with a typo fails too. For `{{june-okafer}}` the checker says `did you mean {{june-okafor}}?`. A capital letter or a space inside a token, like `{{June-okafor}}`, fails as well. Otherwise it would reach the chatbot as written. The rest of the docs call this checker the *gate*.

### Renames a character everywhere at once

Change `"name": "June"` in the registry, then write the words into a file you can paste from:

```bash
node ../scripts/render.mjs scene-01.md --out built/scene-01.md
```

```text
render: scene-01.md -> built/scene-01.md (486 bytes; built output, do not edit)
```

Every scene picks up the new name the next time you render it. Nothing to find, nothing to replace. Files under `built/` are output: edit the scene, never the output.

### Turns an old draft into tokens

Already have pages with names typed out? One command swaps them for tokens, longest names first, whole words only, and shows you what it would do before it does it. Say `old-draft.md` reads *June held the ladder. June Okafor was nine.* and then spells out her look:

```bash
node ../scripts/tokenize.mjs old-draft.md --text --dry-run
```

```text
tokenize: old-draft.md: 3 replacement(s) across 3 label(s) (dry run, nothing written)
     1  a nine-year-old girl with dark brown skin, black curls tied in two puffs, a yellow raincoat and red boots
     1  June Okafor
     1  June
```

Drop `--dry-run` to write the change. A name that two characters share is skipped and reported, never guessed.

### Picks the reference picture after the AI drifts

Save the pictures the chatbot gave you in a `renders` folder. Then `node ../scripts/tag.mjs june-okafor` asks what you see in each one (skin, hair, coat) and writes it down for you. Then ask. The tool asks you two questions and answers in plain words. With the four example pictures from the tutorial, where the AI lost June's two puffs after the first try:

```bash
node ../scripts/anchor.mjs tags-june.jsonl --character june-okafor --ask
```

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

The first question is answered by the registry: June's dark brown skin is a story fact, so only pictures that have it can be the *anchor*, the one picture every later picture should match, and pictures without it are always redrawn. The second question is yours. *Fewest redraws* keeps the look most pictures already have (here the loose curls the AI drifted to) and costs one redraw. *The first look* keeps the two puffs you asked for and costs three. The tool shows both prices and never decides for you. Answer `y` and the choice is written into the registry. The [tutorial](docs/1-tutorials/START-HERE.md) walks through the whole thing with real pictures.

### Carries wardrobe, props and place from one shot to the next

Write how each character starts the day (a *continuity card*) and your scenes with their shots (a *shot sheet*). Everything carries forward by itself; a change needs a reason; a prop can be held only by whoever has it. One block per shot. The command below needs those two files, and the last two lines need the render surface described after the block. The [shot-to-shot how-to](docs/2-how-to/HOW-TO-KEEP-CONTINUITY-SHOT-TO-SHOT.md) has you write all of it one step at a time, so the command will not run in a folder that does not have them yet. Here is what it prints at the end of that walk:

```bash
node ../scripts/compile-shot.mjs scene-02 --shot 2b
```

```text
=== scene-02 · shot 2b (close-up) · day-1: The night the lamp is lit ===
CHARACTER 1: a nine-year-old girl with dark brown skin and black curls tied in two puffs. WEARING: yellow raincoat over striped jersey, blue dungarees, red boots. HAIR: two puffs, a little loose on the left. IN HAND: a dented tin matchbox with a faded blue label. ACTION: strikes the match, face lit from below. EYELINE: at the flame.
SHOT: close-up. SETTING: the narrow iron walkway outside the top of the lighthouse, a railing, the sea far below. TIME: night. WEATHER: clear, a cold wind off the sea.
CHANGED SINCE THE LAST SHOT: nothing.
KEEP (Picture-book page, landscape, wider than tall): children's picture-book illustration, soft watercolor; the characters exactly as in the anchor pictures; every hand shows five fingers.
AVOID: lighter, cardboard matchbox, dusk, sunset, orange sky, modern clothes, extra people, speech bubbles, text.
```

The matchbox is in June's hand because, two shots earlier, the sheet says Abel handed it to her and why. Take that reason out, or write *sunset* into a night shot, and the gate stops with the line to fix. The last two lines come from a *render surface*: where will this picture be used? A page of the book has its own look rules, a sticker has others; each is written once in the registry, every prompt gets the right ones, and a template that retypes a rule is refused. The two files and the whole walk: [How to keep continuity from shot to shot](docs/2-how-to/HOW-TO-KEEP-CONTINUITY-SHOT-TO-SHOT.md).

### Keeps the story itself straight: a record per spread, a list per reading order

Your story is six records and two lists, not twelve pages. Each spread (its title, words, the one-sentence picture description, the picture files) is written once under a short name; a reading order is a list of those names, and there can be several. The spread numbers come from the lists. Retiring a spread means moving its name to a `retired` list: the record stays, the picture stays, parked with a reason, and the three checks refuse a built page that no longer matches, a picture kept or lost by accident, and a deletion with no note. With the folder's own example story, from the repository folder:

```bash
node scripts/story.mjs list examples/story
```

```text
Six Hours: 6 scene(s), 2 edition(s) (sam-first, theo-first), 1 retired in every edition.
slug                      sam-first  theo-first  title
the-porch                 1          3           The porch
read-at-1152              2          4           Read at 11:52
the-napkin-timeline       retired    retired     The napkin timeline
across-town               3          1           Across town
morning-at-the-workbench  4          2           Morning at the workbench
the-text-sent             5          5           The text, sent
```

The porch is spread 1 in one telling and spread 3 in the other, and nobody typed either number. `node scripts/story.mjs render examples/story theo-first` prints that telling the way a reader meets it; `node scripts/story.mjs check examples/story` runs the three checks. Moving a spread, resting one, and telling the story in a new order, step by step: [How to retire a spread without losing it, and tell the same story in two orders](docs/2-how-to/HOW-TO-REORDER-AND-RETIRE-SPREADS.md).

### Tests a change to the words before you make it, and writes the winner back

Try an edit on readers before it touches your files. A variant is a named change to the text (replace a phrase in one spread or in every spread, leave a spread out, a line to the reader, a spread from a draft), applied to the text a reader meets, never to your records, so the text a reader tested can be made again from its name. With the example story, from the repository folder:

```bash
node scripts/story-variants.mjs diff examples/story sam-first shorter-porch+rest-the-workshop
```

```text
shorter-porch+rest-the-workshop on sam-first: 4 spreads (base has 5); 1 changed, 1 dropped, 0 added, banner unchanged
spread 1 of 4: the-porch: 1 line(s) out, 1 in
  - Chloe dug through her bag for her keys while Sam read the message again under the porch bulb. It was the fourth time since the cab.
  + Chloe dug through her bag for her keys while Sam read the message again under the porch bulb. The fourth time since the cab.
dropped: across-town (was spread 3 of 5; retired in every edition when applied)
```

`render` prints each version for your readers; when one wins, `apply` writes exactly it into the records, names as tokens, and proves the records render as the tested text, or puts every file back. A spread an AI drafted and the readers liked is not written: it becomes a labelled empty place in the book, draft beside it, until you write it. The loop, and the three rules an AI is held to: [How to test a change to the words before you make it](docs/2-how-to/HOW-TO-TEST-A-CHANGE-BEFORE-YOU-MAKE-IT.md).

## For developers

The same engine runs the name build of a published 82-scene graphic novel. Plain Node, zero dependencies, no telemetry. Only the optional research tools under `scripts/research/` use the network, and only at the endpoints in `research/research.config.json`. `npm run check` is the gate, `npm test` the tests, `npm run check:story` the story gates, `npm run verify` everything.

**Tokens.** `{{id}}` display name, `{{id:first}}` first word, `{{id:full}}` full name, `{{id:initial}}` first letter, `{{id:<form>}}` any key under `forms` (a string, or a contextual form `{ "by": "<field>", "values": {...} }` picked by the scene's own field). An unknown id, an unknown form or a token lookalike such as `{{June-okafor}}` fails the gate and `render.mjs` for every declared token source, so a build never prints a token there and never guesses a name; `other_placeholders: true` on a `token_sources` entry exempts a file that also feeds another template tool. Resolver: `scripts/names.mjs` (`loadNames(root).resolveTokens(text)`).

**The registry declares what the gate checks.** `surfaces` (scene files, art manifests, heading documents, name paths: every label must resolve to exactly one entry allowed in that story), `token_sources` (files that may hold tokens but no written-out name), `records` (dated history, left alone) and `coverage.ignore` (docs that show names on purpose). Any other tracked file that names a character is reported, so the gate is never silent about a file.

| You declare | The gate does |
| :--- | :--- |
| A prop as an entry (`"kind": "prop"`, `prompt_tokens`) and `"props": ["brass-key"]` on the scene | resolves the id; never matches a prop's name inside prose |
| A contextual form: `"attitude": { "by": "stage", "values": { "childhood": "…", "adult": "…", "default": "…" } }` | `{{brass-key:attitude}}` renders the variant the scene's own `stage` picks; no match and no default fails the build |
| `exclusive_markers` on a scene file: `time_of_day` → `morning: [sunrise, …]`, `evening: [lamplight, …]` | fails a scene labelled evening whose text says sunrise |
| `forbid_keys` on a manifest: `visualDescription` is owned by the scene file | fails a manifest entry that still carries its own copy |
| `canon_tags` (fixed traits) on an entry, `drift_resolution` defaults (`prefer` or `policy`) | `scripts/anchor.mjs` answers two questions over any encoder's embeddings or hand tags: `--keep tag=value` (what must never change; only images carrying every kept tag are eligible, the rest are always billed) and `--prefer fewest-redraws|first-look|last-look|most-common` (`consensus`, `origin`, `terminal`, `mode` among the eligible images; `canon` is keep + consensus). `--ask` asks both on the terminal. The bill is by cosine with embeddings and by tags without (`stats.bill_basis`); `--write` records image, policy, prefer, keep and stats under `characters.<id>.anchor` |
| A `continuity-cards` surface (how each character starts each story day) and a `shot-sheet` surface (scenes and shots in order) | `carryContinuity()` in `scripts/lib.mjs` carries wardrobe, hair, accessories, marks and carried props shot by shot; the gate fails a change without a reason, a prop in a hand that never received it, a missing card, a contradicted time or place; `scripts/compile-shot.mjs` renders one block per shot, character first, AVOID from the declared vocabularies |
| A story folder: `scenes.json` (one record per scene, `scripts/scene.v1.schema.json`), `editions/<id>.json` (`order`, `retired`; `scripts/edition.v1.schema.json`), `art/`, `parked-art.json`, `built/` | `scripts/story.mjs` derives every spread number from position and refuses an unknown slug, a slug listed twice, a scene neither placed nor retired; renders each edition as a reader meets it; `check-story-built.mjs` fails built output that differs from the source, `check-story-art.mjs` fails a missing or unparked picture (`--park --reason` writes the manifest), `check-story-retired.mjs` fails a retired scene's missing picture or a git deletion without the author's note |
| `variants.json` in a story folder (`scripts/variants.v1.schema.json`: named steps `replace`/`with`/`in`, `drop`, `banner`, `add`/`after`/`draft`), an optional `banner` on an edition, `new-*` slot records | `scripts/story-variants.mjs` renders an edition with a variant applied to the text and never to the records (`render`, `diff`), and `apply` writes the winner back: parser checked against every record, only differing fields written with names put back as tokens and verified, dropped spreads retired and parked, an added spread made a slot (notes only; the loader refuses a slot with words or fields), `built/` rebuilt, the written records rendered equal to the tested text spread for spread and the names gate green, else every file restored; `variants-applied.json` records what was done and left |
| `render_surfaces` (where a picture will be used: name, `style_lock`, `must_keep`, `exclude`, `size`, `no_text`, `hands_rule`, `why`) and `render_templates` globs | every shot names its surface; the block ends with KEEP and AVOID compiled from it; a template, prompt or token source that retypes a rule phrase verbatim fails with the file, the phrase and "read it from the surface" |

From the repository root:

```bash
node scripts/anchor.mjs examples/anchor/embeddings.jsonl --prefer fewest-redraws
node scripts/anchor.mjs examples/anchor/embeddings.jsonl --keep "hair=copper red" --prefer first-look
node scripts/anchor.mjs examples/anchor/embeddings.jsonl --ask
node scripts/sheet.mjs examples/anchor/embeddings.jsonl --out sheet.html   # every picture on one page: anchor, redraws, replaced, cannot tell
node scripts/research/ask.mjs "how do I keep a prop consistent across panels"
```

- Adopt it in a repo: [HOW-TO-ADOPT-THE-REGISTRY.md](docs/2-how-to/HOW-TO-ADOPT-THE-REGISTRY.md). Every field: [REGISTRY-FIELDS.md](docs/3-reference/REGISTRY-FIELDS.md), [CONTINUITY-CARD-AND-SHOT-SHEET-FIELDS.md](docs/3-reference/CONTINUITY-CARD-AND-SHOT-SHEET-FIELDS.md), [SCENE-AND-EDITION-FIELDS.md](docs/3-reference/SCENE-AND-EDITION-FIELDS.md), [VARIANTS-AND-THE-APPLIED-RECORD.md](docs/3-reference/VARIANTS-AND-THE-APPLIED-RECORD.md). The story as records and editions: [ADR-006](docs/4-explanation/decisions/ADR-006-story-as-records-and-editions.md); the edit round trip and the owner's-words boundary: [ADR-007](docs/4-explanation/decisions/ADR-007-variants-round-trip-and-owners-words.md). The eight ways a continuity system goes quiet: [CONTINUITY-ISSUE-CLASSES.md](docs/3-reference/CONTINUITY-ISSUE-CLASSES.md). Shot-to-shot design and its open loops: [ADR-005](docs/4-explanation/decisions/ADR-005-continuity-card-and-shot-sheet.md).
- Drift anchors with real embeddings (encoder families, thresholds, budgets): [HOW-TO-RESOLVE-CHARACTER-DRIFT.md](docs/2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md); decision: [ADR-004](docs/4-explanation/decisions/ADR-004-retrospective-anchor-policy.md).
- Research, not vibes: claims trace to cards, findings and verified sources in [`research/`](research/README.md); process: [HOW-TO-INGEST-RESEARCH.md](docs/2-how-to/HOW-TO-INGEST-RESEARCH.md). The toolchain runs on any OpenAI-compatible or Ollama endpoint; defaults are local.
- How this repo is run (public by construction, nothing hardcoded, one worklog, docs by reader intent, local gates, humans merge): [REPOSITORY-NORMS.md](docs/4-explanation/REPOSITORY-NORMS.md), [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md), [docs/README.md](docs/README.md).

---

## Where it's used

It came out of, and still runs, the build for:

- **[Dating Red Flags](https://rel8r.me/reader.html?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot)**: an illustrated graphic novel on [rel8r.me](https://rel8r.me/?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot), an on-device relationship self-regulation tool.
- **82 illustrated scenes** across two dual-narrative editions (Sam-first and Theo-first), with every character name resolved from one registry file.

---

## Related

This repo is free and MIT licensed. I'm packaging the rest of the guardrails I use with coding agents (git worktree isolation, repo rules that hold up across sessions) as the paid [Antidote Kit](https://sloppyxbaby.com/?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot).

---

## License & Credits

- Architecture and implementation by **[Coach Hype](https://coachhype.com/?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot)**.
- Released under the [MIT License](LICENSE). Free for personal and commercial projects.
