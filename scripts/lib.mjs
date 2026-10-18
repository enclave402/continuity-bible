/**
 * lib.mjs: the library behind check.mjs.
 *
 * A registry is an authority file: one entry per character, one canonical name, explicit aliases, retired forms.
 * Surfaces are the files that use names. Each label on a surface must resolve, by exact match only, to exactly one entry
 * whose story allows that surface. No fuzzy matching. Nothing here invents a name.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadNames, TOKEN, atomicLabels, labelRegExp, parseJson } from "./names.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCHEMA_PATH = path.join(HERE, "character-registry.v1.schema.json");
export const DEFAULT_FIELDS = ["characters", "props", "speaker", "marginAuthor", "dialogue[].speaker"];
export const DEFAULT_SPLIT = ["&", "+", " and "];
export const DEFAULT_HEADING = "^###\\s+(?:\\d+\\.\\s+)?([^(\\n]+?)\\s*\\(";

export function readJson(file) {
  const shown = path.relative(process.cwd(), file);
  return parseJson(fs.readFileSync(file, "utf8"), shown && !shown.startsWith("..") ? shown : file);
}

function flag(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 ? "" : argv[i + 1] || "";
}

export function registryPath(argv = process.argv, env = process.env, cwd = process.cwd()) {
  const flagged = flag(argv, "--registry");
  if (flagged) return path.resolve(cwd, flagged);
  if (env.CHARACTER_REGISTRY) return path.resolve(cwd, env.CHARACTER_REGISTRY);
  return path.join(cwd, "character-registry.json");
}

export function loadRegistry(file) {
  if (!fs.existsSync(file)) {
    // the usual beginner causes: the editor added an ending (.txt, .rtf), or the command was run from the wrong folder
    const dir = path.dirname(file), base = path.basename(file), stem = base.toLowerCase().replace(/\.json$/, "");
    const near = fs.existsSync(dir) ? [...new Set([...nearbyFiles(file), ...fs.readdirSync(dir).filter((n) => n !== base && n.toLowerCase().startsWith(stem))])] : [];
    const hint = near.length
      ? ` There is ${near.map((n) => `"${n}"`).join(" and ")} here: rename it to ${base}; your editor added an ending.`
      : ` If you saved it with another ending (.txt, .rtf), rename it to ${base}. If you are in the wrong folder, cd into your story folder first.`;
    const error = new Error(`registry missing: ${file}.${hint} Fix: create ${base} there (see the README), or pass --registry <path>`);
    error.exitCode = 1;
    throw error;
  }
  const registry = readJson(file);
  registry._file = file;
  registry._root = path.dirname(file);
  return registry;
}

// ---- a small JSON Schema validator: the subset the registry schema uses, so nothing has to be installed ----
export function validate(schema, value, at = "$") {
  const problems = [];
  if (schema.anyOf) {
    // one of several shapes (a wardrobe is one line of text or an object of layers); the description says which
    if (!schema.anyOf.some((s) => !validate(s, value, at).length)) problems.push(`${at}: ${schema.description ? schema.description.split(". ")[0] : `fits none of the ${schema.anyOf.length} allowed shapes`}`);
    return problems;
  }
  const type = schema.type;
  const kind = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
  if (type && !(type === "integer" ? Number.isInteger(value) : kind === type)) {
    problems.push(`${at}: expected ${type}, got ${kind}`);
    return problems;
  }
  if (schema.enum && !schema.enum.includes(value)) problems.push(`${at}: must be one of ${schema.enum.join(", ")}`);
  if (schema.minimum !== undefined && value < schema.minimum) problems.push(`${at}: below ${schema.minimum}`);
  if (schema.minLength !== undefined && String(value).length < schema.minLength) problems.push(`${at}: empty`);
  if (kind === "object") {
    for (const key of schema.required || []) if (!(key in value)) problems.push(`${at}: missing ${key}`);
    for (const [key, child] of Object.entries(value)) {
      const prop = schema.properties?.[key];
      const patterned = Object.entries(schema.patternProperties || {}).find(([re]) => new RegExp(re).test(key));
      if (prop) problems.push(...validate(prop, child, `${at}.${key}`));
      else if (patterned) problems.push(...validate(patterned[1], child, `${at}.${key}`));
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object") problems.push(...validate(schema.additionalProperties, child, `${at}.${key}`));
      else if (schema.additionalProperties === false) {
        problems.push(`${at}: unknown field ${key}${schema.patternProperties ? " (ids are lower-case, digits and hyphens)" : ""}`);
      }
    }
  }
  if (kind === "array") {
    if (schema.minItems !== undefined && value.length < schema.minItems) problems.push(`${at}: needs ${schema.minItems} item(s)`);
    if (schema.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) problems.push(`${at}: repeated item`);
    if (schema.items) value.forEach((item, i) => problems.push(...validate(schema.items, item, `${at}[${i}]`)));
  }
  return problems;
}

// ---- label handling ----
export function cleanLabel(raw) {
  return String(raw ?? "").replace(/^[\s—–-]+/, "").trim();
}

function stripQualifier(label) {
  return label.replace(/\s*\([^()]*\)\s*$/, "").trim();
}

function splitter(extra = []) {
  const seps = [...new Set([...DEFAULT_SPLIT, ...extra])].map((s) => s.trim() === "and" ? "\\band\\b" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\s*(?:${seps.join("|")})\\s*`);
}

export function buildIndex(registry) {
  const index = new Map(); // lower label -> { id, label }
  const failures = [];
  const retired = []; // { id, form }
  const put = (label, id, what) => {
    const key = label.toLowerCase();
    const have = index.get(key);
    if (have && have.id !== id) {
      failures.push(`${registry._file}: "${label}" is the ${what} of ${id} and already a label of ${have.id}. Fix: one name is one person; rename one of them`);
      return;
    }
    if (have && have.id === id && have.label !== label) failures.push(`${registry._file}: ${id} lists "${label}" twice with different case`);
    index.set(key, { id, label });
  };
  for (const [id, entry] of Object.entries(registry.characters || {})) {
    put(entry.name, id, "name");
    for (const alias of entry.aliases || []) {
      if (alias.toLowerCase() === entry.name.toLowerCase()) failures.push(`${registry._file}: ${id} lists its own name "${alias}" as an alias. Fix: remove it from aliases`);
      else put(alias, id, "alias");
    }
    for (const form of entry.retired || []) retired.push({ id, form });
  }
  for (const { id, form } of retired) {
    const live = index.get(form.toLowerCase());
    if (live) failures.push(`${registry._file}: ${id} retires "${form}" but it is a live label of ${live.id}. Fix: a retired form belongs to nobody; remove one of them`);
  }
  return { index, failures, retired };
}

/** Resolve one raw label to entry ids. Exact match, then without a trailing qualifier, then split into parts. */
export function resolve(index, raw, extraSplit = []) {
  const label = cleanLabel(raw);
  if (!label) return { ids: [], unresolved: [] };
  const exact = (s) => index.get(s.toLowerCase())?.id;
  const whole = exact(label) || exact(stripQualifier(label));
  if (whole) return { ids: [whole], unresolved: [] };
  const parts = stripQualifier(label).split(splitter(extraSplit)).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return { ids: [], unresolved: [label] };
  const ids = [];
  const unresolved = [];
  for (const part of parts) {
    const id = exact(part) || exact(stripQualifier(part));
    if (id) ids.push(id);
    else unresolved.push(part);
  }
  return { ids, unresolved: unresolved.length ? [label] : [] };
}

// ---- surfaces ----
function fromRoot(root, rel) {
  return path.isAbsolute(rel) ? rel : path.join(root, rel);
}

export function surfacesOf(registry) {
  const surfaces = [];
  const declared = registry.surfaces || [];
  const manifestRel = registry.visual_continuity ?? (fs.existsSync(path.join(registry._root, "visual-continuity.json")) ? "visual-continuity.json" : "");
  if (manifestRel) {
    const manifestFile = fromRoot(registry._root, manifestRel);
    if (!fs.existsSync(manifestFile)) {
      surfaces.push({ error: `${registry._file}: visual_continuity points at ${manifestRel}, which does not exist` });
    } else {
      const manifest = readJson(manifestFile);
      const base = path.dirname(manifestFile);
      for (const [storyId, entry] of Object.entries(manifest.stories || {})) {
        const rel = typeof entry === "string" ? entry : entry?.file;
        if (!rel) continue;
        const storyFile = fromRoot(base, rel);
        if (!fs.existsSync(storyFile)) continue;
        const story = readJson(storyFile);
        if (story.status === "draft") continue;
        if (registry.skip_stories && Object.hasOwn(registry.skip_stories, storyId)) continue;
        const filter = story.scene_filter || (typeof entry === "object" ? entry.scene_filter : undefined);
        const override = declared.find((s) => s.type === "scenes" && s.story === storyId && s.file === story.scenes_file);
        if (story.scenes_file && !override) {
          surfaces.push({ type: "scenes", story: storyId, file: story.scenes_file, filter, fields: DEFAULT_FIELDS, prose: true, derived: true });
        }
        if (story.continuity_file) surfaces.push({ type: "continuity", story: storyId, file: story.continuity_file, derived: true });
      }
    }
  }
  for (const s of declared) {
    surfaces.push({
      ...s,
      fields: s.fields || DEFAULT_FIELDS,
      prose: s.prose !== false,
      pattern: s.pattern || DEFAULT_HEADING,
    });
  }
  return surfaces;
}

