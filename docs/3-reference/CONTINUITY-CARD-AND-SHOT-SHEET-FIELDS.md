---
title: Continuity card and shot sheet fields
doc_id: ref-continuity-card-and-shot-sheet-fields
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/CONTINUITY-CARD-AND-SHOT-SHEET-FIELDS.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# Continuity card and shot sheet fields

Two files carry a story's state from one shot to the next. The **continuity cards** (`scripts/continuity-cards.v1.schema.json`) say how each character starts each story day. The **shot sheet** (`scripts/shot-sheet.v1.schema.json`) lists the scenes in reading order with their shots; every shot inherits the previous shot's state and only a change with a reason alters it. Both are declared in `character-registry.json` as surfaces, checked by `scripts/check.mjs`, and compiled into a pasteable block by `scripts/compile-shot.mjs`. How to use them: [HOW-TO-KEEP-CONTINUITY-SHOT-TO-SHOT.md](../2-how-to/HOW-TO-KEEP-CONTINUITY-SHOT-TO-SHOT.md). Why they look like this: [ADR-005](../4-explanation/decisions/ADR-005-continuity-card-and-shot-sheet.md). The example pair: `examples/continuity/cards.json`, `examples/continuity/shot-sheet.json`.

Keys starting with `_` are notes anywhere in either file: never validated, never scanned. Every other string is a token source: a written-out name or look fails the gate with the token to write, exactly as in a scene file. Props are ids, never names.

## Declaring them in the registry

One continuity-cards surface and one shot-sheet surface per story, under `surfaces[]`.

| Key | On | Meaning |
|---|---|---|
| `type` | both | `continuity-cards` or `shot-sheet` |
| `file`, `story` | both | the file, relative to the registry, and the story id its characters belong to |
| `required[]` | cards | the card fields every card must fill (default `["wardrobe"]`) |
| `required[]` | sheet | the header fields every scene must fill (default `["story_day", "location", "time_of_day"]`) |
| `lead` | sheet | the form that opens each character's line in the block (default `look`); an entry without that form opens with its name |
| `exclusive_markers[]` | sheet | `{ field, values{ value: [words] }, fields[]?, required?, why? }`: the words each value of a header field owns. A shot whose text uses another value's words fails; the other values' words become the block's AVOID line. Same shape as on a scene file |
| `skip_keys[]` | both | keys whose strings the name scan leaves alone |

## The cards file

```json
{
  "story_days": { "day-1": { "label": "The night of the text", "weather": "clear and cold" } },
  "cards": {
    "sam-hayes": {
      "day-1": {
        "wardrobe": { "outer": "camel wool coat", "top": "wine silk blouse", "bottom": "black wide-leg trousers", "shoes": "black ankle boots" },
        "hair": "pinned up, loose strands at the temples",
        "accessories": ["small gold pendant"],
        "marks": [],
        "carries": ["cracked-phone"]
      }
    }
  }
}
```

| Field | Meaning | Carried how |
|---|---|---|
| `story_days.<id>.label` | one line a person reads; required | the block's header line |
| `story_days.<id>.weather` | the day's weather | every scene of the day, unless the scene header sets `weather` |
| `cards.<registry id>.<story day>` | one card per character per story day; the id is a registry entry allowed in the story, the day a key of `story_days` | the state the first shot of that day starts from |
| `wardrobe` | one line of text, or layers: `outer`, `top`, `bottom`, `shoes`, any other key you need. A layer whose value is `none` is left out. A one-line wardrobe is the layer `outfit` | shot to shot; a change sets or removes layers (`none`) or replaces the whole line |
| `hair` | how the hair is worn today. Who the character is (hair colour, texture) belongs in the registry's `look` form, not here | shot to shot; a change replaces it |
| `accessories[]` | worn things: a pendant, glasses, a watch on the left wrist | shot to shot and day to day while nothing takes them off |
| `marks[]` | injuries, dirt, wet, smudged makeup: anything on the body that must stay until it is said to be gone | shot to shot; a mark that ends a day and is missing from the character's next card is a gap |
| `carries[]` | registry ids of props (`kind: "prop"`) the character has with them today, in hand, pocket or bag | shot to shot; `hands` moves one to someone else; a shot may show in hand only what is carried at that moment |

