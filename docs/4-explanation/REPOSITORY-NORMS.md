---
title: Repository norms
doc_id: explain-repository-norms
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/REPOSITORY-NORMS.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# Repository norms

How this public [single-source-of-truth](concepts/ONE-HOME-FOR-EACH-FACT.md) repository is run, and why. The short, binding version for agents is `AGENTS.md`; this page is the reasoning. Decision record: [ADR-001](decisions/ADR-001-public-repository-norms.md).

## 1. Public by default, private by construction

Everything in the tree is for anyone. That is a construction rule, not a hope: `scripts/check-private.mjs` runs on every commit and refuses keys, tokens, emails, local home paths, overlay-network and LAN addresses, private-key blocks and the words in your own gitignored `.private-terms`. A research card is deleted on the spot if the gate finds anything in it. The owner's private project names, people and machines never appear here; the private project consumes this repository's mechanisms and keeps its own data at home. Examples, docs and tests use the public example cast in `character-registry.json` (Chloe, Sam and Theo, plus its example props) and nothing else.

## 2. Nothing hardcoded

A value that belongs to one machine or one person is not a norm. Models and endpoints come from `research/research.config.json` with environment overrides; the registry's vocabularies (species words, exclusive markers, forbidden keys, coverage globs) are the project's own; the story-mutation log stamps whatever timezone `WORKLOG_TZ` or the machine says; the scripts find each other relatively. Any clone on any machine with Node 18 gets the same behaviour.

## 3. Any agent, any model

The product core is files, git and gates. `AGENTS.md`, `CLAUDE.md` and `.context/_index.md` are aliases of one routing layer; `.context/skills/` holds payloads any agent can read; `.context/**/*.tmp` is ephemeral scratch vacuumed by gitignore, pre-commit and whatever host scheduler you add. No vendor's hook is required for anything to work; a hook only makes a layer faster.

## 4. Story changes leave a trail

`logs/story-mutations.jsonl` is append-only and written only by `scripts/mutate.mjs`. Two branches that both appended merge by union.

## 5. WHAT and HOW live apart

`PRODUCT.md` says what ships and changes in weeks. `AGENTS.md` says how we work and changes in months. A spoken change to WHAT is written into `PRODUCT.md` in the same turn, so the instruction file never keeps shipping a product that was retired in conversation.

## 6. Docs by reader intent

`docs/` has three legs (C4, Arc42, Diataxis) and no invented buckets. A how-to solves, a reference looks up, an explanation understands; a document doing two jobs is split. Canonical docs carry front matter and are registered in `docs/_registry/doc_index.json`; `scripts/check-docs.mjs` fails an unregistered canonical doc or a dangling registration. Research is not a docs bucket: it lives in `research/` with its own index.

## 7. Gates at the git boundary, locally

`npm run verify` is the whole gate: names, tests, story gates, publication, research index, docs registry. The pre-commit hook runs the publication gate and scratch cleanup; the pre-push hook runs everything and refuses a direct push to `main`. Checks run on the contributor's machine, not on paid hosted runners; a clone needs `bash scripts/install-git-hooks.sh` once.

## 8. One branch per task, humans merge

Work happens on `<agent>/<task>` or `<you>/<task>` branches, for agents in a linked worktree under `.worktrees/` so the root tree stays on `main`. Files are staged by name. Commits follow Conventional Commits, carry an `Agent: <name>` trailer when an agent wrote them, and `CHANGELOG.md` is generated from them. Every change ships as a pull request that a maintainer merges.

When a pull request conflicts with `main`, merge `origin/main` in the worktree (`git fetch origin main && git merge origin/main`): keep `main`'s newer wording where both sides touched a line, add the branch's lines beside it, and run `npm run verify`. An agent app's own base-branch sync may refuse a worktree the agent created; the manual merge is the path.

## 9. Evidence before claims

A user-facing claim traces to a finding; a `checked` finding traces to a source somebody loaded; a candidate a model wrote is not a finding until a person validated it against the text. Retrieved text handed to a model is wrapped as data, and instructions inside it are never followed. Numbers from single blog posts stay labelled as such.

## 10. Names are tokens

The reason the repository exists applies to the repository: no file here writes a registered name except documentation that shows names on purpose and is declared as such. The gate's coverage report answers "does the check read this file?" for every tracked file, so silence is never an option.
