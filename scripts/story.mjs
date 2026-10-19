#!/usr/bin/env node
/**
 * story.mjs: the story as records and reading orders. The loader and the renderer behind the three story gates.
 *
 *   node scripts/story.mjs list   <story-folder>              every scene with its spread number in each edition
 *   node scripts/story.mjs render <story-folder> <edition>    one edition as a reader meets it, to stdout
 *   node scripts/story.mjs build  <story-folder>              writes <story-folder>/built/<edition>.txt for every edition
 *   node scripts/story.mjs check  <story-folder>              the three gates: built output, pictures, retirements
 *   every command takes --registry <path> (default: character-registry.json in the current folder)
 *
 * A story folder holds:
 *   scenes.json          one record per scene, keyed by slug (scripts/scene.v1.schema.json); names are {{id}} tokens
 *   editions/<id>.json   one reading order each: order[] of slugs and retired[] (scripts/edition.v1.schema.json)
 *   art/                 every picture, named after its scene; the folder and a prefix are declared in scenes.json
 *   parked-art.json      every picture nothing loads, with a reason; and the owner's notes for any picture removed
 *   built/<id>.txt       output: each edition rendered as a reader meets it; never edited, always rebuilt
 *
 * The loader derives every spread number from its position in an edition and refuses a slug the story lacks, a slug
 * listed twice, a slug both placed and retired, and a scene neither placed nor retired, so a scene is never lost by being
 * forgotten. The renderer prints each spread with its title, the PICTURE line (what the picture shows), the paragraphs,
 * the dialogue, the margin note and the footnote, names resolved through names.mjs, so built output can be diffed against
 * the source. Exit 1 on a named problem, 2 on usage.
 *
 * A slug that starts with new- is a slot: a spread the story needs and the author has not written (scripts/story-variants.mjs
 * makes one from a tested draft). A slot holds notes only (keys starting with _, such as _draft); it is placed or retired in
 * every edition like any scene, renders as a SLOT block, and the loader refuses one whose words (paragraphs, dialogue) or
 * other fields are filled in: the words of a spread are the author's, and the author claims them by renaming the slot.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadNames } from "./names.mjs";
import { loadRegistry, readJson, registryPath, validate } from "./lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCENE_SCHEMA_PATH = path.join(HERE, "scene.v1.schema.json");
export const EDITION_SCHEMA_PATH = path.join(HERE, "edition.v1.schema.json");
export const SLUG = /^[a-z0-9][a-z0-9-]*$/;
/** A slug that starts with new- names a slot: a spread the author has not written yet, holding notes only. */
export const isSlot = (slug) => typeof slug === "string" && slug.startsWith("new-");
/** The fields of a scene record that the built text prints and the round trip reads back, in print order. */
export const TEXT_FIELDS = ["part", "title", "picture", "time", "paragraphs", "dialogue", "margin_note", "margin_author", "footnote"];

/** The error a story that cannot be loaded throws: one line per problem under `problems`, the file named in each. */
export class StoryError extends Error {
  constructor(problems) {
    super(problems.join("\n"));
    this.problems = problems;
    this.exitCode = 1;
  }
}

const rel = (from, to) => path.relative(from, to).split(path.sep).join("/") || ".";

/**
 * Load a story folder: scenes.json, every editions/<id>.json, the registry's names. Throws a StoryError listing every
 * problem the files have, so one run shows them all. `registry` is the registry file (default: the one registryPath finds).
 */
