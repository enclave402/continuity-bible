# Worklog standard (this repository)

> Machine-readable first, human-readable second, append-only always. Adapted for a public repository from a machine-wide
> standard: the rules below carry no machine-local paths, and every tool they name lives in `scripts/`.

## Why

Agents loop well against explicit success criteria and badly against a fading context window. The worklog externalises
state: a human gets an honest time-ordered record (not a highlight reel); an agent gets a queryable ground truth it can
read on demand instead of holding in context. One repository has exactly one trail and one helm.

## The two files (intentional dual state)

| File | Role | Written how |
|---|---|---|
| `worklog/STATE.md` | **Helm**: current verified facts, closed directions with evidence, prioritised next steps | Rewritten whenever facts change; never appended |
| `worklog/log.jsonl` | **Trail**: one JSON object per line, forever | Appended through `scripts/worklog-append.mjs` only |

Derived, generated mirrors: `entries/*.md`, `WORKLOG.md`, `WORKLOG_INDEX.html` (`scripts/worklog-index.mjs`). Never a second trail, never a Markdown log as the event store, never a Desktop note as the open-issue list.

## Invariants

1. **Append-only.** No line is deleted, edited or reordered. A correction is a new entry that references the old `id`.
2. **Contemporaneous, generated timestamps.** The appender stamps ISO-8601 with a numeric offset in `WORKLOG_TZ` (default: the machine's zone). Hand-typed timestamps and hand-written lines are schema violations.
3. **Log everything, mistakes included.** A wrong turn is an `issue` or `note` when found; the fix is a later `fix` entry that references it.
4. **STATE.md carries `Last rewritten:` and `**HEAD:** <short-sha>`** and three sections: Current verified facts, Closed directions (with evidence; nobody retries a closed direction), Prioritised next steps (one concrete next action first).
5. **HEAD lag at most 1.** STATE's HEAD must be an ancestor of git HEAD and at most one commit behind. `scripts/check-worklog.mjs` fails above that; `WORKLOG_ALLOW_STATE_HEAD_DRIFT=1` only while mid-edit, never in a hook.
6. **Same commit.** Code, its trail entry and the helm facts it changes land together when possible.
7. **Appender-only writes; automation never touches the helm.** A scheduled or unattended agent appends with the literal command and never creates, edits or overwrites `STATE.md`.
8. **Union merge.** `.gitattributes` carries `worklog/log.jsonl merge=union` so two branches that both appended merge without anyone rewriting the trail. A conflict in a generated file is resolved by regenerating.
9. **Removals are flagged.** Pass `--removed "<what>"`; the summary gets a `[REMOVAL]` prefix so every index shows it.
10. **Gate at the boundary.** `npm run verify` (pre-push) runs `scripts/check-worklog.mjs`.

## Schema

Required: `id`, `timestamp`, `edited_at`, `event_type`, `scope`, `summary`. Optional: `details`, `references[]`, `tags[]`, `status` (`open` | `closed`), `author` (`agent:<name>` | `human:<name>` | `system:<name>`), `git_head`, `run` (`files`, `before`, `after`, `removed`, `verified_by`, `next`).

```json
{"id":"wl-…","timestamp":"2026-10-17T20:10:00-04:00","edited_at":"2026-10-17T20:10:00-04:00","event_type":"action","scope":"research","summary":"Carded the continuity research","tags":["research"],"status":"closed","author":"agent:claude","git_head":"29c7f4c"}
```

## Session loop

- **Open:** read `STATE.md` → `node scripts/check-worklog.mjs` → do the Next action.
- **Close:** append the trail → rewrite `STATE.md` → `node scripts/worklog-index.mjs` → commit `worklog/` with the code.

## Queries

```bash
jq -c 'select(.event_type=="issue" and .status=="open")' worklog/log.jsonl
jq -r '[.timestamp, .event_type, .scope, .summary] | @tsv' worklog/log.jsonl | tail -20
```
