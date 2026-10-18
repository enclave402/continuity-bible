---
title: ADR-005 Continuity cards and a shot sheet carry state from shot to shot
doc_id: adr-005-continuity-card-and-shot-sheet
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/decisions/ADR-005-continuity-card-and-shot-sheet.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# ADR-005: continuity cards (per character, per story day) and a shot sheet (per scene) carry wardrobe, props, marks, place and time from one shot to the next, and compile into one pasteable block

**Status:** accepted, 2026-10-17, with open loops. The design rests on a structure proven in private production and on the findings of the one carded research report; the deep-research prompt on professional continuity norms (`research/corpus/prompts/continuity-norms-and-structures-prompt.md`) had not been run when this was built, so every choice that prompt should confirm is listed at the end and in `docs/_registry/open_loops.md`.
**Deciders:** the owner named the gap (names and anchors hold, but nothing carries wardrobe, props, time of day, location and carried state from shot to shot) and asked for a layperson-friendly, LLM- and API-agnostic public form of the private continuity system, with nothing private copied; the agent designed the files, the engine and the gate.

## Context

The registry keeps who a character is (name, look, canon tags, anchor). A story is a sequence of pictures, and between two pictures almost everything else can slip: a coat comes and goes, a phone changes hands, a scar heals in one panel, the kitchen gains a window, evening turns to daylight. A person pasting prompts into a browser chatbot has no script supervisor and no continuity photographs; the chatbot's own memory is the failure mode, not the fix (finding `accp-14`: conversational image models resurface earlier props, lighting and seating positions within a few turns).

A sibling system already does this privately: a continuity file with characters, story days, a per-scene matrix with wardrobe layers and a transition reason, props with where they are worn, state verbs for distress and accessories, and a compiled character line. Its structure is sound and its data is private. `CONTINUITY-ISSUE-CLASSES.md` already names the eight ways such a system goes silent, and the registry already has the mechanisms that answer them (props by id, contextual forms, exclusive markers, forbidden duplicate keys, coverage).

## Decision