/** Walk a dot path with * (every key) and [] (every item). Returns [{ value, where }]. */
export function walk(value, pathSpec, where = "") {
  const steps = pathSpec.split(".").flatMap((step) => {
    const out = [];
    let s = step;
    while (s.endsWith("[]")) { s = s.slice(0, -2); out.unshift("[]"); }
    return s ? [s, ...out] : out;
  });
  let current = [{ value, where }];
  for (const step of steps) {
    const next = [];
    for (const { value: v, where: w } of current) {
      if (v === null || v === undefined) continue;
      if (step === "[]") {
        if (Array.isArray(v)) v.forEach((item, i) => next.push({ value: item, where: `${w}[${i}]` }));
      } else if (step === "*") {
        if (v && typeof v === "object") for (const [k, item] of Object.entries(v)) next.push({ value: item, where: w ? `${w}.${k}` : k });
      } else if (v && typeof v === "object" && step in v) {
        next.push({ value: v[step], where: w ? `${w}.${step}` : step });
      }
    }
    current = next;
  }
  return current;
}

export function scenesIn(surface, json) {
  const rootKey = surface.root || "scenes";
  const all = json[rootKey] ?? json;
  let entries = Array.isArray(all) ? all.map((scene, i) => [scene?.slug || String(i), scene]) : Object.entries(all);
  if (surface.filter) entries = entries.filter(([, scene]) => scene?.[surface.filter.field] === surface.filter.equals);
  return entries;
}

function labelsOfScene(surface, scene) {
  const out = [];
  for (const field of surface.fields) {
    for (const { value, where } of walk(scene, field)) {
      if (Array.isArray(value)) value.forEach((item, i) => out.push({ label: typeof item === "string" ? item : item?.name, where: `${where}[${i}]` }));
      else if (typeof value === "string") out.push({ label: value, where });
      else if (value && typeof value === "object" && typeof value.name === "string") out.push({ label: value.name, where });
    }
  }
  return out.filter((item) => typeof item.label === "string" && item.label.trim());
}

function strings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
  return out;
}

function headingLabels(surface, text) {
  let lines = text.split("\n");
  if (surface.within) {
    const start = lines.findIndex((line) => line.trim() === surface.within.trim());
    if (start === -1) return { error: `${surface.file}: heading "${surface.within}" not found` };
    const level = surface.within.match(/^#+/)?.[0] || "#";
    const end = lines.findIndex((line, i) => i > start && new RegExp(`^${level}\\s`).test(line));
    lines = lines.slice(start + 1, end === -1 ? undefined : end);
  }
  const re = new RegExp(surface.pattern);
  const out = [];
  lines.forEach((line, i) => {
    const m = line.match(re);
    if (m && m[1] && !(surface.ignore || []).includes(m[1].trim())) out.push({ label: m[1], where: `line ${i + 1}` });
  });
  return { labels: out };
}

function allowed(entry, storyId) {
  if (!entry) return false;
  if (entry.story === storyId) return true;
  const also = entry.also_in || [];
  return also.includes("*") || also.includes(storyId);
}

function liveAt(text, at, liveLabels) {
  const rest = text.slice(at);
  return liveLabels.some((label) => rest.startsWith(label) && !/[A-Za-z]/.test(rest[label.length] || ""));
}

function fixForUnknown(label, surface) {
  return `Fix: add "${label}" to aliases of the entry it means in character-registry.json, add a new entry for a new character, or rename it (story ${surface.story})`;
}

// ---- text rules ----
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (t, flags = "") => new RegExp(`(^|[^A-Za-z])${escapeRe(t)}(?![A-Za-z])`, flags);

/** The entries that count as people or companions in prose: not groups, not voices, not generic labels (The therapist). */
function hunted(characters) {
  return Object.entries(characters).filter(([, e]) => (e.kind === "person" || e.kind === "companion") && !e.generic);
}

function labelsOf(entry) {
  return [entry.name, ...(entry.aliases || [])].filter((l) => typeof l === "string" && l.replace(/[^A-Za-z]/g, "").length >= 3);
}

/** Problems in one story's text: a retired name; a species no companion of the story has; a name nobody allowed in the story;
 *  a companion called by another species. Each returns one line without a file prefix. */
export function storyTextProblems(registry, text, storyId, liveLabelsSorted) {
  const characters = registry.characters || {};
  const out = [];
  const liveLabels = liveLabelsSorted || Object.values(characters).flatMap((e) => [e.name, ...(e.aliases || [])]).sort((a, b) => b.length - a.length);
  for (const [id, entry] of Object.entries(characters)) for (const form of entry.retired || []) {
    const re = wordRe(form, "g");
    let m;
    while ((m = re.exec(text))) {
      const at = m.index + m[1].length;
      if (!liveAt(text, at, liveLabels)) { out.push(`text contains the retired name "${form}" (${id}). Fix: use ${entry.name}`); break; }
    }
  }
  if (storyId) {
    const allowedSpecies = new Set(Object.values(characters).filter((e) => e.kind === "companion" && e.species && allowed(e, storyId)).map((e) => e.species));
    for (const [species, words] of Object.entries(registry.species || {})) {
      if (allowedSpecies.has(species)) continue;
      const hit = words.find((w) => wordRe(w, "i").test(text));
      if (hit) out.push(`names a ${hit}, but ${storyId} has no ${species} companion. Fix: register the companion in character-registry.json (species ${species}) or take the ${hit} out`);
    }
    for (const [id, entry] of hunted(characters)) {
      if (allowed(entry, storyId)) continue;
      const hit = labelsOf(entry).find((l) => wordRe(l).test(text));
      if (hit) out.push(`names ${hit} (${id}, ${entry.story}), who is not allowed in ${storyId}. Fix: add "${storyId}" to ${id}.also_in (a declared crossover) or rename`);
    }
  }
  out.push(...companionSpeciesProblems(registry, text));
  return out;
}

/** A companion named with another species' word ("<name> the <other species>", "<other species> <name>"). Needs no story. */
function companionSpeciesProblems(registry, text) {
  const out = [];
  const species = registry.species || {};
  for (const [id, entry] of Object.entries(registry.characters || {})) {
    if (entry.kind !== "companion" || !entry.species) continue;
    const names = [...new Set([entry.name, entry.name.split(/\s+/)[0]].filter((n) => n.replace(/[^A-Za-z]/g, "").length >= 3))];
    for (const [other, words] of Object.entries(species)) {
      if (other === entry.species) continue;
      for (const w of words) for (const n of names) {
        if (new RegExp(`(^|[^A-Za-z])${escapeRe(n)} the ${escapeRe(w)}(?![A-Za-z])`, "i").test(text) || new RegExp(`(^|[^A-Za-z])${escapeRe(w)} ${escapeRe(n)}(?![A-Za-z])`, "i").test(text)) {
          out.push(`calls ${entry.name} a ${w}; ${id} is a ${entry.species}. Fix: use ${entry.name}'s own species or the right companion`);
          break;
        }
      }
    }
  }
  return out;
}

/** One line of a file that is not story-scoped: a retired name is allowed only beside a live name of the same entry (a history note). */
function repoLineProblems(registry, line) {
  const out = [];
  for (const [id, entry] of Object.entries(registry.characters || {})) for (const form of entry.retired || []) {
    if (!wordRe(form).test(line)) continue;
    const beside = [entry.name, ...(entry.aliases || [])].some((l) => wordRe(l).test(line));
    if (!beside) out.push(`retired name "${form}" (${id}) with no ${entry.name} beside it. Fix: use ${entry.name}; a history note names both; dated history goes under records in ${path.basename(registry._file)}`);
  }
  out.push(...companionSpeciesProblems(registry, line));
  return out;
}

/** A gitignore-style glob: ** crosses directories, * and ? stay inside one; a bare path matches that file, or everything under it. */
export function globToRegExp(glob) {
  const g = glob.replace(/^\.\//, "").replace(/\/$/, "");
  if (!g.includes("*") && !g.includes("?")) return new RegExp(`^${escapeRe(g)}(/.*)?$`);
  const re = escapeRe(g).replace(/\\\*\\\*\//g, "(?:.*/)?").replace(/\\\*\\\*/g, ".*").replace(/\\\*/g, "[^/]*").replace(/\\\?/g, "[^/]");
  return new RegExp(`^${re}$`);
}

const BINARY_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "ico", "woff", "woff2", "ttf", "otf", "pdf", "zip", "gz", "mp4", "mov", "wav", "mp3", "lock", "bin", "psd", "ai", "sketch", "fig", "heic", "avif"]);

/** Tracked text files under the registry's root: git's list when the root is a checkout, else a walk that skips .git and node_modules. */
export function textFiles(root) {
  let files = [];
  try {
    // List the checkout that root actually is. A git hook exports GIT_DIR / GIT_INDEX_FILE, which would make a copy of
    // the repo (a test fixture, an export) report the hook's index instead of its own files; strip them and require that
    // root is the top level of the checkout being listed, else walk the directory.
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_(DIR|INDEX_FILE|WORK_TREE|COMMON_DIR|PREFIX)$/.test(k)));
    const opts = { cwd: root, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] };
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], opts).trim();
    if (!top || fs.realpathSync(top) !== fs.realpathSync(root)) throw new Error("root is not the top level of a checkout");
    files = execFileSync("git", ["ls-files", "-z"], opts).split("\0").filter(Boolean);
    if (!files.length) throw new Error("not a checkout");
  } catch {
    const walkDir = (dir) => {
      for (const name of fs.readdirSync(dir)) {
        if (name === ".git" || name === "node_modules") continue;
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) walkDir(full); else files.push(path.relative(root, full));
      }
    };
    walkDir(root);
  }
  return files.filter((f) => !BINARY_EXT.has(f.split(".").pop().toLowerCase()) && !f.split("/").includes("node_modules"));
}

function looksBinary(buffer) {
  const n = Math.min(buffer.length, 512);
  for (let i = 0; i < n; i++) if (buffer[i] === 0) return true;
  return false;
}

