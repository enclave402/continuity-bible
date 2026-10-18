# new-character.mjs puts a reader's own characters into the registry by answering questions; START-HERE step 3 and the README quick start offer it with a real transcript; a fresh 13-year-old dry run added a girl and a robot and rendered both

- **Logged:** 2026-10-18T18:15:45-04:00
- **Type:** action · **Scope:** scripts/new-character · **Status:** closed
- **Author:** agent:claude · **HEAD:** a539d6d · **Id:** `wl-65d1620c-500f-48b1-b979-df28b969293d`
- **Tags:** layperson, dry-run, new-character

## Details

Three dry runs found that using your own characters is the reader's reason for coming and that hand-editing the registry is where invalid ids, curly quotes and broken commas creep in. The helper asks name, full name, id (made from the full name, Enter takes it; invalid, taken and near ids are said), role, look and what must never change; makes the tutorial's registry or inserts into an existing one keeping every other line; validates schema and one-name-one-person before writing; prints the tokens. A fresh agent playing a 13-year-old made Luna and Bolt from the docs alone; its slow points (a trait joined by and, which steps to repeat after the README, a name in the picture prompt, the June box) are fixed.

## Run record

- **files:** scripts/new-character.mjs, test/new-character.test.mjs, README.md, docs/1-tutorials/START-HERE.md, docs/2-how-to/HOW-TO-ADOPT-THE-REGISTRY.md, docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md, PRODUCT.md, package.json, worklog/STATE.md
- **before:** your own characters meant editing character-registry.json by hand: copy June and Abel's box and change the right words, keeping every quote, comma and brace
- **after:** node ../scripts/new-character.mjs asks about each character and writes the entry; June and Abel typed in are exactly the tutorial's box; the copy-the-box path stays
- **removed:** none
- **verified by:** 83 tests (8 new); npm run verify green; README and START-HERE replayed from their own code blocks in temp clones, both step-3 paths, transcripts on a pseudo-terminal: 25+22 and 11+10 checks, 0 mismatches; compile-shot block equal to the continuity how-to's output; pty: the helper exits by itself on 8 paths incl. Ctrl-C; fresh 13-year-old dry run ended with both own characters rendered
- **next:** a human merges pull request 10, then 12, then this one
