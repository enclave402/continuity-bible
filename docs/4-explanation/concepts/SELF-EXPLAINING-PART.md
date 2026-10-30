---
title: Self-explaining part
doc_id: concept-self-explaining-part
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/SELF-EXPLAINING-PART.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Self-explaining part

*Also called:* amnesiac principle, amnesiac protocol, amnesiac landing, recognition rather than recall, self-documenting

**What it is:** A file, message or page that tells a newcomer with no memory what it is, why it exists, how to use it and the next step.

**Why it matters:** People and agents arrive with no memory of past talks. If the part explains itself, nobody has to hold the context in their head.

**The rule here:** Every file, doc, check and error message opens with those four things, in plain words.

**How to use it:** At the top of what you write, answer: what is this, why does it exist, how do I use it, what do I do next?

**Next step:** Open a file you wrote and check that its top lines answer the four questions.

## The four-line header

A part is any script, schema, data file or doc. Each one opens with four labelled lines, in this order:

1. **What this is:** one plain sentence on what the part is.
2. **Why it exists:** the problem it solves, or what goes wrong without it.
3. **How to use it:** the command to run, or how to read or edit it.
4. **Next step:** the one thing to do after reading.

Each kind of file keeps the four lines in its own place:

| Kind of file | Where the four lines go |
|---|---|
| Script | the comment block at the top, as `What this is:`, `Why it exists:`, `How to use it:`, `Next step:` |
| Data file (JSON) | an `_about` object at the top, with the keys `what`, `why`, `how`, `next` |
| Schema | the schema's top `description`, as the four labelled sentences; every field also has its own `description` |
| Doc | the front matter, as `what:`, `why:`, `how:`, `next:`, or the four labelled lines near the top of the page |

The four lines read at grade 8 or below. The grade is the Flesch-Kincaid score from `scripts/reading-grade.mjs`. It is a guess based on word and sentence length, so the limit lives in a config file and was set by scoring headers we already trust.

The file's name must match what its header says. A word of the name shows up in the *What this is* or *Why it exists* line. A file called `check-lanes` that mostly checks wording, not lanes, fails.

## How the computer checks it

`scripts/check-self-explaining.mjs` runs inside `npm run verify`. Every rule, list and limit it uses lives in `scripts/self-explaining.config.json`, each with its reason. It fails when a part:

- is missing one of the four lines, or has them out of order;
- has a header above the grade limit;
- has a name its header never uses;
- is a schema with a field that has no `description`.

Each failure names the file, what is missing and the one next step.

Old parts that had no header when the check began wait in `scripts/self-explaining-baseline.json`. That list only shrinks. A part in it that you edit must get its header in the same change, and a fixed part must leave the list (`--update-baseline` drops it).

`scripts/parts-map.mjs` writes the [parts map](../../3-reference/PARTS-MAP.md): one page listing every part with its *What this is* line. The check fails when the map is out of date.

## How it connects

A self-explaining part is one half of [two masters](TWO-MASTERS.md) working well: anyone can pick up either side. It also slows [stale docs](STALE-DOCS.md). The header check is one of the [rules the computer checks](RULES-THE-COMPUTER-CHECKS.md), and it runs in the repository's [gate](GATE.md).

**Source:** [Memory recognition and recall in user interfaces](https://www.nngroup.com/articles/recognition-and-recall/) (Nielsen Norman Group; loaded 2026-10-30; not yet a research card).

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Self-explaining part",
  "alternateName": [
    "amnesiac principle",
    "amnesiac protocol",
    "amnesiac landing",
    "recognition rather than recall",
    "self-documenting"
  ],
  "description": "A file, message or page that tells a newcomer with no memory what it is, why it exists, how to use it and the next step.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
