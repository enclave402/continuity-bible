# narrative-token-ssot: docs

Human front door to this repository's documentation. Placement policy: [CONTRIBUTING.md](CONTRIBUTING.md). Registry of canonical docs: [_registry/doc_index.json](_registry/doc_index.json). Unresolved placement: [_registry/open_loops.md](_registry/open_loops.md).

## What this repo is

One registry file holds every character's name once; every source holds `{{id}}` tokens; a gate fails drift before it ships. Around that core: a research process any agent can run on a local model, and a policy engine for choosing a visual anchor after a character has already drifted. WHAT: [`../PRODUCT.md`](../PRODUCT.md). HOW: [`../AGENTS.md`](../AGENTS.md). NOW: [`../worklog/STATE.md`](../worklog/STATE.md).

## 1. Learn (`1-tutorials/`)

- [Start here: one scene, two characters, a browser chatbot](1-tutorials/START-HERE.md): write two characters into the registry, write a scene with tokens, render the prompt sheet, paste it into a chatbot, name and tag the pictures by hand, run the anchor policies, record the anchor. No API, no model.

## 2. Solve (`2-how-to/`)

- [Work from a browser chatbot](2-how-to/HOW-TO-WORK-FROM-A-BROWSER-CHATBOT.md): the copy-paste loop in detail: names out of pasted prompts, file naming by scene and order, hand-tag conventions, the two drift questions (what must never change; fewest redraws, first look or last look), what the engine cannot do without embeddings.
- [Adopt the registry in your repo](2-how-to/HOW-TO-ADOPT-THE-REGISTRY.md): surfaces, token sources, records, coverage, props by id, contextual forms, exclusive markers, forbidden duplicate fields, rendering built output.
- [Ingest research](2-how-to/HOW-TO-INGEST-RESEARCH.md): card a document, index it, pack it, extract candidates with a local model, verify sources, merge findings, ask.
- [Resolve character drift after the fact](2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md): produce embeddings, answer the two drift questions (or name a policy), record the anchor, size the regeneration bill.

## 3. Look up (`3-reference/`)

- [Registry fields](3-reference/REGISTRY-FIELDS.md): every key of `character-registry.json` and what the gate does with it.
- [Continuity issue classes](3-reference/CONTINUITY-ISSUE-CLASSES.md): the eight ways a continuity system goes silent, and the mechanism that answers each.
- [Research layers](3-reference/RESEARCH-LAYERS.md): card front matter, findings schema, sources schema, retrieval pack contract, configuration.

## 4. Understand (`4-explanation/`)

- [Repository norms](4-explanation/REPOSITORY-NORMS.md): how a public SSOT repository is run: nothing private, nothing hardcoded, one trail and one helm, docs by intent, gates at the git boundary, any agent and any model.
- Decisions:
  - [ADR-001 Public repository norms](4-explanation/decisions/ADR-001-public-repository-norms.md)
  - [ADR-002 The research process lives in the repo and runs on a local model](4-explanation/decisions/ADR-002-research-process-in-repo.md)
  - [ADR-003 Continuity gate extensions for the recorded issue classes](4-explanation/decisions/ADR-003-continuity-gate-extensions.md)
  - [ADR-004 Retrospective anchor policy for drifted characters](4-explanation/decisions/ADR-004-retrospective-anchor-policy.md)

## Not here

`c4/` and `arc42/` are empty until a document earns them. The research corpus itself lives in [`../research/`](../research/README.md), not under docs.
