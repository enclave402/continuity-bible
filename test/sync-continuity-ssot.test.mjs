// What this is: tests for scripts/sync-continuity-ssot.mjs, the pinned-manifest sync between the bible and a product repo.
// Why it exists: the sync is the only thing that keeps copied framework files equal to the bible, so its failures must be proven.
// How to use it: node --test test/sync-continuity-ssot.test.mjs (also part of npm run verify).
// Next step: when the sync gains a rule, add a case here that shows it failing first.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const SCRIPT = path.resolve("scripts/sync-continuity-ssot.mjs");
// Git hooks export GIT_DIR, GIT_INDEX_FILE and friends. A throwaway repo must never inherit them, or its
// init and config land in the real repository (seen 2026-10-30: core.bare=true on this repo).
const CLEAN_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));
const git = (dir, ...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", env: CLEAN_ENV }).trim();

/** A throwaway bible repo with one schema and one check, committed; returns its folder and commit. */
function makeBible() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-bible-"));
  git(dir, "init", "-q");
  git(dir, "config", "user.name", "test");
  git(dir, "config", "user.email", "test@example.com");
  git(dir, "config", "commit.gpgsign", "false");
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.writeFileSync(path.join(dir, "scripts/thing.v1.schema.json"), '{"version":1}\n');
  fs.writeFileSync(path.join(dir, "scripts/check-thing.mjs"), "console.log('ok')\n");
  git(dir, "add", "scripts/thing.v1.schema.json", "scripts/check-thing.mjs");
  git(dir, "commit", "-q", "--no-verify", "-m", "init");
  git(dir, "branch", "-f", "track");
  return { dir, commit: git(dir, "rev-parse", "HEAD") };
}

/** A throwaway product repo holding only a manifest. */
function makeProduct() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-product-"));
  const manifest = {
    _about: "test manifest",
    bible: { commit: "", track: "track" },
    files: [
      { source: "scripts/thing.v1.schema.json", target: "schema/thing.v1.schema.json", kind: "schema" },
      { source: "scripts/check-thing.mjs", target: "scripts/check-thing.mjs", kind: "check" },
    ],
  };
  fs.writeFileSync(path.join(dir, "sync.json"), JSON.stringify(manifest, null, 2));
  return dir;
}

/** Run the sync from the product repo's root, with or without a bible on the machine. */
function run(product, args, bible) {
  const env = { ...CLEAN_ENV, CONTINUITY_CONSUMER_ROOT: product };
  delete env.CONTINUITY_BIBLE_DIR;
  if (bible) env.CONTINUITY_BIBLE_DIR = bible;
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", env, cwd: product });
}

test("pull copies each file, pins the commit and hashes, and check then passes with and without the bible", () => {
  const bible = makeBible();
  const product = makeProduct();
  const p = run(product, ["--pull", "sync.json"], bible.dir);
  assert.equal(p.status, 0, p.stderr + p.stdout);
  const m = JSON.parse(fs.readFileSync(path.join(product, "sync.json"), "utf8"));
  assert.equal(m.bible.commit, bible.commit);
  for (const f of m.files) assert.match(f.sha256, /^[0-9a-f]{64}$/);
  assert.equal(fs.readFileSync(path.join(product, "schema/thing.v1.schema.json"), "utf8"), '{"version":1}\n');

  const offline = run(product, ["--check", "sync.json"]);
  assert.equal(offline.status, 0, offline.stderr + offline.stdout);
  assert.match(offline.stdout, /pinned hashes only/);
  const online = run(product, ["--check", "sync.json"], bible.dir);
  assert.equal(online.status, 0, online.stderr + online.stdout);
});

test("check fails on a deliberately changed copy, even with no bible on the machine", () => {
  const bible = makeBible();
  const product = makeProduct();
  assert.equal(run(product, ["--pull", "sync.json"], bible.dir).status, 0);
  fs.appendFileSync(path.join(product, "scripts/check-thing.mjs"), "// local edit\n");
  const r = run(product, ["--check", "sync.json"]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /\[CHANGED\] scripts\/check-thing\.mjs/);
});

test("check fails when a copy is missing or a manifest was never pulled", () => {
  const bible = makeBible();
  const product = makeProduct();
  const unpinned = run(product, ["--check", "sync.json"]);
  assert.equal(unpinned.status, 1);
  assert.match(unpinned.stdout, /NOT_PINNED/);
  assert.equal(run(product, ["--pull", "sync.json"], bible.dir).status, 0);
  fs.rmSync(path.join(product, "schema/thing.v1.schema.json"));
  const r = run(product, ["--check", "sync.json"]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /\[MISSING\] schema\/thing\.v1\.schema\.json/);
});

test("with the bible present, a schema that moved upstream fails until the pin moves with a migration", () => {
  const bible = makeBible();
  const product = makeProduct();
  assert.equal(run(product, ["--pull", "sync.json"], bible.dir).status, 0);
  fs.writeFileSync(path.join(bible.dir, "scripts/thing.v1.schema.json"), '{"version":1,"added":true}\n');
  git(bible.dir, "commit", "-q", "--no-verify", "-am", "schema change");
  git(bible.dir, "branch", "-f", "track");

  const moved = run(product, ["--check", "sync.json"], bible.dir);
  assert.equal(moved.status, 1);
  assert.match(moved.stdout, /SCHEMA_MOVED/);

  const noMigration = run(product, ["--pull", "sync.json"], bible.dir);
  assert.equal(noMigration.status, 1);
  assert.match(noMigration.stderr, /--migration/);

  fs.mkdirSync(path.join(product, "migrations"));
  fs.writeFileSync(path.join(product, "migrations/thing-v1-added.md"), "Set added on every record.\n");
  const pulled = run(product, ["--pull", "sync.json", "--migration", "migrations/thing-v1-added.md"], bible.dir);
  assert.equal(pulled.status, 0, pulled.stderr + pulled.stdout);
  const m = JSON.parse(fs.readFileSync(path.join(product, "sync.json"), "utf8"));
  assert.equal(m.files[0].migration, "migrations/thing-v1-added.md");
  assert.equal(run(product, ["--check", "sync.json"], bible.dir).status, 0);
});

test("a pin that does not match the bible at the pinned commit fails", () => {
  const bible = makeBible();
  const product = makeProduct();
  assert.equal(run(product, ["--pull", "sync.json"], bible.dir).status, 0);
  const file = path.join(product, "sync.json");
  const m = JSON.parse(fs.readFileSync(file, "utf8"));
  const fake = "0".repeat(64);
  m.files[1].sha256 = fake;
  fs.writeFileSync(file, JSON.stringify(m, null, 2));
  fs.writeFileSync(path.join(product, "scripts/check-thing.mjs"), "");
  const r = run(product, ["--check", "sync.json"], bible.dir);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /PIN_WRONG/);
});

test("usage errors exit 2 and name the fix", () => {
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8", env: CLEAN_ENV });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage/);
});
