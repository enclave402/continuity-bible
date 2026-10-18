# Eighth-grade dry run fixes: --ask reads what a beginner types and says it back; broken tokens fail the gate and render; JSON errors name the file, real line and cause; the tutorial and README teach Node, the terminal and making a file

- **Logged:** 2026-10-18T16:50:33-04:00
- **Type:** fix · **Scope:** docs/layperson · **Status:** closed
- **Author:** agent:claude · **HEAD:** 677e180 · **Id:** `wl-8c7911b6-3236-4781-b27f-fa200f151721`
- **Tags:** fix, layperson, dry-run, anchor, gate, render, docs

## Details

From the 2026-10-18 dry run (a fresh agent playing a 13-year-old plus scripted beginner mistakes). Engine: readKeep/readLook in anchor.mjs (colons, case-insensitive trait names, re-ask on unreadable answers, Using: echo, replace note, defaults on end of input, record question on its own line); a registry that exists but is broken stops anchor; missing anchor picture noted. lib.mjs: token_sources files fail unknown ids (closest suggested), unknown forms and lookalikes; other_placeholders opt-out in the schema; checkTokenSourceFile exported; plainer registry-missing and no-match messages. render.mjs: registry loaded like the gate, refuses what the gate would fail, finds files by their on-disk name, checks a mis-capitalised token source. names.mjs parseJson for every JSON read. Docs: start-up basics, quickest no-terminal win, ZIP first, skip note, id/kind rules first, mkdir renders and endings, own pictures, new transcripts, shorter step 10, checked scene 2; README typo and developer lines true; how-to, references, ADR-003 and ADR-004 amendments.

## Run record

- **files:** scripts/anchor.mjs, scripts/lib.mjs, scripts/names.mjs, scripts/render.mjs, scripts/character-registry.v1.schema.json, test/anchor.test.mjs, test/gate.test.mjs, README.md, docs/1-tutorials/START-HERE.md, docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md, docs/2-how-to/HOW-TO-ADOPT-THE-REGISTRY.md, docs/3-reference/REGISTRY-FIELDS.md, docs/4-explanation/decisions/ADR-003-continuity-gate-extensions.md, docs/4-explanation/decisions/ADR-004-retrospective-anchor-policy.md
- **before:** colon and capitalised answers silently misread; misspelled ids passed the gate and lookalikes reached the chatbot; JSON errors without file or real line; render crashed on a bad registry; no doc said how to install Node, open a terminal or make a file
- **after:** every beginner answer read or re-asked and said back; the gate and render refuse broken tokens with the token to write; plain errors everywhere; the docs teach the start-up basics
- **removed:** none
- **verified by:** 61 tests (7 new, none edited); npm run verify green; replay of every README and tutorial command from their own code blocks, 0 mismatches; continuity how-to replay, 0 mismatches; pseudo-terminal probe, 6 of 6 paths exit
- **next:** fresh eighth-grade dry run by a new agent on this branch; fix what it finds; open the pull request
