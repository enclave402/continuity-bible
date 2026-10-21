---
title: The single mutation gate (mutate.mjs)
doc_id: ref-single-mutation-gate-architecture
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/SINGLE-MUTATION-GATE-ARCHITECTURE.md
status: active
last_reviewed: 2026-10-21
canonical: true
---

# The single mutation gate (`mutate.mjs`)

`scripts/mutate.mjs` is the one door a change to a story goes through. Adding a scene, changing one, retiring one, or saying which wrist a prop is on: each is one command. The command checks every rule before it writes anything, and it leaves one entry in the worklog after it writes.

The design is a **narrow waist**. Many tools and agents sit above it, and the story's files sit below it. Every change passes through the same small script, so every rule lives in one place. Each rule is an **assertion**: a plain check that either passes or stops the run with the reason and the fix. Nothing is guessed, and nothing is fixed silently.

The records it writes: [SCENE-AND-EDITION-FIELDS.md](SCENE-AND-EDITION-FIELDS.md). The token rule: [ADR-003](../4-explanation/decisions/ADR-003-names-gate-scope.md). Retirement and parked pictures: [ADR-006](../4-explanation/decisions/ADR-006-story-element-continuity.md).

## The commands

```bash
node scripts/mutate.mjs add-scene    <story-folder> --slug <slug> --payload <json-file> [--after <slug>] --author <who> --reason <text>
node scripts/mutate.mjs update-scene <story-folder> --slug <slug> --patch <json-file> --author <who> --reason <text>
node scripts/mutate.mjs retire-scene <story-folder> --slug <slug> (--market-test <id> | --owner-auth <text>) --author <who> --reason <text>
node scripts/mutate.mjs set-prop     <story-folder> --slug <slug> --prop <prop-id> --intrinsic-wrist <left|right> \
                                     --camera-facing <facing|back|profile> [--toward <screen-left|screen-right>] --author <who> [--reason <text>]
node scripts/mutate.mjs verify       <story-folder>
```

- `<who>` is `agent:<name>` or `human:<name>`. The worklog records who made the change.
- `--registry <path>` works with every command. The default is `character-registry.json` in the current folder.
- `--worklog <repo>` names the repository whose `worklog/log.jsonl` records the change. The default is the nearest folder at or above the story folder that holds `worklog/log.jsonl`. With no worklog found, the change is refused before anything is written.
- `--market-test <id>` or `--owner-auth <text>` may go on any change. It is required for a change that loses a value (rule 1).
- Exit codes: 0 when the change is written and logged, 1 when a rule refuses it, 2 when the command is malformed.

