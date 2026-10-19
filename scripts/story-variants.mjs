#!/usr/bin/env node
/**
 * story-variants.mjs: test a change to the words before it is made, and let the machine that measured it write the winner back.
 *
 *   node scripts/story-variants.mjs list   <story-folder>                        every variant in variants.json and what it tests
 *   node scripts/story-variants.mjs render <story-folder> <edition> <variant>    the edition's text with the variant applied, to stdout
 *   node scripts/story-variants.mjs diff   <story-folder> <edition> <variant>    what the variant changes, spread by spread
 *   node scripts/story-variants.mjs apply  <story-folder> <edition> <variant> [--tested <file>] [--dry-run]
 *   every command takes --registry <path>; <variant> is a name from the story folder's variants.json, base (the text as the
 *   records are), or names joined with + (rest-the-workshop+night-in-the-time-line: the steps of the first, then the second)
 *
 * A variant is a named list of steps applied to the rendered text of an edition, never to the records: replace a phrase in
 * one spread, in every spread, or in the one spread that holds it (none or several fail); drop spreads; set a banner line;
 * add a spread from a draft. Every phrase in variants.json is a token source ({{sam-hayes}}), resolved before it is looked
 * for, so the text a reader tested is reproducible from the variant's name alone.
 *
 * apply writes the winning variant back: it checks first that every record reads back from its own built text, renders the
 * tested text, parses each spread into its fields, writes only the fields that differ with names put back as tokens and
 * verified by resolving them again, moves dropped slugs to retired in every edition and parks their pictures, writes a
 * tested banner, turns an added spread into a slot (a new-* record holding the draft as a note under _draft and nothing in
 * its fields: the words of a spread are the author's), rebuilds built/, and then re-renders the written records: the gate is
 * that they equal the tested text spread for spread (a slot is compared by position, its words being the author's). It runs
 * the names gate on the result. If any of that fails, every file is put back as it was. What it did and what it left is
 * appended to <story-folder>/variants-applied.json. Exit 1 on a named problem, 2 on usage.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TOKEN, atomicLabels, labelRegExp } from "./names.mjs";
import { readJson, validate } from "./lib.mjs";
import { StoryError, TEXT_FIELDS, isSlot, closest, loadStory, spreadsOf, renderSpread, renderHeader, joinEdition, renderEdition, buildStory } from "./story.mjs";
import { park } from "./check-story-art.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const VARIANTS_SCHEMA_PATH = path.join(HERE, "variants.v1.schema.json");
export const BASE = "base";
export const APPLIED_FILE = "variants-applied.json";
export const NEW_SLUG = /^new-[a-z0-9-]+$/;
const EVERY = "every spread", ONE = "one spread";
const DRAFT_FIELDS = ["title", "picture", "time", "paragraphs", "dialogue", "part", "margin_note", "margin_author", "footnote"];
const rel = (from, to) => path.relative(from, to).split(path.sep).join("/") || ".";
const quote = (s) => `"${String(s).length > 48 ? String(s).slice(0, 45) + "..." : s}"`;
const plain = (s) => s.replace(/^\$\.?/, "").replace(/^: /, "");
const stripNotes = (v) => (Array.isArray(v) ? v.map(stripNotes) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith("_")).map(([k, x]) => [k, stripNotes(x)])) : v);

/** Now, as ISO-8601 with this machine's numeric offset (a record says when, never a bare Z). */
export function stamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset(), sign = off >= 0 ? "+" : "-", a = Math.abs(off);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}

// ---- the variants file ----

/** <story-folder>/variants.json, checked: every variant has a line about it and steps of a known shape. Throws a StoryError listing every problem. */
export function loadVariants(story) {
  const file = path.join(story.dir, "variants.json");
  const shown = `${story.shown}/variants.json`;
  if (!fs.existsSync(file)) throw new StoryError([`${shown} is missing. Fix: write it with a "variants" map, one entry per edit to test: "<name>": { "about": "<what it tests>", "steps": [ { "replace": "<phrase>", "with": "<phrase>", "in": "every spread" } ] } (docs/3-reference/VARIANTS-AND-THE-APPLIED-RECORD.md); base needs no file`]);
  const json = readJson(file);
  const problems = [];
  if (json?.variants && Object.prototype.hasOwnProperty.call(json.variants, BASE)) problems.push(`${shown}: "base" cannot be a variant: it is the name of the text as the records are. Fix: rename it`);
  for (const p of validate(readJson(VARIANTS_SCHEMA_PATH), stripNotes(json))) {
    if (/^\$\.variants: unknown field base/.test(p)) continue;
    problems.push(`${shown}: ${plain(p).replace(/^variants: unknown field (.+?)(?: \(ids are lower-case, digits and hyphens\))?$/, (m, n) => `variant name "${n}" is not allowed: a name uses only lower-case letters, digits and hyphens. Fix: rename it`)}`);
  }
  const variants = {};
  for (const [name, v] of Object.entries(json.variants && typeof json.variants === "object" ? json.variants : {})) {
    if (!v || typeof v !== "object" || !Array.isArray(v.steps)) continue;
    variants[name] = { name, about: v.about, steps: v.steps.map((step, i) => checkStep(step, `${shown}: variant "${name}", step ${i + 1}`, problems)).filter(Boolean) };
  }
  if (problems.length) throw new StoryError(problems);
  return { file, shown, variants };
}

const isText = (v) => typeof v === "string" && v.trim() !== "";
const SHAPES = `{ "replace": "<phrase>", "with": "<phrase>", "in": "<slug>" | "${EVERY}" | "${ONE}" }, { "drop": ["<slug>"] }, { "banner": "<one line>" } or { "add": "new-<slug>", "after": "<slug>", "draft": { ... } }`;