## The shot sheet

```json
{
  "locations": { "kitchen": { "look": "a small galley kitchen, chipped green tiles, one lamp over a square table" } },
  "scenes": {
    "14-read-at-1152": {
      "story_day": "day-1", "time_of_day": "evening", "location": "kitchen", "stage": "adult",
      "shots": [
        {
          "id": "14a", "size": "medium two-shot",
          "changes": [{ "who": "{{sam-hayes}}", "wardrobe": { "outer": "none" }, "reason": "indoors now; the coat went over the back of her chair between scenes" }],
          "characters": [
            { "who": "{{sam-hayes}}", "action": "sits at the table with the phone face up", "eyeline": "at the phone", "position": "seated, left", "holding": ["cracked-phone"] },
            { "who": "{{chloe-jenkins}}", "action": "fills the kettle at the sink", "eyeline": "half turned toward the table", "position": "standing, right, behind" }
          ]
        }
      ]
    }
  }
}
```

| Field | Meaning |
|---|---|
| `locations.<id>.look` | each place written once, as the picture should show it. Optional; when present, every scene's `location` must be a key here |
| `scenes.<slug>` | scenes in reading order (the order in the file is the order of the story). Use the same slug as the story's scene file when it has one; `scene` names a different slug there |
| `story_day` | a key of the cards' `story_days`. A new story day starts every character from their card again |
| `location` | a key of `locations`, or a short name when the sheet declares none |
| `time_of_day` | the in-story clock. Declare the words each value owns under the surface's `exclusive_markers` |
| `weather` | overrides the day's weather for this scene |
| any other scalar on the header (`stage`, `season`) | context for contextual forms in every shot of the scene: `{{brass-key:attitude}}` picks its variant by the scene's `stage` |
| `shots[].id` | short and unique within the scene (`14a`); defaults to the position |
| `shots[].size` | shot size in the usual words: wide, medium, close-up, two-shot, insert |
| `shots[].characters[]` | who is in the shot, in the order the block lists them (CHARACTER 1, 2, ...). A token (`{{sam-hayes}}`) or `{ who, action, eyeline, position, holding }`, all but `who` optional. `holding` lists prop ids visibly in hand in this shot |
| `shots[].action` | the staging of the whole shot, when one line for everyone is clearer than a line per person |
| `shots[].props[]` | prop ids in frame but in nobody's hand (on the table) |
| `shots[].changes[]` | the decisions in this shot, each `{ who, reason, ... }` with one or more of: `wardrobe` (layers to set, `none` removes; or one line that replaces the whole), `hair`, `accessories: { add, remove }`, `marks: { add, remove }`, `carries: { add, remove }`, `hands: "<prop id>", to: "{{id}}"`. A change is in force for the whole shot. `reason` is required: a change without one fails |

### Carried versus decided

| The previous shot hands forward by itself | The author writes, with a reason |
|---|---|
| wardrobe, hair, accessories, marks, what each person carries, within a story day and across its scenes | every change to those, as `changes[]` |
| the scene's story day, location, time of day and weather, to every shot in the scene | the scene header itself: a new scene says where and when |
| nothing across a story day boundary: the new day starts from the cards | the next day's card, including any mark that is still there |

## What the gate checks

`node scripts/check.mjs` runs these for each story that has the two surfaces. Failures exit 1; gaps print and pass.

