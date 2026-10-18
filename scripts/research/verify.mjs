#!/usr/bin/env node
/**
 * verify.mjs: load a primary source and record it in research/SOURCES.json, so a finding can become `checked`.
 *
 *   node scripts/research/verify.mjs --key <source-key> --arxiv <id> | --doi <doi> | --url <https://...>
 *        [--finding "<the one finding this source is used for>"] [--caveat "<its limit>"] [--note "..."] [--root <repo>]
 *
 * arXiv ids go to the arXiv Atom API, DOIs to Crossref, anything else is fetched and its <title> read. The record keeps
 * what was loaded (title, authors, year, venue, an abstract excerpt), when, and how. No network answer, no record: a
 * source nobody loaded is not checked. Nothing here grades the finding; you do, in --caveat and the finding's strength.
 */
import fs from "node:fs";
import path from "node:path";
import { loadConfig, parseArgs, readJson, rootOf } from "./config.mjs";

const root = rootOf();
const cfg = loadConfig(root);
const { flags } = parseArgs(process.argv.slice(2));
const key = flags.key && String(flags.key);
if (!key || !/^[a-z0-9][a-z0-9_-]*$/.test(key) || !(flags.arxiv || flags.doi || flags.url)) { console.error("usage: node scripts/research/verify.mjs --key <kebab_key> --arxiv <id> | --doi <doi> | --url <url> [--finding ...] [--caveat ...]"); process.exit(2); }
const UA = { "User-Agent": "narrative-token-ssot research verify (https://github.com/enclave402/narrative-token-ssot)" };
const get = async (url, accept) => { const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 30000); try { const r = await fetch(url, { headers: { ...UA, ...(accept ? { Accept: accept } : {}) }, signal: ctrl.signal, redirect: "follow" }); return { status: r.status, text: await r.text(), url: r.url }; } finally { clearTimeout(t); } };
const strip = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const decode = (s) => strip(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

let record;
if (flags.arxiv) {
  const id = String(flags.arxiv).replace(/^arxiv:/i, "").replace(/v\d+$/, "");
  const r = await get(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`);
  const entry = r.text.split("<entry>")[1] || "";
  const title = decode(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
  if (r.status !== 200 || !title) { console.error(`verify: arXiv ${id} not found (HTTP ${r.status})`); process.exit(1); }
  record = { kind: "arxiv", id, url: `https://arxiv.org/abs/${id}`, title, authors: [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => decode(m[1])), year: (entry.match(/<published>(\d{4})/) || [])[1] || "", venue: "arXiv preprint", abstract_excerpt: decode(entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]).slice(0, 400), checked_how: "arxiv-api" };
} else if (flags.doi) {
  const doi = String(flags.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
  const r = await get(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, "application/json");
  if (r.status !== 200) { console.error(`verify: Crossref ${doi} not found (HTTP ${r.status})`); process.exit(1); }
  const m = JSON.parse(r.text).message;
  record = { kind: "doi", id: doi, url: `https://doi.org/${doi}`, title: strip((m.title || [])[0]), authors: (m.author || []).map((a) => [a.given, a.family].filter(Boolean).join(" ")), year: String((m.issued?.["date-parts"] || [[""]])[0][0] || ""), venue: (m["container-title"] || [])[0] || m.publisher || "", abstract_excerpt: strip(m.abstract).slice(0, 400), checked_how: "crossref" };
} else {
  const url = String(flags.url);
  const r = await get(url, "text/html");
  if (r.status >= 400) { console.error(`verify: ${url} answered HTTP ${r.status}`); process.exit(1); }
  record = { kind: "url", id: url, url: r.url, title: decode(r.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) || url, authors: [], year: "", venue: new URL(r.url).hostname, abstract_excerpt: decode(r.text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] || "").slice(0, 400), checked_how: `http ${r.status}` };
}
record.checked_at = new Date().toISOString();
if (flags.finding) record.finding_used = String(flags.finding);
if (flags.caveat) record.caveat = String(flags.caveat);
if (flags.note) record.note = String(flags.note);

const file = path.join(cfg.researchDir, "SOURCES.json");
const data = fs.existsSync(file) ? readJson(file) : { _about: "Checked sources: each entry was loaded from its primary location by scripts/research/verify.mjs. A `checked` finding in FINDINGS.jsonl names a key here.", sources: {} };
data.sources[key] = record;
data.sources = Object.fromEntries(Object.entries(data.sources).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(file, JSON.stringify(data, null, 1) + "\n");
console.log(`verify: ${key} <- ${record.kind} ${record.id}: "${record.title}" (${record.year || "n.d."}; ${record.authors.slice(0, 3).join(", ")}${record.authors.length > 3 ? " et al." : ""}) recorded in research/SOURCES.json`);
