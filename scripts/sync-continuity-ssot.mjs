#!/usr/bin/env node
// What this is: the sync check. It keeps a product repo's copies of bible files the same as one pinned bible version.
// Why it exists: the bible sets the rules and a product repo copies some of its files. A copy can drift with no one
//   seeing it, unless a check looks at it on every change.
// How to use it: run one of these two commands from the product repo's root folder.
//   node scripts/sync-continuity-ssot.mjs --check <manifest.json>
//       Checks each copy against its pinned hash. It needs no bible, so it runs in CI.
//       When CONTINUITY_BIBLE_DIR names a bible checkout, it also checks the pins against the bible.
//   CONTINUITY_BIBLE_DIR=<bible checkout> node scripts/sync-continuity-ssot.mjs --pull <manifest.json> [--ref <commit>] [--migration <file>]
//       Copies each listed file from the bible at one commit, then writes that commit and each hash into the
//       manifest. The default commit is the manifest's track ref. A changed schema needs a migration file.
// Next step: list a new framework file in the manifest's "files", then run --pull. Guide: docs/2-how-to/HOW-TO-SYNC-A-PRODUCT-REPO.md.
//
// The manifest (JSON):
//   bible.commit   the pinned bible commit (written by --pull)
//   bible.track    the bible ref to compare against, such as origin/main (optional)
//   files[]        { source: path in the bible, target: path in the product repo, kind: "schema" | "check" | "doc",
//                    sha256: hash of the pinned file (written by --pull), migration: product-repo file (schemas only) }
// Paths come from the manifest, the command line or the environment, never from this file.
// Env: CONTINUITY_BIBLE_DIR (a bible checkout), CONTINUITY_CONSUMER_ROOT (product repo root; default: current folder).

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
// Git hooks export GIT_DIR and friends; drop them so every git call reads the bible checkout it names.
const GIT_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));

