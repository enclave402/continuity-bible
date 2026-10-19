---
title: How to check a simulated reader panel
doc_id: how-to-check-a-simulated-panel
triadic_leg: diataxis
diataxis_mode: solve
canonical_path: docs/2-how-to/HOW-TO-CHECK-A-SIMULATED-PANEL.md
status: active
last_reviewed: 2026-10-19
canonical: true
---

# How to check a simulated reader panel

Outcome: you can check answer files against the text a reader was given. A quoted line must appear in the spread it names. A reader who was not given the story must score at the floor of the quiz, or the quiz is thrown out. The same readers on two texts produce one paired difference. The script writes that difference and then refuses a report that does not match the recomputation. It does not decide which text wins. Simulated answers are not a human audience.

This page uses `examples/story/built/sam-first.txt` and `examples/panel/`. The numbers in those files are an arithmetic example, not a study. Field by field the story stays in [how the story is kept as records](HOW-TO-REORDER-AND-RETIRE-SPREADS.md). Which text is written back stays in [how to test a change before you make it](HOW-TO-TEST-A-CHANGE-BEFORE-YOU-MAKE-IT.md). Why the machine does not pick the winner: [ADR-008](../4-explanation/decisions/ADR-008-simulated-panel-checks.md).

## 1. Check the quotes

```bash
node scripts/panel.mjs quotes --text examples/story/built/sam-first.txt --answers examples/panel/quotes-ok.json
```

`panel: quotes OK (1 quotes)` means the one quoted line is a verbatim substring of spread 1. A paraphrase fails and names the reader and the spread.

## 2. Check the no-read control

```bash
node scripts/panel.mjs control --answers examples/panel/control-ok.json
```

One reader has `"read": false` and `"quiz_correct": 0`. A no-read score above `--max` (the default is 0) prints `quiz thrown out` and exits 1. A file with no no-read reader fails the same way. That reader is the check that the quiz is not giving points for nothing.

## 3. Print the paired difference, and prove the report

```bash
node scripts/panel.mjs paired --base examples/panel/base.json --variant examples/panel/variant.json --field satisfaction --out examples/panel/report.md
node scripts/panel.mjs check-report --base examples/panel/base.json --variant examples/panel/variant.json --field satisfaction --report examples/panel/report.md
```

The first command prints `Simulated. This is not a human audience. The script does not decide which text wins.` and the mean of (variant minus base) for readers who answered both, to two decimals. A reader on only one side is counted as unpaired and is not filled in. The second command recomputes that report and exits 1 if the file differs. Do not type the number into the report.

Your own answers use the same shape: a `readers` array, an `id` on each reader, `quotes` as `{ "spread", "text" }`, and the numeric field you name to `paired`. Mark a simulated run as simulated in the report the script writes. Price questions and a persona sandbox are not in this command.
