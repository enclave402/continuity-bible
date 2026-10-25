#!/usr/bin/env node
// WHAT THIS IS: the gate for SIG-LOCK-001: no character wears, carries or styles another lead's signature item.
// WHY IT MATTERS (MONEY / SEO / SPEED): the leads are the brand; a borrowed boot or bear on another doll dilutes it.
// HOW TO USE IT (1 LINE): node scripts/check-signature-lock.mjs <config.json>   (config path relative to the repo root)
// WHERE ITS DATA LIVES (COLLOCATION): the config names where each lead's signature_lock lives and what to scan.
// WHERE ITS AUTH LIVES (ENV SSOT): none.
//
// ONE ENGINE, TWO REPOS: this file is byte-identical in the public continuity repo (enclave402/continuity-bible,
// scripts/check-signature-lock.mjs, the source) and in each product repo that vendors it. The config records the
// engine's sha256 under "engine"; a copy whose hash differs fails, so an edit lands in the source first and is copied
// over whole (docs: the public repo's docs/2-how-to/signature-lock.md).
//
// Fails when:
//   1. two leads' items overlap (a shared colour word and one silhouette containing the other): the rule cannot hold;
//   2. a character who is not the owner has wardrobe, hair, props or pack text in which one clause holds both a
//      colour and a silhouette of a locked item;
//   3. an image record mentions a locked prop or companion without its owner's {{token}};
//   4. a known_violations entry no longer occurs (stale: remove it and close its task);
//   5. the config's engine.sha256 does not match this file.
// A known_violations entry (item, where, task, reason) turns a match into a KNOWN line instead of a failure.
// Env (tests): SIG_LOCK_ROOT (repo root), SIG_LOCK_CONFIG (config path, when no argument is given).

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.SIG_LOCK_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONFIG = process.argv[2] || process.env.SIG_LOCK_CONFIG || 'signature-locks.json'
const read = (rel) => JSON.parse(fs.readFileSync(path.resolve(ROOT, rel), "utf8"))
const exists = (rel) => rel && fs.existsSync(path.resolve(ROOT, rel))

/** @param {string} s @returns {string} lower case, hyphens and underscores as spaces, single-spaced. */
const norm = (s) => String(s).toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
/** @param {string} phrase @returns {RegExp} whole-word match of a phrase, tolerating a plural s and hyphen/space variants. */
const phraseRe = (phrase) => new RegExp(`(^|[^a-z])${norm(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}s?([^a-z]|$)`)
/** @param {string} text @returns {string[]} clauses: a lock matches only when colour and silhouette share one. */
const clauses = (text) => norm(text).split(/[,;.()\n]|\bwith\b|\bover\b|\band\b/).map((c) => c.trim()).filter(Boolean)

const config = read(CONFIG)
const registry = read('character-registry.json').characters || {}
/** continuity id or upper-case pack name -> registry id */
const idOf = new Map()
for (const [rid, e] of Object.entries(registry)) {
  idOf.set(rid, rid)
  for (const c of e.continuity_ids || []) idOf.set(c, rid)
  if (e.name) idOf.set(String(e.name).toUpperCase(), rid)
}
const owner = (key) => idOf.get(key) || idOf.get(String(key).toUpperCase()) || key

// ---- 1. collect locks -------------------------------------------------------------------------------------------
const locks = []
for (const src of config.lock_sources || []) {
  if (src.card) {
    if (!exists(src.card)) continue
    for (const [cid, c] of Object.entries(read(src.card).characters || {})) {
      for (const it of c.signature_lock?.items || []) locks.push({ ...it, owner: owner(cid), from: src.card })
    }
  } else if (src.markdown_json) {
    if (!exists(src.markdown_json)) continue
    const md = fs.readFileSync(path.join(ROOT, src.markdown_json), 'utf8')
    for (const block of md.matchAll(/```json\n([\s\S]*?)```/g)) {
      let d; try { d = JSON.parse(block[1]) } catch { continue }
      for (const it of d.signature_lock?.items || []) locks.push({ ...it, owner: src.owner, from: src.markdown_json })
    }
  }
}

const failures = [], known = [], seenKnown = new Set()
const knownList = config.known_violations || []
/** Record a violation unless a known_violations entry covers it. */
function violation(item, where, detail) {
  const k = knownList.find((v) => v.item === item.id && v.where === where)
  if (k) { seenKnown.add(`${k.item}|${k.where}`); known.push(`KNOWN ${item.id} at ${where} (task ${k.task}: ${k.reason})`); return }
  failures.push(`${where}: uses ${item.id} ("${item.desc}", owned by ${item.owner}) — ${detail}. Fix: restyle this character, or record it in known_violations with a task.`)
}

// ---- 2. leads must not overlap each other -------------------------------------------------------------------------
const silOverlap = (a, b) => { const x = norm(a), y = norm(b); return x === y || phraseRe(x).test(y) || phraseRe(y).test(x) }
for (let i = 0; i < locks.length; i++) for (let j = i + 1; j < locks.length; j++) {
  const a = locks[i], b = locks[j]
  if (a.owner === b.owner) continue
  const colours = (a.near_variant?.colour_family || []).filter((c) => (b.near_variant?.colour_family || []).map(norm).includes(norm(c)))
  const sils = (a.near_variant?.silhouette || []).flatMap((s) => (b.near_variant?.silhouette || []).filter((t) => silOverlap(s, t)).map((t) => `${s} ~ ${t}`))
  if (colours.length && sils.length) failures.push(`overlap: ${a.id} (${a.owner}) and ${b.id} (${b.owner}) share colour ${colours.join('/')} and silhouette ${sils.join(', ')}. Fix: narrow one lock to what only its owner wears.`)
}

