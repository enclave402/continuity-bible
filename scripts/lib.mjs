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
import { loadNames, TOKEN, atomicLabels, labelRegExp } from "./names.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCHEMA_PATH = path.join(HERE, "character-registry.v1.schema.json");
export const DEFAULT_FIELDS = ["characters", "props", "speaker", "marginAuthor", "dialogue[].speaker"];
export const DEFAULT_SPLIT = ["&", "+", " and "];
export const DEFAULT_HEADING = "^###\\s+(?:\\d+\\.\\s+)?([^(\\n]+?)\\s*\\(";

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
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
    const error = new Error(`registry missing: ${file}. Fix: create character-registry.json there (see the README), or pass --registry <path>`);
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
function tokenSourceProblems(registry, surfaces, root) {
  const failures = [];
  const characters = registry.characters || {};
  const cards = surfaces.filter((s) => s.type === "continuity" && !s.error).map((s) => fromRoot(root, s.file)).filter((f) => fs.existsSync(f)).map((f) => { try { return readJson(f); } catch { return null; } }).filter(Boolean);
  const { list } = atomicLabels(characters, cards);
  if (!list.length) return { failures, sources: 0 };
  const sources = new Map(); // abs file -> { rel, skip: Set }
  const declare = (rel, skip = []) => { const abs = fromRoot(root, rel); if (fs.existsSync(abs) && fs.statSync(abs).isFile()) sources.set(abs, { rel, skip: new Set(skip) }); };
  for (const s of surfaces) {
    if (s.error) continue;
    if (s.type === "scenes") declare(s.file, s.skip_keys || []);
    if (s.type === "continuity") declare(s.file, ["scene_name", ...(s.skip_keys || [])]);
    if (s.type === "prose") declare(s.file, s.skip_keys || []);
  }
  const tracked = textFiles(root);
  for (const t of registry.token_sources || []) {
    const re = globToRegExp(t.file);
    const hits = tracked.filter((rel) => re.test(rel));
    if (!hits.length && !fs.existsSync(fromRoot(root, t.file))) failures.push(`${registry._file}: token_sources "${t.file}" matches no tracked file. Fix: correct the path or remove it`);
    for (const rel of hits.length ? hits : [t.file]) declare(rel, t.skip_keys || []);
  }
  const problemsIn = (text, where, out) => {
    const bare = String(text).replace(TOKEN, " ");
    for (const [label, token] of list) if (labelRegExp(label, "").test(bare)) out.push(`${where}: names "${label}" in a token source. Fix: write ${token}`);
  };
  const walkStrings = (value, skip, where, out) => {
    if (typeof value === "string") return problemsIn(value, where, out);
    if (Array.isArray(value)) return value.forEach((v, i) => walkStrings(v, skip, `${where}[${i}]`, out));
    if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) { if (k.startsWith("_") || k === "$schema" || skip.has(k)) continue; walkStrings(v, skip, where ? `${where}.${k}` : k, out); }
  };
  for (const [abs, { rel, skip }] of sources) {
    const out = [];
    const text = fs.readFileSync(abs, "utf8");
    if (rel.endsWith(".json")) { let json; try { json = JSON.parse(text); } catch { continue; } walkStrings(json, skip, "", out); }
    else text.split("\n").forEach((line, i) => problemsIn(line, `line ${i + 1}`, out));
    const seen = new Set();
    const unique = out.filter((o) => !seen.has(o) && seen.add(o));
    for (const o of unique.slice(0, 8)) failures.push(`${rel}: ${o}`);
    if (unique.length > 8) failures.push(`${rel}: ${unique.length - 8} more written-out name(s) in a token source. Fix: node scripts/tokenize.mjs ${rel} [--text] [--story <id>]`);
  }
  return { failures, sources: sources.size };
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
    problems.push(`${rel}:${hit.line}: names "${hit.label}" but is no surface, token source or record. Fix: list it under token_sources (a builder renders it), surfaces (the gate resolves its labels), records (dated history) or coverage.ignore (documentation that may show names), in ${path.basename(registry._file)}`);
  }
  return { problems, unclassified };
}

function scannedStrings(value, skipKeys = [], out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => scannedStrings(v, skipKeys, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) if (!k.startsWith("_") && !skipKeys.includes(k)) scannedStrings(v, skipKeys, out);
  return out;
}

// ---- the check ----
export function checkRegistry(registry) {
  const failures = [];
  const gaps = [];
  const root = registry._root;
  const schema = readJson(SCHEMA_PATH);
  const bare = Object.fromEntries(Object.entries(registry).filter(([k]) => !k.startsWith("_") || k === "_about"));
  for (const problem of validate(schema, bare)) failures.push(`${registry._file}: ${problem}`);
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
        for (const rule of surface.exclusive_markers || []) {
          const picked = walk(scene, rule.field)[0]?.value;
          if (picked === undefined) { if (rule.required) failures.push(`${surface.file}: ${slug}: has no ${rule.field}, which exclusive_markers require. Fix: set ${rule.field} to one of ${Object.keys(rule.values).join(", ")}`); continue; }
          if (!rule.values[picked]) { gaps.push(`gap: ${surface.file}: ${slug}: ${rule.field} "${picked}" is not a key of exclusive_markers.values (${Object.keys(rule.values).join(", ")})`); continue; }
          const text = (rule.fields?.length ? rule.fields.flatMap((f) => walk(scene, f).map((w) => w.value)) : scannedStrings(scene, [rule.field, ...(surface.skip_keys || [])])).flatMap((v) => scannedStrings(v)).join("\n");
          for (const [other, words] of Object.entries(rule.values)) {
            if (other === picked) continue;
            for (const w of words) {
              const m = text.match(wordRe(w, "i"));
              if (m) { failures.push(`${surface.file}: ${slug}: says "${m[0].slice(m[1].length)}" (${rule.field} ${other}) but ${rule.field} is "${picked}"${rule.why ? ` (${rule.why})` : ""}. Fix: change ${rule.field} or the text`); break; }
            }
          }
        }
      }
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
  // every tracked text file outside records: a retired name must not come back anywhere live
  const tokens = tokenSourceProblems(registry, surfaces, root);
  failures.push(...tokens.failures);
  stats.token_sources = tokens.sources;
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
    if (surface.error || surface.type === "continuity") continue;
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
