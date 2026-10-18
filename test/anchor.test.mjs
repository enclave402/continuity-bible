// Run from the repo root: npm test. The anchor policies over the synthetic example set.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
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

test("a kept tag the person could not read is never drift: not eligible, not billed for it", async () => {
  const { chooseAnchor, keepState } = await import("../scripts/anchor.mjs");
  const tagged = [
    { image: "a.png", order: 1, tags: { eyes: "amber-brown", skin: "olive" } },
    { image: "b.png", order: 2, tags: { eyes: "amber-brown", skin: "olive" } },
    { image: "c.png", order: 3, tags: { eyes: "unknown", skin: "olive" } },
    { image: "d.png", order: 4, tags: { eyes: "grey", skin: "olive" } },
    { image: "e.png", order: 5, tags: { eyes: "unknown", skin: "golden-brown" } },
  ];
  assert.equal(keepState(tagged[2], { eyes: "amber-brown" }), "cannot-tell");
  assert.equal(keepState(tagged[3], { eyes: "amber-brown" }), "off");
  const r = chooseAnchor(tagged, { policy: "consensus", keep: { eyes: "amber-brown" } });
  assert.match(r.anchor.image, /^[ab]\.png$/);
  assert.equal(r.stats.cannot_tell, 2);
  assert.deepEqual(r.regenerate, ["d.png", "e.png"], "grey eyes are drift; closed eyes are not, but a different skin still is");
  const custom = chooseAnchor(tagged.map((t) => (t.tags.eyes === "unknown" ? { ...t, tags: { ...t.tags, eyes: "closed" } } : t)), { policy: "consensus", keep: { eyes: "amber-brown" }, unreadable: ["closed"] });
  assert.equal(custom.stats.cannot_tell, 2, "the registry's own word for cannot-tell works the same");
});

test("sheet.mjs writes one page agreeing with the anchor report, with the replacement record as pairs", async () => {
  const { spawnSync } = await import("node:child_process");
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-sheet-")), "sheet.html");
  const r = spawnSync(process.execPath, ["scripts/sheet.mjs", "examples/anchor/embeddings.jsonl", "--out", out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const html = fs.readFileSync(out, "utf8");
  const a = spawnSync(process.execPath, ["scripts/anchor.mjs", "examples/anchor/embeddings.jsonl", "--json"], { encoding: "utf8" });
  const report = JSON.parse(a.stdout);
  assert.match(html, new RegExp(`class="card anchor"><img[^>]+alt="${report.anchor.image.replace(/[.]/g, "\\.")}"`));
  assert.equal((html.match(/class="card redraw"/g) || []).length + (html.match(/class="card replaced"/g) || []).length, report.regenerate.length);
  assert.match(html, /Replaced so far/);
  assert.doesNotMatch(html, /<script/i, "a static page: no scripts");
});

// --ask on a real terminal: the answers arrive on a stdin that stays open, as a terminal's does. The tests above feed `input:`,
// which ends stdin and lets the process exit whether or not it closes its reader; that is how a hang once shipped unseen.
function askOnOpenStdin({ args, answers, files }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-ask-open-"));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.resolve("scripts/anchor.mjs"), ...args], { cwd: dir, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    let exited = false;
    const timer = setTimeout(() => { if (!exited) child.kill("SIGKILL"); }, 4000);
    child.on("exit", (code) => {
      exited = true;
      clearTimeout(timer);
      resolve({ exitedByItself: code !== null && !child.killed, code, out, err, dir });
    });
    child.stdin.write(answers);   // deliberately no child.stdin.end(): a terminal does not end its input after the last answer
  });
}
const askRegistry = JSON.stringify({ registry_version: 1, characters: { "june-okafor": { name: "June", kind: "person", story: "s", role: "r", prose_only: true, canon_tags: { skin: "dark brown" } } } });
const askTags = [
  { image: "renders/a.png", order: 1, tags: { skin: "dark brown", hair: "two puffs" } },
  { image: "renders/b.png", order: 2, tags: { skin: "dark brown", hair: "loose curls" } },
  { image: "renders/c.png", order: 3, tags: { skin: "dark brown", hair: "loose curls" } },
].map((r) => JSON.stringify(r)).join("\n") + "\n";
const askFiles = { "character-registry.json": askRegistry, "tags.jsonl": askTags };

