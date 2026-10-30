---
id: concept-page-sources
title: "Concept page sources: what each outside page says"
kind: pointer
subjects: ["process-quality", "research-methods"]
constructs: ["single source of truth", "DRY principle", "model sheet", "creative brief", "digital asset management", "content credentials", "C2PA", "separation of duties", "acceptance criteria", "regression", "policy as code", "stage-gate", "poka-yoke", "code owners", "docs as code", "CAPA", "recognition over recall", "reference implementation"]
evidence: verified-key
source_keys: ["wikipedia-model-sheet", "wikipedia-creative-brief", "hunt-thomas-dry-principle-2003", "ibm-what-is-dam", "wikipedia-digital-asset-management", "c2pa-specification-2-2", "nist-sp-800-53r5", "wikipedia-acceptance-testing", "leung-white-1990-regression", "hashicorp-sentinel-policy-as-code", "cooper-stage-gate-overview", "wikipedia-poka-yoke", "gitlab-docs-code-owners", "writethedocs-docs-as-code", "cfr-21-820-100-2024", "nngroup-recognition-and-recall", "nist-gsc-is-reference-implementation-2003"]
origin: "outside sources loaded and read 2026-10-30 by a coding agent for COA-138; each recorded in SOURCES.json by verify.mjs"
origin_title: "Concept page sources: what each outside page says"
captured: 2026-10-30
status: reviewed
summary: "Pointer card for the outside sources behind the concept pages in docs/4-explanation/concepts/: for each, the citation, what it says in this card's words, which concept page uses it, and what it does not show. Primary or standards-body sources (C2PA, NIST, 21 CFR, Cooper, Hunt and Thomas, Leung and White) replace Wikipedia where they could be opened; Wikipedia stays for five definitions, each with the reason."
source_sha256: d5f6fc977d3eb2a0e14f8a06caf1ed0f62dd17acfd1f123ad01ccee4e238452b
source_words: 2207
citations: 0
cited_primary: 0
cited_web: 0
figures: 0
---
# Concept page sources: what each outside page says

This card is a pointer, not a copy. It lists the outside sources behind the concept pages in `docs/4-explanation/concepts/` (COA-138). For each one it gives the citation, what the source says in this card's own words, which concept page uses it, and what the source does not show. Every source was loaded and read on 2026-10-30 and recorded in `research/SOURCES.json` under the key given. Rules the concept pages call "the rule here" are this repository's own rules, not claims from these sources.

Where a page first rested on Wikipedia, the source the Wikipedia article cites (or the standard or original author behind it) was looked up and opened. When it could be opened, it replaced Wikipedia as the page's source. Wikipedia stays only where no primary source could be opened, and the section says why. Wikipedia is a tertiary source: it states a common definition, not new evidence.

## Model sheet

- **Citation:** "Model sheet", Wikipedia. https://en.wikipedia.org/wiki/Model_sheet. Key `wikipedia-model-sheet`.
- **What it says:** a model sheet (also called a character sheet or character study) is a document that standardizes a character's appearance, poses and gestures. Productions need one when many artists work on the same character, so the character stays the same from scene to scene.
- **Used for:** Character card.
- **Why Wikipedia stays:** the article's sources are an animation trade lesson page (refused automated reading, HTTP 403), Scott McCloud's *Making Comics* (lending copy only) and a Springer book (paywalled). None could be opened.
- **What it does not show:** the page does not list turnaround views; those come from the animation production book (finding `eadp-11`).

## Creative brief

- **Citation:** "Creative brief", Wikipedia. https://en.wikipedia.org/wiki/Creative_brief. Key `wikipedia-creative-brief`.
- **What it says:** a creative brief is a document used to develop creative work such as visual design or copy. The person asking for the work usually writes it and the creative team approves it, sometimes before work may start. It is a set of simple questions and answers that becomes the template for the work; when the work drifts, the team checks back against this agreed document.
- **Used for:** Brief.
- **Why Wikipedia stays:** the article cites only vendor blog posts, and no standards body defines a creative brief.
- **What it does not show:** it describes advertising agencies; it says nothing about picture prompts or character tokens.

## Single source of truth: the DRY principle

- **Citation:** Bill Venners, "Orthogonality and the DRY Principle: A Conversation with Andy Hunt and Dave Thomas, Part II", Artima, 2003-03-10. https://www.artima.com/articles/orthogonality-and-the-dry-principle. Key `hunt-thomas-dry-principle-2003`.
- **Route:** the Wikipedia article on single source of truth (key `wikipedia-single-source-of-truth`) cites only vendor and blog pages. The same idea's primary statement is the DRY principle, given here by its authors.
- **What it says:** the authors say DRY is not only about duplicated code. Every piece of a system's knowledge should have one authoritative, unambiguous representation, and that knowledge includes database schemas, test plans, the build system and documentation.
- **Used for:** One home for each fact.
- **What it does not show:** it is about software systems; applying it to story names, looks and word lists is this repository's choice.

