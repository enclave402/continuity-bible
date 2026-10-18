/**
 * config.mjs: one place that resolves where the research folder is and how the tools talk to models.
 *
 * Root: --root <dir> (removed from argv), else RESEARCH_ROOT, else this repository. The folder must hold research/.
 * Settings: research/research.config.json under that root, then environment overrides (RESEARCH_LLM_BASE_URL,
 * RESEARCH_LLM_MODEL, RESEARCH_EMBED_BASE_URL, RESEARCH_EMBED_MODEL, RESEARCH_API_KEY). Nothing is hardcoded to a machine:
 * the committed defaults are local endpoints a laptop can run; a hosted endpoint is one variable away.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The repo root the tools work in. Removes --root <dir> from argv so callers can parse the rest. */
export function rootOf(argv = process.argv) {
  const i = argv.indexOf("--root");
  if (i > 0 && argv[i + 1]) { const r = path.resolve(argv[i + 1]); argv.splice(i, 2); return r; }
  return process.env.RESEARCH_ROOT ? path.resolve(process.env.RESEARCH_ROOT) : REPO;
}

const merge = (a, b) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) out[k] = v && typeof v === "object" && !Array.isArray(v) ? merge(a[k] || {}, v) : v;
  return out;
};

/** Settings for a root: committed defaults, then the root's research.config.json, then the environment. */
export function loadConfig(root = REPO) {
  const defaults = JSON.parse(fs.readFileSync(path.join(REPO, "research", "research.config.json"), "utf8"));
  const local = path.join(root, "research", "research.config.json");
  const cfg = merge(defaults, root !== REPO && fs.existsSync(local) ? JSON.parse(fs.readFileSync(local, "utf8")) : {});
  const env = process.env;
  cfg.llm.base_url = env.RESEARCH_LLM_BASE_URL || cfg.llm.base_url;
  cfg.llm.model = env.RESEARCH_LLM_MODEL || cfg.llm.model;
  cfg.llm.api_key = env[cfg.llm.api_key_env || "RESEARCH_API_KEY"] || "";
  cfg.embedding.base_url = env.RESEARCH_EMBED_BASE_URL || cfg.embedding.base_url;
  cfg.embedding.model = env.RESEARCH_EMBED_MODEL || cfg.embedding.model;
  cfg.embedding.api_key = cfg.llm.api_key;
  cfg.root = root;
  cfg.researchDir = path.join(root, "research");
  return cfg;
}

/** Small arg helpers shared by the tools. */
export function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { positional.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) { flags[key] = next; i += 1; } else flags[key] = true;
  }
  return { positional, flags };
}

export const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
export const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
export const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 1) + "\n"); };
export const today = (tz = process.env.WORKLOG_TZ) => { const zone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone; const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((x) => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; };

/** Every corpus card under research/corpus (recursively), as { id, file, meta, body, lines }. */
export function corpusCards(cfg) {
  const dir = path.join(cfg.researchDir, "corpus");
  const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d).flatMap((n) => { const p = path.join(d, n); return fs.statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
  return walk(dir).filter((f) => f.endsWith(".md") && path.basename(f) !== "README.md").sort().map((file) => {
    const text = fs.readFileSync(file, "utf8");
    const fm = frontMatter(text);
    return { id: fm?.meta.id || path.basename(file, ".md"), file, rel: path.relative(cfg.root, file), meta: fm?.meta || {}, body: fm?.body ?? text, bodyStartLine: fm?.bodyStartLine ?? 1, text };
  });
}

/** Parse a `---` front-matter block of key: value lines (inline [a, b] lists). */
export function frontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith("[") && v.endsWith("]")) v = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    else v = v.replace(/^["']|["']$/g, "");
    meta[kv[1]] = v;
  }
  return { meta, body: m[2], bodyStartLine: m[1].split("\n").length + 3 };
}

/** Sections of a Markdown body by heading (## and deeper), each with its 1-based line range in the given text. */
export function sectionsOf(body, startLine = 1, minLevel = 2) {
  const lines = body.split("\n");
  const out = [];
  let cur = null;
  const stack = [];
  lines.forEach((l, i) => {
    const h = l.match(/^(#{1,6})\s+(.*)$/);
    if (h && h[1].length >= minLevel) {
      if (cur) { cur.end = startLine + i - 1; out.push(cur); }
      const level = h[1].length;
      const title = h[2].replace(/[*\\]/g, "").trim();
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      stack.push({ level, title });
      cur = { level, title, path: stack.map((s) => s.title), start: startLine + i, end: startLine + lines.length - 1, text: "" };
    } else if (cur) cur.text += l + "\n";
    else if (!cur && l.trim() && !/^#\s/.test(l)) { cur = { level: 1, title: "(preamble)", path: ["(preamble)"], start: startLine + i, end: startLine + lines.length - 1, text: l + "\n" }; }
  });
  if (cur) out.push(cur);
  return out;
}