/** One step, normalised to { kind, at, ... }, or null with its problems pushed. */
function checkStep(step, at, problems) {
  if (!step || typeof step !== "object" || Array.isArray(step)) { problems.push(`${at}: a step is an object: ${SHAPES}`); return null; }
  const keys = Object.keys(step).filter((k) => !k.startsWith("_"));
  const extra = (allowed) => keys.filter((k) => !allowed.includes(k));
  if ("replace" in step) {
    const bad = extra(["replace", "with", "in"]);
    if (bad.length) { problems.push(`${at}: a replace step has replace, with and in, not ${bad.join(", ")}`); return null; }
    if (!isText(step.replace)) { problems.push(`${at}: replace needs the phrase to find (a non-empty text)`); return null; }
    if (typeof step.with !== "string") { problems.push(`${at}: with needs the phrase to put in its place (a text; empty takes the phrase out)`); return null; }
    if (step.with === step.replace) { problems.push(`${at}: replace and with are the same (${quote(step.replace)}): the step does nothing. Fix: change with, or drop the step`); return null; }
    if (!isText(step.in)) { problems.push(`${at}: in says where: a spread's slug, "${EVERY}", or "${ONE}" (exactly one spread must hold the phrase)`); return null; }
    return { kind: "replace", at, replace: step.replace, with: step.with, in: step.in.trim() };
  }
  if ("drop" in step) {
    const bad = extra(["drop"]);
    if (bad.length) { problems.push(`${at}: a drop step has drop only, not ${bad.join(", ")}`); return null; }
    const slugs = Array.isArray(step.drop) ? step.drop : [step.drop];
    if (!slugs.length || !slugs.every(isText)) { problems.push(`${at}: drop lists the slugs of the spreads to leave out, as text`); return null; }
    return { kind: "drop", at, slugs: slugs.map((s) => s.trim()) };
  }
  if ("banner" in step) {
    const bad = extra(["banner"]);
    if (bad.length) { problems.push(`${at}: a banner step has banner only, not ${bad.join(", ")}`); return null; }
    if (!isText(step.banner) || step.banner.includes("\n")) { problems.push(`${at}: banner is one line of text to the reader`); return null; }
    return { kind: "banner", at, banner: step.banner.trim() };
  }
  if ("add" in step) {
    const bad = extra(["add", "after", "before", "draft"]);
    if (bad.length) { problems.push(`${at}: an add step has add, after or before, and draft, not ${bad.join(", ")}`); return null; }
    if (!isText(step.add) || !NEW_SLUG.test(step.add.trim())) { problems.push(`${at}: add names the new spread, and the name starts with new- (new-the-hallway): it is a slot until the author writes it`); return null; }
    const where = ["after", "before"].filter((k) => k in step);
    if (where.length !== 1 || !isText(step[where[0]])) { problems.push(`${at}: say where the spread goes with after or before (one of them) and the slug of its neighbour`); return null; }
    const d = step.draft;
    if (!d || typeof d !== "object" || Array.isArray(d)) { problems.push(`${at}: draft is the spread as it would be tested: title, picture, time, and paragraphs or dialogue (tokens for names)`); return null; }
    const dKeys = Object.keys(d).filter((k) => !k.startsWith("_"));
    const unknown = dKeys.filter((k) => !DRAFT_FIELDS.includes(k));
    if (unknown.length) { problems.push(`${at}: draft has ${unknown.join(", ")}, which a draft does not carry (${["layout", "art"].some((k) => unknown.includes(k)) ? "the pictures come when the author writes the spread; " : ""}a draft has ${DRAFT_FIELDS.join(", ")})`); return null; }
    for (const k of ["title", "picture", "time"]) if (!isText(d[k])) { problems.push(`${at}: draft needs ${k} (a text)`); return null; }
    for (const k of ["part", "margin_note", "margin_author", "footnote"]) if (k in d && !isText(d[k])) { problems.push(`${at}: draft.${k} is a text when present`); return null; }
    const paragraphs = d.paragraphs ?? [], dialogue = d.dialogue ?? [];
    if (!Array.isArray(paragraphs) || !paragraphs.every(isText)) { problems.push(`${at}: draft.paragraphs is a list of texts`); return null; }
    if (!Array.isArray(dialogue) || !dialogue.every((l) => l && typeof l === "object" && isText(l.speaker) && isText(l.text))) { problems.push(`${at}: draft.dialogue is a list of { "speaker": "{{id}}", "text": "..." }`); return null; }
    if (!paragraphs.length && !dialogue.length) { problems.push(`${at}: the draft says nothing: no paragraphs and no dialogue. Fix: write at least one paragraph or one line of dialogue`); return null; }
    return { kind: "add", at, slug: step.add.trim(), [where[0]]: step[where[0]].trim(), draft: d };
  }
  problems.push(`${at}: a step is one of ${SHAPES}; this one has ${keys.join(", ") || "nothing"}`);
  return null;
}

/** One step in a line a person reads, tokens as written. */
export function describeStep(step) {
  if (step.kind === "replace") return `replace ${quote(step.replace)} with ${quote(step.with)} in ${step.in === EVERY || step.in === ONE ? step.in : step.in}`;
  if (step.kind === "drop") return `drop ${step.slugs.join(", ")}`;
  if (step.kind === "banner") return `banner ${quote(step.banner)}`;
  return `add ${step.slug} ${step.after ? "after" : "before"} ${step.after ?? step.before} (draft: ${quote(step.draft.title)})`;
}

/** "a+b" -> the steps of a, then b; base alone is no steps. Throws on a name the file lacks. */
export function composeVariant(doc, spec) {
  const names = String(spec ?? "").split("+").map((s) => s.trim()).filter(Boolean);
  if (!names.length) throw new StoryError([`name a variant: one from ${doc.shown}, base, or names joined with + (a+b)`]);
  const steps = [], about = [];
  for (const n of names) {
    if (n === BASE) continue;
    const v = doc.variants[n];
    if (!v) { const ids = Object.keys(doc.variants); throw new StoryError([`${doc.shown} has no variant "${n}"${closest(n, ids)}. ${ids.length ? `Its variants are ${ids.join(", ")}` : "It has no variants yet"}; base is the text as the records are`]); }
    steps.push(...v.steps);
    about.push(v.about);
  }
  return { name: names.join("+"), names, steps, about };
}

