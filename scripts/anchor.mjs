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
import { registryPath, loadRegistry, writeJsonLike, closestIds, nearbyFiles } from "./lib.mjs";
import { parseJson } from "./names.mjs";

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
const tagKey = (tags) => JSON.stringify(Object.entries(tags || {}).map(([k, v]) => [low(k), low(v)]).sort());
/** A row's value for a trait; the trait's name is compared case-insensitively, so Skin and skin are one trait. */
export const tagOf = (row, k) => { const t = row?.tags; if (!t) return undefined; if (t[k] !== undefined) return t[k]; const hit = Object.keys(t).find((x) => low(x) === low(k)); return hit === undefined ? undefined : t[hit]; };
/** True when the row carries every kept tag with the same value (names and values case-insensitive). A row without tags keeps nothing. */
export const keepsAll = (row, keep) => Boolean(row.tags) && Object.entries(keep || {}).every(([k, v]) => tagOf(row, k) !== undefined && low(tagOf(row, k)) === low(v));
/** The values a person writes when they cannot tell (eyes closed, face turned away). Default "unknown"; the registry's
 *  drift_resolution.unreadable or --unreadable a,b replaces it. Never part of the engine's vocabulary beyond this default. */
export const DEFAULT_UNREADABLE = ["unknown"];
/** For one row against the kept tags: "keeps" (every kept tag readable and equal), "cannot-tell" (none differs, at least one is
 *  unreadable) or "off" (a kept tag is missing or readably different). Cannot-tell is never drift: such a row is not eligible
 *  to be the anchor and is not billed for the kept tags. */
export function keepState(row, keep, unreadable = DEFAULT_UNREADABLE) {
  const u = new Set(unreadable.map(low));
  let unsure = false;
  for (const [k, v] of Object.entries(keep || {})) {
    const have = tagOf(row, k);
    if (have === undefined) return "off";
    if (u.has(low(have))) { unsure = true; continue; }
    if (low(have) !== low(v)) return "off";
  }
  return unsure ? "cannot-tell" : "keeps";
}
/**
 * Read an answer to "what must never change": traits like skin=dark brown or skin: dark brown, separated by commas,
 * semicolons, new lines, or " and " when another trait follows ("skin=dark brown and hair=two puffs"; "hair=salt and pepper"
 * stays one value). A trait's name is lower-cased; its value is kept as typed (values are compared case-insensitively).
 * Returns { keep, unread, none }: the traits, the pieces that are not a trait (said back to the person, never guessed at),
 * and whether the answer was "none".
 */
export function readKeep(text) {
  const keep = {}, unread = [];
  let none = false;
  const pieces = String(text || "").split(/[,;\n]|\s+and\s+(?=[^=:,;\n]+[=:])/i).map((p) => p.trim()).filter(Boolean);
  for (const p of pieces) {
    if (/^(none|nothing)$/i.test(p)) { none = true; continue; }
    const at = p.includes("=") ? p.indexOf("=") : p.indexOf(":");
    const k = at > 0 ? p.slice(0, at).trim().toLowerCase() : "";
    const v = at > 0 ? p.slice(at + 1).trim() : "";
    if (k && v) keep[k] = v; else unread.push(p);
  }
  return { keep, unread, none };
}
/** "tag=value, tag: value" -> { tag: value }; "none" or empty -> {}. Pieces that are not a trait are dropped (use readKeep to see them). */
export const parseKeep = (text) => readKeep(text).keep;
/** Read an answer to "which look": 1 or fewest redraws, 2 or the first look, 3 or the last look. null when it is none of those, or more than one. */
export function readLook(text) {
  const t = String(text || "").toLowerCase();
  const hits = new Set();
  if (/(^|\D)1(\D|$)(?!st)|fewest|least|few\b/.test(t) && !/\b1st\b/.test(t)) hits.add("consensus");
  if (/(^|\D)2(\D|$)|first|\b1st\b/.test(t)) hits.add("origin");
  if (/(^|\D)3(\D|$)|last|latest/.test(t)) hits.add("terminal");
  return hits.size === 1 ? [...hits][0] : null;
}

