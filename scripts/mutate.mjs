#!/usr/bin/env node
/**
 * mutate.mjs: the single mutation gate. Every change to a story's records, reading orders and parked pictures goes
 * through here, so every invariant is checked in one place and every change leaves one entry in the worklog.
 *
 *   node scripts/mutate.mjs add-scene    <story-folder> --slug <slug> --payload <json-file> [--after <slug>] --author <who> --reason <text>
 *   node scripts/mutate.mjs update-scene <story-folder> --slug <slug> --patch <json-file> --author <who> --reason <text>
 *   node scripts/mutate.mjs retire-scene <story-folder> --slug <slug> (--market-test <id> | --owner-auth <text>) --author <who> --reason <text>
 *   node scripts/mutate.mjs set-prop     <story-folder> --slug <slug> --prop <prop-id> --intrinsic-wrist <left|right>
 *                                        --camera-facing <facing|back|profile> [--toward <screen-left|screen-right>] --author <who> [--reason <text>]
 *   node scripts/mutate.mjs verify       <story-folder>
 *   every command takes --registry <path> (default: character-registry.json in the current folder);
 *   every mutation takes --worklog <repo> (default: the nearest folder above the story that holds worklog/log.jsonl)
 *   and may carry --market-test <id> or --owner-auth <text> to authorize a change that loses a value.
 *   <who> is agent:<name> or human:<name>.
 *
 * The invariants, each checked before anything is written (docs/3-reference/SINGLE-MUTATION-GATE-ARCHITECTURE.md):
 *   1. Additive only. A change that loses a value (a field removed, an item dropped from a list, a value overwritten,
 *      a scene taken out of a reading order) is refused unless --market-test names a test in <story>/market-tests.json
 *      that the author authorized and that lists the scene, or --owner-auth carries the owner's words. retire-scene
 *      always needs one of them. Nothing is ever deleted from disk: a retired scene keeps its record and its picture.
 *   2. Names are tokens. A written-out character or prop name in any string fails, with the token to write; characters,
 *      narrator and dialogue speakers are tokens of registered people; props are registry ids of kind prop.
 *   3. Laterality. Any change to props, prop_blocking or the picture line runs check-prop-continuity.mjs: the prop's
 *      wrist is declared, its screen side is computed from the camera facing (facing camera: the left wrist is on
 *      screen-right; back to camera: screen-left; profile: near or far side), it agrees with the canon in
 *      <story>/wardrobe-and-props.json when that file exists, and the picture line does not mix screen and body sides.
 *   4. Pictures. A picture a spread now loads leaves parked-art.json; a picture no placed spread loads any more is
 *      parked there with the reason. A picture a payload names must already be in the art folder.
 *   5. Audit. After the files are written, built/ is rebuilt and the three story gates run; then one worklog entry is
 *      appended through scripts/worklog-append.mjs with the author, the reason, the authorization and the diff.
 *      Any failure puts every file back as it was.
 * Exit 0 on success, 1 when an invariant refuses the change (the reason and the fix are printed), 2 on usage.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadStory, buildStory, readParked, isSlot, SLUG, closest } from "./story.mjs";
import { readJson, writeJsonLike } from "./lib.mjs";
import { atomicLabels, labelRegExp, TOKEN } from "./names.mjs";
import { projectLaterality, validatePropLateralityRegistry, lintPromptLaterality } from "./check-prop-continuity.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const COMMANDS = ["add-scene", "update-scene", "retire-scene", "set-prop", "verify"];
const VALUE_FLAGS = ["slug", "payload", "patch", "after", "author", "reason", "market-test", "owner-auth", "prop", "intrinsic-wrist", "camera-facing", "toward", "registry", "worklog"];
export const AUTHOR = /^(agent|human|operator|system):[A-Za-z0-9._-]+$/;
export const WRISTS = ["left", "right"];
export const FACINGS = ["facing", "back", "profile"];
export const TOWARDS = ["screen-left", "screen-right"];
/** The fields whose change makes the laterality check run: the props, their blocking, and the picture line (the prompt). */
export const LATERALITY_FIELDS = ["props", "prop_blocking", "picture"];

/** A refusal: the change breaks an invariant (exit 1) or the command is malformed (exit 2). One line per problem. */
export class Refusal extends Error {
  constructor(problems, exitCode = 1) {
    const list = Array.isArray(problems) ? problems : [problems];
    super(list.join("\n"));
    this.problems = list;
    this.exitCode = exitCode;
  }
}

const rel = (from, to) => path.relative(from, to).split(path.sep).join("/") || ".";
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isObject = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const today = () => new Date().toISOString().slice(0, 10);