/** Scan every tracked text file outside `records` for retired names and companion species mismatches. */
function scanRepo(registry, surfaceFiles = []) {
  const failures = [];
  const root = registry._root;
  const records = (registry.records || []).map(globToRegExp);
  // the registry, its schema and every declared surface (those get the story-scoped rules instead) are not scanned here
  const self = new Set([path.relative(root, registry._file), path.relative(root, SCHEMA_PATH), ...surfaceFiles.map((f) => path.relative(root, f))]);
  let scanned = 0;
  for (const rel of textFiles(root)) {
    if (self.has(rel) || records.some((re) => re.test(rel))) continue;
    const full = path.join(root, rel);
    if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
    const buffer = fs.readFileSync(full);
    if (looksBinary(buffer)) continue;
    scanned += 1;
    const lines = buffer.toString("utf8").split("\n");
    lines.forEach((line, i) => { for (const p of repoLineProblems(registry, line)) failures.push(`${rel}:${i + 1}: ${p}`); });
  }
  return { failures, scanned };
}

/** Strings of a value, skipping keys that start with _ (notes, sources, reasons) and any listed skip key. */
/**
 * Token sources: a scene file, a card,
 * a prose data file and every file the registry lists under `token_sources` write no character's name. They hold
 * {{id}} / {{id:form}} tokens and a builder renders the names (names.mjs). A written-out registry label in one of them
 * fails, with the token to write. Keys starting with _, $schema, a card's scene_name (the label it defines) and a
 * source's declared skip_keys are exempt. Built output and dated records are not token sources.
 */
/** The edit distance between two short strings, to suggest the id a typo was meant to be. */
export function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const BUILT_IN_FORMS = ["first", "short", "full", "initial"];
/** The ids a mistyped id was most likely meant to be: the same id in another case, ids it starts, then near spellings. */
export function closestIds(typed, ids) {
  const t = String(typed).trim().toLowerCase().replace(/\s+/g, "-");
  const exact = ids.filter((k) => k.toLowerCase() === t);
  if (exact.length) return exact;
  const starts = ids.filter((k) => k.startsWith(t) || t.startsWith(k));
  if (starts.length) return starts.slice(0, 2);
  return ids.map((k) => [editDistance(t, k), k]).sort((a, b) => a[0] - b[0]).filter(([d]) => d <= Math.max(2, Math.floor(t.length / 3))).slice(0, 2).map(([, k]) => k);
}
/** Files next to `file` that are probably it under another name: an ending an editor added (.txt, .rtf), or other capital letters. */
export function nearbyFiles(file) {
  const dir = path.dirname(path.resolve(file)), base = path.basename(file).toLowerCase();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => n !== path.basename(file) && (n.toLowerCase() === base || n.toLowerCase().replace(/(\.(txt|rtf))+$/, "") === base));
}
const WHOLE_TOKEN = /^[a-z0-9][a-z0-9-]*(?::[a-z]+)?$/;
const PLACEHOLDER = /\{\{([^{}\n]*)\}\}/g;

/**
 * What the gate needs to judge token sources: the labels that may not be typed, the ids and card keys a token may name, and
 * every declared token source (abs path -> { rel, skip, explicit, other }). explicit: listed under token_sources (a page, a
 * scene draft, a prompt sheet), so every {{...}} in it must be a token of this registry unless the entry says
 * other_placeholders: true (the file also feeds another template tool). Surfaces (scene files, cards, prose data) are token
 * sources too; their tokens are already resolved by the surface checks, so only typed names are checked here.
 */
function tokenSourceContext(registry, surfaces, root) {
  const failures = [];
  const characters = registry.characters || {};
  const cards = surfaces.filter((s) => s.type === "continuity" && !s.error).map((s) => fromRoot(root, s.file)).filter((f) => fs.existsSync(f)).map((f) => { try { return readJson(f); } catch { return null; } }).filter(Boolean);
  const { list } = atomicLabels(characters, cards);
  const cardKeys = new Set(cards.flatMap((c) => Object.keys(c?.characters || {})));
  const sources = new Map();
  const declare = (rel, skip = [], explicit = false, other = false) => { const abs = fromRoot(root, rel); if (fs.existsSync(abs) && fs.statSync(abs).isFile()) sources.set(abs, { rel, skip: new Set(skip), explicit: explicit || sources.get(abs)?.explicit || false, other }); };
  for (const s of surfaces) {
    if (s.error) continue;
    if (s.type === "scenes") declare(s.file, s.skip_keys || []);
    if (s.type === "continuity") declare(s.file, ["scene_name", ...(s.skip_keys || [])]);
    if (s.type === "prose") declare(s.file, s.skip_keys || []);
    if (s.type === "continuity-cards" || s.type === "shot-sheet") declare(s.file, s.skip_keys || []);
  }
  const tracked = textFiles(root);
  for (const t of registry.token_sources || []) {
    const re = globToRegExp(t.file);
    const hits = tracked.filter((rel) => re.test(rel));
    if (!hits.length && !fs.existsSync(fromRoot(root, t.file))) {
      const ci = new RegExp(re.source, re.flags.includes("i") ? re.flags : re.flags + "i");
      const almost = tracked.filter((rel) => ci.test(rel) || re.test(rel.replace(/(\.(txt|rtf))+$/i, "")) || ci.test(rel.replace(/(\.(txt|rtf))+$/i, "")));
      const near = almost.length ? ` There is ${almost.slice(0, 3).map((n) => `"${n}"`).join(", ")} here: rename it so it matches exactly (an editor may have added .txt, or a capital letter crept in).` : "";
      failures.push(`${registry._file}: token_sources "${t.file}" matches no tracked file.${near} File names must match exactly, capital letters included (scene-01.md, not Scene-01.md), and in a git checkout the file must be added to git. Fix: rename the file, or correct the path in ${path.basename(registry._file)}`);
    }
    for (const rel of hits.length ? hits : [t.file]) declare(rel, t.skip_keys || [], true, t.other_placeholders === true);
  }
  return { failures, characters, list, cardKeys, sources };
}

/** The problems in one string of a token source: typed names always; in an explicit token source, also unknown ids, unknown
 *  forms and things that look like a token but are not one (they would reach a chatbot as written). */
function tokenProblemsIn(text, where, ctx, { explicit = false, other = false } = {}) {
  const out = [];
  const str = String(text);
  const bare = str.replace(TOKEN, " ");
  for (const [label, token] of ctx.list) if (labelRegExp(label, "").test(bare)) out.push(`${where}: names "${label}" in a token source. Fix: write ${token}`);
  if (!explicit || other) return out;
  const ids = Object.keys(ctx.characters);
  const closest = (id) => closestIds(id, ids);
  const known = (inner) => { const id = inner.trim().toLowerCase().replace(/\s*:\s*/g, ":").replace(/\s+/g, "-").split(":")[0]; return Boolean(ctx.characters[id] || ctx.cardKeys.has(id)); };
  const tidy = (inner) => inner.trim().toLowerCase().replace(/\s*:\s*/g, ":").replace(/\s+/g, "-");
  // braces that are almost a token: three in a row, one missing, or single braces around a character's id
  if (/\{{3,}|\}{3,}/.test(str)) out.push(`${where}: has three braces in a row, as in {{${ids[0] || "id"}}}}. Fix: a token has exactly two braces on each side`);
  const rest = str.replace(PLACEHOLDER, (m) => " ".repeat(m.length));
  if (!/\{{3,}|\}{3,}/.test(str) && /\{\{|\}\}/.test(rest)) out.push(`${where}: has a {{ without a matching }}, or the other way round. Fix: a token has two braces on each side, like {{${ids[0] || "id"}}}`);
  for (const m of rest.matchAll(/(?<!\{)\{([^{}\n]+)\}(?!\})/g)) if (known(m[1])) out.push(`${where}: {${m[1]}} has single braces, so it is not a token. Fix: write {{${tidy(m[1])}}}`);
  for (const m of str.matchAll(PLACEHOLDER)) {
    const whole = m[0], inner = m[1];
    if (!WHOLE_TOKEN.test(inner)) {
      const guess = inner.trim().toLowerCase().replace(/\s*:\s*/g, ":").replace(/\s+/g, "-");
      const fix = WHOLE_TOKEN.test(guess) && (ctx.characters[guess.split(":")[0]] || ctx.cardKeys.has(guess.split(":")[0])) ? `write {{${guess}}}` : `ids use only lower-case letters, digits and hyphens; the ids in your registry are ${ids.join(", ") || "none yet"}`;
      out.push(`${where}: ${whole} looks like a token but is not one: ids use only lower-case letters, digits and hyphens, with no spaces. Fix: ${fix}`);
      continue;
    }
    const [id, form] = inner.split(":");
    const entry = ctx.characters[id];
    if (!entry && !ctx.cardKeys.has(id)) {
      const near = closest(id);
      out.push(`${where}: ${whole} is not a character in the registry. Fix: ${near.length ? `check the spelling: did you mean ${near.map((k) => `{{${k}${form ? `:${form}` : ""}}}`).join(" or ")}?` : `add ${id} to the registry first, or use one of ${ids.join(", ") || "its ids"}`}`);
      continue;
    }
    if (form) {
      const forms = [...new Set([...Object.keys(entry?.forms || {}), ...BUILT_IN_FORMS])];
      if (!forms.includes(form)) out.push(`${where}: ${whole}: ${id} has no form "${form}". Fix: use one of ${forms.map((x) => `{{${id}:${x}}}`).join(", ")}`);
    }
  }
  return out;
}

/** Every problem in one token-source file, labelled with the file. Strings in JSON are walked (keys starting with _ and the
 *  source's skip keys are exempt); other files are read line by line. */