// ---- the tested text ----

/** An edition's order after the variant's drop and add steps: { order, dropped, notPlaced } (an added spread whose neighbour is not read here is not placed). */
function planOrder(story, startOrder, steps, problems, editionId) {
  let order = [...startOrder];
  const dropped = [], notPlaced = [], added = new Set();
  for (const step of steps) {
    if (step.kind === "drop") {
      for (const slug of step.slugs) {
        if (!story.scenes[slug] && !added.has(slug)) { problems.push(`${step.at}: drop names "${slug}", which is not a scene of the story${closest(slug, Object.keys(story.scenes))}. Fix: correct the slug`); continue; }
        if (order.includes(slug) && !added.has(slug)) dropped.push(slug);
        order = order.filter((s) => s !== slug);
      }
    } else if (step.kind === "add") {
      const anchor = step.after ?? step.before;
      if (story.scenes[step.slug]) { problems.push(`${step.at}: add names "${step.slug}", which the story already has${isSlot(step.slug) ? " (the slot is made; drop the step, or rename the add)" : ". Fix: a new spread needs a new name"}`); continue; }
      if (added.has(step.slug)) { problems.push(`${step.at}: "${step.slug}" is added twice`); continue; }
      if (!story.scenes[anchor] && !added.has(anchor)) { problems.push(`${step.at}: ${step.after ? "after" : "before"} names "${anchor}", which is not a scene of the story${closest(anchor, Object.keys(story.scenes))}. Fix: name the spread it goes ${step.after ? "after" : "before"}`); continue; }
      added.add(step.slug);
      const i = order.indexOf(anchor);
      if (i === -1) notPlaced.push({ slug: step.slug, anchor, why: dropped.includes(anchor) ? `${anchor} is dropped by this variant` : `${anchor} is read in no spread of ${editionId}` });
      else order.splice(step.after ? i + 1 : i, 0, step.slug);
    }
  }
  return { order, dropped, notPlaced };
}

/**
 * The edition's text with the variant applied, the way a reader (or a test) meets it, plus each spread's slug:
 * { text, header, banner, spreads: [{ slug, number, of, text, added, slot, changed }], dropped, notPlaced, added, bannerChanged }.
 * Every step must do what it says, or the whole render fails naming the step.
 */
export function testedEdition(story, editionId, composed) {
  const edition = story.editions[editionId];
  if (!edition) spreadsOf(story, editionId);
  const { names, story: storyId } = story;
  const problems = [];
  const plan = planOrder(story, edition.order, composed.steps, problems, editionId);
  const added = new Map();
  let banner = edition.banner;
  for (const step of composed.steps) {
    if (step.kind === "add" && !story.scenes[step.slug]) {
      try { added.set(step.slug, { fields: names.resolveDeep(step.draft, storyId), step }); }
      catch (e) { problems.push(`${step.at}: draft: ${e.message.replace(/^names: /, "")}`); }
    } else if (step.kind === "banner") {
      try { banner = names.resolveTokens(step.banner, storyId); } catch (e) { problems.push(`${step.at}: banner: ${e.message.replace(/^names: /, "")}`); }
    }
  }
  if (problems.length) throw new StoryError(problems);
  const of = plan.order.length;
  const spreads = plan.order.map((slug, i) => {
    const base = added.has(slug) ? added.get(slug).fields : story.resolved[slug];
    return { slug, number: i + 1, of, added: added.has(slug), slot: Boolean(base.slot), text: renderSpread({ number: i + 1, of, slug, edition: editionId, ...base }), changed: false };
  });
  const hint = `(capital letters and punctuation count; node scripts/story-variants.mjs render ${story.shown} ${editionId} base shows the text)`;
  for (const step of composed.steps.filter((s) => s.kind === "replace")) {
    let find, put;
    try { find = names.resolveTokens(step.replace, storyId); put = names.resolveTokens(step.with, storyId); }
    catch (e) { problems.push(`${step.at}: ${e.message.replace(/^names: /, "")}`); continue; }
    const hits = spreads.filter((s) => !s.slot && s.text.includes(find));
    let targets;
    if (step.in === EVERY || step.in === ONE) {
      if (!hits.length) { problems.push(`${step.at}: no spread of ${editionId} holds ${quote(find)} ${hint}`); continue; }
      if (step.in === ONE && hits.length > 1) { problems.push(`${step.at}: ${hits.length} spreads of ${editionId} hold ${quote(find)}: ${hits.map((h) => h.slug).join(", ")}. Fix: name the spread with "in": "<slug>", or write "in": "${EVERY}" to change them all`); continue; }
      targets = hits;
    } else {
      const s = spreads.find((x) => x.slug === step.in);
      if (!s) {
        if (story.scenes[step.in] || added.has(step.in)) problems.push(`${step.at}: ${step.in} is read in no spread of ${editionId} (${plan.dropped.includes(step.in) ? "this variant drops it" : plan.notPlaced.some((n) => n.slug === step.in) ? "its neighbour is not read here" : "it is retired here"}). Fix: test the variant on an edition that reads it, or drop the step`);
        else problems.push(`${step.at}: in names "${step.in}", which is not a scene of the story${closest(step.in, [...Object.keys(story.scenes), ...added.keys()])}. Fix: a slug, "${EVERY}" or "${ONE}"`);
        continue;
      }
      if (s.slot) { problems.push(`${step.at}: ${step.in} is a slot: it has no words to change. Fix: write the spread and claim the slot (rename it) first`); continue; }
      if (!s.text.includes(find)) { problems.push(`${step.at}: ${step.in} does not hold ${quote(find)} ${hint}`); continue; }
      targets = [s];
    }
    for (const s of targets) { s.text = s.text.split(find).join(put); s.changed = true; }
  }
  if (problems.length) throw new StoryError(problems);
  const header = renderHeader(story, edition, of, banner);
  const text = joinEdition(story, editionId, header, spreads.map((s) => s.text));
  return { edition: editionId, text, header, banner, spreads, dropped: plan.dropped, notPlaced: plan.notPlaced, added: [...added].map(([slug, a]) => ({ slug, ...a })), bannerChanged: banner !== edition.banner };
}

