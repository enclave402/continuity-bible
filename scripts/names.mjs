// names.mjs: the one resolver between the registry, the continuity cards and every built output. Source files hold tokens;
// builders resolve them.
//
// Source files never carry a character's name. They carry a token, resolved here at build or compile time:
//   {{id}}         the display name: a registry id (sam-hayes -> "Sam"; the registry wins even when a card carries the same
//                  key) or a card-only key of the story (young-sam -> "Young Sam")
//   {{id:first}}   the first word of that name (a registry name "Rowan Thorne" -> "Rowan")
//   {{id:short}}   the card's stage label when the id is a card key, else the registry name
//   {{id:full}}    the registry entry's full_name when it has one (chloe-jenkins:full -> "Chloe Jenkins"), else the name
//   {{id:initial}} the first letter of the first name
//   {{id:<form>}}  any key of the entry's `forms` map (sam-hayes:formal -> "Samantha"); a form in the map overrides a built-in.
//                  A contextual form ({ "by": "stage", "values": { "childhood": "...", "default": "..." } }) renders the variant
//                  the resolved unit's field picks (a scene with stage: "childhood"); no match and no default throws.
// A card key resolves without a story when exactly one card holds it. An unknown id throws: a build never prints a token,
// and never guesses a name.
//
//   import { loadNames } from "./names.mjs"
//   const names = loadNames(root)
//   names.resolveTokens("{{sam-hayes}} and {{theo-vance:full}}")  -> "Sam and Theodore Vance"
//   names.resolveDeep(scene, "main-story")   -> the scene with every string resolved and every structured ref kept as is
//   names.nameOf("chloe-jenkins")            -> "Chloe"  (a registry id; any other string comes back unchanged)
//   names.castName(story, "young-sam")       -> "Young Sam"  (a card-only key)
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
 * not a registry id ({{young-sam}}). A label two entries share is left out and reported in `shared`. A composite
 * label naming two or more other entries ("Sam & Theo") is left out: the labels inside it are the tokens. A label with
 * fewer than two letters is ignored.
 */
export function atomicLabels(characters, cards = []) {
  const owners = new Map(); // label -> Map(id -> [token, ...]), in the order added: name, full_name, forms
  const add = (label, id, token) => {
    if (typeof label !== "string" || label.replace(/[^A-Za-z]/g, "").length < 2) return;
    if (!owners.has(label)) owners.set(label, new Map());
    const ids = owners.get(label);
    if (!ids.has(id)) ids.set(id, []);
    ids.get(id).push(token);
  };
  for (const [id, e] of Object.entries(characters || {})) {
    add(e.name, id, `{{${id}}}`);
    if (e.full_name) add(e.full_name, id, `{{${id}:full}}`);
    for (const [form, value] of Object.entries(e.forms || {})) {
      if (typeof value === "string") add(value, id, `{{${id}:${form}}}`);
      else if (value && typeof value === "object") for (const text of Object.values(value.values || {})) add(text, id, `{{${id}:${form}}}`); // a contextual form: every variant is written once, here
    }
  }
  for (const card of cards) for (const [key, c] of Object.entries(card?.characters || {})) {
    if (typeof c?.scene_name === "string" && !characters?.[key] && !owners.has(c.scene_name)) add(c.scene_name, key, `{{${key}}}`);
  }
  // Shared means two entries, not two tokens: one entry owning a label twice (name "Sam", forms.short "Sam") is that entry's,
  // and the bare {{id}} wins over a form.
  const tokenOf = (id, tokens) => (tokens.includes(`{{${id}}}`) ? `{{${id}}}` : tokens[0]);
  const composite = (label, id) => new Set([...owners].filter(([o]) => o !== label && labelRegExp(o, "").test(label)).flatMap(([, ids]) => [...ids.keys()]).filter((other) => other !== id)).size >= 2;
  const shared = [...owners].filter(([, ids]) => ids.size > 1).map(([l]) => l);
  const list = [...owners].filter(([l, ids]) => ids.size === 1 && !composite(l, [...ids.keys()][0])).map(([l, ids]) => { const [[id, tokens]] = ids; return [l, tokenOf(id, tokens)]; }).sort((a, b) => b[0].length - a[0].length);
  return { list, shared };
}

/**
 * JSON.parse with an error a person can act on: the file, the line and column in that file (computed from the parser's
 * position, so it is right on every Node version and for one line of a .jsonl file), and the usual causes in plain words.
 * firstLine is the file line the text starts on (a .jsonl row passes its own line number).
 */
