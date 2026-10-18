#!/usr/bin/env node
/**
 * ask.mjs: ask the research before reading it. Hybrid retrieval over findings and (when packs exist) corpus chunks:
 * keyword rank (BM25) fused with meaning rank (the configured embedding model) by reciprocal rank fusion. Findings get a
 * small boost over long chunks so distilled guidance outranks raw prose. Without an embedding endpoint it falls back to
 * keywords and says so.
 *
 *   node scripts/research/ask.mjs "<situation or question>" [--k N] [--checked] [--json] [--root <repo>]
 *   node scripts/research/ask.mjs --build        # (re)embed every finding and chunk now
 */
import fs from "node:fs";
import path from "node:path";
import { loadConfig, parseArgs, readJsonl, rootOf } from "./config.mjs";
import { dot, embedder } from "./embed.mjs";

const root = rootOf();
const cfg = loadConfig(root);
const { positional, flags } = parseArgs(process.argv.slice(2));
const query = positional.join(" ").trim();
const K = Number(flags.k || cfg.retrieval.k);
const findings = readJsonl(path.join(cfg.researchDir, "FINDINGS.jsonl"));
const packsDir = path.join(cfg.researchDir, "retrieval");
const chunks = fs.existsSync(packsDir) ? fs.readdirSync(packsDir).flatMap((d) => readJsonl(path.join(packsDir, d, "chunks.jsonl")).map((c) => ({ ...c, pack: d }))) : [];
const docs = [
  ...findings.map((f) => ({ kind: "finding", id: f.id, text: [f.situation, f.finding, f.best_move, f.why, f.avoid, f.caveat].filter(Boolean).join("\n"), f })),
  ...chunks.map((c) => ({ kind: "chunk", id: c.chunk_id, text: `${c.section_path.join(" > ")}\n${c.text}`, c })),
].filter((d) => !flags.checked || (d.kind === "finding" && d.f.status === "checked"));

const STOP = new Set("the and for with that this from they them their you your are was were has have had not but can could would should what when who how why does about into than then out our its it".split(" "));
const tok = (s) => (s.toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => w.length > 2 && !STOP.has(w));
function bm25(q) {
  const D = docs.map((d) => tok(d.text));
  const avg = D.reduce((n, d) => n + d.length, 0) / (D.length || 1);
  const df = new Map();
  for (const d of D) for (const w of new Set(d)) df.set(w, (df.get(w) || 0) + 1);
  const qs = tok(q);
  return D.map((d) => qs.reduce((s, w) => { const tf = d.filter((x) => x === w).length; if (!tf) return s; const idf = Math.log(1 + (D.length - df.get(w) + 0.5) / (df.get(w) + 0.5)); return s + idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * d.length / avg)); }, 0));
}
const rank = (scores) => { const order = scores.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]); const r = new Array(scores.length); order.forEach(([, i], pos) => { r[i] = pos; }); return r; };

const emb = embedder(cfg);
let mode = `keyword + meaning (${emb.model})`, dense = null;
try {
  const cache = emb.cache("corpus");
  const built = await cache.ensure(docs.map((d) => d.text));
  if (flags.build) { console.log(`ask: ${built} new vector(s), ${docs.length} documents (${findings.length} findings, ${chunks.length} chunks), model ${emb.model}, cache ${path.relative(root, cache.file)}`); process.exit(0); }
  if (query) { const q = await emb.embedQuery(query); dense = docs.map((d) => dot(q, cache.get(d.text))); }
} catch (e) {
  if (flags.build) { console.error(`ask: cannot embed: ${e.message}`); process.exit(1); }
  mode = `keyword only (meaning search unavailable: ${e.message.split("\n")[0].slice(0, 100)})`;
}
if (!query) { console.error('usage: node scripts/research/ask.mjs "<question>" [--k N] [--checked] [--json] | --build'); process.exit(2); }
if (!docs.length) { console.log("ask: nothing to search yet. Card a document (research:card), build a pack (research:pack), add findings."); process.exit(0); }
const lex = bm25(query), rl = rank(lex), rd = dense ? rank(dense) : null;
const kk = cfg.retrieval.rrf_k;
const fused = docs.map((d, i) => ({ d, lex: lex[i], dense: dense ? dense[i] : null, score: (1 / (kk + rl[i]) + (rd ? 1 / (kk + rd[i]) : 0)) * (d.kind === "finding" ? cfg.retrieval.findings_boost : 1) }))
  .filter(({ lex: l, dense: dn }) => l > 0 || (dn !== null && dn > cfg.retrieval.min_dense)).sort((a, b) => b.score - a.score).slice(0, K);
if (flags.json) { console.log(JSON.stringify({ query, mode, results: fused.map(({ d, score, lex: l, dense: dn }) => ({ kind: d.kind, id: d.id, score, lex: l, dense: dn, ...(d.f || {}), ...(d.c ? { section_path: d.c.section_path, citation_anchor: d.c.citation_anchor, text: d.c.text } : {}) })) }, null, 1)); process.exit(0); }
const out = [`ask: "${query}" — ${mode}; ${findings.length} findings + ${chunks.length} chunks searched`];
for (const { d } of fused) {
  if (d.kind === "finding") { const f = d.f; out.push(`\n[${f.id}] (${f.status}, ${f.strength}) ${f.situation}`, `  finding: ${f.finding}`); if (f.best_move) out.push(`  best move: ${f.best_move}`); out.push(`  source: ${f.source_key || (f.corpus_refs || []).join(", ")} · caveat: ${f.caveat}`); }
  else { const c = d.c; out.push(`\n[${c.chunk_id}] ${c.section_path.join(" > ")} (${c.citation_anchor})`, `  ${c.text.replace(/\s+/g, " ").slice(0, 280)}${c.text.length > 280 ? "…" : ""}`); }
}
if (!fused.length) out.push("\nNo match. Next: research/INDEX.md by subject, then read the card it points to and add a finding.");
console.log(out.join("\n"));