/** argv -> { command, dir, flags }. Throws a usage Refusal (exit 2) on an unknown flag, a flag without a value, or a stray word. */
export function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { positional.push(a); continue; }
    const key = a.slice(2);
    if (!VALUE_FLAGS.includes(key)) throw new Refusal(`unknown flag --${key}. The flags are ${VALUE_FLAGS.map((f) => `--${f}`).join(", ")}`, 2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) throw new Refusal(`--${key} needs a value`, 2);
    if (key in flags) throw new Refusal(`--${key} is given twice. Fix: give it once`, 2);
    flags[key] = value;
    i += 1;
  }
  const [command, dir, ...rest] = positional;
  if (!COMMANDS.includes(command)) throw new Refusal(`usage: node scripts/mutate.mjs <${COMMANDS.join("|")}> <story-folder> [flags]`, 2);
  if (!dir) throw new Refusal(`usage: node scripts/mutate.mjs ${command} <story-folder> [flags]: the story folder is missing`, 2);
  if (rest.length) throw new Refusal(`unexpected word(s) ${rest.map((r) => `"${r}"`).join(", ")}. Fix: every value follows its flag`, 2);
  return { command, dir, flags };
}

/** RFC 7386 JSON merge patch: an object merges key by key, null removes a key, anything else replaces. */
export function mergePatch(target, patch) {
  if (!isObject(patch)) return clone(patch);
  const out = isObject(target) ? clone(target) : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else out[k] = mergePatch(out[k], v);
  }
  return out;
}

/** True when every item of `old` appears in `next` in the same order (items may be added before, between or after). */
export function isSubsequence(old, next) {
  let j = 0;
  for (const item of next) if (j < old.length && same(item, old[j])) j += 1;
  return j === old.length;
}

/**
 * Every value `before` holds that `after` no longer holds, as plain lines: a removed field, a list that dropped or
 * replaced an item, an overwritten value. An empty list means the change is purely additive.
 */
export function losses(before, after, at = "") {
  const out = [];
  const where = at || "the record";
  if (isObject(before) && isObject(after)) {
    for (const [k, v] of Object.entries(before)) {
      const p = at ? `${at}.${k}` : k;
      if (!(k in after)) out.push(`${p} would be removed`);
      else out.push(...losses(v, after[k], p));
    }
    return out;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    if (!isSubsequence(before, after)) out.push(`${where} would drop or replace ${before.length > after.length ? `${before.length - after.length} item(s)` : "an item"} (only additions keep every item in order)`);
    return out;
  }
  if (!same(before, after)) out.push(`${where} would be overwritten: ${short(before)} -> ${short(after)}`);
  return out;
}

const short = (v) => { const s = JSON.stringify(v); return s.length > 80 ? `${s.slice(0, 77)}...` : s; };

/** A structural diff for the audit entry: [{ path, op: add|remove|replace, before, after }]. Lists are compared whole. */
export function diffJson(before, after, at = "") {
  if (same(before, after)) return [];
  if (isObject(before) && isObject(after)) {
    const out = [];
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const p = at ? `${at}.${k}` : k;
      if (!(k in after)) out.push({ path: p, op: "remove", before: before[k] });
      else if (!(k in before)) out.push({ path: p, op: "add", after: after[k] });
      else out.push(...diffJson(before[k], after[k], p));
    }
    return out;
  }
  if (before === undefined) return [{ path: at, op: "add", after }];
  if (after === undefined) return [{ path: at, op: "remove", before }];
  return [{ path: at, op: "replace", before, after }];
}

