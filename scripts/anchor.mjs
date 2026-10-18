#!/usr/bin/env node
/**
 * anchor.mjs: pick a character's visual anchor after the images have already drifted, and record the choice.
 *
 *   node scripts/anchor.mjs <embeddings.jsonl|.json> --policy origin|terminal|consensus|mode
 *        [--character <id>] [--threshold <cosine>] [--prune-outliers <z>] [--write] [--json] [--registry <path>]
 *
 * Input: one row per generated image, from whatever encoder you trust (a face embedding, CLIP, DINOv2, an aesthetic
 * model): { "image": "<path>", "order": <n>, "embedding": [..], "tags": { "<attribute>": "<value>" }, "sha256": "..." }.
 * `order` defaults to the row's position; `embedding` is needed for consensus and for the distance report; `tags` are
 * needed for mode. Vectors are normalised here, so distances are cosines whatever the encoder emitted.
 *
 * Policies: origin keeps the first image; terminal keeps the last; consensus keeps the image nearest the centroid of all
 * embeddings (after optional outlier pruning), the choice that needs the fewest corrections; mode keeps the most frequent
 * tag combination (the state the character spent most of the work in) and, among those images, the one nearest their
 * centroid. The report lists every image below --threshold against the chosen anchor: that is the regeneration bill.
 * Without embeddings (hand tags from a browser-chatbot workflow) the bill is by tags instead: for canon, every image that
 * does not match canon_tags; for mode, origin and terminal, every image whose tags differ from the anchor's. stats.bill_basis
 * says which kind of bill it was ("cosine", "tags" or "none"); a tag count is never presented as a similarity count.
 * --write records the choice under characters.<id>.anchor in the registry (never the vectors), with the policy, the file
 * and the stats, so later prompts condition on one declared image and the decision is auditable.
 * Defaults for threshold, pruning and policy come from the registry's drift_resolution (entry, then top level).
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { registryPath, loadRegistry, writeJsonLike } from "./lib.mjs";

export const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
export const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const centroidOf = (vs) => norm(vs[0].map((_, i) => mean(vs.map((v) => v[i]))));

/**
 * Choose an anchor from rows under a policy. Pure: no files, no registry.
 * canon: { tag: value } the character is declared to have (registry canon_tags or --canon). The canon policy keeps only
 * images whose tags match every canon tag, then picks the one nearest their centroid. It exists because the cheapest
 * anchor is often the drifted one: a lead who started mixed-race and darker-skinned and drifted lighter for most of the
 * book would be "cheapest" to keep light. Canon says who she is; the regeneration bill is the price of the drift.
 */
