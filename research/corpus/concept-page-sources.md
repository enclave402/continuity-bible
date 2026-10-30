---
id: concept-page-sources
title: "Concept page sources: what each outside page says"
kind: pointer
subjects: ["process-quality", "research-methods"]
constructs: ["single source of truth", "model sheet", "creative brief", "digital asset management", "content credentials", "separation of duties", "acceptance criteria", "regression", "policy as code", "phase gate", "poka-yoke", "code owners", "docs as code", "CAPA", "recognition over recall", "reference implementation"]
evidence: verified-key
source_keys: ["wikipedia-model-sheet", "wikipedia-creative-brief", "wikipedia-single-source-of-truth", "wikipedia-digital-asset-management", "wikipedia-content-credentials", "wikipedia-separation-of-duties", "wikipedia-acceptance-testing", "wikipedia-software-regression", "hashicorp-sentinel-policy-as-code", "wikipedia-phase-gate-process", "wikipedia-poka-yoke", "gitlab-docs-code-owners", "writethedocs-docs-as-code", "wikipedia-capa", "nngroup-recognition-and-recall", "wikipedia-reference-implementation"]
origin: "outside pages loaded and read 2026-10-30 by a coding agent for COA-138; each recorded in SOURCES.json by verify.mjs"
origin_title: "Concept page sources: what each outside page says"
captured: 2026-10-30
status: reviewed
summary: "Pointer card for the 16 outside pages behind the concept pages in docs/4-explanation/concepts/: for each, the citation, what the page says in this card's words, which concept page uses it, and what it does not show. Mostly Wikipedia (tertiary, common definitions), plus HashiCorp, GitLab, Write the Docs and Nielsen Norman Group pages."
source_sha256: 0d571e94c02e8941e936733d0255e0cff3349d1ed9a1f92b14980dbe9cc1288d
source_words: 1529
citations: 0
cited_primary: 0
cited_web: 0
figures: 0
---
# Concept page sources: what each outside page says

This card is a pointer, not a copy. It lists the outside pages behind the concept pages in `docs/4-explanation/concepts/` (COA-138). For each one it gives the citation, what the page says in this card's own words, which concept page uses it, and what the page does not show. Every page was loaded and read on 2026-10-30 and recorded in `research/SOURCES.json` under the key given. Wikipedia is a tertiary source: it states a common definition, not new evidence. Rules the concept pages call "the rule here" are this repository's own rules, not claims from these sources.

## Model sheet

- **Citation:** "Model sheet", Wikipedia. https://en.wikipedia.org/wiki/Model_sheet. Key `wikipedia-model-sheet`.
- **What it says:** a model sheet (also called a character sheet or character study) is a document that standardizes a character's appearance, poses and gestures. Productions need one when many artists work on the same character, so the character stays the same from scene to scene.
- **Used for:** Character card.
- **What it does not show:** the page does not list turnaround views; those come from the animation production book (finding `eadp-11`).

## Creative brief

- **Citation:** "Creative brief", Wikipedia. https://en.wikipedia.org/wiki/Creative_brief. Key `wikipedia-creative-brief`.
- **What it says:** a creative brief is a document used to develop creative work such as visual design or copy. The person asking for the work usually writes it and the creative team approves it, sometimes before work may start. It is a set of simple questions and answers that becomes the template for the work; when the work drifts, the team checks back against this agreed document.
- **Used for:** Brief.
- **What it does not show:** it describes advertising agencies; it says nothing about picture prompts or character tokens.

## Single source of truth

- **Citation:** "Single source of truth", Wikipedia. https://en.wikipedia.org/wiki/Single_source_of_truth. Key `wikipedia-single-source-of-truth`.
- **What it says:** single source of truth is the practice of structuring information so that every data element is mastered, or edited, in only one place. Other places either reference the master or hold read-only copies.
- **Used for:** One home for each fact.
- **What it does not show:** it is about information systems and databases; applying it to names, looks and word lists is this repository's choice.

## Digital asset management

- **Citation:** "Digital asset management", Wikipedia. https://en.wikipedia.org/wiki/Digital_asset_management. Key `wikipedia-digital-asset-management`.
- **What it says:** a DAM system keeps digital assets with a searchable index of their content and metadata, for retrieval and reuse. Assets usually move through a lifecycle of states such as creation, approval, live, archived and deleted, and a change of state can send the asset to a team for review. Many systems also keep earlier versions.
- **Used for:** Asset library; Approval steps.
- **What it does not show:** it does not say an asset should be used in only one place; that is this repository's rule.

## Content Credentials

- **Citation:** "Content Credentials", Wikipedia. https://en.wikipedia.org/wiki/Content_Credentials. Key `wikipedia-content-credentials`.
- **What it says:** Content Credentials are cryptographically signed metadata, called C2PA manifests, that give a checkable record of a digital asset's provenance and modification history. The page warns that a credential confirms where a file came from, not that its content is true.
- **Used for:** Made-by record.
- **What it does not show:** the made-by record on the concept page is a plain record kept next to the file; it is not signed and is not a C2PA manifest.

## Separation of duties

- **Citation:** "Separation of duties", Wikipedia. https://en.wikipedia.org/wiki/Separation_of_duties. Key `wikipedia-separation-of-duties`.
- **What it says:** separation of duties, also called segregation of duties, means more than one person is needed to complete a task. Organizations use it as a control against fraud, misuse and other failures.
- **Used for:** Second checker.
- **What it does not show:** it is about people and security controls; using a different tool or model to grade an image than the one that made it is this repository's application.

