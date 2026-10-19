// Run from the repo root: npm test. The edit round trip and the owner's-words boundary: a variant is a named edit to the
// rendered text; every step does what it says or the render fails naming the step; apply writes the winner back as tokens
// and the written records render as the tested text spread for spread; a new spread is a slot whose words stay the author's.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { loadStory, renderEdition, SLOT_LINE } from "../scripts/story.mjs";
import { parseSpread, splitSpreads, compareTexts, checkParser, tokensFor, tokenTable, prettyJson } from "../scripts/story-variants.mjs";

const SKIP = new Set([".git", "node_modules", ".worktrees", ".context", "research"]);
const STORY = "examples/story";
const SCENES = `${STORY}/scenes.json`;
const SAM = `${STORY}/editions/sam-first.json`;
const THEO = `${STORY}/editions/theo-first.json`;
const VARIANTS = `${STORY}/variants.json`;
const APPLIED = `${STORY}/variants-applied.json`;
const ALL = "night-in-the-time-line+shorter-porch+a-bill-not-invoices+rest-the-workshop+a-note-first+the-hallway";
function copyRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-variants-"));
  fs.cpSync(process.cwd(), dir, { recursive: true, filter: (src) => !path.relative(process.cwd(), src).split(path.sep).some((p) => SKIP.has(p)) });
  return dir;
}
const node = (dir, script, args = []) => spawnSync(process.execPath, [path.join(dir, "scripts", script), ...args], { cwd: dir, encoding: "utf8" });
const variants = (dir, ...args) => node(dir, "story-variants.mjs", [...args]);
const story = (dir, ...args) => node(dir, "story.mjs", [...args]);
const readJson = (dir, rel) => JSON.parse(fs.readFileSync(path.join(dir, rel), "utf8"));
function editJson(dir, rel, fn) { const f = path.join(dir, rel); const j = JSON.parse(fs.readFileSync(f, "utf8")); fn(j); fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n"); }
const addVariant = (dir, name, steps, about = "a test") => editJson(dir, VARIANTS, (j) => { j.variants[name] = { about, steps }; });
/** One hash over every file of the story folder, so "nothing was written" is a fact. */
function treeHash(dir) {
  const h = crypto.createHash("sha256");
  const walk = (d) => { for (const n of fs.readdirSync(d).sort()) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else { h.update(path.relative(dir, p)); h.update(fs.readFileSync(p)); } } };
  walk(path.join(dir, STORY));
  return h.digest("hex");
}
async function withCopy(fn) { const dir = copyRepo(); try { return await fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); } }
const NO_HOOKS = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-no-hooks-"));
const GIT_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_(DIR|INDEX_FILE|WORK_TREE|COMMON_DIR|PREFIX|CEILING_DIRECTORIES)$/.test(k)));
// the fixture's git dir and work tree are named outright, so no command here can touch the repository the tests run in
const git = (dir, ...args) => spawnSync("git", ["-c", `core.hooksPath=${NO_HOOKS}`, "-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args], { cwd: dir, env: { ...GIT_ENV, GIT_DIR: path.join(dir, ".git"), GIT_WORK_TREE: dir }, encoding: "utf8" });
function gitRepo() {
  const dir = copyRepo();
  assert.equal(git(dir, "init", "-q", "-b", "fixture").status, 0);
  assert.equal(git(dir, "add", "-A").status, 0);
  const c = git(dir, "commit", "-q", "-m", "fixture");
  assert.equal(c.status, 0, c.stderr);
  return dir;
}
/** A slot planted in the example by hand: the record holds notes only, and both editions retire it. */
const plantSlot = (dir, slug = "new-x", record = { _draft: { title: "X" } }) => {
  editJson(dir, SCENES, (j) => { j.scenes[slug] = record; });
  for (const ed of [SAM, THEO]) editJson(dir, ed, (j) => { j.retired.push(slug); });
};

test("base renders exactly the built output; list names every variant with its steps; a composed name joins steps", () => {
  const r = variants(process.cwd(), "render", STORY, "sam-first", "base");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, fs.readFileSync(`${STORY}/built/sam-first.txt`, "utf8"));
  const l = variants(process.cwd(), "list", STORY);
  assert.equal(l.status, 0, l.stderr);
  assert.match(l.stdout, /^examples\/story\/variants\.json: 6 variants\. base is the text as the records are; join names with \+ to test them together \(a\+b\)\./);
  assert.match(l.stdout, /^night-in-the-time-line: every evening TIME line says night[^\n]*\n  replace "Thursday, " with "Thursday night, " in every spread$/m);
  assert.match(l.stdout, /^the-hallway: a spread between the porch and the kitchen[^\n]*\n  add new-the-hallway after the-porch \(draft: "The hallway"\)$/m);
  const t = variants(process.cwd(), "render", STORY, "sam-first", "rest-the-workshop+night-in-the-time-line");
  assert.equal(t.status, 0, t.stderr);
  assert.match(t.stdout, /^SIX HOURS \(Six Hours, Sam first\): 4 spreads, read in order\./);
  assert.doesNotMatch(t.stdout, /TITLE: Across town/);
  assert.match(t.stdout, /TIME: Thursday night, 11:50 PM/);
  assert.match(t.stdout, /TIME: Friday, 6:10 AM/, "a TIME line without the phrase is untouched");
  const b = variants(process.cwd(), "render", STORY, "sam-first", "a-note-first+the-hallway");
  assert.match(b.stdout, /^SIX HOURS \(Six Hours, Sam first\): 6 spreads, read in order\.\nEach spread has a picture; the PICTURE line says what it shows\.\nBANNER: Read it in one sitting if you can: the whole story is six hours and the morning after\.\n\n=== SPREAD 1 OF 6 ===/);
  assert.match(b.stdout, /=== SPREAD 2 OF 6 ===\nPART: Part one: six hours\nTITLE: The hallway\nPICTURE: A narrow hallway at night, Sam with one shoe off[^\n]*\nTIME: Thursday, 11:54 PM\n\nIn the hallway Sam took her shoes off one-handed\./, "the draft is tested with names rendered, at its position");
  const o = variants(process.cwd(), "render", STORY, "theo-first", "the-hallway");
  assert.match(o.stdout, /=== SPREAD 4 OF 6 ===\nPART: Part one: six hours\nTITLE: The hallway/, "placed after its neighbour in every edition");
});

test("diff says what changes, spread by spread, with the lines out and in", () => {
  const d = variants(process.cwd(), "diff", STORY, "sam-first", ALL);
  assert.equal(d.status, 0, d.stderr);
  assert.match(d.stdout, /^night-in-the-time-line\+[^\n]* on sam-first: 5 spreads \(base has 5\); 3 changed, 1 dropped, 1 added, banner set\n/);
  assert.match(d.stdout, /^banner:\n  \+ BANNER: Read it in one sitting/m);
  assert.match(d.stdout, /^spread 1 of 5: the-porch: 2 line\(s\) out, 2 in\n  - TIME: Thursday, 11:50 PM\n  \+ TIME: Thursday night, 11:50 PM\n  - Chloe dug[^\n]*It was the fourth time since the cab\.\n  \+ Chloe dug[^\n]*The fourth time since the cab\.$/m);
  assert.match(d.stdout, /^spread 2 of 5: new-the-hallway \(added after the-porch; a slot when applied\)\n  \+ PART: Part one: six hours\n  \+ TITLE: The hallway/m);
  assert.match(d.stdout, /^spread 3 of 5: read-at-1152 \(was spread 2 of 5\): 1 line\(s\) out, 1 in$/m);
  assert.match(d.stdout, /^dropped: across-town \(was spread 3 of 5; retired in every edition when applied\)$/m);
});

test("every step does what it says, or the render fails naming the variant, the step and the fix", () => withCopy((dir) => {
  addVariant(dir, "bad-one", [{ replace: "Thursday", with: "Thu", in: "one spread" }]);
  addVariant(dir, "bad-none", [{ replace: "Wednesday", with: "Thu", in: "every spread" }]);
  addVariant(dir, "bad-slug", [{ replace: "porch", with: "stoop", in: "the-proch" }]);
  addVariant(dir, "bad-retired", [{ replace: "napkin", with: "serviette", in: "the-napkin-timeline" }]);
  addVariant(dir, "bad-missing", [{ replace: "a napkin", with: "a serviette", in: "the-porch" }]);
  addVariant(dir, "bad-anchor", [{ add: "new-a", after: "the-proch", draft: { title: "A", picture: "p", time: "t", paragraphs: ["x"] } }]);
  addVariant(dir, "bad-twice", [{ add: "new-a", after: "the-porch", draft: { title: "A", picture: "p", time: "t", paragraphs: ["x"] } }, { add: "new-a", before: "the-porch", draft: { title: "A", picture: "p", time: "t", paragraphs: ["x"] } }]);
  addVariant(dir, "bad-token", [{ replace: "{{sam-hayes}}", with: "{{sam-hays}}", in: "every spread" }]);
  addVariant(dir, "bad-draft-token", [{ add: "new-a", after: "the-porch", draft: { title: "A", picture: "p", time: "t", paragraphs: ["{{nobody}} waits"] } }]);
  addVariant(dir, "bad-drop", [{ drop: ["across-twn"] }]);
  addVariant(dir, "bad-dropped-then-named", [{ drop: ["across-town"] }, { replace: "plane", with: "chisel", in: "across-town" }]);
  const fail = (name, re) => { const r = variants(dir, "render", STORY, "sam-first", name); assert.equal(r.status, 1, `${name} should fail`); assert.match(r.stderr, re); assert.match(r.stderr, /story-variants: fail$/m); return r; };
  fail("bad-one", /variants\.json: variant "bad-one", step 1: 3 spreads of sam-first hold "Thursday": the-porch, read-at-1152, across-town\. Fix: name the spread with "in": "<slug>", or write "in": "every spread" to change them all/);
  fail("bad-none", /variant "bad-none", step 1: no spread of sam-first holds "Wednesday" \(capital letters and punctuation count; node scripts\/story-variants\.mjs render examples\/story sam-first base shows the text\)/);
  fail("bad-slug", /variant "bad-slug", step 1: in names "the-proch", which is not a scene of the story \(did you mean "the-porch"\?\)\. Fix: a slug, "every spread" or "one spread"/);
  fail("bad-retired", /variant "bad-retired", step 1: the-napkin-timeline is read in no spread of sam-first \(it is retired here\)\. Fix: test the variant on an edition that reads it, or drop the step/);
  fail("bad-missing", /variant "bad-missing", step 1: the-porch does not hold "a napkin"/);
  fail("bad-anchor", /variant "bad-anchor", step 1: after names "the-proch", which is not a scene of the story \(did you mean "the-porch"\?\)\. Fix: name the spread it goes after/);
  fail("bad-twice", /variant "bad-twice", step 2: "new-a" is added twice/);
  fail("bad-token", /variant "bad-token", step 1: unknown token \{\{sam-hays\}\}/);
  fail("bad-draft-token", /variant "bad-draft-token", step 1: draft: unknown token \{\{nobody\}\}/);
  fail("bad-drop", /variant "bad-drop", step 1: drop names "across-twn", which is not a scene of the story \(did you mean "across-town"\?\)\. Fix: correct the slug/);
  fail("bad-dropped-then-named", /variant "bad-dropped-then-named", step 2: across-town is read in no spread of sam-first \(this variant drops it\)/);
  // an existing slot has no words to change
  plantSlot(dir);
  addVariant(dir, "bad-in-slot", [{ replace: "X", with: "Y", in: "new-x" }]);
  const r = fail("bad-in-slot", /variant "bad-in-slot", step 1: new-x is read in no spread of sam-first \(it is retired here\)/);
  editJson(dir, SAM, (j) => { j.retired = j.retired.filter((s) => s !== "new-x"); j.order.push("new-x"); });
  fail("bad-in-slot", /variant "bad-in-slot", step 1: new-x is a slot: it has no words to change\. Fix: write the spread and claim the slot \(rename it\) first/);
  assert.ok(r);
}));

test("the variants file is checked: every step shape at once, base as a name, a name the file lacks, a missing file", () => withCopy((dir) => {
  addVariant(dir, "bad-shape", [{ replace: "a", with: "a", in: "x" }, { drop: [] }, { add: "hallway", after: "the-porch", draft: {} }, { banner: "" }, { foo: 1 }, { add: "new-a", after: "the-porch", draft: { title: "A", picture: "p", time: "t", layout: "single", art: ["x.png"] } }, { add: "new-b", after: "the-porch", draft: { title: "A", picture: "p", time: "t" } }]);
  let r = variants(dir, "list", STORY);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /variant "bad-shape", step 1: replace and with are the same \("a"\): the step does nothing\. Fix: change with, or drop the step/);
  assert.match(r.stderr, /variant "bad-shape", step 2: drop lists the slugs of the spreads to leave out, as text/);
  assert.match(r.stderr, /variant "bad-shape", step 3: add names the new spread, and the name starts with new- \(new-the-hallway\): it is a slot until the author writes it/);
  assert.match(r.stderr, /variant "bad-shape", step 4: banner is one line of text to the reader/);
  assert.match(r.stderr, /variant "bad-shape", step 5: a step is one of \{ "replace"[^\n]*; this one has foo/);
  assert.match(r.stderr, /variant "bad-shape", step 6: draft has layout, art, which a draft does not carry \(the pictures come when the author writes the spread; a draft has title, picture, time, paragraphs, dialogue, part, margin_note, margin_author, footnote\)/);
  assert.match(r.stderr, /variant "bad-shape", step 7: the draft says nothing: no paragraphs and no dialogue\. Fix: write at least one paragraph or one line of dialogue/);
  editJson(dir, VARIANTS, (j) => { delete j.variants["bad-shape"]; j.variants.base = { about: "x", steps: [{ banner: "x" }] }; j.variants["Bad Name"] = { about: "x", steps: [{ banner: "x" }] }; });
  r = variants(dir, "list", STORY);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /variants\.json: "base" cannot be a variant: it is the name of the text as the records are\. Fix: rename it/);
  assert.match(r.stderr, /variants\.json: variant name "Bad Name" is not allowed: a name uses only lower-case letters, digits and hyphens\. Fix: rename it/);
  editJson(dir, VARIANTS, (j) => { delete j.variants.base; delete j.variants["Bad Name"]; });
  r = variants(dir, "render", STORY, "sam-first", "shorter-prch");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /variants\.json has no variant "shorter-prch" \(did you mean "shorter-porch"\?\)\. Its variants are night-in-the-time-line, shorter-porch, [^\n]*; base is the text as the records are/);
  fs.unlinkSync(path.join(dir, VARIANTS));
  r = variants(dir, "render", STORY, "sam-first", "shorter-porch");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /variants\.json is missing\. Fix: write it with a "variants" map/);
  assert.equal(variants(dir, "render", STORY, "sam-first", "base").status, 0, "base needs no file");
}));