export function loadStory(dir, { registry: registryFile } = {}) {
  const folder = path.resolve(dir);
  const shown = rel(process.cwd(), folder);
  const problems = [];
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) throw new StoryError([`${shown} is not a folder. Fix: give the folder that holds scenes.json and editions/`]);
  const sceneFile = path.join(folder, "scenes.json");
  if (!fs.existsSync(sceneFile)) throw new StoryError([`${shown}/scenes.json is missing. Fix: the story folder holds scenes.json (the records) and editions/ (the reading orders)`]);
  const scenesJson = readJson(sceneFile);
  const sceneShown = `${shown}/scenes.json`;
  // a slot (new-*) holds notes only; it is checked here in plain words, and the schema sees the scenes without it
  const slotProblems = [];
  const allScenes = scenesJson.scenes && typeof scenesJson.scenes === "object" && !Array.isArray(scenesJson.scenes) ? scenesJson.scenes : {};
  for (const [slug, scene] of Object.entries(allScenes)) {
    if (!isSlot(slug) || !scene || typeof scene !== "object" || Array.isArray(scene)) continue;
    const fields = Object.keys(scene).filter((k) => !k.startsWith("_"));
    if (!fields.length) continue;
    const words = fields.filter((k) => k === "paragraphs" || k === "dialogue");
    const claim = `give the spread its real name: rename ${slug} to a slug without new- here and in every edition, and fill in title, picture, time, layout and art`;
    if (words.length) slotProblems.push(`${sceneShown}: ${slug} is a slot (its slug starts with new-), and a slot's words are the author's, but ${words.join(" and ")} ${words.length === 1 ? "is" : "are"} filled in. Fix: if the words are yours, ${claim}; if they are a draft, keep it under _draft and take ${words.join(" and ")} out`);
    else slotProblems.push(`${sceneShown}: ${slug} is a slot (its slug starts with new-): it holds notes only (keys starting with _), but it has ${fields.join(", ")}. Fix: when the spread is written, ${claim}; until then keep notes only`);
  }
  const forSchema = stripNotes(scenesJson);
  if (forSchema.scenes && typeof forSchema.scenes === "object") forSchema.scenes = Object.fromEntries(Object.entries(forSchema.scenes).filter(([slug]) => !isSlot(slug)));
  for (const p of validate(readJson(SCENE_SCHEMA_PATH), forSchema)) problems.push(`${sceneShown}: ${plainSchema(p)}`);
  problems.push(...slotProblems);
  if (problems.length) throw new StoryError(problems);

  const layouts = scenesJson.layouts || {};
  if (!Object.keys(layouts).length) problems.push(`${sceneShown}: layouts is empty. Fix: declare at least one page shape, such as "single": { "pictures": 1 }`);
  const artFolder = path.join(folder, scenesJson.art_folder || "art");
  const artPrefix = scenesJson.art_prefix || "";
  const scenes = scenesJson.scenes || {};
  for (const [slug, scene] of Object.entries(scenes)) {
    if (isSlot(slug)) continue;
    const at = `${sceneShown}: ${slug}`;
    const layout = layouts[scene.layout];
    if (!layout) problems.push(`${at}: layout "${scene.layout}" is not a key of layouts (${Object.keys(layouts).join(", ") || "none declared"}). Fix: use one of them, or declare it`);
    else if ((scene.art || []).length !== layout.pictures) problems.push(`${at}: layout "${scene.layout}" carries ${layout.pictures} picture(s) but art lists ${(scene.art || []).length}. Fix: list exactly ${layout.pictures} file name(s) under art, or change the layout`);
    for (const [i, name] of (scene.art || []).entries()) {
      const stem = path.basename(name, path.extname(name));
      if (name !== path.basename(name)) problems.push(`${at}: art[${i}] "${name}" has a folder in it. Fix: write the file name only; every picture lives in ${rel(folder, artFolder)}/`);
      else if (!stem.startsWith(`${artPrefix}${slug}`)) problems.push(`${at}: art[${i}] "${name}" is not named after its scene. Fix: rename the file to ${artPrefix}${slug}${layout && layout.pictures > 1 ? `-${i + 1}` : ""}${path.extname(name) || ".png"} (a picture is always traceable to its spread, parked or not)`);
    }
    if (!(scene.paragraphs || []).length && !(scene.dialogue || []).length) problems.push(`${at}: says nothing: no paragraphs and no dialogue. Fix: write at least one paragraph or one line of dialogue`);
  }

  const editionsDir = path.join(folder, "editions");
  const editionFiles = fs.existsSync(editionsDir) ? fs.readdirSync(editionsDir).filter((f) => f.endsWith(".json")).sort() : [];
  if (!editionFiles.length) problems.push(`${shown}/editions/ has no edition. Fix: write editions/<id>.json with "title" and "order" (the scene slugs in reading order)`);
  const editions = {};
  const editionSchema = readJson(EDITION_SCHEMA_PATH);
  const slugs = Object.keys(scenes);
  for (const file of editionFiles) {
    const id = file.replace(/\.json$/, "");
    const edShown = `${shown}/editions/${file}`;
    if (!SLUG.test(id)) { problems.push(`${edShown}: the file name is the edition id, and an id uses only lower-case letters, digits and hyphens. Fix: rename the file`); continue; }
    const json = readJson(path.join(editionsDir, file));
    const edProblems = validate(editionSchema, stripNotes(json)).map((p) => `${edShown}: ${plainSchema(p)}`);
    if (edProblems.length) { problems.push(...edProblems); continue; }
    const seen = new Set();
    for (const slug of json.order) {
      if (!scenes[slug]) problems.push(`${edShown}: order names "${slug}", which is not a scene in scenes.json${closest(slug, slugs)}. Fix: correct the slug, or add the scene first`);
      if (seen.has(slug)) problems.push(`${edShown}: "${slug}" is listed twice in order. Fix: a scene is read once in an edition; remove one`);
      seen.add(slug);
    }
    const retired = new Set();
    for (const slug of json.retired || []) {
      if (!scenes[slug]) problems.push(`${edShown}: retired names "${slug}", which is not a scene in scenes.json${closest(slug, slugs)}. Fix: correct the slug (a retired scene keeps its record; nothing is deleted)`);
      if (seen.has(slug)) problems.push(`${edShown}: "${slug}" is both in order and retired. Fix: a scene is read, or retired, not both; remove it from one list`);
      if (retired.has(slug)) problems.push(`${edShown}: "${slug}" is listed twice in retired. Fix: remove one`);
      retired.add(slug);
    }
    const missing = slugs.filter((s) => !seen.has(s) && !retired.has(s));
    if (missing.length) problems.push(`${edShown}: ${missing.length === 1 ? "a scene is" : "scenes are"} neither placed nor retired: ${missing.join(", ")}. Fix: add ${missing.length === 1 ? "it" : "each"} to order where it is read, or to retired if it is read in no spread of this edition`);
    editions[id] = { id, file: path.join(editionsDir, file), title: json.title, banner: json.banner, order: [...json.order], retired: [...retired] };
  }
  if (problems.length) throw new StoryError(problems);

  const registryAbs = registryFile ? path.resolve(registryFile) : registryPath();
  const registry = loadRegistry(registryAbs);
  const names = loadNames(registry._root);
  const storyId = scenesJson.story;
  const resolved = {};
  for (const [slug, scene] of Object.entries(scenes)) {
    // a slot renders as a SLOT block; its notes (the tested draft) are never resolved, never printed
    if (isSlot(slug)) { resolved[slug] = { slot: slug }; continue; }
    try { resolved[slug] = names.resolveDeep(scene, storyId); }
    catch (e) { problems.push(`${sceneShown}: ${slug}: ${e.message.replace(/^names: /, "")}`); }
  }
  // an edition's title and banner are token sources too ("{{sam-hayes}} first"); the reader meets the name
  for (const edition of Object.values(editions)) {
    for (const key of ["title", "banner"]) {
      if (edition[key] === undefined) continue;
      try { edition[key] = names.resolveTokens(edition[key], storyId); }
      catch (e) { problems.push(`${rel(process.cwd(), edition.file)}: ${key}: ${e.message.replace(/^names: /, "")}`); }
    }
  }
  if (problems.length) throw new StoryError(problems);

  const story = {
    dir: folder,
    shown,
    file: sceneFile,
    raw: scenesJson,
    title: scenesJson.title,
    story: storyId,
    artFolder,
    artPrefix,
    layouts,
    scenes,
    resolved,
    editions,
    names,
    registry,
    registryFile: registryAbs,
  };
  story.spreads = (editionId) => spreadsOf(story, editionId);
  story.positions = () => positionsOf(story);
  story.placed = () => new Set(Object.values(editions).flatMap((e) => e.order));
  story.retiredEverywhere = () => slugs.filter((s) => !story.placed().has(s));
  story.slots = () => slugs.filter(isSlot);
  story.referencedArt = () => new Set([...story.placed()].flatMap((slug) => scenes[slug].art || []));
  return story;
}