export function chooseAnchor(rowsIn, { policy = "consensus", threshold = 0.6, pruneZ = 0, canon = null } = {}) {
  const rows = rowsIn.map((r, i) => ({ ...r, order: r.order ?? i, embedding: r.embedding ? norm(r.embedding) : undefined })).sort((a, b) => a.order - b.order);
  if (!rows.length) throw new Error("anchor: no rows");
  const withVec = rows.filter((r) => r.embedding);
  let pruned = [];
  let pool = withVec;
  if (pruneZ > 0 && withVec.length >= 4) {
    const c = centroidOf(withVec.map((r) => r.embedding));
    const d = withVec.map((r) => 1 - dot(r.embedding, c));
    const m = mean(d), sd = Math.sqrt(mean(d.map((x) => (x - m) ** 2))) || 0;
    pool = withVec.filter((r, i) => sd === 0 || (d[i] - m) / sd <= pruneZ);
    pruned = withVec.filter((r) => !pool.includes(r)).map((r) => r.image);
  }
  const low = (v) => String(v).trim().toLowerCase();
  const tagKey = (tags) => JSON.stringify(Object.entries(tags || {}).map(([k, v]) => [k, low(v)]).sort());
  const canonMatch = (r) => Boolean(r.tags) && Object.entries(canon || {}).every(([k, v]) => r.tags[k] !== undefined && low(r.tags[k]) === low(v));
  let anchor, basis;
  if (policy === "origin") { anchor = rows[0]; basis = "first image in order"; }
  else if (policy === "terminal") { anchor = rows[rows.length - 1]; basis = "last image in order"; }
  else if (policy === "consensus") {
    if (!pool.length) throw new Error("anchor: consensus needs embeddings on the rows");
    const c = centroidOf(pool.map((r) => r.embedding));
    anchor = pool.map((r) => [dot(r.embedding, c), r]).sort((a, b) => b[0] - a[0])[0][1];
    basis = `nearest the centroid of ${pool.length} embedding(s)${pruned.length ? ` after pruning ${pruned.length}` : ""}`;
  } else if (policy === "mode") {
    const tagged = rows.filter((r) => r.tags && Object.keys(r.tags).length);
    if (!tagged.length) throw new Error("anchor: mode needs tags on the rows");
    const key = (r) => tagKey(r.tags);
    const counts = new Map();
    for (const r of tagged) counts.set(key(r), (counts.get(key(r)) || 0) + 1);
    const [best, n] = [...counts].sort((a, b) => b[1] - a[1])[0];
    const members = tagged.filter((r) => key(r) === best);
    const vec = members.filter((r) => r.embedding);
    if (vec.length) { const c = centroidOf(vec.map((r) => r.embedding)); anchor = vec.map((r) => [dot(r.embedding, c), r]).sort((a, b) => b[0] - a[0])[0][1]; }
    else anchor = members[0];
    basis = `most frequent tag combination ${best} (${n} of ${tagged.length} images)`;
  } else if (policy === "canon") {
    if (!canon || !Object.keys(canon).length) throw new Error("anchor: canon needs the character's canon_tags in the registry or --canon tag=value");
    const matches = rows.filter(canonMatch);
    if (!matches.length) throw new Error(`anchor: no image matches canon ${JSON.stringify(canon)}: every image has drifted off canon. Fix: recast or regenerate from the master, tag the result, run again`);
    const vec = matches.filter((r) => r.embedding);
    if (vec.length) { const c = centroidOf(vec.map((r) => r.embedding)); anchor = vec.map((r) => [dot(r.embedding, c), r]).sort((a, b) => b[0] - a[0])[0][1]; }
    else anchor = matches[0];
    basis = `nearest the centroid of the ${matches.length} image(s) matching canon ${JSON.stringify(canon)} (of ${rows.length}); the cheapest state is not canon's job`;
  } else throw new Error(`anchor: unknown policy ${policy} (origin, terminal, consensus, mode, canon)`);
  const sims = anchor.embedding ? rows.filter((r) => r.embedding).map((r) => ({ image: r.image, order: r.order, cosine: dot(r.embedding, anchor.embedding) })) : [];
  let regenerate, stats;
  if (sims.length) {
    // the bill by similarity: every image below the threshold against the anchor
    regenerate = sims.filter((s) => s.cosine < threshold).map((s) => s.image);
    stats = { n: rows.length, with_embedding: sims.length, pruned: pruned.length, mean_cosine: +mean(sims.map((s) => s.cosine)).toFixed(4), min_cosine: +Math.min(...sims.map((s) => s.cosine)).toFixed(4), threshold, below_threshold: regenerate.length, bill_basis: "cosine" };
  } else {
    // no similarity scores (hand tags, no model): the bill is by tags. canon: every image off canon. Otherwise: every image
    // whose tags differ from the anchor's, an untagged image included (nothing shows it matches). No tags on the anchor: no bill.
    const anchorTagged = Boolean(anchor.tags) && Object.keys(anchor.tags).length > 0;
    const mismatch = policy === "canon" ? rows.filter((r) => !canonMatch(r)) : anchorTagged ? rows.filter((r) => tagKey(r.tags) !== tagKey(anchor.tags)) : null;
    regenerate = mismatch ? mismatch.map((r) => r.image) : [];
    stats = { n: rows.length, with_embedding: withVec.length, pruned: 0, threshold, below_threshold: null, bill_basis: mismatch ? "tags" : "none", ...(mismatch ? { tag_mismatches: mismatch.length } : {}) };
  }
  return { policy, basis, anchor: { image: anchor.image, order: anchor.order, sha256: anchor.sha256 }, stats, regenerate, similarities: sims };
}

