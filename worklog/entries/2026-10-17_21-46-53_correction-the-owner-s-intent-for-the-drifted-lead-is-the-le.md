# Correction: the owner's intent for the drifted lead is the least-regeneration anchor (consistency over endpoint), not canon restoration; ADR-004, the drift how-to, PRODUCT.md and STATE.md now say so

- **Logged:** 2026-10-17T21:46:53-04:00
- **Type:** fix · **Scope:** product · **Status:** closed
- **Author:** agent:claude · **HEAD:** b5ca135 · **Id:** `wl-d29d47d3-5317-4ace-8b74-9e77e8a89ddc`
- **Tags:** correction, product, anchor
- **References:** wl-b939ce37-91fc-4cc5-9480-dcc596329204, docs/4-explanation/decisions/ADR-004-retrospective-anchor-policy.md

## Details

Source: the owner's own research thread pasted 2026-10-17 evening: they do not care whether she matches the beginning or the end; the goal is the fewest regenerations; lighter or darker skin is acceptable as long as she is consistent. Entry wl-b939ce37 and the first canon-policy docs stated the opposite, inferred from product principles rather than from the owner's words. The canon policy stays as an option for users whose drift is a defect. The Sam session was redirected by message to consensus (mode as cross-check), owner confirmation of the anchor before regeneration, and reconciliation of the profile prose to the adopted anchor.

## Run record

- **files:** docs/4-explanation/decisions/ADR-004-retrospective-anchor-policy.md, docs/2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md, PRODUCT.md, worklog/STATE.md
- **before:** docs said the engine must let canon win for the owner's case
- **after:** docs say every policy shows its bill and the person chooses; the proof case takes the least-regeneration state
- **removed:** none
- **verified by:** grep for the stale phrases returns nothing; npm run verify
- **next:** push; confirm PR 4 and PR 5 still merge cleanly on top
