#!/usr/bin/env node
/**
 * anchor.mjs: pick a character's visual anchor after the images have already drifted, and record the choice.
 *
 *   node scripts/anchor.mjs <embeddings.jsonl|.json> [--character <id>] [--ask]
 *        [--keep tag=value ...] [--prefer fewest-redraws|first-look|last-look|most-common]
 *        [--policy origin|terminal|consensus|mode|canon] [--canon tag=value ...]
 *        [--threshold <cosine>] [--prune-outliers <z>] [--write] [--json] [--registry <path>]
 *
 * Two questions decide an anchor.
 *   1. What about this character must never change? (--keep tag=value, repeatable, or the entry's canon_tags.) Only images
 *      carrying every one of those tags are eligible to be the anchor; images without them are always on the redraw list.
 *   2. For everything else, which look do you want? (--prefer.) fewest-redraws: the image nearest the centroid of the eligible
 *      images, or their most frequent tag combination when there are no embeddings; first-look: the first eligible image;
 *      last-look: the last; most-common: the most frequent tag combination. --ask asks both questions on the terminal in plain
 *      words and answers in plain words. --policy (origin, terminal, consensus, mode) is the developer spelling of question 2;
 *      canon is keep + fewest-redraws and stays as an alias, with --canon as the alias of --keep.
 *
 * Input: one row per generated image, from whatever encoder you trust (a face embedding, CLIP, DINOv2, an aesthetic
 * model) or from hand tags alone: { "image": "<path>", "order": <n>, "embedding": [..], "tags": { "<attribute>": "<value>" },
 * "sha256": "..." }. `order` defaults to the row's position. Vectors are normalised here, so distances are cosines whatever
 * the encoder emitted.
 *
 * The bill: every image that lacks a kept tag, plus, among the eligible images, every image below --threshold against the
 * anchor (with embeddings) or whose tags differ from the anchor's (without). stats.bill_basis says which kind of bill it was
 * ("cosine", "tags" or "none"); a tag count is never presented as a similarity count. comparePolicies applies the same kept
 * tags to every policy, so the comparison is within what the person keeps. --write records the choice under
 * characters.<id>.anchor in the registry (never the vectors), with the policy, the kept tags, the file and the stats.
 * Defaults for threshold, pruning, policy and prefer come from the registry's drift_resolution (entry, then top level).
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createHash } from "node:crypto";
import { registryPath, loadRegistry, writeJsonLike } from "./lib.mjs";

export const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
export const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const centroidOf = (vs) => norm(vs[0].map((_, i) => mean(vs.map((v) => v[i]))));
const nearest = (set, c) => set.map((r) => [dot(r.embedding, c), r]).sort((a, b) => b[0] - a[0])[0][1];

/** The plain names of question 2 and the policies they map to. */
export const PREFER = { "fewest-redraws": "consensus", "first-look": "origin", "last-look": "terminal", "most-common": "mode" };
export const PLAIN = { consensus: "fewest redraws", origin: "the first look", terminal: "the last look", mode: "the most common look" };
const METHODS = ["origin", "terminal", "consensus", "mode"];

const low = (v) => String(v).trim().toLowerCase();
const tagKey = (tags) => JSON.stringify(Object.entries(tags || {}).map(([k, v]) => [k, low(v)]).sort());
/** True when the row carries every kept tag with the same value (case-insensitive). A row without tags keeps nothing. */
export const keepsAll = (row, keep) => Boolean(row.tags) && Object.entries(keep || {}).every(([k, v]) => row.tags[k] !== undefined && low(row.tags[k]) === low(v));
/** "tag=value, tag=value" -> { tag: value }; "none" or empty -> {}. */
export const parseKeep = (text) => Object.fromEntries(String(text || "").split(/[,;\n]/).map((kv) => kv.split(/=(.*)/s)).filter((p) => p[0] && p[0].trim() && p[1] !== undefined && !/^none$/i.test(p[0].trim())).map(([k, v]) => [k.trim(), v.trim()]));

/**
 * Choose an anchor from rows. Pure: no files, no registry.
 * keep: { tag: value } that must never change; only rows carrying all of them are eligible, the rest are always billed.
 * canon: the alias's tags, used only when policy is "canon" and keep is not given (policy canon = keep + consensus).
 */
