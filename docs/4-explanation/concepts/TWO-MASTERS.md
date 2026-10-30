---
title: Two masters
doc_id: concept-two-masters
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/TWO-MASTERS.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Two masters

*Also called:* product and framework, reference implementation, instance and template

**What it is:** Two things kept in step: the product, which is a real story, and the framework, which is the method written down so others can use it.

**Why it matters:** The method is trusted because it worked on a real product first. Keeping both in step means a lesson learned on one reaches the other.

**The rule here:** The framework (this repository) defines the method. The product holds one real use of it. A check shows the two agree.

**How to use it:** When you learn something on the product, write the general method here, with no private names. The product then links to it, and never copies it.

**Next step:** Read `PRODUCT.md`, section "Why this exists: two masters".

## How it connects

Each fact has [one home](ONE-HOME-FOR-EACH-FACT.md), so the product links to the framework's pages instead of copying them. A [self-explaining part](SELF-EXPLAINING-PART.md) makes either side easy to pick up.

**Source:** [Reference implementation](https://en.wikipedia.org/wiki/Reference_implementation), finding `cps-16` in the [concept page sources card](../../../research/corpus/concept-page-sources.md), status checked. Wikipedia; the nearest industry idea, not the same thing as two masters.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Two masters",
  "alternateName": [
    "product and framework",
    "reference implementation",
    "instance and template"
  ],
  "description": "Two things kept in step: the product, which is a real story, and the framework, which is the method written down so others can use it.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
