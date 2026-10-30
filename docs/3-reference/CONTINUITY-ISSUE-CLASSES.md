---
title: Continuity issue classes
doc_id: ref-continuity-issue-classes
triadic_leg: diataxis
diataxis_mode: lookup
canonical_path: docs/3-reference/CONTINUITY-ISSUE-CLASSES.md
status: active
last_reviewed: 2026-10-17
canonical: true
---

# Continuity issue classes

Eight ways a character-and-continuity system goes silent, found in production use of this registry on 2026-10-17 and generalised here so any project can check itself. Each class names the symptom, why it happens, the mechanism in this repository that answers it, and how to adopt it. The mechanisms are declared in the registry; none hardcodes a project's data. Decision record: [ADR-003](../4-explanation/decisions/ADR-003-continuity-gate-extensions.md).

| # | Class | Mechanism |
|---|---|---|
| 1 | Prose data the gate never reads | `token_sources` globs + `scripts/render.mjs` + coverage report |
| 2 | One field living in two files | `surfaces[].forbid_keys` |
| 3 | An object found by substring, not by id | `kind: "prop"`, `props: [id]`, `prompt_tokens` on the entry |
| 4 | An attribute left to "the prompt writer picks" | contextual `forms` picked by the unit's field |
| 5 | Records of different kinds forced through one template | a `kind` discriminator per record; one template per kind |
| 6 | A label that contradicts its own text | `surfaces[].exclusive_markers` |
| 7 | A gate that covers one file of a family | `coverage` (unclassified files are reported) |
| 8 | Dated output failing after a rename | `records` + rendering, by design |
| 9 | Bilateral Hand-Action Decoupling | Explicit lateral limb assignment in action prompts (`worn_on: LEFT_WRIST_ONLY`) |
| 10 | Backstage-to-Public Leakage | Decouple internal steering prompts from public DOM/alt (`SURFACING-ETHOS`) |
| 11 | Cross-Lane VBL Contamination | Lane-based keyword linter & AST invariant gate (bar Lane 2/3 tokens in Lane 1) |
| 12 | False Delete/Replace on Additions | Strict Additive Expansion Law; schema expansion over deletion |

## 1. Prose data the gate never reads

**Symptom.** Run notes, session notes, runbooks or export manifests carry written-out names. A rename leaves them stale and nothing says so.

**Why.** They were never declared, and the script that writes them copies notes straight into built files.

**Mechanism.** List them under `token_sources` (globs allowed) so a written-out name fails with the token to write; render them to built output with `node scripts/render.mjs <src> --out <dest>` (or `loadNames(root).resolveTokens` inside the generator); built output may hold names, the source holds tokens. The coverage report (class 7) catches the next file like this before anyone declares it.

## 2. One field living in two files

**Symptom.** A scene's description exists in the scene registry and again in the art manifest. An edit lands in one; the other describes the old image.

**Why.** The second copy was convenient for a builder that could have read the first.

**Mechanism.** The builder reads the owner; the registry forbids the copy: `forbid_keys: [{ "key": "visualDescription", "owner": "examples/scenes.json" }]` on the manifest's surface. The gate fails any entry that still carries it.

## 3. An object found by substring, not by id

**Symptom.** A prompt compiler prints a prop's look only when the prop's name string occurs in the scene text. The text says "the four things"; the prop is named "the four earned tools"; the line never fires, and after a restage the prop's tokens are wrong with no error.

**Why.** Matching prose is a guess. Ids are a contract.

**Mechanism.** The prop is a registry entry (`kind: "prop"`, `prompt_tokens`, `negative_tokens`); the scene lists it under `props: ["<id>"]` exactly as it lists its cast; the gate resolves each id; the compiler prints what the entry says. Nothing matches names in prose.

## 4. An attribute left to "the prompt writer picks"

**Symptom.** A prop or companion has a different attitude, look or state by life stage or story day, written on its card as prose with the note that the writer chooses. It is never compiled; every prompt gets the default.

**Why.** The selecting dimension existed on the scene, but no rule mapped it to the variant.

**Mechanism.** A contextual form: `forms.attitude = { "by": "stage", "values": { "childhood": "...", "adult": "...", "default": "..." } }`. The scene's own `stage` picks the text when `{{brass-key:attitude}}` is resolved; no match and no default fails the build naming the field. If the dimension lives one level up (a story day's stage), the builder copies that one scalar onto the scene before resolving, and the gate's exclusive markers (class 6) keep the copy honest.

## 5. Records of different kinds forced through one template

**Symptom.** A fixes file holds face edits by tool; a full restage of a master has no template, so its record is hand-written once and nothing checks it.

**Why.** The record schema had no discriminator, so the template had no branch.