export function chooseAnchor(rowsIn, { policy = "consensus", threshold = 0.6, pruneZ = 0, canon = null, keep = null } = {}) {
  const rows = rowsIn.map((r, i) => ({ ...r, order: r.order ?? i, embedding: r.embedding ? norm(r.embedding) : undefined })).sort((a, b) => a.order - b.order);
  if (!rows.length) throw new Error("anchor: no rows");
  let fixed = keep && Object.keys(keep).length ? keep : null;
  let method = policy;
  if (policy === "canon") {
    fixed = fixed || (canon && Object.keys(canon).length ? canon : null);
    if (!fixed) throw new Error("anchor: canon needs the character's canon_tags in the registry or --canon tag=value");
    method = "consensus";
  }
  if (!METHODS.includes(method)) throw new Error(`anchor: unknown policy ${policy} (origin, terminal, consensus, mode, canon)`);
  // question 1: what must never change. Eligible rows keep every fixed tag; the others are always on the bill.
  const eligible = fixed ? rows.filter((r) => keepsAll(r, fixed)) : rows;
  const excluded = fixed ? rows.filter((r) => !keepsAll(r, fixed)) : [];
  if (!eligible.length) {
    if (policy === "canon") throw new Error(`anchor: no image matches canon ${JSON.stringify(fixed)}: every image has drifted off canon. Fix: recast or regenerate from the master, tag the result, run again`);
    throw new Error(`anchor: no image keeps ${JSON.stringify(fixed)}: every image has drifted off what must never change. Fix: recast or regenerate from the master, tag the result, run again`);
  }
  const scope = fixed ? ` among the ${eligible.length} image(s) that keep ${JSON.stringify(fixed)} (of ${rows.length})` : "";
  // question 2: for everything else, which look. Applied to the eligible rows only.
  const withVec = eligible.filter((r) => r.embedding);
  let pruned = [];
  let pool = withVec;
  if (pruneZ > 0 && withVec.length >= 4) {
    const c = centroidOf(withVec.map((r) => r.embedding));
    const d = withVec.map((r) => 1 - dot(r.embedding, c));
    const m = mean(d), sd = Math.sqrt(mean(d.map((x) => (x - m) ** 2))) || 0;
    pool = withVec.filter((r, i) => sd === 0 || (d[i] - m) / sd <= pruneZ);
    pruned = withVec.filter((r) => !pool.includes(r)).map((r) => r.image);
  }
  const modePick = (set) => {
    const tagged = set.filter((r) => r.tags && Object.keys(r.tags).length);
    if (!tagged.length) return null;
    const counts = new Map();
    for (const r of tagged) counts.set(tagKey(r.tags), (counts.get(tagKey(r.tags)) || 0) + 1);
    const [best, n] = [...counts].sort((a, b) => b[1] - a[1])[0];
    const members = tagged.filter((r) => tagKey(r.tags) === best);
    const vec = members.filter((r) => r.embedding);
    return { anchor: vec.length ? nearest(vec, centroidOf(vec.map((r) => r.embedding))) : members[0], best, n, tagged: tagged.length };
  };
  let anchor, basis;
  if (method === "origin") { anchor = eligible[0]; basis = `first image in order${scope}`; }
  else if (method === "terminal") { anchor = eligible[eligible.length - 1]; basis = `last image in order${scope}`; }
  else if (method === "consensus") {
    if (pool.length) { anchor = nearest(pool, centroidOf(pool.map((r) => r.embedding))); basis = `nearest the centroid of ${pool.length} embedding(s)${pruned.length ? ` after pruning ${pruned.length}` : ""}${scope}`; }
    else {
      const m = modePick(eligible);
      if (!m) throw new Error("anchor: consensus needs embeddings or tags on the rows");
      anchor = m.anchor; basis = `no embeddings, so the most frequent tag combination ${m.best} (${m.n} of ${m.tagged} images)${scope}`;
    }
  } else {
    const m = modePick(eligible);
    if (!m) throw new Error("anchor: mode needs tags on the rows");
    anchor = m.anchor; basis = `most frequent tag combination ${m.best} (${m.n} of ${m.tagged} images)${scope}`;
  }
  // the bill: every excluded image, plus the eligible images too far from the anchor (by cosine, else by tags)
  const sims = anchor.embedding ? rows.filter((r) => r.embedding).map((r) => ({ image: r.image, order: r.order, cosine: dot(r.embedding, anchor.embedding) })) : [];
  const excludedSet = new Set(excluded.map((r) => r.image));
  const base = { n: rows.length, with_embedding: rows.filter((r) => r.embedding).length, pruned: pruned.length, threshold, ...(fixed ? { kept: eligible.length, excluded: excluded.length } : {}) };
  let regenerate, stats;
  if (sims.length) {
    const below = new Set(sims.filter((s) => s.cosine < threshold).map((s) => s.image));
    regenerate = rows.filter((r) => excludedSet.has(r.image) || below.has(r.image)).map((r) => r.image);
    stats = { ...base, mean_cosine: +mean(sims.map((s) => s.cosine)).toFixed(4), min_cosine: +Math.min(...sims.map((s) => s.cosine)).toFixed(4), below_threshold: below.size, bill_basis: "cosine" };
  } else {
    // no similarity scores (hand tags, no model): eligible images whose tags differ from the anchor's are billed, an untagged
    // image included (nothing shows it matches). No tags on the anchor and nothing kept: no bill.
    const anchorTagged = Boolean(anchor.tags) && Object.keys(anchor.tags).length > 0;
    const differ = new Set(anchorTagged ? eligible.filter((r) => tagKey(r.tags) !== tagKey(anchor.tags)).map((r) => r.image) : []);
    const hasBill = anchorTagged || Boolean(fixed);
    regenerate = hasBill ? rows.filter((r) => excludedSet.has(r.image) || differ.has(r.image)).map((r) => r.image) : [];
    stats = { ...base, below_threshold: null, bill_basis: hasBill ? "tags" : "none", ...(hasBill ? { tag_mismatches: regenerate.length, tag_differ: differ.size } : {}) };
  }
  return { policy, method, keep: fixed, basis, anchor: { image: anchor.image, order: anchor.order, sha256: anchor.sha256 }, stats, regenerate, similarities: sims };
}

