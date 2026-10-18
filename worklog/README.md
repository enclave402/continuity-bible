# worklog/: what this folder is

> **Amnesiac landing.** Zero prior context assumed. Standard: `WORKLOG_STANDARD.md` (this folder).

## What this is

The permanent work record for this repository. Not a chat summary. Not a session handoff.

## What it does

| File | Role |
|---|---|
| **STATE.md** | **Helm. Read first.** Current verified facts, closed directions with evidence, one next action. Rewritten, never appended. |
| **log.jsonl** | **Trail.** Append-only JSON Lines: one event per line (`decision`, `action`, `milestone`, `issue`, `blocker`, `fix`, `deploy`, `note`). |
| **WORKLOG.md**, **WORKLOG_INDEX.html** | Generated indexes. Do not hand-edit; rebuild with `node scripts/worklog-index.mjs`. |
| **entries/** | Generated per-event Markdown from `log.jsonl`. Never agent-authored events. |
| **WORKLOG_STANDARD.md** | The rules: schema, invariants, gate. |

## How to use it

1. Read **STATE.md** and do its **Next action**.
2. Log a real beat (a step done, a decision, a blocker, a correction): `node scripts/worklog-append.mjs --author agent:<name> --event-type action --scope <area> --summary "<one line>"`. Never hand-write a line.
3. Open issues: `--event-type issue --status open`. Query: `jq -c 'select(.event_type=="issue" and .status=="open")' worklog/log.jsonl`.
4. Session close: rewrite **STATE.md** (facts, closed directions, next action, `**HEAD:**`), run `node scripts/check-worklog.mjs`, commit `worklog/` with the code it describes.

## One next step

Open **STATE.md**.
