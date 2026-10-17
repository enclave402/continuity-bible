// names.mjs: the one resolver between the registry, the continuity cards and every built output (owner 2026-10-17: "These
// should never be hardcoded values. We need ssot"; the plan of 14:01 EDT: source files hold tokens, builders resolve them).
//
// Source files never carry a character's name. They carry a token, resolved here at build or compile time:
//   {{id}}         the display name: a registry id (rowan-thorne -> "Rowan Thorne", coach-hype -> "Coach Hype"; the registry
//                  wins even when a card carries the same key) or a card-only key of the story (young-aleksandr -> "Young Aleksandr")
//   {{id:first}}   the first word of that name (rowan-thorne:first -> "Rowan")
//   {{id:short}}   the card's stage label when the id is a card key, else the registry name
//   {{id:full}}    the registry entry's full_name when it has one (chloe-jenkins:full -> "Chloe Jenkins"), else the name
//   {{id:initial}} the first letter of the first name
//   {{id:<form>}}  any key of the entry's `forms` map (sam-hayes:formal -> "Samantha"); a form in the map overrides a built-in
// A card key resolves without a story when exactly one card holds it. An unknown id throws: a build never prints a token,
// and never guesses a name.
//
//   import { loadNames } from "./names.mjs"
//   const names = loadNames(root)
//   names.resolveTokens("{{rowan-thorne}} and {{elena-sato}}’s frame", "dating-red-flags")  -> "Rowan Thorne and Elena Sato’s frame"
//   names.resolveDeep(scene, "dating-red-flags")   -> the scene with every string resolved and every structured ref kept as is
//   names.nameOf("coach-hype")                      -> "Coach Hype"  (a registry id; any other string comes back unchanged)
//   names.castName(story, "young-aleksandr")        -> "Young Aleksandr"
//   names.castOf(story, scene)                      -> the scene's cast as names
import fs from "node:fs";
import path from "node:path";

export const TOKEN = /\{\{([a-z0-9][a-z0-9-]*)(?::([a-z]+))?\}\}/g;

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A whole-word match of a written-out label, never inside a token: {{sam-hayes}} holds no "Sam". */
export const labelRegExp = (label, flags = "g") => new RegExp(`(^|[^A-Za-z{])${escapeRe(label)}(?![A-Za-z}])`, flags);

/**
 * The atomic labels a source file may not write out, each with the token it becomes: [label, token], longest first.
 * Registry names, `forms` and `full_name` ({{id}}, {{id:<form>}}, {{id:full}}) and the scene_name of every card key that is
 * not a registry id ({{young-aleksandr}}). A label two entries share is left out and reported in `shared`. A composite
 * label naming two or more other entries ("Sam & Theo") is left out: the labels inside it are the tokens. A label with
 * fewer than two letters is ignored.
 */
export function atomicLabels(characters, cards = []) {
  const owners = new Map(); // label -> Set(token)
  const add = (label, token) => {
    if (typeof label !== "string" || label.replace(/[^A-Za-z]/g, "").length < 2) return;
    if (!owners.has(label)) owners.set(label, new Set());
    owners.get(label).add(token);
  };
  for (const [id, e] of Object.entries(characters || {})) {
    add(e.name, `{{${id}}}`);
    if (e.full_name) add(e.full_name, `{{${id}:full}}`);
    for (const [form, value] of Object.entries(e.forms || {})) add(value, `{{${id}:${form}}}`);
  }
  for (const card of cards) for (const [key, c] of Object.entries(card?.characters || {})) {
    if (typeof c?.scene_name === "string" && !characters?.[key] && !owners.has(c.scene_name)) add(c.scene_name, `{{${key}}}`);
  }
  const idOf = (token) => token.replace(/^\{\{|(?::[a-z]+)?\}\}$/g, "");
  const composite = (label, token) => new Set([...owners].filter(([o, t]) => o !== label && idOf([...t][0]) !== idOf(token) && labelRegExp(o, "").test(label)).map(([, t]) => idOf([...t][0]))).size >= 2;
  const shared = [...owners].filter(([, t]) => t.size > 1).map(([l]) => l);
  const list = [...owners].filter(([l, t]) => t.size === 1 && !composite(l, [...t][0])).map(([l, t]) => [l, [...t][0]]).sort((a, b) => b[0].length - a[0].length);
  return { list, shared };
}

