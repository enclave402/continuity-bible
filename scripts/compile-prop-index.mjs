#!/usr/bin/env node
/**
 * A checklist that flips your story inside-out: instead of looking up a page to see what objects are in it, you look up an object—like a watch or a key—and see every single page it appears on, who holds it, and which hand it is in.
 * An image model sees one picture at a time, so it will drop a watch or swap a hand unless you give it this checklist with every picture.
 * Run this command: node scripts/compile-prop-index.mjs
 *
 * The same command with --check exits 1 when the saved checklist is missing or does not match a fresh compile.
 * It reads only the public example already in this repository: the registry, the story scene file the registry points at,
 * that folder's edition (spread numbers), the wardrobe file the continuity cards link, the cards, and the shot sheet.
 * It does not invent a second story. Output: examples/continuity/prop-index.json (override with --out).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, validate } from "./lib.mjs";
import { projectLaterality } from "./check-prop-continuity.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const SCHEMA_PATH = path.join(HERE, "prop-index.v1.schema.json");
const DEFAULT_OUT = "examples/continuity/prop-index.json";

const SIDE_OF = {
  LEFT_WRIST_ONLY: "left",
  RIGHT_WRIST_ONLY: "right",
  ANATOMICAL_LEFT_WRIST: "left",
  ANATOMICAL_RIGHT_WRIST: "right",
  ANATOMICAL_LEFT_HAND: "left",
  ANATOMICAL_RIGHT_HAND: "right",
};

const WORN_ON = {
  LEFT_WRIST_ONLY: "LEFT_WRIST_ONLY",
  RIGHT_WRIST_ONLY: "RIGHT_WRIST_ONLY",
  EITHER_WRIST: "EITHER_WRIST",
  LEFT_HAND: "HAND_HELD",
  RIGHT_HAND: "HAND_HELD",
  BOTH_HANDS: "HAND_HELD",
  HAND_HELD: "HAND_HELD",
  NECK: "NECK",
  TORSO: "TORSO",
  IN_POCKET: "POCKET",
  POCKET: "POCKET",
  ON_TABLE: "NONE",
  NONE: "NONE",
};

const LATERALITY = {
  ANATOMICAL_LEFT_WRIST: "ANATOMICAL_LEFT_WRIST",
  ANATOMICAL_RIGHT_WRIST: "ANATOMICAL_RIGHT_WRIST",
  ANATOMICAL_LEFT_HAND: "ANATOMICAL_LEFT_HAND",
  ANATOMICAL_RIGHT_HAND: "ANATOMICAL_RIGHT_HAND",
  BILATERAL: "NONE",
  NON_LATERAL: "NONE",
  NONE: "NONE",
};

const idOf = (token) => {
  const match = String(token ?? "").match(/\{\{\s*([a-z0-9-]+)/i);
  return match ? match[1] : String(token ?? "").trim();
};

const weekday = (time) => (String(time || "").match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i) || [""])[0].toLowerCase();

/**
 * Chirality and count problems a schema cannot see. Empty means the index holds.
 * @param {{props?: Record<string, object>}} index
 * @returns {string[]}
 */
