# Contributing

**What this is:** how to send a change to this repo, and where each kind of file goes.
**Why it exists:** so every change, from a person or an agent, meets the same bar.
**How to use it:** read Ground rules and Workflow. Then check "Where docs go" before you add a doc.
**Next step:** run `npm run verify` on your branch.

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
npm run verify                      # names gate, tests, story gates, publication gate, research index, docs registry
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
- Docs: `docs/` by reader intent (see [Where docs go](#where-docs-go) below). Decisions: `docs/4-explanation/decisions/ADR-NNN-*.md`. Register canonical docs in `docs/_registry/doc_index.json`.
- Research: `research/` (cards, findings, sources). Process: `docs/2-how-to/HOW-TO-INGEST-RESEARCH.md`.

## Where docs go

Three legs, no invented buckets. Put a document where its reader's intent is, not where it was written.

| Leg | Path | Content |
|---|---|---|
| C4 | `docs/c4/` | Diagrams, system maps |
| Arc42 | `docs/arc42/` | Formal architecture sections |
| Diataxis | `docs/1-tutorials/` | Learn: guided walkthroughs |
| Diataxis | `docs/2-how-to/` | Solve: operational procedures |
| Diataxis | `docs/3-reference/` | Look up: specs, field lists, catalogues |
| Diataxis | `docs/4-explanation/` | Understand: rationale, decisions (ADRs), reviews |

**Decision tree.**

1. Primarily a diagram or map? `docs/c4/`.
2. A formal architecture section? `docs/arc42/`.
3. Otherwise by reader intent: learn, solve, look up, understand.
4. One file serving two intents? Split it.
5. Genuinely unresolved? Log it in `docs/_registry/open_loops.md` rather than inventing a folder.

**Never create** `docs/meta`, `docs/artifacts`, `docs/research`, `docs/notes`, `docs/handoff`, `docs/tasks`, or ad-hoc numbered prefixes. Research corpora live in `research/` at the repo root; their how-to lives in `docs/2-how-to/`.

**Naming.** `UPPER-KEBAB-CASE.md` for documents; ADRs as `ADR-NNN-short-slug.md`; data companions lowercase with underscores.

**Front matter** (canonical docs):

```yaml
---
title: <title>
doc_id: <unique-id>
triadic_leg: c4 | arc42 | diataxis
diataxis_mode: learn | solve | lookup | understand
canonical_path: docs/<path>
status: active | planned | deprecated
last_reviewed: YYYY-MM-DD
canonical: true
---
```

Register every canonical doc in `docs/_registry/doc_index.json` and link it from `docs/README.md`. `node scripts/check-docs.mjs` fails on an unregistered canonical doc, a registered path that does not exist, or missing front matter.

## Reporting a problem

Open an issue with the command you ran, its exact output, and what you expected. For a security concern see `SECURITY.md`.

**How changes reach this repository.** This GitHub repository (`github.com/enclave402/continuity-bible`) is the canonical one; there is no separate upstream. Maintainers and contributors alike push a branch and open a pull request here (`gh pr create`); a maintainer merges after `npm run verify` and the publication gate pass.
