# Narrative Token SSOT

> Keep your characters the same people from the first picture to the last. One file says who they are. Your story pages and picture prompts point at that file instead of repeating it. A checker catches the slip before you paste.

[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](LICENSE)
[![Used in: rel8r.me](https://img.shields.io/badge/Used_in-rel8r.me-ff1484.svg)](https://rel8r.me/reader.html?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot)
[![Ecosystem: SloppyXBaby](https://img.shields.io/badge/Developer_Kits-sloppyxbaby.com-black.svg)](https://sloppyxbaby.com/?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot)

**[Start here (about 30 minutes)](docs/1-tutorials/START-HERE.md)** · **[Work from a browser chatbot](docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md)** · **[See it live](https://rel8r.me/reader.html?utm_source=github&utm_medium=readme-nav&utm_campaign=narrative-token-ssot)** · **[For developers](#for-developers)** · **[Using an AI coding agent? Read AGENTS.md](AGENTS.md)**

---

## The problem

You ask an AI for a picture of your hero. It is wonderful. On page 3 her hair is different. On page 7 she is a different child. By the end of the book you are pasting the same long description every time, and the AI still forgets.

Names slip too. Samantha turns into Sam, then Sammy, then the AI gives her a new last name. If you ever rename someone, you hunt through every page and every prompt and hope you caught them all.

A rule at the top of the chat ("always keep her hair red") makes this rarer. It does not make it impossible, because nothing checks.

## The promise

AI stories without AI slop. Unique art that stays yours. Characters steady enough to make a book.

This is a small, free tool: a folder of scripts that run on your own computer. It does three things.

1. **Writes each character down once.** Name, full name, how they look. That file is the *registry*.
2. **Replaces names in your pages with tokens.** You write `{{june-okafor}}` instead of *June*. A *token* is a placeholder in double curly braces that the tool swaps for the real words. Because the words live in one place, the checker can tell you the moment a name or a look was typed by hand somewhere else, and a rename is one edit.
3. **Picks the reference picture after the AI has already drifted.** It asks you two questions: what about this character must never change, and, for everything else, do you want the fewest redraws, the first look or the last look. It shows what each answer costs, and writes your choice down so nobody has to remember it.

It works with whatever AI you already use. A browser chatbot that makes pictures is enough. The scripts never touch the network, nothing is installed beyond Node, and there is no account.

## Quick start

You need two things: [Node](https://nodejs.org) (free; version 18 or newer) and a browser chatbot that can make pictures.

### 1. Get the folder

```bash
git clone https://github.com/enclave402/narrative-token-ssot.git
cd narrative-token-ssot
node --version
```

No git? On the GitHub page press **Code**, then **Download ZIP**, unzip it, and open a terminal in that folder. `node --version` should print `v18` or higher.

### 2. Write one character and one scene

Make a folder for your story inside the one you just downloaded, and put two files in it.

```bash
mkdir my-story
cd my-story
```

`my-story/character-registry.json` is the registry. Copy it exactly:

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

`my-story/scene-01.md` is your scene. Names and looks are tokens:

```markdown
# Scene 1: The ladder

## Story text

{{june-okafor}} held the bottom of the ladder with both hands. "Is it heavy?" she called up.

## Picture prompt

Children's picture-book illustration, soft watercolor, warm dusk light. Inside the top of a lighthouse, a big brass lamp in the middle.
{{june-okafor:look}}, holding the bottom of a wooden ladder, looking up.
Avoid: text, letters, extra people, modern clothes.
```

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

**Next:** [Start here](docs/1-tutorials/START-HERE.md) adds a second character, saves the pictures, and shows what to do when the AI drifts anyway.

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

A token with a typo fails too: `{{june-okafer}}` prints `unknown token {{june-okafer}}` instead of guessing a name. The rest of the docs call this checker the *gate*.

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

Save the pictures the chatbot gave you, look at each one, and write down in a small text file what you see (skin, hair, coat), one line per picture. Then ask. The tool asks you two questions and answers in plain words. With the four example pictures from the tutorial, where the AI lost June's two puffs after the first try:

```bash
node ../scripts/anchor.mjs tags-june.jsonl --character june-okafor --ask
```

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

The first question is answered by the registry: June's dark brown skin is a story fact, so only pictures that have it can be the *anchor*, the one picture every later picture should match, and pictures without it are always redrawn. The second question is yours. *Fewest redraws* keeps the look most pictures already have (here the loose curls the AI drifted to) and costs one redraw. *The first look* keeps the two puffs you asked for and costs three. The tool shows both prices and never decides for you. Answer `y` and the choice is written into the registry. The [tutorial](docs/1-tutorials/START-HERE.md) walks through the whole thing with real pictures.

## For developers

The same engine runs the name build of a published 82-scene graphic novel. Plain Node, zero dependencies, no telemetry. `npm run check` is the gate, `npm test` the tests, `npm run verify` everything.

**Tokens.** `{{id}}` display name, `{{id:first}}` first word, `{{id:full}}` full name, `{{id:initial}}` first letter, `{{id:<form>}}` any key under `forms` (a string, or a contextual form `{ "by": "<field>", "values": {...} }` picked by the scene's own field). An unknown token throws: a build never prints a token and never guesses a name. Resolver: `scripts/names.mjs` (`loadNames(root).resolveTokens(text)`).

**The registry declares what the gate checks.** `surfaces` (scene files, art manifests, heading documents, name paths: every label must resolve to exactly one entry allowed in that story), `token_sources` (files that may hold tokens but no written-out name), `records` (dated history, left alone) and `coverage.ignore` (docs that show names on purpose). Any other tracked file that names a character is reported, so the gate is never silent about a file.

| You declare | The gate does |
| :--- | :--- |
| A prop as an entry (`"kind": "prop"`, `prompt_tokens`) and `"props": ["brass-key"]` on the scene | resolves the id; never matches a prop's name inside prose |
| A contextual form: `"attitude": { "by": "stage", "values": { "childhood": "…", "adult": "…", "default": "…" } }` | `{{brass-key:attitude}}` renders the variant the scene's own `stage` picks; no match and no default fails the build |
| `exclusive_markers` on a scene file: `time_of_day` → `morning: [sunrise, …]`, `evening: [lamplight, …]` | fails a scene labelled evening whose text says sunrise |
| `forbid_keys` on a manifest: `visualDescription` is owned by the scene file | fails a manifest entry that still carries its own copy |
| `canon_tags` (fixed traits) on an entry, `drift_resolution` defaults (`prefer` or `policy`) | `scripts/anchor.mjs` answers two questions over any encoder's embeddings or hand tags: `--keep tag=value` (what must never change; only images carrying every kept tag are eligible, the rest are always billed) and `--prefer fewest-redraws|first-look|last-look|most-common` (`consensus`, `origin`, `terminal`, `mode` among the eligible images; `canon` is keep + consensus). `--ask` asks both on the terminal. The bill is by cosine with embeddings and by tags without (`stats.bill_basis`); `--write` records image, policy, prefer, keep and stats under `characters.<id>.anchor` |

From the repository root:

```bash
node scripts/anchor.mjs examples/anchor/embeddings.jsonl --prefer fewest-redraws
node scripts/anchor.mjs examples/anchor/embeddings.jsonl --keep "hair=copper red" --prefer first-look
node scripts/anchor.mjs examples/anchor/embeddings.jsonl --ask
node scripts/research/ask.mjs "how do I keep a prop consistent across panels"
```

- Adopt it in a repo: [HOW-TO-ADOPT-THE-REGISTRY.md](docs/2-how-to/HOW-TO-ADOPT-THE-REGISTRY.md). Every field: [REGISTRY-FIELDS.md](docs/3-reference/REGISTRY-FIELDS.md). The eight ways a continuity system goes quiet: [CONTINUITY-ISSUE-CLASSES.md](docs/3-reference/CONTINUITY-ISSUE-CLASSES.md).
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
