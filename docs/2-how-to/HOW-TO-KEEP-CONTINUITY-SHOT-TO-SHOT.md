---
title: How to keep continuity from shot to shot
doc_id: how-to-keep-continuity-shot-to-shot
triadic_leg: diataxis
diataxis_mode: solve
canonical_path: docs/2-how-to/HOW-TO-KEEP-CONTINUITY-SHOT-TO-SHOT.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# How to keep continuity from shot to shot

Outcome: for every picture in your story you paste one block that says what each character wears, carries and has on them right now, where they are, what time it is, what changed since the last picture, and the look rules of the place the picture is for (a page, a sticker). You write each of those things once. The tool carries them forward and stops you when a coat vanishes, a prop jumps hands, a night scene mentions the sunset, or a prompt retypes a rule that lives on a surface. Field by field: [Continuity card and shot sheet fields](../3-reference/CONTINUITY-CARD-AND-SHOT-SHEET-FIELDS.md). Why it is built this way: [ADR-005](../4-explanation/decisions/ADR-005-continuity-card-and-shot-sheet.md).

This continues the [tutorial](../1-tutorials/START-HERE.md): you have `my-story/` with June, Abel and `scene-01.md`. All commands run inside `my-story`, with the scripts one folder up.

Two words first. A **continuity card** is one character's state at the start of one *story day* (a day inside the story, not a day of your work): what they wear, how their hair is, what they have on and with them. A **shot sheet** is the list of your scenes in order, each with its shots in order. A shot is one picture.

## 1. Clothes move out of the look

In the tutorial, June's `look` included her raincoat and boots. From now on clothes live on the card, because clothes change and the look does not. Edit `character-registry.json` so it reads exactly like this. The two looks lose their clothes, a prop joins the characters, and two `surfaces` tell the gate where the cards and the sheet are:

```json
{
  "registry_version": 1,
  "token_sources": [
    { "file": "scene-*.md", "why": "my scenes hold tokens, never a typed name" }
  ],
  "surfaces": [
    { "type": "continuity-cards", "file": "continuity/cards.json", "story": "the-lighthouse" },
    {
      "type": "shot-sheet",
      "file": "continuity/shot-sheet.json",
      "story": "the-lighthouse",
      "exclusive_markers": [
        {
          "field": "time_of_day",
          "values": { "dusk": ["dusk", "sunset", "orange sky"], "night": ["night", "dark", "stars", "moon"] },
          "fields": ["shots[].action", "shots[].characters[].action", "shots[].characters[].eyeline"]
        }
      ]
    }
  ],
  "coverage": {
    "ignore": ["built/**"]
  },
  "characters": {
    "june-okafor": {
      "name": "June",
      "full_name": "June Okafor",
      "kind": "person",
      "story": "the-lighthouse",
      "role": "Nine-year-old who wants to see the lamp lit",
      "prose_only": true,
      "forms": {
        "look": "a nine-year-old girl with dark brown skin and black curls tied in two puffs"
      },
      "canon_tags": { "skin": "dark brown", "hair": "two puffs", "coat": "yellow" }
    },
    "abel-marsh": {
      "name": "Abel",
      "full_name": "Abel Marsh",
      "kind": "person",
      "story": "the-lighthouse",
      "role": "The last keeper of the lighthouse",
      "prose_only": true,
      "forms": {
        "look": "a tall old man with light brown skin and a short white beard"
      },
      "canon_tags": { "skin": "light brown", "beard": "white", "sweater": "navy" }
    },
    "the-matchbox": {
      "name": "the matchbox",
      "kind": "prop",
      "story": "the-lighthouse",
      "role": "The matches that light the lamp",
      "prompt_tokens": "a dented tin matchbox with a faded blue label",
      "negative_tokens": ["lighter", "cardboard matchbox"]
    }
  }
}
```

