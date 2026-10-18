# `.context/_index.md`: routing index (tier 1)

Entry point for any agent or harness that can read a repository. Under 300 words, flat routes, no rules dump. Root `AGENTS.md` and `CLAUDE.md` point here; the architecture is the same whichever file your tool loads first.

## Routes

| Task | Load |
|---|---|
| Orient | `README.md`, `AGENTS.md` (how we work), `PRODUCT.md` (what this repo ships) |
| Work state | `worklog/STATE.md` first, then the last entries of `worklog/log.jsonl` |
| Names and the gate | `character-registry.json`, `scripts/names.mjs`, `scripts/check.mjs`, `docs/3-reference/REGISTRY-FIELDS.md` |
| Research | `research/README.md`, then `node scripts/research/ask.mjs "<question>"` before opening any corpus card |
| Drift anchors | `docs/2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md`, `scripts/anchor.mjs` |
| Decisions | `docs/4-explanation/decisions/` |
| Repo-local skill payloads | `.context/skills/` (inert until retrieved) |
| Scratch | write `.context/scratch/<name>.tmp`, keep a summary in the conversation, delete at session end |

## Three tiers

1. **Routing** (this file): always loaded, thin.
2. **Skills** (`.context/skills/`): on-demand payloads, one per file, loaded only when the task matches.
3. **Scratch** (`.context/**/*.tmp`): ephemeral. Gitignored, vacuumed by `scripts/cleanup_scratch.sh`, by the pre-commit hook, and by any host scheduler you add. Never read an orphaned `.tmp` as truth in a later session.

## Gates

```bash
npm run verify   # names gate, tests, publication gate, worklog gate, research index, docs registry
```
