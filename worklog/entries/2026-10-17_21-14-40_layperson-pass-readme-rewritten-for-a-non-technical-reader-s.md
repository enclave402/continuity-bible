# Layperson pass: README rewritten for a non-technical reader; START-HERE tutorial and browser-chatbot how-to added; anchor CLI says 'no scores' instead of null when rows carry tags only

- **Logged:** 2026-10-17T21:14:40-04:00
- **Type:** action · **Scope:** docs/layperson · **Status:** closed
- **Author:** agent:claude · **HEAD:** b5ca135 · **Id:** `wl-bc605700-b2ac-4926-aae9-76839ec5e89c`
- **Tags:** docs, layperson, tutorial, anchor

## Details

Owner direction of 2026-10-17 evening (PRODUCT.md): completely layperson-friendly, browser-chatbot proof case, no API. README now leads with the problem in the reader's words, the promise, a three-step quick start on Node plus a browser chatbot, one command per capability, and a For developers section linking the technical docs unchanged. docs/1-tutorials/START-HERE.md walks two characters, one scene, a rendered prompt sheet, pasted into a chatbot, four saved pictures, hand tags, every anchor policy, the comparison line, --write. docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md covers names out of pasted prompts, file naming by scene and order, hand-tag conventions, canon versus consensus, and what the engine cannot do without embeddings. Both registered; PRODUCT.md moves the layperson pass from Planned to Deliverables.

## Run record

- **files:** README.md, docs/1-tutorials/START-HERE.md, docs/2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md, docs/README.md, docs/_registry/doc_index.json, PRODUCT.md, scripts/anchor.mjs, test/anchor.test.mjs
- **before:** README led with compile-time token resolution for developers; docs/1-tutorials/ empty; a tags-only anchor run printed '(null to redo)' in the comparison line and no explanation
- **after:** README for a layperson; 13 docs registered (1 tutorial, 4 how-tos); anchor prints a line saying tags alone pick the anchor and embeddings would price the drift, and 'no scores' per policy; 22 tests
- **removed:** none
- **verified by:** npm run verify green; a harness extracted every code block from README and the tutorial, built the story folder from them, ran 9 tutorial and 5 README commands and matched each shown output exactly; publication gate on the changed files with the owner's private terms loaded
- **next:** commit, push, open a pull request to main stacked on pull request 3; record the number in STATE