| Part | Meaning |
|---|---|
| `the-matchbox` | A *prop*: an object the story tracks. `prompt_tokens` is how the picture should show it, written once. `negative_tokens` is what the picture must not turn it into. Scenes, cards and shots refer to it by its id, never by its name. |
| `surfaces` | The two files the gate reads and the compiler compiles. `story` ties them to your characters. |
| `exclusive_markers` | The words each time of day owns. A night shot that says *sunset* will fail, and every time you compile a night shot, the dusk words go on its AVOID line. Write your own words; the tool ships none. |

## 2. Write the cards

Create `my-story/continuity/cards.json`:

```json
{
  "story_days": {
    "day-1": { "label": "The night the lamp is lit", "weather": "clear, a cold wind off the sea" }
  },
  "cards": {
    "june-okafor": {
      "day-1": {
        "wardrobe": { "outer": "yellow raincoat", "top": "striped jersey", "bottom": "blue dungarees", "shoes": "red boots" },
        "hair": "two puffs, a little loose on the left",
        "accessories": [],
        "marks": [],
        "carries": []
      }
    },
    "abel-marsh": {
      "day-1": {
        "wardrobe": { "outer": "none", "top": "navy wool sweater", "bottom": "grey trousers", "shoes": "black rubber boots" },
        "hair": "white, cut short",
        "accessories": ["flat grey cap"],
        "marks": ["soot on the right thumb"],
        "carries": ["the-matchbox"]
      }
    }
  }
}
```

| Field | What to write |
|---|---|
| `story_days` | One entry per day in the story, with a label you will recognise. `weather` is optional and applies to every scene of that day. |
| `wardrobe` | Four layers: `outer`, `top`, `bottom`, `shoes`. Write `"none"` for a layer that is empty, or leave it out. If layers feel like too much, write one line instead: `"wardrobe": "yellow raincoat, blue dungarees, red boots"`. |
| `hair` | How the hair is worn today. Hair colour and texture belong in the look; the card says *pinned up*, *loose*, *under a cap*. |
| `accessories` | Worn things: a cap, glasses, a pendant, a watch on the left wrist. |
| `marks` | Anything on the body that must stay until it is said to go: a cut, dirt, wet clothes, soot on a thumb. |
| `carries` | The ids of props the character has with them today, in hand, pocket or bag. |

Only `wardrobe` is required. Leave a list empty (`[]`) when there is nothing to say; the block then says nothing for it.

## 3. Write the shot sheet

Create `my-story/continuity/shot-sheet.json`. Two scenes: the ladder at dusk, the lamp at night.

```json
{
  "locations": {
    "lamp-room": { "look": "inside the top of a lighthouse, a big brass lamp in the middle, a wooden ladder against it" },
    "gallery": { "look": "the narrow iron walkway outside the top of the lighthouse, a railing, the sea far below" }
  },
  "scenes": {
    "scene-01": {
      "story_day": "day-1",
      "time_of_day": "dusk",
      "location": "lamp-room",
      "shots": [
        {
          "id": "1a",
          "size": "wide",
          "characters": [
            { "who": "{{june-okafor}}", "action": "holds the bottom of the ladder with both hands", "eyeline": "up at the lamp", "position": "left, at the foot of the ladder" },
            { "who": "{{abel-marsh}}", "action": "halfway up the ladder, reaching for the lamp", "eyeline": "at the lamp", "position": "centre, on the ladder" }
          ]
        },
        {
          "id": "1b",
          "size": "close-up",
          "changes": [
            { "who": "{{abel-marsh}}", "accessories": { "remove": ["flat grey cap"] }, "reason": "the brim hides the wick; he hooks the cap on a nail" }
          ],
          "characters": [
            { "who": "{{abel-marsh}}", "action": "peers into the lamp, one hand on the glass", "eyeline": "into the lamp" }
          ]
        }
      ]
    },
    "scene-02": {
      "story_day": "day-1",
      "time_of_day": "night",
      "location": "gallery",
      "shots": [
        {
          "id": "2a",
          "size": "two-shot",
          "changes": [
            { "who": "{{abel-marsh}}", "hands": "the-matchbox", "to": "{{june-okafor}}", "reason": "his hands shake in the cold; she asked to do it" }
          ],
          "characters": [
            { "who": "{{abel-marsh}}", "action": "leans on the railing, watching her", "eyeline": "down at her hands", "position": "right" },
            { "who": "{{june-okafor}}", "action": "cups {{the-matchbox}} against the wind", "eyeline": "at {{the-matchbox}}", "position": "left", "holding": ["the-matchbox"] }
          ]
        },
        {
          "id": "2b",
          "size": "close-up",
          "characters": [
            { "who": "{{june-okafor}}", "action": "strikes the match, face lit from below", "eyeline": "at the flame", "holding": ["the-matchbox"] }
          ]
        }
      ]
    }
  }
}
```

