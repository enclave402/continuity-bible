---
id: wl-b8681ed5-36d6-4345-9d8d-6bdef8796a8d
timestamp: 2026-10-21T18:36:36-04:00
edited_at: 2026-10-21T18:36:36-04:00
event_type: action
scope: showcase
status: closed
author: agent:claude
---

# Before & After showcase engine: scripts/showcase.mjs (--new, --check, build of docs/SHOWCASE.md and showcase.html), showcase/TEMPLATE.json, three cases, test/showcase.test.mjs; --check added to npm run verify. Verify green, 144 tests.

**Logged:** 2026-10-21 18:36:36 EDT

Commit 904a836. Cases: the-prosecutors-finger (real pictures, captioned as two versions made before the anchor existed), backwards-phone and phantom-hoodie (labelled SVG diagrams, real prompts; check-affordance --check-prompt exits 1 on before, 0 on after; after wardrobe line is compile-shot's output). The task named examples/story/art/main_read-at-1152-first-try.png and main_read-at-1152.png for the hoodie; they are 16x16 placeholders and the first one's parked reason is a misplaced lamp, so they were not used as evidence. End to end: showcase.html opened in headless Chromium, all 6 images loaded (naturalWidth > 0), the slider changed clip-path to 20%, the prompt diff showed the added guard words; every link in docs/SHOWCASE.md resolves on disk.

**Tags:** `showcase`, `worklog`

---

<details><summary>Raw NDJSON</summary>

```json
{
  "id": "wl-b8681ed5-36d6-4345-9d8d-6bdef8796a8d",
  "timestamp": "2026-10-21T18:36:36-04:00",
  "edited_at": "2026-10-21T18:36:36-04:00",
  "event_type": "action",
  "scope": "showcase",
  "summary": "Before & After showcase engine: scripts/showcase.mjs (--new, --check, build of docs/SHOWCASE.md and showcase.html), showcase/TEMPLATE.json, three cases, test/showcase.test.mjs; --check added to npm run verify. Verify green, 144 tests.",
  "details": "Commit 904a836. Cases: the-prosecutors-finger (real pictures, captioned as two versions made before the anchor existed), backwards-phone and phantom-hoodie (labelled SVG diagrams, real prompts; check-affordance --check-prompt exits 1 on before, 0 on after; after wardrobe line is compile-shot's output). The task named examples/story/art/main_read-at-1152-first-try.png and main_read-at-1152.png for the hoodie; they are 16x16 placeholders and the first one's parked reason is a misplaced lamp, so they were not used as evidence. End to end: showcase.html opened in headless Chromium, all 6 images loaded (naturalWidth > 0), the slider changed clip-path to 20%, the prompt diff showed the added guard words; every link in docs/SHOWCASE.md resolves on disk.",
  "tags": [
    "showcase",
    "worklog"
  ],
  "status": "closed",
  "author": "agent:claude",
  "git_head": "904a836",
  "run": {
    "files": "scripts/showcase.mjs,test/showcase.test.mjs,showcase/TEMPLATE.json,showcase/README.md,showcase/cases/*,docs/SHOWCASE.md,showcase.html,docs/README.md,package.json,worklog/STATE.md",
    "removed": "none",
    "verified_by": "node --test test/showcase.test.mjs (10 pass); npm run verify (exit 0, 144 tests); headless Chromium render of showcase.html",
    "next": "owner reviews and merges pull request 20"
  }
}
```

</details>