/** Every string under `value`, with its path, skipping notes (keys starting with _) and $schema. */
function strings(value, at = "", out = []) {
  if (typeof value === "string") out.push([at, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${at}[${i}]`, out));
  else if (isObject(value)) for (const [k, v] of Object.entries(value)) if (!k.startsWith("_") && k !== "$schema") strings(v, at ? `${at}.${k}` : k, out);
  return out;
}

/** Written-out registry labels (a character's name, alias, form; a prop's name) in any string of `value`, each with its token. */
export function typedNames(registry, value, where = "payload") {
  const { list } = atomicLabels(registry.characters || {});
  const out = [];
  for (const [at, text] of strings(value)) {
    const bare = text.replace(TOKEN, " ");
    for (const [label, token] of list) {
      if (labelRegExp(label, "").test(bare)) { out.push(`${where}: ${at || "text"} writes the name "${label}". Fix: write the token ${token}; names live in the registry, never in a record`); break; }
    }
  }
  return out;
}

const PERSON_KINDS = new Set(["person", "companion"]);
const ONE_TOKEN = /^\{\{([a-z0-9][a-z0-9-]*)(?::[a-z]+)?\}\}$/;

/** Who and what a scene record names, checked against the registry: people as tokens, props as ids. */
export function castProblems(registry, scene, storyId, where) {
  const entries = registry.characters || {};
  const out = [];
  const inStory = (e) => !storyId || e.story === storyId || (e.also_in || []).includes(storyId);
  const person = (value, field) => {
    if (typeof value !== "string") return;
    const m = value.match(ONE_TOKEN);
    if (!m) { out.push(`${where}: ${field} "${value}" is not a token. Fix: write one token such as {{${Object.keys(entries).find((k) => PERSON_KINDS.has(entries[k].kind)) || "id"}}}`); return; }
    const e = entries[m[1]];
    if (!e) out.push(`${where}: ${field} ${value} is not in the registry${closest(m[1], Object.keys(entries))}. Fix: add the entry first; an id is never guessed`);
    else if (!PERSON_KINDS.has(e.kind)) out.push(`${where}: ${field} ${value} is a ${e.kind}, not a person. Fix: a prop goes under props, by id`);
    else if (!inStory(e)) out.push(`${where}: ${field} ${value} belongs to ${e.story}, not ${storyId}. Fix: add "${storyId}" to its also_in, or use a character of this story`);
  };
  (scene.characters || []).forEach((c, i) => person(c, `characters[${i}]`));
  if (scene.narrator !== undefined) person(scene.narrator, "narrator");
  (scene.dialogue || []).forEach((d, i) => person(d?.speaker, `dialogue[${i}].speaker`));
  if (typeof scene.margin_author === "string" && !new RegExp(TOKEN.source).test(scene.margin_author)) out.push(`${where}: margin_author "${scene.margin_author}" holds no token. Fix: write who it is as a token, such as {{sam-hayes}} (looking back)`);
  (scene.props || []).forEach((p, i) => out.push(...propIdProblems(registry, p, storyId, `${where}: props[${i}]`)));
  return out;
}

/** A prop reference must be a registry id of kind prop in the story; a prop's name in its place is refused with the id to write. */
export function propIdProblems(registry, value, storyId, where) {
  const entries = registry.characters || {};
  const props = Object.entries(entries).filter(([, e]) => e.kind === "prop");
  if (typeof value !== "string" || !value) return [`${where}: a prop is named by its registry id`];
  const tokenized = value.match(ONE_TOKEN);
  const id = tokenized ? tokenized[1] : value;
  const e = entries[id];
  if (e && e.kind === "prop") {
    if (tokenized) return [`${where}: "${value}" is a token; a prop is listed by its bare id. Fix: write ${id}`];
    if (storyId && e.story !== storyId && !(e.also_in || []).includes(storyId)) return [`${where}: prop ${id} belongs to ${e.story}, not ${storyId}. Fix: add "${storyId}" to its also_in`];
    return [];
  }
  if (e) return [`${where}: ${id} is a ${e.kind}, not a prop. Fix: people go under characters, as tokens`];
  const byName = props.find(([, p]) => [p.name, ...(p.aliases || [])].some((l) => typeof l === "string" && l.toLowerCase() === value.toLowerCase()));
  if (byName) return [`${where}: "${value}" is the name of a prop. Fix: write its id ${byName[0]}; a prop is tracked by id, never by its name`];
  return [`${where}: "${value}" is not a prop in the registry${closest(value, props.map(([k]) => k))}. Fix: add the prop to the registry first; an id is never guessed`];
}

/** The blocking record set-prop writes: the declared wrist and facing, and the screen side computed from them. */
export function blockingFor(wrist, facing, toward) {
  if (!WRISTS.includes(wrist)) throw new Refusal(`--intrinsic-wrist must be ${WRISTS.join(" or ")} (the character's own wrist, never the viewer's side)`, 2);
  if (!FACINGS.includes(facing)) throw new Refusal(`--camera-facing must be one of ${FACINGS.join(", ")}`, 2);
  if (facing === "profile" && !TOWARDS.includes(toward)) throw new Refusal(`--camera-facing profile needs --toward ${TOWARDS.join(" or ")}: which way the character faces decides whether the ${wrist} wrist is the near side or the far side, so a profile without it is ambiguous`, 2);
  if (facing !== "profile" && toward !== undefined) throw new Refusal(`--toward applies to --camera-facing profile only. Fix: drop --toward, or use --camera-facing profile`, 2);
  const out = { intrinsic_wrist: wrist, camera_facing: facing };
  if (facing === "profile") out.profile_toward = toward;
  out.screen_side = screenSide(out);
  return out;
}

/** The screen side a blocking projects to, by check-prop-continuity.mjs's projection. */
export function screenSide(b) {
  const intrinsic = b.intrinsic_wrist === "left" ? "ANATOMICAL_LEFT_WRIST" : "ANATOMICAL_RIGHT_WRIST";
  const facing = b.camera_facing === "facing" ? "facing_camera" : b.camera_facing === "back" ? "back_to_camera" : `profile_facing_${(b.profile_toward || "").replace("-", "_")}`;
  return projectLaterality(intrinsic, facing);
}

/** <story>/wardrobe-and-props.json when it exists (the canon: which wrist each prop is worn on), else null. */
export function readWardrobe(dir) {
  const file = path.join(dir, "wardrobe-and-props.json");
  return fs.existsSync(file) ? { file, json: readJson(file) } : null;
}

/** The canonical wrist of a prop from the wardrobe file: "left", "right", or undefined when the file does not say. */
export function canonicalWrist(wardrobe, propId) {
  for (const [owner, c] of Object.entries(wardrobe?.json?.characters || {})) for (const p of c.props || []) {
    if (p.item_id !== propId) continue;
    const said = `${p.worn_on || ""} ${p.intrinsic_laterality || ""}`;
    if (/LEFT/.test(said) && !/RIGHT/.test(said)) return { wrist: "left", owner };
    if (/RIGHT/.test(said) && !/LEFT/.test(said)) return { wrist: "right", owner };
  }
  return undefined;
}

/**
 * The laterality check (check-prop-continuity.mjs) on the scenes named: every blocking well formed, its screen side the
 * projection of its wrist and facing, its prop listed on the scene, its wrist the canon's; the picture line never mixing
 * screen sides with body sides; and the wardrobe file, when there is one, valid by validatePropLateralityRegistry.
 */
export function lateralityProblems(scenes, slugs, wardrobe, where) {
  const out = [];
  if (wardrobe) for (const e of validatePropLateralityRegistry(wardrobe.json).errors) out.push(`${path.basename(wardrobe.file)}: ${e}`);
  for (const slug of slugs) {
    const scene = scenes[slug];
    if (!scene || isSlot(slug)) continue;
    const at = `${where}: ${slug}`;
    for (const [propId, b] of Object.entries(scene.prop_blocking || {})) {
      if (!isObject(b)) { out.push(`${at}: prop_blocking.${propId} is not an object`); continue; }
      if (!(scene.props || []).includes(propId)) out.push(`${at}: prop_blocking names ${propId}, which is not in the scene's props. Fix: node scripts/mutate.mjs set-prop lists it for you`);
      if (!WRISTS.includes(b.intrinsic_wrist)) { out.push(`${at}: prop_blocking.${propId}.intrinsic_wrist must be left or right (the character's own wrist)`); continue; }
      if (!FACINGS.includes(b.camera_facing)) { out.push(`${at}: prop_blocking.${propId}.camera_facing must be one of ${FACINGS.join(", ")}`); continue; }
      if (b.camera_facing === "profile" && !TOWARDS.includes(b.profile_toward)) { out.push(`${at}: prop_blocking.${propId} is in profile with no profile_toward (screen-left or screen-right), so near and far side are ambiguous`); continue; }
      const expected = screenSide(b);
      if (b.screen_side !== expected) out.push(`${at}: prop_blocking.${propId}.screen_side is ${b.screen_side ?? "missing"}, but a ${b.intrinsic_wrist} wrist ${b.camera_facing === "facing" ? "facing the camera" : b.camera_facing === "back" ? "with the back to the camera" : `in profile toward ${b.profile_toward}`} projects to ${expected}. Fix: node scripts/mutate.mjs set-prop computes it`);
      const canon = canonicalWrist(wardrobe, propId);
      if (canon && canon.wrist !== b.intrinsic_wrist) out.push(`${at}: ${propId} is worn on the ${canon.wrist} wrist in ${path.basename(wardrobe.file)} (${canon.owner}), but this scene blocks it on the ${b.intrinsic_wrist}. Fix: --intrinsic-wrist ${canon.wrist}; the canon decides the wrist, the camera decides the screen side`);
    }
    if (typeof scene.picture === "string") for (const e of lintPromptLaterality(scene.picture).errors) out.push(`${at}: picture: ${e}`);
  }
  return out;
}

