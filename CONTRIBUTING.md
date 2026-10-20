# Contributing

Thank you for helping keep names, continuity and research honest. This is a public repository with zero runtime dependencies; please keep it that way.

## Ground rules

1. **Names are tokens.** No source file, example or doc fixture writes a registered character's name. `npm run check` tells you the token to write.
2. **Nothing private.** No personal data, local paths, credentials, private hostnames or private project names. `scripts/check-private.mjs` runs on every commit; your own extra words go in a gitignored `.private-terms`.
3. **Nothing hardcoded.** Models, endpoints and paths come from `research/research.config.json` or the environment. A default is fine; a machine-specific value is not.
4. **No new packages.** Node 18+ standard library only.

## Workflow

```bash
git clone <your fork>
cd narrative-token-ssot
bash scripts/install-git-hooks.sh   # pre-commit: publication gate; pre-push: full verify
git switch -c <you>/<short-task>    # one branch per task; never commit on main
npm run verify                      # names gate, tests, publication gate, worklog gate, research index, docs registry
```

Open a pull request. A maintainer merges; nobody pushes to `main`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org): `feat(scope): ...`, `fix: ...`, `docs: ...`, `test: ...`, `chore: ...`. If an agent wrote the commit, add an `Agent: <name>` trailer. `CHANGELOG.md` is generated with `git cliff`.

## AI-assisted contributions

Pull requests written with an AI tool are welcome on three conditions:

1. Say in the pull request which tools you used and for what.
2. A human opens the pull request, owns the change, and can explain and defend every line of it.
3. `npm run verify` passes on your branch.

## Where things go

- Code: `scripts/`. Tests: `test/` (Node's built-in runner). Examples: `examples/`.
- Docs: `docs/` by reader intent (`docs/CONTRIBUTING.md`). Decisions: `docs/4-explanation/decisions/ADR-NNN-*.md`. Register canonical docs in `docs/_registry/doc_index.json`.
- Research: `research/` (cards, findings, sources). Process: `docs/2-how-to/HOW-TO-INGEST-RESEARCH.md`.
- Work record: `worklog/` (append with `scripts/worklog-append.mjs`; never by hand).

## Reporting a problem

Open an issue with the command you ran, its exact output, and what you expected. For a security concern see `SECURITY.md`.