test("--ask returns the prompt on its own when stdin stays open, on every exit path", async () => {
  const paths = await Promise.all([
    askOnOpenStdin({ args: ["tags.jsonl", "--character", "june-okafor", "--ask"], answers: "\n\nn\n", files: askFiles }),
    askOnOpenStdin({ args: ["tags.jsonl", "--character", "june-okafor", "--ask"], answers: "\n\ny\n", files: askFiles }),
    askOnOpenStdin({ args: ["tags.jsonl", "--character", "june-okafor", "--ask", "--write"], answers: "\n\n", files: askFiles }),
    askOnOpenStdin({ args: ["tags.jsonl", "--ask"], answers: "\n\n", files: askFiles }),
  ]);
  const [decline, record, writeFlag, noCharacter] = paths;
  assert.ok(decline.exitedByItself, "declining to record must end the command\n" + decline.out + decline.err);
  assert.match(decline.out, /Not recorded\./);
  assert.ok(record.exitedByItself, "recording must end the command\n" + record.out + record.err);
  assert.match(record.out, /Recorded in character-registry\.json/);
  assert.ok(JSON.parse(fs.readFileSync(path.join(record.dir, "character-registry.json"), "utf8")).characters["june-okafor"].anchor, "the anchor was written");
  assert.ok(writeFlag.exitedByItself, "--write skips the third question and must still end the command\n" + writeFlag.out + writeFlag.err);
  assert.ok(noCharacter.exitedByItself, "no --character means no third question and must still end the command\n" + noCharacter.out + noCharacter.err);
  assert.equal(decline.code + record.code + writeFlag.code + noCharacter.code, 0);
  for (const p of paths) fs.rmSync(p.dir, { recursive: true, force: true });
});

// What a beginner types at the two questions: read it, or say what could not be read and ask again; never guess silently.
test("readKeep reads colons, any capital letters and 'and' between traits, and hands back what is not a trait", async () => {
  const { readKeep, readLook, keepsAll } = await import("../scripts/anchor.mjs");
  assert.deepEqual(readKeep("skin: dark brown, hair: two puffs").keep, { skin: "dark brown", hair: "two puffs" });
  assert.deepEqual(readKeep("Skin=Dark Brown").keep, { skin: "Dark Brown" });
  assert.deepEqual(readKeep("skin=dark brown and hair=two puffs").keep, { skin: "dark brown", hair: "two puffs" });
  assert.deepEqual(readKeep("hair=salt and pepper").keep, { hair: "salt and pepper" }, "an 'and' inside a value stays");
  assert.deepEqual(readKeep("time=10:30").keep, { time: "10:30" }, "the first = wins over a colon in the value");
  assert.deepEqual(readKeep("dark brown skin and two puffs").unread, ["dark brown skin and two puffs"]);
  assert.equal(readKeep("none").none, true);
  assert.ok(keepsAll({ tags: { skin: "dark brown" } }, { Skin: "Dark Brown" }), "trait names match whatever their case");
  for (const [a, want] of [["1", "consensus"], ["fewest redraws", "consensus"], ["2", "origin"], ["the first look", "origin"], ["1st", "origin"], ["3", "terminal"], ["the last one", "terminal"], ["first or last", null], ["12", null], ["yes", null]]) assert.equal(readLook(a), want, a);
});