/** The spreads of one edition, numbered by position, each the resolved scene plus number, of, slug and edition. */
export function spreadsOf(story, editionId) {
  const edition = story.editions[editionId];
  if (!edition) {
    const ids = Object.keys(story.editions);
    throw new StoryError([`${story.shown} has no edition "${editionId}". ${ids.length ? `Its editions are ${ids.join(", ")}` : "It has no editions yet"}. Fix: name one of them, or write editions/${editionId}.json`]);
  }
  const of = edition.order.length;
  return edition.order.map((slug, i) => ({ number: i + 1, of, slug, edition: editionId, ...story.resolved[slug] }));
}

/** slug -> { editionId: spread number, or "retired" } for every scene and every edition. */
export function positionsOf(story) {
  const out = new Map(Object.keys(story.scenes).map((slug) => [slug, {}]));
  for (const [id, edition] of Object.entries(story.editions)) {
    edition.order.forEach((slug, i) => { out.get(slug)[id] = i + 1; });
    for (const slug of edition.retired) out.get(slug)[id] = "retired";
  }
  return out;
}

/** The line a slot prints under its SLOT line: the one sentence that says whose the words are. */
export const SLOT_LINE = "This spread is not written yet: its words are the author's. The draft that was tested is a note on its record, and nothing of it is printed.";

