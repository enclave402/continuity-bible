---
title: Gate
doc_id: concept-gate
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/GATE.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Gate

*Also called:* quality gate, stage gate, phase gate, CI check, merge check

**What it is:** A check that must pass before work can move on. If it fails, the work stops until it is fixed.

**Why it matters:** Work that fails the check does not move on, so a mistake is stopped at the gate instead of found later.

**The rule here:** Gates run by machine with no human step. `npm run verify` is this repository's gate; it must pass before a merge.

**How to use it:** Run the gate before you finish. Read the failure: it says what failed, why, and the fix.

**Next step:** Run `npm run verify` and read what it checks.

## How it connects

A gate is made of [rules the computer checks](RULES-THE-COMPUTER-CHECKS.md). Tests that guard against a [backslide](BACKSLIDE.md) belong in it.

**Source:** Robert G. Cooper, [The Stage-Gate Model: An Overview](https://www.stage-gate.com/blog/the-stage-gate-model-an-overview/): finding `cps-10` in the [concept page sources card](../../../research/corpus/concept-page-sources.md), status checked. Its gates are management decisions; running gates by machine is this repository's rule.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Gate",
  "alternateName": [
    "quality gate",
    "stage gate",
    "phase gate",
    "CI check",
    "merge check"
  ],
  "description": "A check that must pass before work can move on. If it fails, the work stops until it is fixed.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
