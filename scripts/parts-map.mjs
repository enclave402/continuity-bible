#!/usr/bin/env node
/**
 * parts-map.mjs: writes the parts map, one page that lists every part of the repo.
 *
 * What this is: the tool that writes the parts map. The map lists every script, schema, data file and doc, each
 *   with its own "What this is" line.
 * Why it exists: someone who downloads the repo should open one page and see all the parts and what each one does.
 *   The map is made from the files, so it never goes out of date by hand.
 * How to use it: run node scripts/parts-map.mjs to write the map. Add --check to only test that it is current.
 *   The output path and the page's own header are in scripts/self-explaining.config.json.
 * Next step: open the map. A part marked "no header yet" or "header not finished" is in the baseline. Give it
 *   its four lines.
 *
 * Terms, each with its concept page in the continuity bible:
 *   self-explaining part: docs/4-explanation/concepts/SELF-EXPLAINING-PART.md
 *   stale docs (why the map is generated): docs/4-explanation/concepts/STALE-DOCS.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, runCheck } from "./check-self-explaining.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cell = (s) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

/** The map's text, built from the check's results (each part with its sections and problems). */
export function buildMap(repo, cfg, results) {
  const pm = cfg.parts_map;
  const fm = Object.entries(pm.front_matter).map(([k, v]) => `${k}: ${v}`).join("\n");
  const groups = new Map();
  for (const r of results) {
    const top = r.file.includes("/") ? `${r.file.split("/")[0]}/` : pm.root_group;
    if (!groups.has(top)) groups.set(top, []);
    groups.get(top).push(r);
  }
  const out = [`---\n${fm}\n---\n`, `<!-- ${pm.banner} -->\n`, `# ${pm.front_matter.title}\n`];
  for (const s of cfg.sections) out.push(`**${s.labels[0]}:** ${pm.front_matter[s.front_matter_key]}\n`);
  const passing = results.filter((r) => !r.problems.length).length;
  out.push(`${pm.count_line.replace("{parts}", results.length).replace("{passing}", passing)}\n`);
  for (const [group, rows] of [...groups.entries()].sort(([a], [b]) => (a === pm.root_group ? -1 : b === pm.root_group ? 1 : a.localeCompare(b)))) {
    out.push(`## ${group}\n\n| Part | What this is |\n|---|---|`);
    for (const r of rows) {
      const rel = path.posix.relative(path.posix.dirname(pm.output), r.file);
      const what = !r.sections.what ? `*${pm.no_header_text}*` : r.problems.length ? `${cell(r.sections.what)} *${pm.partial_header_text}*` : cell(r.sections.what);
      out.push(`| [${r.file}](${rel}) | ${what} |`);
    }
    out.push("");
  }
  return `${out.join("\n").replace(/\n+$/, "")}\n`;
}

function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--repo");
  const repo = path.resolve(i >= 0 ? args[i + 1] : path.join(HERE, ".."));
  const cfg = loadConfig(repo);
  const { results } = runCheck(repo, cfg);
  const out = path.join(repo, cfg.parts_map.output);
  const want = buildMap(repo, cfg, results);
  if (args.includes("--check")) {
    if (!fs.existsSync(out) || fs.readFileSync(out, "utf8") !== want) {
      console.error(`parts map: ${cfg.parts_map.output} is out of date. Next step: run node scripts/parts-map.mjs and commit the result.`);
      process.exit(1);
    }
    console.log(`parts map: current (${results.length} parts)`);
    return;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, want);
  console.log(`parts map: wrote ${cfg.parts_map.output} (${results.length} parts)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
