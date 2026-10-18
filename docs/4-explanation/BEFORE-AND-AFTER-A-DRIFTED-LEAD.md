---
title: Before and after: a drifted lead
doc_id: explain-before-and-after-a-drifted-lead
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/BEFORE-AND-AFTER-A-DRIFTED-LEAD.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# Before and after: a drifted lead

This page shows the engine on a real problem, with real pictures, and shows the work. The pictures are from the published story *Dating Red Flags* at rel8r.me. The method is the one in [How to resolve character drift after the fact](../2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md). The decision behind it is [ADR-004](decisions/ADR-004-retrospective-anchor-policy.md).

## What happened

Sam is the lead of the story. Her author wrote her as a mixed-race woman, one quarter Black on her father's side, with warm golden-brown skin and dark textured curls. The book has 99 pictures. Sam is in 85 of them.

She did not stay that woman. Most of the book shows a lighter woman with olive skin who reads as white. The first pictures of the book show the woman the author wrote, because the author redid them in October. The middle and the end of the book were drawn in September and never redone.

The cheapest way to make the book consistent is to make her white everywhere. That is what the numbers say if you only count pictures. It is the wrong answer. This page is about how the engine shows that it is wrong, and what the right answer costs.

## What you would have, if this were your story

You do not need what this run had. You need:

- A folder of pictures, one per scene, named so you can tell their order.
- Your scene list with the character's token in it (`{{sam-hayes}}`), so the engine knows which scenes show her.
- Your registry entry for her, with your own words for who she is under `canon_tags`.
- A browser chatbot that can look at a picture when you paste it, or just your own eyes.
- This repository: `scripts/anchor.mjs`, no API key, no model.

This run also had a face detector and a small local vision model on the author's own computer. They are optional. The next sections say what each one did, and what it did not do.

## Step 1: find her pictures

The scene file holds `{{sam-hayes}}` in the cast of 85 scenes. The engine lists those scenes; nobody reads 99 pictures to find her. This is the sheet, in reading order. The bar above each picture is the hand tag from step 3: brown for warm golden-brown skin, tan for light olive, pale for fair, grey where her face is not readable.

![Every picture that names Sam, in reading order](assets/before-after/sam-panels-in-reading-order.jpg)

Read the bars left to right. The first row is brown. Then the book goes tan and stays tan, with a few brown pictures where the author had already redone a scene.

## Step 2: put them in the order they were made

The policies care about order: `origin` keeps the first picture, `terminal` the last. Reading order is not generation order.

The original pictures were made in late September and the repository recorded them in one batch on 2026-09-30. The author then redid some scenes in October, and the repository holds the date of each. Nothing else dates the originals: the files were copied, so their file dates are copy dates, and the one true record is the chat history where they were made.

So the generation order used here is: every September original in reading order, then each October picture by its date. The file that holds the rows carries both numbers, the generation order and the place in the story. If you keep one habit from this page, keep this one: name every picture with its number the day you download it.

## Step 3: look at each face and write three words

Each picture was tagged by a person looking at her face. Three keys, same as the author's `canon_tags`, with a fixed vocabulary so the words can match:

| Key | Allowed values |
|---|---|
| `skin_tone` | fair, light olive, warm golden-brown, medium brown, dark brown |
| `heritage` | what the picture reads as: white, mixed-race, Black, Asian, other |
| `hair` | texture only: textured curls, wavy, straight, other |

Hair is texture, not colour, on purpose. At sixty Sam has silver in her curls. That is canon, not drift, so it must not count against her.

58 pictures show her face well enough to tag. 27 do not: she is seen from behind, or far away, or only her hands are in frame, or the picture is a photograph on a wall. Those are not judged. A picture that cannot be read is not evidence either way.

This is every readable face, in generation order, cropped from the published pictures. The bar is the tag.