function tokenSourceFileProblems(ctx, abs, info, text = fs.readFileSync(abs, "utf8")) {
  const out = [];
  if (/^\s*\{\\rtf/.test(text)) return ["was saved as rich text, not plain text, so its words are full of formatting codes. Fix: in TextEdit choose Format, then Make Plain Text, and save it again, or paste it again from the terminal"];
  const walkStrings = (value, where) => {
    if (typeof value === "string") return out.push(...tokenProblemsIn(value, where, ctx, info));
    if (Array.isArray(value)) return value.forEach((v, i) => walkStrings(v, `${where}[${i}]`));
    if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) { if (k.startsWith("_") || k === "$schema" || info.skip.has(k)) continue; walkStrings(v, where ? `${where}.${k}` : k); }
  };
  if (info.rel.endsWith(".json")) { let json; try { json = JSON.parse(text); } catch { return out; } walkStrings(json, ""); }
  else text.split("\n").forEach((line, i) => out.push(...tokenProblemsIn(line, `line ${i + 1}`, ctx, info)));
  const seen = new Set();
  return out.filter((o) => !seen.has(o) && seen.add(o));
}

/**
 * For render.mjs: the problems the gate would report for one file about to be rendered, or [] when the file is no declared
 * token source. A token source must not reach a chatbot with a typed name or a broken token in it, whether or not the
 * person ran the gate first.
 */
export function checkTokenSourceFile(registry, file, text) {
  const root = registry._root;
  const ctx = tokenSourceContext(registry, surfacesOf(registry), root);
  // the name as it is on disk: a case-insensitive disk (macOS, Windows) opens Scene-01.md for a file saved as scene-01.md
  const real = (p) => { try { return fs.realpathSync.native(p); } catch { return p; } };
  const abs = real(path.resolve(file));
  let info = ctx.sources.get(abs) || [...ctx.sources].find(([k]) => real(k) === abs)?.[1];
  const extra = [];
  if (!info) {
    // a file that would be a token source but for its capital letters (Scene-01.md for scene-*.md): check it anyway, and say why the gate did not
    const rel = path.relative(root, abs).split(path.sep).join("/");
    const t = (registry.token_sources || []).find((x) => { const re = globToRegExp(x.file); return new RegExp(re.source, re.flags.includes("i") ? re.flags : re.flags + "i").test(rel); });
    if (!t) return [];
    info = { rel, skip: new Set(t.skip_keys || []), explicit: true, other: t.other_placeholders === true };
    const dir = path.posix.dirname(rel);
    extra.push(`${rel}: its name does not match token_sources "${t.file}" exactly, because capital letters count, so the gate does not check it. Fix: rename it to ${dir === "." ? "" : dir + "/"}${path.posix.basename(rel).toLowerCase()}`);
  }
  return [...extra, ...tokenSourceFileProblems(ctx, abs, info, text).map((o) => `${info.rel}: ${o}`)];
}

/**
 * Token sources: a scene file, a card, a prose data file and every file the registry lists under `token_sources` write no
 * character's name. They hold {{id}} / {{id:form}} tokens and a builder renders the names (names.mjs). A written-out
 * registry label in one of them fails, with the token to write; in a listed token source an unknown id, an unknown form or a
 * token lookalike fails too. Keys starting with _, $schema, a card's scene_name (the label it defines) and a source's
 * declared skip_keys are exempt. Built output and dated records are not token sources.
 */
function tokenSourceProblems(registry, surfaces, root) {
  const ctx = tokenSourceContext(registry, surfaces, root);
  const failures = [...ctx.failures];
  for (const [abs, info] of ctx.sources) {
    const unique = tokenSourceFileProblems(ctx, abs, info);
    for (const o of unique.slice(0, 8)) failures.push(`${info.rel}: ${o}`);
    if (unique.length > 8) failures.push(`${info.rel}: ${unique.length - 8} more problem(s) in a token source. Fix: node scripts/tokenize.mjs ${info.rel} [--text] [--story <id>] for typed names, then run the gate again`);
  }
  return { failures, sources: ctx.sources.size };
}

/**
 * Coverage: every tracked text file is a surface, a token source, a record, or listed under coverage.ignore. Any other file
 * that writes a registry label as a whole word is unclassified, and the gate says so (a gap, or a failure with
 * coverage.strict), so no data file can sit outside the gate unnoticed.
 */
function coverageProblems(registry, surfaces, root) {
  const problems = [];
  const characters = registry.characters || {};
  const { list } = atomicLabels(characters, []);
  if (!list.length) return { problems, unclassified: 0 };
  const tracked = textFiles(root);
  const classified = new Set([path.relative(root, registry._file), path.relative(root, SCHEMA_PATH)]);
  for (const s of surfaces) if (!s.error) classified.add(s.file.replace(/^\.\//, ""));
  const globs = [
    ...(registry.records || []),
    ...(registry.coverage?.ignore || []),
    ...(registry.token_sources || []).map((t) => t.file),
    ...(registry.render_templates || []),
  ].map(globToRegExp);
  let unclassified = 0;
  for (const rel of tracked) {
    if (classified.has(rel) || globs.some((re) => re.test(rel))) continue;
    const full = path.join(root, rel);
    if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
    const buffer = fs.readFileSync(full);
    if (looksBinary(buffer)) continue;
    const lines = buffer.toString("utf8").split("\n");
    const hit = lines.map((line, i) => { const bare = line.replace(TOKEN, " "); const l = list.find(([label]) => labelRegExp(label, "").test(bare)); return l ? { label: l[0], line: i + 1 } : null; }).find(Boolean);
    if (!hit) continue;
    unclassified += 1;
    problems.push(`${rel}:${hit.line}: names "${hit.label}" but is no surface, token source or record. Fix: list it under token_sources (a builder renders it), surfaces (the gate resolves its labels), records (dated history) or coverage.ignore (documentation that may show names), in ${path.basename(registry._file)} If this is your own notes file, you can ignore this line`);
  }
  return { problems, unclassified };
}

function scannedStrings(value, skipKeys = [], out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => scannedStrings(v, skipKeys, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) if (!k.startsWith("_") && !skipKeys.includes(k)) scannedStrings(v, skipKeys, out);
  return out;
}

/** exclusive_markers: a unit labelled one value may not use another value's words. Shared by scene files and shot sheets. */
function markerProblems(surface, unit, slug, failures, gaps) {
  for (const rule of surface.exclusive_markers || []) {
    const picked = walk(unit, rule.field)[0]?.value;
    if (picked === undefined) { if (rule.required) failures.push(`${surface.file}: ${slug}: has no ${rule.field}, which exclusive_markers require. Fix: set ${rule.field} to one of ${Object.keys(rule.values).join(", ")}`); continue; }
    if (!rule.values[picked]) { gaps.push(`gap: ${surface.file}: ${slug}: ${rule.field} "${picked}" is not a key of exclusive_markers.values (${Object.keys(rule.values).join(", ")})`); continue; }
    const text = (rule.fields?.length ? rule.fields.flatMap((f) => walk(unit, f).map((w) => w.value)) : scannedStrings(unit, [rule.field, ...(surface.skip_keys || [])])).flatMap((v) => scannedStrings(v)).join("\n");
    for (const [other, words] of Object.entries(rule.values)) {
      if (other === picked) continue;
      for (const w of words) {
        const m = text.match(wordRe(w, "i"));
        if (m) { failures.push(`${surface.file}: ${slug}: says "${m[0].slice(m[1].length)}" (${rule.field} ${other}) but ${rule.field} is "${picked}"${rule.why ? ` (${rule.why})` : ""}. Fix: change ${rule.field} or the text`); break; }
      }
    }
  }
}

/** The words a unit's text must not use, for a prompt's AVOID line: every other value's words of each exclusive marker on its surface. */
export function avoidWords(surface, unit) {
  const out = [];
  for (const rule of surface?.exclusive_markers || []) {
    const picked = walk(unit, rule.field)[0]?.value;
    if (picked === undefined || !rule.values[picked]) continue;
    for (const [other, words] of Object.entries(rule.values)) if (other !== picked) for (const w of words) if (!out.includes(w)) out.push(w);
  }
  return out;
}

// ---- continuity cards and shot sheets ----
// A continuity card says how a character starts a story day (wardrobe, hair, accessories, marks, what they carry). A shot
// sheet lists a story's scenes in reading order, each with its shots; every shot inherits the previous shot's state and
// only a change with a reason alters it. carryContinuity() is the one implementation the gate and compile-shot.mjs share.
export const CARDS_SCHEMA_PATH = path.join(HERE, "continuity-cards.v1.schema.json");
export const SHOT_SHEET_SCHEMA_PATH = path.join(HERE, "shot-sheet.v1.schema.json");
export const CARD_REQUIRED = ["wardrobe"];
export const SCENE_REQUIRED = ["story_day", "location", "time_of_day"];
export const WARDROBE_LAYERS = ["outer", "top", "outfit", "bottom", "shoes"];
export const CHANGE_KEYS = ["wardrobe", "hair", "accessories", "marks", "carries", "hands"];
const CAST_TOKEN = /^\{\{([a-z0-9][a-z0-9-]*)(?::[a-z]+)?\}\}$/;
const filled = (v) => v !== null && v !== undefined && String(v).trim() !== "";
const isNone = (v) => !filled(v) || /^none$/i.test(String(v).trim());
const listOf = (v) => (Array.isArray(v) ? v : filled(v) ? [v] : []).filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim());
const scalarsOf = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k, v]) => !k.startsWith("_") && ["string", "number", "boolean"].includes(typeof v)));

/** Keys starting with _ are notes anywhere in a cards file or a shot sheet: dropped before schema validation, as every scanner skips them. */
export function withoutNotes(value) {
  if (Array.isArray(value)) return value.map(withoutNotes);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([k]) => !k.startsWith("_")).map(([k, v]) => [k, withoutNotes(v)]));
  return value;
}

/**
 * The registry id a cast reference means: a token ({{sam-hayes}}, {{sam-hayes:first}}), a bare id, a { who } object, or a
 * label the index resolves to exactly one entry (so a typed name still computes state while the token-source scan reports
 * it). Null when unknown.
 */