/** Compare every policy on the same rows, so the cheapest one is visible. */
export function comparePolicies(rows, opts) {
  const out = {};
  for (const policy of ["origin", "terminal", "consensus", "mode", "canon"]) {
    try { const r = chooseAnchor(rows, { ...opts, policy }); out[policy] = { image: r.anchor.image, below_threshold: r.stats.below_threshold, mean_cosine: r.stats.mean_cosine, bill_basis: r.stats.bill_basis, to_redo: r.stats.bill_basis === "none" ? null : r.regenerate.length }; }
    catch (e) { out[policy] = { unavailable: e.message.replace(/^anchor: /, "") }; }
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? "" : argv[i + 1] || ""; };
  const VALUE_FLAGS = new Set(["--policy", "--character", "--threshold", "--prune-outliers", "--registry", "--canon"]);
  const file = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
  let registry = null;
  try { registry = loadRegistry(registryPath(process.argv)); } catch { registry = null; }
  const id = flag("--character");
  const defaults = { ...(registry?.drift_resolution || {}), ...(id && registry?.characters?.[id]?.drift_resolution ? registry.characters[id].drift_resolution : {}) };
  // canon tags: --canon tag=value (repeatable) wins, else the character's declared canon_tags
  const canonFlags = argv.flatMap((a, i) => (a === "--canon" && argv[i + 1] ? [argv[i + 1]] : [])).map((kv) => kv.split(/=(.*)/s)).filter((p) => p[0] && p[1] !== undefined);
  const canon = canonFlags.length ? Object.fromEntries(canonFlags.map(([k, v]) => [k.trim(), v.trim()])) : (id && registry?.characters?.[id]?.canon_tags) || null;
  const source = file || (defaults.embeddings ? path.join(registry._root, defaults.embeddings) : "");
  if (!source) { console.error("usage: node scripts/anchor.mjs <embeddings.jsonl|.json> --policy origin|terminal|consensus|mode|canon [--character <id>] [--canon tag=value ...] [--threshold 0.6] [--prune-outliers 2] [--write] [--json]"); process.exit(2); }
  const raw = fs.readFileSync(source, "utf8");
  const rows = source.endsWith(".jsonl") ? raw.split("\n").filter(Boolean).map((l) => JSON.parse(l)) : (() => { const j = JSON.parse(raw); return Array.isArray(j) ? j : j.rows || j.images || []; })();
  const policy = flag("--policy") || defaults.policy || "consensus";
  const threshold = Number(flag("--threshold") || defaults.pass_threshold || 0.6);
  const pruneZ = Number(flag("--prune-outliers") || defaults.prune_outliers_z || 0);
  let result;
  try { result = chooseAnchor(rows, { policy, threshold, pruneZ, canon }); } catch (e) { console.error(e.message); process.exit(1); }
  const compare = comparePolicies(rows, { threshold, pruneZ, canon });
  const chosenAt = new Date().toISOString();
  const budget = defaults.max_regeneration_budget;
  if (argv.includes("--json")) { console.log(JSON.stringify({ ...result, compare, chosen_at: chosenAt, budget }, null, 2)); }
  else {
    console.log(`anchor: policy ${policy}: ${result.anchor.image} (order ${result.anchor.order}; ${result.basis})`);
    const budgetNote = budget !== undefined ? ` (budget ${budget}${result.regenerate.length > budget ? ": OVER" : ""})` : "";
    const noVec = result.stats.with_embedding ? "the anchor has no embedding" : "none with an embedding";
    if (result.stats.bill_basis === "cosine") console.log(`anchor: ${result.stats.with_embedding} image(s) scored; mean cosine ${result.stats.mean_cosine}, min ${result.stats.min_cosine}; ${result.regenerate.length} below ${threshold} -> regenerate${budgetNote}`);
    else if (result.stats.bill_basis === "tags") console.log(`anchor: ${result.stats.n} image(s), ${noVec}; ${result.stats.tag_mismatches} ${policy === "canon" ? (result.stats.tag_mismatches === 1 ? "does not match canon" : "do not match canon") : (result.stats.tag_mismatches === 1 ? "differs from the anchor's tags" : "differ from the anchor's tags")} -> regenerate (bill by tags, not by similarity)${budgetNote}`);
    else console.log(`anchor: ${result.stats.n} image(s), ${noVec} and no tags on the anchor: no similarity scores and no regeneration list (add tags or embeddings)`);
    for (const img of result.regenerate) console.log(`  regenerate ${img}`);
    const bill = (v) => (v.bill_basis === "cosine" ? `${v.to_redo} to redo` : v.bill_basis === "tags" ? `${v.to_redo} to redo, by tags` : "no scores");
    console.log(`anchor: compare: ${Object.entries(compare).map(([p, v]) => `${p}=${v.unavailable ? "n/a" : `${v.image} (${bill(v)})`}`).join("; ")}`);
  }
  if (argv.includes("--write")) {
    if (!registry || !id || !registry.characters[id]) { console.error(`anchor: --write needs --character <id> that exists in ${registry?._file || "character-registry.json"}`); process.exit(1); }
    const rel = path.relative(registry._root, path.resolve(source));
    const imgAbs = path.resolve(path.dirname(path.resolve(source)), result.anchor.image);
    const sha = result.anchor.sha256 || (fs.existsSync(imgAbs) ? createHash("sha256").update(fs.readFileSync(imgAbs)).digest("hex") : undefined);
    registry.characters[id].anchor = { image: path.isAbsolute(result.anchor.image) ? path.relative(registry._root, result.anchor.image) : path.relative(registry._root, imgAbs), ...(sha ? { sha256: sha } : {}), policy, metric: defaults.metric || "cosine", order: result.anchor.order, chosen_at: chosenAt, embeddings: rel, stats: result.stats, why: result.basis };
    const { _file, _root, ...bare } = registry;
    writeJsonLike(_file, bare, fs.readFileSync(_file, "utf8"));
    console.log(`anchor: recorded characters.${id}.anchor in ${path.relative(process.cwd(), _file)}; next: node scripts/check.mjs`);
  }
}
