---
id: continuity-norms-and-structures-prompt
title: "Research prompt: existing continuity norms and structures, and where a layperson's browser-flow tool adds unique value"
kind: prompt
subjects: ["continuity-sop", "workflow-architecture", "research-methods"]
constructs: ["script supervisor", "continuity report", "model sheet", "turnaround", "character bible", "shot list", "storyboard", "style guide", "color script", "shot-to-shot continuity", "browser flow", "layperson tool"]
evidence: uncited
source_keys: []
origin: "written in this repository, 2026-10-17, for a deep-research tool; its answer becomes another card"
origin_title: "Continuity norms and structures: landscape for a layperson's LLM-agnostic tool"
captured: 2026-10-17
status: reviewed
summary: "A deep-research prompt asking for the established continuity structures of film, animation, comics and games (what they are called, what fields they hold, who maintains them, where they fail), the AI-era equivalents, and the gaps left for a non-technical person who tells stories through a browser chatbot with no API, so that a simple, LLM-agnostic continuity card and shot sheet can be designed on top of real norms rather than invented ones. Not yet run."
---

# Research prompt: existing continuity norms and structures

Paste everything below the line into a deep-research tool. The answer is filed as a corpus card (`kind: owner-research`), overlap-checked, mined and verified like any other document (`docs/2-how-to/HOW-TO-INGEST-RESEARCH.md`).

---

You are researching for a small open-source project that helps non-technical people tell illustrated stories with AI without the characters drifting. Its users are laypeople: a parent making a picture book, a coach illustrating a short narrative, a hobbyist making a comic. Many of them drive the image model through a browser chatbot tab by copy and paste, not through an API or a node graph. The project already keeps every character's name as a token resolved from one registry file, and can pick a visual anchor after a character has drifted. What it lacks is **continuity from shot to shot**: wardrobe, props, injuries, time of day, weather, location, blocking, eyelines, and the state a character carries from one scene into the next.

Before designing that, I need the real landscape. Please produce a report with the following sections, with primary sources cited inline and a works-cited list with URLs.

## 1. Established continuity structures, by discipline

For each of film and television, 2D and 3D animation, comics and graphic novels, video games, and illustrated children's books, describe the artifacts professionals actually keep for continuity: their names (script supervisor's continuity report and lined script, shot list, storyboard, model sheet, turnaround, expression sheet, character bible, style guide, color script, costume continuity book, prop list, set continuity photos, wardrobe plot, day-out-of-days, and any others), the fields each one holds, who owns and updates it, at what point in production it is created, and how it is used on the day a shot is made. Quote or paraphrase the fields from a primary source (a union or guild handbook, a textbook, a studio's published guide, a course syllabus) rather than a blog. Where disciplines use different words for the same artifact, say so.

## 2. Vocabulary and conventions

Give the standard vocabulary a layperson's tool should reuse rather than reinvent: shot sizes, camera angles, the 180-degree rule and eyeline match, screen direction, continuity of action, wardrobe "day" numbering, prop states, time-of-day and weather continuity, "match cut" and "continuity error" categories. Include how continuity errors are classified when caught (and by whom), and typical checklists used in continuity passes.

## 3. How continuity breaks, and how it is caught

Summarise documented failure modes (wardrobe changes mid-scene, prop teleportation, injury or dirt that heals between shots, lighting and time-of-day contradictions, eyeline and screen-direction flips, aging and hair inconsistencies, height differences between actors or characters) and the practices that catch them: continuity photographs, the lined script, dailies review, pre-visualisation, animation's model-sheet sign-off, comics' character turnarounds pinned above the desk. Note which practices are cheap and which need a crew.

## 4. The AI-era equivalents

Survey what AI image and story tools offer for continuity today: character reference and reference-weight features in hosted image tools, "consistent character" features in browser chatbots, LoRA and adapter workflows, story-visualisation research systems that keep identity across frames, and any tool that tracks wardrobe, props or scene state (not just the face). For each, state what it locks, what it does not, whether it needs an API or a node graph, what it costs, and its licence caveats. Distinguish marketing claims from measured results; prefer papers, documentation and reproducible evaluations.

## 5. The gap for a browser-flow layperson

Given a person who has only a browser chatbot tab, a folder of downloaded images and a text editor: which continuity artifacts from section 1 can they realistically maintain, which are overkill, and which have no good equivalent yet? What would a minimal **continuity card** (per character, per story day) and a minimal **shot sheet** (per scene) need to contain so that a copy-pasted prompt carries shot-to-shot state without the person understanding diffusion models? Propose field lists with plain-language names, and say which fields can be filled from the previous shot automatically (carried state) versus must be written by the author (decisions).

## 6. Positioning

Where does a simple, LLM-agnostic, API-optional, file-based continuity tool offer unique value compared with the tools in section 4, and where would it be redundant? Which existing norms should it visibly inherit (so professionals recognise it) and which should it deliberately simplify for laypeople? Give three concrete differentiators that can be stated truthfully, and three claims it must not make.

## Output requirements

- Tables for sections 1, 4 and 5; prose elsewhere. Plain language; define every term of art once.
- Cite primary sources inline with a number and list them at the end with full URLs. Mark each claim's evidence as primary (standard, handbook, paper, official documentation) or secondary (blog, forum, video). Do not launder a blog's citation of a paper as if you read the paper.
- Include a proposed JSON schema for the continuity card and the shot sheet from section 5, with a one-line description per field and an example filled for a two-character kitchen scene at evening with one prop (a key) and one wardrobe change from the previous scene.
- Flag anything you could not verify. Do not invent artifact names, fields or statistics.