/** Find the story folder's worklog: --worklog, else the nearest folder at or above the story holding worklog/log.jsonl. */
export function worklogRepo(dir, given) {
  if (given) {
    const repo = path.resolve(given);
    if (!fs.existsSync(path.join(repo, "worklog", "log.jsonl"))) throw new Refusal(`--worklog ${given} has no worklog/log.jsonl. Fix: name the repository whose worklog records this story`);
    return repo;
  }
  let at = path.resolve(dir);
  for (;;) {
    if (fs.existsSync(path.join(at, "worklog", "log.jsonl"))) return at;
    const up = path.dirname(at);
    if (up === at) throw new Refusal(`no worklog/log.jsonl in ${rel(process.cwd(), path.resolve(dir))} or any folder above it, so the change could not be recorded. Fix: --worklog <repo> names the repository whose worklog records this story`);
    at = up;
  }
}

/**
 * The authorization a value-losing change carries, checked: --owner-auth (the owner's words, recorded verbatim in the
 * worklog) or --market-test (a test in <story>/market-tests.json that the author authorized and that lists the scene).
 * Returns null when neither flag is given.
 */
export function authorization(dir, flags, slug) {
  const test = flags["market-test"], owner = flags["owner-auth"];
  if (test !== undefined && owner !== undefined) throw new Refusal("give --market-test or --owner-auth, not both: one decision authorizes one change", 2);
  if (owner !== undefined) {
    if (!owner.trim()) throw new Refusal("--owner-auth is empty. Fix: quote the owner's words that authorize this change");
    return { kind: "owner", text: owner.trim() };
  }
  if (test === undefined) return null;
  const file = path.join(dir, "market-tests.json");
  const shown = rel(process.cwd(), file);
  if (!fs.existsSync(file)) throw new Refusal(`--market-test ${test}: ${shown} does not exist, so the test cannot be checked. Fix: record the test there ({ "tests": [{ "id", "decision", "authorized_by", "authorizes": ["<slug>"] }] }), or use --owner-auth with the owner's words`);
  const ledger = readJson(file);
  const entry = (Array.isArray(ledger.tests) ? ledger.tests : []).find((t) => t && t.id === test);
  if (!entry) throw new Refusal(`--market-test ${test} is not in ${shown}${closest(test, (ledger.tests || []).map((t) => t?.id).filter(Boolean))}. Fix: name a recorded test; a deletion is only ever the output of one`);
  if (typeof entry.authorized_by !== "string" || !entry.authorized_by.trim()) throw new Refusal(`market test ${test} in ${shown} has no authorized_by: the author has not authorized taking its result. Fix: the author records their authorization there first`);
  if (!Array.isArray(entry.authorizes) || !entry.authorizes.includes(slug)) throw new Refusal(`market test ${test} does not list ${slug} under authorizes, so it does not authorize changing it. Fix: add ${slug} to that test's authorizes if its result covers this scene, or use --owner-auth`);
  return { kind: "market-test", id: test, decision: entry.decision, authorized_by: entry.authorized_by };
}

