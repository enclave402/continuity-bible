---
title: Golden set
doc_id: concept-golden-set
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/GOLDEN-SET.md
status: active
last_reviewed: 2026-11-01
canonical: true
---

# Golden set

*Also called:* golden dataset, labelled evaluation set, ground truth, calibration set, Cohen's kappa

**What it is:** A set of pictures whose right answer is already known: some are good, some are known mistakes. A checker is tested on it before anyone trusts it.

**Why it matters:** A checker that has not been tested may pass bad work or fail good work. Only known answers show how often it is right.

**The rule here:** No check, and no judge model, is trusted until it is scored on the golden set. Its cut-offs are set by that run and saved to a config file, never typed by hand. Every mistake caught later joins the set, so the check keeps catching it.

**How to use it:** Label each picture good or bad, with the evidence. Run the check on all of them. Report how well it agrees with the labels (Cohen's kappa, with an interval), the share of bads it catches, and the share of goods it fails.

**Next step:** Collect the mistakes your project has already caught; they are the first bads of your golden set.

## How it connects

The [on-model check](ON-MODEL-CHECK.md) is calibrated on it. Each new mistake added to it is a [backslide](BACKSLIDE.md) test.

**Source:** Cohen, [A coefficient of agreement for nominal scales](https://doi.org/10.1177/001316446002000104) (Educational and Psychological Measurement, 1960): kappa measures agreement beyond chance between two raters, here the checker and the labels. UNVERIFIED: no research card holds this paper yet.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Golden set",
  "alternateName": [
    "golden dataset",
    "labelled evaluation set",
    "ground truth",
    "calibration set",
    "Cohen's kappa"
  ],
  "description": "A set of pictures whose right answer is already known: some are good, some are known mistakes. A checker is tested on it before anyone trusts it.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