## Digital asset management

- **Citation:** "What is digital asset management?", IBM. https://www.ibm.com/topics/digital-asset-management. Key `ibm-what-is-dam`. Also "Digital asset management", Wikipedia. https://en.wikipedia.org/wiki/Digital_asset_management. Key `wikipedia-digital-asset-management`.
- **Route:** the IBM page is one the Wikipedia article cites. The article's other primary citation, Wager (2005) in the Journal of Digital Asset Management (doi 10.1057/palgrave.dam.3640008), is behind a paywall and could not be opened.
- **What IBM says:** a DAM gives a searchable, central home for media assets, with versioning, metadata, access control and rule-driven workflows.
- **What Wikipedia adds:** assets move through lifecycle states such as creation, approval, live, archived and deleted, and a change of state can send the asset to a team for review. This lifecycle claim stays on Wikipedia because IBM does not state it and Wager could not be opened.
- **Used for:** Asset library (IBM); Approval steps (Wikipedia, with finding `eadp-11`).
- **What it does not show:** IBM is a vendor page. Neither source says an asset should be used in only one place; that is this repository's rule.

## Content Credentials: the C2PA specification

- **Citation:** Coalition for Content Provenance and Authenticity, "C2PA Technical Specification", version 2.2. https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html. Key `c2pa-specification-2-2`.
- **Route:** the Wikipedia article on Content Credentials (key `wikipedia-content-credentials`) is built on this specification.
- **What it says:** provenance lets creators and editors disclose how an asset was created, how it was changed and what was changed. Each change is added to the existing provenance. A C2PA Manifest is the provenance record, made of assertions, a claim and a claim signature. Manifests can be embedded in the asset or kept outside it, and "Content Credential" is the plain-language name for a manifest.
- **Used for:** Made-by record.
- **What it does not show:** the made-by record on the concept page is a plain record kept next to the file; it is not signed and is not a C2PA Manifest.

## Separation of duties: NIST SP 800-53, control AC-5

- **Citation:** Joint Task Force, "Security and Privacy Controls for Information Systems and Organizations", NIST Special Publication 800-53 Revision 5, 2020. https://doi.org/10.6028/NIST.SP.800-53r5. Key `nist-sp-800-53r5`. Control AC-5 was read from NIST's machine-readable catalog of the same publication.
- **Route:** the Wikipedia article on separation of duties (key `wikipedia-separation-of-duties`) cites ISACA and journal papers; NIST AC-5 is the standards-body control for the same idea.
- **What it says:** control AC-5, Separation of Duties, asks an organization to identify the duties to separate and to set up access so they stay separate. Its guidance says this reduces the risk of abuse of authorized privileges, by dividing business functions among different people or roles and by not letting the people who run access control also run auditing.
- **Used for:** Second checker.
- **What it does not show:** it is a security control for people and roles; using a different tool or model to grade a picture than the one that made it is this repository's application.

## Acceptance testing

- **Citation:** "Acceptance testing", Wikipedia. https://en.wikipedia.org/wiki/Acceptance_testing. Key `wikipedia-acceptance-testing`.
- **What it says:** acceptance criteria are the criteria a system must meet to be accepted by a user, customer or other authorized person. When the criteria, agreed in advance, are met, the sponsor is expected to sign off.
- **Used for:** Done-when list.
- **Why Wikipedia stays:** the definition it quotes is from IEEE and ISO/IEC/IEEE vocabulary standards, which are paywalled. The Agile Alliance glossary entry "Definition of Done" was read and agrees: the team agrees on a list of criteria that must be met before work counts as done. It could not be recorded, because the site refused the repository's verify tool (HTTP 403).
- **What it does not show:** it does not require each line to be testable by a script; that is this repository's rule.

## Software regression: Leung and White (1990)

- **Citation:** Hareton K. N. Leung and Lee White, "A study of integration testing and software regression at the integration level", Proceedings of the Conference on Software Maintenance 1990, IEEE. https://doi.org/10.1109/ICSM.1990.131377. Key `leung-white-1990-regression`.
- **Route:** cited by the Wikipedia article on software regression (key `wikipedia-software-regression`). The full paper is behind a paywall; this card relies on its abstract, read through OpenAlex.
- **What it says (abstract):** new errors may be introduced by a correction or a design change. Regression testing reuses earlier test cases and retests the parts that changed, and the authors propose a way to focus retesting on where new errors may have appeared.
- **Used for:** Backslide.
- **What it does not show:** it does not say a new test should be added for every fixed mistake; that is this repository's rule.