export function propIndexProblems(index) {
  const problems = [];
  for (const [key, prop] of Object.entries(index.props || {})) {
    const at = `props.${key}`;
    if (prop.item_id !== key) problems.push(`${at}: keyed by "${key}" but item_id is "${prop.item_id}"`);
    const wornSide = SIDE_OF[prop.worn_on];
    const anatomicalSide = SIDE_OF[prop.intrinsic_laterality];
    if (wornSide && anatomicalSide !== wornSide) problems.push(`${at}: worn_on ${prop.worn_on} but intrinsic_laterality ${prop.intrinsic_laterality}`);
    if (anatomicalSide) {
      for (const facing of ["facing_camera", "back_to_camera"]) {
        const expected = projectLaterality(prop.intrinsic_laterality, facing);
        if (prop.screen_projection_rules?.[facing] !== expected) problems.push(`${at}.screen_projection_rules.${facing}: ${prop.screen_projection_rules?.[facing]}, expected ${expected}`);
      }
    }
    const seen = new Set();
    const count = { worn: 0, removed: 0, exempt: 0 };
    (prop.timeline || []).forEach((entry, i) => {
      const where = `${at}.timeline[${i}] (${entry.slug})`;
      if (seen.has(entry.slug)) problems.push(`${where}: scene listed twice`);
      seen.add(entry.slug);
      count[entry.presence] = (count[entry.presence] || 0) + 1;
      const lateral = entry.side === "left" || entry.side === "right";
      if (entry.presence === "worn" && anatomicalSide && lateral && entry.side !== anatomicalSide) {
        problems.push(`${where}: chirality flip, worn on the ${entry.side} but the prop is ${prop.worn_on}`);
      }
      if (entry.presence === "worn" && anatomicalSide && entry.camera_facing && entry.projected_screen_side) {
        let expected;
        try { expected = projectLaterality(prop.intrinsic_laterality, entry.camera_facing); } catch { problems.push(`${where}: unknown camera_facing "${entry.camera_facing}"`); }
        if (expected && entry.projected_screen_side !== expected) problems.push(`${where}: projected_screen_side ${entry.projected_screen_side}, expected ${expected} for ${entry.camera_facing}`);
      }
    });
    if ((prop.timeline || []).length !== prop.total_scenes) problems.push(`${at}: total_scenes ${prop.total_scenes} but the timeline holds ${(prop.timeline || []).length}`);
    if (prop.worn_count !== count.worn) problems.push(`${at}: worn_count ${prop.worn_count} but ${count.worn} worn`);
    if (prop.removed_count !== (count.removed || 0)) problems.push(`${at}: removed_count ${prop.removed_count} but ${count.removed || 0} removed`);
    if (prop.total_scenes !== prop.worn_count + prop.removed_count + (count.exempt || 0)) {
      problems.push(`${at}: total_scenes ${prop.total_scenes} is not worn ${prop.worn_count} + removed ${prop.removed_count} + exempt ${count.exempt || 0}`);
    }
  }
  return problems;
}

/** Paths the public example already declares. No second story is invented. */
export function discoverSources(root = ROOT) {
  const registryFile = path.join(root, "character-registry.json");
  const registry = readJson(registryFile);
  const surfaces = registry.surfaces || [];
  const sceneRels = surfaces.filter((s) => s.type === "scenes" && s.file).map((s) => s.file);
  const sceneRel = sceneRels.find((rel) => fs.existsSync(path.join(root, path.dirname(rel), "editions"))) || sceneRels[0];
  if (!sceneRel) throw new Error("prop index: the registry has no scenes surface. Fix: declare one in character-registry.json");
  const scene = readJson(path.join(root, sceneRel));
  const editionDir = path.join(root, path.dirname(sceneRel), "editions");
  const editionNames = fs.existsSync(editionDir) ? fs.readdirSync(editionDir).filter((n) => n.endsWith(".json")).sort() : [];
  if (!editionNames.length) throw new Error(`prop index: no edition next to ${sceneRel}. Fix: add an edition file; spread numbers come from its order`);
  const editionRel = path.join(path.dirname(sceneRel), "editions", editionNames[0]).split(path.sep).join("/");
  const edition = readJson(path.join(root, editionRel));
  const story = surfaces.find((s) => s.file === sceneRel)?.story;
  const cardsSurface = surfaces.find((s) => s.type === "continuity-cards" && (!story || s.story === story) && s.wardrobe);
  if (!cardsSurface) throw new Error("prop index: no continuity-cards surface links a wardrobe file. Fix: set its wardrobe key");
  const wardrobe = readJson(path.join(root, cardsSurface.wardrobe));
  const cards = readJson(path.join(root, cardsSurface.file));
  const sheetSurface = surfaces.find((s) => s.type === "shot-sheet" && (!story || s.story === story));
  const sheet = sheetSurface ? readJson(path.join(root, sheetSurface.file)) : { scenes: {} };
  return { registry, scene, sceneRel, edition, editionRel, wardrobe, wardrobeRel: cardsSurface.wardrobe, cards, sheet };
}

const sheetFor = (sheet, slug) => {
  const scenes = sheet.scenes || {};
  if (scenes[slug]) return scenes[slug];
  const key = Object.keys(scenes).find((k) => k === slug || k.endsWith(`-${slug}`));
  return key ? scenes[key] : null;
};

const presentIds = (scene, sheetScene) => {
  const fromSheet = new Set();
  for (const shot of sheetScene?.shots || []) for (const c of shot.characters || []) if (c.who) fromSheet.add(idOf(c.who));
  if (fromSheet.size) return fromSheet;
  return new Set((scene.characters || []).map(idOf).filter(Boolean));
};

