#!/usr/bin/env node
/**
 * render.mjs: render a token source to built output. Source files hold {{id}} tokens; this writes the names.
 *
 *   node scripts/render.mjs <source> [--out <file>] [--story <id>] [--registry <path>]
 *
 * A .json source is resolved value by value (each scene's own fields pick its contextual forms); any other file is
 * resolved as text. Without --out the result goes to stdout. An unknown token or an unresolvable contextual form exits 1
 * with the token and the fix: built output never contains a token and never a guessed name. A file the registry declares as
 * a token source is checked first, exactly as the gate checks it (a typed name, an unknown id, a token lookalike such as
 * {{June-okafor}}), so nothing reaches a chatbot that the gate would refuse, whether or not the gate was run. Use it for
 * anything a person reads that a builder does not already render: run notes, runbooks, prompt sheets, exports.
 */
import fs from "node:fs";
import path from "node:path";
import { loadNames } from "./names.mjs";
import { registryPath, loadRegistry, checkTokenSourceFile, nearbyFiles } from "./lib.mjs";

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? "" : argv[i + 1] || ""; };
const VALUE_FLAGS = new Set(["--out", "--story", "--registry"]);
const source = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
if (!source) { console.error("usage: node scripts/render.mjs <source> [--out <file>] [--story <id>] [--registry <path>]"); process.exit(2); }
const fail = (lines) => { for (const l of [].concat(lines)) console.error(l); console.error(`render: nothing written`); process.exit(1); };

let registry, names;
try { registry = loadRegistry(registryPath(process.argv)); names = loadNames(registry._root); }
catch (e) { fail(e.message); }
if (!fs.existsSync(source)) { const near = nearbyFiles(source); fail(`render: ${source} is not in this folder.${near.length ? ` There is ${near.map((n) => `"${n}"`).join(" and ")} here: rename it to ${path.basename(source)}.` : " Fix: check the file name (capital letters count, scene-01.md is not Scene-01.md) and run the command from the folder that holds it"}`); }
const story = flag("--story") || undefined;
const raw = fs.readFileSync(source, "utf8");
const problems = checkTokenSourceFile(registry, source, raw);
if (problems.length) fail([...problems, `render: ${source} has the problem(s) above, so it was not rendered. Fix them, then run node ../scripts/check.mjs and render again`]);

let out;
try {
  if (source.endsWith(".json")) {
    const json = JSON.parse(raw);
    const indent = (raw.split("\n")[1] || "  ").match(/^\s*/)[0].length || 2;
    out = JSON.stringify(names.resolveDeep(json, story), null, indent) + "\n";
  } else out = names.resolveTokens(raw, story);
} catch (e) {
  fail(`render: ${source}: ${e.message}`);
}
// a file that is no declared token source is rendered as asked; say so if something that looks like a token survived
const left = [...new Set([...out.matchAll(/\{\{[^{}\n]*\}\}/g)].map((m) => m[0]))];
if (left.length && !problems.length) console.error(`render: warning: ${source} still contains ${left.slice(0, 3).join(", ")}${left.length > 3 ? ` and ${left.length - 3} more` : ""}, which no token rule resolves. If these are your characters, check the spelling: ids use only lower-case letters, digits and hyphens`);
const dest = flag("--out");
if (dest) { fs.mkdirSync(path.dirname(path.resolve(dest)), { recursive: true }); fs.writeFileSync(dest, out); console.log(`render: ${source} -> ${dest} (${out.length} bytes; built output, do not edit)`); }
else process.stdout.write(out);