/** The edition's text with the variant applied; base is the text as the records are. */
export function renderVariant(story, editionId, spec, doc = spec === BASE ? { shown: `${story.shown}/variants.json`, variants: {} } : loadVariants(story)) {
  return testedEdition(story, editionId, composeVariant(doc, spec)).text;
}

// ---- reading the text back ----

/** The header (everything above the first spread) and one block per spread, as the renderer wrote them. */
export function splitSpreads(text) {
  const starts = [...text.matchAll(/^=== SPREAD \d+ OF \d+ ===$/gm)].map((m) => m.index);
  if (!starts.length) return { header: text, blocks: [] };
  return { header: text.slice(0, starts[0]), blocks: starts.map((s, i) => text.slice(s, starts[i + 1] ?? text.length)) };
}

/**
 * One rendered spread back into its fields: { number, of, slot?, fields: { part, title, picture, time, paragraphs, dialogue,
 * margin_note, margin_author, footnote } }. Throws with the line when the block is not in the renderer's format.
 */
export function parseSpread(block) {
  const lines = block.replace(/\n+$/, "").split("\n");
  const bad = (i, why) => { throw new Error(`line ${i + 1}: ${why}`); };
  const head = lines[0]?.match(/^=== SPREAD (\d+) OF (\d+) ===$/);
  if (!head) bad(0, `expected "=== SPREAD n OF N ===", found ${quote(lines[0] ?? "")}`);
  const out = { number: Number(head[1]), of: Number(head[2]), fields: {} };
  if (lines[1]?.startsWith("SLOT: ")) { out.slot = lines[1].slice(6); return out; }
  let i = 1;
  const take = (label, required) => {
    if (lines[i]?.startsWith(`${label}: `)) { out.fields[label.toLowerCase()] = lines[i].slice(label.length + 2); i += 1; return; }
    if (required) bad(i, `expected "${label}: ...", found ${quote(lines[i] ?? "(end)")}`);
  };
  take("PART", false); take("TITLE", true); take("PICTURE", true); take("TIME", true);
  if (lines[i] !== "") bad(i, `expected a blank line after TIME:, found ${quote(lines[i] ?? "(end)")}`);
  i += 1;
  const paragraphs = [], dialogue = [];
  let section = "paragraphs";
  while (i < lines.length) {
    const line = lines[i];
    if (line === "") { i += 1; continue; }
    if (line === "DIALOGUE:") {
      if (section !== "paragraphs") bad(i, "DIALOGUE: comes once, after the paragraphs");
      section = "dialogue"; i += 1;
      while (i < lines.length && lines[i].startsWith("  ")) {
        const m = lines[i].slice(2).match(/^(.+?): (.*)$/);
        if (!m) bad(i, `expected "  speaker: text", found ${quote(lines[i])}`);
        dialogue.push({ speaker: m[1], text: m[2] }); i += 1;
      }
      continue;
    }
    if (line.startsWith("MARGIN NOTE: ")) {
      if (out.fields.margin_note !== undefined) bad(i, "a second MARGIN NOTE:");
      const rest = line.slice(13), cut = rest.lastIndexOf(" — ");
      if (cut === -1) out.fields.margin_note = rest; else { out.fields.margin_note = rest.slice(0, cut); out.fields.margin_author = rest.slice(cut + 3); }
      section = "after"; i += 1; continue;
    }
    if (line.startsWith("FOOTNOTE: ")) {
      if (out.fields.footnote !== undefined) bad(i, "a second FOOTNOTE:");
      out.fields.footnote = line.slice(10); section = "after"; i += 1; continue;
    }
    if (section === "paragraphs") { paragraphs.push(line); i += 1; continue; }
    bad(i, `${quote(line)} is not a dialogue line (two spaces, speaker, colon), MARGIN NOTE: or FOOTNOTE:; paragraphs come before DIALOGUE:`);
  }
  if (paragraphs.length) out.fields.paragraphs = paragraphs;
  if (dialogue.length) out.fields.dialogue = dialogue;
  return out;
}

const norm = (v) => (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length) ? undefined : Array.isArray(v) && v.length && typeof v[0] === "object" ? v.map((l) => ({ speaker: l.speaker, text: l.text })) : v);
const same = (a, b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));

/** Every record renders to text that reads back as the record: the check apply runs before it writes anything. Returns problems. */
export function checkParser(story) {
  const problems = [];
  const why = "the round trip reads the built text back into fields, so a paragraph is one line, a dialogue speaker holds no \": \", a margin note without an author holds no \" — \", and no paragraph starts with DIALOGUE:, MARGIN NOTE: or FOOTNOTE:";
  for (const [slug, resolved] of Object.entries(story.resolved)) {
    if (resolved.slot) continue;
    const text = renderSpread({ number: 1, of: 1, slug, ...resolved });
    let parsed;
    try { parsed = parseSpread(text); } catch (e) { problems.push(`${story.shown}/scenes.json: ${slug}: its built text does not read back (${e.message}). Fix: ${why}`); continue; }
    for (const field of TEXT_FIELDS) {
      if (same(resolved[field], parsed.fields[field])) continue;
      problems.push(`${story.shown}/scenes.json: ${slug}: ${field} does not read back from the built text as it is written (the record says ${JSON.stringify(norm(resolved[field]) ?? null)}, the text reads ${JSON.stringify(norm(parsed.fields[field]) ?? null)}). Fix: ${why}`);
      break;
    }
  }
  return problems;
}

// ---- names back as tokens ----

/** The labels a text may not write out, with their tokens, for this story (the registry's names, forms and full names, and the story's card keys). */
export function tokenTable(story) {
  const card = story.names.cardOf(story.story);
  return atomicLabels(story.names.characters, card ? [card] : []);
}

