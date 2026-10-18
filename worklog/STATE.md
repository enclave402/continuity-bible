# STATE: narrative-token-ssot

**Last rewritten:** 2026-10-17 22:40 EDT
**HEAD:** 12c1fc6
**Date:** 2026-10-17
**Session:** closing open loops after the first stack merged

## 1. Current verified facts

- `main` is at 11cbd2c: pull requests 3 (engine mechanisms for the eight continuity issue classes, research process, public norms), 4 (layperson README, start-here tutorial, browser-chatbot how-to) and 5 (two-question drift resolution: `--keep`, `--prefer`, `--ask`; canon is keep plus fewest redraws) merged 2026-10-17 22:18 EDT under the owner's account.
- WHAT: `PRODUCT.md`. HOW: `AGENTS.md` (alias `CLAUDE.md`). Routing: `.context/_index.md`. Norms: `docs/4-explanation/REPOSITORY-NORMS.md`.
- Gate: `npm run verify` (names, tests, publication, worklog, research index, docs registry). The worklog gate counts helm lag on first-parent, non-merge commits, so a pull request landing on `main` through a merge commit is not lag.
- Research: 2 cards (the continuity report, reviewed; the continuity-norms prompt, not yet run), 35 findings (15 checked, 1 caution, 19 unchecked), 26 recorded sources (20 arXiv papers through the arXiv API, 6 web pages loaded at their URLs). Findings resting on blog posts carry the loaded source as a candidate and stay unchecked by rule.
- Open pull request 6 (`claude/continuity-card-and-shot-sheet`): continuity cards and shot sheet carrying wardrobe, props, marks, place and time shot to shot; being extended with render-surface rules as data (style and exclusion rules written once per surface, compiled into every prompt, retyping fails the gate). It conflicts with `main` in five files until its session merges `main`.
- The private consumer repository is adopting the public mechanisms through its own merge requests: classes 1, 2, 3, 4 and 7 landed; class 5 (a kind on each fix) is approved and awaiting a rebase, with the review posted that its hardcoded keep line must read from surface rules; class 6 has no merge request yet; a session is moving its render-program rules from prose into data.
- The drifted lead's resolution follows the owner's decision: least-regeneration anchor with heritage and eye color fixed; a session is tagging her panels and will propose the anchor and redraw list for the owner's GO.

## 2. Closed directions, with evidence

- **CLOSED:** copying the machine-wide agent instruction block verbatim into this repo (private paths and people; the publication gate fails on it). `AGENTS.md` is written fresh, public-safe.
- **CLOSED:** hosted continuous integration. Local gates only; `scripts/git-hooks/pre-push` runs `npm run verify`.
- **CLOSED:** committing retrieval packs and vector caches (derived, deterministic, gitignored).
- **CLOSED:** matching prop names in prose to decide what a prompt prints; props are entries listed by id.
- **CLOSED:** `checked` findings without a loaded source; blog-only sources never make a finding checked.
- **CLOSED:** a Markdown sidecar log as a second trail; root-level temp dumps; repository files pointing at a private machine folder or naming the owner (replaced on merge; gate patterns added).
- **CLOSED:** restoring the drifted lead's original look as the default. The owner's goal is consistency with the fewest redraws; `canon` stays an option, never the rule.
- **CLOSED:** style and exclusion rules typed into prompt templates. They are data per render surface, compiled into prompts; a retyped rule fails the gate (landing in pull request 6 and the private repository's own merge request).

### Conflicts with AGENTS (must be empty)

- None.

## 3. Prioritised next steps

- [ ] **Next action:** the continuity session merges `main` into pull request 6, finishes the render-surface rules, and a human reviews and merges it.
- [ ] Owner: run `research/corpus/prompts/continuity-norms-and-structures-prompt.md` in a deep-research tool and drop the answer in Downloads; then card, overlap, extract, verify, and confirm or correct the continuity module's open loops in its ADR.
- [ ] Owner: GO on the drifted lead's anchor and redraw list when the Sam session proposes them; the public before-and-after page follows.
- [ ] Private repository: rebase and merge the fix-kinds merge request; land the surface-rules merge request; add time-of-day markers (class 6).
- [ ] Delete merged remote branches as each pull request lands (the push hook refuses while a checkout's helm is stale; run the deletion from a checkout whose gate passes).
