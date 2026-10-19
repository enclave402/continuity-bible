---
title: ADR-008 Simulated panel checks verify quotes, a no-read control and a paired difference, and do not decide the winner
doc_id: adr-008-simulated-panel-checks
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/decisions/ADR-008-simulated-panel-checks.md
status: active
last_reviewed: 2026-10-19
canonical: true
---

# ADR-008: simulated panel checks verify quotes, a no-read control and a paired difference, and do not decide the winner

**Status:** accepted, 2026-10-19.
**Deciders:** the public framework already ships scene records, editions and the edit round trip (ADR-006, ADR-007). ADR-007 left the simulated reader panel as the next element and said which text wins is the author's or their readers' call. This decision ships the checks that make a simulated panel honest, and leaves the rest of that element unbuilt.

## Context

A simulated panel is useful only when three things are true. The words a reader claims to have seen are in the text they were given. A reader who was not given the text cannot pass the quiz. The comparison of two texts uses the same readers on both, and the number in the report is the number the script just computed. None of those checks chooses a winner. Treating a simulated score as an audience, or typing a difference into a report, fails the point of the check.

## Decision

1. **Quotes are verbatim.** `scripts/panel.mjs quotes` reads a built story text and an answers file. Each quote must be a non-empty substring of the spread number it names. Anything else exits 1 and names the reader and the spread.
2. **The control can throw the quiz out.** `control` requires at least one reader with `read: false`. If that reader's `quiz_correct` is above `--max` (default 0), the command exits 1 and says the quiz is thrown out.
3. **The paired difference is recomputed.** `paired` averages (variant minus base) for one named numeric field, over readers present on both sides, rounded to two decimals. Readers on one side only are unpaired and are not imputed. `check-report` exits 1 unless the report file is byte-for-byte the text `paired` would write, including the line that the result is simulated and is not a human audience, and that the script does not decide which text wins.
4. **What this slice does not include.** No persona schema, no sandbox, no model runner, and no price-perception questionnaire. Answer files are supplied by the author. The example under `examples/panel/` is arithmetic on the public example story, not evidence about a published book.

## Consequences

A layperson can run the four commands in the how-to on the example and then point the same commands at their own answer files. An agent can prepare those files. It cannot make this script declare a winning text, and it cannot commit a report whose number was typed.

## Left out on purpose

Copying any private panel's reader files, names or measured prices into this repository. A sandbox that calls a model and files the answers. A rule that a paired difference above a threshold is an effect.

## Open loops

A persona record (a dial position and a life, not a label) and a sandbox that shows one reader only its own folder, still to build, and still required to say simulated on every output. A price ladder and the four Van Westendorp questions, as their own element, after this one.
