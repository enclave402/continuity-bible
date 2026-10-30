---
title: Made-by record
doc_id: concept-made-by-record
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/MADE-BY-RECORD.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Made-by record

*Also called:* provenance, content credentials, C2PA manifest, chain of custody

**What it is:** A short record kept with a picture that says how it was made: which tool, which inputs, when, and whether it was a new render or an edit.

**Why it matters:** When a picture goes wrong, you need to know how it was made to stop it happening again. Without a record, nobody can tell.

**The rule here:** Every live picture has a made-by record. It says if the picture is a new render or an edit of another picture.

**How to use it:** When you save a picture, save its record next to it in the [asset library](ASSET-LIBRARY.md): tool, prompt or brief, inputs, date, new or edit.

**Next step:** Pick one live picture and write its record.

## How it connects

The record is what lets you choose a [fresh render](FRESH-RENDER-NOT-A-PATCH.md) over a patch with confidence. The industry form is a signed record, kept inside the file or next to it.

**Source:** [C2PA Technical Specification 2.2](https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html) (Coalition for Content Provenance and Authenticity): finding `cps-05` in the [concept page sources card](../../../research/corpus/concept-page-sources.md), status checked. The record on this page is plain and unsigned, not a C2PA Manifest.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Made-by record",
  "alternateName": [
    "provenance",
    "content credentials",
    "C2PA manifest",
    "chain of custody"
  ],
  "description": "A short record kept with a picture that says how it was made: which tool, which inputs, when, and whether it was a new render or an edit.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
