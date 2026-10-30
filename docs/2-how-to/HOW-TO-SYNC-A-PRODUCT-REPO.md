---
title: How to keep a product repo in sync with the bible
doc_id: how-to-sync-a-product-repo
triadic_leg: diataxis
diataxis_mode: solve
canonical_path: docs/2-how-to/HOW-TO-SYNC-A-PRODUCT-REPO.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# How to keep a product repo in sync with the bible

**What this is.** A way to copy files from this bible into your own story's repo (the product repo) and prove the copies stay the same.
**Why it exists.** The bible holds the rules. Your repo holds a story that follows them. A copied file that someone edits in place drifts away from the bible, and nobody sees it until the two disagree.
**How to use it.** List the files in one small file (the manifest), pull them once, and run the check in your CI.
**Next step.** Copy `scripts/sync-continuity-ssot.mjs` into your repo and write the manifest below.

*Also called:* pinned dependency, vendoring with a lockfile, single source of truth (SSOT), policy as code.

## The idea in one line

Your repo pulls one fixed version of the bible (a commit), and keeps a fingerprint (a sha256 hash) of every file it copied. The bible never pushes into your repo.

## 1. Write the manifest

Put it anywhere in your repo, for example `scripts/continuity-sync.json`:

```json
{
  "_about": "What this is, why it exists, how to use it, next step.",
  "bible": { "commit": "", "track": "origin/main" },
  "files": [
    { "source": "scripts/check-signature-lock.mjs", "target": "scripts/check-signature-lock.mjs", "kind": "check" },
    { "source": "scripts/sync-continuity-ssot.mjs", "target": "scripts/sync-continuity-ssot.mjs", "kind": "check" },
    { "source": "scripts/wardrobe-and-props.v1.schema.json", "target": "schema/wardrobe-and-props.v1.schema.json", "kind": "schema" }
  ]
}
```

- `source` is the path in the bible; `target` is the path in your repo.
- `kind` is `schema`, `check` or `doc`. Schemas get stricter rules (step 4).
- `track` is the bible branch you compare against when the bible is on your machine.

## 2. Pull and pin

From your repo's root folder, with a bible checkout on your machine:

```bash
CONTINUITY_BIBLE_DIR=<path to your bible checkout> node <bible>/scripts/sync-continuity-ssot.mjs --pull scripts/continuity-sync.json --ref <commit>
```

This copies each file as it is at that commit, then writes the commit and each file's hash into the manifest. Commit the copies and the manifest together.

## 3. Check in CI

Add one line to your CI:

```bash
node scripts/sync-continuity-ssot.mjs --check scripts/continuity-sync.json
```

Your CI runner does not need the bible. The check hashes each copy and compares it with the pinned hash, so an edit made in place fails the build. Make the change in the bible first, then pull again.

When `CONTINUITY_BIBLE_DIR` is set (on your own machine), the check also proves each pinned hash matches the bible at the pinned commit, and reports files that changed in the bible since.

## 4. When the bible changes a schema

Schemas carry a version in their name (`.v1.`). If a pinned schema changed in the bible, the check fails with `SCHEMA_MOVED` until you move the pin. Write a migration for your data, then pull with it:

```bash
node <bible>/scripts/sync-continuity-ssot.mjs --pull scripts/continuity-sync.json --migration <your migration file>
```

The pull refuses a changed schema without `--migration`, and records the file on the entry. The new pin and the migration land in one merge request.

## What each line of the check means

| Line | Meaning | Fix |
| :--- | :--- | :--- |
| `OK` | the copy matches its pin | none |
| `CHANGED` | the copy was edited in place | change the bible, then pull |
| `MISSING` | the copy is gone | pull, or remove the entry |
| `NOT_PINNED` | the manifest was never pulled | pull once |
| `PIN_WRONG` | the pinned hash is not the bible's at that commit | pull |
| `SCHEMA_MOVED` | a schema changed in the bible | pull with `--migration` |
| `BEHIND` | a check or doc changed in the bible (not a failure) | pull when you want it |