| Problem | Message (shortened) |
|---|---|
| a character in a shot with no card for the scene's story day | `Sam is in this shot but has no continuity card for day-1. Fix: add cards.sam-hayes.day-1 ...` |
| a card missing a required field | `cards.theo-vance.day-1: missing hair. Fix: write Theo's hair at the start of day-1` |
| a change without a reason | `shot 14a: changes[0]: the change for Sam has no reason. Fix: add "reason" ...` |
| a change that sets nothing | `changes nothing. Fix: set one of wardrobe, hair, accessories, marks, carries, hands` |
| a prop in a hand the card does not give and no change handed over | `Chloe holds "cracked-phone", which the card for day-1 does not give Chloe and no earlier change handed over` |
| handing over a prop one does not carry | `Sam hands over "brass-key" but does not carry it here (carries: cracked-phone)` |
| a non-prop id under `carries`, `holding`, `props` or `hands` | `carries "theo-vance" is Theo (kind person), not a prop` |
| a scene header missing a required field, or naming an unknown day or place | `missing time_of_day`; `story_day "day-9" is not a key of story_days`; `location "garage" is not a key of locations (porch, kitchen, workshop)` |
| text using another value's words | `says "sawdust" (location workshop) but location is "kitchen"` |
| a typed name or look | `names "Sam" in a token source. Fix: write {{sam-hayes}}` |
| the sheet and the story's scene file disagree on `time_of_day`, `story_day` or `stage` | `time_of_day "evening" but examples/scenes.json says "morning"` |
| a sheet with no cards surface for its story | `the shot-sheet surface ... has no continuity-cards surface for the same story` |
| a cast reference that is no id, token or known name, or a character of another story | `characters[0] "..." is no registry id, token or known name of main-story` |
| a shape the schema refuses | `scenes.14-read-at-1152.shots[0]: unknown field charaters` |
| gap: a mark that ends a day and is missing from the next card | `gap: ... Theo ended day-1 with marks [...] that this card does not list` |
| gap: a sheet scene the story's scene file does not have | `gap: ... no scene "16-next-morning" in the story's scene file` |
| gap: a scene with no shots | `gap: ... has no shots yet` |

## The compiled block

```bash
node scripts/compile-shot.mjs <scene> [--shot <id>] [--story <id>] [--out <file>] [--json] [--registry <path>]
```

One block per shot, in this order, every token resolved by `scripts/names.mjs`:

```text
=== <scene> · shot <id> (<size>) · <story day>: <label> ===
CHARACTER 1: <lead form>. WEARING: <outer> over <top>, <bottom>, <shoes>. HAIR: <hair>. ACCESSORIES: <...>. MARKS: <...>. IN HAND: <prompt_tokens of each held prop, or nothing>. ACTION: <...>. EYELINE: <...>. POSITION: <...>.
CHARACTER 2: ...
SHOT: <size>. SETTING: <location look>. TIME: <time_of_day>. WEATHER: <weather>.
ALSO IN FRAME: <prompt_tokens of shots[].props>.
STAGING: <shots[].action>.
CHANGED SINCE THE LAST SHOT: <each change in words, people as CHARACTER n>.   (omitted on the first shot of a story day; "nothing" when the shot changes nothing)
AVOID: <negative_tokens of held props and props in frame>, <every other value's words of each exclusive marker>.
```

The character comes first and the setting after, because text encoders weight early tokens most and reordering a description changes the face (research finding `accp-26`). An empty list prints nothing; `IN HAND: nothing` is always printed, so empty hands are stated. A character is labelled by position, never by name, so a pasted block carries no name; set `lead` to a form of your own to open each line differently. Someone changed off-screen is named.

`--json` prints the same shots as data (`characters[].in_hand` as ids, `avoid`, `changes`, `block`). `--out` writes built output and says so; edit the sheet, never the output. The whole gate runs first: nothing is compiled from a sheet the gate fails. Exit 0 on success, 1 on a named problem, 2 on usage.

## Left out on purpose

Shoot days and call times (these stories are drawn, the story day governs the picture); takes; page eighths; lens and camera height; eyeline angles in degrees. A field for any of these can be added to a shot as a note (`_camera`) without the gate caring. If a need for one of them is confirmed by the continuity-norms research (`research/corpus/prompts/continuity-norms-and-structures-prompt.md`), it enters the schema with a decision record.
