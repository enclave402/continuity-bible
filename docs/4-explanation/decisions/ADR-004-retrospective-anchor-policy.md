---
title: ADR-004 Retrospective anchor policy for drifted characters
doc_id: adr-004-retrospective-anchor-policy
triadic_leg: diataxis
diataxis_mode: understand
canonical_path: docs/4-explanation/decisions/ADR-004-retrospective-anchor-policy.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# ADR-004: a policy engine picks and records a visual anchor after drift, over embeddings from any encoder

**Status:** accepted, 2026-10-17.
**Deciders:** the owner's note on fixing character drift proposed an engine feature (anchor policies origin, terminal and consensus; a configuration block; a CLI flag) and asked for it to be built; the research report's drift-gate and SOP sections supplied the measurements it should expose; the agent built it dependency-free.

## Context

Tools for character consistency prevent drift going forward: adapters that need a pristine reference from the first generation, trained weights that bake a muddy average out of an uncurated folder, frame-chaining made for video. Few answer the question a creator actually has halfway through a project: the character has already mutated, which image should become the anchor so that the least work is thrown away?

The research report carded in this repository (ask for "drift gates") describes production gates that score every output against an anchor by cosine similarity on a face embedding, by patch similarity on a self-supervised vision transformer, and by a vision-language judge; and a procedure that casts one master and conditions everything later on it. Those gates assume an anchor exists. This decision supplies it retrospectively.

## Decision

