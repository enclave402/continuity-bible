#!/usr/bin/env node
/**
 * check.mjs: every name on every surface resolves to exactly one character. One line per problem, with the file and the fix.
 *
 *   node check.mjs [--registry <path>] [--suggest]
 *
 * Registry: --registry, or CHARACTER_REGISTRY, or ./character-registry.json. Exit 1 on any failure. Gaps print and pass.
 * --suggest prints a stub entry for every label it cannot resolve, to paste into the registry when a repo adopts it.
 */
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
const { failures, gaps, stats } = checkRegistry(registry);
for (const gap of gaps) process.stdout.write(`${gap}\n`);
if (failures.length) {
  for (const failure of failures) process.stderr.write(`${failure}\n`);
  process.stderr.write(`character registry: fail (${failures.length} problem(s))\n`);
  process.exit(1);
}
process.stdout.write(`character registry: pass (${stats.entries} entries, ${stats.labels} labels resolved on ${stats.surfaces} surfaces, ${stats.token_sources ?? 0} token sources, ${stats.files ?? 0} files scanned${stats.render_surfaces ? `, ${stats.render_surfaces} render surface(s), ${stats.templates ?? 0} template(s)` : ""}${gaps.length ? `, ${gaps.length} gap(s)` : ""})\n`);
