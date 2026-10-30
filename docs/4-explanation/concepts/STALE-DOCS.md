---
title: Stale docs
doc_id: concept-stale-docs
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/STALE-DOCS.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Stale docs

*Also called:* docs drift, documentation drift, doc rot, docs as code

**What it is:** Docs that no longer match what the code or the files do.

**Why it matters:** A wrong doc is worse than no doc. People follow it and make the same mistake again.

**The rule here:** A fact lives in one place, and docs point to it instead of copying it. Checks fail when a doc and its source disagree.

**How to use it:** When you change a file, find the docs that describe it and change them in the same commit.

**Next step:** Run `node scripts/check-docs.mjs` and fix what it names.

## How it connects

Stale docs are a sign that a fact has more than [one home](ONE-HOME-FOR-EACH-FACT.md). A [self-explaining part](SELF-EXPLAINING-PART.md) is harder to let go stale, because the words sit next to the thing.

**Source:** [Docs as code](https://www.writethedocs.org/guide/docs-as-code/), finding `cps-13` in the [concept page sources card](../../../research/corpus/concept-page-sources.md), status checked. Write the Docs; it supports the fix (docs in the same workflow as code, checked with it), not a definition of stale docs.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Stale docs",
  "alternateName": [
    "docs drift",
    "documentation drift",
    "doc rot",
    "docs as code"
  ],
  "description": "Docs that no longer match what the code or the files do.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