const describeAuth = (auth) => (auth.kind === "owner" ? "under the owner's authorization recorded in the worklog" : `under market test ${auth.id} (authorized by ${auth.authorized_by})`);

/** Load the story or refuse: a story that is already broken is fixed before it is changed. */
function load(dir, registry, afterWrite = false) {
  try { return loadStory(dir, { registry }); }
  catch (e) {
    const shown = rel(process.cwd(), path.resolve(dir));
    throw new Refusal([...(e.problems || [e.message]), afterWrite ? "the change would leave the story unable to load, so every file was put back" : `the story must load before it is changed. Fix: correct the problems above (node scripts/mutate.mjs verify ${shown} lists them)`]);
  }
}

function requireFlags(flags, names, command) {
  const missing = names.filter((n) => flags[n] === undefined || !String(flags[n]).trim());
  if (missing.length) throw new Refusal(`${command} needs ${missing.map((m) => `--${m}`).join(", ")}`, 2);
  if (flags.author !== undefined && !AUTHOR.test(flags.author)) throw new Refusal(`--author "${flags.author}" must be agent:<name> or human:<name>, so the worklog says who made the change`, 2);
  if (flags.slug !== undefined && !SLUG.test(flags.slug)) throw new Refusal(`--slug "${flags.slug}" is not a slug: lower-case letters, digits and hyphens only`, 2);
}

function readPayload(file, flag) {
  if (!fs.existsSync(file)) throw new Refusal(`--${flag} ${file} does not exist`, 2);
  let json;
  try { json = readJson(file); } catch (e) { throw new Refusal(`--${flag} ${file}: ${e.message}`, 2); }
  if (!isObject(json)) throw new Refusal(`--${flag} ${file} must hold one JSON object`, 2);
  return json;
}

/** The story's files as they are now: scenes.json, every edition, parked-art.json; the raw JSON with notes kept. */
function snapshotState(story) {
  const parkedFile = path.join(story.dir, "parked-art.json");
  return {
    scenes: clone(story.raw),
    editions: Object.fromEntries(Object.values(story.editions).map((e) => [e.id, readJson(e.file)])),
    parked: fs.existsSync(parkedFile) ? readJson(parkedFile) : { parked: [], removed: [] },
  };
}

/**
 * Pictures follow the reading orders: a picture a placed spread loads leaves parked; a picture that was loaded before
 * and no placed spread loads now is parked with `reason`. Returns the lines for the summary.
 */
function syncArt(before, after, reason) {
  const loaded = (state) => new Set(Object.values(state.editions).flatMap((e) => e.order).flatMap((slug) => state.scenes.scenes[slug]?.art || []));
  const was = loaded(before), now = loaded(after);
  const parked = after.parked.parked || (after.parked.parked = []);
  const notes = [];
  const kept = parked.filter((p) => !now.has(p.file));
  for (const p of parked) if (now.has(p.file)) notes.push(`unparked ${p.file}: a spread loads it now`);
  after.parked.parked = kept;
  for (const file of [...was].filter((f) => !now.has(f)).sort()) {
    if (kept.some((p) => p.file === file)) continue;
    kept.push({ file, reason });
    notes.push(`parked ${file}: no placed spread loads it now`);
  }
  return notes;
}

/** The files a state writes, as [absolute path, value]. */
function filesOf(story, state) {
  return [
    [story.file, state.scenes],
    ...Object.values(story.editions).map((e) => [e.file, state.editions[e.id]]),
    [path.join(story.dir, "parked-art.json"), state.parked],
  ];
}

