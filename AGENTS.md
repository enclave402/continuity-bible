# AGENTS.md

For any coding agent (Claude Code, Cursor, Codex, Copilot, others) working in a project that uses this tool.

## The one rule

Never type a character's name in a scene, prompt or manifest. Write a token instead:

| Write | Becomes |
| :--- | :--- |
| `{{sam-hayes}}` | Sam |
| `{{sam-hayes:full}}` | Samantha Hayes |
| `{{sam-hayes:formal}}` | Samantha (any key under `forms`) |
| `{{sam-hayes:first}}` | first word of the display name |
| `{{sam-hayes:initial}}` | S |

Ids live in `character-registry.json`. If the id you need is not there, add the character to the registry first. Never guess an id: an unknown token fails the build on purpose.

## Files

- `character-registry.json`: the only place names are written. Schema: `scripts/character-registry.v1.schema.json`.
- `scripts/names.mjs`: the resolver (`loadNames(root).resolveTokens(text)`).
- `scripts/tokenize.mjs`: one-time migration that turns written names into tokens.
- `scripts/check.mjs`: the gate; the registry's `surfaces` and `token_sources` say which files it checks.
- `examples/`: a token source (`sample-scene.md`) and a checked surface (`scenes.json`).

## Before you finish

```bash
npm run check   # exit 1 means a name was typed out or does not resolve; the output names the fix
npm test
```

Both must pass. Zero dependencies: do not add packages.
