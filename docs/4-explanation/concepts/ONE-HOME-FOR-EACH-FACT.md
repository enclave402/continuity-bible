---
title: One home for each fact
doc_id: concept-one-home-for-each-fact
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/ONE-HOME-FOR-EACH-FACT.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# One home for each fact

*Also called:* single source of truth, SSOT, system of record, no hard coding

**What it is:** Each fact is written down in exactly one place. Everything else reads it from there.

**Why it matters:** If a fact is typed in two places, one day the two will disagree, and nobody will know which one is right.

**The rule here:** Names, looks, numbers, word lists and paths each live in one file. Scenes and prompts use tokens like `{{id}}` that point to that file. A typed copy is a bug.

**How to use it:** Before you type a fact, ask where its home is. If it has one, point to it. If not, make one and point to it.

**Next step:** Open `character-registry.json` and find the home of one character's name.

## How it connects

This repository's main tool is built on this idea: the registry is the home for every name, and the [character card](CHARACTER-CARD.md) is the home for every look. The [rules the computer checks](RULES-THE-COMPUTER-CHECKS.md) catch a fact that was typed in a second place.

**Source:** Andy Hunt and Dave Thomas on the DRY principle, in [Orthogonality and the DRY Principle](https://www.artima.com/articles/orthogonality-and-the-dry-principle) (Artima, 2003): finding `cps-03` in the [concept page sources card](../../../research/corpus/concept-page-sources.md), status checked. It is about software; using it for story names and looks is this repository's choice.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "One home for each fact",
  "alternateName": [
    "single source of truth",
    "SSOT",
    "system of record",
    "no hard coding"
  ],
  "description": "Each fact is written down in exactly one place. Everything else reads it from there.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