/** Write the new state, rebuild, run the story gates, append the worklog entry; on any failure put every file back. */
function commit({ story, before, after, flags, command, slug, summary, auth, notes, registry, repo }) {
  const builtDir = path.join(story.dir, "built");
  const touched = [...filesOf(story, after), ...(fs.existsSync(builtDir) ? fs.readdirSync(builtDir).filter((f) => f.endsWith(".txt")).map((f) => [path.join(builtDir, f)]) : [])];
  const saved = new Map(touched.map(([file]) => [file, fs.existsSync(file) ? fs.readFileSync(file) : null]));
  const restore = () => {
    for (const [file, buf] of saved) { if (buf === null) fs.rmSync(file, { force: true }); else fs.writeFileSync(file, buf); }
    for (const f of fs.existsSync(builtDir) ? fs.readdirSync(builtDir) : []) { const p = path.join(builtDir, f); if (!saved.has(p) && f.endsWith(".txt")) fs.rmSync(p, { force: true }); }
  };
  const changed = [];
  try {
    for (const [file, value] of filesOf(story, after)) {
      const sample = saved.get(file)?.toString("utf8") || "";
      const next = JSON.stringify(value);
      if (sample && JSON.stringify(JSON.parse(sample)) === next) continue;
      writeJsonLike(file, value, sample);
      changed.push(rel(repo, file));
    }
    const rebuilt = load(story.dir, registry, true);
    const { written } = buildStory(rebuilt);
    for (const f of written) { const abs = path.resolve(f); if (saved.get(abs)?.toString("utf8") !== fs.readFileSync(abs, "utf8")) changed.push(rel(repo, abs)); }
    const passthrough = registry ? ["--registry", registry] : [];
    const check = spawnSync(process.execPath, [path.join(HERE, "story.mjs"), "check", story.dir, ...passthrough], { encoding: "utf8" });
    if (check.status !== 0) throw new Refusal([...`${check.stdout}${check.stderr}`.trim().split("\n").filter(Boolean), "the story gates failed after the change, so every file was put back"]);
    const diff = {
      "scenes.json": diffJson(before.scenes, after.scenes),
      ...Object.fromEntries(Object.keys(after.editions).map((id) => [`editions/${id}.json`, diffJson(before.editions[id], after.editions[id])])),
      "parked-art.json": diffJson(before.parked, after.parked),
    };
    for (const k of Object.keys(diff)) if (!diff[k].length) delete diff[k];
    const details = JSON.stringify({ gate: "mutate.mjs", command, story: rel(repo, story.dir), slug, author: flags.author, reason: flags.reason, authorization: auth || "none needed: the change only adds", art: notes, diff });
    const log = spawnSync(process.execPath, [
      path.join(HERE, "worklog-append.mjs"), "--repo", repo, "--author", flags.author, "--event-type", "action", "--scope", "story-mutation",
      "--summary", summary, "--details", details, "--tags", `mutate,${command}`, "--files", changed.join(", ") || "none",
      "--removed", "none", "--verified-by", "node scripts/story.mjs check (built output, pictures, retirements) after the write",
    ], { encoding: "utf8" });
    if (log.status !== 0) throw new Refusal([...`${log.stdout}${log.stderr}`.trim().split("\n").filter(Boolean), "the worklog entry could not be written, so every file was put back: no change goes unrecorded"]);
    return { changed, logLine: log.stdout.trim().split("\n").filter((l) => l.startsWith("worklog-append:")).pop() || "" };
  } catch (e) {
    restore();
    throw e instanceof Refusal ? e : new Refusal([e.message, "every file was put back"]);
  }
}

/** Refuse a value-losing change unless it carries a checked authorization; return the authorization (or null). */
function guardLosses(lost, dir, flags, slug) {
  const auth = authorization(dir, flags, slug);
  if (lost.length && !auth) throw new Refusal([...lost.map((l) => `${slug}: ${l}`), `the change loses a value, and a story only grows unless a market test or the owner authorizes otherwise. Fix: make the change additive, or add --market-test <id> (a test in market-tests.json that lists ${slug}) or --owner-auth "<the owner's words>"`]);
  return auth;
}

/** add-scene: a new record, placed after --after (or last) in every edition; its pictures must exist and are unparked. */
export function addScene(story, flags, ctx) {
  requireFlags(flags, ["slug", "payload", "author", "reason"], "add-scene");
  const slug = flags.slug;
  if (story.scenes[slug]) throw new Refusal(`${slug} is already a scene. Fix: add-scene never overwrites; use update-scene to add to it, or pick a new slug`);
  const record = readPayload(flags.payload, "payload");
  const problems = [...typedNames(story.registry, record, `--payload ${path.basename(flags.payload)}`), ...castProblems(story.registry, record, story.story, `--payload ${path.basename(flags.payload)}`)];
  for (const name of record.art || []) if (typeof name === "string" && !fs.existsSync(path.join(story.artFolder, name))) problems.push(`--payload: art "${name}" is not in ${rel(process.cwd(), story.artFolder)}/. Fix: put the picture there first; a spread never loads a picture that is not there`);
  const before = snapshotState(story);
  const after = clone(before);
  after.scenes.scenes[slug] = record;
  for (const [id, ed] of Object.entries(after.editions)) {
    if (flags.after === undefined) { ed.order.push(slug); continue; }
    const i = ed.order.indexOf(flags.after);
    if (i === -1) problems.push(`--after ${flags.after} is not placed in edition ${id}${closest(flags.after, ed.order)}, so the new scene has no place there. Fix: name a scene every edition reads, or leave out --after to place it last`);
    else ed.order.splice(i + 1, 0, slug);
  }
  if (ctx.wardrobe || LATERALITY_FIELDS.some((f) => f in record)) problems.push(...lateralityProblems(after.scenes.scenes, [slug], ctx.wardrobe, "--payload"));
  if (problems.length) throw new Refusal(problems);
  const notes = syncArt(before, after, `unloaded on ${today()} by mutate.mjs add-scene ${slug}`);
  const at = Object.fromEntries(Object.entries(after.editions).map(([id, e]) => [id, e.order.indexOf(slug) + 1]));
  return { before, after, slug, auth: null, notes, summary: `mutate add-scene ${slug} in ${story.shown}: spread ${Object.entries(at).map(([id, n]) => `${n} of ${id}`).join(", ")}; ${flags.reason}` };
}

