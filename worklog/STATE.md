# STATE: narrative-token-ssot

**Last rewritten:** 2026-10-17 20:45 EDT
**HEAD:** 097d83c
**Date:** 2026-10-17
**Session:** public repository norms, in-repo research process, continuity gate extensions, drift anchor policy (branch `claude/research-process-and-public-norms`)

## 1. Current verified facts

- WHAT: `PRODUCT.md`. HOW: `AGENTS.md` (alias `CLAUDE.md`). Routing: `.context/_index.md`. Norms rationale: `docs/4-explanation/REPOSITORY-NORMS.md`.
- Gate: `npm run verify` = names gate + tests + publication gate + worklog gate + research index check + docs registry. All green on this branch (20 tests).
- Engine: registry schema v1 extended with `kind: prop`, contextual `forms`, `surfaces[].forbid_keys`, `surfaces[].exclusive_markers`, `coverage`, `drift_resolution`, `characters.<id>.anchor`; `scripts/render.mjs` and `scripts/anchor.mjs` added. Example registry: 4 entries, 2 surfaces, 3 token sources.
- Research: `research/` holds one card (`ai-character-continuity-pipeline-research`, 13,601 words, reviewed), 35 findings (15 checked against 20 verified arXiv sources, 1 caution), generated index; toolchain in `scripts/research/` runs on the endpoints in `research/research.config.json` (local by default).
- Docs: 11 canonical documents registered (3 how-tos, 3 references, 1 explanation, 4 ADRs).
- Worklog: trail and generated indexes in `worklog/`; appender is `scripts/worklog-append.mjs`.
- Hooks: `bash scripts/install-git-hooks.sh` sets `core.hooksPath`; pre-commit runs the publication gate, pre-push runs `npm run verify` and refuses pushes to `main`.

## 2. Closed directions, with evidence

- **CLOSED:** copying the machine-wide agent instruction block verbatim into this repo. It names private paths, people and services; the publication gate fails on it. `AGENTS.md` is written fresh, under 300 words, public-safe.
- **CLOSED:** hosted continuous integration (GitHub Actions or similar). Norm: local gates only; `scripts/git-hooks/pre-push` is the gate.
- **CLOSED:** committing retrieval packs and vector caches. They are derived and deterministic (`research/retrieval/`, `research/.vectors/` gitignored); one command regenerates each.
- **CLOSED:** matching prop names in prose to decide what a prompt prints. Replaced by `kind: prop` entries listed by id (`props`) and resolved by the gate.
- **CLOSED:** `checked` findings without a loaded source. `scripts/research/index.mjs --check` fails them; 20 sources were loaded through the arXiv API before any finding was marked checked.

### Conflicts with AGENTS (must be empty)

- None.

## 3. Prioritised next steps

- [ ] **Next action:** open the pull request from `claude/research-process-and-public-norms` to `main` and have a human review and merge it.
- [ ] Apply the public mechanisms in the private consumer repository per its own issues log (token sources for program data, `forbid_keys` on the art manifest, prop ids, a contextual form for the stage-dependent prop, time-of-day markers, run-notes rendering). Its own session.
- [ ] Verify the conference and vendor sources behind the report's numeric thresholds (face-cosine bands, step window, 600-panel pass rates) and promote or correct findings accp-04, -22, -26, -28 (`docs/_registry/open_loops.md`).
- [ ] Add a `1-tutorials/` walkthrough once a second adopter exists; leave `c4/` and `arc42/` empty until a diagram earns them.
