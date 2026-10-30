#!/usr/bin/env node
/**
 * concept-links.mjs: the concept link lint.
 *
 * What this is: a check that ties every doc to the concept pages. A concept page explains one term in plain words.
 * Why it exists: a term means one thing only when every doc points to the same page for it. Without a check, docs
 *   drift apart and pages nobody links to go stale.
 * How to use it: `node scripts/check-docs.mjs` runs it. Alone: `node scripts/concept-links.mjs [<repo-root>]`.
 *   The terms, the pages, the folders it reads and the files it skips all live in docs/_registry/concept_index.json.
 * Next step: a failure names the doc, the line and the fix. Link the first use of the term to its page, or add the
 *   missing part of the page.
 *
 * Rules it checks:
 *   1. Every concept page exists, has each label in page_labels, an *Also called* line equal to also_called, and a
 *      schema.org DefinedTerm block whose name and alternateName match the data file.
 *   2. The index page links every concept page, and every page in the concepts folder is in the data file.
 *   3. In every scanned doc, the first use of a term (outside code, headings, link targets and the Also called line)
 *      sits inside a link to that term's page. A page does not need to link to itself.
 *   4. Every concept page is linked from at least one scanned doc other than itself and the files in
 *      orphan_links_not_counted.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATA = path.join("docs", "_registry", "concept_index.json");

/** Replace a span with spaces (newlines kept) so positions still line up with the original text. */
const blank = (s) => s.replace(/[^\n]/g, " ");

