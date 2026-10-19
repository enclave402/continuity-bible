#!/usr/bin/env node
/**
 * check-story-art.mjs: every picture is accounted for. Gate two of three for a story folder.
 *
 *   node scripts/check-story-art.mjs <story-folder> [--registry <path>]
 *   node scripts/check-story-art.mjs <story-folder> --park --reason "<why these pictures are kept>"
 *
 * Two rules. (1) Every picture a placed scene lists under art exists in the art folder and, in a git checkout, is tracked:
 * a reader never meets a missing picture. (2) Every picture in the art folder that no placed scene loads (a retired
 * scene's picture, an earlier try kept for the record) is listed in parked-art.json under parked with a reason, and the
 * list is exact: an entry whose file is gone, whose file is now loaded, or that repeats or has no reason fails. Parking is
 * an explicit act: --park --reason writes the list for every unreferenced picture, keeping the reasons already there.
 * A scene placed in any edition counts as placed; a scene retired in every edition loads nothing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { artState, readParked, runGate } from "./story.mjs";

/** @returns {{ failures: string[], notes: string[], summary: string }} */
export function check(story) {
  const failures = [], notes = [];
  const art = artState(story);
  const referenced = story.referencedArt();
  const loadedBy = new Map();
  for (const slug of story.placed()) for (const name of story.scenes[slug].art || []) { if (!loadedBy.has(name)) loadedBy.set(name, []); loadedBy.get(name).push(slug); }
  if (!art.inGit) notes.push(`${art.shown} is not inside a git checkout, so "tracked" is not checked here; a picture counts as present when it is on disk`);

  // rule 1: references exist
  for (const name of [...referenced].sort()) {
    const who = loadedBy.get(name).join(", ");
    if (!art.onDisk.has(name)) failures.push(`${art.shown}/${name} is missing, but ${who} lists it under art. Fix: put the picture back in ${art.shown}/, or change the scene's art line`);
    else if (art.inGit && !art.tracked.has(name)) failures.push(`${art.shown}/${name} is on disk but not added to git, and ${who} lists it. Fix: git add ${art.shown}/${name}`);
  }

  // rule 2: no orphans, and the manifest is exact
  const manifest = readParked(story);
  failures.push(...manifest.problems);
  const parked = new Map();
  for (const e of manifest.parked) {
    if (parked.has(e.file)) { failures.push(`${manifest.shown}: parked lists ${e.file} twice. Fix: keep one entry`); continue; }
    parked.set(e.file, e.reason);
    if (!art.onDisk.has(e.file)) failures.push(`${manifest.shown}: parked lists ${e.file}, which is not in ${art.shown}/ (a parked picture disappeared, or the entry is stale). Fix: put the picture back, or move the entry to removed with a note saying who decided and why`);
    else if (referenced.has(e.file)) failures.push(`${manifest.shown}: parked lists ${e.file} as loaded by nothing, but ${loadedBy.get(e.file).join(", ")} loads it. Fix: remove the entry; a loaded picture is not parked`);
  }
  const removed = new Set(manifest.removed.map((e) => e.file));
  for (const name of [...art.onDisk].sort()) {
    if (referenced.has(name) || parked.has(name)) continue;
    failures.push(`${art.shown}/${name} is in the art folder, loaded by no spread of any edition, and not listed in ${manifest.shown}. Fix: list it under a scene's art, or park it with a reason: node scripts/check-story-art.mjs ${story.shown} --park --reason "<why it is kept>"${removed.has(name) ? " (it is listed under removed, but it is still on disk)" : ""}`);
  }
  const summary = `${referenced.size} picture(s) loaded by ${story.placed().size} placed scene(s), ${parked.size} parked with a reason, ${art.onDisk.size} in ${art.shown}/`;
  return { failures, notes, summary };
}

/** --park: rewrite parked[] for every picture nothing loads, keeping existing reasons; removed[] is kept as it is. */
export function park(story, reason) {
  const art = artState(story);
  const referenced = story.referencedArt();
  const manifest = readParked(story);
  const kept = new Map(manifest.parked.map((e) => [e.file, e.reason]));
  const parked = [...art.onDisk].filter((f) => !referenced.has(f)).sort().map((file) => ({ file, reason: kept.get(file) || reason }));
  const body = {
    _about: "Every picture in the art folder that no spread of any edition loads is listed under parked with a reason, so nothing is kept by accident and nothing vanishes by accident. node scripts/check-story-art.mjs <story-folder> --park --reason \"...\" writes this list; node scripts/check-story-art.mjs <story-folder> checks it. A picture may leave the folder only with a note under removed, which node scripts/check-story-retired.mjs reads; a deleted story picture without one fails.",
    parked,
    removed: manifest.removed,
  };
  fs.writeFileSync(manifest.file, `${JSON.stringify(body, null, 2)}\n`);
  return { file: manifest.shown, parked };
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runGate("check-story-art", process.argv.slice(2), (story, { argv, flag }) => {
    if (argv.includes("--park")) {
      const reason = flag("--reason").trim();
      if (!reason) { console.error(`check-story-art: --park needs --reason "<why these pictures are kept>"`); process.exit(2); }
      const { file, parked } = park(story, reason);
      return { notes: [`wrote ${file} (${parked.length} parked picture(s))`], summary: "parked list written" };
    }
    return check(story);
  });
}
