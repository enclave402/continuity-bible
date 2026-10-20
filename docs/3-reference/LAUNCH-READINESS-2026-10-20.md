---
title: Launch readiness, 2026-10-20
doc_id: ref-launch-readiness-2026-10-20
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/LAUNCH-READINESS-2026-10-20.md
status: active
last_reviewed: 2026-10-20
canonical: true
---

# Launch readiness, 2026-10-20

This page lists what is still needed before this repository is launched as a free tool. It has three parts: the words people see first on the repository page, the launch steps in order, and the decisions only the owner can make.

The plan behind it is the public-repository plan of 2026-10-18, which is kept outside this repository. Its steps 2, 3, 4, 8 and 10 are done in the README and in `CONTRIBUTING.md`. The description and topics of step 9 are proposed below.

## 1. The words people see first

### About description

Put this in the repository's About box. It is the same sentence as `package.json`, and it says what the README's first line says:

> Keep AI story characters the same from the first picture to the last. One file says who they are; a checker catches the slip.

Why these words: a parent, a coach or a hobbyist searches for what they want ("same character in every picture"), not for how it works ("compile-time name tokens"). The old description used the second kind of words.

### Topics

GitHub allows up to 20. These are led by what a non-technical reader types into a search box, with the developer words after:

| Order | Topics | Who searches for them |
|---|---|---|
| 1 to 8 | `character-consistency`, `picture-book`, `childrens-book`, `ai-art`, `graphic-novel`, `comics`, `ai-storytelling`, `storytelling` | people making a book, a comic or a story with AI pictures |
| 9 to 12 | `ai-image-generation`, `worldbuilding`, `game-writing`, `interactive-fiction` | writers and game makers |
| 13 to 19 | `prompt-engineering`, `llm`, `ai-agents`, `claude-code`, `cursor`, `nodejs`, `zero-dependencies` | developers |

### Social preview

The card a shared link shows. It needs a 1280×640 picture: the hero pair and one plain sentence, with no star count. It waits for the owner's choice of pair (decision 3 below).

## 2. Launch steps, in order

Each step says who does it and how you know it is done.

1. **Commit this branch and open the pull request.** The lead does this. Done when the pull request is open and `npm run verify` passed on it.
2. **Merge.** A human merges. Nobody pushes to `main`.
3. **Set the About description and topics.** Run `gh repo edit enclave402/narrative-token-ssot --description "<the sentence above>"`, then `gh repo edit enclave402/narrative-token-ssot --add-topic <topic>` for each topic. Done when the repository page shows both, logged out.
4. **Check the security reporting path.** Run `gh api /repos/enclave402/narrative-token-ssot/private-vulnerability-reporting`. Done when it returns `enabled: true`. If it does not, turn the setting on, or change `SECURITY.md` to a path that works.
5. **Point the hero picture at its scene.** The two hero pictures link to the rel8r.me reader's front page today, because this repository does not record the scene's own address. Replace the link with the scene's address, keeping `utm_medium=readme-hero`. Done when a click on either picture opens that scene.
6. **Look at the README as a stranger would.** Open the repository page logged out, in light mode and in dark mode. Done when the pair shows on the first screen in both, nothing glares or vanishes, and every link opens.
7. **Check the language bar.** Done when it does not misdescribe the project. If it does, mark generated files in `.gitattributes`.
8. **Settle the owner decisions in part 3.** Then do the plan steps they unlock: the license table (step 5), the two number and wording fixes (step 6), the gallery of rel8r.me pages (step 7), badges (step 11) and a dated release (step 12).
9. **Upload the social preview** once the owner has picked the pair. Done when a shared link shows the card.
10. **Launch through outside posts** (step 13), only after steps 1 to 9. The owner writes the posts and the first comment in their own words. Show HN links straight to the repository with nothing in the way. Each post opens with the hero pair. Done when the launch is logged with its links and the first week's clone and click counts.

### What to measure

Count clones and link clicks, not stars. Every link to a paid page carries `utm_source=github` and `utm_campaign=narrative-token-ssot`, and its `utm_medium` says where on the page it sits:

| `utm_medium` | Where |
|---|---|
| `readme-hero` | the hero pictures at the top |
| `readme-nav` | the link line under the pictures |
| `readme-disclosure` | the sentence saying who makes this and what they sell |
| `readme` | the "Where it's used" section |
| `readme-paid` | the "What Coach Hype sells" section near the end |

## 3. Owner decisions

These are quoted word for word from the plan. The repository's norms reserve them for the owner.

From the plan's list of owner decisions:

> 1. **License for the story artwork in this repo.** Today the MIT license arguably covers it, which would let anyone reuse the rel8r.me pictures. Options: keep all rights reserved for the art; a Creative Commons license (for example CC BY-NC-ND); or MIT for everything.
> 2. **Hosted check for this public repo.** The norms say local gates instead of hosted runners (`ADR-001:19`). A live check badge needs one GitHub Actions job. Allow it, or keep the dated "verified" line.
> 3. **Which panels and pairs go public**, since story panels are the owner's creative lane.

From the plan's step 1, "Settle the facts the pictures and disclosure depend on (owner, short)":

> - The license the rel8r.me artwork carries in this repo (see Owner decisions).
> - Which panels and before-and-after pairs may go public. Story panels are the owner's creative lane, so the owner picks them.
> - The maker sentence: who makes rel8r.me, and whether rel8r.me is free or paid.
> - **Done when:** the three answers are written in the repo's `PRODUCT.md` or worklog, in the owner's words.

From the plan's step 6, which keeps the owner's voice and so waits for the owner:

> - Reconcile 82 scenes, 99 pictures and 85 appearances: state each number once, from one source, saying what it counts.
> - Replace "Unique art that stays yours" with a line the tool can back, kept in the owner's voice. Suggested: "AI stories without AI slop. Your own characters, the same on every page. Steady enough to make a book."

What the README does in the meantime:

- The hero uses the one pair already published in this repository's before-and-after page. It is shown as the problem, a redo with no declared reference, because no redraw made with the tool has been approved yet. The owner may swap it.
- The maker sentence says Coach Hype sells rel8r.me and the Antidote Kit. If rel8r.me is free, change "sells rel8r.me and" to "also sells".
- The License section still says MIT with no exception for the art, until decision 1.