/**
 * Choose an anchor from rows. Pure: no files, no registry.
 * keep: { tag: value } that must never change; only rows carrying all of them are eligible, the rest are always billed.
 * canon: the alias's tags, used only when policy is "canon" and keep is not given (policy canon = keep + consensus).
 */
export function chooseAnchor(rowsIn, { policy = "consensus", threshold = 0.6, pruneZ = 0, canon = null, keep = null, unreadable = DEFAULT_UNREADABLE } = {}) {
  const unread = new Set((unreadable || []).map(low));
  // two looks differ when a tag both readably carry differs; a value one side could not read never counts as a difference
  const sameLook = (a, b) => { for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) { const x = a?.[k], y = b?.[k]; if (x !== undefined && unread.has(low(x))) continue; if (y !== undefined && unread.has(low(y))) continue; if (x === undefined || y === undefined || low(x) !== low(y)) return false; } return true; };
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
  const stateOf = (r) => (fixed ? keepState(r, fixed, [...unread]) : "keeps");
  const eligible = rows.filter((r) => stateOf(r) === "keeps");
  const excluded = rows.filter((r) => stateOf(r) === "off");
  const cannotTell = rows.filter((r) => stateOf(r) === "cannot-tell");
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
  const base = { n: rows.length, with_embedding: rows.filter((r) => r.embedding).length, pruned: pruned.length, threshold, ...(fixed ? { kept: eligible.length, excluded: excluded.length, cannot_tell: cannotTell.length } : {}) };
  let regenerate, stats;
  if (sims.length) {
    const below = new Set(sims.filter((s) => s.cosine < threshold).map((s) => s.image));
    regenerate = rows.filter((r) => excludedSet.has(r.image) || below.has(r.image)).map((r) => r.image);
    stats = { ...base, mean_cosine: +mean(sims.map((s) => s.cosine)).toFixed(4), min_cosine: +Math.min(...sims.map((s) => s.cosine)).toFixed(4), below_threshold: below.size, bill_basis: "cosine" };
  } else {
    // no similarity scores (hand tags, no model): eligible images whose tags differ from the anchor's are billed, an untagged
    // image included (nothing shows it matches). No tags on the anchor and nothing kept: no bill.
    const anchorTagged = Boolean(anchor.tags) && Object.keys(anchor.tags).length > 0;
    const differ = new Set(anchorTagged ? [...eligible, ...cannotTell].filter((r) => !sameLook(r.tags, anchor.tags)).map((r) => r.image) : []);
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

// run as a command (also through a symlinked folder): compare real paths, not the spelling of argv[1]
const isMain = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url)); } catch { return false; } })();
// The --ask reader holds stdin open. On a piped stdin that ends by itself; on a terminal it never does, so the command would
// print its last line and then wait for Ctrl-C. Close it when main() ends, whichever way it ends.
let askReader = null;
if (isMain) main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => askReader?.close());