export function castId(ref, characters, index) {
  const raw = typeof ref === "string" ? ref : ref && typeof ref === "object" ? ref.who ?? ref.name : null;
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(CAST_TOKEN);
  if (m) return characters[m[1]] ? m[1] : null;
  const clean = cleanLabel(raw);
  if (characters[clean]) return clean;
  if (!index) return null;
  const { ids, unresolved } = resolve(index, clean);
  return ids.length === 1 && !unresolved.length ? ids[0] : null;
}

/** Each story's continuity pair among the surfaces: its continuity-cards surface and its shot-sheet surface. */
export function continuityStories(surfaces) {
  const byStory = new Map();
  for (const s of surfaces) {
    if (s.error || (s.type !== "continuity-cards" && s.type !== "shot-sheet")) continue;
    const pair = byStory.get(s.story) || { story: s.story };
    pair[s.type === "continuity-cards" ? "cards" : "sheet"] = s;
    byStory.set(s.story, pair);
  }
  return [...byStory.values()];
}

/** A card's starting state. A one-line wardrobe becomes the layer "outfit"; a layer whose value is "none" is left out. */
export function stateFromCard(card = {}) {
  const wardrobe = typeof card.wardrobe === "string" ? (isNone(card.wardrobe) ? {} : { outfit: card.wardrobe.trim() }) : Object.fromEntries(Object.entries(card.wardrobe || {}).filter(([, v]) => !isNone(v)).map(([k, v]) => [k, String(v).trim()]));
  return { wardrobe, hair: filled(card.hair) ? String(card.hair).trim() : "", accessories: listOf(card.accessories), marks: listOf(card.marks), carries: listOf(card.carries) };
}
const cloneState = (s) => ({ wardrobe: { ...s.wardrobe }, hair: s.hair, accessories: [...s.accessories], marks: [...s.marks], carries: [...s.carries] });
const addAll = (list, items) => { for (const i of items) if (!list.includes(i)) list.push(i); };
const removeAll = (list, items) => list.filter((x) => !items.includes(x));

/** A render surface carries story continuity unless it says continuity: false (a product card, a cover). No surface, or an unknown one, counts as carrying. */
export function surfaceCarriesContinuity(id, renderSurfaces) {
  return !id || !renderSurfaces?.[id] || renderSurfaces[id].continuity !== false;
}

/** A scene carries story continuity when it has no shots yet or any shot renders for a surface that does. */
export function sceneCarriesContinuity(scene, renderSurfaces) {
  const shots = Array.isArray(scene?.shots) ? scene.shots : [];
  const sid = (shot) => (filled(shot?.surface) ? String(shot.surface).trim() : filled(scene?.surface) ? String(scene.surface).trim() : undefined);
  return !shots.length || shots.some((s) => surfaceCarriesContinuity(sid(s), renderSurfaces));
}

/**
 * The author's own rule phrases, per render surface and field: what no template, token source or declared script may retype.
 * A phrase is two or more words (a single word such as "hands" or "packaging" is AVOID vocabulary, not a rule, and ordinary
 * prose may use it); the phrase is matched verbatim, case-insensitively.
 */
export function renderPhrases(renderSurfaces) {
  const out = [];
  for (const [id, s] of Object.entries(renderSurfaces || {})) {
    if (id.startsWith("_") || !s || typeof s !== "object") continue;
    const add = (field, v) => { for (const p of listOf(v)) if (/\s/.test(p) && p.replace(/[^A-Za-z]/g, "").length >= 4) out.push({ phrase: p, at: `render_surfaces.${id}.${field}`, surface: id }); };
    add("style_lock", s.style_lock);
    add("must_keep", s.must_keep);
    add("exclude", s.exclude);
    add("hands_rule", s.hands_rule);
    if (typeof s.no_text === "string") add("no_text", s.no_text);
  }
  return out;
}

/**
 * The inverted gate for render rules, the same shape as the one for names: a surface's phrases are written once, in the
 * registry, and every declared template (render_templates globs), token source and structured surface that retypes one
 * verbatim fails with the file, the phrase and the fix. A rule copied into a template goes stale the day the surface
 * changes; the compiler and the builders read the surface instead.
 */
function renderPhraseProblems(registry, surfaces, root) {
  const failures = [];
  const phrases = renderPhrases(registry.render_surfaces);
  const tracked = textFiles(root);
  const files = new Map(); // abs -> { rel, skip }
  const declare = (rel, skip = []) => { const abs = fromRoot(root, rel); if (fs.existsSync(abs) && fs.statSync(abs).isFile()) files.set(abs, { rel, skip: new Set(skip) }); };
  let templates = 0;
  for (const g of registry.render_templates || []) {
    const re = globToRegExp(g);
    const hits = tracked.filter((rel) => re.test(rel));
    if (!hits.length && !fs.existsSync(fromRoot(root, g))) failures.push(`${registry._file}: render_templates "${g}" matches no tracked file. Fix: correct the glob or remove it`);
    for (const rel of hits.length ? hits : [g]) { declare(rel); templates += 1; }
  }
  const count = Object.keys(registry.render_surfaces || {}).filter((k) => !k.startsWith("_")).length;
  if (!phrases.length) return { failures, templates, surfaces: count };
  for (const s of surfaces) if (!s.error && ["scenes", "continuity", "prose", "continuity-cards", "shot-sheet"].includes(s.type)) declare(s.file, s.skip_keys || []);
  for (const t of registry.token_sources || []) { const re = globToRegExp(t.file); for (const rel of tracked.filter((r) => re.test(r))) declare(rel, t.skip_keys || []); }
  const self = path.relative(root, registry._file);
  const hit = (text, where, rel, out) => {
    const lower = String(text).toLowerCase();
    for (const p of phrases) if (lower.includes(p.phrase.toLowerCase())) out.push(`${rel}: ${where}: retypes the render surface phrase "${p.phrase}" (${p.at}). Fix: read it from the surface: node scripts/compile-shot.mjs prints KEEP and AVOID from render_surfaces.${p.surface}, and a builder reads that entry from the registry`);
  };
  const walkStrings = (value, skip, where, rel, out) => {
    if (typeof value === "string") return hit(value, where || "$", rel, out);
    if (Array.isArray(value)) return value.forEach((v, i) => walkStrings(v, skip, `${where}[${i}]`, rel, out));
    if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) { if (k.startsWith("_") || k === "$schema" || skip.has(k)) continue; walkStrings(v, skip, where ? `${where}.${k}` : k, rel, out); }
  };
  for (const [abs, { rel, skip }] of files) {
    if (rel === self) continue;
    const out = [];
    const text = fs.readFileSync(abs, "utf8");
    if (rel.endsWith(".json")) { let json; try { json = JSON.parse(text); } catch { continue; } walkStrings(json, skip, "", rel, out); }
    else text.split("\n").forEach((line, i) => hit(line, `line ${i + 1}`, rel, out));
    failures.push(...new Set(out));
  }
  return { failures, templates, surfaces: count };
}

/**
 * Carry state through one story's shot sheet, from its continuity cards. Pure: takes the two parsed files, returns the
 * compiled scenes (each shot with every present character's state after that shot's changes, the changes applied and what
 * is held) and the problems the gate reports. The rules:
 *   - a scene header fills sceneRequired (default story_day, location, time_of_day); story_day is a key of the cards'
 *     story_days; location is a key of the sheet's locations when it declares any;
 *   - a character in a shot has a card for the scene's story day, else there is nothing to carry (a failure);
 *   - a card fills cardRequired (default wardrobe); carries lists prop ids;
 *   - within a story day, state carries from shot to shot and scene to scene; a new story day starts from the cards again;
 *   - every change names who and says why; wardrobe layers merge ("none" removes a layer, a string replaces the whole),
 *     hair replaces, accessories, marks and carries add or remove, hands moves a prop from who to `to`;
 *   - a character holds only what they carry at that moment: the card, an earlier add, or a hand-over;
 *   - marks that end a story day and are missing from that character's next card are a gap (healed, or forgotten?).
 */