![Sam's face in every readable picture, in the order they were made](assets/before-after/sam-faces-in-generation-order.jpg)

| Tag | Pictures |
|---|---|
| warm golden-brown, mixed-race, textured curls | 18 |
| light olive, white, textured curls | 39 |
| fair, white, textured curls | 1 |

Two tools helped and one did not:

- A face detector found every face in every picture and cut it out, so the person tagging looked at faces, not at whole pages. A chatbot can do the same if you ask it to crop the woman on the left.
- The same detector produced a number per face (a face embedding). The policies can use it. Its limit is in step 5.
- A small vision model on the author's computer was asked the same three questions about the same 58 crops. It agreed with the person on 3 of them. It read most faces lit by lamplight as dark brown and Black, and two pale faces at night as Asian with straight hair. Its answers are kept in the evidence files as a caution. The person's tags are the record. If you let a model tag your pictures, look at every answer.

## Step 4: write who she is

The engine never reads canon off the pictures. The author writes it, on the registry entry, in the same vocabulary as the tags:

```json
"sam-hayes": {
  "name": "Sam",
  "canon_tags": { "skin_tone": "warm golden-brown", "heritage": "mixed-race", "hair": "textured curls" },
  "drift_resolution": { "policy": "canon", "pass_threshold": 0.35, "max_regeneration_budget": 8,
                        "embeddings": "drift/sam-hayes/embeddings.jsonl" }
}
```

Three word pairs. They are the whole difference between "what most pictures look like" and "who she is".

## Step 5: run the policies and read the comparison line

One command per policy. Every run prints the same last line, the comparison, so the cheap answer is always visible next to the right one.

```bash
node scripts/anchor.mjs drift/sam-hayes/embeddings.jsonl --policy canon --character sam-hayes
node scripts/anchor.mjs drift/sam-hayes/tags.jsonl --policy canon --character sam-hayes
node scripts/anchor.mjs drift/sam-hayes/tags.jsonl --policy mode
```

The full output is in [anchor-report.txt](assets/before-after/anchor-report.txt). This is what it says, policy by policy:

| Policy | Which picture it keeps as the anchor | To redo, by tags | To redo, by face similarity |
|---|---|---|---|
| `origin` (the first picture made) | the conservation table, September, light olive | 19 | 10 |
| `terminal` (the last picture made) | the reservoir run, October, warm golden-brown | 40 | 19 |
| `consensus` (nearest the average face) | the sacred confession, September, light olive | not available | 7 |
| `mode` (the most common tags) | the sacred confession: 39 of 58 pictures share its tags | 19 | 7 |
| `canon` (only pictures matching the author's words) | the knight in the Nolita night, September, warm golden-brown | 40 | 9 |

Three things to read off that table.

**The cheapest policy ratifies the drift.** `mode` and `consensus` both keep the light-olive Sam and bill 19 pictures. Nineteen is the price of making the book agree with its mistake. The engine computes it because arithmetic is not a decision, and prints it beside the other numbers so nobody chooses it by accident.

**Canon costs 40 pictures.** That is the price of the drift, and it is the honest number. The anchor `canon` picked is one of the author's own September originals, not a redo: in that picture she was already the woman the author wrote, which is what "sometimes she looks mixed" meant in the author's notes.

**The face similarity column is not about who she is.** A face embedding is built to recognise the same face across lighting and shading, which is exactly what drifted here. Against the canon anchor, 49 of 58 faces score as "the same face", and only 9 fall below the threshold. By tags, 40 are off canon. Similarity catches a different face. Tags catch a different person. When the drift is skin tone or heritage, the bill that matters is the tag bill. Without any embeddings at all, hand tags alone give you every number in the "by tags" column.

## Step 6: record the anchor

```bash
node scripts/anchor.mjs drift/sam-hayes/embeddings.jsonl --policy canon --character sam-hayes --write
```

This writes `characters.sam-hayes.anchor` into the registry: which picture, its hash, the policy, the date and the numbers above. From now on every redo attaches that picture as the reference, and the choice is on the record.

## Step 7: redo the pictures, one at a time, with the author's go on each

Nothing here replaces a picture by itself. For each picture on the bill, a template builds one edit request: image 1 is the kept picture, image 2 is the anchor, the text says change only her face, skin and hair to match image 2 and keep everything else. The author looks at the result beside the old one and says keep or redo. One picture at a time, through the same browser chat the book was made in.

This is the first pair. The author had already redone this scene on the day after it was first made; the engine's job is to make that the rule for the other 39.

| Before (2026-10-15) | After (2026-10-16) |
|---|---|
| ![Sam before: the prosecutor's finger, lighter](assets/before-after/the-prosecutors-finger-before.jpg) | ![Sam after: the prosecutor's finger, warm golden-brown](assets/before-after/the-prosecutors-finger-after.jpg) |

The remaining pictures on the bill are redone as the author gives the go on each. Each new pair is added here with its scene name, so this page is the running record, not a promise.

## What this cost and what it would have cost

| | Pictures to redo | What the book says afterwards |
|---|---|---|
| Keep her white (`mode`) | 19 | the author's lead is a different person than the one written |
| Restore canon (`canon`) | 40 | she is who she is in every picture |

Twenty-one pictures is the whole difference. It is not small, and it is not the point. The point is that you see the two numbers before you spend anything, with the pictures behind each one.

## Do this for your own story

1. Write the character's token into every scene from the first day. The engine can then find her pictures.
2. Name every download with its number. Order is evidence you cannot get back.
3. Write `canon_tags` before the first picture, in three to five word pairs, with a fixed vocabulary.
4. When something looks off, make the face sheet and tag it by hand. A chatbot may suggest; you decide.
5. Run every policy and read the comparison line. The cheap number is there to be refused with your eyes open.
6. Record the anchor. Redo within the bill, one picture at a time, and keep the pairs.

## The files behind this page

- [`anchor-report.txt`](assets/before-after/anchor-report.txt): the engine's own output for the three runs above.
- The row files (`embeddings.jsonl`, `tags.jsonl`) and the face picks live in the story's private repository, because they hold the story's working files. Their shape is the one in [examples/anchor](../../examples/anchor/README.md): image, order, tags, hash, and for the embedding file one vector per face.
- The engine: [`scripts/anchor.mjs`](../../scripts/anchor.mjs). Field reference: [Registry fields](../3-reference/REGISTRY-FIELDS.md).