async function main() {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? "" : argv[i + 1] || ""; };
  const VALUE_FLAGS = new Set(["--policy", "--prefer", "--character", "--threshold", "--prune-outliers", "--registry", "--canon", "--keep", "--unreadable"]);
  const file = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
  let registry = null;
  const registryFile = registryPath(process.argv);
  try { registry = loadRegistry(registryFile); }
  catch (e) { if (fs.existsSync(registryFile)) { console.error(e.message); process.exit(1); } registry = null; }
  const id = flag("--character");
  const entry = id ? registry?.characters?.[id] : null;
  if (id && !entry) {
    const ids = Object.keys(registry?.characters || {});
    const near = closestIds(id, ids);
    console.error(registry
      ? `anchor: there is no character "${id}" in ${path.basename(registry._file)}. ${near.length ? `Did you mean ${near.join(" or ")}? ` : ""}Fix: use the id exactly as the registry writes it${ids.length ? ` (${ids.join(", ")})` : ""}`
      : `anchor: --character ${id} needs a character-registry.json in this folder. Fix: cd into your story folder first`);
    process.exit(1);
  }
  const defaults = { ...(registry?.drift_resolution || {}), ...(entry?.drift_resolution || {}) };
  // the words a person writes when they cannot tell: --unreadable a,b wins, else the registry's, else the default
  const unreadable = flag("--unreadable") ? flag("--unreadable").split(",").map((v) => v.trim()).filter(Boolean) : defaults.unreadable || DEFAULT_UNREADABLE;
  // question 1: --keep tag=value (repeatable; --canon is its alias) wins, else the character's canon_tags
  const keepFlags = argv.flatMap((a, i) => ((a === "--keep" || a === "--canon") && argv[i + 1] ? [argv[i + 1]] : []));
  let keep = keepFlags.length ? parseKeep(keepFlags.join(",")) : entry?.canon_tags || null;
  // question 2: --prefer (plain names) or --policy (developer names); the registry's drift_resolution supplies the default
  const preferFlag = flag("--prefer") || (flag("--policy") ? "" : defaults.prefer || "");
  if (preferFlag && !PREFER[preferFlag]) { console.error(`anchor: unknown --prefer ${preferFlag} (${Object.keys(PREFER).join(", ")})`); process.exit(2); }
  let policy = flag("--policy") || (preferFlag ? PREFER[preferFlag] : "") || defaults.policy || "consensus";
  const source = file || (defaults.embeddings ? path.join(registry._root, defaults.embeddings) : "");
  if (!source) { console.error("usage: node scripts/anchor.mjs <embeddings.jsonl|.json> [--character <id>] [--ask] [--keep tag=value ...] [--prefer fewest-redraws|first-look|last-look|most-common] [--policy origin|terminal|consensus|mode|canon] [--canon tag=value ...] [--threshold 0.6] [--prune-outliers 2] [--write] [--json]"); process.exit(2); }
  if (!fs.existsSync(source)) { const near = nearbyFiles(source); console.error(`anchor: ${source} is not in this folder.${near.length ? ` There is ${near.map((n) => `"${n}"`).join(" and ")} here: rename it to ${path.basename(source)}.` : " Fix: check the file name (capital letters count) and run the command from the folder that holds it"}`); process.exit(1); }
  const raw = fs.readFileSync(source, "utf8");
  let rows;
  try {
    rows = source.endsWith(".jsonl")
      ? raw.split("\n").map((l, i) => [l, i + 1]).filter(([l]) => l.trim()).map(([l, n]) => parseJson(l, source, n))
      : (() => { const j = parseJson(raw, source); return Array.isArray(j) ? j : j.rows || j.images || []; })();
  } catch (e) { console.error(e.message); process.exit(1); }
  const threshold = Number(flag("--threshold") || defaults.pass_threshold || 0.6);
  const pruneZ = Number(flag("--prune-outliers") || defaults.prune_outliers_z || 0);
  const budget = defaults.max_regeneration_budget;
  const ask = argv.includes("--ask");
  let write = argv.includes("--write");
  const name = entry?.name || "this character";
  const pairs = (m) => Object.entries(m || {}).map(([k, v]) => `${k}=${v}`).join(", ");
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  // what the tags actually say, trait by trait: to check an answer against, and to explain why nothing keeps it
  const seen = new Map();
  for (const r of rows) for (const [k, v] of Object.entries(r.tags || {})) { const kk = low(k), vv = low(v); if (!seen.has(kk)) seen.set(kk, new Map()); const m = seen.get(kk); m.set(vv, { shown: String(v), count: (m.get(vv)?.count || 0) + 1 }); }
  const tagsSay = (k) => { const m = seen.get(low(k)); return m ? [...m.values()].map((x) => `${low(k)}=${x.shown} (${plural(x.count, "picture")})`).join(", ") : ""; };
  const mismatches = (kp) => Object.entries(kp || {}).flatMap(([k, v]) => {
    const m = seen.get(low(k));
    if (!m) return [`no picture's tags have a trait called "${k}"; the traits in your tags are ${[...seen.keys()].join(", ") || "none yet"}`];
    if (!m.has(low(v))) return [`no picture's tags say ${low(k)}=${v}; your tags say ${tagsSay(k)}`];
    return [];
  });

  let question = null;
  if (ask) {
    // the two questions, in plain words, on the terminal; piped answers work too
    const rl = askReader = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    const lines = rl[Symbol.asyncIterator]();
    // null when the input has ended (Ctrl-D, or a pipe with no answers left): the default is used and said
    question = async (prompt) => { process.stdout.write(prompt); const { value, done } = await lines.next(); if (!process.stdin.isTTY) process.stdout.write("\n"); return done ? null : String(value); };
    const fromRegistry = keep && Object.keys(keep).length ? keep : null;
    console.log(`What about ${name} must never change? Type each trait like skin=dark brown, with commas between them.`);
    if (fromRegistry) console.log(`  The registry says: ${pairs(fromRegistry)}. Press Enter to keep that, or type the whole list you want instead.`);
    else console.log("  Press Enter if nothing has to stay the same.");
    let warned = null;
    for (let tries = 1; ; tries++) {
      const a1 = await question("> ");
      const said = a1 === null ? "" : a1.trim();
      const r = readKeep(said);
      if (said && r.unread.length && tries < 5) { console.log(`  I could not read: ${r.unread.join("; ")}. Type each trait like skin=dark brown, with commas between them, or press Enter to keep ${fromRegistry ? "what the registry says" : "nothing fixed"}.`); continue; }
      const candidate = said ? (Object.keys(r.keep).length ? r.keep : null) : fromRegistry;
      // a trait or value that no picture's tags have is usually a typo; say what the tags have, and accept it if typed again
      const probs = mismatches(candidate);
      if (probs.length && a1 !== null && said !== warned && tries < 5) {
        warned = said;
        for (const p of probs) console.log(`  Check this: ${p}.`);
        console.log(`  Type it the way your tags say it, or ${said ? "type the same answer again" : "press Enter again"} to keep it anyway.`);
        continue;
      }
      if (!said) { keep = fromRegistry; break; }
      keep = candidate;
      const dropped = fromRegistry && keep ? Object.keys(fromRegistry).filter((k) => !Object.keys(keep).some((x) => low(x) === low(k))) : [];
      if (dropped.length) console.log(`  That replaces the registry's list, so ${dropped.map((k) => `${k}=${fromRegistry[k]}`).join(", ")} is not kept this time.`);
      break;
    }
    console.log(`  Using: ${keep ? pairs(keep) : "nothing fixed"}.`);
    console.log("For everything else, which look do you want?");
    console.log("  1. fewest redraws (default)");
    console.log("  2. the first look");
    console.log("  3. the last look");
    for (let tries = 1; ; tries++) {
      const a2 = await question("> ");
      if (a2 === null || !a2.trim()) { policy = "consensus"; break; }
      const picked = readLook(a2);
      if (picked) { policy = picked; break; }
      if (tries >= 5) { policy = "consensus"; break; }
      console.log(`  I did not understand "${a2.trim()}". Type 1, 2 or 3, or press Enter for fewest redraws.`);
    }
    console.log(`  Using: ${PLAIN[policy]}.`);
  }
  if (keep && !Object.keys(keep).length) keep = null;
  // policy canon with kept tags is keep + fewest redraws; the alias keeps its name in the report
  let result;
  try { result = chooseAnchor(rows, { policy, threshold, pruneZ, keep, canon: policy === "canon" ? keep : null, unreadable }); }
  catch (e) {
    const theySay = Object.keys(keep || {}).map(tagsSay).filter(Boolean).join("; ");
    if (ask && /drifted off/.test(e.message)) console.error(`None of the pictures has what must never change (${pairs(keep)}).${theySay ? ` Your tags say: ${theySay}.` : ""} If your tags mean the same thing, write it the same way in both places. If the pictures really drifted, paste the prompt sheet again, tag the new pictures, and ask again.`);
    else console.error(`${e.message}${/drifted off/.test(e.message) && theySay ? `. Your tags say: ${theySay}` : ""}`);
    process.exit(1);
  }
  const compare = comparePolicies(rows, { threshold, pruneZ, keep, canon: keep, unreadable });
  const chosenAt = new Date().toISOString();
  const prefer = Object.keys(PREFER).find((k) => PREFER[k] === result.method);
  const over = budget !== undefined && result.regenerate.length > budget;

  if (argv.includes("--json")) console.log(JSON.stringify({ ...result, prefer, compare, chosen_at: chosenAt, budget }, null, 2));
  else if (ask) {
    console.log(`Keep ${result.anchor.image} as the one true picture of ${name}.`);
    if (!fs.existsSync(path.resolve(path.dirname(path.resolve(source)), result.anchor.image))) console.log(`  Note: ${result.anchor.image} is not in this folder. Check the picture's file name and its ending (.png, .jpg, .webp); the tags file must use exactly the same name.`);
    if (result.regenerate.length) console.log(`Redraw ${plural(result.regenerate.length, "picture")}: ${result.regenerate.join(", ")}.`);
    else console.log("Nothing to redraw.");
    if (result.keep && result.stats.excluded) console.log(`  ${plural(result.stats.excluded, "picture")} ${result.stats.excluded === 1 ? "lacks" : "lack"} what must never change (${pairs(result.keep)}) and ${result.stats.excluded === 1 ? "is" : "are"} always redrawn.`);
    if (result.keep && result.stats.cannot_tell) console.log(`  ${plural(result.stats.cannot_tell, "picture")} could not be judged on that (tagged ${unreadable.join(" or ")}); ${result.stats.cannot_tell === 1 ? "it is" : "they are"} not counted as drift.`);
    if (result.stats.bill_basis === "tags") console.log("  Counted by your tags, not measured by a model.");
    if (over) console.log(`  That is over your budget of ${budget}.`);
    const others = ["consensus", "origin", "terminal"].filter((p) => p !== result.method).map((p) => { const v = compare[p]; return v.unavailable ? `${PLAIN[p]} is not possible here (${v.unavailable})` : `${PLAIN[p]} would keep ${v.image} and redraw ${v.to_redo ?? "?"}`; });
    console.log(`If you answered differently: ${others.join("; ")}.`);
    if (id && entry && !write) {
      const missing = !fs.existsSync(path.resolve(path.dirname(path.resolve(source)), result.anchor.image));
      console.log(missing
        ? `Record this as ${name}'s anchor anyway? Its picture, ${result.anchor.image}, is not in this folder, so fix its name first if you can. Type y and press Enter to record it, or just press Enter to skip.`
        : `Record this as ${name}'s anchor in the registry? Type y and press Enter to record it, or just press Enter to skip.`);
      const a3 = ((await question("> ")) || "").trim().toLowerCase();
      write = /^y/.test(a3);
      if (!write) console.log("Not recorded. Ask again when you have decided, or add --write to the command.");
    }
  } else {
    console.log(`anchor: policy ${result.policy}: ${result.anchor.image} (order ${result.anchor.order}; ${result.basis})`);
    if (result.keep) console.log(`anchor: keep ${JSON.stringify(result.keep)}: ${result.stats.kept} of ${result.stats.n} image(s) keep it; ${result.stats.excluded} ${result.stats.excluded === 1 ? "does not and is" : "do not and are"} always on the bill`);
    if (result.keep && result.stats.cannot_tell) console.log(`anchor: ${result.stats.cannot_tell} image(s) could not be judged on the kept tags (${unreadable.join(", ")}): not eligible as the anchor, not billed for the kept tags`);
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
    if (!fs.existsSync(imgAbs) && !ask) console.log(`anchor: warning: the anchor picture ${result.anchor.image} is not on disk here, so no fingerprint is recorded. Check the file name and its ending (.png, .jpg, .webp); the tags file must use exactly the same name`);
    entry.anchor = { image: path.isAbsolute(result.anchor.image) ? path.relative(registry._root, result.anchor.image) : path.relative(registry._root, imgAbs), ...(sha ? { sha256: sha } : {}), policy: result.policy, prefer, ...(result.keep ? { keep: result.keep } : {}), metric: defaults.metric || "cosine", order: result.anchor.order, chosen_at: chosenAt, embeddings: rel, stats: result.stats, why: result.basis };
    const { _file, _root, ...bare } = registry;
    writeJsonLike(_file, bare, fs.readFileSync(_file, "utf8"));
    if (ask) console.log(`Recorded in ${path.relative(process.cwd(), _file)}. Next time, attach ${result.anchor.image} to your chatbot message and paste the picture prompt.`);
    else console.log(`anchor: recorded characters.${id}.anchor in ${path.relative(process.cwd(), _file)}; next: node scripts/check.mjs`);
  }
}