1. `scripts/anchor.mjs` takes one row per image (path, order, embedding, optional tags) from whatever encoder the user trusts, normalises the vectors, and chooses under a stated policy: `origin` (first), `terminal` (last), `consensus` (nearest the centroid, after optional z-score outlier pruning), `mode` (most frequent tag combination, nearest its own centroid), `canon` (only images matching the entry's owner-written `canon_tags`, nearest their centroid). Pure functions (`chooseAnchor`, `comparePolicies`) are exported and tested. `canon` was added the same evening the owner described a lead who began mixed-race and darker-skinned and drifted lighter over the book. The owner's own choice for that case is the least-regeneration state (`consensus`, cross-checked by `mode`): the goal there is consistency throughout, not a particular endpoint. `canon` exists for the user whose drift is a defect that must be undone. The engine prints every policy's regeneration bill and never chooses for the person.
2. The report always includes the regeneration list (images below a cosine threshold against the chosen anchor) and a one-line comparison of all four policies, so the cheapest choice is visible and a budget can be checked against it.
3. The registry declares the defaults (`drift_resolution`: policy, metric, threshold, pruning, budget, default embeddings file) at the top level with per-entry overrides, and `--write` records the choice under `characters.<id>.anchor` (image, hash, policy, metric, order, time, source file, stats). Vectors never enter the registry.
4. Embedding production stays outside the engine: the how-to names the encoder families and their licence caveats; the repository ships a synthetic example set, never model weights or a dependency on one.

## Consequences

- The feature is honest about what it is: selection and bookkeeping over the user's own measurements. No accuracy claim is made for any encoder, and no face-recognition weights with restrictive licences are bundled.
- Once an anchor is recorded, the registry is the single place a prompt compiler, an adapter slot or a QA gate looks for the reference image, which is the same discipline the registry applies to names.
- The design matches the research's recommendation that gates compare against one declared reference, and extends it backward to projects that started without one.
- Tag-based `mode` and `canon` depend on a classifier or hand tags the user supplies; without tags the policy says so instead of guessing. With tags alone, a person with a browser chatbot and no API can still run `origin`, `terminal`, `mode` and `canon`.
- `canon_tags` are written by the owner. The engine never infers canon from the drifted images, because the majority of the images is exactly what is in question.

## Amendment, 2026-10-17: the bill is by tags when there are no embeddings

**Context.** The layperson proof case (`PRODUCT.md`) drives the image model from a browser chatbot, so the user has hand-written tags and no embeddings. Until this amendment the report in that case named the anchor and printed no regeneration list, and the how-to told the reader to read the list off the tags file.

**Decision.** When no similarity score can be computed (the anchor row has no embedding), `chooseAnchor` bills by tags. `canon` lists every image that does not match `canon_tags`. `mode`, `origin` and `terminal` list every image whose tags differ from the anchor's, an untagged image included, because nothing shows it matches. `consensus` stays unavailable. `stats.bill_basis` records `"cosine"`, `"tags"` or `"none"` (no embeddings and no tags on the anchor); `stats.tag_mismatches` carries the count; `stats.below_threshold` stays `null`, so a tag count is never read as a similarity count. The CLI says "bill by tags, not by similarity", the comparison line says "to redo, by tags", and the budget applies to either bill. Tag comparison is exact and case-insensitive, the same rule `canon` already used.

**Consequences.** With hand tags alone the report now gives the whole decision: the anchor, the bill, the comparison and the budget. Only the measurement of how far each image drifted is left to a model. A tag bill is only as good as the tagging, so the hand-tag conventions in the browser-chatbot how-to (same keys as `canon_tags`, canon values copied from the registry, `unclear` when unsure) carry more weight. On the synthetic example set with its embeddings removed, the tag bill reproduces the cosine bill exactly (origin 8, terminal 10, mode 4, canon 8), which is what a clean tagging should do.

## Amendment, 2026-10-17 (later): two questions replace five policy names

**Context.** Five policy names (origin, terminal, consensus, mode, canon) are the engine's vocabulary, not a layperson's. The owner's ask: give people the drift-resolution options in the simplest, easiest way possible. Decided with the owner the same evening, on the owner's own case: the lead is one quarter Black (a story fact), her eye colour is fixed (amber-brown), and skin tone and hair follow the fewest-redraws pick.

**Decision.** Two questions decide an anchor. (1) *What about this character must never change?* Zero or more tag=value pairs, answered by default from the entry's `canon_tags` (documented from now on as fixed traits) or by `--keep tag=value` (repeatable; `--canon` stays as its alias). Only images carrying every kept tag are eligible; images without them are always on the redraw list. (2) *For everything else, which look do you want?* `--prefer fewest-redraws` (default: `consensus` among the eligible images, falling back to the most frequent tag combination when there are no embeddings), `first-look` (`origin`), `last-look` (`terminal`), `most-common` (`mode`). `keep` composes with every policy: filter first, then apply the policy to the eligible set; `canon` becomes keep + consensus and stays as an alias. `--ask` asks both questions on the terminal in plain words, prints the answer in plain words ("Keep renders/ch01-p02.png as the one true picture of this character. Redraw 8 pictures: ...") with the price of each other answer, and offers to record. `drift_resolution` accepts `prefer` with the plain names as well as `policy`; the recorded anchor carries `prefer` and `keep`. `comparePolicies` applies the kept tags to every policy so the comparison is within what the person keeps.

**Consequences.** A layperson never meets a policy name; the tutorial and the browser-chatbot how-to speak in the two questions and keep a short under-the-hood table for developers. Fewest redraws is the stated default, in line with the owner's own case and with the first amendment's rule that the engine shows every price and never chooses. A story fact is declared once, in the registry, and every answer respects it; the old "canon beats cheapest" framing is retired. Existing tests on the policy names pass unchanged, because the names remain as the developer spelling.

## Amendment, 2026-10-18: a trait the person could not read is not drift, and its word is `unknown`

**Context.** The first amendment above tells the person to write `unclear` for a trait they cannot judge and says that picture "will never match a fixed trait". The engine has since taken a better rule: a picture on which a kept trait could not be read (eyes closed, face turned away) is not drift. Re-testing the browser-chatbot how-to against the engine showed the two disagreeing: `unclear` was billed as drift and sent the reader to redraw a picture that was only hard to see.

**Decision.** The word for "I could not tell" is `unknown`. The registry's `drift_resolution.unreadable` (or `--unreadable a,b`) replaces it with the person's own words. A picture tagged that way on a kept trait is not eligible as the anchor and is not billed for that trait; it still goes on the redraw list if something that could be seen has drifted. Any other word, `unclear` included, is read as what the person saw, and a kept trait that does not match is billed. The first amendment's `unclear` is superseded; the browser-chatbot how-to and the drift how-to say `unknown`.

**Consequences.** The report says how many pictures it left out of the choice for that reason, so the exemption is visible and not silent. A person who leaves a tag out altogether is still billed, because a missing tag is not the same as "I looked and could not tell".

## Amendment, 2026-10-18 (later): how `--ask` reads what a person types

**Context.** An eighth-grade dry run (a fresh agent playing a 13-year-old, plus scripted beginner mistakes) found that `--ask` silently misread natural answers: `hair: two puffs` with a colon and plain words were dropped, and the registry's own fixed traits went with them; `Skin=Dark Brown` made every picture fail the trait, telling the person to redraw everything; `the first look` fell back to the default; typing one trait silently replaced the registry's list. Nothing said so.

**Decision.** Question 1 reads `trait=value` and `trait: value`, separated by commas, semicolons, new lines, or " and " when another trait follows. Trait names are compared case-insensitively everywhere, as values already were. A piece that is not a trait is said back to the person and the question is asked again. A typed answer is the whole list; when it leaves out a trait the registry had, the tool says that trait is not kept this time. Question 2 reads a number or the words (`fewest`, `first`, `last`); anything else is asked again. After each answer the tool says back what it will use. When the input ends, the defaults are used and said. The record question has its own line and the same `>` prompt. `--keep` reads the same forms as question 1.

A second dry run on the fixed branch found two more silent dead ends, decided the same way. A typed trait or value that no picture's tags have (`hiar=two puffs`, `hair=two puff`) is usually a typo: the tool says what the tags have and asks again, and an answer typed the same way twice is kept, because the pictures may truly all have drifted. When nothing keeps the fixed traits, the message says what the tags contain (`Your tags say: skin=brown (4 pictures)`) instead of only telling the person to redraw. A `--character` the registry does not have stops with the id it was probably meant to be, instead of running without the character's fixed traits. When the anchor's picture is not on disk, the record question says so before the person answers. Hand-written tags files were the likeliest place to quit, so `scripts/tag.mjs` writes them from questions about each picture; it writes a fixed trait's value the registry's way and says when what was seen differs, but it never fills in a value the person did not type.

A third dry run added three rules. When the character already has a recorded anchor, its `keep` is question 1's default, ahead of `canon_tags`, so asking again keeps what was decided; and the record question says when a yes would replace the recorded picture. When the kept traits are absent from the tags altogether, the tags file is probably another character's, and the tool says that instead of telling the person to redraw. Two spellings of one look in the tags (`loose curl`, `loose curls`) are pointed out, because they are counted as two looks. `tag.mjs` shows what Enter would repeat, asks once more after a note so a correction lands on the same trait, and warns when pictures still carry their download names, whose order may be wrong.

**Consequences.** Nothing a person types is guessed at or dropped without a word. `parseKeep` keeps its signature for `sheet.mjs` and `--keep`; `readKeep` and `readLook` are exported and tested.
