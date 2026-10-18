# Narrative Token SSOT

> Character names as build-time tokens, so AI agents can't drift them. One registry file is the single source of truth (SSOT) for every name in your scenes, prompts and image manifests. Plain Node, zero dependencies, no telemetry.

[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](LICENSE)
[![Used in: rel8r.me](https://img.shields.io/badge/Used_in-rel8r.me-ff1484.svg)](https://rel8r.me/reader.html?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot)
[![Ecosystem: SloppyXBaby](https://img.shields.io/badge/Developer_Kits-sloppyxbaby.com-black.svg)](https://sloppyxbaby.com/?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot)

**[Quick Start](#quick-start)** · **[See it live](https://rel8r.me/reader.html?utm_source=github&utm_medium=readme-nav&utm_campaign=narrative-token-ssot)** · **[Using an AI agent? Read AGENTS.md](AGENTS.md)** · **[Antidote Kit](https://sloppyxbaby.com/?utm_source=github&utm_medium=readme-nav&utm_campaign=narrative-token-ssot)**

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
The registry declares which files to check: `surfaces` (here `examples/scenes.json`, where every cast, prop, speaker and line is checked, and `examples/art.json`), `token_sources` (here `examples/*.md`, which may hold tokens but no written-out names), `records` (dated history, left alone) and `coverage.ignore` (docs that show names on purpose). Any other tracked file that names a character is reported, so the gate is never silent about a file. Put `check` in a pre-commit hook (`bash scripts/install-git-hooks.sh` does it), and a name an agent types out fails with the fix:
```text
character registry: pass (4 entries, 7 labels resolved on 2 surfaces, 3 token sources, 12 files scanned)

examples/sample-scene.md: line 9: names "Sam" in a token source. Fix: write {{sam-hayes}}
character registry: fail (1 problem(s))
```

---

## Beyond Names: Props, Variants, Contradictions, Duplicates

The same registry answers the ways a continuity system goes quiet in production ([the eight classes](docs/3-reference/CONTINUITY-ISSUE-CLASSES.md)). Everything is declared in your registry; the engine ships no project vocabulary.

| You declare | The gate does |
| :--- | :--- |
| A prop as an entry (`"kind": "prop"`, `prompt_tokens`) and `"props": ["brass-key"]` on the scene | resolves the id; never matches a prop's name inside prose |
| A contextual form: `"attitude": { "by": "stage", "values": { "childhood": "…", "adult": "…", "default": "…" } }` | `{{brass-key:attitude}}` renders the variant the scene's own `stage` picks; no match and no default fails the build |
| `exclusive_markers` on a scene file: `time_of_day` → `morning: [sunrise, …]`, `evening: [lamplight, …]` | fails a scene labelled evening whose text says sunrise |
| `forbid_keys` on a manifest: `visualDescription` is owned by the scene file | fails a manifest entry that still carries its own copy |
| `token_sources` globs for run notes, pages, manifests | fails a written-out name; `node scripts/render.mjs <src> --out <built>` writes the names into built output |

Field reference: [REGISTRY-FIELDS.md](docs/3-reference/REGISTRY-FIELDS.md). Adoption guide: [HOW-TO-ADOPT-THE-REGISTRY.md](docs/2-how-to/HOW-TO-ADOPT-THE-REGISTRY.md).

## After the Drift: Pick an Anchor

Most tools prevent drift going forward and assume a pristine reference from the first render. When a character has already mutated halfway through a project, `scripts/anchor.mjs` looks backward: feed it one embedding per image from the encoder you trust, choose a policy (`origin`, `terminal`, `consensus`, `mode`, or `canon` when the drift is a defect and the cheapest state must not win), read the regeneration bill, and record the anchor in the registry. Tags written by hand are enough for every policy but `consensus`: no API, no model required.

```bash
node scripts/anchor.mjs examples/anchor/embeddings.jsonl --policy consensus
node scripts/anchor.mjs renders/embeddings.jsonl --policy consensus --character sam-hayes --write
```

Guide: [HOW-TO-RESOLVE-CHARACTER-DRIFT.md](docs/2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md). Decision: [ADR-004](docs/4-explanation/decisions/ADR-004-retrospective-anchor-policy.md).

## Research, Not Vibes

Claims in this repository trace to [`research/`](research/README.md): documents filed verbatim as cards, a generated index, atomic findings with a strength and a caveat, sources verified at their primary location, and a hybrid search over all of it. The toolchain runs on any OpenAI-compatible or Ollama endpoint (defaults are local, nothing is paid):

```bash
node scripts/research/ask.mjs "how do I keep a prop consistent across panels"
node scripts/research/card.mjs ~/my-report.md --id my-report --kind owner-research --subjects identity-locking
```

Guide: [HOW-TO-INGEST-RESEARCH.md](docs/2-how-to/HOW-TO-INGEST-RESEARCH.md). The first card is a 13,600-word report on character and asset consistency in generative pipelines, with 20 of its arXiv sources verified.

## How This Repo Is Run

Public by construction (`scripts/check-private.mjs` refuses anything personal on every commit), nothing hardcoded, any agent and any model, one append-only worklog and one state file, docs by reader intent, local gates (`npm run verify`), one branch per task, humans merge. Read [REPOSITORY-NORMS.md](docs/4-explanation/REPOSITORY-NORMS.md), [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

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

- Architecture and implementation by **[Coach Hype](https://coachhype.com/?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot)**.
- Released under the [MIT License](LICENSE). Free for personal and commercial projects.
