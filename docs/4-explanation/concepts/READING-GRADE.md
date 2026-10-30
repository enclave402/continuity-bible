---
title: Reading grade
doc_id: concept-reading-grade
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/READING-GRADE.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Reading grade

*Also called:* Flesch-Kincaid grade level, readability score, reading level, plain language

**What it is:** A school grade that says how hard a piece of text is to read. Grade 8 means a typical 13-year-old can read it.

**Why it matters:** Anyone may open a file here, and most are not experts. Text they cannot read might as well not be there.

**The rule here:** Every header, doc and error message a person reads scores grade 8.0 or below. The limit lives in a config file.

**How to use it:** Use short sentences and short words. Explain a technical word in plain words the first time you use it.

**Next step:** Run `node scripts/check-self-explaining.mjs` and read the grade it gives any header that is too hard.

## How it connects

The score comes from `scripts/reading-grade.mjs`. It counts words per sentence and syllables per word, so it is a guess: use it to compare text, not to prove a grade. Every [self-explaining part](SELF-EXPLAINING-PART.md) must pass it.

**Source:** Kincaid, Fishburne, Rogers and Chissom, [Derivation of new readability formulas for Navy enlisted personnel](https://stars.library.ucf.edu/istlibrary/56/) (Research Branch Report 8-75, 1975; record page loaded 2026-10-30). Its full text could not be opened: the PDF sits behind a bot check (HTTP 403), so the formula's numbers come from [Flesch-Kincaid readability tests](https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests) (Wikipedia; loaded 2026-10-30). In this repo's research: findings `rgrs-01` and `rgrs-02` in [research findings](../../../research/FINDINGS.jsonl), status checked; card `reading-grade-and-ratchet-sources`.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Reading grade",
  "alternateName": [
    "Flesch-Kincaid grade level",
    "readability score",
    "reading level",
    "plain language"
  ],
  "description": "A school grade that says how hard a piece of text is to read. Grade 8 means a typical 13-year-old can read it.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
