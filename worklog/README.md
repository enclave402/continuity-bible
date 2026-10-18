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
| **WORKLOG.md** / **WORKLOG_INDEX.html** | Generated human indexes — do not hand-edit; rebuild with `worklog-index-build.py`. |
| **WORKLOG_STANDARD.md** | Synced pointer to the machine SSOT — do not invent a second standard. |
| **entries/** | Optional per-event Markdown detail (generated scaffold). |

## How to use it

1. Read **STATE.md**.
2. To log work: append one JSON line to **log.jsonl** (`event_type`, `scope`, `summary`, EDT `timestamp`).
3. Session close: rewrite **STATE.md**, rebuild index via `worklog-index-build.py`, commit `worklog/`.

## One next step

Open **STATE.md** and do its **Next action** line.
