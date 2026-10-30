# Open loops: unresolved placement and documentation debt

One line per item: date, what, where it sits now, what would resolve it. Remove a line when it is resolved and say so in the pull request.

- 2026-10-17: the sibling continuity system referenced by `visual_continuity` now has a public form: continuity cards and a shot sheet (ADR-005, `examples/continuity/`). The private manifest shape (`visual_continuity`, `continuity_file`, a `continuity` surface keyed by `scene_name`) remains a separate surface type. Resolve by converging the two (the private matrix exported as cards and shots) or by documenting the mapping.
- 2026-10-17: ADR-005 was designed before `research/corpus/prompts/continuity-norms-and-structures-prompt.md` was run. Each design choice below is to be confirmed or corrected against a finding id from that card once it is carded, extracted and verified:
  - wardrobe layers (`outer`, `top`, `bottom`, `shoes`) against a costume plot's own categories; `marks` against make-up and effects continuity; `accessories` as a list apart from wardrobe;
  - the story day as the unit of the card, across film, animation and comics;
  - a reason on every change (what a script supervisor's continuity notes actually record) and whether a reason should ever reach the prompt;
  - shot size words (`wide`, `medium`, `close-up`, `two-shot`, `insert`) and whether free-text eyeline and position suffice or screen direction and the 180-degree rule need fields;
  - carrying state across a day's scenes by file order with no timeline, and resetting at a day boundary;
  - the AVOID line built from exclusive markers (negative prompting of the other time's and place's words) on today's hosted tools;
  - labelling people CHARACTER 1, 2 in the block instead of by name;
  - the render surface fields (`style_lock`, `must_keep`, `exclude`, `size`, `no_text`, `hands_rule`, ADR-005 amendment) against a style guide's, a [model sheet](../4-explanation/concepts/CHARACTER-CARD.md)'s and a colour script's own fields, and the two-word rule for what counts as a retyped phrase.
- 2026-10-17: the research findings layer holds the first findings merged from a local-model extraction; the checked subset covers only the sources verified through the arXiv API. Resolve by verifying the conference and vendor sources behind the numeric thresholds and promoting or correcting the findings that rest on them.