// ---- 3. scan every non-owner text ---------------------------------------------------------------------------------
const WEAR_KEYS = new Set(['hair_and_makeup', 'outfits', 'props', 'wardrobe', 'garments', 'presentation', 'holds', 'layers'])
/** @returns {string[]} every string under the wardrobe-like keys of an object. */
function wearTexts(obj, inWear = false) {
  if (typeof obj === 'string') return inWear ? [obj] : []
  if (Array.isArray(obj)) return obj.flatMap((x) => wearTexts(x, inWear))
  if (obj && typeof obj === 'object') return Object.entries(obj).flatMap(([k, v]) => (k === 'signature_lock' || k === 'face_lock' ? [] : wearTexts(v, inWear || WEAR_KEYS.has(k))))
  return []
}
/** Test one text against every lock its owner does not hold. */
function scan(who, where, texts) {
  for (const item of locks) {
    if (item.owner === who) continue
    const cols = item.near_variant?.colour_family || [], sils = item.near_variant?.silhouette || []
    for (const t of texts) for (const c of clauses(t)) {
      const col = cols.find((x) => phraseRe(x).test(c)), sil = sils.find((x) => phraseRe(x).test(c))
      if (col && sil) { violation(item, where, `"${c}" (${col} + ${sil})`); return }
    }
  }
}
const scanCfg = config.scan || {}
const cardFiles = new Set((config.lock_sources || []).map((s) => s.card).filter(Boolean))
if (scanCfg.cards_dir && exists(scanCfg.cards_dir)) {
  for (const f of fs.readdirSync(path.join(ROOT, scanCfg.cards_dir))) if (f.endsWith('.json')) cardFiles.add(path.join(scanCfg.cards_dir, f))
}
for (const f of cardFiles) {
  if (!exists(f)) continue
  for (const [cid, c] of Object.entries(read(f).characters || {})) scan(owner(cid), `${f}#characters.${cid}`, wearTexts(c))
}
if (exists(scanCfg.wardrobe_registry)) {
  for (const [cid, c] of Object.entries(read(scanCfg.wardrobe_registry).characters || {})) scan(owner(cid), `${scanCfg.wardrobe_registry}#characters.${cid}`, wearTexts(c))
}
if (exists(scanCfg.moment_packs)) {
  for (const [slug, p] of Object.entries(read(scanCfg.moment_packs).packs || {})) {
    for (const ch of p.characters || []) scan(owner(ch.name), `${scanCfg.moment_packs}#packs.${slug}.${ch.name}`, wearTexts({ presentation: ch.presentation, wardrobe: ch.wardrobe, holds: ch.holds }))
  }
}
// Image records show several dolls at once, so only props and companions are checked there: a locked prop must
// travel with its owner's token.
if (exists(scanCfg.image_records)) {
  // relator-app keeps alt text on the slot records (site-src/images.json "slots"); "images" there is the list of
  // optimized outputs. A repo that keeps records under "images" as a map works too.
  const doc = read(scanCfg.image_records)
  const imgs = { ...(Array.isArray(doc.images) ? {} : doc.images || {}), ...(doc.slots || {}) }
  for (const [slot, rec] of Object.entries(imgs)) {
    const alt = rec?.alt
    if (!alt) continue
    for (const item of locks.filter((l) => l.slot === 'prop')) {
      if (alt.includes(`{{${item.owner}`)) continue
      const cols = item.near_variant?.colour_family || [], sils = item.near_variant?.silhouette || []
      const hit = clauses(alt).find((c) => cols.some((x) => phraseRe(x).test(c)) && sils.some((x) => phraseRe(x).test(c)))
      if (hit) violation(item, `${scanCfg.image_records}#${slot}`, `"${hit}" with no {{${item.owner}}} in the record`)
    }
  }
}

// ---- 5. engine drift -----------------------------------------------------------------------------------------------
if (config.engine?.sha256) {
  const own = crypto.createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex')
  if (own !== config.engine.sha256) failures.push(`engine drift: this file's sha256 is ${own}, the config records ${config.engine.sha256} (source: ${config.engine.source}). Fix: copy the engine whole from the source, then record its sha256 in ${CONFIG}.`)
}

// ---- 4. stale known violations ------------------------------------------------------------------------------------
// An entry whose lock is not on any card yet (its card change has not merged) is pending, not stale: MRs merge in any order.
for (const v of knownList) if (!locks.some((l) => l.id === v.item)) known.push(`PENDING ${v.item} at ${v.where}: no card carries this lock yet (task ${v.task})`)
  else if (!seenKnown.has(`${v.item}|${v.where}`)) failures.push(`stale known_violations entry: ${v.item} at ${v.where} no longer occurs. Fix: remove it from ${CONFIG} and close task ${v.task}.`)

for (const k of known) console.log(k)
if (failures.length) {
  console.error(`check-signature-lock: FAIL (${failures.length})`)
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log(`check-signature-lock: OK (${locks.length} locked items from ${new Set(locks.map((l) => l.owner)).size} leads; ${known.length} known violation(s) tracked)`)
