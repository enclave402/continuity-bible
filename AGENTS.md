# AGENTS.md

How any coding agent (Claude Code, Codex, Cursor, Copilot, Gemini, others) works in this repository. WHAT this repo ships is `PRODUCT.md`. Routing: `.context/_index.md`.

## The one rule

Never type a character's name in a scene, prompt or manifest. Write a token:

| Write | Becomes |
| :--- | :--- |
| `{{sam-hayes}}` | Sam |
| `{{sam-hayes:full}}` | Samantha Hayes |
| `{{sam-hayes:formal}}` | Samantha (any key under `forms`) |
| `{{sam-hayes:first}}` | first word of the display name |
| `{{sam-hayes:initial}}` | S |

Ids live in `character-registry.json`. An unknown token fails the build on purpose. Never guess an id: add the entry first.

## Session

1. Branch `<agent>/<task>` in a worktree at `.worktrees/<agent>-<task>` from `origin/main`. The root tree stays on `main`. Never push to `main`; open a pull request; a human merges.
2. Stage files by name, never `git add .`. Conventional Commits with an `Agent: <name>` trailer.

## Before you finish

```bash
npm run verify
```

Names gate, tests, story gates, publication gate, research index, docs registry. All must pass. Zero dependencies: do not add packages.

## Boundaries

- **Public repository.** No personal data, local paths, credentials or private project names. `scripts/check-private.mjs` is the gate; keep your own words in a gitignored `.private-terms`.
- **Nothing hardcoded.** Paths, models and endpoints come from config or the environment (`research/research.config.json`, `.env.example`), never from a machine.
- Never edit a test to pass it. Never invent story data, names or evidence.
- **Strict Additive Expansion & Deletion Boundary:** When an author identifies missing art or requests additions, systems must treat the directive as strictly additive expansion. Never assume delete-and-replace, and never overwrite existing scene panels, slots, or prompts. Automated content deletions are exclusively permitted as outputs of simulated market testing where the author explicitly authorized choosing the most lucrative commercial path.
- Docs go under `docs/` by reader intent (`docs/CONTRIBUTING.md`); decisions are ADRs in `docs/4-explanation/decisions/`.
- A research claim traces to a card in `research/`. Ask `node scripts/research/ask.mjs "<question>"` before opening a card.
