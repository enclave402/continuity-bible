# Narrative Token SSOT

> **Stop fighting AI character drift.** A zero-telemetry, compile-time token resolution engine and character Single Source of Truth (SSOT) for long-form AI storytelling, graphic novels, and game writing.

[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](LICENSE)
[![Production Receipt: Rel8r](https://img.shields.io/badge/Production_Proof-rel8r.me-ff1484.svg)](https://rel8r.me/reader.html?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot)
[![Ecosystem: SloppyXBaby](https://img.shields.io/badge/Developer_Kits-sloppyxbaby.com-black.svg)](https://sloppyxbaby.com)

---

## The Problem: AI Prompt Drift & Broken Lore

When building multi-scene narratives, graphic novels, or game dialogues using LLMs (Cursor, Claude Code, Copilot, ChatGPT), models inevitably drift:
- Character names get subtly mutated across prompts (*Samantha* becomes *Sam*, *Chloe* becomes *Clara*).
- Renaming a character requires dangerous global find-and-replace passes across hundreds of scene files, image generation manifests, and prompts.
- Models hallucinate non-canonical aliases, confuse family names, and contaminate secondary characters.

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

Need to rename a character or change their canonical formal name? **Update one line in `character-registry.json`. Rebuild. Done.** Zero string mutations across your repo.

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
You will see the raw tokenized source in `examples/sample-scene.md` compiled into clean prose instantaneously.

### 3. Token Formats Supported
| Token | Resolution Example |
| :--- | :--- |
| `{{id}}` | Canonical display name (`"Sam"`) |
| `{{id:first}}` | First word of name (`"Samantha"` -> `"Samantha"`, `"Rowan Thorne"` -> `"Rowan"`) |
| `{{id:full}}` | Full name from registry (`"Samantha Hayes"`) |
| `{{id:formal}}` | Custom declared form (`"Samantha"`) |
| `{{id:initial}}`| First initial (`"S"`) |

---

## Live Production Case Study

This architecture is not a toy experiment. It is the production backbone powering:

- **[Dating Red Flags](https://rel8r.me/reader.html?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot)**: an illustrated graphic novel on [rel8r.me](https://rel8r.me/?utm_source=github&utm_medium=readme&utm_campaign=narrative-token-ssot), an on-device relationship self-regulation tool.
- **82 illustrated scenes** across two dual-narrative editions (Sam-first and Theo-first), with every character name resolved from one registry file.

---

## Upgrade to The Antidote Kit

Need more than token resolution?

If you are shipping software or narrative engines using AI coding agents and are tired of:
- Context window amnesia
- Models ignoring repo instructions
- Multi-agent collisions across branches

Inspect **[The Antidote Kit at sloppyxbaby.com](https://sloppyxbaby.com)**. It delivers the complete suite of deterministic repository rails, git worktree isolation scripts, and anti-avoidance protocols designed by neurodivergent builders for high-agency engineers.

---

## License & Credits

- Architecture and implementation by **[Coach Hype](https://coachhype.com)**.
- Released under the [MIT License](LICENSE). Free for personal, indie, and commercial creative projects.
