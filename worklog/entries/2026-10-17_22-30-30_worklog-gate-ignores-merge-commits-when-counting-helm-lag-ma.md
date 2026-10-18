# Worklog gate ignores merge commits when counting helm lag; main's gate had failed after pull requests 3, 4 and 5 landed as merge commits

- **Logged:** 2026-10-17T22:30:30-04:00
- **Type:** fix · **Scope:** repo/worklog · **Status:** closed
- **Author:** agent:claude · **HEAD:** 11cbd2c · **Id:** `wl-94175307-f6b1-4152-bd95-b1211d1be268`
- **Tags:** fix, gate, worklog

## Details

A hosting platform's merge commit carries no helm facts; first-parent, no-merges is the count. Verified in a fresh checkout of main: lag 3 before, 0 after.

## Run record

- **files:** scripts/check-worklog.mjs
- **before:** main: STATE HEAD 6b48ac9 reported 3 behind, gate fail
- **after:** gate pass on main's tree
- **removed:** none
- **verified by:** node scripts/check-worklog.mjs in a detached checkout of origin/main (after the change): pass
- **next:** research sources, STATE, PR