**Mechanism.** Give each record a `kind` from a declared list (`face`, `restage`, ...); the template branches on it; the gate validates the enum and that each kind's required fields are present. In this repository the registry's `known` and `anchor` records show the shape: a typed object with required keys, validated by schema, never free prose. A restage record takes the scene's description (read from its owner, class 2) and the compiled continuity block, so it is generated like every other record.

## 6. A label that contradicts its own text

**Symptom.** A story day is labelled "an evening at home" while its scene's description says morning daylight. Both were edited by hand, by different people, and no gate compares them.

**Why.** The label implies a vocabulary nobody declared.

**Mechanism.** `exclusive_markers` on the scenes surface: `{ "field": "time_of_day", "values": { "morning": [...], "evening": [...] } }`. A scene whose text uses a word of another value fails: `says "sunrise" (time_of_day morning) but time_of_day is "evening"`. The words are the project's own; the engine ships none.

## 7. A gate that covers one file of a family

**Symptom.** The "program data" rule checks the fixes file; the masters file and the sessions file are the same kind of data and are never read.

**Why.** Files were enumerated one at a time.

**Mechanism.** Declare families as globs (`token_sources`, `records`, `coverage.ignore`), and let the coverage report list every tracked text file that is still unclassified and names a character. Set `coverage.strict: true` to fail on them. The question "does the gate read file X?" always has an answer in the output.

## 8. Dated output failing after a rename

**Symptom.** Prompt records already sent to a studio hold written-out names; after a rename, the check fails every unrendered record until it is rewritten from its template.

**Why.** This is the design: a record is dated output, and a renamed character must not be sent under the old name.

**Mechanism.** Records that are history go under `records` and are never rewritten. Records that are still to be sent are regenerated from their token source with `render.mjs`. Nobody edits a built file by hand, and nobody "fixes" the gate to accept the old name.

## 9. Bilateral Hand-Action Decoupling (Diffusion Laterality Inversion)

> **Origin:** Production story prompt feedback in `coachhype/relator-app` (Prologue Spread 8 / Spread 12, 2026-10-20 & 2026-10-21).

**Symptom.** Watches or asymmetrical accessories drift between left and right wrists across sequential panels, or appear on the wrong hand during physical actions (gripping portfolio handles, checking time, holding phones). In a single spread, one character's watch appears on their left wrist while the opposing character's watch flips to their right wrist.

**Why (First-Principles Architectural [Root Cause](../4-explanation/concepts/ROOT-CAUSE-AND-LASTING-FIX.md)).**
1. **The Viewer vs. Character Coordinate Paradox:** A human viewer observing a character face-to-face sees the character's anatomical right arm on the viewer's *screen-left*, and the character's anatomical left arm on the viewer's *screen-right*. When the character turns their back to the viewer, their anatomical right arm aligns with the viewer's *screen-right*. Stating "left wrist" in an unprojected prompt creates ambiguity between the character's body frame and the 2D canvas frame.
2. **Diffusion Reflectional Symmetry Bias:** Text-to-image diffusion models are trained on datasets with horizontal reflection augmentations and mirror selfies. The attention layers lack an intrinsic 3D skeletal frame of reference; words like "left" bind weakly to limbs and are overridden by global composition priors (e.g. balancing weight across the frame or mirroring two characters around a shared object).
3. **Formal Coordinate Frames:**
   - **Intrinsic Frame (Egocentric / Anatomical):** Coordinates anchored strictly to the subject's own body ($X_{\text{ego}}, Y_{\text{ego}}$). In this frame, "left" is invariant to camera rotation.
   - **Relative / Deictic Frame (Allocentric / Camera-Space):** Coordinates projected onto the 2D observer plane ($X_{\text{screen}}, Y_{\text{screen}}$).
   - **Theatrical Parallel:** Stage Right / Stage Left (actor-centric) versus House / Screen Right / Screen Left (audience-centric).

**Mechanism (Andrej Karpathy Self-Announcing Architecture).**
1. **Intrinsic Schema Assignment:** The prop schema (`scripts/wardrobe-and-props.v1.schema.json`) defines `worn_on: "LEFT_WRIST_ONLY"` and `intrinsic_laterality: "ANATOMICAL_LEFT_WRIST"`.
2. **Deterministic Projection Matrix:** The prompt compiler transforms the intrinsic coordinate into explicit screen-space directions based on the subject's camera facing before emitting prompts:
   $$\text{Screen Wrist} = \begin{cases} \text{SCREEN RIGHT}, & \text{if Anatomical Wrist} = \text{Left and Subject Faces Camera} \\ \text{SCREEN LEFT}, & \text{if Anatomical Wrist} = \text{Left and Subject Back to Camera} \\ \text{NEAR SIDE (FOREGROUND)}, & \text{if Anatomical Wrist} = \text{Left and Subject Profiles Screen-Left} \\ \text{FAR SIDE (OCCLUDED)}, & \text{if Anatomical Wrist} = \text{Left and Subject Profiles Screen-Right} \end{cases}$$
