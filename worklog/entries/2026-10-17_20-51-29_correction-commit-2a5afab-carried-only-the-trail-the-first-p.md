# Correction: commit 2a5afab carried only the trail; the first-parent lag change had not been applied (edit anchor mismatch). Applied now in scripts/check-worklog.mjs

- **Logged:** 2026-10-17T20:51:29-04:00
- **Type:** fix · **Scope:** repo/worklog · **Status:** closed
- **Author:** agent:claude · **HEAD:** 2a5afab · **Id:** `wl-83dfb4b9-9818-400d-858f-d4314980d46e`
- **Tags:** fix, correction, gate
- **References:** wl-f0e2f6f0-8058-4523-be7c-3fcea0e84777, 2a5afab

## Details

Evidence: git rev-list --count bb695fe..HEAD is 5 while --first-parent gives 2; the gate now uses the first-parent count. Entry wl-f0e2f6f0 described the intended change; this entry records that it landed one commit later.

## Run record

- **files:** scripts/check-worklog.mjs
- **before:** gate counted merged-in commits as lag
- **after:** gate counts first-parent commits only
- **removed:** none
- **verified by:** grep first-parent scripts/check-worklog.mjs; node scripts/check-worklog.mjs pass
- **next:** push, recheck mergeability
