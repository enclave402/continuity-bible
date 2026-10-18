---
title: ADR-003 Continuity gate extensions for the recorded issue classes
doc_id: adr-003-continuity-gate-extensions
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/decisions/ADR-003-continuity-gate-extensions.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# ADR-003: the registry gains declared mechanisms for each way the continuity system was found to go silent

**Status:** accepted, 2026-10-17.
**Deciders:** the owner kept a dated log of issues found in production use of the registry and asked for them to be addressed with best practices in the public repository, for everyone, and then applied privately; the agent designed the mechanisms.

## Context

Eight issues were logged on 2026-10-17 while planning an art program against this registry and its sibling continuity system: run notes with written-out names outside the gate; a scene description duplicated across two data files; a prop matched by substring that stopped matching after a paraphrase; a stage-dependent attribute never compiled; records of two kinds forced through one template; a story-day label contradicting its scene text; a program-data rule covering one file of three; and the designed failure of dated prompt records after a rename. The catalogue is [CONTINUITY-ISSUE-CLASSES.md](../../3-reference/CONTINUITY-ISSUE-CLASSES.md).

Each fix proposed in the log was specific to one file of one project. The owner's rule for this repository is that nothing is hardcoded and every flow adapts to the user's data.

## Decision

Add to the registry, the resolver and the gate, each as a declaration the project writes:

1. **Contextual forms** (`forms.<name> = { by, values }`): a token variant picked by a field of the unit being resolved. `resolveDeep` gives every object's strings that object's own scalar fields as context. No match and no default throws, naming the field. Every variant is a protected label (tokenize migrates it; the gate refuses it written out). Answers class 4.
2. **Props by id** (`kind: "prop"`, `props` as a default label field, `prompt_tokens`, `negative_tokens`): a scene lists its objects as it lists its cast; compilers read the entry. Answers class 3.
3. **Forbidden duplicate keys** (`surfaces[].forbid_keys`): an entry holding a key another file owns fails. Answers class 2.
4. **Exclusive markers** (`surfaces[].exclusive_markers`): declared vocabularies per value of a scene field; text using another value's words fails. Answers class 6.
5. **Coverage** (`coverage.ignore`, `coverage.strict`): every tracked text file is a surface, a token source, a record or ignored; any other file that names a character is reported. Answers classes 1 and 7.
6. **Render** (`scripts/render.mjs`): token sources render to built output with names, per-scene context applied, unknown tokens fatal. Answers classes 1 and 8 together with `records`.
7. Class 5 (record kinds) is a pattern, not an engine feature: a `kind` discriminator with one template per kind, validated by schema. It is documented, with the registry's own typed records as the shape.

The example registry, scene file and art manifest exercise every mechanism, and the tests plant one problem at a time and expect the gate to name it.

## Consequences

- The private project adopts these by editing its registry (globs for its program data, `forbid_keys` on its art manifest, `props` ids on its scenes, a contextual form for its stage-dependent prop, markers for time of day) and by routing its run-notes generator through `render.mjs`. No private data entered this repository to make that possible.
- The gate's output now always answers "is this file checked?": unclassified files are listed as gaps until declared, and `strict` turns them into failures.
- A stage, day or time dimension that lives one level above the scene needs the builder to copy that one scalar onto the scene before resolving; the exclusive markers keep that copy from contradicting the text.
- Substring matching of names in prose is not available anywhere in the engine, on purpose.
