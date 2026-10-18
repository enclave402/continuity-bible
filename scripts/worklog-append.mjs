#!/usr/bin/env node
/**
 * worklog-append.mjs: the only writer of worklog/log.jsonl (one JSON object per line, append-only).
 *
 *   node scripts/worklog-append.mjs --author agent:<name> --event-type action --scope <area> --summary "<one line>"
 *        [--details "..."] [--tags a,b] [--references a,b] [--status open|closed]
 *        [--files "..."] [--before "..."] [--after "..."] [--removed "..."] [--verified-by "..."] [--next "..."]
 *        [--no-rebuild-index] [--dry-run]
 *
 * The timestamp is generated here, never typed: ISO-8601 with a numeric offset in WORKLOG_TZ (default: this machine's
 * zone). Hand-written lines, echo >>, and edits of earlier lines are schema violations: a correction is a new entry that
 * references the old id. The entry also carries the git HEAD it was written at. After the append the human index is rebuilt
 * (scripts/worklog-index.mjs) and the HEAD line of worklog/STATE.md is refreshed. Nothing here edits any other part of STATE.md.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const fields = {};
const flags = new Set();
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith("--")) continue;
  const key = a.slice(2);
  if (["no-rebuild-index", "dry-run"].includes(key)) { flags.add(key); continue; }
  fields[key] = argv[++i] ?? "";
}
const repo = resolve(fields.repo || join(HERE, ".."));
const logFile = join(repo, "worklog", "log.jsonl");
const stateFile = join(repo, "worklog", "STATE.md");
if (!existsSync(logFile)) { console.error(`worklog-append: missing ${logFile}`); process.exit(1); }

/** Now, in the configured zone, as ISO-8601 with a numeric offset (never a bare Z). */
export function stampNow(tz = process.env.WORKLOG_TZ) {
  const zone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  const name = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value || "GMT+00:00";
  const m = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  const off = m ? `${m[1]}${m[2].padStart(2, "0")}:${m[3] || "00"}` : "+00:00";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${off}`;
}

const head = (() => { try { return execFileSync("git", ["-C", repo, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(); } catch { return "uncommitted"; } })();
const list = (v) => (v ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : undefined);
const author = fields.author || process.env.AGENT_NAME || "";
if (!/^(agent|human|operator|system):[A-Za-z0-9._-]+$/.test(author)) { console.error("worklog-append: --author agent:<name> (or human:<name>) is required: who is writing this entry"); process.exit(1); }
if (!fields.summary) { console.error("worklog-append: --summary is required"); process.exit(1); }
const removed = fields.removed && !/^none$/i.test(fields.removed.trim()) ? fields.removed : "";
const now = stampNow();
const entry = {
  id: `wl-${randomUUID()}`,
  timestamp: now,
  edited_at: now,
  event_type: fields["event-type"] || "action",
  scope: fields.scope || "repo",
  summary: `${removed ? "[REMOVAL] " : ""}${fields.summary}`,
  details: fields.details || undefined,
  references: list(fields.references),
  tags: list(fields.tags) || ["worklog"],
  status: fields.status || "closed",
  author,
  git_head: head,
  run: ["files", "before", "after", "removed", "verified-by", "next"].some((k) => fields[k]) ? {
    files: fields.files, before: fields.before, after: fields.after, removed: removed || "none", verified_by: fields["verified-by"], next: fields.next,
  } : undefined,
};
for (const k of Object.keys(entry)) if (entry[k] === undefined) delete entry[k];
const line = JSON.stringify(entry);
if (flags.has("dry-run")) { console.log(line); process.exit(0); }
appendFileSync(logFile, line + "\n");
if (existsSync(stateFile)) {
  const st = readFileSync(stateFile, "utf8");
  const next = st.replace(/(\*\*HEAD:\*\*\s*)`?[0-9a-f]{7,40}|uncommitted`?/, `$1${head}`);
  if (next !== st) writeFileSync(stateFile, next);
}
if (!flags.has("no-rebuild-index")) {
  const r = spawnSync(process.execPath, [join(HERE, "worklog-index.mjs"), repo], { stdio: "inherit" });
  if (r.status) process.exit(r.status);
}
console.log(`worklog-append: ${entry.id} ${entry.timestamp} ${entry.event_type} ${entry.scope}: ${entry.summary}`);
