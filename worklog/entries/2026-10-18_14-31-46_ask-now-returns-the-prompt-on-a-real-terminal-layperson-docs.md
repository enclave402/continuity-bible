# --ask now returns the prompt on a real terminal; layperson docs corrected where they disagreed with the engine or the code (unclear -> unknown, the network claim, the recorded-anchor block, the shot-to-shot command's prerequisites)

- **Logged:** 2026-10-18T14:31:46-04:00
- **Type:** fix · **Scope:** engine/anchor · **Status:** closed
- **Author:** agent:claude · **HEAD:** 117f36c · **Id:** `wl-d84cce32-c0c2-4bd6-827e-0d42a0ed2cba`
- **Tags:** fix, anchor, docs, layperson, regression

## Details

Found by re-testing current main from the first-time reader's seat. (1) scripts/anchor.mjs --ask created a readline reader on stdin and never closed it, so on a real terminal the command printed its last line and then waited for Ctrl-C; piped tests ended stdin and hid it. Reproduced on a pseudo-terminal on all exit paths (5 of 6 hung on origin/main's script; Ctrl-D already exited because it ends stdin), fixed by closing the reader when main() ends, whichever way it ends. A regression test now feeds the answers on a stdin pipe that stays open and requires the process to exit by itself on four paths (decline, record, --write, no --character); it failed on the unfixed code first. (2) The browser-chatbot how-to told readers to write 'unclear' for a trait they could not tell, which the engine bills as drift; it now says 'unknown' (the engine's unreadable word) and ADR-004 gets a third amendment superseding the old advice. (3) README said the scripts never touch the network; the research scripts do, so the claim is limited to the scripts the guide uses and the developer section names the research tools and their config. The tutorial's 'nothing here talks to any service' now starts after the download. (4) The tutorial's recorded-anchor block gains the cannot_tell count the engine now writes. (5) The README's compile-shot command needs the continuity how-to's files; the README now says so, and its output block was verified by replaying that how-to's registry, cards, shot sheet, template and picture-prompt fix: it equals the real output.

## Run record

- **files:** scripts/anchor.mjs, test/anchor.test.mjs, docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md, docs/1-tutorials/START-HERE.md, README.md, docs/4-explanation/decisions/ADR-004-retrospective-anchor-policy.md, worklog/STATE.md
- **before:** --ask hung on a terminal after its last line; how-to advised 'unclear'; README claimed no script touches the network; tutorial block one field behind; README shot command shown with no prerequisite
- **after:** --ask exits by itself on every path on a pseudo-terminal; how-to says 'unknown'; claims limited to what the code does; tutorial block matches the engine; README states the prerequisite and the output is verified against the how-to
- **removed:** none
- **verified by:** new regression test failed before the fix and passes after; pseudo-terminal probe 6 of 6 exit by themselves after the fix; npm run verify green (54 tests); replay of every tutorial and README command from their own code blocks, 0 mismatches, plus a separate replay of the continuity how-to through its render-surface step
- **next:** human review and merge of this branch's pull request