export function parseJson(text, file = "this file", firstLine = 1) {
  try { return JSON.parse(text); }
  catch (e) {
    const m = String(e.message).match(/position (\d+)/);
    const pos = m ? Number(m[1]) : null;
    let line = firstLine, col = 1;
    if (pos !== null) { const before = text.slice(0, pos); line = firstLine + (before.match(/\n/g) || []).length; col = pos - before.lastIndexOf("\n"); }
    const lineText = text.split("\n")[line - firstLine] || "";
    const hints = [];
    const trimmed = text.trim();
    if (!trimmed) hints.push("the file is empty. Copy the grey box with the file's text, then type the command that makes the file");
    else if (/^(pbpaste|get-clipboard)\b/i.test(trimmed) || /^\s*(mac|windows):/im.test(trimmed)) hints.push("the file holds a command instead of the file's text. Copy the grey box with the file's text first, then type the command yourself; copying the command replaces the text you copied");
    else if (/^```/.test(trimmed)) hints.push("the file starts with ``` from the page. Copy only the text inside the grey box");
    else if (/^\s*\{\\rtf/.test(text)) hints.push("it was saved as rich text, not plain text: in TextEdit choose Format, then Make Plain Text, and save it again");
    else if (/end of (json )?input/i.test(e.message)) hints.push("the file stops too early, as if part of it is missing. Copy the whole grey box again");
    else {
      if (/[\u201c\u201d\u2018\u2019]/.test(lineText)) hints.push("that line has curly quotes (\u201c \u201d); JSON needs straight quotes (\")");
      if (pos !== null && /,\s*$/.test(text.slice(0, pos)) && /[}\]]/.test(text[pos] || "")) hints.push("there is a comma just before this } or ]; delete that comma");
      if (!hints.length) hints.push("a missing or extra comma, quote or brace at that spot or just before it");
    }
    const err = new Error(`${file}${pos === null ? "" : `: line ${line}, column ${col}`}: this is not valid JSON. Likely cause: ${hints.join("; ")}.`);
    err.code = "BAD_JSON";
    err.exitCode = 1;
    throw err;
  }
}

export function loadNames(root) {
  const read = (f) => parseJson(fs.readFileSync(path.join(root, f), "utf8"), f);
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

  /**
   * The text of one token, or null when the id is unknown. A contextual form ({ by, values }) is picked by a field of the
   * unit being resolved (opts.context: the scene, the row, the record): values[context[by]], else values.default, else an
   * error that names the field, so a stage-dependent attribute is compiled by rule and never left to "the prompt writer".
   */
  const tokenText = (story, id, form, context) => {
    const m = member(story, id);
    const entry = characters[id];
    if (!m && !entry) return null;
    const name = entry ? entry.name : m.scene_name; // the registry wins for an id; a card-only key (young-sam) renders its scene_name
    if (!form) return name;
    const declared = entry?.forms?.[form];
    if (typeof declared === "string") return declared;
    if (declared && typeof declared === "object") {
      const picked = context ? context[declared.by] : undefined;
      const text = picked !== undefined && typeof declared.values?.[String(picked)] === "string" ? declared.values[String(picked)] : declared.values?.default;
      if (typeof text !== "string") {
        const err = new Error(`names: {{${id}:${form}}} is picked by "${declared.by}", but the unit being resolved has ${picked === undefined ? `no ${declared.by}` : `${declared.by} "${picked}", which forms.${form}.values does not list`} and the form has no default. Fix: set ${declared.by} on the unit, add the value under forms.${form}.values, or add a default`);
        err.code = "CONTEXT";
        throw err;
      }
      return text;
    }
    if (form === "first") return name.split(/\s+/)[0];
    if (form === "short") return m?.scene_name ?? name;
    if (form === "full") return entry?.full_name ?? name;
    if (form === "initial") return name.split(/\s+/)[0][0];
    return null;
  };
  /** opts.keep: a token that is no character's ({{pattern:anxious}} in a data file another builder resolves) stays as written.
   *  opts.context: the unit (scene, row) whose fields pick contextual forms; resolveDeep sets it from the data itself. */
  const resolveTokens = (text, story, opts = {}) => {
    if (typeof text !== "string" || !text.includes("{{")) return text;
    return text.replace(TOKEN, (whole, id, form) => {
      const out = tokenText(story, id, form, opts.context);
      if (out === null) {
        if (opts.keep && !characters[id] && !member(story, id)) return whole;
        throw new Error(`names: unknown token ${whole}${story ? ` in story ${story}` : ""}: no continuity-card key and no registry id ${id}`);
      }
      return out;
    });
  };
  /** Every string in a value resolved; arrays and objects rebuilt; structured references (ids, card keys) are not strings with
   *  tokens and stay. Each object's own scalar fields join the context its strings are resolved with (a scene's stage or
   *  time_of_day picks that scene's contextual forms; a nested object inherits and may override). */
  const resolveDeep = (value, story, opts = {}) => {
    if (typeof value === "string") return resolveTokens(value, story, opts);
    if (Array.isArray(value)) return value.map((v) => resolveDeep(v, story, opts));
    if (value && typeof value === "object") {
      const own = Object.fromEntries(Object.entries(value).filter(([, v]) => ["string", "number", "boolean"].includes(typeof v)));
      const inner = { ...opts, context: { ...(opts.context || {}), ...own } };
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveDeep(v, story, inner)]));
    }
    return value;
  };
  /** A scene map (slug -> scene) resolved, each scene by the story its storyKey names in the manifest; a scene without one resolves by registry ids and unique card keys. */
  const resolveScenes = (scenes) => Object.fromEntries(Object.entries(scenes || {}).map(([slug, scene]) => [slug, resolveDeep(scene, scene?.storyKey ? storyOfKey.get(scene.storyKey) : undefined)]));
  /** The ids a text references, for a gate. */
  const tokensIn = (text) => [...String(text).matchAll(TOKEN)].map((m) => ({ id: m[1], form: m[2] || "", whole: m[0] }));
  return { registry, characters, nameOf, castName, castOf, cardOf, resolveTokens, resolveDeep, resolveScenes, tokensIn, tokenText, storyOfKey };
}
