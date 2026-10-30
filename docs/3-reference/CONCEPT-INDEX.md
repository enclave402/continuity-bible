---
title: Concept index
doc_id: ref-concept-index
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/CONCEPT-INDEX.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Concept index

**What this is:** the list of every process term this repository explains, each with its own page.

**Why it exists:** a term means one thing only when it has one page. Docs link to that page the first time they use the term.

**How to use it:** find the plain word in the left column. The middle column lists the industry words for the same idea, so you can search for either.

**Next step:** open a page and read its five lines: what it is, why it matters, the rule here, how to use it, the next step.

| Plain word | Also called | In one line |
|---|---|---|
| [Character card](../4-explanation/concepts/CHARACTER-CARD.md) | character model sheet, turnaround, character bible, golden record, master data | One page per character that says exactly how they look: face, body, hair, clothes, and the marks that never change. |
| [Brief](../4-explanation/concepts/BRIEF.md) | creative brief, design brief, art brief, creative request | A short note, written before the work starts, that says what to make and what it must show. |
| [One home for each fact](../4-explanation/concepts/ONE-HOME-FOR-EACH-FACT.md) | single source of truth, SSOT, system of record, no hard coding | Each fact is written down in exactly one place. |
| [Asset library](../4-explanation/concepts/ASSET-LIBRARY.md) | digital asset management, DAM, media library, asset register | The one place where finished pictures and other files are kept, each with a name, a version and a status. |
| [Approval steps](../4-explanation/concepts/APPROVAL-STEPS.md) | asset lifecycle, approval workflow, review status, draft, approved, rejected | The stages a picture moves through, such as draft, approved and rejected, and what has to be true to move to the next one. |
| [Made-by record](../4-explanation/concepts/MADE-BY-RECORD.md) | provenance, content credentials, C2PA manifest, chain of custody | A short record kept with a picture that says how it was made: which tool, which inputs, when, and whether it was a new render or an edit. |
| [Second checker](../4-explanation/concepts/SECOND-CHECKER.md) | separation of duties, segregation of duties, maker-checker, four-eyes principle | The person or tool that checks a piece of work is not the one who made it. |
| [Done-when list](../4-explanation/concepts/DONE-WHEN-LIST.md) | acceptance criteria, definition of done, exit criteria | A short list, written before the work starts, of what must be true for the work to count as done. |
| [Backslide](../4-explanation/concepts/BACKSLIDE.md) | regression, regression bug, regression test | Something that used to work and is broken again after a change. |
| [Rules the computer checks](../4-explanation/concepts/RULES-THE-COMPUTER-CHECKS.md) | policy as code, rules as code, guardrails as code | A rule written as a script or data file that a computer can test, instead of only as a sentence in a doc. |
| [Gate](../4-explanation/concepts/GATE.md) | quality gate, stage gate, phase gate, CI check, merge check | A check that must pass before work can move on. |
| [Mistake-proofing](../4-explanation/concepts/MISTAKE-PROOFING.md) | poka-yoke, error-proofing, forcing function | Designing a step so the wrong thing is hard or impossible to do, instead of asking people to be careful. |
| [Required reviewers](../4-explanation/concepts/REQUIRED-REVIEWERS.md) | CODEOWNERS, code owners, required approvals, protected branch | A rule in the code host that says who must approve a change to certain files before it can merge. |
| [Stale docs](../4-explanation/concepts/STALE-DOCS.md) | docs drift, documentation drift, doc rot, docs as code | Docs that no longer match what the code or the files do. |
| [Root cause and lasting fix](../4-explanation/concepts/ROOT-CAUSE-AND-LASTING-FIX.md) | root cause analysis, RCA, CAPA, corrective and preventive action, five whys | Finding the real reason a mistake happened, then changing the process so it cannot happen again. |
| [Fresh render, not a patch](../4-explanation/concepts/FRESH-RENDER-NOT-A-PATCH.md) | destructive editing, clean render, inpainting, re-render from the master, non-destructive editing | When a picture is wrong, you make a new one from the character's card. |
| [Self-explaining part](../4-explanation/concepts/SELF-EXPLAINING-PART.md) | amnesiac principle, amnesiac protocol, amnesiac landing, recognition rather than recall, self-documenting | A file, message or page that tells a newcomer with no memory what it is, why it exists, how to use it and the next step. |
| [Two masters](../4-explanation/concepts/TWO-MASTERS.md) | product and framework, reference implementation, instance and template | Two things kept in step: the product, which is a real story, and the framework, which is the method written down so others can use it. |

## How the list is kept

The terms live in one data file, `docs/_registry/concept_index.json`. The concept link lint, `scripts/concept-links.mjs`, reads it. `node scripts/check-docs.mjs` runs the lint inside `npm run verify`. It fails when:

- a doc uses a term and its first use does not link to the term's page;
- no doc links to a concept page;
- a page is missing one of its lines, or its *Also called* line or search markup differs from the data file;
- this index does not list a page.

To add a term: add an entry to the data file, write its page in `docs/4-explanation/concepts/`, add a row here, and register the page in `docs/_registry/doc_index.json` and `docs/README.md`.
