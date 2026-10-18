# STATE: narrative-token-ssot

**Last rewritten:** 2026-10-17 20:58 EDT
**HEAD:** b53d2e3
**Date:** 2026-10-17
**Session:** public repository norms, in-repo research process, continuity gate extensions, drift anchor policy (branch `claude/research-process-and-public-norms`)

## 1. Current verified facts

- WHAT: `PRODUCT.md`. HOW: `AGENTS.md` (alias `CLAUDE.md`). Routing: `.context/_index.md`. Norms rationale: `docs/4-explanation/REPOSITORY-NORMS.md`.
- Gate: `npm run verify` = names gate + tests + publication gate + worklog gate + research index check + docs registry. All green on this branch (20 tests).
- Engine: registry schema v1 extended with `kind: prop`, contextual `forms`, `surfaces[].forbid_keys`, `surfaces[].exclusive_markers`, `coverage`, `drift_resolution`, `canon_tags`, `characters.<id>.anchor`; `scripts/render.mjs` and `scripts/anchor.mjs` (origin, terminal, consensus, mode, canon) added. Example registry: 4 entries, 2 surfaces, 3 token sources.
- Pull request 3 is open from this branch to `main` (https://github.com/enclave402/narrative-token-ssot/pull/3); the app's Auto-fix watches it. Nothing is merged.
- Positioning changed by the owner on 2026-10-17 evening and recorded in `PRODUCT.md`: layperson-first, browser-flow proof case, canon beats cheapest; three planned pieces listed there.
- A research prompt on continuity norms is carded (`research/corpus/prompts/continuity-norms-and-structures-prompt.md`), not yet run.
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

- [ ] **Next action:** a human reviews and merges pull request 3.
- [ ] Before-and-after journey: in the private pipeline, write the lead's `canon_tags` (owner's words, not inferred), tag and embed the story's renders, run the anchor policies, restore canon, and bring the before and after images plus the anchor report into a public expository page here. Same session applies the public mechanisms privately (token sources for program data, `forbid_keys` on the art manifest, prop ids, a contextual form for the stage-dependent prop, time-of-day markers, run-notes rendering).
- [ ] Layperson pass: README and a `docs/1-tutorials/` start-here walkthrough for a non-technical reader; a browser-flow how-to (copy-paste prompt sheets, hand tags, no API).
- [ ] Run `research/corpus/prompts/continuity-norms-and-structures-prompt.md` in a deep-research tool, card the answer, overlap, extract, verify; then design the shot-to-shot continuity card and shot sheet on it.
- [ ] Verify the conference and vendor sources behind the report's numeric thresholds and promote or correct findings accp-04, -22, -26, -28 (`docs/_registry/open_loops.md`).
