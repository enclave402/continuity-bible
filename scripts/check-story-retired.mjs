#!/usr/bin/env node
/**
 * check-story-retired.mjs: a retirement is never a deletion. Gate three of three for a story folder.
 *
 *   node scripts/check-story-retired.mjs <story-folder> [--registry <path>]
 *
 * A scene retired from every edition keeps its record in scenes.json (the loader already refuses a retired slug the story
 * lacks) and keeps its pictures in the art folder. A story picture that is gone (missing from disk, deleted in the working
 * tree, or staged for deletion) fails unless parked-art.json lists it under removed with a note saying who decided and
 * why: the owner's note is the only thing that lets a picture leave. The removed list is exact too: a note for a picture
 * that is still on disk, or that a placed scene still loads, fails.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { artState, readParked, runGate } from "./story.mjs";

/** @returns {{ failures: string[], notes: string[], summary: string }} */
export function check(story) {
  const failures = [], notes = [];
  const art = artState(story);
  const manifest = readParked(story);
  failures.push(...manifest.problems);
  const noted = new Map(manifest.removed.map((e) => [e.file, e.note]));
  const referenced = story.referencedArt();
  const retired = story.retiredEverywhere();
  const seen = new Set();
  for (const e of manifest.removed) {
    if (seen.has(e.file)) failures.push(`${manifest.shown}: removed lists ${e.file} twice. Fix: keep one entry`);
    seen.add(e.file);
  }

  // the record and the pictures of a retired scene stay
  for (const slug of retired) {
    for (const name of story.scenes[slug].art || []) {
      if (art.onDisk.has(name)) continue;
      if (noted.has(name)) { notes.push(`${art.shown}/${name} (retired scene ${slug}) was removed with a note: ${noted.get(name)}`); continue; }
      failures.push(`${art.shown}/${name} is gone, but ${slug} is retired, not deleted: a retirement keeps the record and the picture. Fix: put the picture back in ${art.shown}/ (parked with a reason), or, if it must go, add it to removed in ${manifest.shown} with a note saying who decided and why`);
    }
  }

  // a deleted story picture needs the owner's note, whichever scene it belonged to
  if (art.inGit) {
    for (const name of [...art.deleted].sort()) {
      if (noted.has(name)) { if (!retired.some((slug) => (story.scenes[slug].art || []).includes(name))) notes.push(`${art.shown}/${name} was removed with a note: ${noted.get(name)}`); continue; }
      failures.push(`${art.shown}/${name} is deleted in git (${art.onDisk.has(name) ? "staged for deletion" : "gone from the working tree"}) with no note. Story pictures are never deleted silently. Fix: git restore --staged --worktree -- ${art.shown}/${name}, or add { "file": "${name}", "note": "<who decided, when, and why>" } under removed in ${manifest.shown}`);
    }
  } else {
    notes.push(`${art.shown} is not inside a git checkout, so only pictures missing from disk are checked here`);
  }

  // the removed list is exact
  for (const [name, note] of noted) {
    if (!note.trim()) continue; // already reported by readParked
    if (art.onDisk.has(name) && !art.deleted.has(name)) failures.push(`${manifest.shown}: removed says ${name} was removed, but it is still in ${art.shown}/. Fix: delete the picture, or drop the note (a kept picture is parked, not removed)`);
    if (referenced.has(name)) failures.push(`${manifest.shown}: removed lists ${name}, but ${[...story.placed()].filter((s) => (story.scenes[s].art || []).includes(name)).join(", ")} still loads it. Fix: change the scene's art line first; a reader never meets a missing picture`);
  }

  const summary = `${retired.length} scene(s) retired in every edition with their records and pictures kept, ${noted.size} picture(s) removed with a note, ${art.inGit ? art.deleted.size : 0} deletion(s) in git`;
  return { failures, notes, summary };
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runGate("check-story-retired", process.argv.slice(2), (story) => check(story));
}