How to read it:

- **`locations`**: each place written once. A scene names it; the block prints the look.
- **A scene header** says `story_day`, `location` and `time_of_day`. These are decisions: a new scene says where and when. Nothing else is written on the header unless it changes (`weather`).
- **A shot** has an `id`, a `size` in the usual words (wide, medium, close-up, two-shot) and its `characters` in the order you want them listed. Each person gets their own `action`, `eyeline` and `position`, and `holding` lists the prop ids visibly in their hand.
- **`changes`** are the only place state changes. Abel takes his cap off in 1b; he hands the matchbox to June in 2a. Each change says `who` and `reason`. Without a reason the gate stops you, because a change is a decision and everything else carries forward on its own.
- **June never gets the matchbox on her card.** She gets it in 2a because Abel hands it over. From that shot on she may hold it and he may not.
- **The matchbox is a token in June's action**, `{{the-matchbox}}`, the same way a person is. Typing *the matchbox* fails the gate, because the name lives once, in the registry.
- Nothing is written twice. Scene 2 never repeats June's raincoat or Abel's missing cap; both carry forward from scene 1, because both scenes are on `day-1`.

## 4. Run the gate

```bash
node ../scripts/check.mjs
```

```text
character registry: pass (3 entries, 15 labels resolved on 2 surfaces, 3 token sources, 1 files scanned)
```

Fifteen labels: every character, prop and hand-over on the cards and the sheet resolved to an entry of your registry.

## 5. Compile a scene and paste a shot

```bash
node ../scripts/compile-shot.mjs scene-01
```

```text
=== scene-01 · shot 1a (wide) · day-1: The night the lamp is lit ===
CHARACTER 1: a nine-year-old girl with dark brown skin and black curls tied in two puffs. WEARING: yellow raincoat over striped jersey, blue dungarees, red boots. HAIR: two puffs, a little loose on the left. IN HAND: nothing. ACTION: holds the bottom of the ladder with both hands. EYELINE: up at the lamp. POSITION: left, at the foot of the ladder.
CHARACTER 2: a tall old man with light brown skin and a short white beard. WEARING: navy wool sweater, grey trousers, black rubber boots. HAIR: white, cut short. ACCESSORIES: flat grey cap. MARKS: soot on the right thumb. IN HAND: nothing. ACTION: halfway up the ladder, reaching for the lamp. EYELINE: at the lamp. POSITION: centre, on the ladder.
SHOT: wide. SETTING: inside the top of a lighthouse, a big brass lamp in the middle, a wooden ladder against it. TIME: dusk. WEATHER: clear, a cold wind off the sea.
AVOID: night, dark, stars, moon.

=== scene-01 · shot 1b (close-up) · day-1: The night the lamp is lit ===
CHARACTER 1: a tall old man with light brown skin and a short white beard. WEARING: navy wool sweater, grey trousers, black rubber boots. HAIR: white, cut short. MARKS: soot on the right thumb. IN HAND: nothing. ACTION: peers into the lamp, one hand on the glass. EYELINE: into the lamp.
SHOT: close-up. SETTING: inside the top of a lighthouse, a big brass lamp in the middle, a wooden ladder against it. TIME: dusk. WEATHER: clear, a cold wind off the sea.
CHANGED SINCE THE LAST SHOT: CHARACTER 1 has taken off the flat grey cap.
AVOID: night, dark, stars, moon.
```

Read one block:

- The first line is for you: which scene, which shot, which day. Pasting it does no harm.
- Each person is `CHARACTER 1`, `CHARACTER 2` in the order you listed them, and never a name: an image model does not know your characters by name. The line opens with the look from the registry, then everything the card and the changes say about today, then what they do in this shot.
- The setting comes after the characters, on purpose: image models pay most attention to the start of a prompt, so the people go first.
- `CHANGED SINCE THE LAST SHOT` says what to alter and nothing else. The first shot of a day has no such line; a shot that changes nothing says `nothing`, which tells a chatbot with a memory to keep everything.
- `AVOID` collects the other time's words (and, when a prop is in frame, its `negative_tokens`).

Now scene 2:

```bash
node ../scripts/compile-shot.mjs scene-02
```

```text
=== scene-02 · shot 2a (two-shot) · day-1: The night the lamp is lit ===
CHARACTER 1: a tall old man with light brown skin and a short white beard. WEARING: navy wool sweater, grey trousers, black rubber boots. HAIR: white, cut short. MARKS: soot on the right thumb. IN HAND: nothing. ACTION: leans on the railing, watching her. EYELINE: down at her hands. POSITION: right.
CHARACTER 2: a nine-year-old girl with dark brown skin and black curls tied in two puffs. WEARING: yellow raincoat over striped jersey, blue dungarees, red boots. HAIR: two puffs, a little loose on the left. IN HAND: a dented tin matchbox with a faded blue label. ACTION: cups the matchbox against the wind. EYELINE: at the matchbox. POSITION: left.
SHOT: two-shot. SETTING: the narrow iron walkway outside the top of the lighthouse, a railing, the sea far below. TIME: night. WEATHER: clear, a cold wind off the sea.
CHANGED SINCE THE LAST SHOT: CHARACTER 1 hands a dented tin matchbox with a faded blue label to CHARACTER 2.
AVOID: lighter, cardboard matchbox, dusk, sunset, orange sky.

=== scene-02 · shot 2b (close-up) · day-1: The night the lamp is lit ===
CHARACTER 1: a nine-year-old girl with dark brown skin and black curls tied in two puffs. WEARING: yellow raincoat over striped jersey, blue dungarees, red boots. HAIR: two puffs, a little loose on the left. IN HAND: a dented tin matchbox with a faded blue label. ACTION: strikes the match, face lit from below. EYELINE: at the flame.
SHOT: close-up. SETTING: the narrow iron walkway outside the top of the lighthouse, a railing, the sea far below. TIME: night. WEATHER: clear, a cold wind off the sea.
CHANGED SINCE THE LAST SHOT: nothing.
AVOID: lighter, cardboard matchbox, dusk, sunset, orange sky.
```

Abel's cap is still off, with no word from you. The matchbox is in June's hand and the block describes it from the registry, not from the sheet. In 2b June is `CHARACTER 1` because she is the only person in the shot.

To paste: copy one block into your chatbot with a line in front, as in the tutorial: *Make this picture:*. If the chatbot lets you attach the anchor picture, attach it and add *Keep the characters exactly as in the attached picture.* Save the result as `renders/scene-02-01.png` and carry on with the tagging loop from the tutorial.

## 6. What carries, and what you decide

| Carried forward by itself | You write, with a reason |
|---|---|
| wardrobe, hair, accessories, marks, what each person carries: from shot to shot and from scene to scene within a story day | any change to those, as a `changes` entry |
| the scene's day, place, time and weather, to every shot in it | the scene header: a new scene says where and when |
| nothing across a day boundary: a new story day starts from that day's cards | the next day's card, including a mark that is still there |

## 7. Let it catch something

Each of these is one edit. Make it, run `node ../scripts/check.mjs`, read the message, put it back.

Delete the `reason` from the change in shot 2a:

```text
continuity/shot-sheet.json: scene-02: shot 2a: changes[0]: the change for Abel has no reason. Fix: add "reason": why it changes in this shot. A change is a decision; everything else carries forward on its own
character registry: fail (1 problem(s))
```

Change June's action in 2b to *strikes the match against the last of the sunset*:

```text
continuity/shot-sheet.json: scene-02: says "sunset" (time_of_day dusk) but time_of_day is "night". Fix: change time_of_day or the text
character registry: fail (1 problem(s))
```

