---
title: Mistake-proofing
doc_id: concept-mistake-proofing
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/MISTAKE-PROOFING.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Mistake-proofing

*Also called:* poka-yoke, error-proofing, forcing function

**What it is:** Designing a step so the wrong thing is hard or impossible to do, instead of asking people to be careful.

**Why it matters:** People and tools make mistakes. A design that blocks the mistake does not depend on anyone reading a warning.

**The rule here:** When a mistake repeats, change the tool or the format so it cannot happen, then add a check.

**How to use it:** Ask: what would make this mistake impossible? A token instead of a typed name is one answer.

**Next step:** Pick one repeated mistake and write down one way to make it impossible.

## How it connects

Mistake-proofing is the strongest kind of [lasting fix](ROOT-CAUSE-AND-LASTING-FIX.md). Where it cannot block the mistake, a [quality gate](GATE.md) catches it.

**Source:** [Poka-yoke](https://en.wikipedia.org/wiki/Poka-yoke), finding `cps-11` in the [concept page sources card](../../../research/corpus/concept-page-sources.md), status checked. Wikipedia.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Mistake-proofing",
  "alternateName": [
    "poka-yoke",
    "error-proofing",
    "forcing function"
  ],
  "description": "Designing a step so the wrong thing is hard or impossible to do, instead of asking people to be careful.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
