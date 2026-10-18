#!/usr/bin/env node
/**
 * worklog-index.mjs: the generated human layer of the worklog, built from worklog/log.jsonl and nothing else.
 *
 *   node scripts/worklog-index.mjs [<repo-root>]
 *
 * Writes worklog/entries/<YYYY-MM-DD_HH-MM-SS>_<slug>.md (created when missing, never overwritten, so a hand-enriched
 * entry survives), and fully regenerates worklog/WORKLOG.md and worklog/WORKLOG_INDEX.html. Idempotent; do not hand-edit
 * the generated files. The trail stays the only source: a conflict in a generated file is resolved by running this again.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const dir = path.join(repo, "worklog");
const logFile = path.join(dir, "log.jsonl");
if (!fs.existsSync(logFile)) { console.error(`worklog-index: missing ${logFile}`); process.exit(1); }
const entries = fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean).map((l, i) => { try { return JSON.parse(l); } catch { console.error(`worklog-index: log.jsonl:${i + 1} is not JSON`); process.exit(1); } });
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slug = (s) => String(s).toLowerCase().replace(/\[removal\]/g, "removal").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "entry";
const stamp = (ts) => String(ts).replace("T", "_").slice(0, 19).replace(/:/g, "-");
const clock = (ts) => { const m = String(ts).match(/T(\d{2}:\d{2}:\d{2})([+-]\d{2}:\d{2})/); return m ? `${m[1]} (UTC${m[2]})` : ts; };

const entriesDir = path.join(dir, "entries");
fs.mkdirSync(entriesDir, { recursive: true });
let created = 0;
const fileOf = new Map();
for (const e of entries) {
  const name = `${stamp(e.timestamp)}_${slug(e.summary)}.md`;
  fileOf.set(e.id, name);
  const file = path.join(entriesDir, name);
  if (fs.existsSync(file)) continue;
  const lines = [`# ${e.summary}`, "", `- **Logged:** ${e.timestamp}`, `- **Type:** ${e.event_type} · **Scope:** ${e.scope} · **Status:** ${e.status || "closed"}`, `- **Author:** ${e.author || e.owner || "unknown"} · **HEAD:** ${e.git_head || "n/a"} · **Id:** \`${e.id}\``];
  if (e.tags?.length) lines.push(`- **Tags:** ${e.tags.join(", ")}`);
  if (e.references?.length) lines.push(`- **References:** ${e.references.join(", ")}`);
  if (e.details) lines.push("", "## Details", "", e.details);
  if (e.run) lines.push("", "## Run record", "", ...Object.entries(e.run).filter(([, v]) => v).map(([k, v]) => `- **${k.replace(/_/g, " ")}:** ${v}`));
  fs.writeFileSync(file, lines.join("\n") + "\n");
  created += 1;
}

const byDate = new Map();
for (const e of [...entries].reverse()) { const d = String(e.timestamp).slice(0, 10); if (!byDate.has(d)) byDate.set(d, []); byDate.get(d).push(e); }
let md = `# Worklog index\n\nGenerated from \`log.jsonl\` by \`scripts/worklog-index.mjs\`. Do not edit. ${entries.length} entries. Read \`STATE.md\` first; this is the trail.\n`;
let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Worklog index</title><style>body{font-family:system-ui,sans-serif;max-width:1100px;margin:2rem auto;padding:0 1rem;line-height:1.5;color:#1b1b1b;background:#fff}h2{margin-top:2rem;border-bottom:1px solid #ddd}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:.4rem .6rem;text-align:left;vertical-align:top}th{background:#f4f4f4}code{font-size:.9em}</style></head><body><h1>Worklog index</h1><p>Generated from <code>log.jsonl</code>. ${entries.length} entries. Read <code>STATE.md</code> first.</p>`;
for (const [date, list] of byDate) {
  md += `\n## ${date}\n\n| Time | Type | Scope | Summary | Author | Status |\n|---|---|---|---|---|---|\n`;
  html += `<h2>${esc(date)}</h2><table><thead><tr><th>Time</th><th>Type</th><th>Scope</th><th>Summary</th><th>Author</th><th>Status</th></tr></thead><tbody>`;
  for (const e of list) {
    const link = `entries/${fileOf.get(e.id)}`;
    md += `| ${clock(e.timestamp)} | ${e.event_type} | ${e.scope} | [${e.summary.replace(/\|/g, "\\|")}](${link}) | ${e.author || e.owner || ""} | ${e.status || "closed"} |\n`;
    html += `<tr><td>${esc(clock(e.timestamp))}</td><td>${esc(e.event_type)}</td><td>${esc(e.scope)}</td><td><a href="${esc(link)}">${esc(e.summary)}</a></td><td>${esc(e.author || e.owner || "")}</td><td>${esc(e.status || "closed")}</td></tr>`;
  }
  html += `</tbody></table>`;
}
html += `</body></html>\n`;
fs.writeFileSync(path.join(dir, "WORKLOG.md"), md);
fs.writeFileSync(path.join(dir, "WORKLOG_INDEX.html"), html);
console.log(`worklog-index: ${entries.length} entries, ${created} entry file(s) created, WORKLOG.md and WORKLOG_INDEX.html regenerated`);