1. **Two files, declared as surfaces.** `continuity-cards` (how each character starts each story day) and `shot-sheet` (scenes in reading order, each with shots in order) are new surface types in `character-registry.json`, one of each per story. They reuse `exclusive_markers`, `skip_keys` and `story`; they add `required` (which card or header fields must be filled) and `lead` (the form that opens a character's line). Both are token sources: a typed name or look fails with the token to write. Schemas: `scripts/continuity-cards.v1.schema.json`, `scripts/shot-sheet.v1.schema.json`.
2. **Carried state is separated from decisions.** Wardrobe (layers `outer`, `top`, `bottom`, `shoes`, or one line), hair, accessories, marks and what each character carries start from the card and pass from shot to shot and scene to scene within a story day without being written again. Every alteration is a `change` with `who` and a `reason`; a change without a reason fails. A new story day starts from the cards; a mark that ends a day and vanishes from the next card is reported. This is the private system's "a changed layer needs a transition reason" rule, generalised to every carried field and said in plain words.
3. **Props are ids, hands are checked.** `carries` on a card, `holding` on a shot, `props` in frame and `hands`/`to` in a change all take registry ids of `kind: "prop"`; the block prints the entry's `prompt_tokens` and the AVOID line its `negative_tokens`. A character may hold only what they carry at that moment: the card gave it, a change added it, or someone handed it over. Nothing matches a prop's name in prose (ADR-003, class 3).
4. **Place and time are header decisions, and vocabularies are declared.** Every scene header says `story_day`, `location` and `time_of_day` (film's slug line, in plain words); locations are written once with a look. The surface's `exclusive_markers` declare the words each time or place owns; text using another value's words fails (ADR-003, class 6), and the other values' words become the compiled block's AVOID line, so the same declaration both checks the plan and steers the model. The engine ships no words.
5. **One engine, two consumers.** `carryContinuity()` in `scripts/lib.mjs` is a pure function from the two parsed files to compiled shots plus failures and gaps. `check.mjs` reports the problems; `compile-shot.mjs` renders the shots through `names.mjs`, and refuses to compile anything the gate fails.
6. **The block's order follows the research.** Each character comes first (lead form, wardrobe, hair, accessories, marks, in hand, action, eyeline, position), the setting after, then what changed, then AVOID. Finding `accp-26`: text encoders weight early tokens most and drop what falls past the window, and reordering a description changes the face; the report's fix is a fixed-order character prefix at position zero with scene and action after it. Characters are labelled CHARACTER 1, 2 by cast order rather than named, so a pasted block carries no name (the browser-chatbot how-to's rule), and `lead` defaults to the registry's `look` form so who the character is comes from the registry, not from the sheet (finding `accp-13`: a prompt that re-describes what a reference already fixes is the main failure in reference-based tools; the sheet describes only what changes by day and shot).
7. **The sheet and the story's scene file must agree.** When the story has a `scenes` surface, a sheet scene with the same slug is compared on `time_of_day`, `story_day` and `stage`; a disagreement fails. A scene the story does not have yet is a gap. The sheet is self-contained so a story told in markdown scenes still has a plan.

## Why these fields, in the research's terms

- Wardrobe as layers, listed every shot: face adapters leave torso, clothes and height to the text (`accp-08`, checked), and garment details mutate between panels even when the face holds (`accp-16`, checked), so the words have to be in every prompt and have to be the same words. Layers match how a person reads a garment change off a picture (the garment-attribute rubric in `accp-30`: a jacket gaining a zipper, losing a pocket), which is also how the hand tags of the anchor flow work.
- Accessories and marks as their own lists: small anchors, scars, glasses and props vanish or warp unless named every time (`accp-17`); the card names them once and the engine repeats them.
- A CHANGED SINCE THE LAST SHOT line and an AVOID line: conversational models drag earlier props and lighting back in (`accp-14`); stating the change and the words to avoid is the only lever a browser-tab user has.
- Cards before the first shot: the asset bible precedes the first scene (`accp-20`); here the bible is small enough for a parent to fill in ten minutes.
- The registry's own wardrobe variants and forbidden defaults (`accp-27`) are the professional shape of a card's wardrobe and the block's AVOID line, minus the adapter bindings a layperson does not have.

## Consequences

- A layperson fills two cards and one sheet from the how-to and gets a block to paste per shot; the gate catches a missing reason, a prop in the wrong hand, a missing card, a contradicted time or place, a typed name, and a sheet that disagrees with the page.
- The private project can adopt the public shape by exporting its matrix rows as cards and shots; its manifest (`visual_continuity`, `continuity_file`) keeps working as a separate surface type and is not changed by this decision. Converging the two is an open loop.
- Everything the block says is in the files; nothing is inferred from pictures. Measuring whether the model obeyed the block is the anchor flow's job (ADR-004), not this one's.
- A field that the norms research shows professionals rely on and this design lacks is added by amendment, never by a project hardcoding it.

## Amendment, 2026-10-17: render surfaces are a declared structure, and no template may retype their rules

**Context.** In the private consumer project a restage template was found hardcoding a sentence of look rules (keep the style, no text, every hand shows its digits, no packaging) that already lived as prose in the render program, while another surface of the same program, a product card, is deliberately packaging. The owner, the same evening: "we shouldn't be using hardcoding. It's brittle", and "this must be a structure in the deliverable". A rule copied into a template goes stale the day the surface changes, and a rule that is right for one surface is wrong for another.

**Decision.**

1. `character-registry.json` gains `render_surfaces`: one entry per kind of picture (a story scene, a product card, a cover), with a plain-language `name` and the fields the private project adopts the same night: `style_lock`, `must_keep`, `exclude`, `size` (or `aspect`), `no_text`, `hands_rule`, `why`, plus `continuity: false` for a surface that carries no story state. Every value is the author's own words; the engine ships only the example.
2. The shot sheet gains `surface`, on a scene header or on a shot. Once any surface is declared every shot names one; an unknown surface fails; a surface named with none declared fails.
3. `scripts/compile-shot.mjs` appends `KEEP (<name>, <size>)` from `style_lock`, `must_keep`, `hands_rule` and a `no_text` sentence, and extends AVOID with `exclude` and the word `text` when `no_text` is `true`. The script holds no rule phrase; the two example surfaces compile the same prop, the brass key, into two different blocks.
4. `scripts/lib.mjs` gains the inverted gate for rules, the same shape as the one for names: every file matched by `render_templates` (declared globs, so nothing is hardcoded about where templates live), every structured surface and every token source that contains a surface phrase verbatim fails with the file, the phrase, its source field and the fix: read it from the surface. A phrase is two or more words; single words are AVOID vocabulary and prose may use them.
5. The example registry declares two surfaces and a template; the tests plant a retyped rule in the template and in a token source, an unknown surface, a missing surface, a surface with none declared and a glob with no file, and expect each to be named.

**Consequences.** The rules reach every prompt through the compiled block and only through it; a change to a surface changes every later block and no template. The how-to's walk shows the gate finding the tutorial's own picture prompt retyping the page surface's style and exclusions, and the reader moving them to the surface, which is the private project's case in public form. The field names mirror the private project's so its export is a copy, not a translation; whether they match the names professionals use for a style guide and a model sheet is a further open loop for the continuity-norms research (below).

## Open loops the continuity-norms research should confirm or correct

Each is also a line in `docs/_registry/open_loops.md`; the answer to the carded prompt becomes a card, and each loop closes against a finding id.

1. Field names and the split: wardrobe layers (`outer`, `top`, `bottom`, `shoes`) against a costume plot's own categories; `marks` against make-up and effects continuity; `accessories` as a list apart from wardrobe.
2. The story day as the unit of the card: film numbers wardrobe by story day; animation and comics may not.
3. Whether a reason belongs on every change (a script supervisor's notes record the change; whether they record the why is to be checked) and whether the reason should ever reach the prompt.
4. Shot size vocabulary (`wide`, `medium`, `close-up`, `two-shot`, `insert`) and whether eyeline and position as free text are enough, or whether screen direction and the 180-degree rule need fields.
5. Carrying state across scenes of a day by file order, with no explicit timeline, and resetting at a day boundary.
6. The AVOID line built from exclusive markers: whether negative prompting of the other time or place words helps or hurts on today's hosted tools (`accp-13` warns that re-describing fixed features hurts; the AVOID words describe what is not in the shot).
7. Labelling people CHARACTER 1, 2 in the block instead of by name.
8. The render surface fields (`style_lock`, `must_keep`, `exclude`, `size`, `no_text`, `hands_rule`) against the fields of a style guide, a model sheet and a colour script; and the two-word rule for what counts as a retyped phrase.
