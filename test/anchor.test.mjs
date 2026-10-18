// Run from the repo root: npm test. The anchor policies over the synthetic example set.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chooseAnchor, comparePolicies } from "../scripts/anchor.mjs";

const rows = fs.readFileSync("examples/anchor/embeddings.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const stateB = (img) => /p(0[4-9]|10)\.png$/.test(img);

test("origin and terminal keep the ends of the sequence", () => {
  assert.equal(chooseAnchor(rows, { policy: "origin" }).anchor.image, "renders/ch01-p01.png");
  assert.equal(chooseAnchor(rows, { policy: "terminal" }).anchor.image, "renders/ch01-p11-failed.png");
});

test("consensus picks the image nearest the centroid, which is in the majority state, and lists the rest for regeneration", () => {
  const r = chooseAnchor(rows, { policy: "consensus", threshold: 0.6 });
  assert.ok(stateB(r.anchor.image), r.anchor.image);
  assert.deepEqual(r.regenerate.sort(), ["renders/ch01-p01.png", "renders/ch01-p02.png", "renders/ch01-p03.png", "renders/ch01-p11-failed.png"]);
  assert.equal(r.stats.below_threshold, 4);
});

test("pruning drops the failed render before the centroid is computed", () => {
  const r = chooseAnchor(rows, { policy: "consensus", threshold: 0.6, pruneZ: 1.5 });
  assert.equal(r.stats.pruned, 1);
  assert.ok(stateB(r.anchor.image));
});

test("mode keeps the most frequent tag combination", () => {
  const r = chooseAnchor(rows, { policy: "mode", threshold: 0.6 });
  assert.ok(stateB(r.anchor.image), r.anchor.image);
  assert.match(r.basis, /7 of 11 images/);
});

test("the comparison shows origin is the expensive policy here", () => {
  const c = comparePolicies(rows, { threshold: 0.6 });
  assert.equal(c.origin.below_threshold, 8);
  assert.ok(c.consensus.below_threshold < c.origin.below_threshold);
});

test("canon keeps the declared state even when it is the minority, and says so when nothing matches", () => {
  const r = chooseAnchor(rows, { policy: "canon", threshold: 0.6, canon: { hair: "copper red" } });
  assert.match(r.anchor.image, /p0[1-3]\.png$/, r.anchor.image);
  assert.equal(r.stats.below_threshold, 8, "the price of restoring canon is the drifted majority");
  assert.throws(() => chooseAnchor(rows, { policy: "canon", canon: { hair: "green" } }), /no image matches canon/);
  assert.throws(() => chooseAnchor(rows, { policy: "canon" }), /canon needs the character's canon_tags/);
  const c = comparePolicies(rows, { threshold: 0.6, canon: { hair: "copper red" } });
  assert.ok(c.canon.below_threshold > c.consensus.below_threshold, "canon is dearer than consensus here, and visible as such");
});

test("the CLI reads the registry defaults and refuses --write without a character", () => {
  const r = spawnSync(process.execPath, ["scripts/anchor.mjs", "examples/anchor/embeddings.jsonl"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /policy consensus/);
  const k = spawnSync(process.execPath, ["scripts/anchor.mjs", "examples/anchor/embeddings.jsonl", "--policy", "canon", "--canon", "hair=copper red"], { encoding: "utf8" });
  assert.equal(k.status, 0, k.stderr);
  assert.match(k.stdout, /policy canon: renders\/ch01-p0[1-3]\.png/);
  const w = spawnSync(process.execPath, ["scripts/anchor.mjs", "examples/anchor/embeddings.jsonl", "--write"], { encoding: "utf8" });
  assert.equal(w.status, 1);
  assert.match(w.stderr, /--write needs --character/);
});

test("with hand tags and no embeddings, the CLI picks the anchor and says there are no scores instead of printing null", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-anchor-"));
  const file = path.join(dir, "tags.jsonl");
  fs.writeFileSync(file, rows.map(({ image, order, tags }) => JSON.stringify({ image, order, tags })).join("\n") + "\n");
  const r = spawnSync(process.execPath, ["scripts/anchor.mjs", file, "--policy", "canon", "--canon", "hair=copper red"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /policy canon: renders\/ch01-p01\.png/);
  assert.match(r.stdout, /none with an embedding: no similarity scores/);
  assert.match(r.stdout, /canon=renders\/ch01-p01\.png \(no scores\)/);
  assert.doesNotMatch(r.stdout, /null/);
  assert.match(r.stdout, /consensus=n\/a/);
  fs.rmSync(dir, { recursive: true, force: true });
});