/** One spread the way a reader meets it: the header, then what is on the page, in reading order, names resolved. */
export function renderSpread(spread) {
  const lines = [`=== SPREAD ${spread.number} OF ${spread.of} ===`];
  if (spread.slot) { lines.push(`SLOT: ${spread.slot}`, SLOT_LINE, ""); return lines.join("\n"); }
  if (spread.part) lines.push(`PART: ${spread.part}`);
  lines.push(`TITLE: ${spread.title}`, `PICTURE: ${spread.picture}`, `TIME: ${spread.time}`, "");
  for (const p of spread.paragraphs || []) lines.push(p, "");
  if (spread.dialogue?.length) {
    lines.push("DIALOGUE:");
    for (const d of spread.dialogue) lines.push(`  ${d.speaker}: ${d.text}`);
    lines.push("");
  }
  if (spread.margin_note) lines.push(`MARGIN NOTE: ${spread.margin_note}${spread.margin_author ? ` — ${spread.margin_author}` : ""}`, "");
  if (spread.footnote) lines.push(`FOOTNOTE: ${spread.footnote}`, "");
  return lines.join("\n");
}

/** The lines above the first spread: the story and edition titles with the spread count, a fixed line, the banner when the edition has one, a blank line. */
export function renderHeader(story, edition, count, banner = edition.banner) {
  return `${story.title.toUpperCase()} (${edition.title}): ${count} spread${count === 1 ? "" : "s"}, read in order.\nEach spread has a picture; the PICTURE line says what it shows.\n${banner ? `BANNER: ${banner}\n` : ""}\n`;
}

/** The header and spread texts joined the way built output is written; throws if a token survived rendering. */
export function joinEdition(story, editionId, header, spreadTexts) {
  const body = header + spreadTexts.join("\n") + "\n";
  const left = [...new Set([...body.matchAll(/\{\{[^{}\n]*\}\}/g)].map((m) => m[0]))];
  if (left.length) throw new StoryError([`${story.shown}: edition ${editionId} still holds ${left.slice(0, 3).join(", ")} after rendering. Fix: ids use only lower-case letters, digits and hyphens; check the registry`]);
  return body;
}

/** One edition as a reader meets it: a header line, then every spread in order. Deterministic: the built-output gate diffs it. */
export function renderEdition(story, editionId) {
  const spreads = spreadsOf(story, editionId);
  return joinEdition(story, editionId, renderHeader(story, story.editions[editionId], spreads.length), spreads.map(renderSpread));
}

/** Built output written for every edition; stale files for editions that no longer exist are removed (built/ is output). */
export function buildStory(story) {
  const builtDir = path.join(story.dir, "built");
  fs.mkdirSync(builtDir, { recursive: true });
  const written = [];
  for (const id of Object.keys(story.editions).sort()) {
    const file = path.join(builtDir, `${id}.txt`);
    fs.writeFileSync(file, renderEdition(story, id));
    written.push(rel(process.cwd(), file));
  }
  const removed = [];
  for (const f of fs.readdirSync(builtDir).filter((f) => f.endsWith(".txt")).sort()) {
    if (!story.editions[f.replace(/\.txt$/, "")]) { fs.unlinkSync(path.join(builtDir, f)); removed.push(rel(process.cwd(), path.join(builtDir, f))); }
  }
  return { written, removed };
}