Give June `"holding": ["the-matchbox"]` in shot 1a, before Abel hands it over:

```text
continuity/shot-sheet.json: scene-01: shot 1a: June holds "the-matchbox", which the card for day-1 does not give June and no earlier change handed over. Fix: add "the-matchbox" to cards.june-okafor.day-1.carries in continuity/cards.json, or add a change { "who": "{{<id>}}", "hands": "the-matchbox", "to": "{{june-okafor}}", "reason": "..." } in an earlier shot
character registry: fail (1 problem(s))
```

Type *the matchbox* instead of the token in June's action in 2a:

```text
continuity/shot-sheet.json: scenes.scene-02.shots[0].characters[1].action: names "the matchbox" in a token source. Fix: write {{the-matchbox}}
character registry: fail (1 problem(s))
```

The compiler runs the same gate first and refuses to build a block from a sheet that fails it, so you cannot paste a contradiction by accident.

## 8. Save a block to paste from

```bash
node ../scripts/compile-shot.mjs scene-02 --shot 2b --out built/scene-02-2b.txt
```

```text
compile-shot: scene-02 shot 2b -> built/scene-02-2b.txt (1 shot(s); built output, do not edit)
```

Files under `built/` are output. Change the card or the sheet and compile again; never edit the output. `--json` prints the same shot as data for a script of your own.

## 9. The next story day

Add `"day-2"` to `story_days` and a `day-2` card for each character who appears. The new day starts from those cards: Abel's soot is gone unless his day-2 card lists it. If it should still be there and you forget, the gate says so without stopping you:

```text
gap: continuity/cards.json: cards.abel-marsh.day-2: Abel ended day-1 with marks [soot on the right thumb] that this card does not list. If they healed or washed off overnight, say so in _notes; if not, list them
```

Any key starting with `_` is a note for you (`"_notes": "he washed before bed"`); the tool never reads it.

## 11. Where will this picture be used?

A page of the book, a sticker for the back cover, a poster: each place has its own look rules. Write them once, in the registry, as *render surfaces*. Every shot says which surface it is for, and its block ends with a **KEEP** line and a longer **AVOID** line built from that surface. Nothing is retyped anywhere else: a scene prompt or a template that copies one of those rules fails the gate, because a copied rule goes stale the day you change the surface.

Add two keys to `character-registry.json`, after `coverage`:

```json
  "render_surfaces": {
    "page": {
      "name": "Picture-book page",
      "style_lock": "children's picture-book illustration, soft watercolor",
      "must_keep": ["the characters exactly as in the anchor pictures"],
      "exclude": ["modern clothes", "extra people", "speech bubbles"],
      "size": "landscape, wider than tall",
      "no_text": true,
      "hands_rule": "every hand shows five fingers",
      "why": "a page of the book: the words are printed later, never drawn"
    },
    "sticker": {
      "name": "Sticker",
      "style_lock": "flat vector sticker, thick white border, plain white background",
      "must_keep": ["the prop alone, large and centred"],
      "exclude": ["people", "scenery", "shadows"],
      "size": "square",
      "no_text": true,
      "hands_rule": "no hands",
      "why": "a sticker of the matchbox for the back cover; the page's look does not apply",
      "continuity": false
    }
  },
  "render_templates": ["templates/**"],
```

| Field | What to write |
|---|---|
| `name` | What you call this kind of picture. It labels the KEEP line. |
| `style_lock` | The style that must hold on this surface. Joins KEEP. |
| `must_keep` | Lines every picture on this surface must keep. Join KEEP. |
| `exclude` | Things that may not appear here. Join AVOID. |
| `size` | The shape, in words. Printed next to the name. |
| `no_text` | `true` adds the word *text* to AVOID. Your own sentence about lettering goes into KEEP as written. |
| `hands_rule` | Your rule for hands. Joins KEEP. |
| `why` | For you. Never printed. |
| `continuity` | `false` for a surface with no story continuity: a sticker, a cover, a shop card. Its scenes need no day, place or time, and their blocks have no CHANGED line. |
| `render_templates` | Where your prompt templates live. None may retype a surface rule. |