test("--ask says back what it will use, re-asks what it cannot read, and says when a typed list replaces the registry's", async () => {
  const [colon, unreadable, words, capital, replace] = await Promise.all([
    askOnOpenStdin({ args: ["tags.jsonl", "--ask"], answers: "skin: dark brown, hair: two puffs\n\n", files: askFiles }),
    askOnOpenStdin({ args: ["tags.jsonl", "--ask"], answers: "dark brown skin and two puffs\nhair=two puffs\n\n", files: askFiles }),
    askOnOpenStdin({ args: ["tags.jsonl", "--ask"], answers: "\nthe first look\n", files: askFiles }),
    askOnOpenStdin({ args: ["tags.jsonl", "--ask"], answers: "Skin=Dark Brown\n\n", files: askFiles }),
    askOnOpenStdin({ args: ["tags.jsonl", "--character", "june-okafor", "--ask"], answers: "hair=two puffs\n\n\n", files: askFiles }),
  ]);
  assert.match(colon.out, /Using: skin=dark brown, hair=two puffs\./);
  assert.match(colon.out, /Keep renders\/a\.png as the one true picture/, "the colon answer is used, so only the two-puffs picture is eligible");
  assert.match(unreadable.out, /I could not read: dark brown skin and two puffs\. Type each trait like skin=dark brown/);
  assert.match(unreadable.out, /Using: hair=two puffs\./, "the second, readable answer is used");
  assert.match(words.out, /Using: the first look\./);
  assert.match(words.out, /Keep renders\/a\.png/);
  assert.match(capital.out, /Using: skin=Dark Brown\./);
  assert.doesNotMatch(capital.out, /None of the pictures/, "a capital letter in a trait's name is not drift");
  assert.match(replace.out, /The registry says: skin=dark brown\. Press Enter to keep that, or type the whole list you want instead\./);
  assert.match(replace.out, /That replaces the registry's list, so skin=dark brown is not kept this time\./);
  assert.match(replace.out, /Record this as June's anchor anyway\? Its picture, renders\/a\.png, is not in this folder, so fix its name first if you can\./, "this fixture has no pictures on disk, so the record question says so");
  for (const r of [colon, unreadable, words, capital, replace]) { assert.ok(r.exitedByItself, r.out + r.err); fs.rmSync(r.dir, { recursive: true, force: true }); }
});

test("when the answers run out, --ask uses the defaults and says so; a missing anchor picture is pointed out", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-ask-eof-"));
  for (const [n, t] of Object.entries(askFiles)) fs.writeFileSync(path.join(dir, n), t);
  const r = spawnSync(process.execPath, [path.resolve("scripts/anchor.mjs"), "tags.jsonl", "--character", "june-okafor", "--ask"], { cwd: dir, encoding: "utf8", input: "" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Using: skin=dark brown\./);
  assert.match(r.stdout, /Using: fewest redraws\./);
  assert.match(r.stdout, /Note: renders\/b\.png is not in this folder\. Check the picture's file name and its ending/);
  assert.match(r.stdout, /Not recorded\./);
  fs.mkdirSync(path.join(dir, "renders"));
  for (const n of ["a", "b", "c"]) fs.writeFileSync(path.join(dir, "renders", `${n}.png`), n);
  const ok = spawnSync(process.execPath, [path.resolve("scripts/anchor.mjs"), "tags.jsonl", "--character", "june-okafor", "--ask"], { cwd: dir, encoding: "utf8", input: "\n\n\n" });
  assert.doesNotMatch(ok.stdout, /is not in this folder/, "no note when the picture is there");
  assert.match(ok.stdout, /Record this as June's anchor in the registry\? Type y and press Enter to record it, or just press Enter to skip\./);
  const w = spawnSync(process.execPath, [path.resolve("scripts/anchor.mjs"), "tags.jsonl", "--character", "june-okafor", "--prefer", "fewest-redraws", "--write"], { cwd: dir, encoding: "utf8" });
  assert.doesNotMatch(w.stdout, /warning/);
  fs.rmSync(path.join(dir, "renders"), { recursive: true });
  const w2 = spawnSync(process.execPath, [path.resolve("scripts/anchor.mjs"), "tags.jsonl", "--character", "june-okafor", "--prefer", "fewest-redraws", "--write"], { cwd: dir, encoding: "utf8" });
  assert.match(w2.stdout, /anchor: warning: the anchor picture renders\/b\.png is not on disk here, so no fingerprint is recorded/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a broken tags line or registry is reported with the file, the real line and a plain cause, never ignored", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-bad-json-"));
  for (const [n, t] of Object.entries(askFiles)) fs.writeFileSync(path.join(dir, n), t);
  fs.writeFileSync(path.join(dir, "tags.jsonl"), askTags.split("\n").map((l, i) => (i === 1 ? l.replace('"loose curls"', '"loose curls') : l)).join("\n"));
  const t = spawnSync(process.execPath, [path.resolve("scripts/anchor.mjs"), "tags.jsonl", "--prefer", "fewest-redraws"], { cwd: dir, encoding: "utf8" });
  assert.equal(t.status, 1);
  assert.match(t.stderr, /^tags\.jsonl: line 2, column \d+: this is not valid JSON\./, "the line in the file, not line 1 of one row");
  assert.doesNotMatch(t.stderr, /at JSON\.parse|node:internal/);
  fs.writeFileSync(path.join(dir, "tags.jsonl"), askTags);
  fs.writeFileSync(path.join(dir, "character-registry.json"), askRegistry.replace('"name":"June"', "\u201cname\u201d:\u201cJune\u201d"));
  const r = spawnSync(process.execPath, [path.resolve("scripts/anchor.mjs"), "tags.jsonl", "--character", "june-okafor", "--prefer", "fewest-redraws"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1, "a registry that cannot be read stops the command instead of being skipped");
  assert.match(r.stderr, /character-registry\.json: line 1, column \d+: this is not valid JSON\. Likely cause: that line has curly quotes/);
  fs.writeFileSync(path.join(dir, "character-registry.json"), askRegistry);
  const missing = spawnSync(process.execPath, [path.resolve("scripts/anchor.mjs"), "tags-junee.jsonl"], { cwd: dir, encoding: "utf8" });
  assert.match(missing.stderr, /anchor: tags-junee\.jsonl is not in this folder/);
  fs.rmSync(dir, { recursive: true, force: true });
});

// The second dry run: a typo in a trait or a value is not drift, a wrong --character is not ignored, a misnamed file is named.
test("--ask checks a typed trait against the tags: a typo is pointed out and asked again, and typed twice it is kept", async () => {
  const [typoKey, typoValue, twice] = await Promise.all([
    askOnOpenStdin({ args: ["tags.jsonl", "--ask"], answers: "hiar=two puffs\nhair=two puffs\n\n", files: askFiles }),
    askOnOpenStdin({ args: ["tags.jsonl", "--ask"], answers: "hair=two puff\nhair=two puffs\n\n", files: askFiles }),
    askOnOpenStdin({ args: ["tags.jsonl", "--ask"], answers: "hair=two puff\nhair=two puff\n\n", files: askFiles }),
  ]);
  assert.match(typoKey.out, /Check this: no picture's tags have a trait called "hiar"; the traits in your tags are skin, hair\./);
  assert.match(typoKey.out, /Using: hair=two puffs\./);
  assert.match(typoValue.out, /Check this: no picture's tags say hair=two puff; your tags say hair=two puffs \(1 picture\), hair=loose curls \(2 pictures\)\./);
  assert.match(typoValue.out, /Keep renders\/a\.png/);
  assert.match(twice.out, /Using: hair=two puff\./, "typed the same way twice, it is kept");
  assert.match(twice.err, /None of the pictures has what must never change \(hair=two puff\)\. Your tags say: hair=two puffs \(1 picture\), hair=loose curls \(2 pictures\)\./);
  for (const r of [typoKey, typoValue, twice]) fs.rmSync(r.dir, { recursive: true, force: true });
});

test("a --character the registry does not have stops with the id it was meant to be; a misnamed tags file is named", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-char-"));
  for (const [n, t] of Object.entries(askFiles)) fs.writeFileSync(path.join(dir, n), t);
  for (const typed of ["June-okafor", "june"]) {
    const r = spawnSync(process.execPath, [path.resolve("scripts/anchor.mjs"), "tags.jsonl", "--character", typed, "--ask"], { cwd: dir, encoding: "utf8", input: "" });
    assert.equal(r.status, 1, typed);
    assert.match(r.stderr, new RegExp(`there is no character "${typed}" in character-registry\\.json\\. Did you mean june-okafor\\?`));
  }
  fs.renameSync(path.join(dir, "tags.jsonl"), path.join(dir, "tags.jsonl.txt"));
  const t = spawnSync(process.execPath, [path.resolve("scripts/anchor.mjs"), "tags.jsonl", "--ask"], { cwd: dir, encoding: "utf8", input: "" });
  assert.match(t.stderr, /tags\.jsonl is not in this folder\. There is "tags\.jsonl\.txt" here: rename it to tags\.jsonl\./);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("an empty file, a file holding the command, or one with the page's ``` lines gets a plain cause", async () => {
  const { parseJson } = await import("../scripts/names.mjs");
  const why = (text) => { try { parseJson(text, "character-registry.json"); return ""; } catch (e) { return e.message; } };
  assert.match(why(""), /the file is empty\. Copy the grey box/);
  assert.match(why("pbpaste > character-registry.json\n"), /holds a command instead of the file's text/);
  assert.match(why("Mac:      pbpaste > character-registry.json\nWindows:  Get-Clipboard\n"), /holds a command instead of the file's text/);
  assert.match(why("```json\n{}\n```\n"), /starts with ``` from the page/);
  assert.match(why('{"registry_version": 1, "characters": {'), /stops too early|missing or extra/);
});

// tag.mjs: the tags file by questions, so nobody types JSON by hand
function tagRun({ args = ["june-okafor"], answers = "", files = {}, pictures = ["scene-01-01.png", "scene-01-02.png"], keepOpen = false }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-tag-"));
  fs.writeFileSync(path.join(dir, "character-registry.json"), askRegistry);
  for (const [n, t] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), t);
  if (pictures) { fs.mkdirSync(path.join(dir, "renders")); for (const p of pictures) fs.writeFileSync(path.join(dir, "renders", p), "x"); }
  if (!keepOpen) { const r = spawnSync(process.execPath, [path.resolve("scripts/tag.mjs"), ...args], { cwd: dir, encoding: "utf8", input: answers }); return { ...r, dir, out: r.stdout, err: r.stderr }; }
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.resolve("scripts/tag.mjs"), ...args], { cwd: dir, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout.on("data", (d) => { out += d; }); child.stderr.on("data", (d) => { err += d; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 4000);
    child.on("exit", (code) => { clearTimeout(timer); resolve({ status: code, exitedByItself: code !== null && !child.killed, out, err, dir }); });
    child.stdin.write(answers);
  });
}

test("tag.mjs asks about each picture and writes the tags file anchor.mjs reads, in the format the tutorial shows", () => {
  const r = tagRun({ answers: "hair\nDark Brown\ntwo puffs\n\nloose curls\n" });
  assert.equal(r.status, 0, r.err);
  assert.match(r.out, /Which traits do you want to write down for June\? The fixed traits are: skin\./);
  assert.match(r.out, /Using: skin, hair\./);
  assert.match(r.out, /Picture 1 of 2: renders\/scene-01-01\.png\n  skin \(fixed: dark brown\)/);
  assert.match(r.out, /Wrote tags-june\.jsonl: 2 pictures, 2 traits each\.\nNext: node \.\.\/scripts\/anchor\.mjs tags-june\.jsonl --character june-okafor --ask/);
  const text = fs.readFileSync(path.join(r.dir, "tags-june.jsonl"), "utf8");
  assert.equal(text, '{"image": "renders/scene-01-01.png", "order": 1, "tags": {"skin": "dark brown", "hair": "two puffs"}}\n{"image": "renders/scene-01-02.png", "order": 2, "tags": {"skin": "dark brown", "hair": "loose curls"}}\n', "the fixed value typed in other capitals is written the registry's way; Enter repeats the picture before");
  const a = spawnSync(process.execPath, [path.resolve("scripts/anchor.mjs"), "tags-june.jsonl", "--character", "june-okafor", "--prefer", "fewest-redraws"], { cwd: r.dir, encoding: "utf8" });
  assert.equal(a.status, 0, a.stderr);
  fs.rmSync(r.dir, { recursive: true, force: true });
});

test("tag.mjs re-asks an empty first answer, notes a value off the fixed trait, and never writes half a file", () => {
  const r = tagRun({ answers: "\n\nbrown\n\n", pictures: ["a.png", "b.png"] });
  assert.match(r.out, /Type what you see in this picture, or unknown if you cannot tell\./);
  assert.match(r.out, /Noted: that is not the fixed skin \(dark brown\)\. If the picture does show dark brown, type it exactly that way instead\./);
  assert.equal(r.status, 0, r.err);
  fs.rmSync(r.dir, { recursive: true, force: true });
  const cut = tagRun({ answers: "hair\ndark brown\n" });
  assert.equal(cut.status, 1);
  assert.match(cut.err, /the answers stopped before the end, so nothing was written/);
  assert.equal(fs.existsSync(path.join(cut.dir, "tags-june.jsonl")), false);
  fs.rmSync(cut.dir, { recursive: true, force: true });
});

test("tag.mjs names a wrong id, a missing pictures folder and an existing file, and exits by itself with stdin left open", async () => {
  const wrong = tagRun({ args: ["June"], answers: "" });
  assert.match(wrong.err, /there is no character "June" in character-registry\.json\. Did you mean june-okafor\?/);
  fs.rmSync(wrong.dir, { recursive: true, force: true });
  const none = tagRun({ pictures: null, answers: "" });
  assert.match(none.err, /there is no renders folder here\. Fix: make it with mkdir renders/);
  fs.rmSync(none.dir, { recursive: true, force: true });
  const exists = tagRun({ files: { "tags-june.jsonl": "keep me\n" }, answers: "\n" });
  assert.match(exists.out, /tags-june\.jsonl is already here\. Type y and press Enter to replace it, or just press Enter to stop\./);
  assert.equal(fs.readFileSync(path.join(exists.dir, "tags-june.jsonl"), "utf8"), "keep me\n");
  fs.rmSync(exists.dir, { recursive: true, force: true });
  const open = await tagRun({ answers: "hair\ndark brown\ntwo puffs\n\n\n", keepOpen: true });
  assert.ok(open.exitedByItself, "tag.mjs must end by itself after the last answer\n" + open.out + open.err);
  assert.match(open.out, /Wrote tags-june\.jsonl/);
  fs.rmSync(open.dir, { recursive: true, force: true });
});
