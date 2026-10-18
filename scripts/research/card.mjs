#!/usr/bin/env node
/**
 * card.mjs: file one source document as a corpus card, verbatim, with provenance in front matter.
 *
 *   node scripts/research/card.mjs <source.md> --id <kebab-id> --kind <kind> --subjects a,b [--constructs a,b]
 *        [--title "..."] [--origin "<where it came from>"] [--origin-title "..."] [--summary "..."]
 *        [--evidence auto|<level>] [--status raw|reviewed] [--force] [--allow-private]
 *
 * What it does: reads the whole source; decodes any embedded data-URI images ([imageN]: <data:...>) to
 * research/corpus/assets/<id>/ and rewrites the references so the card stays readable; tallies the works-cited domains
 * against research.config.json evidence_domains and suggests an evidence label (--evidence auto); writes
 * research/corpus/<id>.md with front matter (id, title, kind, subjects, constructs, evidence, source_keys, origin,
 * origin_title, captured, status, summary, source_sha256, source_words, citations); runs the publication gate on the card
 * and deletes it if the gate fails (a public corpus holds nothing private). It never summarises for you: --summary is yours,
 * written after you read the document. Then: node scripts/research/index.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { loadConfig, parseArgs, readJson, rootOf, today } from "./config.mjs";

const root = rootOf();
const cfg = loadConfig(root);
const { positional, flags } = parseArgs(process.argv.slice(2));
const source = positional[0];
const need = (k) => { if (!flags[k]) { console.error(`card: --${k} is required`); process.exit(2); } return String(flags[k]); };
if (!source || !fs.existsSync(source)) { console.error("usage: node scripts/research/card.mjs <source.md> --id <id> --kind <kind> --subjects a,b [--summary ...]"); process.exit(2); }
const id = need("id");
if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) { console.error(`card: --id must be kebab-case (${id})`); process.exit(2); }
const kind = need("kind");
const subjects = need("subjects").split(",").map((s) => s.trim()).filter(Boolean);
const tax = readJson(path.join(cfg.researchDir, "SUBJECTS.json"));
for (const s of subjects) if (!tax.subjects[s]) { console.error(`card: unknown subject "${s}". Known: ${Object.keys(tax.subjects).join(", ")} (add one to research/SUBJECTS.json if none fits)`); process.exit(1); }
if (!tax.kinds[kind]) { console.error(`card: unknown kind "${kind}". Known: ${Object.keys(tax.kinds).join(", ")}`); process.exit(1); }

const raw = fs.readFileSync(source, "utf8");
const sha = createHash("sha256").update(raw).digest("hex");
const cardFile = path.join(cfg.researchDir, "corpus", `${id}.md`);
if (fs.existsSync(cardFile) && !flags.force) { console.error(`card: ${path.relative(root, cardFile)} exists; pass --force to rewrite`); process.exit(1); }

// 1. embedded images -> files, references rewritten; the text itself is untouched
const assetsDir = path.join(cfg.researchDir, "corpus", "assets", id);
let body = raw;
const defs = [...raw.matchAll(/^\[(image\d+)\]: <data:image\/(\w+);base64,([^>]+)>\s*$/gm)];
if (defs.length) {
  fs.mkdirSync(assetsDir, { recursive: true });
  for (const [, name, ext, b64] of defs) fs.writeFileSync(path.join(assetsDir, `${name}.${ext}`), Buffer.from(b64, "base64"));
  const extOf = Object.fromEntries(defs.map(([, name, ext]) => [name, ext]));
  body = body.replace(/^\[(image\d+)\]: <data:image\/\w+;base64,[^>]+>\s*$/gm, "").replace(/!\[\]\[(image\d+)\]/g, (m, name) => `![figure ${name}](assets/${id}/${name}.${extOf[name]})`);
  body = body.replace(/\n{3,}$/, "\n");
}

// 2. works cited: tally domains, suggest an evidence label
const citedBlock = body.split(/^#{1,6}\s+\**\s*(?:works cited|references|bibliography)\s*\**\s*$/im)[1] || "";
const urls = [...citedBlock.matchAll(/\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
const domains = {};
for (const u of urls) { const d = u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]; domains[d] = (domains[d] || 0) + 1; }
const primaryList = cfg.evidence_domains.primary;
const isPrimary = (d) => primaryList.some((p) => (p.startsWith(".") ? d.endsWith(p) : d === p || d.endsWith(`.${p}`)));
const primary = Object.entries(domains).filter(([d]) => isPrimary(d)).reduce((n, [, c]) => n + c, 0);
const web = urls.length - primary;
const suggested = !urls.length ? "uncited" : primary && web ? "mixed" : primary ? "peer-reviewed" : "web";
const evidence = !flags.evidence || flags.evidence === "auto" ? suggested : String(flags.evidence);
if (!tax.evidence[evidence]) { console.error(`card: unknown evidence "${evidence}". Known: ${Object.keys(tax.evidence).join(", ")}`); process.exit(1); }

// 3. front matter + verbatim body
const title = (flags.title && String(flags.title)) || (raw.match(/^#\s+(.*)$/m)?.[1] || path.basename(source, path.extname(source))).replace(/[*\\]/g, "").trim();
const words = body.split(/\s+/).filter(Boolean).length;
const q = (s) => `"${String(s).replace(/"/g, "'")}"`;
const list = (a) => `[${a.map((s) => q(s)).join(", ")}]`;
const fm = [
  "---",
  `id: ${id}`,
  `title: ${q(title)}`,
  `kind: ${kind}`,
  `subjects: ${list(subjects)}`,
  `constructs: ${list(flags.constructs ? String(flags.constructs).split(",").map((s) => s.trim()).filter(Boolean) : [])}`,
  `evidence: ${evidence}`,
  `source_keys: []`,
  `origin: ${q(flags.origin || `file:${path.basename(source)}`)}`,
  `origin_title: ${q(flags["origin-title"] || title)}`,
  `captured: ${today()}`,
  `status: ${flags.status || "raw"}`,
  `summary: ${q(flags.summary || "TODO: one or two sentences written after reading the whole document")}`,
  `source_sha256: ${sha}`,
  `source_words: ${words}`,
  `citations: ${urls.length}`,
  `cited_primary: ${primary}`,
  `cited_web: ${web}`,
  `figures: ${defs.length}`,
  "---",
  "",
];
fs.mkdirSync(path.dirname(cardFile), { recursive: true });
fs.writeFileSync(cardFile, fm.join("\n") + body.replace(/^\n+/, ""));

// 4. the publication gate on what was just written
if (cfg.pii_scan !== false && !flags["allow-private"]) {
  const gate = spawnSync(process.execPath, [path.join(root, "scripts", "check-private.mjs"), cardFile], { encoding: "utf8" });
  if (gate.status) {
    fs.unlinkSync(cardFile);
    process.stderr.write(gate.stderr);
    console.error(`card: the publication gate failed on the card, so it was not kept. Redact the source or pass --allow-private only in a private repository.`);
    process.exit(1);
  }
}
const top = Object.entries(domains).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([d, c]) => `${d} ${c}`).join(", ");
console.log(`card: wrote ${path.relative(root, cardFile)} (${words} words, ${defs.length} figure(s) to ${path.relative(root, assetsDir)}, ${urls.length} citations: ${primary} primary / ${web} web -> evidence ${evidence}${flags.evidence && flags.evidence !== "auto" ? ` (suggested ${suggested})` : ""})`);
if (top) console.log(`card: cited domains: ${top}`);
console.log(`card: next: read it in full, set --summary and --status reviewed (or edit the front matter), then node scripts/research/index.mjs`);