/** The story's picture files on disk and in git: what is there, what is tracked, what is deleted but not yet forgotten. */
export function artState(story) {
  const art = story.artFolder;
  const onDisk = new Set(fs.existsSync(art) ? fs.readdirSync(art).filter((f) => !f.startsWith(".") && fs.statSync(path.join(art, f)).isFile()).sort() : []);
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_(DIR|INDEX_FILE|WORK_TREE|COMMON_DIR|PREFIX)$/.test(k)));
  let inGit = false, top = "";
  try { top = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: story.dir, env, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); inGit = Boolean(top); } catch { inGit = false; }
  // git is run from the top of the checkout, so the art folder's path is relative to it, whatever the current folder is
  const git = (args) => execFileSync("git", args, { cwd: top, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).split("\0").filter(Boolean);
  const base = (p) => path.basename(p);
  const tracked = new Set(), deleted = new Set();
  if (inGit) {
    const artRel = rel(top, art);
    for (const f of git(["ls-files", "-z", "--", artRel])) tracked.add(base(f));
    for (const f of git(["ls-files", "-z", "--deleted", "--", artRel])) deleted.add(base(f));
    try { for (const f of git(["diff", "--cached", "--name-only", "--no-renames", "--diff-filter=D", "-z", "--", artRel])) deleted.add(base(f)); } catch {}
  }
  return { folder: art, shown: rel(process.cwd(), art), onDisk, inGit, tracked, deleted };
}

/** parked-art.json, read and checked for shape: parked[] { file, reason }, removed[] { file, note }. */
export function readParked(story) {
  const file = path.join(story.dir, "parked-art.json");
  const shown = rel(process.cwd(), file);
  if (!fs.existsSync(file)) return { file, shown, parked: [], removed: [], problems: [`${shown} is missing. Fix: node scripts/check-story-art.mjs ${story.shown} --park --reason "<why these pictures are kept>" writes it`] };
  let json;
  try { json = readJson(file); } catch (e) { return { file, shown, parked: [], removed: [], problems: [e.message] }; }
  const problems = [];
  const list = (key, field) => {
    const items = json[key];
    if (items === undefined) return [];
    if (!Array.isArray(items)) { problems.push(`${shown}: ${key} must be a list`); return []; }
    return items.map((e, i) => {
      if (!e || typeof e !== "object" || typeof e.file !== "string" || !e.file.trim()) { problems.push(`${shown}: ${key}[${i}] has no file. Fix: { "file": "<picture file name>", "${field}": "<why>" }`); return null; }
      if (typeof e[field] !== "string" || !e[field].trim()) problems.push(`${shown}: ${key}[${i}] (${e.file}) has no ${field}. Fix: say in one line why${key === "parked" ? " it is kept" : " it was removed, and who decided"}`);
      return { file: e.file, [field]: e[field] };
    }).filter(Boolean);
  };
  return { file, shown, parked: list("parked", "reason"), removed: list("removed", "note"), problems };
}

function stripNotes(value) {
  if (Array.isArray(value)) return value.map(stripNotes);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([k]) => !k.startsWith("_")).map(([k, v]) => [k, stripNotes(v)]));
  return value;
}

function plainSchema(problem) {
  return problem
    .replace(/^\$\.scenes: unknown field (.+?)(?: \(ids are lower-case, digits and hyphens\))?$/, (m, slug) => `scene id "${slug}" is not allowed: a slug uses only lower-case letters, digits and hyphens. Fix: change it to "${slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}" here and in every edition`)
    .replace(/^\$\.scenes\.([^.:]+)\.?([^:]*): (.*)$/, (m, slug, field, rest) => `${slug}${field ? `: ${field}` : ""}: ${rest}`)
    .replace(/^\$\.?/, "")
    .replace(/^: /, "");
}

