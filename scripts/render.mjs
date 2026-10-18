#!/usr/bin/env node
/**
 * render.mjs: render a token source to built output. Source files hold {{id}} tokens; this writes the names.
 *
 *   node scripts/render.mjs <source> [--out <file>] [--story <id>] [--registry <path>]
 *
 * A .json source is resolved value by value (each scene's own fields pick its contextual forms); any other file is
 * resolved as text. Without --out the result goes to stdout. An unknown token or an unresolvable contextual form exits 1
 * with the token and the fix: built output never contains a token and never a guessed name. Use it for anything a
 * person reads that a builder does not already render: run notes, runbooks, prompt sheets, exports.
 */
import fs from "node:fs";
import path from "node:path";
import { loadNames } from "./names.mjs";
import { registryPath } from "./lib.mjs";

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? "" : argv[i + 1] || ""; };
const VALUE_FLAGS = new Set(["--out", "--story", "--registry"]);
const source = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
if (!source) { console.error("usage: node scripts/render.mjs <source> [--out <file>] [--story <id>] [--registry <path>]"); process.exit(2); }
const root = path.dirname(registryPath(process.argv));
const names = loadNames(root);
const story = flag("--story") || undefined;
const raw = fs.readFileSync(source, "utf8");
let out;
try {
  if (source.endsWith(".json")) {
    const json = JSON.parse(raw);
    const indent = (raw.split("\n")[1] || "  ").match(/^\s*/)[0].length || 2;
    out = JSON.stringify(names.resolveDeep(json, story), null, indent) + "\n";
  } else out = names.resolveTokens(raw, story);
} catch (e) {
  console.error(`render: ${source}: ${e.message}`);
  process.exit(1);
}
const dest = flag("--out");
if (dest) { fs.mkdirSync(path.dirname(path.resolve(dest)), { recursive: true }); fs.writeFileSync(dest, out); console.log(`render: ${source} -> ${dest} (${out.length} bytes; built output, do not edit)`); }
else process.stdout.write(out);