## Acceptance testing

- **Citation:** "Acceptance testing", Wikipedia. https://en.wikipedia.org/wiki/Acceptance_testing. Key `wikipedia-acceptance-testing`.
- **What it says:** acceptance criteria are the criteria a system must meet to be accepted by a user, customer or other authorized person. When the criteria, agreed in advance, are met, the sponsor is expected to sign off.
- **Used for:** Done-when list.
- **What it does not show:** it does not require each line to be testable by a script; that is this repository's rule.

## Software regression

- **Citation:** "Software regression", Wikipedia. https://en.wikipedia.org/wiki/Software_regression. Key `wikipedia-software-regression`.
- **What it says:** a regression is a bug where a feature that worked before stops working, often after a change such as a new feature or a bug fix. Developers run regression tests after changes to catch them, often reusing existing test cases.
- **Used for:** Backslide.
- **What it does not show:** it does not say a new test should be added for every fixed mistake; that is this repository's rule.

## Policy as code

- **Citation:** "Policy as Code", HashiCorp Sentinel documentation. https://developer.hashicorp.com/sentinel/docs/concepts/policy-as-code. Key `hashicorp-sentinel-policy-as-code`.
- **What it says:** policy as code means writing policies as code in text files, so they get version control, automated testing and automated deployment. Policies set by clicking in a screen are hard to repeat, version or test.
- **Used for:** Rules the computer checks.
- **What it does not show:** it is a vendor's page for its own product; it does not say a rule's settings belong in a separate data file.

## Phase-gate process

- **Citation:** "Phase-gate process", Wikipedia. https://en.wikipedia.org/wiki/Phase-gate_process. Key `wikipedia-phase-gate-process`.
- **What it says:** in a phase-gate process, a gate is a quality-control checkpoint between stages where a go or kill decision is made. Gates need clear, visible criteria so the decision is objective.
- **Used for:** Gate.
- **What it does not show:** its gates are decision meetings run by managers; running a gate by machine with no human step is this repository's rule.

## Poka-yoke

- **Citation:** "Poka-yoke", Wikipedia. https://en.wikipedia.org/wiki/Poka-yoke. Key `wikipedia-poka-yoke`.
- **What it says:** poka-yoke is any mechanism in a process that helps an operator avoid mistakes by preventing, correcting or drawing attention to errors as they happen. The Japanese term means mistake-proofing; it is also called a forcing function. A plug that only fits one way is an example.
- **Used for:** Mistake-proofing.
- **What it does not show:** it comes from manufacturing; tokens in place of typed names are this repository's example.

## Code Owners

- **Citation:** "Code Owners", GitLab Docs. https://docs.gitlab.com/user/project/codeowners/. Key `gitlab-docs-code-owners`.
- **What it says:** the Code Owners feature names who owns which files and folders. Combined with protected branches, it can require those owners to approve a merge request before it merges.
- **Used for:** Required reviewers.
- **What it does not show:** it is one vendor's feature, on paid tiers; it says nothing about machine checks coming first.

## Docs as code

- **Citation:** "Docs as code", Write the Docs (Eric Holscher and the Write the Docs community). https://www.writethedocs.org/guide/docs-as-code/. Key `writethedocs-docs-as-code`.
- **What it says:** docs as code means writing documentation with the same tools as code: issue trackers, version control, plain-text markup, code review and automated tests. One benefit it lists is that merges of new features can be blocked when they come without documentation.
- **Used for:** Stale docs.
- **What it does not show:** it does not define stale docs or docs drift; it supports the remedy (change docs in the same workflow, and check them), not the definition.

## Corrective and preventive action

- **Citation:** "Corrective and preventive action", Wikipedia. https://en.wikipedia.org/wiki/Corrective_and_preventive_action. Key `wikipedia-capa`.
- **What it says:** CAPA is the set of actions an organization takes to fix and remove recurring non-conformance. The non-conformance is found by analysing its root cause, and the action must be put in place and then watched to see that it works. It is part of good manufacturing practice and many ISO standards.
- **Used for:** Root cause and lasting fix.
- **What it does not show:** it does not describe the "ask why again" method; that is a common practice the concept page names, not a claim from this page.

## Recognition and recall

- **Citation:** Raluca Budiu, "Memory Recognition and Recall in User Interfaces", Nielsen Norman Group, 2024-01-15. https://www.nngroup.com/articles/recognition-and-recall/. Key `nngroup-recognition-and-recall`.
- **What it says:** recognizing the right option is easier than recalling it from memory, because the context helps. One of the ten usability heuristics is to promote recognition over recall, by making information and functions visible and easy to reach.
- **Used for:** Self-explaining part.
- **What it does not show:** it is about user interfaces; applying it to files, docs and error messages is this repository's rule.

## Reference implementation

- **Citation:** "Reference implementation", Wikipedia. https://en.wikipedia.org/wiki/Reference_implementation. Key `wikipedia-reference-implementation`.
- **What it says:** a reference implementation is a program that implements all of a specification and shows what correct behavior is. Testing it against the specification helps find errors or gaps in both.
- **Used for:** Two masters.
- **What it does not show:** "two masters" is this repository's own term; a reference implementation is the nearest industry idea (a specification plus one real use of it, checked against each other), not the same thing.