/** Last person shown holding the prop, and whether a shot puts it in frame without a hand. */
function holdingOf(sheetScene, propId) {
  let last = "";
  let inFrameNotHeld = false;
  for (const shot of sheetScene?.shots || []) {
    let heldHere = false;
    for (const c of shot.characters || []) {
      const holding = (c.holding || []).map(idOf);
      if (holding.includes(propId)) { last = idOf(c.who); heldHere = true; }
    }
    const listed = (shot.props || []).map(idOf).includes(propId);
    if (heldHere) inFrameNotHeld = false;
    else if (listed && !last) inFrameNotHeld = true;
  }
  return { last, inFrameNotHeld };
}

const carriers = (cards) => {
  const map = new Map();
  for (const [cid, days] of Object.entries(cards.cards || {})) {
    for (const day of Object.values(days || {})) {
      for (const propId of day.carries || []) {
        if (!map.has(propId)) map.set(propId, []);
        if (!map.get(propId).includes(cid)) map.get(propId).push(cid);
      }
    }
  }
  return map;
};

const projectionFor = (laterality) => {
  if (SIDE_OF[laterality]) {
    return {
      facing_camera: projectLaterality(laterality, "facing_camera"),
      back_to_camera: projectLaterality(laterality, "back_to_camera"),
    };
  }
  // The schema requires the two screen fields even when the prop has no wrist. They are not a claim about a hand.
  return { facing_camera: "SCREEN_RIGHT", back_to_camera: "SCREEN_LEFT" };
};

const blankProp = (itemId, character, wornOn, laterality, geometry) => ({
  item_id: itemId,
  character,
  ...(geometry ? { geometry } : {}),
  worn_on: WORN_ON[wornOn] || "HAND_HELD",
  intrinsic_laterality: LATERALITY[laterality] || "NONE",
  screen_projection_rules: projectionFor(LATERALITY[laterality] || "NONE"),
  total_scenes: 0,
  worn_count: 0,
  removed_count: 0,
  timeline: [],
});

/**
 * The inverted prop index for the public example.
 * @param {string} [root]
 * @returns {object}
 */
export function compilePropIndex(root = ROOT) {
  const src = discoverSources(root);
  const scenes = src.scene.scenes || {};
  const order = Array.isArray(src.edition.order) ? src.edition.order : [];
  const firstDay = weekday(scenes[order[0]]?.time);
  const carried = carriers(src.cards);
  const props = new Map();

  for (const [character, data] of Object.entries(src.wardrobe.characters || {})) {
    for (const prop of data.props || []) {
      if (!prop.item_id) continue;
      props.set(prop.item_id, blankProp(prop.item_id, character, prop.worn_on || "NONE", prop.intrinsic_laterality || "NONE", prop.geometry));
    }
  }
  for (const [id, entry] of Object.entries(src.registry.characters || {})) {
    if (entry.kind !== "prop" || props.has(id)) continue;
    const owner = (carried.get(id) || [])[0] || "";
    props.set(id, blankProp(id, owner, "HAND_HELD", "NONE", ""));
  }

  order.forEach((slug, index) => {
    const scene = scenes[slug];
    if (!scene) return;
    const sheetScene = sheetFor(src.sheet, slug);
    const present = presentIds(scene, sheetScene);
    const spread = index + 1;
    const storyDay = sheetScene?.story_day || (weekday(scene.time) && firstDay && weekday(scene.time) !== firstDay ? "day-2" : "day-1");
    const listed = new Set((scene.props || []).map(idOf));
    for (const prop of props.values()) {
      const bodyWorn = prop.worn_on.endsWith("WRIST_ONLY") || prop.worn_on === "NECK" || prop.worn_on === "TORSO";
      const onBody = bodyWorn && present.has(prop.character);
      const onPage = listed.has(prop.item_id);
      if (!onBody && !onPage) continue;
      const hold = holdingOf(sheetScene, prop.item_id);
      const art = Array.isArray(scene.art) && scene.art[0] ? scene.art[0] : "";
      const entry = {
        slug,
        spread_number: spread,
        story_day: storyDay,
        ...(scene.time ? { in_universe_time: scene.time } : {}),
        presence: "worn",
        side: "unspecified",
      };
      if (art) {
        entry.image_filename = art;
        entry.thumbnail_path = path.posix.join(path.dirname(src.sceneRel), src.scene.art_folder || "art", art);
      }
      if (onBody) {
        entry.presence = "worn";
        entry.side = SIDE_OF[prop.worn_on] || "unspecified";
        entry.reason = `worn by ${prop.character} on the ${entry.side === "unspecified" ? "body" : `${entry.side} side`}`;
      } else if (hold.last) {
        entry.presence = "worn";
        entry.side = "unspecified";
        entry.reason = `held by ${hold.last}; the shot does not name which hand`;
      } else if (hold.inFrameNotHeld) {
        entry.presence = "exempt";
        entry.side = "none";
        entry.reason = "in the scene, not in a hand";
      } else {
        const text = [scene.picture, ...(scene.paragraphs || [])].join(" ");
        const inHand = /in (?:his|her|their|a) hand/i.test(text);
        entry.presence = "worn";
        entry.side = "unspecified";
        const who = present.size === 1 ? [...present][0] : prop.character;
        entry.reason = inHand && who
          ? `the scene puts it in ${who}'s hand; it does not name which hand`
          : "listed on the scene; the sheet does not name a hand";
      }
      prop.timeline.push(entry);
    }
  });

  for (const prop of props.values()) {
    if (!prop.character) prop.character = "unspecified";
    if (!prop.geometry) delete prop.geometry;
    prop.total_scenes = prop.timeline.length;
    prop.worn_count = prop.timeline.filter((e) => e.presence === "worn").length;
    prop.removed_count = prop.timeline.filter((e) => e.presence === "removed").length;
  }

  const ordered = Object.fromEntries([...props.entries()].sort(([a], [b]) => a.localeCompare(b)));
  return {
    $schema: "../../scripts/prop-index.v1.schema.json",
    _about: `Compiled from character-registry.json, ${src.sceneRel}, and ${src.wardrobeRel}. Spread numbers come from ${src.editionRel}. A page is listed only when the prop is on that page. Do not edit by hand. Rebuild with: node scripts/compile-prop-index.mjs`,
    version: 1,
    props: ordered,
  };
}