/** Read a file from a git checkout at one commit, as bytes. Returns null when the commit or file is not there. */
function gitShow(dir, ref, file) {
  try {
    return execFileSync("git", ["-C", dir, "show", `${ref}:${file}`], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"], env: GIT_ENV });
  } catch {
    return null;
  }
}

/** Turn a ref (branch, tag, short hash) into a full commit hash. Returns null when it does not resolve. */
function resolveCommit(dir, ref) {
  try {
    return execFileSync("git", ["-C", dir, "rev-parse", "--verify", "--quiet", `${ref}^{commit}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], env: GIT_ENV }).trim() || null;
  } catch {
    return null;
  }
}

/** Load and shape-check a manifest. Throws a plain message naming the fix. */
export function loadManifest(file) {
  if (!fs.existsSync(file)) throw new Error(`no manifest at ${file}. Fix: pass the manifest path, such as --check scripts/continuity-sync.json.`);
  const m = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!m.bible || typeof m.bible !== "object") throw new Error(`${file} has no "bible" block. Fix: add { "bible": { "commit": "", "track": "origin/main" } }.`);
  if (!Array.isArray(m.files) || m.files.length === 0) throw new Error(`${file} lists no "files". Fix: add one entry per bible file you copy.`);
  for (const f of m.files) {
    if (!f.source || !f.target) throw new Error(`${file}: every file needs "source" and "target". Fix the entry ${JSON.stringify(f)}.`);
  }
  return m;
}

/** Find the bible checkout from the environment. Returns null when none is set. Throws when the setting is wrong. */
export function bibleDir(env = process.env) {
  const dir = env.CONTINUITY_BIBLE_DIR;
  if (!dir) return null;
  if (!fs.existsSync(path.join(dir, ".git"))) throw new Error(`CONTINUITY_BIBLE_DIR (${dir}) is not a git checkout of the bible. Fix: point it at one, or unset it to check pinned hashes only.`);
  return dir;
}

/**
 * Check every copy against its pinned hash, and, when a bible checkout is given, the pins against the bible.
 * Returns { ok, lines }. Each line is "[STATUS] target: what it means".
 */
export function check({ manifestPath, root, bible }) {
  const m = loadManifest(manifestPath);
  const lines = [];
  let ok = true;
  const fail = (s) => { ok = false; lines.push(s); };

  if (!m.bible.commit) fail(`[NOT_PINNED] the manifest has no bible.commit. Fix: run --pull once.`);
  for (const f of m.files) {
    const dst = path.join(root, f.target);
    if (!f.sha256) { fail(`[NOT_PINNED] ${f.target}: no sha256 in the manifest. Fix: run --pull.`); continue; }
    if (!fs.existsSync(dst)) { fail(`[MISSING] ${f.target}: the copy is gone. Fix: run --pull, or remove the entry.`); continue; }
    const got = sha256(fs.readFileSync(dst));
    if (got !== f.sha256) fail(`[CHANGED] ${f.target}: the copy differs from the pinned bible version. Fix: make the change in the bible first, then run --pull.`);
    else lines.push(`[OK] ${f.target}`);
    if (f.kind === "schema" && f.migration && !fs.existsSync(path.join(root, f.migration))) {
      fail(`[NO_MIGRATION] ${f.target}: its migration ${f.migration} is missing. Fix: restore it.`);
    }
  }

  if (!bible) {
    lines.push(`[INFO] no bible on this machine (CONTINUITY_BIBLE_DIR unset): checked copies against pinned hashes only.`);
    return { ok, lines };
  }
  if (m.bible.commit && !resolveCommit(bible, m.bible.commit)) {
    fail(`[UNKNOWN_COMMIT] bible commit ${m.bible.commit} is not in ${bible}. Fix: git fetch in the bible, or pin a commit that exists.`);
    return { ok, lines };
  }
  const track = m.bible.track ? resolveCommit(bible, m.bible.track) : null;
  if (m.bible.track && !track) lines.push(`[INFO] bible ref ${m.bible.track} not found here: skipped the "behind" check.`);
  for (const f of m.files) {
    if (!f.sha256 || !m.bible.commit) continue;
    const pinned = gitShow(bible, m.bible.commit, f.source);
    if (!pinned) { fail(`[PIN_MISSING] ${f.source} is not in bible commit ${m.bible.commit}. Fix: pin a commit that has it.`); continue; }
    if (sha256(pinned) !== f.sha256) { fail(`[PIN_WRONG] ${f.source}: its hash at the pinned commit is not the manifest's. Fix: run --pull.`); continue; }
    if (!track || track === m.bible.commit) continue;
    const latest = gitShow(bible, track, f.source);
    if (latest && sha256(latest) === f.sha256) continue;
    if (f.kind === "schema") fail(`[SCHEMA_MOVED] ${f.source} changed in the bible at ${m.bible.track}. Fix: run --pull with --migration <file> in one merge request.`);
    else lines.push(`[BEHIND] ${f.source} changed in the bible at ${m.bible.track}. Run --pull when you want it.`);
  }
  return { ok, lines };
}

/**
 * Copy every listed file from the bible at one commit and pin it. A schema whose hash changes needs a migration file
 * that exists in the product repo; it is recorded on the entry so the pin and the migration move together.
 */
export function pull({ manifestPath, root, bible, ref, migration }) {
  if (!bible) throw new Error(`--pull needs the bible. Fix: set CONTINUITY_BIBLE_DIR to a bible checkout.`);
  const m = loadManifest(manifestPath);
  const want = ref || m.bible.track;
  if (!want) throw new Error(`no commit to pull. Fix: pass --ref <commit>, or set bible.track in the manifest.`);
  const commit = resolveCommit(bible, want);
  if (!commit) throw new Error(`bible ref ${want} does not resolve in ${bible}. Fix: git fetch in the bible, or pass a commit that exists.`);

  const lines = [];
  const staged = [];
  for (const f of m.files) {
    const buf = gitShow(bible, commit, f.source);
    if (!buf) throw new Error(`${f.source} is not in bible commit ${commit.slice(0, 12)}. Fix: land it in the bible first, or remove the entry.`);
    const hash = sha256(buf);
    if (f.kind === "schema" && f.sha256 && f.sha256 !== hash) {
      if (!migration) throw new Error(`${f.source} changed. A schema change moves the pin together with a migration. Fix: write the migration, then pass --migration <file>.`);
      if (!fs.existsSync(path.join(root, migration))) throw new Error(`--migration ${migration} does not exist in ${root}. Fix: write it first.`);
      f.migration = migration;
    }
    staged.push([f, buf, hash]);
  }
  for (const [f, buf, hash] of staged) {
    const dst = path.join(root, f.target);
    const before = fs.existsSync(dst) ? sha256(fs.readFileSync(dst)) : null;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, buf);
    f.sha256 = hash;
    lines.push(`[${before === hash ? "SAME" : before ? "UPDATED" : "ADDED"}] ${f.source} -> ${f.target}`);
  }
  m.bible.commit = commit;
  fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2) + "\n");
  lines.push(`[PINNED] bible commit ${commit}`);
  return { ok: true, lines };
}

/** Command line. Exit 0 when in sync, 1 on any failure, 2 on bad usage. */
function main(argv) {
  const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const mode = argv.includes("--pull") ? "pull" : argv.includes("--check") ? "check" : null;
  const valued = new Set(["--ref", "--migration"]);
  const manifestArg = argv.find((a, i) => !a.startsWith("--") && !valued.has(argv[i - 1]));
  if (!mode || !manifestArg) {
    console.error("usage: node scripts/sync-continuity-ssot.mjs --check <manifest.json>\n       node scripts/sync-continuity-ssot.mjs --pull <manifest.json> [--ref <commit>] [--migration <file>]");
    return 2;
  }
  const root = path.resolve(process.env.CONTINUITY_CONSUMER_ROOT || process.cwd());
  try {
    const bible = bibleDir();
    const opts = { manifestPath: path.resolve(root, manifestArg), root, bible, ref: flag("--ref"), migration: flag("--migration") };
    const { ok, lines } = mode === "pull" ? pull(opts) : check(opts);
    for (const l of lines) console.log(`  ${l}`);
    if (!ok) {
      console.error(`sync-continuity-ssot: FAILED. A copy no longer matches the pinned bible version. Fix each line marked above.`);
      return 1;
    }
    console.log(`sync-continuity-ssot: ${mode === "pull" ? "pulled and pinned" : "in sync with the pinned bible version"}.`);
    return 0;
  } catch (err) {
    console.error(`sync-continuity-ssot: ERROR: ${err.message}`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
