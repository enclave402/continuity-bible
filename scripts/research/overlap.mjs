#!/usr/bin/env node
/**
 * overlap.mjs: before extracting from a new card, see what it adds. Each section is embedded and matched against the
 * existing findings; NEW / PARTIAL / COVERED per section (thresholds in research.config.json overlap).
 *
 *   node scripts/research/overlap.mjs <card-id> [--root <repo>]
 */
import path from "node:path";
import { corpusCards, loadConfig, parseArgs, readJsonl, rootOf, sectionsOf } from "./config.mjs";
import { dot, embedder } from "./embed.mjs";

const root = rootOf();
const cfg = loadConfig(root);
const { positional } = parseArgs(process.argv.slice(2));
const id = positional[0];
if (!id) { console.error("usage: node scripts/research/overlap.mjs <card-id>"); process.exit(2); }
const card = corpusCards(cfg).find((c) => c.id === id);
if (!card) { console.error(`overlap: no corpus card ${id}`); process.exit(1); }
const findings = readJsonl(path.join(cfg.researchDir, "FINDINGS.jsonl"));
const sections = sectionsOf(card.body, card.bodyStartLine).filter((s) => !cfg.chunking.drop_sections.some((d) => s.title.toLowerCase().includes(d)) && s.text.trim().length > 200);
if (!findings.length) { console.log(`overlap: ${id}: ${sections.length} sections; research/FINDINGS.jsonl is empty, so every section is NEW`); process.exit(0); }
const emb = embedder(cfg);
if (!(await emb.available())) { console.error(`overlap: no embedding endpoint at ${emb.base_url} for ${emb.model}`); process.exit(1); }
const cache = emb.cache("findings");
const ftext = (f) => [f.situation, f.finding, f.best_move].filter(Boolean).join("\n");
await cache.ensure(findings.map(ftext));
const fv = findings.map((f) => cache.get(ftext(f)));
console.log(`overlap: ${id}: ${sections.length} sections vs ${findings.length} findings (${emb.model}); COVERED >= ${cfg.overlap.covered}, PARTIAL >= ${cfg.overlap.partial}`);
for (const s of sections) {
  const q = await emb.embedQuery(`${s.title}\n${s.text.slice(0, 6000)}`, cfg.embedding.overlap_instruction);
  const top = findings.map((f, j) => [dot(q, fv[j]), f.id]).sort((a, b) => b[0] - a[0]).slice(0, 3);
  const tag = top[0][0] >= cfg.overlap.covered ? "COVERED" : top[0][0] >= cfg.overlap.partial ? "PARTIAL" : "NEW    ";
  console.log(`${tag} L${s.start} ${s.title.slice(0, 58).padEnd(58)} | ${top.map(([c, fid]) => `${fid} ${c.toFixed(2)}`).join(", ")}`);
}