test("the names gate reads the variants file: a typed name in a phrase fails with the token", () => withCopy((dir) => {
  addVariant(dir, "typed", [{ replace: "Sam read", with: "Sam reread", in: "the-porch" }]);
  const r = node(dir, "check.mjs");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /examples\/story\/variants\.json: variants\.typed\.steps\[0\]\.replace: names "Sam" in a token source\. Fix: write \{\{sam-hayes\}\}/);
}));

test("the round trip: apply writes the winner back as tokens, retires the dropped spread and parks its picture, makes a slot, and the written records render as the tested text", () => {
  const dir = gitRepo();
  try {
    const tested = variants(dir, "render", STORY, "sam-first", ALL);
    assert.equal(tested.status, 0, tested.stderr);
    fs.writeFileSync(path.join(dir, "tested.txt"), tested.stdout);
    const before = readJson(dir, SCENES);
    const r = variants(dir, "apply", STORY, "sam-first", ALL, "--tested", "tested.txt");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^story-variants: the-porch: time: written as tokens$/m);
    assert.match(r.stdout, /^story-variants: the-porch: paragraphs\[0\]: written as tokens$/m);
    assert.match(r.stdout, /^story-variants: read-at-1152: time: written as tokens$/m);
    assert.match(r.stdout, /^story-variants: the-text-sent: paragraphs\[1\]: written as tokens$/m);
    assert.match(r.stdout, /^story-variants: across-town: retired in every edition$/m);
    assert.match(r.stdout, /^story-variants: main_across-town\.png: parked \(retired on \d{4}-\d{2}-\d{2} by variant night-in-the-time-line\+/m);
    assert.match(r.stdout, /^story-variants: sam-first: banner written as tokens$/m);
    assert.match(r.stdout, /^story-variants: new-the-hallway: a slot after the-porch \(sam-first: spread 2; theo-first: spread 3\); its words are the author's: the tested draft is the _draft note on its record, nothing is in its fields$/m);
    assert.match(r.stdout, /^story-variants: verified: sam-first renders equal to the tested text: 5 spreads compared, 0 differences; 1 slot compared by position only \(the words are the author's\)$/m);
    assert.match(r.stdout, /^story-variants: next: node scripts\/story\.mjs check examples\/story, then commit the story folder; the slot waits for your words$/m);
    // only the fields that differ were written, as tokens; untouched token text is byte for byte what it was
    const after = readJson(dir, SCENES);
    assert.equal(after.scenes["the-porch"].time, "Thursday night, 11:50 PM");
    assert.equal(after.scenes["the-porch"].paragraphs[0], "{{chloe-jenkins}} dug through her bag for her keys while {{sam-hayes}} read the message again under the porch bulb. The fourth time since the cab.");
    assert.equal(after.scenes["the-porch"].paragraphs[1], before.scenes["the-porch"].paragraphs[1]);
    assert.deepEqual(after.scenes["the-porch"].dialogue, before.scenes["the-porch"].dialogue);
    assert.equal(after.scenes["read-at-1152"].paragraphs[0], before.scenes["read-at-1152"].paragraphs[0], "{{sam-hayes:formal}} stays as it was written");
    assert.equal(after.scenes["the-text-sent"].paragraphs[1], "Nine miles away a phone turned face up on a workbench. {{theo-vance}} read it standing, the way he read a bill.");
    assert.deepEqual(after.scenes["across-town"], before.scenes["across-town"], "a retired record is untouched");
    // the slot: notes only, the tested draft as tokens, its position in every edition
    const slot = after.scenes["new-the-hallway"];
    assert.deepEqual(Object.keys(slot), ["_slot", "_draft"]);
    assert.equal(slot._slot.after, "the-porch");
    assert.deepEqual(slot._slot.positions, { "sam-first": 2, "theo-first": 3 });
    assert.match(slot._slot.applied, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    assert.equal(slot._draft.time, "Thursday night, 11:54 PM", "the draft is kept as it was tested, after the other steps touched it");
    assert.equal(slot._draft.paragraphs[0], "In the hallway {{sam-hayes}} took her shoes off one-handed. The phone stayed in the other hand, and she did not look up from it.");
    assert.deepEqual(slot._draft.dialogue, [{ speaker: "{{chloe-jenkins}}", text: "Kitchen. Tea. Then the phone." }]);
    assert.doesNotMatch(JSON.stringify(slot), /\b(Sam|Chloe|Theo)\b/, "no name is written out anywhere on the slot");
    // editions: the slot placed after its neighbour, the dropped spread retired, the banner on the tested edition only
    const sam = readJson(dir, SAM), theo = readJson(dir, THEO);
    assert.deepEqual(sam.order, ["the-porch", "new-the-hallway", "read-at-1152", "morning-at-the-workbench", "the-text-sent"]);
    assert.deepEqual(sam.retired, ["the-napkin-timeline", "across-town"]);
    assert.equal(sam.banner, "Read it in one sitting if you can: the whole story is six hours and the morning after.");
    assert.equal(Object.keys(sam).indexOf("banner"), Object.keys(sam).indexOf("title") + 1, "banner sits under title");
    assert.deepEqual(theo.order, ["morning-at-the-workbench", "the-porch", "new-the-hallway", "read-at-1152", "the-text-sent"]);
    assert.deepEqual(theo.retired, ["the-napkin-timeline", "across-town"]);
    assert.equal(theo.banner, undefined);
    assert.ok(sam._about_retired, "notes on the edition are kept");
    // the parked picture, the built text, the record of what was done and left
    const parked = readJson(dir, `${STORY}/parked-art.json`);
    assert.match(parked.parked.find((e) => e.file === "main_across-town.png").reason, /^retired on \d{4}-\d{2}-\d{2} by variant night-in-the-time-line\+/);
    const built = fs.readFileSync(path.join(dir, STORY, "built/sam-first.txt"), "utf8");
    assert.match(built, /^SIX HOURS \(Six Hours, Sam first\): 5 spreads, read in order\.\nEach spread has a picture; the PICTURE line says what it shows\.\nBANNER: Read it in one sitting/);
    assert.match(built, new RegExp(`=== SPREAD 2 OF 5 ===\\nSLOT: new-the-hallway\\n${SLOT_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n\\n=== SPREAD 3 OF 5 ===`));
    assert.doesNotMatch(built, /hallway Sam took her shoes/, "nothing of the draft is printed");
    assert.deepEqual(compareTexts(tested.stdout, built, { slots: new Set(["new-the-hallway"]) }), []);
    assert.equal(compareTexts(tested.stdout, built).length, 1, "without the slot allowance the slot spread is the one difference");
    const applied = readJson(dir, APPLIED);
    assert.equal(applied.applied.length, 1);
    const entry = applied.applied[0];
    assert.equal(entry.variant, ALL);
    assert.equal(entry.edition, "sam-first");
    assert.deepEqual(entry.changed, ["the-porch: time", "the-porch: paragraphs[0]", "read-at-1152: time", "the-text-sent: paragraphs[1]"]);
    assert.deepEqual(entry.retired, ["across-town"]);
    assert.deepEqual(entry.parked, ["main_across-town.png"]);
    assert.equal(entry.banner, "sam-first");
    assert.equal(entry.left.length, 1);
    assert.equal(entry.left[0].slot, "new-the-hallway");
    assert.deepEqual(entry.left[0].positions, { "sam-first": 2, "theo-first": 3 });
    assert.equal(entry.left[0].draft.title, "The hallway");
    assert.match(entry.left[0].why, /^the words of a new spread are the author's/);
    assert.match(entry.verified, /^sam-first renders equal to the tested text: 5 spreads compared, 0 differences; 1 slot compared by position only/);
    assert.equal(entry.tested_file, "tested.txt");
    assert.equal(entry.files, undefined);
    // every gate passes on the written story, and the other edition was rebuilt too
    const check = story(dir, "check", STORY);
    assert.equal(check.status, 0, check.stderr);
    assert.match(check.stdout, /story: pass \(7 scenes, 2 editions/);
    const names = node(dir, "check.mjs");
    assert.equal(names.status, 0, names.stderr);
    assert.equal(renderEdition(loadStory(path.join(dir, STORY), { registry: path.join(dir, "character-registry.json") }), "theo-first"), fs.readFileSync(path.join(dir, STORY, "built/theo-first.txt"), "utf8"));
    const l = story(dir, "list", STORY);
    assert.match(l.stdout, /^new-the-hallway\s+2\s+3\s+\(slot: not written yet; the words are the author's\)$/m);
    // a second apply appends to the record and renders base as the new text
    const r2 = variants(dir, "apply", STORY, "theo-first", "a-note-first");
    assert.equal(r2.status, 0, r2.stderr);
    assert.equal(readJson(dir, APPLIED).applied.length, 2);
    assert.equal(readJson(dir, THEO).banner, "Read it in one sitting if you can: the whole story is six hours and the morning after.");
    assert.equal(variants(dir, "render", STORY, "theo-first", "base").stdout, fs.readFileSync(path.join(dir, STORY, "built/theo-first.txt"), "utf8"));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("apply refuses before writing: a broken format, a speaker who is no character, an author who is no character, a tested file that differs, base, a record that does not read back", () => withCopy((dir) => {
  addVariant(dir, "bad-format", [{ replace: "TITLE: The porch", with: "The porch", in: "the-porch" }]);
  addVariant(dir, "bad-speaker", [{ replace: "  {{chloe-jenkins}}: I see it.", with: "  Bob: I see it.", in: "the-porch" }]);
  addVariant(dir, "bad-author", [{ replace: " — {{sam-hayes}} (looking back)", with: " — a friend", in: "the-porch" }]);
  const h0 = treeHash(dir);
  const refuse = (args, re) => { const r = variants(dir, "apply", STORY, "sam-first", ...args); assert.equal(r.status, 1, `${args[0]} should refuse`); assert.match(r.stderr, re); assert.equal(treeHash(dir), h0, `${args[0]}: nothing was written`); return r; };
  refuse(["bad-format"], /the-porch: the tested text cannot be read back into its record \(line 3: expected "TITLE: \.\.\.", found "The porch"\)\. Fix: a variant changes words, not the format[^\n]*\nstory-variants: nothing was written/);
  refuse(["bad-speaker"], /the-porch: dialogue\[1\]\.speaker "Bob" is no character of the story \(a speaker is one token\)\. Fix: name a character, or add this one to the registry first \(node scripts\/new-character\.mjs\)/);
  refuse(["bad-author"], /the-porch: margin_author "a friend" names no character of the story\. Fix: name a character/);
  refuse(["base"], /base changes nothing: there is nothing to write/);
  const t = variants(dir, "render", STORY, "sam-first", "shorter-porch").stdout.replace("Six hours. He had opened", "Six hours. He opened");
  fs.writeFileSync(path.join(dir, "t.txt"), t);
  refuse(["shorter-porch", "--tested", "t.txt"], /the tested text is not what variant shorter-porch renders from the records now \(spread 1, line 9: the file says "Six hours\. He opened it at 11:52[^"]*", the records render "Six hours\. He had opened it at 11:52[^"]*"\)\. The records or the variant changed since the test\. Fix: render the variant again and test that text, or apply from the records the test saw; nothing was written/);
  // the parser is checked against every record first: a margin note holding " — " with no author would not read back
  editJson(dir, SCENES, (j) => { j.scenes["across-town"].margin_note = "I was not ignoring her — not her."; delete j.scenes["across-town"].margin_author; });
  const h1 = treeHash(dir);
  const r = variants(dir, "apply", STORY, "sam-first", "shorter-porch");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /scenes\.json: across-town: margin_note does not read back from the built text as it is written \(the record says "I was not ignoring her — not her\.", the text reads "I was not ignoring her"\)\. Fix: the round trip reads the built text back into fields, so a paragraph is one line, a dialogue speaker holds no ": ", a margin note without an author holds no " — "/);
  assert.match(r.stderr, /nothing was written: the round trip needs every record to read back from its own built text/);
  assert.equal(treeHash(dir), h1);
  assert.equal(variants(dir, "render", STORY, "sam-first", "shorter-porch").status, 0, "render and diff still work; only apply needs the round trip");
}));

test("a names-gate failure after the write puts every file back; a dry run writes nothing", () => {
  const dir = gitRepo();
  try {
    // names put back as tokens cannot fail the gate on their own (that is what tokensBack verifies), so the failure is
    // planted elsewhere in the project: the gate runs on the whole of it after the write, and apply must still undo everything
    fs.appendFileSync(path.join(dir, "examples/sample-scene.md"), "\nSam waits.\n");
    assert.equal(git(dir, "commit", "-qam", "a typed name elsewhere").status, 0);
    const h0 = treeHash(dir);
    const r = variants(dir, "apply", STORY, "sam-first", "shorter-porch");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /examples\/sample-scene\.md: line \d+: names "Sam" in a token source\. Fix: write \{\{sam-hayes\}\}/);
    assert.match(r.stderr, /the names gate fails after the write \(above\)\. Every file was put back as it was\. Fix: if the lines name the story's records, a phrase in the variant writes a name no token covers; if they name other files, fix those first and apply again/);
    assert.equal(treeHash(dir), h0, "every file is as it was, built output included");
    assert.ok(!fs.existsSync(path.join(dir, APPLIED)));
    assert.equal(git(dir, "status", "--porcelain").stdout.trim(), "", "git sees no change either");
    // a token lookalike in a phrase never reaches the records: the render refuses it
    addVariant(dir, "lookalike", [{ replace: "Come inside.", with: "Come inside, {{June-okafor}}.", in: "the-porch" }]);
    const l = variants(dir, "render", STORY, "sam-first", "lookalike");
    assert.equal(l.status, 1);
    assert.match(l.stderr, /edition sam-first still holds \{\{June-okafor\}\} after rendering\. Fix: ids use only lower-case letters, digits and hyphens/);
    assert.equal(git(dir, "checkout", "--", VARIANTS).status, 0);
    const d = variants(dir, "apply", STORY, "sam-first", ALL, "--dry-run");
    assert.equal(d.status, 0, d.stderr);
    assert.match(d.stdout, /^story-variants: dry run of night-in-the-time-line\+[^\n]* on sam-first: what apply would write\n/);
    assert.match(d.stdout, /^story-variants: across-town: retired in every edition \(its pictures are parked when applied\)$/m);
    assert.match(d.stdout, /^story-variants: verified: dry run: nothing written; the round-trip check runs when the variant is applied$/m);
    assert.doesNotMatch(d.stdout, /wrote /);
    assert.equal(treeHash(dir), h0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a field a variant takes out is removed from the record; an edition that reads a dropped spread nowhere is left alone", () => withCopy((dir) => {
  addVariant(dir, "no-footnote", [{ replace: "\nFOOTNOTE: A read receipt says a screen was open. It does not say a person was ready.\n", with: "", in: "read-at-1152" }]);
  const r = variants(dir, "apply", STORY, "sam-first", "no-footnote");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^story-variants: read-at-1152: footnote \(removed\): written as tokens$/m);
  assert.equal(readJson(dir, SCENES).scenes["read-at-1152"].footnote, undefined);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, STORY, "built/theo-first.txt"), "utf8"), /A read receipt says/, "the other edition is rebuilt from the same record");
  assert.deepEqual(readJson(dir, APPLIED).applied[0].changed, ["read-at-1152: footnote (removed)"]);
  assert.equal(story(dir, "check", STORY).status, 0);
}));

test("a slot holds notes only: words or other fields fail every story command with the fix, and the schema refuses a slot's fields too", () => withCopy(async (dir) => {
  plantSlot(dir, "new-the-hallway", { _draft: { title: "The hallway" }, paragraphs: ["In the hallway {{sam-hayes}} took her shoes off."], dialogue: [{ speaker: "{{chloe-jenkins}}", text: "Kitchen." }] });
  let r = story(dir, "list", STORY);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /scenes\.json: new-the-hallway is a slot \(its slug starts with new-\), and a slot's words are the author's, but paragraphs and dialogue are filled in\. Fix: if the words are yours, give the spread its real name: rename new-the-hallway to a slug without new- here and in every edition, and fill in title, picture, time, layout and art; if they are a draft, keep it under _draft and take paragraphs and dialogue out/);
  for (const g of ["check-story-built", "check-story-art", "check-story-retired"]) assert.equal(node(dir, `${g}.mjs`, [STORY]).status, 1, `${g} refuses too`);
  editJson(dir, SCENES, (j) => { j.scenes["new-the-hallway"] = { _draft: {}, title: "The hallway", time: "later" }; });
  r = story(dir, "list", STORY);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /scenes\.json: new-the-hallway is a slot \(its slug starts with new-\): it holds notes only \(keys starting with _\), but it has title, time\. Fix: when the spread is written, give the spread its real name/);
  assert.doesNotMatch(r.stderr, /unknown field/, "one plain message, not the schema's");
  editJson(dir, SCENES, (j) => { j.scenes["new-the-hallway"] = { _draft: { title: "The hallway" } }; });
  r = story(dir, "list", STORY);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^new-the-hallway\s+retired\s+retired\s+\(slot: not written yet; the words are the author's\)$/m);
  // the schema file alone refuses a slot's fields (a tool that validates without the loader gets the same answer)
  const { validate } = await import("../scripts/lib.mjs");
  const problems = validate(readJson(dir, "scripts/scene.v1.schema.json"), { title: "T", story: "s", layouts: { a: { pictures: 1 } }, scenes: { "new-a": { paragraphs: ["x"] } } });
  assert.deepEqual(problems, ["$.scenes.new-a: unknown field paragraphs"]);
}));

test("the author claims a slot by renaming it: the record gets its fields and picture, the slot is gone, every gate passes", () => {
  const dir = gitRepo();
  try {
    assert.equal(variants(dir, "apply", STORY, "sam-first", "the-hallway").status, 0);
    const slot = readJson(dir, SCENES).scenes["new-the-hallway"];
    editJson(dir, SCENES, (j) => {
      const d = slot._draft;
      j.scenes["the-hallway"] = { title: d.title, part: d.part, narrator: "{{chloe-jenkins}}", characters: ["{{sam-hayes}}", "{{chloe-jenkins}}"], props: ["cracked-phone"], paragraphs: d.paragraphs, dialogue: d.dialogue, picture: d.picture, time: d.time, layout: "single", art: ["main_the-hallway.png"] };
      delete j.scenes["new-the-hallway"];
    });
    for (const ed of [SAM, THEO]) editJson(dir, ed, (j) => { j.order = j.order.map((s) => (s === "new-the-hallway" ? "the-hallway" : s)); });
    fs.copyFileSync(path.join(dir, STORY, "art/main_the-porch.png"), path.join(dir, STORY, "art/main_the-hallway.png"));
    assert.equal(git(dir, "add", `${STORY}/art/main_the-hallway.png`).status, 0);
    assert.equal(story(dir, "build", STORY).status, 0);
    const check = story(dir, "check", STORY);
    assert.equal(check.status, 0, check.stderr);
    assert.equal(node(dir, "check.mjs").status, 0);
    const built = fs.readFileSync(path.join(dir, STORY, "built/sam-first.txt"), "utf8");
    assert.match(built, /=== SPREAD 2 OF 6 ===\nPART: Part one: six hours\nTITLE: The hallway\n/);
    assert.doesNotMatch(built, /SLOT:/);
    assert.equal(readJson(dir, APPLIED).applied[0].left[0].slot, "new-the-hallway", "the record keeps what was left, as history");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the parser reads every example record back as written; a block in the renderer's format parses; names go back as tokens", () => {
  const s = loadStory(STORY);
  assert.deepEqual(checkParser(s), []);
  const text = renderEdition(s, "sam-first");
  const { header, blocks } = splitSpreads(text);
  assert.match(header, /^SIX HOURS \(Six Hours, Sam first\): 5 spreads, read in order\.\nEach spread has a picture; the PICTURE line says what it shows\.\n\n$/);
  assert.equal(blocks.length, 5);
  const p = parseSpread(blocks[1]);
  assert.equal(p.number, 2); assert.equal(p.of, 5);
  assert.equal(p.fields.title, "Read at 11:52");
  assert.deepEqual(p.fields.dialogue, [{ speaker: "Sam", text: "Chlo, is this a red flag?" }, { speaker: "Chloe", text: "It is a text. Read me what it says." }, { speaker: "Theo", text: "Running late. Talk tmrw. –T" }]);
  assert.equal(p.fields.margin_note, "One letter can hold a whole person, or hide one. I did not know yet which.");
  assert.equal(p.fields.margin_author, "Chloe");
  assert.equal(p.fields.footnote, "A read receipt says a screen was open. It does not say a person was ready.");
  assert.throws(() => parseSpread("=== SPREAD 1 OF 1 ===\nTITLE: x\nTIME: y\n"), /line 3: expected "PICTURE: \.\.\.", found "TIME: y"/);
  assert.throws(() => parseSpread("=== SPREAD 1 OF 1 ===\nTITLE: x\nPICTURE: p\nTIME: y\n\nDIALOGUE:\n  Sam: hi\nstray line\n"), /line 8: "stray line" is not a dialogue line/);
  const table = tokenTable(s);
  assert.equal(tokensFor("Chlo, Samantha Hayes and the cracked phone; {{theo-vance}} too", table), "{{chloe-jenkins:nickname}}, {{sam-hayes:full}} and {{cracked-phone}}; {{theo-vance}} too");
  assert.equal(prettyJson({ a: ["x", "y"], b: { c: 1 }, d: [{ e: "long".repeat(40) }] }), `{\n  "a": ["x", "y"],\n  "b": { "c": 1 },\n  "d": [\n    {\n      "e": "${"long".repeat(40)}"\n    }\n  ]\n}`);
});