/** Every written-out name in a text replaced by its token, never inside a token that is already there. */
export function tokensFor(text, table) {
  const parts = text.split(new RegExp(`(${TOKEN.source})`, "g"));
  return parts.map((part, i) => {
    if (i % 4 !== 0) return i % 4 === 1 ? part : "";
    let out = part;
    for (const [label, token] of table.list) out = out.replace(labelRegExp(label), (m, lead) => `${lead}${token}`);
    return out;
  }).join("");
}

/**
 * A field's new text as tokens, verified: resolving the tokens again (with the record's own fields as context) gives the text
 * back, and no label two entries share is left written out. Returns { tokens } or { problem }.
 */
export function tokensBack(story, table, text, record, at) {
  const tokens = tokensFor(text, table);
  const context = Object.fromEntries(Object.entries(record || {}).filter(([k, v]) => !k.startsWith("_") && ["string", "number", "boolean"].includes(typeof v)));
  let back;
  try { back = story.names.resolveTokens(tokens, story.story, { context }); } catch (e) { return { problem: `${at}: ${e.message.replace(/^names: /, "")}` }; }
  if (back !== text) return { problem: `${at}: the names put back as tokens do not resolve to the tested text again (the tokens ${quote(tokens)} render ${quote(back)}, the test read ${quote(text)}). Fix: a form that depends on a field of the record (such as a stage) renders by that field; write the words so they resolve the same way, or set the field on the record` };
  const shared = table.shared.filter((l) => labelRegExp(l, "").test(text));
  if (shared.length) return { problem: `${at}: ${shared.map(quote).join(" and ")} name${shared.length === 1 ? "s" : ""} two characters of the registry, so no token can be chosen. Fix: write the token by hand in the variant ({{id}}), or give one of them another name` };
  return { tokens };
}

// ---- comparing texts ----

/**
 * Two edition texts compared spread for spread: [] when equal, else one entry per difference { where, line, a, b }. A block
 * in `b` that is a slot named in `slots` is compared by its header line only (its words are the author's).
 */
export function compareTexts(a, b, { slots = new Set(), labels = ["the tested text", "the written records"] } = {}) {
  const A = splitSpreads(a), B = splitSpreads(b), out = [];
  const diffLines = (x, y, where) => {
    const xl = x.split("\n"), yl = y.split("\n");
    const n = Math.max(xl.length, yl.length);
    for (let i = 0; i < n; i++) if (xl[i] !== yl[i]) { out.push({ where, line: i + 1, a: xl[i] ?? "(nothing)", b: yl[i] ?? "(nothing)" }); return; }
  };
  diffLines(A.header, B.header, "the lines above the first spread");
  const count = Math.max(A.blocks.length, B.blocks.length);
  for (let i = 0; i < count; i++) {
    const x = A.blocks[i], y = B.blocks[i];
    if (x === undefined || y === undefined) { out.push({ where: `spread ${i + 1}`, line: 1, a: x === undefined ? `(no spread ${i + 1} in ${labels[0]})` : x.split("\n")[0], b: y === undefined ? `(no spread ${i + 1} in ${labels[1]})` : y.split("\n")[0] }); continue; }
    const slot = y.split("\n")[1]?.startsWith("SLOT: ") ? y.split("\n")[1].slice(6) : null;
    if (slot && slots.has(slot)) { if (x.split("\n")[0] !== y.split("\n")[0]) out.push({ where: `spread ${i + 1} (slot ${slot})`, line: 1, a: x.split("\n")[0], b: y.split("\n")[0] }); continue; }
    diffLines(x, y, `spread ${i + 1}`);
  }
  return out;
}

function lineDiff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push([" ", a[i]]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push(["-", a[i++]]);
    else out.push(["+", b[j++]]);
  }
  while (i < n) out.push(["-", a[i++]]);
  while (j < m) out.push(["+", b[j++]]);
  return out;
}

/** What a variant changes in an edition, spread by spread, as lines a person reads. */
export function diffVariant(story, editionId, composed) {
  const base = spreadsOf(story, editionId);
  const baseText = new Map(base.map((s) => [s.slug, { number: s.number, lines: renderSpread(s).replace(/\n+$/, "").split("\n").slice(1) }]));
  const t = testedEdition(story, editionId, composed);
  const lines = [];
  const changed = t.spreads.filter((s) => s.changed && !s.added);
  lines.push(`${composed.name} on ${editionId}: ${t.spreads.length} spread${t.spreads.length === 1 ? "" : "s"} (base has ${base.length}); ${changed.length} changed, ${t.dropped.length} dropped, ${t.added.length} added${t.notPlaced.length ? ` (${t.notPlaced.length} not placed here)` : ""}, banner ${t.bannerChanged ? "set" : "unchanged"}`);
  if (t.bannerChanged) lines.push(`banner:`, ...(story.editions[editionId].banner ? [`  - BANNER: ${story.editions[editionId].banner}`] : []), `  + BANNER: ${t.banner}`);
  for (const s of t.spreads) {
    const now = s.text.replace(/\n+$/, "").split("\n").slice(1);
    if (s.added) { lines.push(`spread ${s.number} of ${s.of}: ${s.slug} (added ${t.added.find((a) => a.slug === s.slug).step.after ? "after" : "before"} ${t.added.find((a) => a.slug === s.slug).step.after ?? t.added.find((a) => a.slug === s.slug).step.before}; a slot when applied)`, ...now.map((l) => `  + ${l}`)); continue; }
    const was = baseText.get(s.slug);
    const moved = was.number !== s.number ? ` (was spread ${was.number} of ${base.length})` : "";
    if (!s.changed) continue;
    const d = lineDiff(was.lines, now).filter(([k]) => k !== " ");
    lines.push(`spread ${s.number} of ${s.of}: ${s.slug}${moved}: ${d.filter(([k]) => k === "-").length} line(s) out, ${d.filter(([k]) => k === "+").length} in`, ...d.map(([k, l]) => `  ${k} ${l}`));
  }
  for (const slug of t.dropped) lines.push(`dropped: ${slug} (was spread ${baseText.get(slug).number} of ${base.length}; retired in every edition when applied)`);
  for (const n of t.notPlaced) lines.push(`not placed in ${editionId}: ${n.slug} (${n.why}; it goes to retired here when applied)`);
  return lines;
}