| Command | What it writes |
| :--- | :--- |
| `add-scene` | A new record in `scenes.json`, placed right after `--after` in every edition, or last when `--after` is left out. The payload is the scene record, with the same fields as any scene. |
| `update-scene` | A [JSON merge patch](https://www.rfc-editor.org/rfc/rfc7386) on one record. A key in the patch adds or replaces that field, and `null` removes it. A list is replaced whole, so to add a paragraph you send the full list with the new one in it. |
| `retire-scene` | Removes the slug from `order` and adds it to `retired`, in every edition that reads it. The record stays in `scenes.json`, and the picture stays in `art/`. |
| `set-prop` | `prop_blocking.<prop-id>` on the scene: the wrist, the camera facing, and the computed screen side. It also adds the prop to the scene's `props` if it is missing. |
| `verify` | Nothing. It runs the story gates, the name checks on every record, and the laterality check on every blocked prop. |

## The assertion rules

All five rules run on every mutation, before any file is written.

### 1. A story only grows (strict additive expansion)

A change that loses a value is refused with exit 1 unless it carries an authorization. The losses it looks for:

- a field removed (`null` in a patch)
- a list that no longer holds every old item in the old order (an item dropped, replaced or reordered). Adding items before, between or after the old ones is fine.
- a value overwritten (a new title, a new picture line, a new layout)
- a scene taken out of a reading order. `retire-scene` always needs an authorization.

There are two kinds of authorization:

- `--owner-auth "<the owner's words>"`: the words go into the worklog entry exactly as typed. They are never written into a token source such as `parked-art.json`, where a name in them would break the names gate.
- `--market-test <id>`: the id must be a test recorded in `<story-folder>/market-tests.json`. The test must have a non-empty `authorized_by`, meaning the author agreed to act on its result, and must list the scene under `authorizes`. Without the file, the test, the authorization or the slug, the change is refused.

```json
{
  "tests": [
    { "id": "mt-01", "decision": "open on the porch; the workshop opening read slower", "authorized_by": "the author", "authorizes": ["across-town"] }
  ]
}
```

Nothing is deleted from disk, even when a change is authorized. The old value stays in the worklog entry's diff. A picture no placed spread loads any more is parked (rule 4).

One exception: `set-prop` may replace an earlier blocking of the same prop in the same scene. That field exists to be corrected toward the canon, and the canon check (rule 3) still applies. The old blocking is printed and kept in the diff.

### 2. Names are tokens

- Every string in a payload or patch, and in the reason when it is written into `parked-art.json`, is checked for a character's or a prop's name written out. A match fails with the token to write instead: `writes the name "Sam". Fix: write the token {{sam-hayes}}`. The check uses the same list of names as the names gate (`atomicLabels` in `scripts/names.mjs`). Keys starting with `_` are notes and are not checked.
- `characters`, `narrator` and each `dialogue[].speaker` must each be one token of a person or companion in the registry, allowed in the story. `margin_author` must hold a token.
- `props` and `--prop` must be registry ids of kind `prop`. A prop's name in their place fails with the id to write. A `{{token}}` there fails too, because a prop is listed by its bare id.
- An id that is not in the registry fails with the nearest ids. An id is never guessed.

### 3. Laterality: the wrist is the character's, the side is the camera's

This rule runs on any change that touches `props`, `prop_blocking` or `picture` (the line that describes the picture), on every `set-prop`, and on every change when the story folder has a `wardrobe-and-props.json`. It uses `scripts/check-prop-continuity.mjs`.

`--intrinsic-wrist` is the character's own wrist, never the viewer's side. The screen side is computed from the wrist and the camera facing:

| Camera facing | Left wrist appears | Right wrist appears |
| :--- | :--- | :--- |
| `facing` (the character faces the camera) | `SCREEN_RIGHT` | `SCREEN_LEFT` |
| `back` (the back is to the camera) | `SCREEN_LEFT` | `SCREEN_RIGHT` |
| `profile --toward screen-left` | `NEAR_SIDE_FOREGROUND` | `FAR_SIDE_OCCLUDED` |
| `profile --toward screen-right` | `FAR_SIDE_OCCLUDED` | `NEAR_SIDE_FOREGROUND` |

The checks, each a refusal:

- `profile` without `--toward` is refused with exit 2. Whether the wrist is on the near side or the far side depends on which way the character faces. `--toward` with any other facing is refused too.
- A stored `screen_side` that differs from the computed one fails. The screen side is never typed by hand.
- A blocked prop that is not in the scene's `props` fails.
- When `<story-folder>/wardrobe-and-props.json` declares the prop (`item_id`, with `worn_on: LEFT_WRIST_ONLY` or `RIGHT_WRIST_ONLY`), the blocking's wrist must match it. This catches the watch drawn on the wrong wrist: `sam-tonneau-watch is worn on the left wrist in wardrobe-and-props.json (sam-hayes), but this scene blocks it on the right. Fix: --intrinsic-wrist left`. The wardrobe file itself must also pass `validatePropLateralityRegistry`.
- The picture line must not mix screen sides and body sides (`Left: ... her left wrist`) without saying which is which (`lintPromptLaterality`).

The field it writes, on a scene:

```json
"prop_blocking": {
  "cracked-phone": { "intrinsic_wrist": "left", "camera_facing": "facing", "screen_side": "SCREEN_RIGHT" }
}
```

| Field | Values | Meaning |
| :--- | :--- | :--- |
| `intrinsic_wrist` | `left`, `right` | The character's own wrist that bears the prop. |
| `camera_facing` | `facing`, `back`, `profile` | How the camera sees the character in this spread. |
| `profile_toward` | `screen-left`, `screen-right` | Only for a profile, and required there. |
| `screen_side` | `SCREEN_LEFT`, `SCREEN_RIGHT`, `NEAR_SIDE_FOREGROUND`, `FAR_SIDE_OCCLUDED` | Computed from the fields above, and checked again by `verify`. |

### 4. Pictures follow the reading orders

- Every picture a payload or patch names must already be in the story's art folder.
- A picture that a placed spread now loads is taken off `parked` in `parked-art.json` (unparked).
- A picture that was loaded before the change and is loaded by no placed spread after it is parked, with a reason that gives the date, the command, the authorization and the `--reason`.
- Nothing is ever moved to `removed`. Removing a picture remains the owner's note, read by `check-story-retired.mjs`.

### 5. Every change is proven and recorded

After the checks pass, the gate:

1. writes `scenes.json`, every edition and `parked-art.json`, keeping each file's indentation;
2. loads the story again and rebuilds `built/`;
3. runs `node scripts/story.mjs check` (built output current, every picture accounted for, nothing deleted);
4. appends one entry through `scripts/worklog-append.mjs` (the only writer of `log.jsonl`), which also rebuilds the worklog index and refreshes the HEAD line of `STATE.md`.

If any step fails, every file it touched is put back byte for byte, and the run exits 1. A change is either fully made and logged, or not made at all.

The entry: `scope` is `story-mutation`, `tags` are `mutate,<command>`, and `summary` names the command, the slug, the spread numbers or the authorization, and the reason. `details` is JSON:

```json
{
  "gate": "mutate.mjs",
  "command": "retire-scene",
  "story": "examples/story",
  "slug": "across-town",
  "author": "agent:claude",
  "reason": "the workshop opening tested slower",
  "authorization": { "kind": "market-test", "id": "mt-01", "decision": "...", "authorized_by": "the author" },
  "art": ["parked main_across-town.png: no placed spread loads it now"],
  "diff": { "editions/sam-first.json": [{ "path": "order", "op": "replace", "before": ["..."], "after": ["..."] }] }
}
```

`run.files` lists the files written, and `run.verified_by` names the story check.

## Try it on a copy

The example story is part of the repository, so try the gate on a copy. These commands make one, add the first render of the kitchen table as its own spread (the picture is parked today), block the phone on the porch, and verify:

```bash
cp -R examples/story /tmp/story-copy
cat > /tmp/first-try.json <<'EOF'
{
  "title": "The first try",
  "narrator": "{{chloe-jenkins}}",
  "characters": ["{{sam-hayes}}", "{{chloe-jenkins}}"],
  "props": ["cracked-phone"],
  "paragraphs": ["{{chloe-jenkins}} turned the lamp toward the table, and {{sam-hayes}} watched the screen."],
  "picture": "A kitchen table under a lamp set in the wrong place, a phone face up.",
  "time": "Thursday, 11:55 PM",
  "layout": "single",
  "art": ["main_read-at-1152-first-try.png"]
}
EOF
node scripts/mutate.mjs add-scene /tmp/story-copy --slug read-at-1152-first-try --payload /tmp/first-try.json --after read-at-1152 --author human:me --reason "the first render earns a spread" --worklog .
node scripts/mutate.mjs set-prop /tmp/story-copy --slug the-porch --prop cracked-phone --intrinsic-wrist left --camera-facing facing --author human:me --worklog .
node scripts/mutate.mjs retire-scene /tmp/story-copy --slug across-town --author human:me --reason "try it"
node scripts/mutate.mjs verify /tmp/story-copy
```

The first two print what they wrote and the worklog line. `--worklog .` records them in this repository's worklog, so run them in a scratch clone if you do not want the entries. The third is refused with exit 1 and says to add `--market-test` or `--owner-auth`. The fourth passes.

## What the gate does not cover yet

- `scripts/story-variants.mjs apply` (ADR-007) and `scripts/check-story-art.mjs --park` still write the story's files directly, and so does any hand edit. `verify` catches a hand edit that breaks a rule, but a hand edit that follows every rule is not recorded in the worklog. One possible next step: have `mutate.mjs` write a hash of the story's files after each change, and have `verify` report any change made outside the gate.
- The market-test ledger checks that a test exists, was authorized and lists the scene. It does not check how the test was run; that belongs to the panel check ([ADR-008](../4-explanation/decisions/ADR-008-simulated-panel-checks.md)).
- Laterality is checked on the records and on the picture line. Checking the finished picture itself, by reading which wrist the watch is actually on, is still open.
