---
title: Naming, availability and the parked domain decision
doc_id: ref-naming
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/NAMING.md
status: active
last_reviewed: 2026-10-23
canonical: true
---

# Naming, availability and the parked domain decision

**What this is:** the record of what this project is called, why, what was rejected, what is still free, and what to do about a domain if that day ever comes. It exists so nobody re-runs the research.

**Why it lives here:** a name decision made in a chat dies with the chat. Parked in the repo, at a predictable path, it survives sessions, context loss and new agents.

**How to use it:** read the decision, then the "do not redo" list. If you are about to propose a name, check the rejected list first.

**One next step:** if the project ever needs a public web presence, register `continuitybible.com` (see "Parked: the domain"), and nothing else in this file needs revisiting.

---

## The decision

- **Repository and product name: Continuity Bible.** Chosen 2026-10-23 by the owner.
- **GitHub:** `enclave402/continuity-bible` (renamed from `narrative-token-ssot`; GitHub redirects the old path).
- **Local path:** `~/continuity-bible`.

## Why this term, and not an invented one

"Continuity bible" is the *existing trade term* for the artifact this project automates: the living document a production keeps so a series does not drift out of its own established facts.

- **Film.** The script supervisor builds it at breakdown: props, wardrobe state, story day, per scene. ([filmandpen.com](https://filmandpen.com/behind-the-scenes/script-supervisor-film-continuity-guide))
- **Episodic television.** The script coordinator maintains "a comprehensive continuity bible, which tracks all established show facts across episodes and seasons." ([climbtheladder.com](https://climbtheladder.com/what-is-a-script-coordinator-in-tv-production/))
- **Vertical drama.** "The continuity bible is the document that prevents drift. Not by imposing creative restrictions but by making the established facts of the series' universe accessible at the moment any production decision is made." ([axisaistudios.com](https://www.axisaistudios.com/blog/how-to-build-a-vertical-drama-continuity-bible-tracking-70-episodes-without-drift))
- **Comics.** A publisher's shared universe "tangentially linked by a continuity bible, which it calls the Platinum Macroverse." ([tcj.com](https://www.tcj.com/scott-rosenbergs-platinum-pipeline-to-hollywood/))

The name therefore explains the product to anyone inside narrative production, and needs no explanation for anyone outside it. It also inherits existing search demand instead of competing for a word nobody is looking for.

## The trade-off, stated plainly

Descriptive names cannot be owned. A trademark office would treat "continuity bible" for narrative-consistency software as merely descriptive, so it is a **category name, not a moat**. Use it freely; do not expect to exclude others from it. If a moat is ever wanted, a coined mark sits on top later — "Continuity Bible" as the thing, an invented word as the company.

## Availability, as measured

Method: RDAP against the authoritative `.com` registry (`rdap.verisign.com`), 2026-10-23. Not DNS — a DNS-only check wrongly reported `threadline.io` as free when the domain is registered and parked.

**Unregistered on 2026-10-23:**

```
continuitybible.com      panelcanon.com
canonfile.com            narrativecanon.com
canontracker.com         canonregistry.com
seriescanon.com          continuityregistry.com
narrativeledger.com
```

**Registered (do not waste time re-checking):**

```
canonledger  continuityledger  storyledger  storyregistry  narrativecontinuity
canonkeeper  storycanon        continuityengine  canonengine  storyengine
narrativeengine  storyspine    storyweft    canonbible    canonindex
narrativeindex  storythread    canonthread  continuitysupervisor
scriptsupervisor  continuitydesk  canondesk  canonhouse  continuityrecord
continuitytracker  storycontinuity  canonvault  throughline.*  threadline.*
```

## Rejected names, with reasons — do not re-propose

| Name | Why it is out |
|---|---|
| **Throughline** | US trademark **Reg. 6604863**, owner **National Public Radio, Inc.**, registered 2022-01-04. Also NPR's Peabody-winning podcast, plus a consultancy at throughlinegroup.com. Every domain taken (`.com .co .app .io .studio`), npm and PyPI both taken. Unwinnable search, real legal risk. |
| **Threadline** | US trademark **Reg. 5767233**, **Threadline LLC**, registered 2019-06-04 — for *marketing strategy services that utilize narrative psychology... storytelling, behavioral economics and consumer psychology*. That is this project's own category. Also Threadline Systems (SaaS, class 42), a fashion-resale platform, a Japanese bag brand, and `threadlinestrategies.com` live. `threadline.io` is registered (Cloudflare, 2025-11-22, parked, serves nothing); `.com .co .app` taken. |
| **Story spine / story bible / series bible** | Taken as `.com` and, for "story spine", already a named Pixar-derived framework. |

## Parked: the domain

**Decision 2026-10-23: no domain purchase.** The owner declined to buy while the GitHub name was the live need. Nothing here blocks that decision — a public repo does not need a `.com`.

If the day comes:

1. `continuitybible.com` was unregistered as of 2026-10-23. Re-check before assuming: `curl -s -o /dev/null -w "%{http_code}" https://rdap.verisign.com/com/v1/domain/continuitybible.com` (404 = available).
2. Buy at cost through Cloudflare Registrar (about $10/year) if the account is already on Cloudflare, otherwise any registrar.
3. Point it at this repo's showcase, not at a new site. The product page already exists.
4. Chase no other name on the free list unless this one goes.

## Open items this record does not close

- **`package.json` still says `name: "narrative-token-ssot"`.** Renaming the package is a separate, riskier change (import paths, docs, any consumer). Park it until a publish decision exists.
- **README headline still reads "Narrative Token SSOT".** The repo name and description now lead with Continuity Bible; the README headline is the next surface to align.
- **npm publication status unverified.** `npm view narrative-token-ssot` returned nothing on 2026-10-23; treat as unpublished until confirmed.
- **The `-launch` folder** (`~/narrative-token-ssot-launch`) is not a git repository; it is unattached working material and still carries the old name in its path.