// ---- apply ----

/** The order of an edition's JSON keys with banner set (or replaced) right after title. */
function withBanner(json, banner) {
  if ("banner" in json) return { ...json, banner };
  const out = {};
  for (const [k, v] of Object.entries(json)) { out[k] = v; if (k === "title") out.banner = banner; }
  if (!("banner" in out)) out.banner = banner;
  return out;
}

/** JSON the way the example files are written: short lists and flat objects on one line, everything else indented by two. */
export function prettyJson(value, depth = 0) {
  const pad = "  ".repeat(depth), inner = "  ".repeat(depth + 1);
  const scalar = (v) => v === null || ["string", "number", "boolean"].includes(typeof v);
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    if (value.every(scalar) && value.length <= 4) { const one = `[${value.map((v) => JSON.stringify(v)).join(", ")}]`; if (one.length <= 96) return one; }
    return `[\n${value.map((v) => `${inner}${prettyJson(v, depth + 1)}`).join(",\n")}\n${pad}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (!entries.length) return "{}";
    if (entries.every(([, v]) => scalar(v))) { const one = `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")} }`; if (one.length <= 140) return one; }
    return `{\n${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${prettyJson(v, depth + 1)}`).join(",\n")}\n${pad}}`;
  }
  return JSON.stringify(value);
}

const write = (file, json) => fs.writeFileSync(file, `${prettyJson(json)}\n`);

/**
 * Plan the write of a composed variant into the records: everything that can be checked without touching a file. Returns
 * { tested, scenes, editions: { id: json }, changed, retired, slots, banner, draft } or throws a StoryError that names every problem.
 */
export function planApply(story, editionId, composed, { tested } = {}) {
  const problems = checkParser(story);
  if (problems.length) throw new StoryError([...problems, `story-variants: nothing was written: the round trip needs every record to read back from its own built text`]);
  const t = testedEdition(story, editionId, composed);
  if (tested !== undefined && tested !== t.text) {
    const d = compareTexts(tested, t.text, { labels: ["the tested file", "what the variant renders now"] })[0];
    throw new StoryError([`the tested text is not what variant ${composed.name} renders from the records now (${d ? `${d.where}, line ${d.line}: the file says ${quote(d.a)}, the records render ${quote(d.b)}` : "the files differ"}). The records or the variant changed since the test. Fix: render the variant again and test that text, or apply from the records the test saw; nothing was written`]);
  }
  if (!composed.steps.length) throw new StoryError([`${composed.name} changes nothing: there is nothing to write`]);
  const table = tokenTable(story);
  const scenes = structuredClone(story.raw);
  const changed = [];
  for (const s of t.spreads) {
    if (s.added || s.slot) continue;
    let parsed;
    try { parsed = parseSpread(s.text); } catch (e) { problems.push(`${s.slug}: the tested text cannot be read back into its record (${e.message}). Fix: a variant changes words, not the format: keep the label lines (TITLE:, PICTURE:, TIME:, DIALOGUE:, MARGIN NOTE:, FOOTNOTE:), the two-space dialogue lines and the blank lines as they are`); continue; }
    const record = scenes.scenes[s.slug];
    const current = story.resolved[s.slug];
    const put = (text, at) => { const r = tokensBack(story, table, text, record, `${s.slug}: ${at}`); if (r.problem) { problems.push(r.problem); return text; } return r.tokens; };
    for (const field of TEXT_FIELDS) {
      const before = norm(current[field]), after = norm(parsed.fields[field]);
      if (same(before, after)) continue;
      if (after === undefined) { delete record[field]; changed.push(`${s.slug}: ${field} (removed)`); continue; }
      if (field === "paragraphs") {
        const prev = before ?? [], prevTokens = Array.isArray(record.paragraphs) ? record.paragraphs : [];
        record.paragraphs = after.map((p, i) => { const j = prev.indexOf(p); if (j !== -1 && prevTokens[j] !== undefined) return prevTokens[j]; changed.push(`${s.slug}: paragraphs[${i}]`); return put(p, `paragraphs[${i}]`); });
        if (prev.length > after.length) changed.push(`${s.slug}: ${prev.length - after.length} paragraph(s) removed`);
      } else if (field === "dialogue") {
        const prev = before ?? [], prevTokens = Array.isArray(record.dialogue) ? record.dialogue : [];
        record.dialogue = after.map((l, i) => {
          const j = prev.findIndex((p) => p.speaker === l.speaker && p.text === l.text);
          if (j !== -1 && prevTokens[j]) return prevTokens[j];
          const same_ = prev[i] ? ["speaker", "text"].filter((k) => prev[i][k] === l[k]) : [];
          const out = { speaker: same_.includes("speaker") && prevTokens[i] ? prevTokens[i].speaker : put(l.speaker, `dialogue[${i}].speaker`), text: same_.includes("text") && prevTokens[i] ? prevTokens[i].text : put(l.text, `dialogue[${i}].text`) };
          if (!/^\{\{[a-z0-9][a-z0-9-]*(?::[a-z]+)?\}\}$/.test(out.speaker)) problems.push(`${s.slug}: dialogue[${i}].speaker ${quote(l.speaker)} is no character of the story (a speaker is one token). Fix: name a character, or add this one to the registry first (node scripts/new-character.mjs)`);
          for (const k of ["speaker", "text"]) if (!same_.includes(k)) changed.push(`${s.slug}: dialogue[${i}].${k}`);
          return out;
        });
        if (prev.length > after.length) changed.push(`${s.slug}: ${prev.length - after.length} dialogue line(s) removed`);
      } else {
        record[field] = put(after, field);
        if (field === "margin_author" && !TOKEN.test(record[field])) problems.push(`${s.slug}: margin_author ${quote(after)} names no character of the story. Fix: name a character (a qualifier in parentheses is fine: {{sam-hayes}} (looking back))`);
        TOKEN.lastIndex = 0;
        changed.push(`${s.slug}: ${field}`);
      }
    }
  }
  // dropped spreads retire everywhere; added spreads become slots, placed by their neighbour in every edition
  const retired = [...new Set(composed.steps.filter((s) => s.kind === "drop").flatMap((s) => s.slugs))].filter((slug) => story.scenes[slug]);
  const adds = composed.steps.filter((s) => s.kind === "add" && !story.scenes[s.slug]);
  const editions = {}, positions = Object.fromEntries(adds.map((a) => [a.slug, {}]));
  for (const [id, edition] of Object.entries(story.editions)) {
    const json = readJson(edition.file);
    const plan = planOrder(story, edition.order, composed.steps, [], id);
    const keep = new Set(plan.order);
    const retiredHere = [...new Set([...(json.retired || []), ...retired.filter((slug) => !keep.has(slug)), ...plan.notPlaced.map((n) => n.slug)])];
    let out = { ...json, order: plan.order };
    if (retiredHere.length) out.retired = retiredHere;
    for (const a of adds) positions[a.slug][id] = keep.has(a.slug) ? plan.order.indexOf(a.slug) + 1 : "retired";
    editions[id] = out;
  }
  let banner;
  if (t.bannerChanged) {
    const r = tokensBack(story, table, t.banner, {}, `${editionId}: banner`);
    if (r.problem) problems.push(r.problem); else { banner = r.tokens; editions[editionId] = withBanner(editions[editionId], banner); }
  }
  const now = stamp();
  const slots = adds.map((a) => {
    const where = a.after ? { after: a.after } : { before: a.before };
    // the note is the draft as it was tested (later steps may have touched it), names as tokens; never the spread's fields
    const testedSpread = t.spreads.find((s) => s.slug === a.slug);
    let draft = a.draft;
    if (testedSpread) {
      try {
        const f = parseSpread(testedSpread.text).fields;
        draft = Object.fromEntries(DRAFT_FIELDS.filter((k) => f[k] !== undefined).map((k) => [k, Array.isArray(f[k]) ? f[k].map((x) => (typeof x === "string" ? tokensFor(x, table) : { speaker: tokensFor(x.speaker, table), text: tokensFor(x.text, table) })) : tokensFor(f[k], table)]));
      } catch { draft = a.draft; }
    }
    scenes.scenes[a.slug] = { _slot: { from_variant: composed.name, tested_in: editionId, applied: now, ...where, positions: positions[a.slug] }, _draft: draft };
    return { slot: a.slug, ...where, positions: positions[a.slug], draft, why: "the words of a new spread are the author's: the tested draft is the _draft note on its record and nothing is written into its fields; when it is written, rename the slot to a slug without new- here and in every edition" };
  });
  if (problems.length) throw new StoryError([...problems, "story-variants: nothing was written"]);
  if (!changed.length && !retired.length && !slots.length && banner === undefined) throw new StoryError([`${composed.name} changes nothing in ${editionId}: there is nothing to write`]);
  return { tested: t, scenes, editions, changed, retired, slots, banner, now };
}

/**
 * Apply a composed variant: write the plan, re-render the written records and compare them with the tested text spread for
 * spread, run the names gate; on any failure put every file back and throw. Returns the report that was appended to
 * variants-applied.json: { variant, edition, applied, changed, retired, parked, banner, left, verified, files }.
 */
export function applyVariant(story, editionId, composed, { tested, testedFile, dryRun = false } = {}) {
  const plan = planApply(story, editionId, composed, { tested });
  const files = { scenes: story.file, editions: Object.fromEntries(Object.entries(story.editions).map(([id, e]) => [id, e.file])), parked: path.join(story.dir, "parked-art.json"), applied: path.join(story.dir, APPLIED_FILE), built: path.join(story.dir, "built") };
  const report = {
    variant: composed.name,
    about: composed.about,
    edition: editionId,
    applied: plan.now,
    changed: plan.changed,
    retired: plan.retired,
    parked: [],
    ...(plan.banner !== undefined ? { banner: editionId } : {}),
    left: plan.slots,
    verified: "",
    files: [],
  };
  if (testedFile) report.tested_file = testedFile;
  if (dryRun) { report.verified = "dry run: nothing written; the round-trip check runs when the variant is applied"; return report; }

  // snapshot everything apply may touch, so a failure leaves the folder as it was
  const touched = new Map();
  const remember = (file) => { if (!touched.has(file)) touched.set(file, fs.existsSync(file) ? fs.readFileSync(file) : null); };
  const restore = () => { for (const [file, body] of touched) { if (body === null) { if (fs.existsSync(file)) fs.unlinkSync(file); } else fs.writeFileSync(file, body); } };
  remember(files.scenes); remember(files.parked); remember(files.applied);
  for (const f of Object.values(files.editions)) remember(f);
  if (fs.existsSync(files.built)) for (const f of fs.readdirSync(files.built)) remember(path.join(files.built, f));
  const shownOf = (f) => rel(process.cwd(), f);
  try {
    // a file whose content did not change is left alone, so a diff shows the edit and nothing else
    const unchanged = (file, json) => fs.existsSync(file) && JSON.stringify(readJson(file)) === JSON.stringify(json);
    if (!unchanged(files.scenes, plan.scenes)) { write(files.scenes, plan.scenes); report.files.push(shownOf(files.scenes)); }
    for (const [id, json] of Object.entries(plan.editions)) if (!unchanged(files.editions[id], json)) { write(files.editions[id], json); report.files.push(shownOf(files.editions[id])); }
    const after = loadStory(story.dir, { registry: story.registryFile });
    if (plan.retired.length) {
      const before = new Set(fs.existsSync(files.parked) ? (readJson(files.parked).parked || []).map((e) => e.file) : []);
      const { parked } = park(after, `retired on ${plan.now.slice(0, 10)} by variant ${composed.name}`);
      report.parked = parked.map((e) => e.file).filter((f) => !before.has(f));
      report.files.push(shownOf(files.parked));
    }
    const built = buildStory(after);
    report.files.push(...built.written);
    const written = renderEdition(after, editionId);
    const slots = new Set(plan.slots.map((s) => s.slot));
    const diffs = compareTexts(plan.tested.text, written, { slots });
    if (diffs.length) {
      const d = diffs[0];
      throw new StoryError([`after the write, ${editionId} does not render as the tested text (${d.where}, line ${d.line}: the test read ${quote(d.a)}, the records render ${quote(d.b)}). Every file was put back as it was. This is a defect in the apply step, not in your story: please report it with the variant`]);
    }
    const spreads = splitSpreads(written).blocks.length;
    report.verified = `${editionId} renders equal to the tested text: ${spreads} spread${spreads === 1 ? "" : "s"} compared, 0 differences${slots.size ? `; ${slots.size} slot${slots.size === 1 ? "" : "s"} compared by position only (the words are the author's)` : ""}`;
    const gate = spawnSync(process.execPath, [path.join(HERE, "check.mjs")], { cwd: after.registry._root, encoding: "utf8", env: { ...process.env, CHARACTER_REGISTRY: after.registryFile } });
    if (gate.status !== 0) throw new StoryError([...(gate.stderr || gate.stdout || "").trim().split("\n").filter(Boolean), `the names gate fails after the write (above). Every file was put back as it was. Fix: if the lines name the story's records, a phrase in the variant writes a name no token covers; if they name other files, fix those first and apply again`]);
    const applied = fs.existsSync(files.applied) ? readJson(files.applied) : { _about: `What node scripts/story-variants.mjs apply wrote into this story folder, one entry per run, newest last: the variant and the edition it was tested on, every field it changed (names put back as tokens), the spreads it retired and the pictures it parked, the banner it set, what it left for the author (a slot per added spread, with its position in every edition and the tested draft), and the check that the written records render as the tested text. Written by the apply step; read as a record. A slot's words are never written by this tool.`, applied: [] };
    applied.applied = [...(applied.applied || []), { ...report, files: undefined }];
    write(files.applied, applied);
    report.files.push(shownOf(files.applied));
  } catch (e) {
    restore();
    throw e;
  }
  return report;
}

