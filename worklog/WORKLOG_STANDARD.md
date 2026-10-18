<!-- GENERATED FROM MACHINE-NORMS SSOT — DO NOT EDIT DIRECTLY -->
<!-- Source: ~/Documents/Machine-Norms/standards/WORKLOG_STANDARD.md -->
<!-- Sync:   bash ~/Documents/Machine-Norms/bin/sync-worklog-ssot.sh -->

# Worklog Standard

> **Canonical path:** `~/Documents/Machine-Norms/standards/WORKLOG_STANDARD.md`
> **Scope:** All project, system, and personal worklogs on this machine.
> **Principle:** Machine-readable first, human-readable second, append-only always.

---

## Rationale: externalize state so agents can loop against ground truth

Andrej Karpathy's observed agent-coding pattern is that LLMs are "exceptionally good at looping until they meet specific goals" when given clear success criteria, but they fail when they must rely on an unbounded, fading context window for state. A worklog is the accommodation for both sides of that loop:

- For the human: an append-only, time-ordered record of what actually happened, not a highlight reel.
- For the agent: a machine-readable, queryable ground-truth artifact it can read on demand instead of holding state in context.

This is why every repo gets **exactly one** project worklog spine. No second NDJSON log in subfolders. No Markdown logs for machine-categorized events. No root-level generated indexes duplicating the canonical `worklog/` indexes. If an event belongs to the repo, it goes into `<repo>/worklog/log.jsonl` with a scoped label; if it spans repos, it goes into `~/Documents/Hermes/worklog/log.jsonl`.

**Scope rule:** `~/Documents/Hermes/worklog/log.jsonl` is the central machine worklog. `~/Documents/Machine-Norms/worklog/log.jsonl` is a project worklog for the Machine-Norms folder only — it must not absorb general machine events that belong in Hermes.

### Dual state: intentional vs forbidden (operator clarification 2026-08-11)

| Kind | Surfaces | Verdict |
|------|----------|---------|
| **Intentional Karpathy dual** | `STATE.md` (helm / now) + `log.jsonl` (trail / history) | **Required.** Do not “merge” them into one file. |
| **Derived human layer** | `entries/*.md`, `WORKLOG.md`, `WORKLOG_INDEX.html` | **Allowed only as generated mirrors** of `log.jsonl` (`worklog-index-build.py`). Not a second SSOT. Agents must not hand-author new entry files as events. |
| **Forbidden dual trail** | Second `log.jsonl`, Markdown worklogs as event store, Desktop session briefs as durable open-loop SSOT | **Eliminate.** Promote facts into helm+trail; discard session-only Desktop notes. |

**How to eliminate “fragmented dual state” in a repo:** (1) append only to `log.jsonl`, (2) rewrite `STATE.md`, (3) run `worklog-index-build.py` so `entries/` + indexes match the trail, (4) gate with a repo `check-worklog-ssot` script so stale indexes fail CI/local gate.

---

## Why NDJSON (JSON Lines)?

- **Standard:** JSON Lines (`*.jsonl`) is supported by every major data tool (jq, Python, SQLite, DuckDB, BigQuery, Spark).
- **Append-only:** New events are one new line. No merge conflicts on giant arrays.
- **Stream-friendly:** Process logs without loading the whole file.
- **Self-describing:** Each object carries its own timestamp, scope, tags, and references.

Do not use Markdown worklogs for machine-categorized events. Markdown is fine for human narrative summaries; structured events belong in NDJSON.

---

## Core Invariants (non-negotiable)

