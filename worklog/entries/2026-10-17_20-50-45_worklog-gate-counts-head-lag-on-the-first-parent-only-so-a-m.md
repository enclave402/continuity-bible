# Worklog gate counts HEAD lag on the first parent only, so a merge from main no longer trips the pre-push hook

- **Logged:** 2026-10-17T20:50:45-04:00
- **Type:** fix · **Scope:** repo/worklog · **Status:** closed
- **Author:** agent:claude · **HEAD:** 1255e47 · **Id:** `wl-f0e2f6f0-8058-4523-be7c-3fcea0e84777`
- **Tags:** fix, gate, worklog

## Details

After merging main (3 commits) the gate reported STATE HEAD 4 behind; the rule is one commit of this branch's own history, not commits merged in. check-worklog.mjs now uses git rev-list --first-parent.

## Run record

- **files:** scripts/check-worklog.mjs
- **before:** pre-push refused: lag 4
- **after:** lag counted first-parent: 1 (allowed)
- **removed:** none
- **verified by:** node scripts/check-worklog.mjs pass after the change
- **next:** commit, push, recheck PR mergeability
