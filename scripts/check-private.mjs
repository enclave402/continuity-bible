#!/usr/bin/env node
/**
 * check-private.mjs: the publication gate. This repository is public; nothing personal, local or secret may be committed.
 *
 *   node scripts/check-private.mjs            # every tracked text file
 *   node scripts/check-private.mjs --staged   # only what is about to be committed (the pre-commit hook)
 *   node scripts/check-private.mjs <file> ... # named files (a document about to be added)
 *
 * What it looks for comes from scripts/check-private.config.json (regex patterns with names, an allow list, files to skip)
 * plus an optional, gitignored list of your own private words: PRIVATE_TERMS_FILE or ./.private-terms, one term per line.
 * A private term is reported by its line number in that file, never by its text, so the gate's own output stays safe to
 * paste into an issue. Exit 1 on any hit, one line per hit with the file, line and pattern name.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const config = JSON.parse(fs.readFileSync(path.join(HERE, "check-private.config.json"), "utf8"));
const argv = process.argv.slice(2);
const staged = argv.includes("--staged");
const named = argv.filter((a) => !a.startsWith("--"));

const BINARY_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif", "ico", "woff", "woff2", "ttf", "otf", "pdf", "zip", "gz", "mp4", "mov", "wav", "mp3", "bin", "heic", "avif"]);
const git = (args) => execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\0").filter(Boolean);

/** The files to scan: named files, the staged set, or every tracked file. */
function files() {
  if (named.length) return named.map((f) => path.relative(ROOT, path.resolve(f)));
  if (staged) return git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]);
  return git(["ls-files", "-z"]);
}

/** Text of a file as it will be committed (the index) or as it is on disk. */
function contentOf(rel) {
  if (staged && !named.length) {
    try { return execFileSync("git", ["-C", ROOT, "show", `:${rel}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); } catch { return null; }
  }
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) return null;
  const buf = fs.readFileSync(abs);
  for (let i = 0; i < Math.min(buf.length, 512); i++) if (buf[i] === 0) return null;
  return buf.toString("utf8");
}

/** Your own private words, if you keep a list; the file itself is gitignored. */
function privateTerms() {
  const file = process.env.PRIVATE_TERMS_FILE || path.join(ROOT, ".private-terms");
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").map((l, i) => [l.trim(), i + 1]).filter(([t]) => t && !t.startsWith("#"));
}

const patterns = Object.entries(config.patterns).map(([name, src]) => [name, new RegExp(src, "g")]);
const allow = config.allow || {};
const skip = (config.skip || []).map((g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*")}$`));
const terms = privateTerms();
const hits = [];
let scanned = 0;

for (const rel of files()) {
  if (skip.some((re) => re.test(rel)) || BINARY_EXT.has(rel.split(".").pop().toLowerCase())) continue;
  const text = contentOf(rel);
  if (text === null) continue;
  scanned += 1;
  text.split("\n").forEach((line, i) => {
    for (const [name, re] of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        const allowed = (allow[name] || []).some((a) => m[0].includes(a));
        if (!allowed) hits.push(`${rel}:${i + 1}: ${name}: ${m[0].length > 60 ? m[0].slice(0, 57) + "..." : m[0]}`);
      }
    }
    const lower = line.toLowerCase();
    for (const [term, n] of terms) if (lower.includes(term.toLowerCase())) hits.push(`${rel}:${i + 1}: private-term #${n} (see your private terms file)`);
  });
}

if (hits.length) {
  for (const h of hits) process.stderr.write(`${h}\n`);
  process.stderr.write(`publication gate: fail (${hits.length} hit(s) in ${scanned} file(s)). Fix: remove the value, move it to the environment or a gitignored file, or add a narrow allow entry in scripts/check-private.config.json with a reason.\n`);
  process.exit(1);
}
process.stdout.write(`publication gate: pass (${scanned} file(s), ${patterns.length} patterns, ${terms.length} private term(s))\n`);