1. **Append-only — never delete, never edit.** Entries are never removed or rewritten, not even to fix mistakes. A correction is a *new* entry that supersedes the old one (reference the old entry's `id` in `references` and say so in `summary`/`details`). History stays complete and auditable; the log only ever grows.
2. **Contemporaneous EDT timestamps on every entry.** Log at the moment the work happens — intent before the action, action right after — never batch-written retroactively at session end. `timestamp`/`edited_at` are always America/New_York ISO-8601 with a numeric offset (`-04:00`/`-05:00`); never a bare UTC `Z`. **You MUST append through `<repo>/scripts/worklog-append.mjs` (a wrapper that delegates to `~/Documents/Machine-Norms/bin/worklog-append.mjs`; template: `~/the-money-project-2/scripts/worklog-append.mjs`) so the stamp is generated, not hand-typed — see invariant 11.** Hand-written JSON is a schema violation even when it looks correct. *(Operator clarification 2026-07-28: no offset calculation — the agent checks the current time at the moment of logging and uses that time. Log at real beats — a completed step, a decision, a blocker, a correction, an operator instruction — contemporaneous but balanced so logging never interrupts the workflow.)*
3. **Log everything — even mistakes.** Every activity gets an entry: successes, failed attempts, wrong turns, reverts, and corrections alike. The log is a record of what actually happened, not a highlight reel. A mistake is logged as its own entry (`note`, `issue`, or `fix`) at the time it is discovered; the corrective action is a separate later entry that references it. Never skip an activity because it was embarrassing, transient, or superseded — additive honesty is what makes the log auditable.
4. **Publish at session close — commit and push.** Appending writes to the local file only. An uncommitted worklog is invisible to every other agent, clone, and machine: they read the last pushed state and act on stale truth. At every session close (and after any correction-grade entry), `git add worklog/ && git commit && git push`. If the repo has no remote, say so in the final entry of the session.
5. **STATE.md is the helm; log.jsonl is the trail.** Every repo worklog has a `worklog/STATE.md` — the *current truth* file. It is **rewritten, not appended**, at every session close with these sections: **Current facts** (only the latest verified assessments; stale claims are removed, their history stays in log.jsonl), **Active plan** (approved moves, in order), **Next action** (one line). Agents MUST read `STATE.md` *before* `log.jsonl`. When history and STATE.md conflict, STATE.md wins. When reading log.jsonl directly, never truncate (no `head -N` over date filters); read the *last* ~20 entries minimum, because append-only history retains superseded claims and only the newest correction is authoritative.

   **Karpathy state model (canonized 2026-07-28, operator order).** Karpathy's critique of RAG applies directly: an agent that re-reads raw history re-derives context from scratch every prompt and accumulates nothing. The fix is the LLM-as-programmer pattern where persistent markdown is the codebase — and STATE.md is the ephemeral *active context*: a bridge across sessions (what is in flight, what was decided, exactly where to pick up), highly dynamic (rewritten the moment a major task closes), and a behavioral guardrail (documented live state prevents assumption-drifts and infinite failure loops). Per the Autoresearch state.md pattern, STATE.md **MUST MANDATORILY ENFORCE** *monotonic progress* and *direction closing* with three required sections:
   1. **Best configuration (Current Verified Facts)** — the current verified working state.
   2. **Closed directions, with evidence** — failed experiments, rejected design paths, and bug root-causes paired with diagnostic evidence. This permanently closes directions: agents MUST NOT retry a known failure or rejected variation. *(Examples in practice: "full-column white mask over hero art — operator rejected"; "unpurged Cloudflare CDN cache deploy — leaves stale edge assets".)* If a closed direction contradicts a WHAT-line in repo `AGENTS.md`, the close is **incomplete** until `PRODUCT.md` and `AGENTS.md` are patched in the same session (`standards/REPO-AGENTS-STATE-PRODUCT-CONTRACT.md`). STATE is not allowed to silently override AGENTS, and AGENTS is not allowed to resurrect a closed product path.
   3. **Prioritized next steps (Next Action)** — ordered, diagnostic-driven next tasks.

**STATE.md must carry a timestamp and Git HEAD (memory-free helm lock).** Every rewrite of STATE.md must include:
- A `Last rewritten:` line with full EDT timestamp (e.g., `2026-07-24 04:10 EDT` or `**Last rewritten:** …`)
- A **Git HEAD short-sha** line — accepted aliases (parse any one):
  - `**HEAD:** eb801ff` (preferred in adhdworks-max-headroom and new repos)
  - `Git HEAD: eb801ff`
  - `HEAD: eb801ff`
- The date of the state update (e.g., `2026-07-24`)
- The session context (e.g., `session: website narrative redesign in progress`)

This timestamp and Git HEAD are not optional — they prove whether STATE.md tracks the actual repository commit when reading across sessions. **Oliver (and any agent) must never rely on memory to keep helm current;** the gate fails closed when HEAD drifts too far.

6. **Same-commit law for code, trail, and helm facts (with HEAD lag rule).**  
   - Product/code changes, a `log.jsonl` trail entry, and a `STATE.md` rewrite of **NOW / CLOSED / NEXT facts** SHOULD land in the **same git commit** whenever possible.  
   - **HEAD field lag ≤ 1 (hard):** after any commit, `STATE.md`’s recorded short-sha MUST be an ancestor of `git rev-parse HEAD` and at most **1** commit behind tip.  
     - Lag `0` = ideal.  
     - Lag `1` = allowed (self-referential SHA is impossible: the commit that writes HEAD changes HEAD).  
     - Lag `> 1` = **FAIL** the worklog gate.  
   - Fix drift with repo helper (when present): `node scripts/state-sync-head.mjs` then `node scripts/state-sync-head.mjs --commit` (or equivalent).  
   - Mid-edit only: `WORKLOG_ALLOW_STATE_HEAD_DRIFT=1` may skip the HEAD check; never leave this set in CI or ship gates.

7. **Mid-session STATE rewrite cadence (not session-end only).** Rewrite `STATE.md` whenever verified facts, bug fixes, deploy state, or open loops change — at least **HEAD + NOW + one Next action**. Do not wait for session close. Session close still requires a full helm rewrite + trail publish + push (invariant 4).

8. **Automated gate enforcement (every managed repo).**  
   - Local quality / pre-commit MUST run `check-worklog-ssot` (repo script) and keep indexes fresh via `worklog-index-build.py` / `worklog-append --rebuild-index`.  
   - Gate **fails** on: invalid `log.jsonl` schema, missing STATE Karpathy sections / `Last rewritten`, **HEAD lag > 1**, stale human indexes, rogue second trails.  
   - Gate **warns** on HEAD lag = 1.  
   - Reference implementation: `adhdworks-max-headroom/scripts/check-worklog-ssot.mjs` (propagate pattern to other repos).

9. **Ship gate — one memory-free ship path (when the repo ships).**  
   Repos that deploy from `main` SHOULD expose a single script (reference: `scripts/ship-gate.sh`):
   - Default: dirty/behind/unpushed → **exit non-zero** with the exact next command.  
   - `SHIP_GO=1` → push `main` after worklog gate green.  
   - `SHIP_GO=1 DEPLOY_GO=1` → push + production deploy + cutover/verify (host-specific).  
   Humans and agents do not hold multi-step ship checklists in working memory; the script is the checklist.

10. **Session open / close (agent loop).**  
    - **Open:** read `STATE.md` first → run `check-worklog-ssot` → print the single **Next action** → `git status -sb` (ahead/behind).  
    - **Close:** append trail → rewrite STATE (facts + HEAD) → rebuild index → commit `worklog/` (+ code) → push if remote work is expected. Prefer `ship-gate` / `state-sync-head` over freeform steps.

11. **Appender-only writes. Automation never touches the helm.**

    **Every** append to `log.jsonl` — by a human, an interactive agent, or a scheduled/cron agent — goes through the repo's appender (`<repo>/scripts/worklog-append.mjs`). Hand-writing a JSON line into the trail is forbidden, and so is writing the trail with `echo`, `cat >>`, a Python one-liner, or any other direct file write.

    **Why this is an invariant and not a preference (incident, 2026-09-22, `x402-autonomous-api`):** five Hermes cron jobs were instructed only *where* to log ("Log to `~/x402-autonomous-api/worklog/log.jsonl`") and never *how*. Given a path and no schema, small models improvised:
    - two runs (`reddit daily presence`, `hn karma building`) hand-wrote lines keyed `ts` / `at` instead of `timestamp`, silently failing `check-worklog-ssot`;
    - one run (`moltbook daily presence`) wrote a Markdown session report **over `worklog/STATE.md`**, destroying 228 lines — every Karpathy section, all 22 numbered task items and all 21 closed directions. It reached the remote and was found only because the gate was run by hand two commits later.

    Therefore:

    | Rule | Applies to |
    |---|---|
    | Append **only** via the repo appender; never hand-write a trail line | everyone, always |
    | **Automation never creates, edits, overwrites or appends to `STATE.md`** — a session report is not helm content | cron, scheduled and unattended agents |
    | A cron prompt that logs **must contain the literal command**, not a path | whoever authors the job |
    | The worklog gate runs in **pre-push**, so a clobbered helm fails at the boundary | every managed repo |

    **Writing a cron prompt that logs.** Give the exact command and both prohibitions:

    ```
    LOG (MANDATORY - run this exact command; do NOT hand-write JSON):
      cd <repo> && node scripts/worklog-append.mjs note "<scope>" "<summary>" "<details>" "<tags>" closed
      NEVER append a hand-written line to worklog/log.jsonl - it omits `timestamp` and fails the gate.
      NEVER create, edit, overwrite or append to worklog/STATE.md. STATE.md is the HELM (current
      facts, closed directions, numbered task list). A session report is NOT helm content.
      Write no other Markdown report file in the repo. The worklog entry IS the report.
    ```

    **Legacy tolerance, strictly bounded.** Pre-existing external lines keyed `ts`/`at` are tolerated by *alias* with a warning rather than edited, because invariant 1 forbids rewriting history. The alias applies **only** to entries with no `id` (i.e. not written by the appender). Any entry carrying an `id` is held to the full schema. New alias entries must never appear — if one does, the cron that wrote it was authored against this rule.

12. **Merges use git's `union` driver on the trail. Nobody resolves a `log.jsonl` conflict by hand or by script.**

    Every managed repo's `.gitattributes` carries exactly this line (installed by `bin/sync-worklog-ssot.sh`):

    ```
    worklog/log.jsonl merge=union
    ```

    With it, a merge, rebase or cherry-pick of two branches that both appended keeps every line from both sides — the trail only grows (invariant 1), git does the combining, and no agent writes the file (invariant 11). After the merge, run the appender once (which rebuilds `WORKLOG.md` / `WORKLOG_INDEX.html` / `entries/`); those browse-layer files are generated views, so a conflict in them is resolved by regenerating, never by hand. `STATE.md` conflicts are resolved by rewriting the helm (invariant 5).

    **Why (incident, 2026-09-24, Coach-Hype-Website + adhdworks-max-headroom):** with no merge driver, every merge of two worklog-appending branches conflicted on `log.jsonl`, and the agent resolved it with a Python script that rewrote the file (union of lines, EDT order). No line was lost, but that is a direct file write forbidden by invariant 11. The driver removes the conflict instead of papering over it.

---

## Memory-free enforcement summary (operator 2026-08-11)

| Obligation | Where enforced | Failure mode |
|------------|----------------|--------------|
| One trail + helm dual | This SSOT + `check-worklog-ssot` | Dual `log.jsonl` / missing STATE |
| STATE HEAD tracks git | `check-worklog-ssot` (lag ≤ 1) | Stale helm after multi-commit work |
| Sync HEAD after product commits | `scripts/state-sync-head.mjs` | Manual rewrite of `**HEAD:**` / `Git HEAD:` |
| Ship without memorizing steps | `scripts/ship-gate.sh` (`SHIP_GO` / `DEPLOY_GO`) | Unpushed / undeployed left silent |
| Indexes not dual SSOT | `worklog-index-build.py` | Stale `WORKLOG.md` fails gate |

**ADHD / disability accommodation:** if a human must “remember” a worklog or ship step, the design is wrong — put it in a gate or a single script with explicit `*_GO=1` tokens.

---

## Run record + Neutral Evidence Report (REPLACED RETIRED CHECK-IN, 2026-10-13)

**Who's who:** *owner* = the human (Oliver / Coach Hype). *author* = the agent writing an entry (field `author`). A *run* = everything since the previous log entry.

| Obligation | Where enforced | Failure mode it closes |
|---|---|---|
| **Check-in process RETIRED (2026-10-13)**: No `{ID} pass/fail yes/no`, no `bin/worklog-checkin.mjs`, no alarm ledgers (`registry/checkin-ids.jsonl`), no `--check-in`, `--intent-honored`, `--satisfied`, `--operator-reply` flags. | `bin/worklog-append.mjs` and all repo loggers | Checking intent and grading against it encouraged gaming and ethical drift. |
| **Neutral Evidence Report**: Every run completes with a neutral evidence report: (1) what changed, (2) what ran and its exact output, (3) what remains unverified or open. No approval-seeking, no satisfaction questions. | `AGENTS.md` Definition of Done + task completion protocol | Passive halting, gaming verification phrases, self-grading deception. |
| Every entry records factual changes: files touched · before · after · removed · verified-by · next. | `bin/lib/run-record.mjs`, used by `worklog-append` | Entries that log an action but hide what was lost or unverified. |
| **ADR-008 Machine-Wide**: Worktrees (`.worktrees/<agent>-<task>`), surgical staging, GitLab MRs only (never push to main), `merge=union` in `.gitattributes`, generated `STATE.md` from `log.jsonl` via `scripts/state-project.mjs`. | Repo pre-commit hooks, `.gitattributes`, `AGENTS.md` | Cross-agent worktree collisions, branch drift, and lost updates in STATE.md. |
| Anything removed → `[REMOVAL]` flag, prefixed to the summary so every index shows it | `bin/worklog-append.mjs` | Removals buried in unrelated commits (2026-08-26 "STATE HEAD sync") |
| **All wording** lives in one SSOT: `standards/worklog-vocabulary.json`. Scripts read it; never hardcode worklog text. | `bin/lib/run-record.mjs` | Wording drift across scripts and docs |
| Every session opens with `worklog-disposition.mjs` + a STATE.md review, relayed to the owner | first line of every `AGENTS.md` (SESSION OPEN) | Agents starting without the last verdict and open tasks |
| Every worklog script prints the disposition verdict + STATE NEXT; agents relay the verdict line to the operator | `worklog-disposition.mjs` (called by append, head-sync, checks) — plain stdout, works for every agent, no vendor hooks | Agents skipping the index / forgetting what is next |
| Missing blocks: machine checker WARNs; adopting repos FAIL | `bin/check-worklog-ssot.mjs` / repo `scripts/check-worklog-ssot.mjs` | Drift |

---

## File Locations

| Layer | Path |
|---|---|
| Project worklog spine | `<repo>/worklog/log.jsonl` |
| **Current-truth state (read FIRST)** | `<repo>/worklog/STATE.md` *(rewritten at session close — see Invariant 5)* |
| Cross-project / system worklog | `~/Documents/Hermes/worklog/log.jsonl` *(create if missing)* |
| Generated human index | `<repo>/worklog/WORKLOG.md` |
| Generated human index (HTML) | `<repo>/worklog/WORKLOG_INDEX.html` |
| Standard pointer | `<repo>/worklog/WORKLOG_STANDARD.md` *(synced from this SSOT)* |
| GBrain telemetry | Follow GBrain's own NDJSON path; mirror there if required |

**No other worklog locations are canonical.** Do not create `*/worklog/log.jsonl` inside subfolders, do not maintain Markdown logs for structured events, and do not duplicate generated indexes at repo root.

### Discovery README (required — amnesiac principle)

Every `worklog/` folder of consequence ships with **`worklog/README.md`** (Discovery tier). Without it the folder fails `SURFACING-ETHOS.md` Rule 1: a cold agent landing here will not know helm vs trail vs handoff.

`README.md` answers four questions in place:

| Question | Content |
|---|---|
| **What is this?** | Project (or system) worklog for *this* repo/path |
| **What does it do?** | Permanent trail of events + current-truth helm |
| **What next?** | Exactly one recommended next step (usually: read `STATE.md`) |
| **How?** | Append `log.jsonl`; rewrite `STATE.md`; never use session handoffs as the issue list |

Canonical template body (adapt paths for Hermes/system logs):

```markdown
# worklog/ — what this folder is

> **Amnesiac landing.** Zero prior context assumed.
> **Law:** `~/Documents/Machine-Norms/standards/WORKLOG_STANDARD.md`
> **Surfacing:** `~/Documents/Machine-Norms/SURFACING-ETHOS.md`

## What this is

The permanent work record for this repository. Not a chat summary. Not a session handoff.

## What it does

| File | Role |
|------|------|
| **STATE.md** | **Helm — read first.** Current facts, active plan, one next action. Rewritten, not appended. |
| **log.jsonl** | **Trail.** Append-only NDJSON events (action, issue, decision, blocker, …). |
| **WORKLOG.md** / **WORKLOG_INDEX.html** | Generated human indexes — do not hand-edit; rebuild with worklog-index-build.py. |
| **WORKLOG_STANDARD.md** | Synced pointer to the machine SSOT — do not invent a second standard. |
| **entries/** | **Generated** per-event Markdown (from log.jsonl only — not agent-authored events). |

## What this is not

| Surface | Use for |
|---------|---------|
| Session handoff (`SESSION-HANDOFF-*.md`, Desktop notes) | Cold-start resume only — points here; never holds open issue lists |
| Chat / agent memory | Ephemeral — promote durable facts into log.jsonl + STATE.md |

## How to use it

1. Run `node ~/Documents/Machine-Norms/bin/worklog-disposition.mjs`, tell the operator its verdict line, then read **STATE.md** (READ FIRST block at the top).
2. To log work: append one JSON line to **log.jsonl** (`event_type`, `scope`, `summary`, EDT `timestamp`).
3. Open issues: `event_type: "issue"`, `status: "open"`. Query: `jq -c 'select(.event_type=="issue" and .status=="open")' log.jsonl`
4. Session close: rewrite **STATE.md**, rebuild index, commit `worklog/`.

## One next step

Open **STATE.md** and do its **Next action** line.
```

`sync-worklog-ssot.sh` does **not** overwrite hand-authored `worklog/README.md` (Discovery is local). New repos: copy this template when creating `worklog/`.

---

## Schema

Required fields: `id`, `timestamp`, `edited_at`, `event_type`, `scope`, `summary`.

`edited_at` records when the entry was last written or amended; on first write
it equals `timestamp`. Entries are atomic: one JSON object per line, written in
a single append.

```json
{
  "id": "uuid",
  "timestamp": "2026-06-24T12:34:56-04:00",
  "edited_at": "2026-06-24T12:34:56-04:00",
  "event_type": "action",
  "scope": "repo/feature",
  "summary": "One-line description",
  "details": "Optional longer explanation",
  "references": ["https://...", "commit-sha"],
  "tags": ["tag1", "tag2"],
  "status": "closed",
  "owner": "agent:Hermes"
}
```

### Event types

- `decision` — architectural or product decisions
- `action` — things done
- `milestone` — shipped/completed phases
- `issue` — known problems
- `blocker` — stopping progress
- `fix` — resolutions
- `deploy` — releases
- `note` — observations

---

## Query Examples

```bash
# All deploys
jq -c 'select(.event_type=="deploy")' worklog/log.jsonl

# Open blockers
jq -c 'select(.event_type=="blocker" and .status=="open")' worklog/log.jsonl

# By scope
jq -c 'select(.scope | contains("stripe"))' worklog/log.jsonl

# Count events by type
jq -r '.event_type' worklog/log.jsonl | sort | uniq -c
```

---

## Human-Readable Summaries

When a human needs a narrative, generate it from the NDJSON log instead of maintaining a separate Markdown log. Example:

```bash
jq -r '[.timestamp, .event_type, .scope, .summary] | @tsv' worklog/log.jsonl | tail -20
```

Markdown handoff files (e.g. `~/Desktop/Outstanding-Issues-Handoff.md`) are acceptable as **derived views**, not as primary logs.

---

## Human Browsing Layer (HTML index + per-entry Markdown)

Every worklog has three layers. The first is written by agents; the other two are **generated, never hand-edited**.

| Layer | Path | Role |
|---|---|---|
| Spine | `<repo>/worklog/log.jsonl` | Canonical NDJSON events (agents append here) |
| Entry detail | `<repo>/worklog/entries/<YYYY-MM-DD_HH-MM-SS>_<slug>.md` | One Markdown file per NDJSON entry; may be enriched by hand after generation |
| Index | `<repo>/worklog/WORKLOG_INDEX.html` + `<repo>/worklog/WORKLOG.md` | Browsable front door; every entry shows `HH:MM:SS EDT` and is grouped by date |

Regenerate the index and scaffold any missing entry files after appending to the log:

```bash
python3 ~/Documents/Machine-Norms/bin/worklog-index-build.py <repo-root>
```

Rules:

- The generator is idempotent: it **creates missing** entry files but never
  overwrites existing ones, so hand-enriched detail survives rebuilds.
- `worklog/WORKLOG_INDEX.html` and `worklog/WORKLOG.md` are fully regenerated on every run —
  do not hand-edit them, and do not place duplicate copies at repo root.
- Each generated entry file includes a `Logged: YYYY-MM-DD HH:MM:SS EDT` line.
- Reference layout: `~/Documents/Hermes/worklog/WORKLOG_INDEX.html` → `entries/`.

---

## Migration from Markdown Worklogs

Existing Markdown worklogs should be left as archives. New events go to NDJSON. Do not rewrite history.

---

## SSOT Propagation

This file is the single source of truth for worklog conventions on this machine.

Run the sync script to propagate it to every managed repo:

```bash
bash ~/Documents/Machine-Norms/bin/sync-worklog-ssot.sh
```

Each repo receives a generated `worklog/WORKLOG_STANDARD.md` with a header that
links back to this canonical file. Do not edit the repo copies directly; edit
this SSOT and re-run the sync.
