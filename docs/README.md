# narrative-token-ssot: docs

**What this is:** the front door to this repo's docs, sorted by what you want to do.
**Why it exists:** so you can find a guide, a how-to, a fact sheet or a reason without searching.
**How to use it:** pick the heading that fits your goal: learn, solve, look up, or understand.
**Next step:** new here? Start with the first tutorial under Learn.

Human front door to this repository's documentation. Placement policy: [Where docs go](../CONTRIBUTING.md#where-docs-go). Registry of canonical docs: [_registry/doc_index.json](_registry/doc_index.json). Unresolved placement: [_registry/open_loops.md](_registry/open_loops.md).

## What this repo is

One registry file holds every character's name once; every source holds `{{id}}` tokens; a gate fails drift before it ships. Around that core: the story itself as one record per scene and one list per reading order, so a spread moves, is told from another character first, or is retired without a page being touched or a picture lost; a change to the words tested as a named variant of the text and written back as tokens by the machine that measured it, with a new spread left as a slot for the author; continuity cards and a shot sheet that carry wardrobe, props, marks, place and time from one shot to the next and compile into a pasteable block; a research process any agent can run on a local model; and a policy engine for choosing a visual anchor after a character has already drifted. WHAT: [`../PRODUCT.md`](../PRODUCT.md). HOW: [`../AGENTS.md`](../AGENTS.md).

## 1. Learn (`1-tutorials/`)

- [Start here: one scene, two characters, a browser chatbot](1-tutorials/START-HERE.md): write two characters into the registry, write a scene with tokens, render the prompt sheet, paste it into a chatbot, name and tag the pictures by hand, run the anchor policies, record the anchor. No API, no model.

## 2. Solve (`2-how-to/`)

