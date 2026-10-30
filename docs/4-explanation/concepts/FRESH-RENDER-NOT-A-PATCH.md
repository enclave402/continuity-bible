---
title: Fresh render, not a patch
doc_id: concept-fresh-render-not-a-patch
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/FRESH-RENDER-NOT-A-PATCH.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Fresh render, not a patch

*Also called:* destructive editing, clean render, inpainting, re-render from the master, non-destructive editing

**What it is:** When a picture is wrong, you make a new one from the character's card. You do not paint over part of the old one.

**Why it matters:** Each edit of an edit drifts further from the card. A new render starts from the truth.

**The rule here:** Painting over part of a picture is not used. Every fix is a new render from the card.

**How to use it:** Go back to the [character card](CHARACTER-CARD.md) and the brief. Render again. Record it as new in the [made-by record](MADE-BY-RECORD.md).

**Next step:** Find one patched picture and plan its new render.

## How it connects

The paper behind one popular editing model measures a character drifting a little more with each edit in a row, and shows visible flaws after six edits. Going back to the card each time keeps every picture one step from the truth.

**Source:** *FLUX.1 Kontext* ([arXiv 2506.15742](https://arxiv.org/abs/2506.15742), 2025): finding `accp-15` in [research findings](../../../research/FINDINGS.jsonl), status checked, including the paper's own measures of drift over successive edits and its note that many edits in a row add visible flaws.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Fresh render, not a patch",
  "alternateName": [
    "destructive editing",
    "clean render",
    "inpainting",
    "re-render from the master",
    "non-destructive editing"
  ],
  "description": "When a picture is wrong, you make a new one from the character's card. You do not paint over part of the old one.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
