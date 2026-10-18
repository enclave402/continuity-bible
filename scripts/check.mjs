#!/usr/bin/env node
/**
 * check.mjs: every name on every surface resolves to exactly one character. One line per problem, with the file and the fix.
 *
 *   node check.mjs [--registry <path>] [--suggest]
 *
 * Registry: --registry, or CHARACTER_REGISTRY, or ./character-registry.json. Exit 1 on any failure. Gaps print and pass.
 * --suggest prints a stub entry for every label it cannot resolve, to paste into the registry when a repo adopts it.
 */
import fs from "node:fs";
import path from "node:path";
import { checkRegistry, loadRegistry, registryPath, suggest } from "./lib.mjs";

let registry;
try {
  registry = loadRegistry(registryPath());
} catch (error) {
  process.stderr.write(`${error.message}\ncharacter registry: fail\n`);
  process.exit(error.exitCode || 1);
}
if (process.argv.includes("--suggest")) {
  process.stdout.write(JSON.stringify(suggest(registry), null, 2) + "\n");
  process.exit(0);
}
if (registry._caseNote) process.stdout.write(`${registry._caseNote}\n`);
// run from the wrong folder? a story folder just below this one has its own registry: say which one was checked
if (!process.argv.includes("--registry") && !process.env.CHARACTER_REGISTRY) {
  const here = path.dirname(registry._file);
  const stories = fs.readdirSync(here, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "node_modules" && fs.existsSync(path.join(here, d.name, "character-registry.json"))).map((d) => d.name);
  if (stories.length) process.stdout.write(`note: this checked ${path.basename(registry._file)} in this folder. ${stories.map((s) => `${s}/`).join(" and ")} ${stories.length === 1 ? "has its own registry" : "have their own registries"}: to check your story, cd ${stories[0]} and run node ../scripts/check.mjs\n`);
}
const { failures, gaps, stats } = checkRegistry(registry);
for (const gap of gaps) process.stdout.write(`${gap}\n`);
if (failures.length) {
  for (const failure of failures) process.stderr.write(`${failure}\n`);
  process.stderr.write(`character registry: fail (${failures.length} problem(s))\n`);
  process.exit(1);
}
process.stdout.write(`character registry: pass (${stats.entries} entries, ${stats.labels} labels resolved on ${stats.surfaces} surfaces, ${stats.token_sources ?? 0} token sources, ${stats.files ?? 0} files scanned${stats.render_surfaces ? `, ${stats.render_surfaces} render surface(s), ${stats.templates ?? 0} template(s)` : ""}${gaps.length ? `, ${gaps.length} gap(s)` : ""})\n`);