- [Work from a browser chatbot](2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md): the copy-paste loop in detail: names out of pasted prompts, file naming by scene and order, hand-tag conventions, the two drift questions (what must never change; fewest redraws, first look or last look), what the engine cannot do without embeddings.
- [Adopt the registry in your repo](2-how-to/HOW-TO-ADOPT-THE-REGISTRY.md): surfaces, token sources, records, coverage, props by id, contextual forms, exclusive markers, forbidden duplicate fields, rendering built output.
- [Ingest research](2-how-to/HOW-TO-INGEST-RESEARCH.md): card a document, index it, pack it, extract candidates with a local model, verify sources, merge findings, ask.
- [Keep continuity from shot to shot](2-how-to/HOW-TO-KEEP-CONTINUITY-SHOT-TO-SHOT.md): two continuity cards and one shot sheet; what carries forward by itself and what you decide with a reason; one block to paste per shot; the gate catching a missing reason, a prop in the wrong hand, a contradicted time.
- [Retire a spread without losing it, and tell the same story in two orders](2-how-to/HOW-TO-REORDER-AND-RETIRE-SPREADS.md): the story as records and editions; move a slug, rebuild, park the picture with a reason; a second telling is one new file; a deleted picture needs the author's note.
- [Test a change to the words before you make it, and let the machine write the winner back](2-how-to/HOW-TO-TEST-A-CHANGE-BEFORE-YOU-MAKE-IT.md): a named variant of the text to put in front of readers; the diff; the apply step that writes the winner into the records as tokens and proves the records render as the tested text; a spread the tests want becomes a slot the author fills; what an AI may never write into a story.
- [Check a simulated reader panel](2-how-to/HOW-TO-CHECK-A-SIMULATED-PANEL.md): a quote must be verbatim in the spread it names; a no-read control throws the quiz out when it scores; the paired difference is written by the script and checked by recomputing it; simulated answers are not a human audience, and the script does not pick the winner.
- [Resolve character drift after the fact](2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md): produce embeddings, answer the two drift questions (or name a policy), record the anchor, size the regeneration bill.
- [Enforce story invariants, affordances, and layered wardrobe](2-how-to/HOW-TO-ENFORCE-STORY-INVARIANTS-AND-AFFORDANCES.md): stop AI from reintroducing banished plot points, prevent backwards phones, decompose garment layers, and declare multi-angle [turnaround](4-explanation/concepts/CHARACTER-CARD.md) sheets.
- [Track props and wardrobe](2-how-to/HOW-TO-TRACK-PROPS-AND-WARDROBE.md): build the prop index, check it, write layered outfits and a four-view turnaround, and keep a companion as a collar-tag token.
- [Lock each lead's signature wardrobe](2-how-to/HOW-TO-LOCK-SIGNATURE-WARDROBES.md): rule SIG-LOCK-001 as card data and a check: no character wears another lead's signature item, leads never overlap, live violations are tracked to a task, one engine shared across repositories.
- [Keep a product repo in sync with the bible](2-how-to/HOW-TO-SYNC-A-PRODUCT-REPO.md): one manifest pins a bible commit and a sha256 per copied file; CI fails on a copy edited in place; a changed schema moves the pin together with a migration.

## 3. Look up (`3-reference/`)

- [Naming, availability and the parked domain decision](3-reference/NAMING.md): what this project is called and why, the rejected names with their trademark numbers, the RDAP availability sweep, and the parked domain decision.
- [Registry fields](3-reference/REGISTRY-FIELDS.md): every key of `character-registry.json` and what the gate does with it.
- [Continuity issue classes](3-reference/CONTINUITY-ISSUE-CLASSES.md): the eight ways a continuity system goes silent, and the mechanism that answers each.
- [Continuity issue classes (operator)](3-reference/operator/CONTINUITY-ISSUE-CLASSES.md): the four canonical visual coherence issue classes — polarity, precipitation, wardrobe, screen affordance.
- [Intrinsic anatomical laterality](3-reference/INTRINSIC-VS-SCREEN-SPACE-LATERALITY.md): self-announcing architecture and camera-space projection matrix to eliminate diffusion laterality inversion.
- [Prop disposition and visual continuity](3-reference/PROP-DISPOSITION-AND-VISUAL-CONTINUITY-STANDARDS.md): the prop-first index, its fields, wardrobe layers, turnaround views, and the public companion exemplar.
- [Continuity card and shot sheet fields](3-reference/CONTINUITY-CARD-AND-SHOT-SHEET-FIELDS.md): every field of the cards file and the shot sheet, the two surface declarations, every gate check, the compiled block line by line.
- [The single mutation gate](3-reference/SINGLE-MUTATION-GATE-ARCHITECTURE.md): the narrow waist for additions, updates, retirements and laterality; the five assertion gates; the story-mutation log.
- [Scene and edition fields](3-reference/SCENE-AND-EDITION-FIELDS.md): every field of the scene file, an edition and the parked-art manifest; the built text line by line; the commands; the three gates and what each refuses.
- [Variant names and the applied record](3-reference/VARIANTS-AND-THE-APPLIED-RECORD.md): the variants file, the four step shapes and every refusal, the commands, what apply does in order, the slot record, the banner, the applied record field by field.
- [Research layers](3-reference/RESEARCH-LAYERS.md): card front matter, findings schema, sources schema, retrieval pack contract, configuration.
- [Camera and look explainers, groups A to D](3-reference/CAMERA-AND-LOOK-EXPLAINERS-A-D.md): 73 plain-language entries for look development, lens and optics, camera position and framing, and camera movement: what each term means, what it does to the picture, when to pick it, the safe default, a sketch to draw, two beginner mistakes, the source checked. Read-checked at grade 7.1 or below.
- [Wardrobe exclusivity invariant](3-reference/WARDROBE-EXCLUSIVITY-INVARIANT.md): one owner per signature item; every other character carries it in their avoid list; the troubleshooting ladder.
- [Universal facial DNA](3-reference/FACIAL-DNA-AND-CHARACTER-CONTINUITY-SSOT.md): the five facial fields every person in the registry carries, no two alike, and the troubleshooting ladder.
- [Concept index](3-reference/CONCEPT-INDEX.md): every process term this repository explains, by its plain word, with the industry words for it. Each term has one page; a doc links to it the first time it uses the term, and `scripts/check-docs.mjs` checks that.
- [Parts map](3-reference/PARTS-MAP.md): every script, schema, data file and doc in this repository, each with its own one-line "What this is". Generated by `scripts/parts-map.mjs`; `scripts/check-self-explaining.mjs` fails when it is out of date.
- [Launch readiness, 2026-10-20](3-reference/LAUNCH-READINESS-2026-10-20.md): the proposed repository description and topics, the launch steps in order, and the decisions left to the owner.

## 4. Understand (`4-explanation/`)

- [SEO and discovery](4-explanation/SEO-AND-DISCOVERY.md): the one search term this project aims at, every surface it is planted on, and the related surfaces that may carry it.
- [Repository norms](4-explanation/REPOSITORY-NORMS.md): how a public [SSOT](4-explanation/concepts/ONE-HOME-FOR-EACH-FACT.md) repository is run: nothing private, nothing hardcoded, docs by intent, gates at the git boundary, any agent and any model.
- [Before & After showcase](SHOWCASE.md): a gallery of mistakes AI picture tools make, each next to its fix, with what broke and which record, token or gate stopped it. Generated from `showcase/cases/` by `scripts/showcase.mjs`; open `../showcase.html` in a browser for the slider view.
- [Lessons](LESSONS.md): one lesson from each product research entry, the framework element the line names, and that element's public state. Generated by `scripts/lessons-feed.mjs`.
- [Before and after: a drifted lead](4-explanation/BEFORE-AND-AFTER-A-DRIFTED-LEAD.md): the engine on the published story's own drift, with the pictures: her 85 scenes found by token, the faces tagged by hand, every policy's bill side by side (the cheap one ratifies the drift), the anchor recorded, the first pair redone.
- Concepts (one page per term; list and lint data in `_registry/concept_index.json`): [Character card](4-explanation/concepts/CHARACTER-CARD.md) · [Brief](4-explanation/concepts/BRIEF.md) · [One home for each fact](4-explanation/concepts/ONE-HOME-FOR-EACH-FACT.md) · [Asset library](4-explanation/concepts/ASSET-LIBRARY.md) · [Approval steps](4-explanation/concepts/APPROVAL-STEPS.md) · [Made-by record](4-explanation/concepts/MADE-BY-RECORD.md) · [Second checker](4-explanation/concepts/SECOND-CHECKER.md) · [Done-when list](4-explanation/concepts/DONE-WHEN-LIST.md) · [Backslide](4-explanation/concepts/BACKSLIDE.md) · [Rules the computer checks](4-explanation/concepts/RULES-THE-COMPUTER-CHECKS.md) · [Gate](4-explanation/concepts/GATE.md) · [Mistake-proofing](4-explanation/concepts/MISTAKE-PROOFING.md) · [Required reviewers](4-explanation/concepts/REQUIRED-REVIEWERS.md) · [Stale docs](4-explanation/concepts/STALE-DOCS.md) · [Root cause and lasting fix](4-explanation/concepts/ROOT-CAUSE-AND-LASTING-FIX.md) · [Fresh render, not a patch](4-explanation/concepts/FRESH-RENDER-NOT-A-PATCH.md) · [Self-explaining part](4-explanation/concepts/SELF-EXPLAINING-PART.md) · [Two masters](4-explanation/concepts/TWO-MASTERS.md) · [Shrink-only list](4-explanation/concepts/SHRINK-ONLY-LIST.md) · [Reading grade](4-explanation/concepts/READING-GRADE.md)
- Decisions:
  - [ADR-001 Public repository norms](4-explanation/decisions/ADR-001-public-repository-norms.md)
  - [ADR-002 The research process lives in the repo and runs on a local model](4-explanation/decisions/ADR-002-research-process-in-repo.md)
  - [ADR-003 Continuity gate extensions for the recorded issue classes](4-explanation/decisions/ADR-003-continuity-gate-extensions.md)
  - [ADR-004 Retrospective anchor policy for drifted characters](4-explanation/decisions/ADR-004-retrospective-anchor-policy.md)
  - [ADR-005 Continuity cards and a shot sheet carry state from shot to shot](4-explanation/decisions/ADR-005-continuity-card-and-shot-sheet.md)
  - [ADR-006 The story is records and editions, and a retirement is never a deletion](4-explanation/decisions/ADR-006-story-as-records-and-editions.md)
  - [ADR-007 A change to the words is a named variant of the rendered text, written back by the machine that measured it; a new spread is a slot whose words are the author's](4-explanation/decisions/ADR-007-variants-round-trip-and-owners-words.md)
  - [ADR-008 Simulated panel checks verify quotes, a no-read control and a paired difference, and do not decide the winner](4-explanation/decisions/ADR-008-simulated-panel-checks.md)

## Not here

`c4/` and `arc42/` are empty until a document earns them. The research corpus itself lives in [`../research/`](../research/README.md), not under docs.