/** update-scene: a JSON merge patch on one record; a patch that loses a value needs an authorization. */
export function updateScene(story, flags, ctx) {
  requireFlags(flags, ["slug", "patch", "author", "reason"], "update-scene");
  const slug = flags.slug;
  if (!story.scenes[slug]) throw new Refusal(`${slug} is not a scene in ${story.shown}${closest(slug, Object.keys(story.scenes))}. Fix: add-scene makes a new one`);
  const patch = readPayload(flags.patch, "patch");
  const before = snapshotState(story);
  const after = clone(before);
  const old = before.scenes.scenes[slug];
  const next = mergePatch(old, patch);
  if (same(old, next)) throw new Refusal(`the patch changes nothing in ${slug}`);
  after.scenes.scenes[slug] = next;
  const lost = losses(old, next);
  const auth = guardLosses(lost, story.dir, flags, slug);
  const added = Object.fromEntries(diffJson(old, next).filter((d) => d.op !== "remove").map((d) => [d.path, d.after]));
  const problems = [...typedNames(story.registry, added, `--patch ${path.basename(flags.patch)}`), ...castProblems(story.registry, next, story.story, `${slug} after the patch`)];
  for (const name of next.art || []) if (typeof name === "string" && !(old.art || []).includes(name) && !fs.existsSync(path.join(story.artFolder, name))) problems.push(`--patch: art "${name}" is not in ${rel(process.cwd(), story.artFolder)}/. Fix: put the picture there first`);
  if (ctx.wardrobe || LATERALITY_FIELDS.some((f) => f in patch)) problems.push(...lateralityProblems(after.scenes.scenes, [slug], ctx.wardrobe, `${slug} after the patch`));
  if (problems.length) throw new Refusal(problems);
  const notes = syncArt(before, after, `replaced on ${today()} by mutate.mjs update-scene ${slug} ${auth ? describeAuth(auth) : ""}: ${flags.reason}`.replace(/ {2,}/g, " "));
  return { before, after, slug, auth, notes, lost, summary: `mutate update-scene ${slug} in ${story.shown}${lost.length ? ` (${lost.length} value(s) replaced, ${auth.kind === "owner" ? "owner-authorized" : `market test ${auth.id}`})` : ""}: ${flags.reason}` };
}

/** retire-scene: out of every reading order, into retired; the record stays, its pictures are parked. Always needs an authorization. */
export function retireScene(story, flags) {
  requireFlags(flags, ["slug", "author", "reason"], "retire-scene");
  const slug = flags.slug;
  if (!story.scenes[slug]) throw new Refusal(`${slug} is not a scene in ${story.shown}${closest(slug, Object.keys(story.scenes))}`);
  const placedIn = Object.values(story.editions).filter((e) => e.order.includes(slug)).map((e) => e.id);
  if (!placedIn.length) throw new Refusal(`${slug} is already retired in every edition; there is nothing to retire`);
  const auth = authorization(story.dir, flags, slug);
  if (!auth) throw new Refusal(`retire-scene takes ${slug} out of ${placedIn.join(" and ")}, and a story only grows unless a market test or the owner decides otherwise. Fix: add --market-test <id> (a test in market-tests.json that lists ${slug}) or --owner-auth "<the owner's words>"`);
  const problems = typedNames(story.registry, { reason: flags.reason }, "--reason (it is written into parked-art.json)");
  if (problems.length) throw new Refusal(problems);
  const before = snapshotState(story);
  const after = clone(before);
  for (const id of placedIn) {
    const ed = after.editions[id];
    ed.order = ed.order.filter((s) => s !== slug);
    ed.retired = [...(ed.retired || []), slug];
  }
  const notes = syncArt(before, after, `its spread was retired on ${today()} ${describeAuth(auth)}: ${flags.reason}; the record and the picture stay`);
  return { before, after, slug, auth, notes, summary: `mutate retire-scene ${slug} in ${story.shown} (${auth.kind === "owner" ? "owner-authorized" : `market test ${auth.id}`}; record and pictures kept): ${flags.reason}` };
}