/** " (did you mean ...?)" for a typed slug near one the story has, else an empty string. */
export function closest(typed, ids) {
  const near = ids.filter((id) => id.includes(typed) || typed.includes(id) || distance(id, typed) <= 2).slice(0, 2);
  return near.length ? ` (did you mean ${near.map((n) => `"${n}"`).join(" or ")}?)` : "";
}

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Shared by the gate scripts: parse <story-folder> and --registry, load the story, run, print, exit. */
export async function runGate(name, argv, fn) {
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? "" : argv[i + 1] || ""; };
  const VALUE_FLAGS = new Set(["--registry", "--reason"]);
  const positional = argv.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
  const dir = positional[0];
  if (!dir) { console.error(`usage: node scripts/${name}.mjs <story-folder> [--registry <path>]`); process.exit(2); }
  let story;
  try { story = loadStory(dir, { registry: flag("--registry") || undefined }); }
  catch (e) { for (const line of (e.problems || [e.message])) console.error(line); console.error(`${name}: fail: the story could not be loaded`); process.exit(e.exitCode || 1); }
  const { failures = [], notes = [], summary = "" } = await fn(story, { argv, flag });
  for (const n of notes) console.log(`${name}: ${n}`);
  if (failures.length) { for (const f of failures) console.error(f); console.error(`${name}: fail (${failures.length} problem(s))`); process.exit(1); }
  console.log(`${name}: pass${summary ? ` (${summary})` : ""}`);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const [command, dir, editionId] = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--registry");
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? "" : argv[i + 1] || ""; };
  const usage = () => { console.error("usage: node scripts/story.mjs <list|render|build|check> <story-folder> [<edition>] [--registry <path>]"); process.exit(2); };
  if (!["list", "render", "build", "check"].includes(command) || !dir) usage();
  let story;
  try { story = loadStory(dir, { registry: flag("--registry") || undefined }); }
  catch (e) { for (const line of (e.problems || [e.message])) console.error(line); console.error(`story: fail: ${rel(process.cwd(), path.resolve(dir))} could not be loaded`); process.exit(e.exitCode || 1); }
  try {
    if (command === "list") {
      const ids = Object.keys(story.editions);
      const positions = story.positions();
      const retired = story.retiredEverywhere();
      console.log(`${story.title}: ${Object.keys(story.scenes).length} scene(s), ${ids.length} edition(s) (${ids.join(", ")})${retired.length ? `, ${retired.length} retired in every edition` : ""}.`);
      const width = Math.max(4, ...Object.keys(story.scenes).map((s) => s.length));
      const cols = ids.map((id) => Math.max(id.length, 7));
      console.log(["slug".padEnd(width), ...ids.map((id, i) => id.padEnd(cols[i])), "title"].join("  "));
      for (const [slug, at] of positions) console.log([slug.padEnd(width), ...ids.map((id, i) => String(at[id] ?? "").padEnd(cols[i])), isSlot(slug) ? "(slot: not written yet; the words are the author's)" : story.scenes[slug].title].join("  "));
    } else if (command === "render") {
      if (!editionId) usage();
      process.stdout.write(renderEdition(story, editionId));
    } else if (command === "build") {
      const { written, removed } = buildStory(story);
      for (const f of written) console.log(`story: wrote ${f} (built output, do not edit)`);
      for (const f of removed) console.log(`story: removed ${f}: no edition of that name`);
    } else if (command === "check") {
      // each gate runs as its own process, exactly as a person runs it by hand (a dynamic import here would be a cycle)
      const gates = ["check-story-built", "check-story-art", "check-story-retired"];
      const passthrough = flag("--registry") ? ["--registry", flag("--registry")] : [];
      let failed = 0;
      for (const g of gates) {
        const r = spawnSync(process.execPath, [path.join(HERE, `${g}.mjs`), dir, ...passthrough], { stdio: "inherit" });
        if (r.status !== 0) failed += 1;
      }
      if (failed) { console.error(`story: fail (${failed} of ${gates.length} gates failed)`); process.exit(1); }
      console.log(`story: pass (${Object.keys(story.scenes).length} scenes, ${Object.keys(story.editions).length} editions: built output current, every picture accounted for, nothing deleted)`);
    }
  } catch (e) {
    for (const line of (e.problems || [e.message])) console.error(line);
    process.exit(e.exitCode || 1);
  }
}
