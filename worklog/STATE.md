# STATE: narrative-token-ssot

**Last rewritten:** 2026-10-17 21:42 EDT
**HEAD:** 01ada97
**Date:** 2026-10-17
**Session:** anchor bill by tags (branch `claude/anchor-tags-only-bill`, branched from `claude/layperson-docs-and-tutorial`, the branch of pull request 4, itself branched from `claude/research-process-and-public-norms`, pull request 3)

## 1. Current verified facts

- WHAT: `PRODUCT.md`. HOW: `AGENTS.md` (alias `CLAUDE.md`). Routing: `.context/_index.md`. Norms rationale: `docs/4-explanation/REPOSITORY-NORMS.md`.
- Gate: `npm run verify` = names gate + tests + publication gate + worklog gate + research index check + docs registry. All green on this branch (24 tests).
- Engine: registry schema v1 with `kind: prop`, contextual `forms`, `surfaces[].forbid_keys`, `surfaces[].exclusive_markers`, `coverage`, `drift_resolution`, `canon_tags`, `characters.<id>.anchor`; `scripts/render.mjs` and `scripts/anchor.mjs` (origin, terminal, consensus, mode, canon). With rows that carry tags and no embeddings, `anchor.mjs` picks under origin, terminal, mode and canon and bills by tags (ADR-004 amendment of 2026-10-17): canon lists every image off `canon_tags`, the other three every image whose tags differ from the anchor's; the report says `bill by tags, not by similarity`, the comparison line says `N to redo, by tags`, the budget applies, and the recorded anchor carries `stats.bill_basis` (`cosine`, `tags`, `none`) and `stats.tag_mismatches` while `below_threshold` stays null. Consensus still needs embeddings. On the example set with embeddings removed the tag bill equals the cosine bill. Example registry: 4 entries, 2 surfaces, 3 token sources.
- Layperson pass delivered on this branch: `README.md` rewritten for a non-technical reader (problem, promise, three-step quick start on Node plus a browser chatbot, one command per capability, For developers); `docs/1-tutorials/START-HERE.md` (two characters, one scene, prompt sheet, chatbot, hand tags, every policy, `--write`); `docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md`. Every command in the README and the tutorial was executed from their own code blocks by a throwaway harness and matched the shown output. `PRODUCT.md` lists the layperson pass under Deliverables.
- Pull request 3 is open from `claude/research-process-and-public-norms` to `main`. Pull request 4 (https://github.com/enclave402/narrative-token-ssot/pull/4) is open from `claude/layperson-docs-and-tutorial` to `main` and stacks on it. Pull request 5 (https://github.com/enclave402/narrative-token-ssot/pull/5) is open from this branch to `main` and stacks on pull request 4. Each Files tab shows the predecessors' commits until they merge; the compare view against the parent branch shows a branch's own diff. Nothing is merged.
- Docs: 13 canonical documents registered (1 tutorial, 4 how-tos, 3 references, 1 explanation, 4 ADRs).
- Research: `research/` holds one card (`ai-character-continuity-pipeline-research`, 13,601 words, reviewed) and one carded prompt (`continuity-norms-and-structures-prompt`, not yet run), 35 findings (15 checked against 20 verified arXiv sources, 1 caution), generated index; toolchain in `scripts/research/` runs on the endpoints in `research/research.config.json` (local by default).
- Worklog: trail and generated indexes in `worklog/`; appender is `scripts/worklog-append.mjs`.
- Hooks: `bash scripts/install-git-hooks.sh` sets `core.hooksPath`; pre-commit runs the publication gate, pre-push runs `npm run verify` and refuses pushes to `main`.

## 2. Closed directions, with evidence

- **CLOSED:** telling the reader to read the regeneration list off the tags file by hand. The engine bills by tags itself when there are no embeddings (ADR-004 amendment); the how-to describes the report, not a manual step.
- **CLOSED:** a quick start or tutorial that needs an API, a local model or a node graph. The owner's proof case is a browser chatbot driven by copy and paste; the tutorial runs on Node plus a chatbot, and hand tags drive four of the five anchor policies (`consensus` is the one that needs embeddings, and the docs say so).
- **CLOSED:** writing a character's look into scene files or pasted prompts. The look is a form on the registry entry (`forms.look`), the picture prompt refers to it as `{{id:look}}`, and the gate refuses a typed look like a typed name.
- **CLOSED:** copying the machine-wide agent instruction block verbatim into this repo. It names private paths, people and services; the publication gate fails on it. `AGENTS.md` is written fresh, under 300 words, public-safe.
- **CLOSED:** hosted continuous integration (GitHub Actions or similar). Norm: local gates only; `scripts/git-hooks/pre-push` is the gate.
- **CLOSED:** committing retrieval packs and vector caches. They are derived and deterministic (`research/retrieval/`, `research/.vectors/` gitignored); one command regenerates each.
- **CLOSED:** matching prop names in prose to decide what a prompt prints. Replaced by `kind: prop` entries listed by id (`props`) and resolved by the gate.
- **CLOSED:** a Markdown sidecar log (`WORK_LOG.md`) as a second trail; `worklog/log.jsonl` is the only spine.
- **CLOSED:** temporary analysis dumps at the repository root; scratch belongs under `.context/scratch/`.
- **CLOSED:** repository files that point at a private machine folder or name the owner. The publication gate refuses home-folder Documents paths and the private folder's name, and a gitignored `.private-terms` carries the owner's own words.
- **CLOSED:** `checked` findings without a loaded source. `scripts/research/index.mjs --check` fails them; 20 sources were loaded through the arXiv API before any finding was marked checked.

### Conflicts with AGENTS (must be empty)

- None.

## 3. Prioritised next steps

- [ ] **Next action:** a human reviews and merges pull request 3, then 4 (the layperson pass), then 5 (the anchor bill by tags).
- [ ] Before-and-after journey: in the private pipeline, write the lead's `canon_tags` (owner's words, not inferred), tag and embed the story's renders, run the anchor policies, restore canon, and bring the before and after images plus the anchor report into a public expository page here. Same session applies the public mechanisms privately (token sources for program data, `forbid_keys` on the art manifest, prop ids, a contextual form for the stage-dependent prop, time-of-day markers, run-notes rendering).
- [ ] `anchor.mjs` and `tokenize.mjs` detect "run as main" by comparing `process.argv[1]` with `import.meta.url`, so invoked through a symlinked folder they print nothing and exit 0; `fs.realpathSync` on the argv path would fix it.
- [ ] Run `research/corpus/prompts/continuity-norms-and-structures-prompt.md` in a deep-research tool, card the answer, overlap, extract, verify; then design the shot-to-shot continuity card and shot sheet on it.
- [ ] Verify the conference and vendor sources behind the report's numeric thresholds and promote or correct findings accp-04, -22, -26, -28 (`docs/_registry/open_loops.md`).
