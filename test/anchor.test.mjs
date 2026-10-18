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

const tagRows = rows.map(({ image, order, tags }) => ({ image, order, tags }));

test("with tags and no embeddings the bill is by tags: canon lists every image off canon; mode, origin and terminal list every image whose tags differ from the anchor's", () => {
  const c = chooseAnchor(tagRows, { policy: "canon", canon: { hair: "copper red" } });
  assert.equal(c.anchor.image, "renders/ch01-p01.png");
  assert.equal(c.stats.bill_basis, "tags");
  assert.equal(c.stats.below_threshold, null, "a tag count is never presented as a similarity count");
  assert.equal(c.stats.tag_mismatches, 8);
  assert.deepEqual(c.regenerate, rows.filter((r) => r.tags.hair !== "copper red").map((r) => r.image));
  const m = chooseAnchor(tagRows, { policy: "mode" });
  assert.equal(m.anchor.image, "renders/ch01-p04.png");
  assert.deepEqual(m.regenerate, ["renders/ch01-p01.png", "renders/ch01-p02.png", "renders/ch01-p03.png", "renders/ch01-p11-failed.png"]);
  assert.equal(chooseAnchor(tagRows, { policy: "origin" }).regenerate.length, 8);
  assert.equal(chooseAnchor(tagRows, { policy: "terminal" }).regenerate.length, 10);
  const cmp = comparePolicies(tagRows, { canon: { hair: "copper red" } });
  assert.match(cmp.consensus.unavailable, /needs embeddings/);
  assert.equal(cmp.canon.to_redo, 8);
  assert.equal(cmp.canon.bill_basis, "tags");
  assert.equal(cmp.mode.to_redo, 4);
});

test("with embeddings the bill stays by cosine; with neither embeddings nor tags on the anchor there is no bill", () => {
  assert.equal(chooseAnchor(rows, { policy: "consensus" }).stats.bill_basis, "cosine");
  const bare = chooseAnchor([{ image: "a.png", order: 1 }, { image: "b.png", order: 2 }], { policy: "origin" });
  assert.equal(bare.stats.bill_basis, "none");
  assert.deepEqual(bare.regenerate, []);
  assert.equal(comparePolicies([{ image: "a.png" }, { image: "b.png" }], {}).origin.to_redo, null);
});

test("the CLI reports a tag bill as a tag bill, never as null, and says when there is none", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-anchor-"));
  const file = path.join(dir, "tags.jsonl");
  fs.writeFileSync(file, tagRows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const r = spawnSync(process.execPath, ["scripts/anchor.mjs", file, "--policy", "canon", "--canon", "hair=copper red"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /policy canon: renders\/ch01-p01\.png/);
  assert.match(r.stdout, /none with an embedding; 8 do not match canon -> regenerate \(bill by tags, not by similarity\)/);
  assert.match(r.stdout, /  regenerate renders\/ch01-p04\.png/);
  assert.match(r.stdout, /canon=renders\/ch01-p01\.png \(8 to redo, by tags\)/);
  assert.match(r.stdout, /consensus=n\/a/);
  assert.doesNotMatch(r.stdout, /null/);
  fs.writeFileSync(file, '{"image": "a.png", "order": 1}\n{"image": "b.png", "order": 2}\n');
  const n = spawnSync(process.execPath, ["scripts/anchor.mjs", file, "--policy", "origin"], { encoding: "utf8" });
  assert.equal(n.status, 0, n.stderr);
  assert.match(n.stdout, /no tags on the anchor: no similarity scores and no regeneration list/);
  assert.match(n.stdout, /origin=a\.png \(no scores\)/);
  fs.rmSync(dir, { recursive: true, force: true });
});