/** Compare every policy on the same rows, within the same kept tags, so the cheapest one is visible. */
export function comparePolicies(rows, opts) {
  const out = {};
  for (const policy of ["origin", "terminal", "consensus", "mode", "canon"]) {
    try { const r = chooseAnchor(rows, { ...opts, policy }); out[policy] = { image: r.anchor.image, below_threshold: r.stats.below_threshold, mean_cosine: r.stats.mean_cosine, bill_basis: r.stats.bill_basis, to_redo: r.stats.bill_basis === "none" ? null : r.regenerate.length }; }
    catch (e) { out[policy] = { unavailable: e.message.replace(/^anchor: /, "") }; }
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) main().catch((e) => { console.error(e.message); process.exit(1); });

async function main() {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? "" : argv[i + 1] || ""; };
  const VALUE_FLAGS = new Set(["--policy", "--prefer", "--character", "--threshold", "--prune-outliers", "--registry", "--canon", "--keep"]);
  const file = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
  let registry = null;
  try { registry = loadRegistry(registryPath(process.argv)); } catch { registry = null; }
  const id = flag("--character");
  const entry = id ? registry?.characters?.[id] : null;
  const defaults = { ...(registry?.drift_resolution || {}), ...(entry?.drift_resolution || {}) };
  // question 1: --keep tag=value (repeatable; --canon is its alias) wins, else the character's canon_tags
  const keepFlags = argv.flatMap((a, i) => ((a === "--keep" || a === "--canon") && argv[i + 1] ? [argv[i + 1]] : []));
  let keep = keepFlags.length ? parseKeep(keepFlags.join(",")) : entry?.canon_tags || null;
  // question 2: --prefer (plain names) or --policy (developer names); the registry's drift_resolution supplies the default
  const preferFlag = flag("--prefer") || (flag("--policy") ? "" : defaults.prefer || "");
  if (preferFlag && !PREFER[preferFlag]) { console.error(`anchor: unknown --prefer ${preferFlag} (${Object.keys(PREFER).join(", ")})`); process.exit(2); }
  let policy = flag("--policy") || (preferFlag ? PREFER[preferFlag] : "") || defaults.policy || "consensus";
  const source = file || (defaults.embeddings ? path.join(registry._root, defaults.embeddings) : "");
  if (!source) { console.error("usage: node scripts/anchor.mjs <embeddings.jsonl|.json> [--character <id>] [--ask] [--keep tag=value ...] [--prefer fewest-redraws|first-look|last-look|most-common] [--policy origin|terminal|consensus|mode|canon] [--canon tag=value ...] [--threshold 0.6] [--prune-outliers 2] [--write] [--json]"); process.exit(2); }
  const raw = fs.readFileSync(source, "utf8");
  const rows = source.endsWith(".jsonl") ? raw.split("\n").filter(Boolean).map((l) => JSON.parse(l)) : (() => { const j = JSON.parse(raw); return Array.isArray(j) ? j : j.rows || j.images || []; })();
  const threshold = Number(flag("--threshold") || defaults.pass_threshold || 0.6);
  const pruneZ = Number(flag("--prune-outliers") || defaults.prune_outliers_z || 0);
  const budget = defaults.max_regeneration_budget;
  const ask = argv.includes("--ask");
  let write = argv.includes("--write");
  const name = entry?.name || "this character";
  const pairs = (m) => Object.entries(m || {}).map(([k, v]) => `${k}=${v}`).join(", ");
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  let question = null;
  if (ask) {
    // the two questions, in plain words, on the terminal; piped answers work too
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    const lines = rl[Symbol.asyncIterator]();
    question = async (prompt) => { process.stdout.write(prompt); const { value, done } = await lines.next(); if (!process.stdin.isTTY) process.stdout.write("\n"); return done ? "" : String(value); };
    console.log(`What about ${name} must never change? Type tag=value pairs separated by commas, or press Enter for none.`);
    if (keep && Object.keys(keep).length) console.log(`  The registry says: ${pairs(keep)}. Press Enter to keep that, or type your own.`);
    const a1 = (await question("> ")).trim();
    if (a1) keep = parseKeep(a1);
    console.log("For everything else, which look do you want?");
    console.log("  1. fewest redraws (default)");
    console.log("  2. the first look");
    console.log("  3. the last look");
    const a2 = (await question("> ")).trim().toLowerCase();
    policy = /^(2|first)/.test(a2) ? "origin" : /^(3|last)/.test(a2) ? "terminal" : "consensus";
  }
  if (keep && !Object.keys(keep).length) keep = null;
  // policy canon with kept tags is keep + fewest redraws; the alias keeps its name in the report
  let result;
  try { result = chooseAnchor(rows, { policy, threshold, pruneZ, keep, canon: policy === "canon" ? keep : null }); }
  catch (e) {
    if (ask && /drifted off/.test(e.message)) console.error(`None of the pictures has what must never change (${pairs(keep)}). Paste the prompt sheet again, tag the new pictures, and ask again.`);
    else console.error(e.message);
    process.exit(1);
  }
  const compare = comparePolicies(rows, { threshold, pruneZ, keep, canon: keep });
  const chosenAt = new Date().toISOString();
  const prefer = Object.keys(PREFER).find((k) => PREFER[k] === result.method);
  const over = budget !== undefined && result.regenerate.length > budget;

  if (argv.includes("--json")) console.log(JSON.stringify({ ...result, prefer, compare, chosen_at: chosenAt, budget }, null, 2));
  else if (ask) {
    console.log(`Keep ${result.anchor.image} as the one true picture of ${name}.`);
    if (result.regenerate.length) console.log(`Redraw ${plural(result.regenerate.length, "picture")}: ${result.regenerate.join(", ")}.`);
    else console.log("Nothing to redraw.");
    if (result.keep && result.stats.excluded) console.log(`  ${plural(result.stats.excluded, "picture")} ${result.stats.excluded === 1 ? "lacks" : "lack"} what must never change (${pairs(result.keep)}) and ${result.stats.excluded === 1 ? "is" : "are"} always redrawn.`);
    if (result.stats.bill_basis === "tags") console.log("  Counted by your tags, not measured by a model.");
    if (over) console.log(`  That is over your budget of ${budget}.`);
    const others = ["consensus", "origin", "terminal"].filter((p) => p !== result.method).map((p) => { const v = compare[p]; return v.unavailable ? `${PLAIN[p]} is not possible here (${v.unavailable})` : `${PLAIN[p]} would keep ${v.image} and redraw ${v.to_redo ?? "?"}`; });
    console.log(`If you answered differently: ${others.join("; ")}.`);
    if (id && entry && !write) {
      const a3 = (await question(`Record this as ${name}'s anchor in the registry? [y/N] `)).trim().toLowerCase();
      write = /^y/.test(a3);
      if (!write) console.log("Not recorded. Ask again when you have decided, or add --write to the command.");
    }
  } else {
    console.log(`anchor: policy ${result.policy}: ${result.anchor.image} (order ${result.anchor.order}; ${result.basis})`);
    if (result.keep) console.log(`anchor: keep ${JSON.stringify(result.keep)}: ${result.stats.kept} of ${result.stats.n} image(s) keep it; ${result.stats.excluded} ${result.stats.excluded === 1 ? "does not and is" : "do not and are"} always on the bill`);
    const budgetNote = budget !== undefined ? ` (budget ${budget}${over ? ": OVER" : ""})` : "";
    const noVec = result.stats.with_embedding ? "the anchor has no embedding" : "none with an embedding";
    const k = result.regenerate.length;
    if (result.stats.bill_basis === "cosine") console.log(`anchor: ${result.stats.with_embedding} image(s) scored; mean cosine ${result.stats.mean_cosine}, min ${result.stats.min_cosine}; ${result.stats.below_threshold} below ${threshold}${result.keep ? `; ${k} to redo in all` : ""} -> regenerate${budgetNote}`);
    else if (result.stats.bill_basis === "tags") {
      const what = result.policy === "canon" ? `${k} ${k === 1 ? "does" : "do"} not match canon` : result.keep ? `${k} to redo (${result.stats.excluded} lack a kept tag, ${result.stats.tag_differ} differ from the anchor's tags)` : `${k} ${k === 1 ? "differs" : "differ"} from the anchor's tags`;
      console.log(`anchor: ${result.stats.n} image(s), ${noVec}; ${what} -> regenerate (bill by tags, not by similarity)${budgetNote}`);
    } else console.log(`anchor: ${result.stats.n} image(s), ${noVec} and no tags on the anchor: no similarity scores and no regeneration list (add tags or embeddings)`);
    for (const img of result.regenerate) console.log(`  regenerate ${img}`);
    const bill = (v) => (v.bill_basis === "cosine" ? `${v.to_redo} to redo` : v.bill_basis === "tags" ? `${v.to_redo} to redo, by tags` : "no scores");
    console.log(`anchor: compare: ${Object.entries(compare).map(([p, v]) => `${p}=${v.unavailable ? "n/a" : `${v.image} (${bill(v)})`}`).join("; ")}`);
  }
  if (write) {
    if (!registry || !id || !entry) { console.error(`anchor: --write needs --character <id> that exists in ${registry?._file || "character-registry.json"}`); process.exit(1); }
    const rel = path.relative(registry._root, path.resolve(source));
    const imgAbs = path.resolve(path.dirname(path.resolve(source)), result.anchor.image);
    const sha = result.anchor.sha256 || (fs.existsSync(imgAbs) ? createHash("sha256").update(fs.readFileSync(imgAbs)).digest("hex") : undefined);
    entry.anchor = { image: path.isAbsolute(result.anchor.image) ? path.relative(registry._root, result.anchor.image) : path.relative(registry._root, imgAbs), ...(sha ? { sha256: sha } : {}), policy: result.policy, prefer, ...(result.keep ? { keep: result.keep } : {}), metric: defaults.metric || "cosine", order: result.anchor.order, chosen_at: chosenAt, embeddings: rel, stats: result.stats, why: result.basis };
    const { _file, _root, ...bare } = registry;
    writeJsonLike(_file, bare, fs.readFileSync(_file, "utf8"));
    if (ask) console.log(`Recorded in ${path.relative(process.cwd(), _file)}. Next time, attach ${result.anchor.image} to your chatbot message and paste the picture prompt.`);
    else console.log(`anchor: recorded characters.${id}.anchor in ${path.relative(process.cwd(), _file)}; next: node scripts/check.mjs`);
  }
}
