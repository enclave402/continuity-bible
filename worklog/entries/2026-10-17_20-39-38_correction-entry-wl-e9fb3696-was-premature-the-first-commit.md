---
id: wl-aec58947-21b8-4b20-8439-3f1288308365
timestamp: 2026-10-17T20:39:38-04:00
edited_at: 2026-10-17T20:39:38-04:00
event_type: fix
scope: repo
status: closed
author: agent:claude
---

# Correction: entry wl-e9fb3696 was premature; the first commit chain was refused by the pre-commit hook (coverage test read the hook's GIT_DIR). textFiles() now ignores hook env and lists only its own checkout; four commits landed

**Logged:** 2026-10-17 20:39:38 EDT

Root cause: inside a git hook GIT_DIR and GIT_INDEX_FILE point at the real repository, so a test's temporary copy listed the real index instead of walking its own files and the planted unclassified file was never seen. Fix in scripts/lib.mjs textFiles(): strip GIT_* variables and require that the root is the checkout's top level, else walk. Verified with the same tests under a simulated hook environment (20/20) and plain (20/20).

## References
- `wl-e9fb3696-f16e-4e06-bf8c-e4c858ed0ba1`
- `scripts/lib.mjs`

**Tags:** `fix`, `gate`, `hooks`

---

<details><summary>Raw NDJSON</summary>

```json
{
  "id": "wl-aec58947-21b8-4b20-8439-3f1288308365",
  "timestamp": "2026-10-17T20:39:38-04:00",
  "edited_at": "2026-10-17T20:39:38-04:00",
  "event_type": "fix",
  "scope": "repo",
  "summary": "Correction: entry wl-e9fb3696 was premature; the first commit chain was refused by the pre-commit hook (coverage test read the hook's GIT_DIR). textFiles() now ignores hook env and lists only its own checkout; four commits landed",
  "details": "Root cause: inside a git hook GIT_DIR and GIT_INDEX_FILE point at the real repository, so a test's temporary copy listed the real index instead of walking its own files and the planted unclassified file was never seen. Fix in scripts/lib.mjs textFiles(): strip GIT_* variables and require that the root is the checkout's top level, else walk. Verified with the same tests under a simulated hook environment (20/20) and plain (20/20).",
  "references": [
    "wl-e9fb3696-f16e-4e06-bf8c-e4c858ed0ba1",
    "scripts/lib.mjs"
  ],
  "tags": [
    "fix",
    "gate",
    "hooks"
  ],
  "status": "closed",
  "author": "agent:claude",
  "git_head": "097d83c",
  "run": {
    "files": "scripts/lib.mjs, CHANGELOG.md, worklog/**",
    "before": "no commits on the branch; hook failing",
    "after": "4 commits on the branch; hook green; CHANGELOG regenerated",
    "removed": "none",
    "verified_by": "GIT_DIR=... node --test 20/20; node --test 20/20; node scripts/check.mjs pass",
    "next": "commit the trail, push, open the PR"
  }
}
```

</details>
