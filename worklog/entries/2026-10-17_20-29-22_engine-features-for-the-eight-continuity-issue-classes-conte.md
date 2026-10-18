# Engine features for the eight continuity issue classes: contextual forms, props by id, forbid_keys, exclusive_markers, coverage report, render.mjs, anchor.mjs; schema v1 extended; 13 new tests

- **Logged:** 2026-10-17T20:29:22-04:00
- **Type:** action · **Scope:** engine · **Status:** closed
- **Author:** agent:claude · **HEAD:** 29c7f4c · **Id:** `wl-64e4b0ae-cc8a-495c-95a2-ccea5031a8b4`
- **Tags:** engine, gate

## Details

Each issue class from the owner's 2026-10-17 log maps to a declared mechanism (docs/3-reference/CONTINUITY-ISSUE-CLASSES.md, ADR-003). The drift note's anchor policies (origin, terminal, consensus, mode) are scripts/anchor.mjs with registry defaults and --write recording (ADR-004). Example registry gains a prop, an art manifest surface and coverage globs.

## Run record

- **files:** scripts/names.mjs, scripts/lib.mjs, scripts/character-registry.v1.schema.json, scripts/render.mjs, scripts/anchor.mjs, character-registry.json, examples/scenes.json, examples/art.json, examples/anchor/*, test/gate.test.mjs, test/anchor.test.mjs, test/tokens.test.mjs
- **before:** gate knew names, aliases, retired forms, token sources, retired-name scan
- **after:** gate also knows props, contextual forms, forbidden duplicate keys, exclusive markers, unclassified files; render and anchor CLIs exist
- **removed:** none
- **verified by:** node scripts/check.mjs pass (4 entries, 7 labels, 2 surfaces, 3 token sources); node --test 20/20 after the message fix
- **next:** docs registry, README, findings merge, verify, commit
