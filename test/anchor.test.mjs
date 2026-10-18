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
  assert.equal(cmp.consensus.image, cmp.mode.image, "fewest redraws without embeddings falls back to the most frequent tag combination");
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
  assert.match(r.stdout, /consensus=renders\/ch01-p01\.png \(8 to redo, by tags\)/, "kept tags apply to every policy in the comparison");
  assert.doesNotMatch(r.stdout, /null/);
  fs.writeFileSync(file, '{"image": "a.png", "order": 1}\n{"image": "b.png", "order": 2}\n');
  const n = spawnSync(process.execPath, ["scripts/anchor.mjs", file, "--policy", "origin"], { encoding: "utf8" });
  assert.equal(n.status, 0, n.stderr);
  assert.match(n.stdout, /no tags on the anchor: no similarity scores and no regeneration list/);
  assert.match(n.stdout, /origin=a\.png \(no scores\)/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("keep composes with every policy: only images that keep the tags are eligible, the rest are always billed", () => {
  const keep = { hair: "copper red" };
  const fewest = chooseAnchor(rows, { policy: "consensus", threshold: 0.6, keep });
  assert.match(fewest.anchor.image, /p0[1-3]\.png$/, fewest.anchor.image);
  assert.equal(fewest.regenerate.length, 8);
  assert.equal(fewest.stats.kept, 3);
  assert.equal(fewest.stats.excluded, 8);
  assert.deepEqual(fewest.keep, keep);
  assert.equal(chooseAnchor(rows, { policy: "origin", keep }).anchor.image, "renders/ch01-p01.png");
  assert.equal(chooseAnchor(rows, { policy: "terminal", keep }).anchor.image, "renders/ch01-p03.png", "the last look among what is kept");
  assert.equal(chooseAnchor(rows, { policy: "mode", keep }).regenerate.length, 8);
  assert.deepEqual(chooseAnchor(rows, { policy: "canon", keep }).anchor, fewest.anchor, "canon is keep + fewest redraws");
  const cmp = comparePolicies(rows, { threshold: 0.6, keep });
  for (const p of ["origin", "terminal", "consensus", "mode", "canon"]) assert.equal(cmp[p].to_redo, 8, p + " is compared within what is kept");
  assert.throws(() => chooseAnchor(rows, { policy: "origin", keep: { hair: "green" } }), /no image keeps .*every image has drifted off what must never change/);
  // without embeddings, fewest redraws is the most frequent tag combination among the kept images
  const t = chooseAnchor(tagRows, { policy: "consensus", keep });
  assert.equal(t.anchor.image, "renders/ch01-p01.png");
  assert.equal(t.stats.bill_basis, "tags");
  assert.equal(t.stats.excluded, 8);
  assert.equal(t.regenerate.length, 8);
  assert.throws(() => chooseAnchor([{ image: "a.png" }, { image: "b.png" }], { policy: "consensus" }), /consensus needs embeddings or tags/);
});

test("--prefer speaks the plain names, --keep is repeatable, and the record carries keep and prefer", () => {
  const r = spawnSync(process.execPath, ["scripts/anchor.mjs", "examples/anchor/embeddings.jsonl", "--keep", "hair=copper red", "--prefer", "first-look", "--json"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.equal(j.policy, "origin");
  assert.equal(j.prefer, "first-look");
  assert.equal(j.anchor.image, "renders/ch01-p01.png");
  assert.deepEqual(j.keep, { hair: "copper red" });
  assert.equal(j.regenerate.length, 8);
  const two = spawnSync(process.execPath, ["scripts/anchor.mjs", "examples/anchor/embeddings.jsonl", "--keep", "hair=copper red", "--keep", "jaw=narrow", "--prefer", "fewest-redraws", "--json"], { encoding: "utf8" });
  assert.deepEqual(JSON.parse(two.stdout).keep, { hair: "copper red", jaw: "narrow" });
  const bad = spawnSync(process.execPath, ["scripts/anchor.mjs", "examples/anchor/embeddings.jsonl", "--prefer", "cheapest"], { encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /unknown --prefer cheapest/);
});

test("--ask asks the two questions in plain words and answers in plain words, from piped stdin too", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-ask-"));
  const file = path.join(dir, "tags.jsonl");
  fs.writeFileSync(file, tagRows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const first = spawnSync(process.execPath, ["scripts/anchor.mjs", file, "--ask"], { encoding: "utf8", input: "hair=copper red\n2\n" });
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /What about this character must never change\?/);
  assert.match(first.stdout, /For everything else, which look do you want\?/);
  assert.match(first.stdout, /Keep renders\/ch01-p01\.png as the one true picture of this character\./);
  assert.match(first.stdout, /Redraw 8 pictures: renders\/ch01-p04\.png, .*renders\/ch01-p11-failed\.png\./);
  assert.match(first.stdout, /8 pictures lack what must never change \(hair=copper red\) and are always redrawn\./);
  assert.match(first.stdout, /Counted by your tags, not measured by a model\./);
  assert.match(first.stdout, /If you answered differently: fewest redraws would keep renders\/ch01-p01\.png and redraw 8; the last look would keep renders\/ch01-p03\.png and redraw 8\./);
  const dflt = spawnSync(process.execPath, ["scripts/anchor.mjs", file, "--ask"], { encoding: "utf8", input: "\n\n" });
  assert.equal(dflt.status, 0, dflt.stderr);
  assert.match(dflt.stdout, /Keep renders\/ch01-p04\.png as the one true picture/, "no fixed traits and the default answer: fewest redraws keeps the common look");
  assert.match(dflt.stdout, /Redraw 4 pictures/);
  assert.doesNotMatch(dflt.stdout, /anchor: policy/, "plain words only in --ask mode");
  fs.rmSync(dir, { recursive: true, force: true });
});
