#!/usr/bin/env node
/**
 * check-worklog.mjs: the worklog gate. One trail, one helm, generated indexes that match the trail.
 *
 *   node scripts/check-worklog.mjs [<repo-root>]
 *
 * Fails on: a missing worklog/README.md, STATE.md, log.jsonl or entries/README.md; a trail line that is not JSON or lacks
 * id, timestamp, edited_at, event_type, scope, summary, or whose timestamp has no numeric offset; a STATE.md without
 * "Last rewritten:", a HEAD line, a Current facts section, a Closed directions section or a Next action; a STATE HEAD that
 * is not an ancestor of git HEAD or is more than one commit behind it (WORKLOG_ALLOW_STATE_HEAD_DRIFT=1 skips this while
 * you are mid-edit); a WORKLOG.md that does not list the last trail entry; a second log.jsonl anywhere in the tree.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const wl = path.join(repo, "worklog");
const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const need = (rel, why) => { if (!fs.existsSync(path.join(repo, rel))) fail(`missing ${rel} (${why})`); };
need("worklog/README.md", "the discovery page: what this folder is");
need("worklog/STATE.md", "the helm");
need("worklog/log.jsonl", "the trail");
need("worklog/entries/README.md", "declares the entries are generated");

const REQUIRED = ["id", "timestamp", "edited_at", "event_type", "scope", "summary"];
let last = null;
if (fs.existsSync(path.join(wl, "log.jsonl"))) {
  fs.readFileSync(path.join(wl, "log.jsonl"), "utf8").split("\n").filter(Boolean).forEach((line, i) => {
    let e;
    try { e = JSON.parse(line); } catch (err) { fail(`log.jsonl:${i + 1} is not JSON (${err.message})`); return; }
    for (const k of REQUIRED) if (!e[k]) fail(`log.jsonl:${i + 1} missing ${k}`);
    if (e.timestamp && !/[+-]\d{2}:\d{2}$/.test(e.timestamp)) fail(`log.jsonl:${i + 1} timestamp needs a numeric offset: ${e.timestamp}`);
    last = e;
  });
}
try {
  const rogue = execFileSync("git", ["-C", repo, "ls-files", "-z", "--", "*log.jsonl"], { encoding: "utf8" }).split("\0").filter(Boolean).filter((f) => f !== "worklog/log.jsonl");
  if (rogue.length) fail(`a second trail is tracked: ${rogue.join(", ")} (one spine per repo)`);
} catch {}

if (fs.existsSync(path.join(wl, "STATE.md"))) {
  const st = fs.readFileSync(path.join(wl, "STATE.md"), "utf8");
  if (!/Last rewritten:/i.test(st)) fail("STATE.md: missing 'Last rewritten:'");
  if (!/current (verified )?facts|best configuration/i.test(st)) fail("STATE.md: missing a Current facts section");
  if (!/closed directions/i.test(st)) fail("STATE.md: missing a Closed directions section");
  if (!/next (action|steps)/i.test(st)) fail("STATE.md: missing a Next action");
  const m = st.match(/\*\*HEAD:\*\*\s*`?([0-9a-f]{7,40}|uncommitted)`?/i) || st.match(/\bHEAD:\s*`?([0-9a-f]{7,40}|uncommitted)`?/i);
  if (!m) fail("STATE.md: missing a **HEAD:** <short-sha> line");
  else if (m[1] !== "uncommitted" && process.env.WORKLOG_ALLOW_STATE_HEAD_DRIFT !== "1") {
    try {
      const lag = Number(execFileSync("git", ["-C", repo, "rev-list", "--count", `${m[1]}..HEAD`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
      if (lag > 1) fail(`STATE.md: HEAD ${m[1]} is ${lag} commits behind git HEAD (max 1). Fix: rewrite STATE.md, or run the appender once`);
      else if (lag === 1) warnings.push(`STATE.md: HEAD ${m[1]} is 1 commit behind git HEAD (allowed)`);
    } catch { fail(`STATE.md: HEAD ${m[1]} is not an ancestor of git HEAD`); }
  }
}
if (last && fs.existsSync(path.join(wl, "WORKLOG.md"))) {
  const idx = fs.readFileSync(path.join(wl, "WORKLOG.md"), "utf8");
  const file = `${String(last.timestamp).replace("T", "_").slice(0, 19).replace(/:/g, "-")}_`;
  if (!idx.includes(file)) fail(`WORKLOG.md does not list the last trail entry (${last.id}). Fix: node scripts/worklog-index.mjs`);
} else if (last) fail("missing worklog/WORKLOG.md. Fix: node scripts/worklog-index.mjs");

for (const w of warnings) process.stdout.write(`warn: ${w}\n`);
if (errors.length) { for (const e of errors) process.stderr.write(`${e}\n`); process.stderr.write(`worklog gate: fail (${errors.length})\n`); process.exit(1); }
process.stdout.write(`worklog gate: pass${last ? ` (last entry ${last.timestamp})` : ""}\n`);
