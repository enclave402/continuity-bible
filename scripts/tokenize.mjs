#!/usr/bin/env node
// tokenize.mjs: the one-time migration of a source file from written-out names to {{id}} tokens. After it, names.mjs renders
// the names at build.
//
//   node scripts/tokenize.mjs <json file> [--story <id>] [--story-key-field storyKey [--holder scenes]]
//                                [--skip k,k,...] [--label-fields k,k,...] [--dry-run]
//   node scripts/tokenize.mjs <text file> --text [--story <id>] [--dry-run]     a page, a partial, a template
//
// Every string value is rewritten except the keys listed in --skip, keys starting with _, and --label-fields (the fields that
// define a unit's display label: a card's scene_name, a character sheet's name field). A label is replaced only as a whole word and
// never inside an existing token. Longest labels go first. What is replaced, per registry entry:
//   the entry's name                         -> {{id}}
//   each value of its forms map and full_name -> {{id:<form>}}
//   a card's scene_name that is not the registry name (Young Sam) -> {{<card key>}}, when the story is known
// A label two entries share is skipped and reported. A composite label ("Sam & Theo") and a compound alias ("Narrator (Chloe)",
// "Chloe, LMHC") are not replaced as a whole: the name inside them is. Prints the counts; --dry-run writes nothing. The caller proves the build is byte-identical.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadNames, TOKEN, atomicLabels as atomicLabelsOf, labelRegExp } from "./names.mjs";

const ROOT = process.cwd(); // the project root, where character-registry.json lives (as build.mjs and check.mjs read it)
const argv = process.argv.slice(2);
// run as a command (also through a symlinked folder): compare real paths, not the spelling of argv[1]
const isMain = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url)); } catch { return false; } })();
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? "" : argv[i + 1] || ""; };
const VALUE_FLAGS = new Set(["--story", "--story-key-field", "--skip", "--label-fields", "--holder"]);
const file = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
if (isMain && (!file || file.startsWith("--"))) { console.error("usage: node tokenize.mjs <json file> [--story <id>] [--story-key-field <key>] [--skip k,k] [--label-fields k,k] [--dry-run]"); process.exit(2); }
const story = flag("--story") || "";
const storyKeyField = flag("--story-key-field") || "";
const skip = new Set((flag("--skip") || "").split(",").filter(Boolean));
// fields that define a unit's own label are never rewritten: scene_name always, plus any --label-fields you add
const labelFields = new Set(["scene_name", ...(flag("--label-fields") || "").split(",").filter(Boolean)]);
const holderKey = flag("--holder") || "scenes"; // the map of units a --story-key-field is read on (scenes, art)
const dry = argv.includes("--dry-run");

let names = null;
let characters = null;
const ensure = () => {
  if (names) return;
  if (!fs.existsSync(path.join(ROOT, "character-registry.json"))) {
    console.error(`tokenize: no character-registry.json in ${ROOT}; run it from your project root`);
    process.exit(1);
  }
  names = loadNames(ROOT);
  characters = names.characters;
};

/** The atomic labels for a story: [label, token] (names.mjs atomicLabels, with the story's card when there is one). */
function atomicLabels(storyId) {
  ensure();
  if (labelCache.has(storyId)) return labelCache.get(storyId);
  const card = storyId ? names.cardOf(storyId) : null;
  const out = atomicLabelsOf(characters, card ? [card] : []);
  labelCache.set(storyId, out);
  return out;
}
const labelCache = new Map();

const counts = new Map();
const shared = new Set();
function rewrite(text, storyId) {
  const { list, shared: sh } = atomicLabels(storyId);
  for (const l of sh) shared.add(l);
  // never touch an existing token: split on tokens, rewrite the gaps
  const parts = text.split(TOKEN.source ? new RegExp(`(${TOKEN.source})`, "g") : /($^)/);
  return parts.map((part, i) => {
    if (i % 4 !== 0) return i % 4 === 1 ? part : ""; // the split keeps the whole token in group 1 and its inner groups after it
    let out = part;
    for (const [label, token] of list) {
      out = out.replace(labelRegExp(label), (m, lead) => { counts.set(label, (counts.get(label) || 0) + 1); return `${lead}${token}`; });
    }
    return out;
  }).join("");
}

/** A text with every registered name of the story (or of the registry, with no story) replaced by its token; for a writer that
 *  copies free text into a source file (a script writing a generated image prompt into a manifest). */
export function tokenizeText(text, storyId = "") { return typeof text === "string" ? rewrite(text, storyId) : text; }
/** A whole value tokenized, skipping keys that start with _ and the keys named. */
export function tokenizeValue(value, storyId = "", skipKeys = []) { for (const k of skipKeys) skip.add(k); return walk(value, storyId); }

function walk(value, storyId, keyPath = []) {
  if (typeof value === "string") return rewrite(value, storyId);
  if (Array.isArray(value)) return value.map((v) => walk(v, storyId, keyPath));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => {
      if (k.startsWith("_") || skip.has(k) || labelFields.has(k)) return [k, v];
      return [k, walk(v, storyId, [...keyPath, k])];
    }));
  }
  return value;
}

if (isMain) {
ensure();
const abs = path.resolve(ROOT, file);
const raw = fs.readFileSync(abs, "utf8");
if (argv.includes("--text")) { // a text source (a page, a partial, a prompt template): the whole file is one string
  const text = rewrite(raw, story);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  console.log(`tokenize: ${file}: ${total} replacement(s) across ${counts.size} label(s)${dry ? " (dry run, nothing written)" : ""}`);
  for (const [label, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${label}`);
  if (shared.size) console.log(`  skipped, shared by two entries: ${[...shared].join(", ")}`);
  if (!dry) fs.writeFileSync(abs, text);
  process.exit(0);
}
const json = JSON.parse(raw);
let out;
if (storyKeyField) {
  const holder = json[holderKey] && typeof json[holderKey] === "object" ? json[holderKey] : json;
  const done = Object.fromEntries(Object.entries(holder).map(([slug, unit]) => [slug, walk(unit, unit?.[storyKeyField] ? names.storyOfKey.get(unit[storyKeyField]) : story || "")]));
  out = json[holderKey] ? { ...json, [holderKey]: done } : done;
} else {
  out = walk(json, story);
}
const indent = (raw.split("\n")[1] || "  ").match(/^\s*/)[0].length || 2;
const text = JSON.stringify(out, null, indent) + "\n";
const total = [...counts.values()].reduce((a, b) => a + b, 0);
console.log(`tokenize: ${file}: ${total} replacement(s) across ${counts.size} label(s)${dry ? " (dry run, nothing written)" : ""}`);
for (const [label, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${label}`);
if (shared.size) console.log(`  skipped, shared by two entries: ${[...shared].join(", ")}`);
if (!dry) fs.writeFileSync(abs, text);
}
