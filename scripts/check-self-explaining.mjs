#!/usr/bin/env node
/**
 * check-self-explaining.mjs: the self-explaining parts check.
 *
 * What this is: a check that every part of the repo explains itself. A part is a script, schema, data file or doc.
 * Why it exists: someone who opens a file with no memory should learn what it does and why. A rule that is only a
 *   sentence gets skipped. A check does not.
 * How to use it: run node scripts/check-self-explaining.mjs. All rules and lists are in the config file it reads.
 *   Add --update-baseline to drop fixed parts from the baseline.
 * Next step: read the first failure. It names the file, the missing line and the one fix.
 *
 * Terms, each with its concept page in the continuity bible:
 *   self-explaining part: docs/4-explanation/concepts/SELF-EXPLAINING-PART.md
 *   rules the computer checks: docs/4-explanation/concepts/RULES-THE-COMPUTER-CHECKS.md
 *   reading grade: docs/4-explanation/concepts/READING-GRADE.md
 *   shrink-only list (the baseline): docs/4-explanation/concepts/SHRINK-ONLY-LIST.md
 *   one home for each fact (no hard coding): docs/4-explanation/concepts/ONE-HOME-FOR-EACH-FACT.md
 *
 * Rules, in order:
 *   1. The part has four labelled lines, in this order: What this is, Why it exists, How to use it, Next step.
 *      A script keeps them in its top comment. A JSON data file keeps them in an "_about" object. A schema keeps
 *      them in its top "description", and every field has a "description". A doc keeps them in its front matter
 *      or in its first lines.
 *   2. Those lines read at or below the grade in the config (Flesch-Kincaid, scripts/reading-grade.mjs).
 *   3. The file name matches what the header says: a word of the name shows up in the What or Why line.
 *      Names known to mislead are listed in the config, each with how it was fixed.
 *   4. Parts that had no header when the check began sit in a baseline file. It only shrinks: a part in it that
 *      now passes, is gone, or has changed must leave it.
 *   5. The parts map (scripts/parts-map.mjs) is current.
 *
 *   node scripts/check-self-explaining.mjs [--config <file>] [--repo <dir>] [--update-baseline] [--write-baseline]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fkGrade } from "./reading-grade.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_CONFIG = path.join("scripts", "self-explaining.config.json");

const toPosix = (p) => p.split(path.sep).join("/");
export const hashOf = (text) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);

export function loadConfig(repo, configPath = DEFAULT_CONFIG) {
  const file = path.resolve(repo, configPath);
  if (!fs.existsSync(file)) throw new Error(`self-explaining: missing ${configPath}. Why: the check reads its rules there. Fix: restore the file.`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Every file in the repo: git's list (tracked and new, not ignored) when it is a git repo, else a plain walk. */
function listFiles(repo, skipDirs) {
  try {
    const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 });
    // During a merge, git lists a conflicted file once per side; keep each path once.
    return [...new Set(out.split("\n").filter(Boolean))].filter((f) => fs.existsSync(path.join(repo, f)));
  } catch {
    const walk = (dir) => fs.readdirSync(path.join(repo, dir), { withFileTypes: true }).flatMap((e) => {
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) return skipDirs.includes(e.name) ? [] : walk(rel);
      return [rel];
    });
    return walk("");
  }
}

/** The format of a file (script, json, schema, markdown), from the longest matching suffix, or a #! first line. */
function formatOf(repo, rel, formats) {
  const suffix = Object.keys(formats).sort((a, b) => b.length - a.length).find((s) => rel.endsWith(s));
  if (suffix) return formats[suffix];
  if (!path.basename(rel).includes(".")) {
    const head = fs.readFileSync(path.join(repo, rel), "utf8").slice(0, 2);
    if (head === "#!") return "script";
  }
  return null;
}

/** The parts in scope: files under an included folder (ending in /) or matching a root pattern (*.ext), with a known format. */
export function partsInScope(repo, cfg) {
  const inc = cfg.scope.include || [];
  const exempt = cfg.exempt || {};
  const exemptDirs = Object.keys(exempt).filter((k) => k.endsWith("/"));
  const inScope = (f) => inc.some((p) => (p.endsWith("/") ? f.startsWith(p) : p.startsWith("*") ? !f.includes("/") && f.endsWith(p.slice(1)) : f === p));
  return listFiles(repo, cfg.scope.skip_dirs || [])
    .map(toPosix)
    .filter((f) => inScope(f) && !(f in exempt) && !exemptDirs.some((d) => f.startsWith(d)))
    .map((f) => ({ file: f, format: formatOf(repo, f, cfg.formats) }))
    .filter((p) => p.format)
    .sort((a, b) => a.file.localeCompare(b.file));
}

