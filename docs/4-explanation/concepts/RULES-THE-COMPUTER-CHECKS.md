---
title: Rules the computer checks
doc_id: concept-rules-the-computer-checks
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/RULES-THE-COMPUTER-CHECKS.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Rules the computer checks

*Also called:* policy as code, rules as code, guardrails as code

**What it is:** A rule written as a script or data file that a computer can test, instead of only as a sentence in a doc.

**Why it matters:** A rule in prose depends on someone reading it and remembering. A rule as a check runs every time.

**The rule here:** A rule that matters is a check. Its settings, like word lists and limits, live in a data file, not in the script.

**How to use it:** Take a rule from a doc. Write the check. Move its lists and numbers into a data file.

**Next step:** Pick one rule that keeps being broken and write it as a check.

## How it connects

These checks run in a [quality gate](GATE.md). A good one is a form of [mistake-proofing](MISTAKE-PROOFING.md): it makes the wrong thing hard to do.

**Source:** [Policy as Code](https://developer.hashicorp.com/sentinel/docs/concepts/policy-as-code) (HashiCorp Sentinel docs; loaded 2026-10-30; not yet a research card).

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Rules the computer checks",
  "alternateName": [
    "policy as code",
    "rules as code",
    "guardrails as code"
  ],
  "description": "A rule written as a script or data file that a computer can test, instead of only as a sentence in a doc.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
