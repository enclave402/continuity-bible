---
title: SEO and discovery — one primary term, and where it is planted
doc_id: exp-seo
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/SEO-AND-DISCOVERY.md
status: active
last_reviewed: 2026-10-23
canonical: true
---

# SEO and discovery — one primary term, and where it is planted

**What this is:** the search goal for this repository, stated as a single term with the surfaces it must appear on. Not a marketing plan — a register, so the phrase is planted once, in the right places, and never open to negotiation again.

**Why it lives here:** a keyword decided in chat is remembered by nobody. Written down with its surfaces, any session can check compliance in one pass.

**How to use it:** when writing README text, docs titles, package metadata or a campaign, place the term on the surface listed below. One phrase per surface, exactly as written, in ordinary prose.

**One next step:** the tutorial `docs/1-tutorials/` does not yet carry a title using the term. The next tutorial written should be titled *Build a continuity bible for a story*.

---

## The goal

**Primary term: `continuity bible`.** Exact phrase, lowercase in prose, capitalised as a proper noun only when naming the product.

**Why this term and not a branded one.** Nobody owns it as a product. The results it returns today are explainer articles — a script supervisor's guide, a vertical-drama production guide, a job description for a script coordinator — not software. It is also the trade's own word for the artifact this repository automates, so the phrase carries intent: whoever types it is already trying to stop a story drifting. See [NAMING.md](../3-reference/NAMING.md) for the full decision and the rejected names.

**What can and cannot be won.** The term is descriptive, so it cannot be monopolised — not by us, not by anyone. That is the trade we took deliberately: no moat, but no fight either. We can rank for it; we cannot trademark it.

## Supporting cluster

Used in ordinary prose only where it is genuinely accurate. Never stuffed, never repeated within one paragraph.

| Term | Intent of the person searching | Surface that answers it |
|---|---|---|
| continuity bible | what it is; a template; software that maintains one | README, this doc's tutorial target |
| story bible / series bible | the long-form fiction equivalent | README sentence, package keywords |
| narrative continuity | the discipline, film and TV | [CONTINUITY-ISSUE-CLASSES.md](../3-reference/CONTINUITY-ISSUE-CLASSES.md) |
| character consistency / AI character drift | the failure mode in generated art | README, package keywords |
| continuity error / continuity tracking | the defect and the practice | examples, tutorial prose |

## Where the phrase is planted in this repository

| Surface | Requirement | State |
|---|---|---|
| Repository name | `continuity-bible` | done |
| Repository description (GitHub) | leads with the term | done |
| GitHub topics | `continuity-bible`, `story-bible`, `series-bible`, `narrative-continuity` | done |
| `README.md` H1 | Continuity Bible | done |
| `README.md` first paragraph | defines the term in one plain sentence | done |
| `package.json` description | term first, human line second | done |
| `package.json` keywords | the four exact phrase variants | done |
| A tutorial titled with the term | *Build a continuity bible for a story* | **not yet — next tutorial** |
| The published site (`enclave402.com/continuity-bible/`, gh-pages branch) | title, description, canonical, og tags and a lede that defines the term in one sentence | done 2026-10-23 |
| Every doc that explains the artifact | term used once, in prose, no repetition | in force |

## Cross-pollination: related surfaces we can sweep in

The phrase travels only where a narrative artifact is genuinely involved. Anything else is term dilution and is listed as excluded, on purpose.

| Related surface | What to plant | Why it is legitimate | State |
|---|---|---|---|
| `enclave402/agent-skills` (public) — the `visual-continuity-ssot` skill description | one clause: "…the continuity bible for a sequential story" | the skill maintains exactly this artifact | planned |
| `outreach-engine` campaign copy for rel8r | the phrase as a content angle, once per campaign, in prose | the audience is writers fighting drift | planned |
| `adhdworks-max-headroom` comic framework docs | name the framework's [SSOT](concepts/ONE-HOME-FOR-EACH-FACT.md) layer "the continuity bible" in operator docs | the comic renderer *is* one | planned |
| The GitHub Pages showcase | definition sentence and the term in the page title | direct intent match | done 2026-10-23 |
| `rel8r`, `Coach-Hype`, `sloppyxbaby` product pages | **nothing** | different category; inserting it dilutes the term's meaning | excluded |

**Rule for the sweep:** the phrase appears on a related surface only if that surface already concerns story continuity. If a reader would not be helped by the definition, the phrase does not belong there.

## Measurement, honestly

There is one indexable surface: the GitHub Pages site at `https://enclave402.com/continuity-bible/`, served from the `gh-pages` branch. As of 2026-10-23 its title, meta description, canonical URL, Open Graph tags and lede all carry the term, and the lede defines it in a sentence — which is what a search engine needs in order to associate the page with the phrase at all.

The domain question is separate and still parked: no new domain was bought. The Pages site is enough to rank for a term nobody is competing for.

Until the site has been indexed and has impressions, the repository's name, description and topics remain the discovery surface that works today, and they are all live.

What to watch once indexed: impressions and average position for `continuity bible`, and whether the page is returned for the question forms ("what is a continuity bible", "continuity bible template"). A definition sentence answers the first; the tutorial answers the second.

## What not to do

- **Do not aim [NAMING.md](../3-reference/NAMING.md) at the term.** It is the decision record; a search page it is not.
- **Do not repeat the phrase to satisfy a word count.** One exact use per surface, in a sentence a person would actually write.
- **Do not coin variants** ("continuity bible pro", "the continuity bible method"). The strength of this choice is that it is the trade's word, unmodified.