export function carryContinuity({ cards, sheet, characters = {}, index, story, cardsFile = "the cards file", sheetFile = "the shot sheet", cardRequired = CARD_REQUIRED, sceneRequired = SCENE_REQUIRED, renderSurfaces = null, registryFile = "character-registry.json" }) {
  const failures = [];
  const gaps = [];
  const surfaceIds = renderSurfaces && typeof renderSurfaces === "object" ? Object.keys(renderSurfaces).filter((k) => !k.startsWith("_")) : [];
  const seen = []; // every cast or card reference, for the registry's usage count
  const nameOf = (id) => characters[id]?.name || id;
  const days = cards?.story_days || {};
  const dayKeys = Object.keys(days);
  const locations = sheet?.locations;
  const cardOf = (id, day) => cards?.cards?.[id]?.[day];
  const propOk = (p, where, field) => {
    if (!characters[p]) { failures.push(`${where}: ${field} "${p}" is not a registry id. Fix: props are entries of kind prop, listed by id (never by name)`); return false; }
    if (characters[p].kind !== "prop") { failures.push(`${where}: ${field} "${p}" is ${nameOf(p)} (kind ${characters[p].kind}), not a prop. Fix: list a prop id here; a person belongs under characters`); return false; }
    seen.push(p); // a prop on a card or in a hand is used on this surface, like a prop a scene lists
    return true;
  };
  // the cards
  for (const [id, byDay] of Object.entries(cards?.cards || {})) {
    if (!characters[id]) { failures.push(`${cardsFile}: cards.${id}: unknown id. Fix: use a registry id (lower-case letters, digits, hyphens), or add the entry first`); continue; }
    seen.push(id);
    if (!allowed(characters[id], story)) failures.push(`${cardsFile}: cards.${id}: ${nameOf(id)} is of ${characters[id].story}, not a character of ${story}. Fix: add "${story}" to ${id}.also_in, or remove the card`);
    for (const [day, card] of Object.entries(byDay || {})) {
      const where = `${cardsFile}: cards.${id}.${day}`;
      if (!days[day]) failures.push(`${where}: "${day}" is not a key of story_days${dayKeys.length ? ` (${dayKeys.join(", ")})` : ""}. Fix: add it to story_days with a label, or correct the key`);
      for (const f of cardRequired) {
        const v = card?.[f];
        const empty = !filled(v) || (typeof v === "object" && !Array.isArray(v) && !Object.values(v).some((x) => !isNone(x))) || (Array.isArray(v) && !v.length);
        if (empty) failures.push(`${where}: missing ${f}. Fix: write ${nameOf(id)}'s ${f} at the start of ${day}; the shot sheet carries it forward from there`);
      }
      for (const p of listOf(card?.carries)) propOk(p, where, "carries");
    }
  }
  // the scenes, in reading order
  const scenes = {};
  const state = new Map(); // id -> state within the current story day
  let currentDay;
  const startDay = (day) => {
    if (currentDay !== undefined) {
      for (const [id, s] of state) {
        const next = cardOf(id, day);
        if (!next || !s.marks.length) continue;
        const missing = s.marks.filter((m) => !listOf(next.marks).includes(m));
        if (missing.length) gaps.push(`gap: ${cardsFile}: cards.${id}.${day}: ${nameOf(id)} ended ${currentDay} with marks [${missing.join(", ")}] that this card does not list. If they healed or washed off overnight, say so in _notes; if not, list them`);
      }
    }
    state.clear();
    currentDay = day;
  };
  for (const [slug, scene] of Object.entries(sheet?.scenes || {})) {
    const at = `${sheetFile}: ${slug}`;
    const shots = Array.isArray(scene?.shots) ? scene.shots : [];
    const surfaceOf = (shot) => (filled(shot?.surface) ? String(shot.surface).trim() : filled(scene?.surface) ? String(scene.surface).trim() : undefined);
    // a scene whose every shot renders for a surface without story continuity (a product card, a cover) needs no story day, place or time
    const storyScene = sceneCarriesContinuity(scene, renderSurfaces);
    if (storyScene) for (const f of sceneRequired) if (!filled(scene?.[f])) failures.push(`${at}: missing ${f}. Fix: every scene header says ${sceneRequired.join(", ")}${f === "story_day" && dayKeys.length ? ` (story days: ${dayKeys.join(", ")})` : ""}${f === "location" && locations ? ` (locations: ${Object.keys(locations).join(", ")})` : ""}`);
    const day = scene?.story_day;
    const dayOk = filled(day) && !!days[day];
    if (filled(day) && !days[day]) failures.push(`${at}: story_day "${day}" is not a key of story_days in ${cardsFile}${dayKeys.length ? ` (${dayKeys.join(", ")})` : ""}. Fix: add it there with a label, or correct it here`);
    if (filled(scene?.location) && locations && !locations[scene.location]) failures.push(`${at}: location "${scene.location}" is not a key of locations (${Object.keys(locations).join(", ")}). Fix: add it to locations with its look, or correct it here`);
    if (dayOk && day !== currentDay) startDay(day);
    const ensure = (id, where) => {
      if (state.has(id)) return state.get(id);
      const card = dayOk ? cardOf(id, day) : undefined;
      if (dayOk && !card) failures.push(`${where}: ${nameOf(id)} is in this shot but has no continuity card for ${day}. Fix: add cards.${id}.${day} to ${cardsFile} (${cardRequired.join(", ")} at least); nothing carries forward from an empty card`);
      const s = stateFromCard(card);
      state.set(id, s);
      return s;
    };
    if (!shots.length) gaps.push(`gap: ${at}: has no shots yet`);
    const compiled = { slug, ...scalarsOf(scene), day: dayOk ? days[day] : {}, place: locations?.[scene?.location] || {}, shots: [] };
    shots.forEach((shot, i) => {
      const shotId = filled(shot?.id) ? String(shot.id) : String(i + 1);
      const where = `${at}: shot ${shotId}`;
      // where will this picture be used? a declared render surface, named on the shot or on the scene header
      const sid = surfaceOf(shot);
      if (surfaceIds.length) {
        if (!sid) failures.push(`${where}: has no surface: where will this picture be used? Fix: set "surface" on the shot or on the scene header, one of ${surfaceIds.join(", ")}`);
        else if (!renderSurfaces[sid]) failures.push(`${where}: surface "${sid}" is not in render_surfaces (${surfaceIds.join(", ")}). Fix: add it to render_surfaces in ${registryFile} with its look rules, or correct it here`);
      } else if (sid) failures.push(`${where}: names surface "${sid}" but ${registryFile} declares no render_surfaces. Fix: declare render_surfaces there (name, style_lock, must_keep, exclude, size, no_text, hands_rule, why), or remove surface here`);
      const cast = [];
      (Array.isArray(shot?.characters) ? shot.characters : []).forEach((entry, j) => {
        const id = castId(entry, characters, index);
        const label = typeof entry === "string" ? entry : entry?.who;
        if (!id) { failures.push(`${where}: characters[${j}] "${label}" is no registry id, token or known name of ${story}. Fix: write {{<id>}} of an entry allowed in ${story}, or add the entry first`); return; }
        if (!allowed(characters[id], story)) failures.push(`${where}: "${label}" is ${nameOf(id)} of ${characters[id].story}, not a character of ${story}. Fix: add "${story}" to ${id}.also_in if it is the same person`);
        seen.push(id);
        cast.push({ id, entry: entry && typeof entry === "object" ? entry : {} });
      });
      const inShot = cast.map((c) => c.id);
      for (const c of cast) ensure(c.id, where);
      // changes first: a change is in force for the whole shot ("in this shot she has taken off the coat")
      const applied = [];
      (Array.isArray(shot?.changes) ? shot.changes : []).forEach((change, k) => {
        const cw = `${where}: changes[${k}]`;
        const who = castId(change?.who, characters, index);
        if (!who) { failures.push(`${cw}: who "${change?.who}" is no registry id, token or known name. Fix: "who": "{{<id>}}"`); return; }
        seen.push(who);
        if (!filled(change?.reason)) failures.push(`${cw}: the change for ${nameOf(who)} has no reason. Fix: add "reason": why it changes in this shot. A change is a decision; everything else carries forward on its own`);
        const touched = CHANGE_KEYS.filter((key) => change[key] !== undefined);
        if (!touched.length) failures.push(`${cw}: changes nothing. Fix: set one of ${CHANGE_KEYS.join(", ")}`);
        const s = ensure(who, cw);
        if (typeof change.wardrobe === "string") { applied.push({ who, kind: "wardrobe", to: change.wardrobe.trim() }); s.wardrobe = isNone(change.wardrobe) ? {} : { outfit: change.wardrobe.trim() }; }
        else if (change.wardrobe && typeof change.wardrobe === "object") {
          for (const [layer, value] of Object.entries(change.wardrobe)) {
            const from = s.wardrobe[layer];
            if (isNone(value)) delete s.wardrobe[layer]; else s.wardrobe[layer] = String(value).trim();
            applied.push({ who, kind: "wardrobe", layer, from, to: isNone(value) ? undefined : String(value).trim() });
          }
        }
        if (filled(change.hair)) { applied.push({ who, kind: "hair", from: s.hair, to: String(change.hair).trim() }); s.hair = String(change.hair).trim(); }
        for (const key of ["accessories", "marks", "carries"]) {
          if (change[key] === undefined) continue;
          const add = listOf(change[key]?.add).filter((x) => key !== "carries" || propOk(x, cw, "carries.add"));
          const remove = listOf(change[key]?.remove);
          addAll(s[key], add);
          s[key] = removeAll(s[key], remove);
          for (const a of add) applied.push({ who, kind: key, add: a });
          for (const r of remove) applied.push({ who, kind: key, remove: r });
        }
        if (change.hands !== undefined) {
          const prop = String(change.hands).trim();
          const to = castId(change.to, characters, index);
          if (!to) failures.push(`${cw}: hands "${prop}" to "${change.to}", who is no registry id, token or known name. Fix: "to": "{{<id>}}"`);
          if (propOk(prop, cw, "hands")) {
            if (!s.carries.includes(prop)) failures.push(`${cw}: ${nameOf(who)} hands over "${prop}" but does not carry it here (carries: ${s.carries.join(", ") || "nothing"}). Fix: give it on cards.${who}.${day}, or hand it to ${nameOf(who)} in an earlier shot`);
            s.carries = removeAll(s.carries, [prop]);
            if (to) { seen.push(to); addAll(ensure(to, cw).carries, [prop]); }
            applied.push({ who, kind: "hands", prop, to });
          }
        }
      });
      // what each present character holds must be something they carry at this moment
      const people = cast.map((c) => {
        const s = state.get(c.id) || stateFromCard();
        const holding = listOf(c.entry.holding);
        for (const p of holding) {
          if (!propOk(p, where, "holding")) continue;
          if (!s.carries.includes(p)) failures.push(`${where}: ${nameOf(c.id)} holds "${p}", which the card for ${day} does not give ${nameOf(c.id)} and no earlier change handed over. Fix: add "${p}" to cards.${c.id}.${day}.carries in ${cardsFile}, or add a change { "who": "{{<id>}}", "hands": "${p}", "to": "{{${c.id}}}", "reason": "..." } in an earlier shot`);
        }
        return { id: c.id, ...scalarsOf(Object.fromEntries(Object.entries(c.entry).filter(([k]) => k !== "who"))), holding, state: cloneState(s) };
      });
      const props = listOf(shot?.props).filter((p) => propOk(p, where, "props"));
      compiled.shots.push({ id: shotId, index: i, ...scalarsOf(Object.fromEntries(Object.entries(shot || {}).filter(([k]) => k !== "id"))), surface: sid, continuity: surfaceCarriesContinuity(sid, renderSurfaces), characters: people, props, changes: applied, in_shot: inShot, first_of_day: dayOk && i === 0 && compiled.shots.length === 0 && Object.values(scenes).every((sc) => sc.story_day !== day) });
    });
    scenes[slug] = compiled;
  }
  return { failures, gaps, scenes, ids: [...new Set(seen)], labels: seen.length };
}

