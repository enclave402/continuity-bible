---
title: Backslide
doc_id: concept-backslide
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/BACKSLIDE.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Backslide

*Also called:* regression, regression bug, regression test

**What it is:** Something that used to work and is broken again after a change.

**Why it matters:** Each fix can quietly undo an older fix. If nobody tests the old cases, the same mistake keeps coming back.

**The rule here:** When a mistake is fixed, add a test or a check that would catch it. The test stays, so the mistake cannot come back unseen.

**How to use it:** After each fix, add one test that fails on the old mistake and passes on the fix.

**Next step:** Find the last mistake you fixed and check that a test covers it.

## How it connects

Tests for backslides run in a [quality gate](GATE.md). If the same kind of mistake keeps coming back, look for its [root cause](ROOT-CAUSE-AND-LASTING-FIX.md).

**Source:** Leung and White, [A study of integration testing and software regression at the integration level](https://doi.org/10.1109/ICSM.1990.131377) (IEEE, 1990), read from its abstract: finding `cps-08` in the [concept page sources card](../../../research/corpus/concept-page-sources.md), status checked.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Backslide",
  "alternateName": [
    "regression",
    "regression bug",
    "regression test"
  ],
  "description": "Something that used to work and is broken again after a change.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