## Policy as code

- **Citation:** "Policy as Code", HashiCorp Sentinel documentation. https://developer.hashicorp.com/sentinel/docs/concepts/policy-as-code. Key `hashicorp-sentinel-policy-as-code`.
- **What it says:** policy as code means writing policies as code in text files, so they get version control, automated testing and automated deployment. Policies set by clicking in a screen are hard to repeat, version or test.
- **Used for:** Rules the computer checks.
- **What it does not show:** it is a vendor's page for its own product; it does not say a rule's settings belong in a separate data file.

## Phase-gate process: Cooper's Stage-Gate model

- **Citation:** Robert G. Cooper, "The Stage-Gate Model: An Overview", Stage-Gate International. https://www.stage-gate.com/blog/the-stage-gate-model-an-overview/. Key `cooper-stage-gate-overview`.
- **Route:** the Wikipedia article on the phase-gate process (key `wikipedia-phase-gate-process`) cites no primary source. Cooper originated the model; his 1990 paper (Business Horizons, doi 10.1016/0007-6813(90)90040-I) is behind a paywall, so this card uses his own overview page.
- **What it says:** work is organized into stages separated by gates. Before entering any new stage, the project must pass a gate: a go or kill decision point. The page quotes the PDMA handbook: the team must complete a set of tasks in each stage before getting approval to go on.
- **Used for:** Gate.
- **What it does not show:** its gates are management decisions; running gates by machine with no human step is this repository's rule.

## Poka-yoke

- **Citation:** "Poka-yoke", Wikipedia. https://en.wikipedia.org/wiki/Poka-yoke. Key `wikipedia-poka-yoke`.
- **What it says:** poka-yoke is any mechanism in a process that helps an operator avoid mistakes by preventing, correcting or drawing attention to errors as they happen. The Japanese term means mistake-proofing; it is also called a forcing function. A plug that only fits one way is an example.
- **Used for:** Mistake-proofing.
- **Why Wikipedia stays:** the primary source is Shigeo Shingo's book, which cannot be read for free. The ASQ mistake-proofing page and John Grout's tutorial both refused automated reading (HTTP 403), and the Agency for Healthcare Research and Quality copy returned an empty page.
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

## Corrective and preventive action: 21 CFR 820.100

- **Citation:** US Code of Federal Regulations, Title 21, section 820.100, "Corrective and preventive action", text as in force on 2024-01-01, read through the eCFR. https://www.ecfr.gov/api/renderer/v1/content/enhanced/2024-01-01/title-21?part=820&section=820.100. Key `cfr-21-820-100-2024`.
- **Route:** cited by the Wikipedia article on CAPA (key `wikipedia-capa`).
- **What it says:** a medical device maker must keep procedures for corrective and preventive action. The procedures must: analyse quality data to find existing and possible causes of problems; investigate the cause of nonconformities; identify the action needed to correct the problem and prevent it from recurring; check that the action works; and record the changes.
- **Used for:** Root cause and lasting fix.
- **What it does not show:** from 2026-02-02 FDA's new rule replaced this section by bringing in ISO 13485, which cannot be read for free; this card cites the older text. It does not describe the "ask why again" method the concept page names.

## Recognition and recall

- **Citation:** Raluca Budiu, "Memory Recognition and Recall in User Interfaces", Nielsen Norman Group, 2024-01-15. https://www.nngroup.com/articles/recognition-and-recall/. Key `nngroup-recognition-and-recall`.
- **What it says:** recognizing the right option is easier than recalling it from memory, because the context helps. One of the ten usability heuristics is to promote recognition over recall, by making information and functions visible and easy to reach.
- **Used for:** Self-explaining part.
- **What it does not show:** it is about user interfaces; applying it to files, docs and error messages is this repository's rule.

## Reference implementation: NIST (2003)

- **Citation:** Eric Dalci, Elizabeth Fong and Alan Goldfine, "Requirements for GSC-IS Reference Implementations", NIST Information Technology Laboratory, 2003-06-05. The original NIST address is gone; read from the Internet Archive copy: https://web.archive.org/web/20060928231404id_/http://xw2k.sdct.itl.nist.gov/smartcard/document/ref-imp51.pdf. Key `nist-gsc-is-reference-implementation-2003`.
- **Route:** cited by the Wikipedia article on reference implementations (key `wikipedia-reference-implementation`).
- **What it says:** a reference implementation is an implementation of a specification that serves as the definitive interpretation of it. A trusted one helps find errors or gaps in the specification and checks that the conformance tests work.
- **Used for:** Two masters.
- **What it does not show:** "two masters" is this repository's own term; a reference implementation is the nearest industry idea (a specification plus one real use of it, checked against each other), not the same thing.
