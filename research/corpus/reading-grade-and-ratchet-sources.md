---
id: reading-grade-and-ratchet-sources
title: "Sources for the reading grade and the shrink-only list"
kind: paper-summary
subjects: ["research-methods", "qa-drift-gates"]
constructs: ["Flesch-Kincaid grade level", "readability formula", "ratchet", "baseline"]
evidence: web
source_keys: ["kincaid-1975-derivation-readability-formulas", "wikipedia-flesch-kincaid-readability-tests", "qntm-2021-ratchets-software-development"]
origin: "source check for COA-141 by a coding agent inside this repository, 2026-10-30; each source opened and recorded with scripts/research/verify.mjs"
origin_title: "Sources for the reading grade and the shrink-only list"
captured: 2026-10-30
status: reviewed
summary: "Summaries of the sources behind two concept pages: Kincaid et al. 1975 (the Flesch-Kincaid grade level; record page opened, full text blocked by a bot check), the Wikipedia article for the formula's numbers, and qntm's 2021 post on ratchets (a count of a retired pattern that may only go down)."
source_sha256: beba8b4bf54a649864c8ac53a23d038ebd7bcd1b0c9764c06501e46c63e3c8a7
source_words: 428
citations: 0
cited_primary: 0
cited_web: 0
figures: 0
---
# Sources for the reading grade and the shrink-only list

Checked on 2026-10-30 for the concept pages "Reading grade" and "Shrink-only list". Each source below was opened and recorded with `scripts/research/verify.mjs`. These are summaries in our own words, not copies.

## Reading grade

### Kincaid, Fishburne, Rogers and Chissom (1975)

Source key: `kincaid-1975-derivation-readability-formulas`. Research Branch Report 8-75, prepared for the US Navy's Chief of Naval Technical Training; 48 pages. This is the primary source for the Flesch-Kincaid grade level.

- What it did: it recalculated three readability formulas (Automated Readability Index, Fog Count and Flesch Reading Ease) so that each gives a school grade suited to Navy readers.
- How: 531 enlisted personnel at four technical schools took a standard reading test, and were also tested on 18 passages from Navy training manuals. The formulas were fitted to those results.
- What was opened: the university library's record page, with title, authors, abstract and table of contents (Appendix B holds the instructions for the recalculated formulas).
- What could not be opened: the full-text PDF. On 2026-10-30 it answered HTTP 403 behind a bot check, which we do not get around. So the numbers in the formula are taken from the secondary source below, not read in the report.

### Wikipedia, "Flesch-Kincaid readability tests"

Source key: `wikipedia-flesch-kincaid-readability-tests`. A secondary source, used only for the formula's numbers.

- The grade is 0.39 times the words per sentence, plus 11.8 times the syllables per word, minus 15.59.
- The result reads as a US school grade.
- The grade level weighs sentence length more than word length, so short sentences lower it most.
- The page notes the score can be gamed: strings of very long made-up words give absurd grades. It is a guide, not proof.

## Shrink-only list

### qntm, "Ratchets in software development" (2021-11-21)

Source key: `qntm-2021-ratchets-software-development`. A practitioner's blog post; no study or paper defines the term.

- A ratchet is a script run at lint time that counts uses of a pattern a team has decided to stop using.
- Too many uses: it fails and says why the pattern is unwanted.
- Too few uses: it also fails, and asks you to lower the expected count. So the count can only go down.
- The author notes the ratchet only stops new uses; it does not make anyone remove the old ones.
- In that post the expected counts live in the script itself. Our version keeps them in a data file (the baseline) instead, and also makes a changed file leave the list.