/** set-prop: declare which wrist bears a prop and how the camera sees the character; the screen side is computed. */
export function setProp(story, flags, ctx) {
  requireFlags(flags, ["slug", "prop", "intrinsic-wrist", "camera-facing", "author"], "set-prop");
  const slug = flags.slug;
  if (!story.scenes[slug] || isSlot(slug)) throw new Refusal(`${slug} is not a written scene in ${story.shown}${closest(slug, Object.keys(story.scenes))}`);
  const idProblems = propIdProblems(story.registry, flags.prop, story.story, "--prop");
  if (idProblems.length) throw new Refusal(idProblems);
  const blocking = blockingFor(flags["intrinsic-wrist"], flags["camera-facing"], flags.toward);
  const before = snapshotState(story);
  const after = clone(before);
  const scene = after.scenes.scenes[slug];
  if (!(scene.props || []).includes(flags.prop)) scene.props = [...(scene.props || []), flags.prop];
  const previous = scene.prop_blocking?.[flags.prop];
  scene.prop_blocking = { ...(scene.prop_blocking || {}), [flags.prop]: blocking };
  const problems = lateralityProblems(after.scenes.scenes, [slug], ctx.wardrobe, story.shown);
  if (problems.length) throw new Refusal(problems);
  if (previous && same(previous, blocking)) throw new Refusal(`${slug} already blocks ${flags.prop} this way; nothing to change`);
  if (!flags.reason) flags.reason = `the ${blocking.intrinsic_wrist} wrist bears ${flags.prop}; camera ${blocking.camera_facing}${blocking.profile_toward ? ` toward ${blocking.profile_toward}` : ""}; on screen ${blocking.screen_side}`;
  const notes = [`${flags.prop}: ${blocking.intrinsic_wrist} wrist, ${blocking.camera_facing}${blocking.profile_toward ? ` toward ${blocking.profile_toward}` : ""} -> ${blocking.screen_side}${previous ? ` (was ${previous.intrinsic_wrist} wrist -> ${previous.screen_side}; the old value is in this entry's diff)` : ""}`];
  return { before, after, slug, auth: null, notes, summary: `mutate set-prop ${flags.prop} in ${slug} of ${story.shown}: ${blocking.intrinsic_wrist} wrist, ${blocking.screen_side}` };
}

/** verify: the story gates, the names in every record, and the laterality of every blocked prop. Writes nothing. */
export function verifyStory(dir, registry) {
  const story = load(dir, registry);
  const problems = [];
  for (const [slug, scene] of Object.entries(story.scenes)) {
    if (isSlot(slug)) continue;
    problems.push(...typedNames(story.registry, scene, `scenes.json: ${slug}`), ...castProblems(story.registry, scene, story.story, `scenes.json: ${slug}`));
  }
  problems.push(...lateralityProblems(story.scenes, Object.keys(story.scenes), readWardrobe(story.dir), "scenes.json"));
  const passthrough = registry ? ["--registry", registry] : [];
  const check = spawnSync(process.execPath, [path.join(HERE, "story.mjs"), "check", story.dir, ...passthrough], { encoding: "utf8" });
  if (check.status !== 0) problems.push(...`${check.stdout}${check.stderr}`.trim().split("\n").filter((l) => l && !/: pass\b/.test(l)));
  const blocked = Object.values(story.scenes).reduce((n, s) => n + Object.keys(s.prop_blocking || {}).length, 0);
  return { story, problems, summary: `${Object.keys(story.scenes).length} scenes, ${Object.keys(story.editions).length} editions, ${blocked} blocked prop(s): story gates, tokens and laterality` };
}

/** Run one command; returns the lines to print. Throws a Refusal on any problem. */
export function run(argv) {
  const { command, dir, flags } = parseArgs(argv);
  const registry = flags.registry;
  if (command === "verify") {
    const { problems, summary } = verifyStory(dir, registry);
    if (problems.length) throw new Refusal([...problems, `mutate: verify: fail (${problems.length} problem(s))`]);
    return [`mutate: verify: pass (${summary})`];
  }
  const repo = worklogRepo(dir, flags.worklog);
  const story = load(dir, registry);
  const ctx = { wardrobe: readWardrobe(story.dir) };
  const plan = { "add-scene": addScene, "update-scene": updateScene, "retire-scene": retireScene, "set-prop": setProp }[command](story, flags, ctx);
  const { changed, logLine } = commit({ story, ...plan, flags, command, registry, repo });
  return [
    `mutate: ${command}: ${plan.summary}`,
    ...(plan.lost || []).map((l) => `mutate: replaced (authorized): ${l}`),
    ...plan.notes.map((n) => `mutate: ${n}`),
    `mutate: wrote ${changed.join(", ") || "nothing"}`,
    `mutate: story gates pass; ${logLine.replace(/^worklog-append: /, "logged ")}`,
  ];
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { for (const line of run(process.argv.slice(2))) console.log(line); }
  catch (e) {
    for (const line of e.problems || [e.stack || e.message]) console.error(line);
    if (e instanceof Refusal && e.exitCode === 1 && !/verify: fail/.test(e.problems.at(-1))) console.error("mutate: refused; nothing was changed");
    process.exit(e.exitCode || 1);
  }
}
