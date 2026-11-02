---
title: Second checker
doc_id: concept-second-checker
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/SECOND-CHECKER.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Second checker

*Also called:* separation of duties, segregation of duties, maker-checker, four-eyes principle

**What it is:** The person or tool that checks a piece of work is not the one who made it.

**Why it matters:** A maker tends to see what they meant to make, not what they made. A second checker sees the real thing.

**The rule here:** The tool that makes a picture never grades it. A different tool or model checks it against the card.

**How to use it:** Name the maker and the checker for each step. Make sure they are not the same.

**Next step:** Look at one check you run and ask who made the thing it checks.

## How it connects

This is how a [quality gate](GATE.md) stays honest. In code, [required reviewers](REQUIRED-REVIEWERS.md) do the same job. For pictures, the [on-model check](ON-MODEL-CHECK.md) is the second checker: its judge must come from another model family than the picture maker.

**Source:** [NIST SP 800-53 Rev. 5](https://doi.org/10.6028/NIST.SP.800-53r5), control AC-5 Separation of Duties: finding `cps-06` in the [concept page sources card](../../../research/corpus/concept-page-sources.md), status checked. It is about people and roles; using a different tool to check is this repository's application.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Second checker",
  "alternateName": [
    "separation of duties",
    "segregation of duties",
    "maker-checker",
    "four-eyes principle"
  ],
  "description": "The person or tool that checks a piece of work is not the one who made it.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
