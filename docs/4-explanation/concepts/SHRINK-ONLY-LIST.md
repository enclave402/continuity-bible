---
title: Shrink-only list
doc_id: concept-shrink-only-list
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/SHRINK-ONLY-LIST.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Shrink-only list

*Also called:* ratchet, baseline, grandfather list, known-issues baseline

**What it is:** A list of old problems a check lets through for now. Items can leave the list, but none can join it.

**Why it matters:** A new check would fail on every old file at once. The list lets old files wait, while new work must pass.

**The rule here:** A script writes the list once. A fixed item must leave it. An item that someone changes must be fixed in that change.

**How to use it:** Never add to the list by hand. When you fix an item, run the check's update step to drop it.

**Next step:** Open `scripts/self-explaining-baseline.json`, pick one file, and fix it.

## How it connects

A shrink-only list stops a [backslide](BACKSLIDE.md): the count can only go down. It is one of the [rules the computer checks](RULES-THE-COMPUTER-CHECKS.md).

**Source:** [Ratchets in software development](https://qntm.org/ratchet) (qntm, 2021; loaded 2026-10-30). No paper or standard defines the term; this practitioner's post is the clearest first-hand account found. In this repo's research: finding `rgrs-03` in [research findings](../../../research/FINDINGS.jsonl), status checked; card `reading-grade-and-ratchet-sources`.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Shrink-only list",
  "alternateName": [
    "ratchet",
    "baseline",
    "grandfather list",
    "known-issues baseline"
  ],
  "description": "A list of old problems a check lets through for now. Items can leave the list, but none can join it.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