// ---- the check ----
export function checkRegistry(registry) {
  const failures = [];
  const gaps = [];
  const root = registry._root;
  const schema = readJson(SCHEMA_PATH);
  const bare = Object.fromEntries(Object.entries(registry).filter(([k]) => !k.startsWith("_") || k === "_about"));
  const plainSchema = (p) => {
    const m = p.match(/^\$\.characters\.([^.\[]+)\.([A-Za-z_]+): (.*)$/);
    if (!m) return p;
    const hint = m[2] === "kind" ? ' Most characters are "person", animals and robots included; "companion" also needs a species list in the registry' : "";
    return `character "${m[1]}", field "${m[2]}": ${m[3]}.${hint}`;
  };
  for (const problem of validate(schema, bare)) failures.push(`${registry._file}: ${plainSchema(problem)}`);
  const characters = registry.characters || {};
  const { index, failures: indexFailures, retired } = buildIndex(registry);
  failures.push(...indexFailures);
  const liveLabels = [...index.values()].map((v) => v.label).sort((a, b) => b.length - a.length);
  const used = new Map(Object.keys(characters).map((id) => [id, 0]));
  const stats = { entries: Object.keys(characters).length, labels: 0, surfaces: 0 };
  const touch = (id) => used.set(id, (used.get(id) || 0) + 1);

  // entry-level facts
  for (const [id, entry] of Object.entries(characters)) {
    for (const member of entry.members || []) if (!characters[member]) failures.push(`${registry._file}: ${id} lists member ${member}, which is not an entry`);
    if (entry.kind === "group" && !(entry.members || []).length) failures.push(`${registry._file}: group ${id} has no members`);
    for (const source of entry.sources || []) {
      const file = fromRoot(root, source.split("#")[0]);
      if (!fs.existsSync(file)) failures.push(`${registry._file}: ${id} source ${source} does not exist. Fix: correct the path or remove it`);
    }
    if (entry.kind === "companion") {
      if (!entry.species) failures.push(`${registry._file}: ${id} is a companion with no species. Fix: set species to a key of the registry's species map (${Object.keys(registry.species || {}).join(", ") || "add the map first"})`);
      else if (!(registry.species || {})[entry.species]) failures.push(`${registry._file}: ${id}.species "${entry.species}" is not a key of the species map. Fix: add it with its words, or use an existing one`);
    }
    if (entry.born !== undefined && entry.ages) {
      for (const [year, age] of Object.entries(entry.ages)) {
        const expected = Number(year) - entry.born;
        if (age !== expected && age !== expected - 1) failures.push(`${registry._file}: ${id} is ${age} in ${year} but born ${entry.born} (that is ${expected - 1} or ${expected}). Fix: correct born or the age`);
      }
    }
    // a form is a string, or a contextual form picked by a field of the unit being resolved
    for (const [form, value] of Object.entries(entry.forms || {})) {
      if (typeof value === "string") continue;
      const ok = value && typeof value === "object" && typeof value.by === "string" && value.by && value.values && typeof value.values === "object" && Object.values(value.values).every((t) => typeof t === "string" && t);
      if (!ok) failures.push(`${registry._file}: ${id}.forms.${form} must be a string or { "by": "<field>", "values": { "<value>": "<text>", "default": "<text>" } }`);
    }
    if (entry.anchor?.image && !fs.existsSync(fromRoot(root, entry.anchor.image))) gaps.push(`gap: ${id}.anchor.image ${entry.anchor.image} is not on disk here (generated images are often untracked); the registry still records which image is the anchor`);
  }

  const surfaces = surfacesOf(registry);
  const sceneSlugs = new Map(); // story -> Set(slug)
  const resolvedBy = []; // { id, surface }
  // a story's continuity card, for cast fields that hold card keys (the look units of a story) instead of names
  const cardFiles = new Map(surfaces.filter((s) => s.type === "continuity").map((s) => [s.story, fromRoot(root, s.file)]));
  const cards = new Map();
  const cardOf = (storyId) => {
    if (!cards.has(storyId)) { const f = cardFiles.get(storyId); cards.set(storyId, f && fs.existsSync(f) ? readJson(f) : null); }
    return cards.get(storyId);
  };
  const resolveRef = (label, storyId, extraSplit) => {
    const clean = cleanLabel(label);
    if (characters[clean]) return { ids: [clean], unresolved: [] };                       // a registry id
    const card = storyId ? cardOf(storyId) : null;
    const member = card?.characters?.[clean];
    if (member) {                                                                           // a continuity-card key
      const owner = Object.entries(characters).find(([, e]) => (e.continuity_ids || []).includes(clean) && allowed(e, storyId));
      if (owner) return { ids: [owner[0]], unresolved: [] };
      if (typeof member.scene_name === "string") return resolve(index, member.scene_name, extraSplit);
    }
    return resolve(index, label, extraSplit);
  };
  const storyText = (text, storyId, where) => { for (const p of storyTextProblems(registry, text, storyId, liveLabels)) failures.push(`${where}: ${p}`); };
  for (const surface of surfaces) {
    if (surface.error) { failures.push(surface.error); continue; }
    const file = fromRoot(root, surface.file);
    if (!fs.existsSync(file)) { failures.push(`${registry._file}: surface ${surface.file} does not exist. Fix: correct the path`); continue; }
    stats.surfaces += 1;
    const extraSplit = surface.split || [];
    const seen = (label, where) => {
      stats.labels += 1;
      const { ids, unresolved } = resolveRef(label, surface.story, extraSplit);
      for (const u of unresolved) failures.push(`${surface.file}: ${where}: unknown name "${u}". ${fixForUnknown(u, surface)}`);
      for (const id of ids) {
        touch(id);
        const entry = characters[id];
        if (!allowed(entry, surface.story)) {
          failures.push(`${surface.file}: ${where}: "${cleanLabel(label)}" is ${entry.name} of ${entry.story}, not a character of ${surface.story}. Fix: rename this one, or add "${surface.story}" to ${id}.also_in if it is the same person`);
        }
        resolvedBy.push({ id, surface: surface.story });
      }
      for (const { id, form } of retired) {
        if (cleanLabel(label).toLowerCase() === form.toLowerCase()) failures.push(`${surface.file}: ${where}: "${form}" is retired (${id}). Fix: use ${characters[id].name}`);
      }
    };
    if (surface.type === "scenes") {
      const json = readJson(file);
      const names = loadNames(root);
      const scenes = scenesIn(surface, json).map(([slug, scene]) => {
        try { return [slug, names.resolveDeep(scene, surface.story)]; }
        catch (e) { failures.push(`${surface.file}: ${slug}: ${e.message.replace(/^names: /, "")}. Fix: use a registry id or a card key of ${surface.story}`); return [slug, scene]; }
      });
      sceneSlugs.set(surface.story, new Set([...(sceneSlugs.get(surface.story) || []), ...scenes.map(([slug]) => slug)]));
      for (const [slug, scene] of scenes) {
        for (const { label, where } of labelsOfScene(surface, scene)) seen(label, `${slug}.${where}`);
        if (surface.prose) storyText(scannedStrings(scene, surface.skip_keys || []).join("\n"), surface.story, `${surface.file}: ${slug}`);
        // a field lives once: a key another file owns may not be copied here
        for (const rule of surface.forbid_keys || []) {
          if (walk(scene, rule.key).length) failures.push(`${surface.file}: ${slug}: holds "${rule.key}", which ${rule.owner} owns${rule.why ? ` (${rule.why})` : ""}. Fix: delete it here; the builder reads ${rule.key} from ${rule.owner}`);
        }
        // declared vocabularies may not mix: a scene labelled morning does not describe lamplight
        markerProblems(surface, scene, slug, failures, gaps);
      }
    } else if (surface.type === "continuity-cards" || surface.type === "shot-sheet") {
      // read and carried per story once every surface is known: see continuityStories() below the loop
    } else if (surface.type === "names") {
      const json = readJson(file);
      for (const spec of surface.paths || []) {
        for (const { value, where } of walk(json, spec)) if (typeof value === "string") seen(value, where);
      }
    } else if (surface.type === "headings") {
      const result = headingLabels(surface, fs.readFileSync(file, "utf8"));
      if (result.error) { failures.push(result.error); continue; }
      for (const { label, where } of result.labels) seen(label, where);
    } else if (surface.type === "continuity") {
      const continuity = readJson(file);
      const linked = new Map();
      for (const [id, entry] of Object.entries(characters)) for (const cid of entry.continuity_ids || []) if (entry.story === surface.story) linked.set(cid, id);
      for (const [cid, character] of Object.entries(continuity.characters || {})) {
        const name = character?.scene_name;
        if (!name) { failures.push(`${surface.file}: characters.${cid} has no scene_name`); continue; }
        stats.labels += 1;
        const { ids, unresolved } = resolve(index, name, extraSplit);
        for (const u of unresolved) failures.push(`${surface.file}: characters.${cid}.scene_name: unknown name "${u}". ${fixForUnknown(u, surface)}`);
        for (const id of ids) {
          touch(id);
          if (!allowed(characters[id], surface.story)) failures.push(`${surface.file}: characters.${cid}.scene_name "${name}" is ${characters[id].name} of ${characters[id].story}, not of ${surface.story}. Fix: rename, or add also_in`);
          if (linked.get(cid) !== id) gaps.push(`gap: ${surface.file}: characters.${cid} resolves to ${id} but ${id}.continuity_ids does not list "${cid}"`);
        }
      }
      for (const [cid, id] of linked) if (!continuity.characters?.[cid]) failures.push(`${registry._file}: ${id}.continuity_ids lists "${cid}", which is not in ${surface.file}. Fix: correct the id`);
      try { storyText(scannedStrings(loadNames(root).resolveDeep(continuity, surface.story), surface.skip_keys || []).join("\n"), surface.story, surface.file); }
      catch (e) { failures.push(`${surface.file}: ${e.message}`); }
    } else if (surface.type === "prose") {
      // story-scoped prose data (pack records, art inventories): each entry's story comes from a field or its key
      const json = readJson(file);
      const names = loadNames(root);
      const holder = surface.root ? walk(json, surface.root)[0]?.value : json;
      if (!holder || typeof holder !== "object") { failures.push(`${surface.file}: root ${surface.root || "$"} is not an object`); continue; }
      for (const [key, entry] of Object.entries(holder)) {
        if (key.startsWith("_")) continue;
        const pick = surface.story_field ? entry?.[surface.story_field] : key;
        const storyId = (surface.stories || {})[pick];
        if (!storyId) continue;
        let resolved; // the entry holds {{id}} tokens; the names are rendered for the story before the scan, so a wrong-story token still fails
        try { resolved = names.resolveDeep(entry, storyId); } catch (e) { failures.push(`${surface.file}: ${key}: ${e.message}`); continue; }
        storyText(scannedStrings(resolved, surface.skip_keys || []).join("\n"), storyId, `${surface.file}: ${key}`);
        for (const rule of surface.forbid_keys || []) {
          if (walk(entry, rule.key).length) failures.push(`${surface.file}: ${key}: holds "${rule.key}", which ${rule.owner} owns${rule.why ? ` (${rule.why})` : ""}. Fix: delete it here; the builder reads ${rule.key} from ${rule.owner}`);
        }
      }
    }
  }
  // continuity cards and shot sheets, per story: the cards start each story day, the sheet carries state shot by shot
  for (const pair of continuityStories(surfaces)) {
    const cardsAbs = pair.cards && fromRoot(root, pair.cards.file);
    const sheetAbs = pair.sheet && fromRoot(root, pair.sheet.file);
    if (pair.sheet && !pair.cards) failures.push(`${registry._file}: the shot-sheet surface ${pair.sheet.file} (${pair.story}) has no continuity-cards surface for the same story. Fix: declare { "type": "continuity-cards", "file": "<cards.json>", "story": "${pair.story}" }; the sheet carries what the cards start`);
    if ((cardsAbs && !fs.existsSync(cardsAbs)) || (sheetAbs && !fs.existsSync(sheetAbs))) continue; // the missing file is already a failure
    let cards = null, sheet = null;
    try { cards = cardsAbs ? readJson(cardsAbs) : null; sheet = sheetAbs ? readJson(sheetAbs) : null; } catch (e) { failures.push(`${pair.story}: ${e.message}`); continue; }
    if (cards) for (const p of validate(readJson(CARDS_SCHEMA_PATH), withoutNotes(cards))) failures.push(`${pair.cards.file}: ${p}`);
    if (sheet) for (const p of validate(readJson(SHOT_SHEET_SCHEMA_PATH), withoutNotes(sheet))) failures.push(`${pair.sheet.file}: ${p}`);
    const carried = carryContinuity({ cards, sheet, characters, index, story: pair.story, cardsFile: pair.cards?.file, sheetFile: pair.sheet?.file, cardRequired: pair.cards?.required || CARD_REQUIRED, sceneRequired: pair.sheet?.required || SCENE_REQUIRED, renderSurfaces: registry.render_surfaces, registryFile: path.basename(registry._file) });
    failures.push(...carried.failures);
    gaps.push(...carried.gaps);
    stats.labels += carried.labels;
    for (const id of carried.ids) touch(id);
    const names = loadNames(root);
    if (cards) {
      try { storyText(scannedStrings(names.resolveDeep(cards, pair.story), pair.cards.skip_keys || []).join("\n"), pair.story, pair.cards.file); }
      catch (e) { failures.push(`${pair.cards.file}: ${e.message.replace(/^names: /, "")}`); }
    }
    if (sheet) {
      // the story's scene file, when it has one: the sheet plans the picture, the scene holds the page, and they must agree
      const storyScenes = new Map();
      for (const s of surfaces) {
        if (s.error || s.type !== "scenes" || s.story !== pair.story || !fs.existsSync(fromRoot(root, s.file))) continue;
        for (const [slug, sc] of scenesIn(s, readJson(fromRoot(root, s.file)))) storyScenes.set(slug, { scene: sc, file: s.file });
      }
      for (const [slug, scene] of Object.entries(sheet.scenes || {})) {
        let resolved = scene;
        try { resolved = names.resolveDeep(scene, pair.story); }
        catch (e) { failures.push(`${pair.sheet.file}: ${slug}: ${e.message.replace(/^names: /, "")}. Fix: use a registry id or a card key of ${pair.story}`); }
        storyText(scannedStrings(resolved, pair.sheet.skip_keys || []).join("\n"), pair.story, `${pair.sheet.file}: ${slug}`);
        markerProblems(pair.sheet, resolved, slug, failures, gaps);
        const link = typeof scene?.scene === "string" && scene.scene ? scene.scene : slug;
        const linked = storyScenes.get(link);
        if (storyScenes.size && !linked && sceneCarriesContinuity(scene, registry.render_surfaces)) gaps.push(`gap: ${pair.sheet.file}: ${slug}: no scene "${link}" in the story's scene file; the sheet plans a scene the story does not have yet`);
        if (linked) for (const f of ["time_of_day", "story_day", "stage"]) {
          if (scene?.[f] !== undefined && linked.scene?.[f] !== undefined && String(scene[f]) !== String(linked.scene[f])) failures.push(`${pair.sheet.file}: ${slug}: ${f} "${scene[f]}" but ${linked.file} says "${linked.scene[f]}". Fix: one of them is wrong; the picture follows the sheet, the page follows the scene, and they must agree`);
        }
      }
    }
  }
  // every tracked text file outside records: a retired name must not come back anywhere live
  const tokens = tokenSourceProblems(registry, surfaces, root);
  failures.push(...tokens.failures);
  stats.token_sources = tokens.sources;
  // render surfaces: a rule phrase is written once, in the registry; a template or token source that retypes it fails
  const rules = renderPhraseProblems(registry, surfaces, root);
  failures.push(...rules.failures);
  stats.render_surfaces = rules.surfaces;
  stats.templates = rules.templates;
  const repo = scanRepo(registry, surfaces.filter((s) => !s.error).map((s) => fromRoot(root, s.file)));
  failures.push(...repo.failures);
  stats.files = repo.scanned;
  // coverage: a file that is no surface, token source, record or ignored path, and still names a character, is reported
  const coverage = coverageProblems(registry, surfaces, root);
  (registry.coverage?.strict ? failures : gaps).push(...coverage.problems.map((p) => (registry.coverage?.strict ? p : `gap: ${p}`)));
  stats.unclassified = coverage.unclassified;
  for (const [id, entry] of Object.entries(characters)) {
    if (entry.first_appearance && sceneSlugs.has(entry.story) && !sceneSlugs.get(entry.story).has(entry.first_appearance)) {
      failures.push(`${registry._file}: ${id}.first_appearance "${entry.first_appearance}" is not a scene of ${entry.story}. Fix: use a scene slug`);
    }
    if (!used.get(id) && entry.kind !== "group" && !entry.prose_only) gaps.push(`gap: ${id} (${entry.name}) appears on no surface`);
  }
  // known problems (someone else's file, a decision pending) print as gaps while they are listed, with the task that owns them
  const kept = [];
  const matched = new Set();
  for (const f of failures) {
    const k = (registry.known || []).find((k) => f.startsWith(k.file) && f.includes(k.text));
    if (k) { matched.add(k); gaps.push(`gap (known, ${k.owner}, ${k.task}, ${k.date}): ${f}`); } else kept.push(f);
  }
  for (const k of registry.known || []) if (!matched.has(k)) gaps.push(`gap: known entry ${k.file} "${k.text}" matches nothing now; remove it from known`);
  return { failures: kept, gaps, stats, index };
}

/** Stub entries for every label the registry cannot resolve, for a repo adopting the skill. */
export function suggest(registry) {
  const { index } = buildIndex(registry);
  const stubs = {};
  for (const surface of surfacesOf(registry)) {
    if (surface.error || ["continuity", "continuity-cards", "shot-sheet"].includes(surface.type)) continue;
    const file = fromRoot(registry._root, surface.file);
    if (!fs.existsSync(file)) continue;
    const add = (label) => {
      const { unresolved } = resolve(index, label, surface.split || []);
      for (const u of unresolved) {
        const id = u.toLowerCase().replace(/\s*\([^()]*\)\s*$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
        stubs[id] ||= { name: u.replace(/\s*\([^()]*\)\s*$/, ""), kind: "person", story: surface.story, role: "UNKNOWN", aliases: [] };
        if (u !== stubs[id].name && !stubs[id].aliases.includes(u)) stubs[id].aliases.push(u);
      }
    };
    if (surface.type === "scenes") for (const [, scene] of scenesIn(surface, readJson(file))) for (const { label } of labelsOfScene(surface, scene)) add(label);
    if (surface.type === "names") for (const spec of surface.paths || []) for (const { value } of walk(readJson(file), spec)) if (typeof value === "string") add(value);
    if (surface.type === "headings") { const r = headingLabels(surface, fs.readFileSync(file, "utf8")); for (const { label } of r.labels || []) add(label); }
  }
  return stubs;
}

export function writeJsonLike(file, value, sample) {
  const second = String(sample || "").split("\n")[1] || "  ";
  const indent = second.match(/^\s*/)[0].length || 2;
  fs.writeFileSync(file, JSON.stringify(value, null, indent) + "\n");
}
