// Run from the repo root: npm test. The story as records and editions: the example loads, renders and passes its three
// gates; every planted problem is named with its fix; a retirement never deletes; a deleted picture needs the owner's note.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadStory, renderEdition, spreadsOf, positionsOf } from "../scripts/story.mjs";

const SKIP = new Set([".git", "node_modules", ".worktrees", ".context", "research"]);
const STORY = "examples/story";
const SCENES = `${STORY}/scenes.json`;
const SAM = `${STORY}/editions/sam-first.json`;
const THEO = `${STORY}/editions/theo-first.json`;
const PARKED = `${STORY}/parked-art.json`;
function copyRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-story-"));
  fs.cpSync(process.cwd(), dir, { recursive: true, filter: (src) => !path.relative(process.cwd(), src).split(path.sep).some((p) => SKIP.has(p)) });
  return dir;
}
const node = (dir, script, args = []) => spawnSync(process.execPath, [path.join(dir, "scripts", script), ...args], { cwd: dir, encoding: "utf8" });
const story = (dir, ...args) => node(dir, "story.mjs", [...args]);
const gate = (dir, name) => node(dir, `${name}.mjs`, [STORY]);
function editJson(dir, rel, fn) { const f = path.join(dir, rel); const j = JSON.parse(fs.readFileSync(f, "utf8")); fn(j); fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n"); }
/** Plant one or more problems in a temp copy, run a command, clean up, return the result. */
function planted(plant, run = (dir) => story(dir, "list", STORY)) {
  const dir = copyRepo();
  try { plant(dir); return run(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const retire = (j, slug) => { j.order = j.order.filter((s) => s !== slug); j.retired = [...(j.retired || []), slug]; };
// no machine-wide hooks in the fixture (an empty hooks folder), and none of the GIT_* variables a running hook exports
// (they would point the fixture's git at the repository being committed), so the test runs the same on every machine and
// inside the pre-commit hook
const NO_HOOKS = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-no-hooks-"));
const GIT_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_(DIR|INDEX_FILE|WORK_TREE|COMMON_DIR|PREFIX|CEILING_DIRECTORIES)$/.test(k)));
// the fixture's git dir and work tree are named outright, so no command here can ever touch the repository the tests run in
const git = (dir, ...args) => spawnSync("git", ["-c", `core.hooksPath=${NO_HOOKS}`, "-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args], { cwd: dir, env: { ...GIT_ENV, GIT_DIR: path.join(dir, ".git"), GIT_WORK_TREE: dir }, encoding: "utf8" });
/** A temp copy that is a git checkout with everything committed, so tracked and deleted pictures can be told apart. */
function gitRepo() {
  const dir = copyRepo();
  assert.equal(git(dir, "init", "-q", "-b", "fixture").status, 0);
  assert.equal(git(dir, "add", "-A").status, 0);
  const c = git(dir, "commit", "-q", "-m", "fixture");
  assert.equal(c.status, 0, c.stderr);
  return dir;
}

test("the example story loads, both editions render with no token left, and spread numbers come from position", () => {
  const s = loadStory(STORY);
  assert.deepEqual(Object.keys(s.editions).sort(), ["sam-first", "theo-first"]);
  const sam = spreadsOf(s, "sam-first"), theo = spreadsOf(s, "theo-first");
  assert.equal(sam[0].slug, "the-porch"); assert.equal(sam[0].number, 1); assert.equal(sam[0].of, 5);
  assert.equal(theo.find((x) => x.slug === "the-porch").number, 3, "the same record is spread 3 when the workshop comes first");
  assert.ok(!sam.some((x) => x.slug === "the-napkin-timeline") && !theo.some((x) => x.slug === "the-napkin-timeline"), "the retired spread is read in neither edition");
  assert.ok(s.scenes["the-napkin-timeline"], "but its record is still there");
  assert.deepEqual(positionsOf(s).get("the-napkin-timeline"), { "sam-first": "retired", "theo-first": "retired" });
  for (const id of ["sam-first", "theo-first"]) {
    const text = renderEdition(s, id);
    assert.doesNotMatch(text, /\{\{/);
    assert.match(text, /^SIX HOURS \(Six Hours, (Sam|Theo) first\): 5 spreads, read in order\./);
    assert.equal((text.match(/^=== SPREAD \d OF 5 ===$/gm) || []).length, 5);
  }
  const text = renderEdition(s, "sam-first");
  assert.match(text, /=== SPREAD 1 OF 5 ===\nPART: Part one: six hours\nTITLE: The porch\nPICTURE: Two women on a narrow front porch[^\n]*\nTIME: Thursday, 11:50 PM\n\nChloe dug through her bag/);
  assert.match(text, /DIALOGUE:\n  Sam: Chlo, is this a red flag\?\n  Chloe: It is a text\./, "forms resolve: the nickname, the one-letter signature");
  assert.match(text, /  Theo: Running late\. Talk tmrw\. –T\n/);
  assert.match(text, /MARGIN NOTE: I counted the hours[^\n]* — Sam \(looking back\)\n/);
  assert.match(text, /FOOTNOTE: A read receipt says a screen was open\./);
  assert.match(text, /PICTURE: Samantha Hayes at a kitchen table under lamplight, the cracked phone glowing/, "a prop token in the picture line renders its name");
});

test("list and render run from the command line; an unknown edition names the ones that exist", () => {
  const l = story(process.cwd(), "list", STORY);
  assert.equal(l.status, 0, l.stderr);
  assert.match(l.stdout, /^Six Hours: 6 scene\(s\), 2 edition\(s\) \(sam-first, theo-first\), 1 retired in every edition\./);
  assert.match(l.stdout, /^the-porch\s+1\s+3\s+The porch$/m);
  assert.match(l.stdout, /^the-napkin-timeline\s+retired\s+retired\s+The napkin timeline$/m);
  const r = story(process.cwd(), "render", STORY, "theo-first");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, fs.readFileSync(`${STORY}/built/theo-first.txt`, "utf8"), "render prints exactly the committed built output");
  const u = story(process.cwd(), "render", STORY, "chloe-first");
  assert.equal(u.status, 1);
  assert.match(u.stderr, /has no edition "chloe-first"\. Its editions are sam-first, theo-first\. Fix: name one of them, or write editions\/chloe-first\.json/);
});

test("the three gates pass on the example, alone and together", () => {
  for (const g of ["check-story-built", "check-story-art", "check-story-retired"]) {
    const r = gate(process.cwd(), g);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`^${g}: pass`, "m"));
  }
  const all = story(process.cwd(), "check", STORY);
  assert.equal(all.status, 0, all.stderr);
  assert.match(all.stdout, /story: pass \(6 scenes, 2 editions: built output current, every picture accounted for, nothing deleted\)/);
});

test("the names gate covers the story: a typed name in a scene fails with the token, a prop's name too", () => {
  let r = planted((dir) => editJson(dir, SCENES, (j) => { j.scenes["the-porch"].paragraphs[0] = "Sam read the message again."; }), (dir) => node(dir, "check.mjs"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /examples\/story\/scenes\.json: scenes\.the-porch\.paragraphs\[0\]: names "Sam" in a token source\. Fix: write \{\{sam-hayes\}\}/);
  r = planted((dir) => editJson(dir, SCENES, (j) => { j.scenes["the-porch"].picture = "the cracked phone on a porch rail"; }), (dir) => node(dir, "check.mjs"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /scenes\.the-porch\.picture: names "the cracked phone" in a token source\. Fix: write \{\{cracked-phone\}\}/);
  r = planted((dir) => editJson(dir, PARKED, (j) => { j.parked[0].reason = "Theo's first try"; }), (dir) => node(dir, "check.mjs"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /examples\/story\/parked-art\.json: parked\[0\]\.reason: names "Theo" in a token source/);
});

test("an edition that names an unknown slug, lists one twice, or places and retires the same scene fails, every problem at once", () => {
  const r = planted((dir) => editJson(dir, SAM, (j) => { j.order[1] = "read-at-1125"; j.order.push("the-porch"); j.retired.push("across-town"); }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /editions\/sam-first\.json: order names "read-at-1125", which is not a scene in scenes\.json \(did you mean "read-at-1152"\?\)\. Fix: correct the slug, or add the scene first/);
  assert.match(r.stderr, /editions\/sam-first\.json: "the-porch" is listed twice in order\. Fix: a scene is read once in an edition; remove one/);
  assert.match(r.stderr, /editions\/sam-first\.json: "across-town" is both in order and retired\. Fix: a scene is read, or retired, not both/);
  assert.match(r.stderr, /editions\/sam-first\.json: a scene is neither placed nor retired: read-at-1152\. Fix: add it to order where it is read, or to retired/);
  assert.match(r.stderr, /story: fail: examples\/story could not be loaded/);
});

test("a scene neither placed nor retired fails in the edition that forgot it; a retired slug the story lacks fails", () => {
  let r = planted((dir) => editJson(dir, THEO, (j) => { j.order = j.order.filter((s) => s !== "the-porch"); }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /editions\/theo-first\.json: a scene is neither placed nor retired: the-porch\./);
  assert.doesNotMatch(r.stderr, /sam-first/);
  r = planted((dir) => editJson(dir, THEO, (j) => { j.retired = ["the-napkin-timelin"]; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /retired names "the-napkin-timelin", which is not a scene in scenes\.json \(did you mean "the-napkin-timeline"\?\)\. Fix: correct the slug \(a retired scene keeps its record; nothing is deleted\)/);
});

test("a scene record is checked: layout and picture count, a picture not named after its scene, a spread that says nothing, a bad slug", () => {
  let r = planted((dir) => editJson(dir, SCENES, (j) => {
    j.scenes["the-text-sent"].art.pop();
    j.scenes["the-porch"].art = ["porch.png"];
    j.scenes["across-town"].paragraphs = [];
    j.scenes["read-at-1152"].layout = "double";
  }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /scenes\.json: the-text-sent: layout "triptych" carries 3 picture\(s\) but art lists 2\. Fix: list exactly 3 file name\(s\) under art, or change the layout/);
  assert.match(r.stderr, /scenes\.json: the-porch: art\[0\] "porch\.png" is not named after its scene\. Fix: rename the file to main_the-porch\.png/);
  assert.match(r.stderr, /scenes\.json: across-town: says nothing: no paragraphs and no dialogue\. Fix: write at least one paragraph or one line of dialogue/);
  assert.match(r.stderr, /scenes\.json: read-at-1152: layout "double" is not a key of layouts \(single, triptych\)\. Fix: use one of them, or declare it/);
  r = planted((dir) => editJson(dir, SCENES, (j) => { j.scenes["Bad Slug"] = j.scenes["the-porch"]; delete j.scenes["the-porch"].picture; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /scenes\.json: scene id "Bad Slug" is not allowed: a slug uses only lower-case letters, digits and hyphens\. Fix: change it to "bad-slug" here and in every edition/);
  assert.match(r.stderr, /scenes\.json: the-porch: missing picture/);
});

test("built output equals source: retiring a spread without rebuilding fails with the edition, the line and the fix; build makes it pass", () => {
  const dir = copyRepo();
  try {
    editJson(dir, SAM, (j) => retire(j, "across-town"));
    let r = gate(dir, "check-story-built");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /examples\/story\/built\/sam-first\.txt differs from the source \(first difference at line 1: built says "SIX HOURS \(Six Hours, Sam first\): 5 spreads, read in order\.", the source renders "SIX HOURS \(Six Hours, Sam first\): 4 spreads, read in order\."\)\. Fix: node scripts\/story\.mjs build examples\/story, then commit built\/; built output is never edited by hand/);
    assert.doesNotMatch(r.stderr, /theo-first/, "the other edition did not change");
    const b = story(dir, "build", STORY);
    assert.equal(b.status, 0, b.stderr);
    assert.match(b.stdout, /story: wrote examples\/story\/built\/sam-first\.txt \(built output, do not edit\)/);
    r = gate(dir, "check-story-built");
    assert.equal(r.status, 0, r.stderr);
    assert.equal((fs.readFileSync(path.join(dir, STORY, "built/sam-first.txt"), "utf8").match(/^=== SPREAD/gm) || []).length, 4);
    // a hand edit of built output fails; a built file for an edition that no longer exists fails
    fs.appendFileSync(path.join(dir, STORY, "built/theo-first.txt"), "The end.\n");
    fs.writeFileSync(path.join(dir, STORY, "built/chloe-first.txt"), "stale\n");
    r = gate(dir, "check-story-built");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /built\/theo-first\.txt differs from the source \(first difference at line \d+: built says "The end\."/);
    assert.match(r.stderr, /built\/chloe-first\.txt has no edition: editions\/chloe-first\.json does not exist\. Fix: node scripts\/story\.mjs build examples\/story, then commit built\/ \(the build removes it\), or restore the edition/);
    const b2 = story(dir, "build", STORY);
    assert.match(b2.stdout, /story: removed examples\/story\/built\/chloe-first\.txt: no edition of that name/);
    assert.equal(gate(dir, "check-story-built").status, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("every picture is accounted for: a missing picture, an unparked one, a parked one that is loaded or gone, a parked entry without a reason", () => {
  let r = planted((dir) => fs.unlinkSync(path.join(dir, STORY, "art/main_the-porch.png")), (dir) => gate(dir, "check-story-art"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /examples\/story\/art\/main_the-porch\.png is missing, but the-porch lists it under art\. Fix: put the picture back in examples\/story\/art\/, or change the scene's art line/);
  r = planted((dir) => fs.copyFileSync(path.join(dir, STORY, "art/main_the-porch.png"), path.join(dir, STORY, "art/main_the-porch-v2.png")), (dir) => gate(dir, "check-story-art"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /examples\/story\/art\/main_the-porch-v2\.png is in the art folder, loaded by no spread of any edition, and not listed in examples\/story\/parked-art\.json\. Fix: list it under a scene's art, or park it with a reason: node scripts\/check-story-art\.mjs examples\/story --park --reason "<why it is kept>"/);
  r = planted((dir) => { editJson(dir, SAM, (j) => { j.retired = []; j.order.push("the-napkin-timeline"); }); }, (dir) => gate(dir, "check-story-art"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /parked-art\.json: parked lists main_the-napkin-timeline\.png as loaded by nothing, but the-napkin-timeline loads it\. Fix: remove the entry; a loaded picture is not parked/);
  r = planted((dir) => fs.unlinkSync(path.join(dir, STORY, "art/main_read-at-1152-first-try.png")), (dir) => gate(dir, "check-story-art"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /parked-art\.json: parked lists main_read-at-1152-first-try\.png, which is not in examples\/story\/art\/ \(a parked picture disappeared, or the entry is stale\)\. Fix: put the picture back, or move the entry to removed with a note/);
  r = planted((dir) => editJson(dir, PARKED, (j) => { j.parked[0].reason = " "; j.parked.push({ file: "main_the-napkin-timeline.png", reason: "again" }); }), (dir) => gate(dir, "check-story-art"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /parked-art\.json: parked\[0\] \(main_read-at-1152-first-try\.png\) has no reason\. Fix: say in one line why it is kept/);
  assert.match(r.stderr, /parked-art\.json: parked lists main_the-napkin-timeline\.png twice\. Fix: keep one entry/);
});

test("--park writes the parked list for every picture nothing loads and keeps the reasons already there", () => {
  const dir = copyRepo();
  try {
    for (const ed of [SAM, THEO]) editJson(dir, ed, (j) => retire(j, "across-town"));
    assert.equal(gate(dir, "check-story-art").status, 1);
    const p = node(dir, "check-story-art.mjs", [STORY, "--park", "--reason", "retired on 2026-10-19: the workshop came too early"]);
    assert.equal(p.status, 0, p.stderr);
    assert.match(p.stdout, /check-story-art: wrote examples\/story\/parked-art\.json \(3 parked picture\(s\)\)/);
    const m = JSON.parse(fs.readFileSync(path.join(dir, PARKED), "utf8"));
    assert.deepEqual(m.parked.map((e) => e.file), ["main_across-town.png", "main_read-at-1152-first-try.png", "main_the-napkin-timeline.png"]);
    assert.equal(m.parked[0].reason, "retired on 2026-10-19: the workshop came too early");
    assert.match(m.parked[1].reason, /^the first render of the kitchen table/, "an existing reason is kept");
    assert.deepEqual(m.removed, []);
    assert.equal(gate(dir, "check-story-art").status, 0);
    const noReason = node(dir, "check-story-art.mjs", [STORY, "--park"]);
    assert.equal(noReason.status, 2);
    assert.match(noReason.stderr, /--park needs --reason/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a retirement is never a deletion: a retired spread's picture that is gone fails, and only the owner's note under removed lets it go", () => {
  const dir = copyRepo();
  try {
    fs.unlinkSync(path.join(dir, STORY, "art/main_the-napkin-timeline.png"));
    let r = gate(dir, "check-story-retired");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /examples\/story\/art\/main_the-napkin-timeline\.png is gone, but the-napkin-timeline is retired, not deleted: a retirement keeps the record and the picture\. Fix: put the picture back in examples\/story\/art\/ \(parked with a reason\), or, if it must go, add it to removed in examples\/story\/parked-art\.json with a note saying who decided and why/);
    assert.match(gate(dir, "check-story-art").stderr, /parked lists main_the-napkin-timeline\.png, which is not in/);
    editJson(dir, PARKED, (j) => { j.parked = j.parked.filter((e) => e.file !== "main_the-napkin-timeline.png"); j.removed.push({ file: "main_the-napkin-timeline.png", note: "the author, 2026-10-19: the napkin will not be redrawn" }); });
    r = gate(dir, "check-story-retired");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /main_the-napkin-timeline\.png \(retired scene the-napkin-timeline\) was removed with a note: the author, 2026-10-19: the napkin will not be redrawn/);
    assert.equal(gate(dir, "check-story-art").status, 0);
    assert.equal(story(dir, "check", STORY).status, 0);
    // the record itself is still there: the loader would refuse an edition that retires a slug the story lacks
    assert.ok(JSON.parse(fs.readFileSync(path.join(dir, SCENES), "utf8")).scenes["the-napkin-timeline"]);
    // a note for a picture still on disk, or one a placed scene loads, fails
    editJson(dir, PARKED, (j) => { j.removed.push({ file: "main_the-porch.png", note: "x" }); });
    r = gate(dir, "check-story-retired");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /parked-art\.json: removed says main_the-porch\.png was removed, but it is still in examples\/story\/art\/\. Fix: delete the picture, or drop the note/);
    assert.match(r.stderr, /parked-art\.json: removed lists main_the-porch\.png, but the-porch still loads it\. Fix: change the scene's art line first/);
    editJson(dir, PARKED, (j) => { j.removed[1].note = ""; });
    r = gate(dir, "check-story-retired");
    assert.match(r.stderr, /parked-art\.json: removed\[1\] \(main_the-porch\.png\) has no note\. Fix: say in one line why it was removed, and who decided/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("in a git checkout: a picture added but not tracked fails, a deletion staged or not fails without a note, and passes with one", () => {
  const dir = gitRepo();
  try {
    fs.copyFileSync(path.join(dir, STORY, "art/main_the-porch.png"), path.join(dir, STORY, "art/main_across-town-v2.png"));
    editJson(dir, SCENES, (j) => { j.scenes["across-town"].art = ["main_across-town-v2.png"]; });
    let r = gate(dir, "check-story-art");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /examples\/story\/art\/main_across-town-v2\.png is on disk but not added to git, and across-town lists it\. Fix: git add examples\/story\/art\/main_across-town-v2\.png/);
    assert.match(r.stderr, /examples\/story\/art\/main_across-town\.png is in the art folder, loaded by no spread of any edition, and not listed/);
    assert.equal(git(dir, "checkout", "--", SCENES).status, 0);
    fs.unlinkSync(path.join(dir, STORY, "art/main_across-town-v2.png"));
    // deleted from the working tree, still tracked
    fs.unlinkSync(path.join(dir, STORY, "art/main_the-napkin-timeline.png"));
    r = gate(dir, "check-story-retired");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /art\/main_the-napkin-timeline\.png is gone, but the-napkin-timeline is retired, not deleted/);
    assert.match(r.stderr, /examples\/story\/art\/main_the-napkin-timeline\.png is deleted in git \(gone from the working tree\) with no note\. Story pictures are never deleted silently\. Fix: git restore --staged --worktree -- examples\/story\/art\/main_the-napkin-timeline\.png, or add \{ "file": "main_the-napkin-timeline\.png", "note": "<who decided, when, and why>" \} under removed in examples\/story\/parked-art\.json/);
    // staged for deletion
    assert.equal(git(dir, "rm", "-q", "--cached", `${STORY}/art/main_the-napkin-timeline.png`).status, 0);
    r = gate(dir, "check-story-retired");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /main_the-napkin-timeline\.png is deleted in git \(gone from the working tree\) with no note/);
    // a placed scene's picture staged for deletion while still on disk: the art gate wants it tracked, the retired gate wants a note
    assert.equal(git(dir, "rm", "-q", "--cached", `${STORY}/art/main_the-porch.png`).status, 0);
    r = gate(dir, "check-story-retired");
    assert.match(r.stderr, /examples\/story\/art\/main_the-porch\.png is deleted in git \(staged for deletion\) with no note/);
    assert.match(gate(dir, "check-story-art").stderr, /main_the-porch\.png is on disk but not added to git, and the-porch lists it/);
    assert.equal(git(dir, "add", `${STORY}/art/main_the-porch.png`).status, 0);
    // the owner's note lets the napkin go; the parked entry moves to removed
    editJson(dir, PARKED, (j) => { j.parked = j.parked.filter((e) => e.file !== "main_the-napkin-timeline.png"); j.removed.push({ file: "main_the-napkin-timeline.png", note: "the author, 2026-10-19: the napkin will not be redrawn" }); });
    r = gate(dir, "check-story-retired");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /1 picture\(s\) removed with a note, 1 deletion\(s\) in git/);
    const all = story(dir, "check", STORY);
    assert.equal(all.status, 0, all.stderr);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("telling the same story in a third order is one new file: the records do not change, the numbers follow the order", () => {
  const dir = copyRepo();
  try {
    const before = fs.readFileSync(path.join(dir, SCENES), "utf8");
    fs.writeFileSync(path.join(dir, STORY, "editions/chloe-first.json"), JSON.stringify({ title: "Six Hours, the kitchen first", order: ["read-at-1152", "the-porch", "across-town", "morning-at-the-workbench", "the-text-sent"], retired: ["the-napkin-timeline"] }, null, 2) + "\n");
    const l = story(dir, "list", STORY);
    assert.equal(l.status, 0, l.stderr);
    assert.match(l.stdout, /3 edition\(s\) \(chloe-first, sam-first, theo-first\)/);
    assert.match(l.stdout, /^read-at-1152\s+1\s+2\s+4\s+Read at 11:52$/m);
    assert.equal(gate(dir, "check-story-built").status, 1, "no built output yet for the new edition");
    assert.match(gate(dir, "check-story-built").stderr, /built\/chloe-first\.txt is missing: edition chloe-first has no built output\. Fix: node scripts\/story\.mjs build examples\/story/);
    assert.equal(story(dir, "build", STORY).status, 0);
    assert.equal(story(dir, "check", STORY).status, 0);
    assert.match(fs.readFileSync(path.join(dir, STORY, "built/chloe-first.txt"), "utf8"), /=== SPREAD 1 OF 5 ===\nPART: Part one: six hours\nTITLE: Read at 11:52\n/);
    assert.equal(fs.readFileSync(path.join(dir, SCENES), "utf8"), before, "no record changed");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