3. **Explicit Dual-Limb Action Choreography:** Prompts must explicitly bind both active and passive hands:
   *"Theo faces the camera; his right hand (screen-left) grips the leather handle while his left wrist (screen-right) clearly displays his matte-black stepped-tank watch."*
4. **Negative Token Suppression:** Negative prompts enforce `['right wrist', 'circular watch', 'round dial', 'smartwatch']`.
5. **Hero Isometric Visual Anchors:** Pass 1:1 isometric asset references (`references/props/<item>_hero_iso.png`) directly into image generation runs to anchor physical geometry.
6. **Automated Pixel Verification Gate:** Enforce post-generation vision inspection (`scripts/check-prop-continuity.mjs`) verifying that the rendered image matches the anatomical assignment rather than checking only JSON metadata.


## 10. Backstage-to-Public Leakage (Dual-Use Prompt Conflation)

> **Origin:** Production web reader leak in `coachhype/relator-app` (`products/rel8r/reader/index.html`, 2026-10-20).

**Symptom.** Internal engineering metadata, AI diffusion directives, camera angles ("Extreme close-up"), clinical jargon ("Somatic Neuroception"), or internal diorama scales ("Noir diorama, one-to-six doll scale") appear directly on public reading surfaces or within HTML `alt` tags under `<strong>Scene:</strong>`.

**Why.** The same schema field (`visualDescription`) is overloaded for two incompatible purposes: internal AI generation prompting and public front-facing captioning.

**Mechanism.**
1. Architectural Separation per `SURFACING-ETHOS.md` and `AGENT-SSOT-LAYERS.md`: Discovery Tier (public presentation) vs. Execution Tier (tooling & prompts).
2. Field Decoupling: Decouple `image_generation_prompt` (backstage directives) from `narrative_alt_text` and `public_caption`.
3. Sanitized Alt Tags: Image `alt` attributes must deliver evocative, narrative-first human descriptions for accessibility rather than raw generative AI tokens.
4. Production Stripping: Automated builders suppress internal metadata captions (`.panel-meta-caption`) on public production builds, restricting them to explicit `?debug=1` review modes.

## 11. Cross-Lane VBL Contamination (Style Boundary Bleed)

> **Origin:** Style collision between Lane 1 (Graphic Novel) and Lanes 2 & 3 (Noir Diorama) in `coachhype/relator-app` (2026-10-20).

**Symptom.** Vocabulary, framing, or scale tokens from one visual language appear inside prompts or prose of an incompatible product lane (e.g., pasting "Noir diorama, one-to-six doll scale" into a 2D graphic novel narrative panel).

**Why.** Copy-pasting prompts across projects or lanes without strict schema boundary validation.

**Mechanism.**
1. Lane-Specific Vocabulary Isolation: Define forbidden vocabulary per lane or story surface in `visual-continuity.json`.
2. Invariant Linting Gate: An automated AST/regex check (e.g. `check-story-invariants.mjs` or `check-lane-boundaries.mjs`) scanning all Lane 1 narrative files and failing commits if banned tokens (e.g. `diorama`, `doll scale`, `one-to-six`) are detected.

## 12. False Delete/Replace Assumption on Additive Assertions (The Additive Expansion Law)

> **Origin:** Owner mandate in `coachhype/relator-app` (2026-10-20, `wl-eb204e32-2b4a-4522-9390-190d2252daa6`).

**Symptom.** When an author states that artwork is missing from a narrative segment or requests additive story beats, an agent erroneously scopes the solution as overwriting, deleting, or replacing an existing scene panel or prompt.

**Why.** AI models default to 1:1 slot replacement rather than recognizing that narrative art omissions require expanding the underlying manifest, splitting spreads, or adding sequential visual slots.

**Mechanism.**
1. **Strict Additive Expansion Invariant:** Assertions of "missing art" or "add segments" must NEVER be treated as delete-and-replace. The schema and edition manifest must expand additively to accommodate the new visual beat while preserving existing registered artwork.
2. **Single Exception for Automated Pruning:** The ONLY authorized automated deletions to content across the entire system are those directly produced by simulated market testing where the author explicitly authorized choosing the most lucrative lane or action plan.
3. **Additive Expansion Logic:** When prose spans multiple distinct environments (e.g. an intimate candlelit dinner followed by an exterior umbrella walk), the system allocates two sequential spreads or a multi-panel layout rather than collapsing them into a single conflicting prompt.