/** The text a reader sees as prose: code, headings, front matter, HTML blocks, URLs and link targets become spaces. */
export function proseMask(text, alsoCalledLabel) {
  let t = text;
  t = t.replace(/^---\n[\s\S]*?\n---\n/, blank);
  t = t.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, blank);
  t = t.replace(/<script[\s\S]*?<\/script>/gi, blank);
  t = t.replace(/<!--[\s\S]*?-->/g, blank);
  t = t.replace(/(`+)[\s\S]*?\1/g, blank);
  t = t.replace(/^#{1,6}\s[^\n]*$/gm, blank);
  if (alsoCalledLabel) t = t.split("\n").map((l) => (l.trimStart().startsWith(alsoCalledLabel) ? blank(l) : l)).join("\n");
  t = t.replace(/\]\([^)]*\)/g, (m) => "]" + blank(m.slice(1)));
  t = t.replace(/^\s*\[[^\]]+\]:\s+\S+.*$/gm, blank);
  t = t.replace(/<https?:[^>]*>|https?:\/\/\S+/g, blank);
  return t;
}

/** Markdown inline links: where the link text starts and ends, and the target with any #anchor removed. */
export function findLinks(text) {
  const out = [];
  const re = /\[((?:[^\[\]\n]|\[[^\]\n]*\])+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (let m; (m = re.exec(text)); ) out.push({ start: m.index + 1, end: m.index + 1 + m[1].length, target: m[2].split("#")[0] });
  return out;
}

/** One pattern per term: whole words, any mix of spaces or hyphens between words, an optional plural ending. */
export function termPattern(phrases) {
  const esc = (p) => p.trim().split(/[\s-]+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s-]+");
  const alts = [...phrases].sort((a, b) => b.length - a.length).map(esc).join("|");
  return new RegExp(`(?<![\\w-])(?:${alts})(?:s|es)?(?![\\w-])`, "i");
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

export function checkConcepts(repo) {
  const errors = [];
  const dataFile = path.join(repo, DATA);
  if (!fs.existsSync(dataFile)) return [`concept lint: missing ${DATA}. Why: the lint reads its term list there. Fix: restore the file.`];
  const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  const concepts = data.concepts || [];
  const labels = data.page_labels || [];
  const alsoLabel = labels.find((l) => /also called/i.test(l));
  const skip = new Set(Object.keys(data.skip || {}));
  const notCounted = new Set(data.orphan_links_not_counted || []);
  const byPage = new Map(concepts.map((c) => [c.page, c]));
  const read = (rel) => fs.readFileSync(path.join(repo, rel), "utf8");

  // 1. Each page has its parts, and its Also called line and DefinedTerm block agree with the data file.
  for (const c of concepts) {
    if (!fs.existsSync(path.join(repo, c.page))) { errors.push(`${c.page}: concept page for "${c.term}" is missing. Why: ${DATA} lists it. Fix: write the page or remove the entry.`); continue; }
    const text = read(c.page);
    for (const label of labels) if (!text.includes(label)) errors.push(`${c.page}: no "${label}" line. Why: every concept page says what it is, why, the rule, how to use it, the next step and a source. Fix: add the line.`);
    if (alsoLabel) {
      const line = text.split("\n").find((l) => l.trimStart().startsWith(alsoLabel));
      const want = c.also_called.join(", ");
      if (line && line.trim().slice(alsoLabel.length).trim() !== want) errors.push(`${c.page}: the ${alsoLabel} line differs from ${DATA}. Fix: make it read "${alsoLabel} ${want}".`);
    }
    const ld = text.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    let term = null;
    try { term = ld && JSON.parse(ld[1]); } catch { term = null; }
    if (!term || term["@type"] !== "DefinedTerm") errors.push(`${c.page}: no schema.org DefinedTerm block. Why: search engines read it to index the term. Fix: add a <script type="application/ld+json"> block with "@type": "DefinedTerm".`);
    else {
      if (term.name !== c.term) errors.push(`${c.page}: DefinedTerm name is "${term.name}", the data file says "${c.term}". Fix: make them match.`);
      if (JSON.stringify(term.alternateName) !== JSON.stringify(c.also_called)) errors.push(`${c.page}: DefinedTerm alternateName differs from also_called in ${DATA}. Fix: copy the list from the data file.`);
    }
  }

  // 2. The index links every page; every page in a concepts folder is in the data file.
  const index = data.index_page;
  if (!index || !fs.existsSync(path.join(repo, index))) errors.push(`concept lint: index page ${index} is missing. Fix: write it, or set index_page in ${DATA}.`);
  else {
    const targets = new Set(findLinks(read(index)).map((l) => path.normalize(path.join(path.dirname(index), l.target))));
    for (const c of concepts) if (!targets.has(path.normalize(c.page))) errors.push(`${index}: does not link "${c.term}" (${c.page}). Fix: add a row for it.`);
  }
  for (const dir of new Set(concepts.map((c) => path.dirname(c.page)))) {
    const abs = path.join(repo, dir);
    if (!fs.existsSync(abs)) continue;
    for (const n of fs.readdirSync(abs).filter((n) => n.endsWith(".md"))) {
      const rel = path.join(dir, n);
      if (!byPage.has(rel)) errors.push(`${rel}: a concept page with no entry in ${DATA}. Fix: add the entry, so the lint can check links to it.`);
    }
  }

  // 3. First use links to the page. 4. Collect who links to whom for the orphan check.
  const walk = (dir) => fs.readdirSync(dir).flatMap((n) => { const p = path.join(dir, n); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
  const docs = (data.scan || []).flatMap((d) => (fs.existsSync(path.join(repo, d)) ? walk(path.join(repo, d)) : []))
    .filter((f) => f.endsWith(".md")).map((f) => path.relative(repo, f)).filter((rel) => !skip.has(rel)).sort();
  const linkedFrom = new Map(concepts.map((c) => [c.page, []]));
  const patterns = concepts.map((c) => [c, termPattern(c.match)]);
  for (const rel of docs) {
    const text = read(rel);
    const links = findLinks(text).map((l) => ({ ...l, resolved: path.normalize(path.join(path.dirname(rel), l.target)) }));
    for (const l of links) if (linkedFrom.has(l.resolved) && l.resolved !== rel && !notCounted.has(rel)) linkedFrom.get(l.resolved).push(rel);
    if (rel === index) continue;
    const prose = proseMask(text, alsoLabel);
    for (const [c, re] of patterns) {
      if (c.page === rel) continue;
      const m = re.exec(prose);
      if (!m) continue;
      const ok = links.some((l) => l.resolved === path.normalize(c.page) && m.index >= l.start && m.index < l.end);
      if (!ok) {
        const to = path.relative(path.dirname(rel), c.page);
        errors.push(`${rel}:${lineOf(text, m.index)}: first use of "${m[0].trim()}" does not link to its concept page. Why: the first use of a term links to the one page that explains it. Fix: write [${m[0].trim()}](${to}).`);
      }
    }
  }
  for (const [page, from] of linkedFrom) if (fs.existsSync(path.join(repo, page)) && !from.length) errors.push(`${page}: no doc links to this concept page (orphan). Why: a page nobody links to is never read. Fix: link it where the term is used, or remove the term from ${DATA}.`);
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repo = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
  const errors = checkConcepts(repo);
  if (errors.length) { for (const e of errors) process.stderr.write(`${e}\n`); process.stderr.write(`concept lint: fail (${errors.length})\n`); process.exit(1); }
  console.log("concept lint: pass");
}
