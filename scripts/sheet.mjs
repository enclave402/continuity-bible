#!/usr/bin/env node
/**
 * sheet.mjs: one HTML page showing every picture of one character, in the order they were made, with their tags, the
 * chosen anchor, what is on the redraw list, and every replacement already made. Zero dependencies: open it in a browser.
 *
 *   node scripts/sheet.mjs <embeddings.jsonl|tags.jsonl> [--character <id>] [--keep tag=value ...]
 *        [--prefer fewest-redraws|first-look|last-look|most-common] [--replacements <file.jsonl>] [--out sheet.html]
 *
 * Input rows are the anchor script's: { "image": "<path>", "order": <n>, "tags": { ... }, "embedding": [..] }. The anchor
 * and the redraw list are computed with the same engine and the same defaults as scripts/anchor.mjs (the registry's
 * drift_resolution and the entry's canon_tags), so the sheet never disagrees with the report. Replacements are a dated
 * record, one JSON object per line: { "scene": "...", "before": "<path>", "after": "<path>", "anchor": "<path>",
 * "date": "YYYY-MM-DD", "note": "..." }; the registry may name the file as drift_resolution.replacements.
 * Image paths are written relative to the output page, so the sheet works wherever the pictures are.
 */
import fs from "node:fs";
import path from "node:path";
import { chooseAnchor, parseKeep, PREFER, DEFAULT_UNREADABLE } from "./anchor.mjs";
import { loadRegistry, registryPath } from "./lib.mjs";

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? "" : argv[i + 1] || ""; };
const VALUE_FLAGS = new Set(["--character", "--keep", "--prefer", "--replacements", "--out", "--registry"]);
const file = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
let registry = null;
try { registry = loadRegistry(registryPath(process.argv)); } catch { registry = null; }
const id = flag("--character");
const entry = id ? registry?.characters?.[id] : null;
const defaults = { ...(registry?.drift_resolution || {}), ...(entry?.drift_resolution || {}) };
const source = file || (defaults.embeddings && registry ? path.join(registry._root, defaults.embeddings) : "");
if (!source || !fs.existsSync(source)) { console.error("usage: node scripts/sheet.mjs <embeddings.jsonl> [--character <id>] [--keep tag=value ...] [--prefer fewest-redraws] [--replacements <file.jsonl>] [--out sheet.html]"); process.exit(2); }

const readRows = (f) => { const raw = fs.readFileSync(f, "utf8"); return f.endsWith(".jsonl") ? raw.split("\n").filter(Boolean).map((l) => JSON.parse(l)) : (() => { const j = JSON.parse(raw); return Array.isArray(j) ? j : j.rows || j.images || []; })(); };
const rows = readRows(source).map((r, i) => ({ ...r, order: r.order ?? i })).sort((a, b) => a.order - b.order);
const keepFlags = argv.flatMap((a, i) => (a === "--keep" && argv[i + 1] ? [argv[i + 1]] : []));
const keep = keepFlags.length ? parseKeep(keepFlags.join(",")) : entry?.canon_tags || null;
const policy = PREFER[flag("--prefer")] || defaults.policy || PREFER[defaults.prefer] || "consensus";
const unreadable = defaults.unreadable || DEFAULT_UNREADABLE;
let result = null, problem = "";
try { result = chooseAnchor(rows, { policy, threshold: Number(defaults.pass_threshold || 0.6), pruneZ: Number(defaults.prune_outliers_z || 0), keep, unreadable }); }
catch (e) { problem = e.message.replace(/^anchor: /, ""); }

const replFile = flag("--replacements") || (defaults.replacements && registry ? path.join(registry._root, defaults.replacements) : "");
const replacements = replFile && fs.existsSync(replFile) ? readRows(replFile) : [];
const out = path.resolve(flag("--out") || "sheet.html");
const srcDir = path.dirname(path.resolve(source));
const rel = (p) => (p ? path.relative(path.dirname(out), path.isAbsolute(p) ? p : path.resolve(srcDir, p)).split(path.sep).join("/") : "");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const redraw = new Set(result?.regenerate || []);
const replaced = new Set(replacements.map((r) => r.before));
const name = entry?.name || id || path.basename(source);

