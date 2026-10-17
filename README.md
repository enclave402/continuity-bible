# Narrative Token SSOT

> Character names as build-time tokens, so AI agents can't drift them. One registry file is the single source of truth (SSOT) for every name in your scenes, prompts and image manifests. Plain Node, zero dependencies, no telemetry.

[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](LICENSE)
[![Used in: rel8r.me](https://img.shields.io/badge/Used_in-rel8r.me-ff1484.svg)](https://rel8r.me/reader.html?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot)
[![Ecosystem: SloppyXBaby](https://img.shields.io/badge/Developer_Kits-sloppyxbaby.com-black.svg)](https://sloppyxbaby.com)

---

## The Problem: AI Prompt Drift & Broken Lore

When you write multi-scene stories, graphic novels or game dialogue with LLMs (Cursor, Claude Code, Copilot, ChatGPT), names drift:
- Character names get subtly mutated across prompts (*Samantha* becomes *Sam*, *Chloe* becomes *Clara*).
- Renaming a character requires dangerous global find-and-replace passes across hundreds of scene files, image generation manifests, and prompts.
- Models invent aliases, mix up family names, and give side characters new ones.

A rule in the agent's instructions makes this rarer. It doesn't make it impossible.

## The Solution: Compile-Time Token Resolution

**Never write raw character names in source files, prompts, or scene drafts.** 

Instead, write interpolation tokens:
```markdown
# Scene 01
{{chloe-jenkins}} turned around. "Did {{theo-vance:first}} answer you?"
{{sam-hayes:first}} shook her head. "{{theo-vance:formal}} has gone completely silent."
```

At build time, `names.mjs` resolves tokens against your `character-registry.json` authority file:
```text
# Scene 01
Chloe turned around. "Did Theo answer you?"
Sam shook her head. "Theodore has gone completely silent."
```

To rename a character, change one line in `character-registry.json` and rebuild. No find-and-replace across the repo.

---

## Quick Start

### 1. Inspect the Registry
The single authority file lives at `character-registry.json`:
```json
{
  "characters": {
    "sam-hayes": {
      "name": "Sam",
      "full_name": "Samantha Hayes",
      "forms": {
        "formal": "Samantha",
        "short": "Sam"
      }
    }
  }
}
```

### 2. Run the Demo Build
Clone this repo and run:
```bash
node scripts/build.mjs
```
It prints `examples/sample-scene.md` as written (tokens), then resolved (names).

### 3. Token Formats Supported
| Token | Resolution Example |
| :--- | :--- |
| `{{id}}` | Canonical display name (`"Sam"`) |
| `{{id:first}}` | First word of the display name (`"Sam"`; a name like `"Rowan Thorne"` -> `"Rowan"`) |
| `{{id:full}}` | Full name from registry (`"Samantha Hayes"`) |
| `{{id:formal}}` | Custom declared form (`"Samantha"`) |
| `{{id:initial}}`| First initial (`"S"`) |

An unknown id fails the build: `{{theo-vanse}}` throws `names: unknown token {{theo-vanse}}` instead of printing a guessed name.

### 4. Migrate Existing Files Once
Run from your project root (where `character-registry.json` lives):
```bash
node scripts/tokenize.mjs drafts/scene-14.md --text --dry-run   # show what would change
node scripts/tokenize.mjs drafts/scene-14.md --text             # rewrite names into tokens
```
```text
Sam texted Theo at midnight. Theodore Vance never answered, so Samantha called Chloe.
{{sam-hayes}} texted {{theo-vance}} at midnight. {{theo-vance:full}} never answered, so {{sam-hayes:formal}} called {{chloe-jenkins}}.
```
Whole words only, never inside an existing token, longest name first. A name two characters share is skipped and reported, not guessed. JSON files work too (drop `--text`; `--skip k,k` leaves keys alone).

### 5. Gate It
```bash
npm run check   # every name on every surface resolves to exactly one character, else exit 1
npm test        # the resolver and migration tests
```
The registry declares which files to check: `surfaces` (here `examples/scenes.json`, where every cast, speaker and line is checked) and `token_sources` (here `examples/*.md`, which may hold tokens but no written-out names). Put `check` in a pre-commit hook or CI, and a name an agent types out fails with the fix:
```text
character registry: pass (3 entries, 6 labels resolved on 1 surfaces, 2 token sources, 11 files scanned)

examples/sample-scene.md: line 9: names "Sam" in a token source. Fix: write {{sam-hayes}}
character registry: fail (1 problem(s))
```

---

## Where It's Used

It came out of, and still runs, the build for:

- **[Dating Red Flags](https://rel8r.me/reader.html?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot)**: an illustrated graphic novel on [rel8r.me](https://rel8r.me/?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot), an on-device relationship self-regulation tool.
- **82 illustrated scenes** across two dual-narrative editions (Sam-first and Theo-first), with every character name resolved from one registry file.

---

## Related

This repo is free and MIT licensed. I'm packaging the rest of the guardrails I use with coding agents (git worktree isolation, repo rules that hold up across sessions) as the paid [Antidote Kit](https://sloppyxbaby.com/?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot).

---

## License & Credits

- Architecture and implementation by **[Coach Hype](https://coachhype.com)**.
- Released under the [MIT License](LICENSE). Free for personal and commercial projects.