Every word of every rule is yours. The tool ships none.

Create `my-story/templates/redo.md`, a template you will paste from when a picture has to be made again. It holds no rules; it points at the block:

```markdown
# Redo prompt

Make this picture again. Keep the characters exactly as in the attached picture.

<paste the block from: node ../scripts/compile-shot.mjs <scene> --shot <id>>

Change only: <what was wrong last time>
```

In `continuity/shot-sheet.json`, give each scene header a first line `"surface": "page",` and add a third scene for the sticker, with no story day, no place, no time and nobody in it:

```json
    "sticker-matchbox": {
      "surface": "sticker",
      "shots": [
        { "id": "s1", "props": ["the-matchbox"], "action": "{{the-matchbox}} alone, lid half open" }
      ]
    }
```

Now run the gate:

```bash
node ../scripts/check.mjs
```

```text
scene-01.md: line 11: retypes the render surface phrase "children's picture-book illustration, soft watercolor" (render_surfaces.page.style_lock). Fix: read it from the surface: node scripts/compile-shot.mjs prints KEEP and AVOID from render_surfaces.page, and a builder reads that entry from the registry
scene-01.md: line 16: retypes the render surface phrase "modern clothes" (render_surfaces.page.exclude). Fix: read it from the surface: node scripts/compile-shot.mjs prints KEEP and AVOID from render_surfaces.page, and a builder reads that entry from the registry
scene-01.md: line 16: retypes the render surface phrase "extra people" (render_surfaces.page.exclude). Fix: read it from the surface: node scripts/compile-shot.mjs prints KEEP and AVOID from render_surfaces.page, and a builder reads that entry from the registry
character registry: fail (3 problem(s))
```

It found the rules you typed into the tutorial's picture prompt: the style on line 11 and the avoid list on line 16. They live on the surface now, and the picture prompt may not carry a second copy. In `scene-01.md`, cut the style words off the front of line 11 and delete the *Avoid* line, so the picture prompt reads:

```markdown
## Picture prompt

Warm dusk light. Inside the top of a lighthouse, a big brass lamp in the middle. Two characters:

- {{june-okafor:look}}, holding the bottom of a wooden ladder, looking up.
- {{abel-marsh:look}}, halfway up the ladder, reaching for the lamp.
```

```bash
node ../scripts/check.mjs
```

```text
character registry: pass (3 entries, 16 labels resolved on 2 surfaces, 3 token sources, 2 files scanned, 2 render surface(s), 1 template(s))
```

Compile the shot you pasted before. Two lines have joined it:

```bash
node ../scripts/compile-shot.mjs scene-02 --shot 2b
```

```text
=== scene-02 · shot 2b (close-up) · day-1: The night the lamp is lit ===
CHARACTER 1: a nine-year-old girl with dark brown skin and black curls tied in two puffs. WEARING: yellow raincoat over striped jersey, blue dungarees, red boots. HAIR: two puffs, a little loose on the left. IN HAND: a dented tin matchbox with a faded blue label. ACTION: strikes the match, face lit from below. EYELINE: at the flame.
SHOT: close-up. SETTING: the narrow iron walkway outside the top of the lighthouse, a railing, the sea far below. TIME: night. WEATHER: clear, a cold wind off the sea.
CHANGED SINCE THE LAST SHOT: nothing.
KEEP (Picture-book page, landscape, wider than tall): children's picture-book illustration, soft watercolor; the characters exactly as in the anchor pictures; every hand shows five fingers.
AVOID: lighter, cardboard matchbox, dusk, sunset, orange sky, modern clothes, extra people, speech bubbles, text.
```

KEEP is the page surface's `style_lock`, `must_keep` and `hands_rule`, in your words, labelled with its name and size. AVOID now ends with its `exclude` list and the word *text*. The same matchbox on the sticker:

```bash
node ../scripts/compile-shot.mjs sticker-matchbox
```

