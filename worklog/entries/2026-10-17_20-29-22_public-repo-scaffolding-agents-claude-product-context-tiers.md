---
id: wl-1370c21f-732b-4f1d-a928-e4fc4963fb65
timestamp: 2026-10-17T20:29:22-04:00
edited_at: 2026-10-17T20:29:22-04:00
event_type: action
scope: repo/norms
status: closed
author: agent:claude
---

# Public-repo scaffolding: AGENTS/CLAUDE/PRODUCT, .context tiers, worklog spine + appender/index/gate, publication gate, git hooks, hygiene files, docs placement policy, cliff.toml

**Logged:** 2026-10-17 20:29:22 EDT

Every mechanism is repository-native: no path outside the repo, defaults in config with env overrides. check-private.mjs runs on every commit and on every research card; pre-push runs npm run verify and refuses direct pushes to main.

**Tags:** `norms`, `scaffold`

---

<details><summary>Raw NDJSON</summary>

```json
{
  "id": "wl-1370c21f-732b-4f1d-a928-e4fc4963fb65",
  "timestamp": "2026-10-17T20:29:22-04:00",
  "edited_at": "2026-10-17T20:29:22-04:00",
  "event_type": "action",
  "scope": "repo/norms",
  "summary": "Public-repo scaffolding: AGENTS/CLAUDE/PRODUCT, .context tiers, worklog spine + appender/index/gate, publication gate, git hooks, hygiene files, docs placement policy, cliff.toml",
  "details": "Every mechanism is repository-native: no path outside the repo, defaults in config with env overrides. check-private.mjs runs on every commit and on every research card; pre-push runs npm run verify and refuses direct pushes to main.",
  "tags": [
    "norms",
    "scaffold"
  ],
  "status": "closed",
  "author": "agent:claude",
  "git_head": "29c7f4c",
  "run": {
    "files": "AGENTS.md, CLAUDE.md, PRODUCT.md, CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, .editorconfig, .gitattributes, .gitignore, .env.example, cliff.toml, .context/**, worklog/**, scripts/check-private.mjs, scripts/check-private.config.json, scripts/worklog-append.mjs, scripts/worklog-index.mjs, scripts/check-worklog.mjs, scripts/check-docs.mjs, scripts/git-hooks/*, scripts/install-git-hooks.sh, scripts/cleanup*",
    "before": "none of these existed",
    "after": "all present; worklog gate pass; publication gate pass",
    "removed": "none",
    "verified_by": "node scripts/check-worklog.mjs; node scripts/check-private.mjs",
    "next": "research toolchain"
  }
}
```

</details>
