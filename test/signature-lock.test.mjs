import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ENGINE = path.resolve("scripts/check-signature-lock.mjs");
const EXAMPLE = path.resolve("examples/signature-lock");

/** Copy the example cast to a temp folder so a case can change it. */
function copyExample() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sig-lock-example-"));
  fs.cpSync(EXAMPLE, dir, { recursive: true });
  return dir;
}

/** Run the engine on a cast folder. */
function run(root) {
  return spawnSync(process.execPath, [ENGINE, "signature-locks.json"], { encoding: "utf8", env: { ...process.env, SIG_LOCK_ROOT: root } });
}

test("the example cast passes: owners and their younger selves use their own items", () => {
  const r = run(EXAMPLE);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /OK \(4 locked items from 3 leads/);
});

test("a pack character in a lead's signature boots fails and names the item", () => {
  const dir = copyExample();
  const p = path.join(dir, "site/packs.json");
  const packs = JSON.parse(fs.readFileSync(p, "utf8"));
  packs.packs["rainy-day"].characters[0].wardrobe = "navy raincoat, Teal knee-high riding boots";
  fs.writeFileSync(p, JSON.stringify(packs));
  const r = run(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /rosa\.footwear\.teal-riding-boots/);
  assert.match(r.stderr, /KAI/);
});

test("a companion in an image record without its owner fails", () => {
  const dir = copyExample();
  const p = path.join(dir, "site/images.json");
  const imgs = JSON.parse(fs.readFileSync(p, "utf8"));
  imgs.slots.shop.alt = "A shopkeeper with a grey plush rabbit on the counter.";
  fs.writeFileSync(p, JSON.stringify(imgs));
  const r = run(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /rosa\.prop\.pip/);
});

test("two leads whose locks overlap fail", () => {
  const dir = copyExample();
  const p = path.join(dir, "cards/dex-story.json");
  const card = JSON.parse(fs.readFileSync(p, "utf8"));
  card.characters.dex.signature_lock.items.push({ id: "dex.footwear.boots", slot: "footwear", desc: "teal riding boots", near_variant: { colour_family: ["teal"], silhouette: ["riding boot"] } });
  fs.writeFileSync(p, JSON.stringify(card));
  const r = run(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /overlap/);
});

test("an engine copy that drifted from the recorded sha256 fails", () => {
  const dir = copyExample();
  const p = path.join(dir, "signature-locks.json");
  const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
  cfg.engine.sha256 = "0".repeat(64);
  fs.writeFileSync(p, JSON.stringify(cfg));
  const r = run(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /engine drift/);
});