/** Pull the four sections out of plain text: each label, then its text up to the next label or a blank line. */
export function sectionsFromText(text, sections) {
  const clean = text.replace(/\*\*/g, "");
  const found = {};
  const hits = [];
  for (const s of sections) {
    let best = null;
    for (const label of s.labels) {
      const m = new RegExp(`(^|[\\s>])${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:`, "m").exec(clean);
      if (m && (!best || m.index < best.index)) best = { index: m.index + m[1].length, end: m.index + m[0].length };
    }
    if (best) hits.push({ key: s.key, ...best });
  }
  hits.sort((a, b) => a.index - b.index);
  hits.forEach((h, i) => {
    const stop = i + 1 < hits.length ? hits[i + 1].index : clean.length;
    let body = clean.slice(h.end, stop);
    const blankLine = body.search(/\n\s*\n/);
    if (blankLine >= 0) body = body.slice(0, blankLine);
    found[h.key] = body.replace(/\s+/g, " ").trim();
  });
  return { found, order: hits.map((h) => h.key) };
}

/** The top comment of a script: its leading comment lines with comment marks taken off. It ends at the first line of code. */
function scriptHead(text, headLines) {
  const out = [];
  let block = null;
  for (const line of text.split("\n").slice(0, headLines)) {
    if (line.startsWith("#!")) continue;
    const t = line.trim();
    if (!block && t && !/^(\/\*|\*|\/\/|#|--|"""|''')/.test(t)) break;
    if (!block && /^(\/\*|"""|''')/.test(t)) {
      const open = t.startsWith("/*") ? "*/" : t.slice(0, 3);
      if (!t.slice(open === "*/" ? 2 : 3).includes(open)) block = open;
    } else if (block && t.includes(block)) block = null;
    out.push(line.replace(/^\s*(\/\*\*?|\*\/|\*|\/\/+|#+|--|"""|''')\s?/, "").replace(/(\*\/|"""|''')\s*$/, ""));
  }
  return out.join("\n");
}

function frontMatter(text) {
  const m = text.match(/^(?:<!--[^\n]*-->\n)?---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return Object.fromEntries(m[1].split("\n").map((l) => l.split(/:\s(.*)/)).filter((p) => p.length > 1).map(([k, v]) => [k.trim(), v.trim()]));
}

/** A doc's title: its front matter title, else its first # heading. A doc's title is part of its header. */
function docTitle(text) {
  return (frontMatter(text) || {}).title || (text.match(/^#\s+(.+)$/m) || [])[1] || "";
}

/** Fields of a JSON schema without a description, as dotted paths. */
function fieldsWithoutDescription(schema, at = "") {
  const out = [];
  if (!schema || typeof schema !== "object") return out;
  for (const [name, sub] of Object.entries(schema.properties || {})) {
    const here = at ? `${at}.${name}` : name;
    if (sub && typeof sub === "object" && !sub.description && !sub.$ref) out.push(here);
    out.push(...fieldsWithoutDescription(sub, here));
  }
  for (const key of ["items", "additionalProperties"]) if (schema[key] && typeof schema[key] === "object") out.push(...fieldsWithoutDescription(schema[key], `${at}[]`));
  for (const key of ["definitions", "$defs"]) for (const [name, sub] of Object.entries(schema[key] || {})) out.push(...fieldsWithoutDescription(sub, `${key}.${name}`));
  return out;
}

/** Read one part's header. Returns { sections, problems }: problems are plain messages without the file name. */
export function readHeader(repo, part, cfg) {
  const text = fs.readFileSync(path.join(repo, part.file), "utf8");
  const sec = cfg.sections;
  const problems = [];
  let found = {};
  let order = [];
  const where = cfg.where[part.format];
  if (part.format === "script") ({ found, order } = sectionsFromText(scriptHead(text, cfg.head_lines), sec));
  else if (part.format === "markdown") {
    const fm = frontMatter(text) || {};
    for (const s of sec) if (fm[s.front_matter_key]) { found[s.key] = fm[s.front_matter_key]; order.push(s.key); }
    if (!order.length) {
      const body = text.replace(/^(?:<!--[^\n]*-->\n)?---\n[\s\S]*?\n---\n/, "");
      ({ found, order } = sectionsFromText(body.split("\n").slice(0, cfg.head_lines).join("\n"), sec));
    }
  } else {
    let data;
    try { data = JSON.parse(text); } catch (e) { return { sections: {}, problems: [`is not valid JSON (${e.message}). Next step: fix the JSON so the check can read its header.`] }; }
    if (part.format === "schema") {
      ({ found, order } = sectionsFromText(typeof data.description === "string" ? data.description : "", sec));
      const bare = fieldsWithoutDescription(data);
      if (bare.length) problems.push(`has ${bare.length} field(s) with no "description": ${bare.slice(0, 5).join(", ")}${bare.length > 5 ? ", ..." : ""}. Next step: give each field a one-line "description" that says what it holds.`);
    } else {
      const about = data && !Array.isArray(data) && typeof data._about === "object" && data._about ? data._about : null;
      if (!about && Array.isArray(data)) return { sections: {}, problems: [`is a JSON list, so it has no room for an "_about" object. Next step: wrap the list in an object with "_about", or list the file in "exempt" in the config with a reason.`] };
      for (const s of sec) if (about && typeof about[s.json_key] === "string" && about[s.json_key].trim()) { found[s.key] = about[s.json_key].trim(); order.push(s.key); }
    }
  }
  const missing = sec.filter((s) => !found[s.key]);
  for (const s of missing) problems.push(`has no "${s.labels[0]}" line. Next step: add "${s.labels[0]}: <one plain sentence>" ${where}.`);
  const want = sec.map((s) => s.key).filter((k) => order.includes(k));
  if (!missing.length && order.join() !== want.join()) problems.push(`has its header lines out of order (${order.join(", ")}). Next step: put them in this order: ${sec.map((s) => s.labels[0]).join(", ")}.`);
  return { sections: found, problems };
}

/** The reading grade of a header, with code, paths and links taken out first (config grade_ignore_patterns). */
export function headerGrade(sections, cfg) {
  let text = cfg.sections.map((s) => sections[s.key]).filter(Boolean).map((t) => (/[.!?]$/.test(t) ? t : `${t}.`)).join(" ");
  for (const p of Object.keys(cfg.grade_ignore_patterns || {})) text = text.replace(new RegExp(p, "g"), " ");
  return fkGrade(text);
}

/** Does a word of the file name show up in the What or Why line? Words in name_words_ignored do not count. */
export function nameMatches(file, sections, cfg, title = "") {
  const ignored = new Set((cfg.name_words.ignored || []).map((w) => w.toLowerCase()));
  const stem = path.basename(file).replace(/\.[^/]*$/, "");
  const nameWords = stem.replace(/([a-z])([A-Z])/g, (_, a, b) => `${a} ${b}`).toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= cfg.name_words.min_length && !ignored.has(w));
  if (!nameWords.length) return { ok: true, nameWords };
  const text = `${title} ${sections.what || ""} ${sections.why || ""}`.toLowerCase();
  const said = text.split(/[^a-z]+/).filter(Boolean);
  const n = cfg.name_words.match_prefix;
  const ok = nameWords.some((w) => said.some((s) => s.slice(0, n) === w.slice(0, n)));
  return { ok, nameWords };
}

/** Check one part against every rule. Returns a list of plain problems (no file name). */
export function checkPart(repo, part, cfg) {
  const { sections, problems } = readHeader(repo, part, cfg);
  if (cfg.sections.every((s) => sections[s.key])) {
    const grade = headerGrade(sections, cfg);
    if (grade !== null && grade > cfg.max_grade) problems.push(`has a header that reads at grade ${grade}, above ${cfg.max_grade}. Next step: use shorter sentences and shorter words in the four lines.`);
    const name = nameMatches(part.file, sections, cfg, part.format === "markdown" ? docTitle(fs.readFileSync(path.join(repo, part.file), "utf8")) : "");
    if (!name.ok) problems.push(`has a name ("${name.nameWords.join(", ")}") that its What this is and Why it exists lines never use. Next step: rename the file to match what it does, or say in the What line what the name means.`);
  }
  return { sections, problems };
}

export function readBaseline(repo, cfg) {
  const file = path.join(repo, cfg.baseline);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function writeBaseline(repo, cfg, parts) {
  const sorted = Object.fromEntries(Object.entries(parts).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(path.join(repo, cfg.baseline), `${JSON.stringify({ _about: cfg.baseline_about, parts: sorted }, null, 1)}\n`);
}

/** Run every rule over the repo. Returns { errors, results, stats }. */
export function runCheck(repo, cfg, { updateBaseline = false, writeNewBaseline = false } = {}) {
  const errors = [];
  const parts = partsInScope(repo, cfg);
  const results = parts.map((p) => {
    const text = fs.readFileSync(path.join(repo, p.file), "utf8");
    return { ...p, hash: hashOf(text), ...checkPart(repo, p, cfg) };
  });
  const failing = results.filter((r) => r.problems.length);

  if (writeNewBaseline) {
    if (readBaseline(repo, cfg)) return { errors: [`${cfg.baseline} already exists. Why: the baseline may only shrink, so it is written once. Fix: use --update-baseline to drop fixed parts.`], results, stats: {} };
    writeBaseline(repo, cfg, Object.fromEntries(failing.map((r) => [r.file, r.hash])));
    return { errors, results, stats: { baselined: failing.length } };
  }

  const base = readBaseline(repo, cfg) || { parts: {} };
  const baseParts = { ...base.parts };
  const byFile = new Map(results.map((r) => [r.file, r]));
  const keep = {};
  for (const [file, hash] of Object.entries(baseParts)) {
    const r = byFile.get(file);
    if (!r) { if (!updateBaseline) errors.push(`${cfg.baseline}: lists ${file}, which is gone or out of scope. Next step: run node scripts/check-self-explaining.mjs --update-baseline.`); continue; }
    if (!r.problems.length) { if (!updateBaseline) errors.push(`${file}: now passes, but ${cfg.baseline} still lists it. Next step: run node scripts/check-self-explaining.mjs --update-baseline.`); continue; }
    keep[file] = hash;
  }
  for (const r of failing) {
    const baseHash = baseParts[r.file];
    if (baseHash === undefined) for (const p of r.problems) errors.push(`${r.file}: ${p}`);
    else if (cfg.changed_parts_must_pass && baseHash !== r.hash) for (const p of r.problems) errors.push(`${r.file}: changed since the baseline, so it must now explain itself; it ${p}`);
  }
  for (const m of cfg.known_misleading || []) {
    if (!m.fixed_by && fs.existsSync(path.join(repo, m.path))) errors.push(`${m.path}: its name is known to mislead (${m.why}). Next step: rename it or rewrite its header, then record how in "fixed_by" in the config.`);
  }
  if (updateBaseline) writeBaseline(repo, cfg, keep);
  const stats = { parts: results.length, passing: results.length - failing.length, baselined: Object.keys(updateBaseline ? keep : baseParts).length };
  return { errors, results, stats };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const repo = path.resolve(opt("--repo") || path.join(HERE, ".."));
  let cfg;
  try { cfg = loadConfig(repo, opt("--config")); } catch (e) { console.error(e.message); process.exit(1); }
  const { errors, results, stats } = runCheck(repo, cfg, { updateBaseline: args.includes("--update-baseline"), writeNewBaseline: args.includes("--write-baseline") });
  if (cfg.parts_map && !args.includes("--write-baseline")) {
    const { buildMap } = await import(pathToFileURL(path.join(HERE, "parts-map.mjs")).href);
    const out = path.join(repo, cfg.parts_map.output);
    const want = buildMap(repo, cfg, results);
    if (!fs.existsSync(out) || fs.readFileSync(out, "utf8") !== want) errors.push(`${cfg.parts_map.output}: the parts map is out of date. Next step: run node scripts/parts-map.mjs and commit the result.`);
  }
  if (errors.length) {
    for (const e of errors) process.stderr.write(`${e}\n`);
    process.stderr.write(`self-explaining: fail (${errors.length}). Each line names the file, what is missing and the next step. Rules: ${cfg.concept_page}\n`);
    process.exit(1);
  }
  if (args.includes("--write-baseline")) console.log(`self-explaining: wrote ${cfg.baseline} with ${stats.baselined} part(s); from now on it only shrinks.`);
  else console.log(`self-explaining: pass (${stats.parts} parts; ${stats.passing} explain themselves; ${stats.baselined} in the baseline, which only shrinks)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