// ---- command line ----

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const VALUE_FLAGS = new Set(["--registry", "--tested"]);
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? "" : argv[i + 1] || ""; };
  const [command, dir, editionId, specIn] = argv.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
  const usage = () => { console.error("usage: node scripts/story-variants.mjs <list|render|diff|apply> <story-folder> [<edition> <variant>] [--tested <file>] [--dry-run] [--registry <path>]"); process.exit(2); };
  if (!["list", "render", "diff", "apply"].includes(command) || !dir) usage();
  if (command !== "list" && !editionId) usage();
  const spec = specIn || BASE;
  const fail = (e) => { for (const line of (e.problems || [e.message])) console.error(line); console.error(`story-variants: fail`); process.exit(e.exitCode || 1); };
  let story, doc;
  try { story = loadStory(dir, { registry: flag("--registry") || undefined }); }
  catch (e) { for (const line of (e.problems || [e.message])) console.error(line); console.error(`story-variants: fail: ${rel(process.cwd(), path.resolve(dir))} could not be loaded`); process.exit(e.exitCode || 1); }
  try { doc = spec === BASE && command !== "list" ? { shown: `${story.shown}/variants.json`, variants: {} } : loadVariants(story); } catch (e) { fail(e); }
  try {
    if (command === "list") {
      const names = Object.keys(doc.variants);
      console.log(`${doc.shown}: ${names.length} variant${names.length === 1 ? "" : "s"}. base is the text as the records are; join names with + to test them together (a+b).`);
      for (const name of names) {
        console.log(`${name}: ${doc.variants[name].about}`);
        for (const step of doc.variants[name].steps) console.log(`  ${describeStep(step)}`);
      }
    } else if (command === "render") {
      process.stdout.write(testedEdition(story, editionId, composeVariant(doc, spec)).text);
    } else if (command === "diff") {
      for (const line of diffVariant(story, editionId, composeVariant(doc, spec))) console.log(line);
    } else if (command === "apply") {
      const testedFile = flag("--tested");
      const tested = testedFile ? fs.readFileSync(testedFile, "utf8") : undefined;
      const composed = composeVariant(doc, spec);
      const report = applyVariant(story, editionId, composed, { tested, testedFile: testedFile ? rel(process.cwd(), path.resolve(testedFile)) : undefined, dryRun: argv.includes("--dry-run") });
      const say = (m) => console.log(`story-variants: ${m}`);
      if (argv.includes("--dry-run")) say(`dry run of ${composed.name} on ${editionId}: what apply would write`);
      for (const c of report.changed) say(`${c}: written as tokens`);
      for (const slug of report.retired) say(`${slug}: retired in every edition${report.parked.length ? "" : " (its pictures are parked when applied)"}`);
      for (const f of report.parked) say(`${f}: parked (retired on ${report.applied.slice(0, 10)} by variant ${composed.name})`);
      if (report.banner) say(`${report.banner}: banner written as tokens`);
      for (const s of report.left) say(`${s.slot}: a slot ${s.after ? "after" : "before"} ${s.after ?? s.before} (${Object.entries(s.positions).map(([id, p]) => `${id}: ${p === "retired" ? "retired" : `spread ${p}`}`).join("; ")}); its words are the author's: the tested draft is the _draft note on its record, nothing is in its fields`);
      if (report.files.length) say(`wrote ${report.files.join(", ")}`);
      say(`verified: ${report.verified}`);
      if (!argv.includes("--dry-run")) say(`next: node scripts/story.mjs check ${story.shown}, then commit the story folder${report.left.length ? `; the slot${report.left.length === 1 ? "" : "s"} wait${report.left.length === 1 ? "s" : ""} for your words` : ""}`);
    }
  } catch (e) { fail(e); }
}