```text
=== sticker-matchbox · shot s1 ===
ALSO IN FRAME: a dented tin matchbox with a faded blue label.
STAGING: the matchbox alone, lid half open.
KEEP (Sticker, square): flat vector sticker, thick white border, plain white background; the prop alone, large and centred; no hands.
AVOID: lighter, cardboard matchbox, people, scenery, shadows, text.
```

Same prop, from the same registry entry, two different pictures: the sticker's KEEP and AVOID come from the sticker surface, and because that surface says `"continuity": false` there is no story day, no setting, no time and no CHANGED line.

Let the gate catch a copied rule. Add a line to `templates/redo.md` that says *Always: every hand shows five fingers.* and run the gate:

```text
templates/redo.md: line 9: retypes the render surface phrase "every hand shows five fingers" (render_surfaces.page.hands_rule). Fix: read it from the surface: node scripts/compile-shot.mjs prints KEEP and AVOID from render_surfaces.page, and a builder reads that entry from the registry
character registry: fail (1 problem(s))
```

Take the line out. Then delete `"surface": "page"` from the `scene-02` header:

```text
continuity/shot-sheet.json: scene-02: shot 2a: has no surface: where will this picture be used? Fix: set "surface" on the shot or on the scene header, one of page, sticker
continuity/shot-sheet.json: scene-02: shot 2b: has no surface: where will this picture be used? Fix: set "surface" on the shot or on the scene header, one of page, sticker
character registry: fail (2 problem(s))
```

Put it back. Once any surface is declared, every shot says where it will be used.

A rule is a phrase of two or more words. A single word in an `exclude` list (*people*, *shadows*) goes on the AVOID line but is not hunted in your prose, so a scene may still say that someone stands in the shadows.

## 12. Messages you will see

| Message | Meaning | Do |
|---|---|---|
| `... is in this shot but has no continuity card for day-1` | a person appears on a day you gave them no card for | add `cards.<id>.<day>` with at least `wardrobe` |
| `... missing wardrobe` | a card without the one required field | write it, even as one line |
| `... the change for Abel has no reason` | a change without `reason` | say why |
| `... holds "the-matchbox", which the card for day-1 does not give ...` | a prop in a hand that never received it | put it on the card, or hand it over in an earlier shot |
| `... says "sunset" (time_of_day dusk) but time_of_day is "night"` | the text contradicts the header | fix one of them |
| `... missing time_of_day` | a scene header without day, place or time | fill the header |
| `... location "garage" is not a key of locations (...)` | a place you did not write under `locations` | add it with its look |
| `names "the matchbox" in a token source. Fix: write {{the-matchbox}}` | a name typed where a token belongs | write the token |
| `no scene "scene-03" in continuity/shot-sheet.json. Scenes: ...` | you asked to compile a scene the sheet does not have | check the spelling, or add it |
| `compile-shot: the gate fails (N problem(s)); nothing is compiled ...` | the sheet or the cards have a problem the lines above name | fix them, compile again |
| `gap: ... ended day-1 with marks [...] that this card does not list` | a mark vanished between days without a word | list it on the new card, or note why it is gone |
| `... shot 2a: has no surface: where will this picture be used?` | surfaces are declared and this shot names none | add `"surface"` to the shot or its scene header |
| `... surface "poster" is not in render_surfaces (page, sticker)` | a surface you did not declare | add it to `render_surfaces`, or fix the spelling |
| `... retypes the render surface phrase "..." (render_surfaces.page.hands_rule)` | a prompt or template copied a rule that lives on a surface | delete the copy; the block carries the rule |
| `render_templates "templates/**" matches no tracked file` | the registry names a templates folder that does not exist yet | create the template, or remove the entry |

## Where to go next

- Every field of both files, the render surfaces and every check: [Continuity card and shot sheet fields](../3-reference/CONTINUITY-CARD-AND-SHOT-SHEET-FIELDS.md).
- The reasoning, the research it rests on, and what the continuity-norms research still has to confirm: [ADR-005](../4-explanation/decisions/ADR-005-continuity-card-and-shot-sheet.md).
- The example story in this repository (three people, two props, three scenes): `examples/continuity/`, compiled with `node scripts/compile-shot.mjs 14-read-at-1152` from the repository root.