export function loadNames(root) {
  const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
  const registry = read("character-registry.json");
  const characters = registry.characters || {};
  const cards = new Map();
  const manifestFile = path.join(root, registry.visual_continuity || "visual-continuity.json");
  if (fs.existsSync(manifestFile)) {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    for (const [storyId, entry] of Object.entries(manifest.stories || {})) {
      const rel = typeof entry === "string" ? entry : entry?.file;
      if (!rel) continue;
      const storyFile = path.join(path.dirname(manifestFile), rel);
      if (!fs.existsSync(storyFile)) continue;
      const story = JSON.parse(fs.readFileSync(storyFile, "utf8"));
      const cardFile = story.continuity_file && path.join(root, story.continuity_file);
      if (cardFile && fs.existsSync(cardFile) && cardFile.endsWith(".json")) {
        const card = JSON.parse(fs.readFileSync(cardFile, "utf8"));
        cards.set(storyId, card);
        if (story.scene_filter?.equals) cards.set(`key:${story.scene_filter.equals}`, card);
      }
    }
  }
  const nameOf = (ref) => (typeof ref === "string" && characters[ref] ? characters[ref].name : ref);
  const cardOf = (story) => cards.get(story) || cards.get(`key:${story}`) || null;
  const member = (story, id) => {
    if (story) return cardOf(story)?.characters?.[id];
    const hits = [...new Set([...cards.entries()].filter(([k]) => !k.startsWith("key:")).map(([, c]) => c.characters?.[id]).filter(Boolean))];
    return hits.length === 1 ? hits[0] : undefined;
  };
  const storyOfKey = new Map([...cards.keys()].filter((k) => k.startsWith("key:")).map((k) => [k.slice(4), [...cards.entries()].find(([sid, c]) => !sid.startsWith("key:") && c === cards.get(k))?.[0]]));
  const castName = (story, ref) => {
    if (typeof ref !== "string") return ref && typeof ref === "object" && typeof ref.name === "string" ? castName(story, ref.name) : ref;
    if (characters[ref]) return characters[ref].name; // a registry id: the registry is the one source; a card's scene_name on it is a verified copy
    const m = member(story, ref);
    if (m && typeof m.scene_name === "string") return m.scene_name;
    return nameOf(ref);
  };
  const castOf = (story, scene) => (scene?.characters || []).map((ref) => castName(story, ref)).filter(Boolean);

  /** The text of one token, or null when the id is unknown. */
  const tokenText = (story, id, form) => {
    const m = member(story, id);
    const entry = characters[id];
    if (!m && !entry) return null;
    const name = entry ? entry.name : m.scene_name; // the registry wins for an id; a card-only key (young-aleksandr) renders its scene_name
    if (!form) return name;
    if (entry?.forms && typeof entry.forms[form] === "string") return entry.forms[form];
    if (form === "first") return name.split(/\s+/)[0];
    if (form === "short") return m?.scene_name ?? name;
    if (form === "full") return entry?.full_name ?? name;
    if (form === "initial") return name.split(/\s+/)[0][0];
    return null;
  };
  /** opts.keep: a token that is no character's ({{pattern:anxious}} in a data file another builder resolves) stays as written. */
  const resolveTokens = (text, story, opts = {}) => {
    if (typeof text !== "string" || !text.includes("{{")) return text;
    return text.replace(TOKEN, (whole, id, form) => {
      const out = tokenText(story, id, form);
      if (out === null) {
        if (opts.keep && !characters[id] && !member(story, id)) return whole;
        throw new Error(`names: unknown token ${whole}${story ? ` in story ${story}` : ""}: no continuity-card key and no registry id ${id}`);
      }
      return out;
    });
  };
  /** Every string in a value resolved; arrays and objects rebuilt; structured references (ids, card keys) are not strings with tokens and stay. */
  const resolveDeep = (value, story, opts = {}) => {
    if (typeof value === "string") return resolveTokens(value, story, opts);
    if (Array.isArray(value)) return value.map((v) => resolveDeep(v, story, opts));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveDeep(v, story, opts)]));
    return value;
  };
  /** A scene map (slug -> scene) resolved, each scene by the story its storyKey names in the manifest; a scene without one resolves by registry ids and unique card keys. */
  const resolveScenes = (scenes) => Object.fromEntries(Object.entries(scenes || {}).map(([slug, scene]) => [slug, resolveDeep(scene, scene?.storyKey ? storyOfKey.get(scene.storyKey) : undefined)]));
  /** The ids a text references, for a gate. */
  const tokensIn = (text) => [...String(text).matchAll(TOKEN)].map((m) => ({ id: m[1], form: m[2] || "", whole: m[0] }));
  return { registry, characters, nameOf, castName, castOf, cardOf, resolveTokens, resolveDeep, resolveScenes, tokensIn, tokenText, storyOfKey };
}
