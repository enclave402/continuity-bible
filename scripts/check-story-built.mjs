#!/usr/bin/env node
/**
 * check-story-built.mjs: built output equals the source. Gate one of three for a story folder.
 *
 *   node scripts/check-story-built.mjs <story-folder> [--registry <path>]
 *
 * Renders every edition from scenes.json and editions/<id>.json in memory (scripts/story.mjs) and compares it with the
 * committed built/<id>.txt. A missing, stale or hand-edited built file fails with the edition and the fix (rebuild and
 * commit); a built file for an edition that no longer exists fails too. Nothing on disk is changed by the check.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderEdition, runGate } from "./story.mjs";

/** @returns {{ failures: string[], notes: string[], summary: string }} */
export function check(story) {
  const failures = [];
  const builtDir = path.join(story.dir, "built");
  const fix = `node scripts/story.mjs build ${story.shown}, then commit built/`;
  const ids = Object.keys(story.editions).sort();
  for (const id of ids) {
    const file = path.join(builtDir, `${id}.txt`);
    const shown = `${story.shown}/built/${id}.txt`;
    const expected = renderEdition(story, id);
    if (!fs.existsSync(file)) { failures.push(`${shown} is missing: edition ${id} has no built output. Fix: ${fix}`); continue; }
    const actual = fs.readFileSync(file, "utf8");
    if (actual !== expected) {
      const a = actual.split("\n"), e = expected.split("\n");
      const line = a.findIndex((l, i) => l !== e[i]);
      failures.push(`${shown} differs from the source (first difference at line ${line + 1}${line >= 0 ? `: built says "${(a[line] ?? "").slice(0, 60)}", the source renders "${(e[line] ?? "").slice(0, 60)}"` : ""}). Fix: ${fix}; built output is never edited by hand`);
    }
  }
  if (fs.existsSync(builtDir)) {
    for (const f of fs.readdirSync(builtDir).filter((f) => f.endsWith(".txt")).sort()) {
      const id = f.replace(/\.txt$/, "");
      if (!story.editions[id]) failures.push(`${story.shown}/built/${f} has no edition: editions/${id}.json does not exist. Fix: ${fix} (the build removes it), or restore the edition`);
    }
  }
  return { failures, notes: [], summary: `${ids.length} edition(s) built from ${Object.keys(story.scenes).length} scene(s), output equal to the source` };
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runGate("check-story-built", process.argv.slice(2), (story) => check(story));
}
