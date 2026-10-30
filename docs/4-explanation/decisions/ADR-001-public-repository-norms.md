---
title: ADR-001 Public repository norms
doc_id: adr-001-public-repository-norms
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/decisions/ADR-001-public-repository-norms.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# ADR-001: this repository adopts machine-wide operating norms in a form that is safe to publish

**Status:** accepted, 2026-10-17.
**Deciders:** the repository owner set the rule ("a public [SSOT](../concepts/ONE-HOME-FOR-EACH-FACT.md) process, never hardcoding, adaptive flows for all systems and users, leveraged on our own end to resolve our own issues"); the agent that built it chose the shape.

## Context

The owner runs a set of private repositories under written machine-wide norms: documentation by reader intent in three legs, an append-only worklog with a rewritten state file, ephemeral agent scratch under `.context/`, repo context split into WHAT/HOW/NOW files, one branch per task with humans merging, local gates instead of hosted runners, research turned into graded findings on a local embedding model. Those norms live in a private folder and reference private paths, people, machines and products.

This repository is public and promotes the registry those private projects use. It needed the same discipline without any of the private references, and it needed every mechanism to work on a stranger's laptop with any agent and any model.

## Decision

1. Adopt each norm as a repository-native file or script, never as a pointer to a private path: `AGENTS.md`/`CLAUDE.md`/`.context/_index.md` (routing), `PRODUCT.md` (WHAT), `worklog/` with `scripts/worklog-append.mjs`, `worklog-index.mjs`, `check-worklog.mjs` (trail and helm), `docs/` with `docs/CONTRIBUTING.md` and `scripts/check-docs.mjs` (placement), `.context/` with `scripts/cleanup_scratch.sh` (scratch), `scripts/git-hooks/` with `install-git-hooks.sh` (gates), `cliff.toml` (changelog), `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.editorconfig`, `.gitattributes`.
2. Add one norm the private repositories do not need: a publication gate (`scripts/check-private.mjs`) with a committed pattern list and a gitignored personal terms file, run on every commit and on every research card.
3. Make every default a configuration value with an environment override, and make every vocabulary the project's own. No path outside the repository, no machine, no person.
4. Keep the product core vendor-free: files, git and gates. Harness hooks are optional accelerators.
5. Do not add hosted continuous integration. The gate is `npm run verify`, run by hooks on the contributor's machine; a pull request states that it ran.

## Consequences

- A clone needs `bash scripts/install-git-hooks.sh` once; after that the gates are automatic.
- The worklog tooling is self-contained and therefore not byte-identical to the private machine's: the schema and invariants are the same (append-only, generated timestamps with offsets, appender-only writes, HEAD lag at most one, union merge), the implementation is local to this repository.
- The private projects can point at this repository for the mechanism and keep their data private; what this repository documents about the issue classes it answers is generic by construction (see ADR-003).
- Anything that cannot be published is, by this decision, out of scope for this repository rather than hidden inside it.