const card = (r) => {
  const isAnchor = result && r.image === result.anchor.image;
  const unsure = keep && Object.keys(keep).some((k) => unreadable.map((u) => u.toLowerCase()).includes(String(r.tags?.[k] ?? "").toLowerCase()));
  const badge = isAnchor ? "anchor" : replaced.has(r.image) ? "replaced" : redraw.has(r.image) ? "redraw" : unsure ? "cannot tell" : "keep";
  const tags = Object.entries(r.tags || {}).map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join("");
  return `<figure class="card ${badge.replace(" ", "-")}"><img loading="lazy" src="${esc(rel(r.image))}" alt="${esc(r.image)}"><figcaption><span class="badge">${esc(badge)}</span> <span class="order">#${esc(r.order)}</span><div class="file">${esc(path.basename(r.image))}</div><ul>${tags}</ul></figcaption></figure>`;
};
const pair = (p) => `<figure class="pair"><div><img loading="lazy" src="${esc(rel(p.before))}" alt="before"><span>before</span></div><div><img loading="lazy" src="${esc(rel(p.after))}" alt="after"><span>after</span></div><figcaption><b>${esc(p.scene || path.basename(p.after || ""))}</b> ${esc(p.date || "")}${p.note ? ` · ${esc(p.note)}` : ""}</figcaption></figure>`;
const summary = result
  ? `<p>Kept the same in every picture: <b>${esc(keep ? Object.entries(keep).map(([k, v]) => `${k} ${v}`).join(", ") : "nothing declared")}</b>. For everything else: <b>${esc({ consensus: "fewest redraws", origin: "the first look", terminal: "the last look", mode: "the most common look" }[result.method] || result.method)}</b>.</p><p><b>${rows.length}</b> pictures. Anchor: <b>${esc(path.basename(result.anchor.image))}</b>. To redraw: <b>${redraw.size}</b>${result.stats.cannot_tell ? `. Could not judge: <b>${result.stats.cannot_tell}</b> (not counted as drift)` : ""}. Already replaced: <b>${replacements.length}</b>.</p>`
  : `<p class="warn">No anchor yet: ${esc(problem)}</p>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}: picture sheet</title>
<style>:root{--bg:#fff;--fg:#1b1b1b;--muted:#666;--card:#f6f6f6;--anchor:#1f7a3a;--redraw:#b3261e;--replaced:#5b4bb7;--unsure:#8a6d00;--keep:#888}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--fg:#eee;--muted:#aaa;--card:#1f1f1f;--keep:#777}}
body{margin:0;padding:16px;font-family:system-ui,sans-serif;background:var(--bg);color:var(--fg);line-height:1.45}h1{margin:.2em 0}h2{margin-top:1.6em}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}.card{margin:0;background:var(--card);border-radius:10px;overflow:hidden;border:3px solid transparent}
.card img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block;background:#0002}figcaption{padding:8px;font-size:13px}.file{color:var(--muted);word-break:break-all}ul{margin:4px 0 0;padding-left:16px}
.badge{display:inline-block;padding:1px 8px;border-radius:99px;color:#fff;font-weight:600;background:var(--keep)}.anchor{border-color:var(--anchor)}.anchor .badge{background:var(--anchor)}
.redraw{border-color:var(--redraw)}.redraw .badge{background:var(--redraw)}.replaced .badge{background:var(--replaced)}.cannot-tell .badge{background:var(--unsure)}.order{color:var(--muted)}
.pairs{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}.pair{margin:0;background:var(--card);border-radius:10px;padding:8px}.pair>div{display:inline-block;width:49%;position:relative}
.pair img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:6px}.pair span{position:absolute;left:6px;top:6px;background:#000a;color:#fff;font-size:12px;padding:1px 6px;border-radius:4px}.warn{color:var(--redraw)}</style></head>
<body><h1>${esc(name)}</h1>${summary}${replacements.length ? `<h2>Replaced so far</h2><div class="pairs">${replacements.map(pair).join("")}</div>` : ""}
<h2>Every picture, in the order it was made</h2><div class="grid">${rows.map(card).join("")}</div>
<p class="order">Made by scripts/sheet.mjs from ${esc(path.basename(source))}. Green: the anchor. Red: on the redraw list. Purple: already replaced. Amber: could not judge. Grey: keep as is.</p></body></html>
`;
fs.writeFileSync(out, html);
console.log(`sheet: ${rows.length} picture(s), anchor ${result ? path.basename(result.anchor.image) : "none"}, ${redraw.size} to redraw, ${replacements.length} replaced -> ${path.relative(process.cwd(), out)}`);
