---
title: How to lock each lead's signature wardrobe
doc_id: how-to-lock-signature-wardrobes
triadic_leg: diataxis
diataxis_mode: solve
canonical_path: docs/2-how-to/HOW-TO-LOCK-SIGNATURE-WARDROBES.md
status: active
last_reviewed: 2026-10-25
canonical: true
---

# How to lock each lead's signature wardrobe

When an image generator draws a group, it borrows. The lead's signature boots turn up on two other characters, a companion that belongs to one person appears in someone else's scene, and two leads drift into the same jacket. After a few renders nobody owns a look any more. Rule SIG-LOCK-001 makes ownership data that a check enforces.

## The rule

```
[RULE SIG-LOCK-001][SEVERITY: BLOCK]
[OWNER: {{id}} of one lead]  [ITEM: <owner>.<slot>.<item>]
[NEAR_VARIANT: one clause of a look that holds a colour_family word AND a silhouette phrase of the item]
[FORBID: any character other than OWNER whose look matches ITEM or NEAR_VARIANT]
[FORBID: two leads whose items share a colour and a silhouette]
[PROPS: a companion is an item and travels with its owner's token]
[ON_VIOLATION: the check exits 1; live art that breaks the rule is listed in known_violations with the task that fixes it]
```

## Steps

1. **Put the lock on the lead's own card.** Add `signature_lock` (and, for faces, `face_lock`) to the lead's entry; the shapes are in `scripts/signature-lock.v1.schema.json`. Describe what the lead wears in rendered art, and nothing about anyone else. A lead whose look lives in a Markdown profile can carry the same object in a ```` ```json ```` block there.
2. **Keep each lock narrow.** A silhouette phrase must name something only that lead wears: "teal riding boot", not "boot". If the check reports an overlap between two leads, narrow one of them. Never loosen the check.
3. **Write the config.** `signature-locks.json` lists `lock_sources` (where each lead's items live), `scan` (card folder, pack file, image records), `distinct_from` (how each pair of leads must never look alike, by token), `known_violations`, and `engine` (`source` and `sha256`). The example is `examples/signature-lock/`.
4. **Run it.** `SIG_LOCK_ROOT=examples/signature-lock node scripts/check-signature-lock.mjs signature-locks.json`, or `npm run check:locks`. In your own project, run `node scripts/check-signature-lock.mjs <path to your config>` in CI.
5. **Handle live art honestly.** When published art already breaks the rule, add a `known_violations` entry naming the item, the place (`file#record`), the task that re-renders it, and the reason. The check prints it as KNOWN and passes. Once the art is fixed it fails the entry as stale, so the list only shrinks. An entry whose lock is not on any card yet prints as PENDING, so the card change and the config can merge in either order.
6. **Write prompts that obey it.** For a group render, attach each lead's reference image and list the other leads' locked items as forbidden on every figure that is not their owner.

## Keeping one engine in two repositories

The engine is one file, `scripts/check-signature-lock.mjs`. This repository holds the source. A project that uses it copies the file whole and records its sha256 in its own config under `engine`:

1. Change the engine here first, with a test in `test/signature-lock.test.mjs`.
2. Copy the file byte for byte into the project's `scripts/`.
3. Put the new `shasum -a 256 scripts/check-signature-lock.mjs` value in the project's config.

A copy edited in place, or a config left on an old hash, fails with "engine drift", so the two can never quietly diverge. Each project keeps only its own data and config.
