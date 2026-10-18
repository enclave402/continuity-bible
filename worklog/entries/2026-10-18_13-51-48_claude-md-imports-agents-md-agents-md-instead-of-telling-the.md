# CLAUDE.md imports AGENTS.md (@AGENTS.md) instead of telling the model in prose to read it: a fresh session in this repo now carries AGENTS.md in context.

- **Logged:** 2026-10-18T13:51:48-04:00
- **Type:** action · **Scope:** routing · **Status:** closed
- **Author:** agent:claude · **HEAD:** ad86d95 · **Id:** `wl-8ed4d0e9-986b-4242-bb51-3170f7dd0dbf`
- **Tags:** worklog

## Run record

- **files:** CLAUDE.md
- **before:** a claude -p session in this repo reported AGENTS.md not in context (only the pointer)
- **after:** the same question in a session opened in this worktree quotes the Boundaries line naming scripts/check-private.mjs
- **removed:** none
- **verified by:** claude -p control on main and on this worktree
