#!/usr/bin/env node
/**
 * pack.mjs: a deterministic retrieval pack for one corpus card, so a lean agent can look things up without rereading it.
 *
 *   node scripts/research/pack.mjs <card-id> [--out-dir <dir>] [--root <repo>]
 *
 * Output (research/retrieval/<card-id>/, gitignored and regenerable byte-for-byte):
 *   manifest.json, document.json, parents.jsonl (one per heading section), chunks.jsonl (question-answerable spans of
 *   about chunking.target_tokens with chunking.overlap_tokens overlap, split by structure first, then paragraphs, then
 *   sentences; fenced code is never split), citations.json (id -> <card path>#L<a>-L<b>), retrieval_guide.md.
 * Ids derive from the card's content hash, so re-running on an unchanged card changes nothing. The works-cited section
 * is dropped from chunks (chunking.drop_sections) but kept in parents.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { corpusCards, loadConfig, parseArgs, rootOf, sectionsOf } from "./config.mjs";

const root = rootOf();
const cfg = loadConfig(root);
const { positional, flags } = parseArgs(process.argv.slice(2));
const id = positional[0];
if (!id) { console.error("usage: node scripts/research/pack.mjs <card-id> [--out-dir <dir>]"); process.exit(2); }
const card = corpusCards(cfg).find((c) => c.id === id);
if (!card) { console.error(`pack: no corpus card ${id}`); process.exit(1); }
const outDir = path.resolve(flags["out-dir"] ? String(flags["out-dir"]) : path.join(cfg.researchDir, "retrieval", id));
const sha = createHash("sha256").update(card.text).digest("hex");
const sha1 = (s) => createHash("sha1").update(s).digest("hex");
const docId = `${id}-${sha.slice(0, 12)}`;
const tokens = (s) => Math.ceil(s.length / cfg.chunking.chars_per_token);
const anchor = (a, b) => `${card.rel}#L${a}-L${b}`;
const drop = (title) => cfg.chunking.drop_sections.some((d) => title.toLowerCase().includes(d));

/** Split a section's text into chunks: paragraphs first, sentences when a paragraph is too long, code fences intact. */
function chunk(text, startLine) {
  const target = cfg.chunking.target_tokens, overlap = cfg.chunking.overlap_tokens;
  const units = [];
  const lines = text.split("\n");
  let buf = [], bufStart = startLine, inFence = false;
  const flush = (endLine) => { if (buf.join("\n").trim()) units.push({ text: buf.join("\n"), start: bufStart, end: endLine }); buf = []; };
  lines.forEach((l, i) => {
    const ln = startLine + i;
    if (/^```/.test(l)) { if (!inFence) { flush(ln - 1); bufStart = ln; buf.push(l); inFence = true; } else { buf.push(l); inFence = false; flush(ln); bufStart = ln + 1; } return; }
    if (inFence) { buf.push(l); return; }
    if (!l.trim()) { flush(ln - 1); bufStart = ln + 1; return; }
    if (!buf.length) bufStart = ln;
    buf.push(l);
  });
  flush(startLine + lines.length - 1);
  // a unit longer than the target splits on sentence ends
  const pieces = [];
  for (const u of units) {
    if (tokens(u.text) <= target * 1.5 || /^```/.test(u.text)) { pieces.push(u); continue; }
    const sentences = u.text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [u.text];
    let acc = "";
    for (const s of sentences) { if (acc && tokens(acc + s) > target) { pieces.push({ text: acc.trim(), start: u.start, end: u.end }); acc = ""; } acc += s; }
    if (acc.trim()) pieces.push({ text: acc.trim(), start: u.start, end: u.end });
  }
  // pack pieces up to the target, carrying an overlap tail into the next chunk
  const out = [];
  let cur = null;
  for (const p of pieces) {
    if (cur && tokens(cur.text + "\n\n" + p.text) > target) {
      out.push(cur);
      const tail = cur.text.slice(-overlap * cfg.chunking.chars_per_token);
      const cut = tail.search(/[.!?]\s/);
      cur = { text: (cut >= 0 ? tail.slice(cut + 2) : "") + (cut >= 0 ? "\n\n" : "") + p.text, start: p.start, end: p.end };
    } else cur = cur ? { text: cur.text + "\n\n" + p.text, start: cur.start, end: p.end } : { ...p };
  }
  if (cur) out.push(cur);
  return out;
}

const sections = sectionsOf(card.body, card.bodyStartLine);
const parents = [];
const chunks = [];
let n = 0;
for (const s of sections) {
  const pid = `${docId}:P:${sha1(s.path.join(" > ") + "\n" + s.text).slice(0, 8)}`;
  const own = drop(s.title) ? [] : chunk(s.text, s.start + 1).filter((c) => c.text.trim().length > 40);
  const ids = own.map((c) => { n += 1; return `${id}-c${String(n).padStart(3, "0")}-${sha1(c.text).slice(0, 12)}`; });
  parents.push({ parent_chunk_id: pid, doc_id: docId, section_path: s.path, source_locator: `lines ${s.start}-${s.end}`, citation_anchor: anchor(s.start, s.end), chunk_count: own.length, char_count: s.text.length, token_count: tokens(s.text), chunk_ids: ids, text: s.text.trim() });
  own.forEach((c, i) => chunks.push({ chunk_id: ids[i], doc_id: docId, parent_chunk_id: pid, section_path: s.path, source_locator: `lines ${c.start}-${c.end}`, citation_anchor: anchor(c.start, c.end), chunk_kind: /^```/.test(c.text) ? "code_block" : "section_span", char_count: c.text.length, token_count: tokens(c.text), adjacent_chunk_ids: [ids[i - 1], ids[i + 1]].filter(Boolean), text: c.text }));
}
fs.mkdirSync(outDir, { recursive: true });
const write = (name, v) => fs.writeFileSync(path.join(outDir, name), typeof v === "string" ? v : JSON.stringify(v, null, 2) + "\n");
const jsonl = (rows) => rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
write("document.json", { doc_id: docId, source_path: card.rel, source_hash: sha, title: card.meta.title || id, doc_type: "md", last_modified_source: Math.floor(fs.statSync(card.file).mtimeMs / 1000), top_level_sections: sections.filter((s) => s.level <= 2).map((s) => s.title), ingestion_version: "narrative-token-ssot-pack-v1" });
write("parents.jsonl", jsonl(parents));
write("chunks.jsonl", jsonl(chunks));
write("citations.json", { source_path: card.rel, parents: Object.fromEntries(parents.map((p) => [p.parent_chunk_id, p.citation_anchor])), chunks: Object.fromEntries(chunks.map((c) => [c.chunk_id, c.citation_anchor])) });
write("manifest.json", { artifact_type: "retrieval_pack", source_path: card.rel, doc_id: docId, parent_count: parents.length, chunk_count: chunks.length, token_estimate_total: chunks.reduce((t, c) => t + c.token_count, 0), chunking: cfg.chunking, files: { document: "document.json", parents: "parents.jsonl", chunks: "chunks.jsonl", citations: "citations.json", retrieval_guide: "retrieval_guide.md" } });
write("retrieval_guide.md", `# Retrieval guide: ${card.meta.title || id}\n\nSource: \`${card.rel}\` (sha256 ${sha.slice(0, 12)}…). ${parents.length} sections, ${chunks.length} chunks.\n\n1. Pick a section below, or ask: \`node scripts/research/ask.mjs "<question>"\`.\n2. Open its chunks in \`chunks.jsonl\` by \`parent_chunk_id\`; \`adjacent_chunk_ids\` expand locally.\n3. Jump to the source with \`citation_anchor\` (\`<file>#L<a>-L<b>\`).\n\n## Sections\n\n${parents.map((p) => `- ${"  ".repeat(Math.max(0, p.section_path.length - 1))}${p.section_path[p.section_path.length - 1]} — ${p.source_locator}, ${p.chunk_count} chunk(s), ~${p.token_count} tokens`).join("\n")}\n`);
console.log(`pack: ${id}: ${parents.length} parents, ${chunks.length} chunks, ~${chunks.reduce((t, c) => t + c.token_count, 0)} tokens -> ${path.relative(root, outDir)}`);
