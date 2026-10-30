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

**Why it matters:** It catches a mistake while it is cheap to fix, before anyone else sees it.

**The rule here:** Gates run by machine with no human step. `npm run verify` is this repository's gate; it must pass before a merge.

**How to use it:** Run the gate before you finish. Read the failure: it says what failed, why, and the fix.

**Next step:** Run `npm run verify` and read what it checks.

## How it connects

A gate is made of [rules the computer checks](RULES-THE-COMPUTER-CHECKS.md). Tests that guard against a [backslide](BACKSLIDE.md) belong in it.

**Source:** [Phase-gate process](https://en.wikipedia.org/wiki/Phase-gate_process) (Wikipedia; loaded 2026-10-30; not yet a research card). In this repo's research: finding `accp-28` in [research findings](../../../research/FINDINGS.jsonl), status unchecked.

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