const canonical = (index) => JSON.stringify({ $schema: index.$schema, _about: index._about, version: index.version, props: index.props });

/**
 * Compare a saved index to a fresh compile. Returns a list of plain problems.
 * @param {string} [root]
 * @param {string} [outRel]
 * @returns {string[]}
 */
export function checkPropIndex(root = ROOT, outRel = DEFAULT_OUT) {
  const file = path.join(root, outRel);
  const fresh = compilePropIndex(root);
  const schema = readJson(SCHEMA_PATH);
  const problems = [...validate(schema, fresh).map((p) => `compiled index: ${p}`), ...propIndexProblems(fresh)];
  if (!fs.existsSync(file)) {
    problems.push(`no file at ${outRel}. Fix: node scripts/compile-prop-index.mjs`);
    return problems;
  }
  let saved;
  try { saved = readJson(file); } catch (e) { return [`${outRel} is not plain JSON (${e.message})`]; }
  problems.push(...validate(schema, saved).map((p) => `${outRel}: ${p}`));
  if (canonical(saved) !== canonical(fresh)) problems.push(`${outRel} is out of date. Fix: node scripts/compile-prop-index.mjs`);
  return problems;
}

const runCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runCli) {
  const argv = process.argv.slice(2);
  const value = (flag) => { const i = argv.indexOf(flag); return i === -1 ? "" : argv[i + 1] || ""; };
  const root = value("--root") ? path.resolve(value("--root")) : ROOT;
  const outRel = value("--out") || DEFAULT_OUT;
  try {
    if (argv.includes("--check")) {
      const problems = checkPropIndex(root, outRel);
      if (problems.length) {
        console.error(`prop index: ${problems.length} problem(s)`);
        for (const p of problems) console.error(`  - ${p}`);
        process.exit(1);
      }
      console.log(`prop index: ${outRel} matches the public example`);
      process.exit(0);
    }
    const index = compilePropIndex(root);
    const schema = readJson(SCHEMA_PATH);
    const problems = [...validate(schema, index), ...propIndexProblems(index)];
    if (problems.length) {
      console.error("prop index: the compile does not match scripts/prop-index.v1.schema.json");
      for (const p of problems) console.error(`  - ${p}`);
      process.exit(1);
    }
    const file = path.resolve(root, outRel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(index, null, 2)}\n`);
    const n = Object.keys(index.props).length;
    console.log(`prop index: ${n} prop(s) -> ${path.relative(root, file)}`);
  } catch (e) {
    console.error(`prop index: ${e.message}`);
    process.exit(1);
  }
}
