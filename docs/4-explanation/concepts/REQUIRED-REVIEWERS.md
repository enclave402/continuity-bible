---
title: Required reviewers
doc_id: concept-required-reviewers
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/concepts/REQUIRED-REVIEWERS.md
status: active
last_reviewed: 2026-10-30
canonical: true
---

# Required reviewers

*Also called:* CODEOWNERS, code owners, required approvals, protected branch

**What it is:** A rule in the code host that says who must approve a change to certain files before it can merge.

**Why it matters:** It makes sure the right person looks at the change, every time, without anyone having to remember.

**The rule here:** Reviews are a backstop. The machine checks come first, and an agent never adds a new approval step on its own.

**How to use it:** List file paths and their owners in a code owners file. Turn on the rule in the code host.

**Next step:** Read your code host's docs on code owners and approval rules.

## How it connects

This is the code form of a [second checker](SECOND-CHECKER.md).

**Source:** [Code Owners](https://docs.gitlab.com/user/project/codeowners/), finding `cps-12` in the [concept page sources card](../../../research/corpus/concept-page-sources.md), status checked. GitLab Docs; machine checks first is this repository's rule.

All terms: [concept index](../../3-reference/CONCEPT-INDEX.md).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Required reviewers",
  "alternateName": [
    "CODEOWNERS",
    "code owners",
    "required approvals",
    "protected branch"
  ],
  "description": "A rule in the code host that says who must approve a change to certain files before it can merge.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Continuity bible concepts"
  }
}
</script>
