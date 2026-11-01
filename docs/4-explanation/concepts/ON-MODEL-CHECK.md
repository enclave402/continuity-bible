---
title: On-model check
doc_id: concept-on-model-check
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/ON-MODEL-CHECK.md
status: active
last_reviewed: 2026-11-01
canonical: true
---

# On-model check

*Also called:* on-model, off-model, automated visual QA, acceptance testing for images, reference-based identity verification, question-based faithfulness (TIFA, DSG)

**What it is:** A check that a new picture shows each character the way their card says, fact by fact, before the picture is used.

**Why it matters:** A picture model drifts: a face, a body or a borrowed boot changes, and the next picture copies the error. A person's eye catches it late, if at all.

**The rule here:** Every new picture passes the on-model check before it is used. A tool or model that did not make the picture runs it. Measuring tools do what they can measure (faces, counts, colour); a vision judge answers yes or no questions built from the card for the rest.

**How to use it:** Turn each line of the character's card into a yes or no question. Ask the questions in order: first "is this character here?", then their face, body and outfit. A wrong answer, or an unsure one, fails the picture.

**Next step:** Read the [on-model check layers](../../3-reference/ON-MODEL-CHECK-LAYERS.md) and pick the layers your project needs.

## How it connects

It reads the [character card](CHARACTER-CARD.md), is run by a [second checker](SECOND-CHECKER.md), and is a [gate](GATE.md) for pictures. Its cut-offs come from a [golden set](GOLDEN-SET.md). A failed picture gets a [fresh render, not a patch](FRESH-RENDER-NOT-A-PATCH.md).

**Source:** Hu and others, [TIFA: accurate and interpretable text-to-image faithfulness evaluation with question answering](https://openaccess.thecvf.com/content/ICCV2023/html/Hu_TIFA_Accurate_and_Interpretable_Text-to-Image_Faithfulness_Evaluation_with_Question_Answering_ICCV_2023_paper.html) (ICCV 2023), and Cho and others, [Davidsonian Scene Graph](https://arxiv.org/abs/2310.18235) (ICLR 2024): turn each requirement into a yes or no question, and ask a child question only when its parent passes. "On-model" is the animation word for a drawing that matches the model sheet. UNVERIFIED: no research card holds these two papers yet.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "On-model check",
  "alternateName": [
    "on-model",
    "off-model",
    "automated visual QA",
    "acceptance testing for images",
    "reference-based identity verification",
    "question-based faithfulness (TIFA, DSG)"
  ],
  "description": "A check that a new picture shows each character the way their card says, fact by fact, before the picture is used.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
