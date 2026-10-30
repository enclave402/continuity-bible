// What this is: the tests for the model sheet and pronoun slots of a registry entry (scripts/lib.mjs checkModelSheet).
// Why it exists: a model sheet is only worth having if a vision model can check every line of it, so the gate must refuse
//   a missing field, a mood word, a name, a missing source and an unknown field with no todo.
// How to use it: npm test (or node --test test/model-sheet.test.mjs). Each test plants one problem in a temp copy of the repo.
// Next step: a new rule for model sheets gets a test here first.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { modelSheetStatus, checkModelSheet } from "../scripts/lib.mjs";

const SKIP = new Set([".git", "node_modules", ".worktrees", ".context", "research"]);
function copyRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-sheet-"));
  fs.cpSync(process.cwd(), dir, { recursive: true, filter: (src) => !path.relative(process.cwd(), src).split(path.sep).some((p) => SKIP.has(p)) });
  return dir;
}
function check(dir) { return spawnSync(process.execPath, [path.join(dir, "scripts/check.mjs")], { cwd: dir, encoding: "utf8" }); }
function editJson(dir, rel, fn) { const f = path.join(dir, rel); const j = JSON.parse(fs.readFileSync(f, "utf8")); fn(j); fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n"); }

// a test fixture, not canon: every field filled with lines a judge model can answer from a picture
const sheet = () => ({
  anchors: ["examples/story/art/main_the-porch.png"],
  face: ["oval face", "amber-brown eyes"],
  skin: ["light olive skin"],
  hair: ["dark curls pinned with a horn comb"],
  body: ["1:6 scale articulated doll with visible ball joints"],
  signature_items: ["thin gold watch on the left wrist"],
  never: ["straight blonde hair"],
  sources: ["examples/sample-scene.md"]
});
const pronouns = { subject: "she", object: "her", possessive: "her", source: "examples/sample-scene.md" };
function run(plant) {
  const dir = copyRepo();
  editJson(dir, "character-registry.json", (r) => plant(r.characters["sam-hayes"], r));
  const r = check(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  return r;
}

test("a full model sheet with sourced pronouns passes and is complete", () => {
  const r = run((e) => { e.model_sheet = sheet(); e.pronouns = pronouns; });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(modelSheetStatus({ model_sheet: sheet(), pronouns }), { present: true, complete: true, unknown: [] });
});

test("a model sheet missing a field fails the schema", () => {
  const r = run((e) => { e.model_sheet = sheet(); delete e.model_sheet.hair; e.pronouns = pronouns; });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /sam-hayes.*model_sheet.*missing hair/);
});

test("an empty fact list fails: write the facts or the word unknown", () => {
  const r = run((e) => { e.model_sheet = { ...sheet(), never: [] }; e.pronouns = pronouns; });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /never/);
});

test("a mood word is not checkable and fails with the word named", () => {
  const r = run((e) => { e.model_sheet = { ...sheet(), face: ["oval face", "a confident smirk"] }; e.pronouns = pronouns; });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /sam-hayes\.model_sheet\.face\[1\] says "confident", which a vision model cannot see/);
});

test("a written-out name fails; the {{id}} token passes", () => {
  const bad = run((e) => { e.model_sheet = { ...sheet(), never: ["Theo's grey hoodie"] }; e.pronouns = pronouns; });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /sam-hayes\.model_sheet\.never\[0\] names "Theo"\. Fix: write the \{\{id\}\} token/);
  const good = run((e) => { e.model_sheet = { ...sheet(), never: ["{{theo-vance}}'s grey hoodie"] }; e.pronouns = pronouns; });
  assert.equal(good.status, 0, good.stderr);
});

test("an unknown field needs a todo, is a gap, and leaves the sheet incomplete", () => {
  const noTodo = run((e) => { e.model_sheet = { ...sheet(), body: "unknown" }; e.pronouns = pronouns; });
  assert.equal(noTodo.status, 1);
  assert.match(noTodo.stderr, /unknown field\(s\) body but no todo/);
  const withTodo = run((e) => { e.model_sheet = { ...sheet(), body: "unknown", todo: ["body: no canon file states build or height"] }; e.pronouns = pronouns; });
  assert.equal(withTodo.status, 0, withTodo.stderr);
  const status = modelSheetStatus({ model_sheet: { ...sheet(), body: "unknown" }, pronouns: "unknown" });
  assert.equal(status.complete, false);
  assert.deepEqual(status.unknown, ["body", "pronouns"]);
});

test("pronouns: a missing slot or a missing source fails; a sheet without pronouns fails", () => {
  const noObject = run((e) => { e.pronouns = { subject: "she", possessive: "her", source: "examples/sample-scene.md" }; });
  assert.equal(noObject.status, 1);
  assert.match(noObject.stderr, /pronouns/);
  const badSource = run((e) => { e.pronouns = { ...pronouns, source: "docs/no-such-file.md" }; });
  assert.equal(badSource.status, 1);
  assert.match(badSource.stderr, /sam-hayes\.pronouns\.source docs\/no-such-file\.md does not exist/);
  const none = run((e) => { e.model_sheet = sheet(); });
  assert.equal(none.status, 1);
  assert.match(none.stderr, /has a model_sheet but no pronouns/);
});

test("a source that does not exist fails; an anchor that is not a picture fails; a missing picture is a gap", () => {
  const badSource = run((e) => { e.model_sheet = { ...sheet(), sources: ["docs/no-such-card.json"] }; e.pronouns = pronouns; });
  assert.equal(badSource.status, 1);
  assert.match(badSource.stderr, /model_sheet source docs\/no-such-card\.json does not exist/);
  const notPicture = checkModelSheet("x", { model_sheet: { ...sheet(), anchors: ["notes.md"] }, pronouns }, { root: process.cwd(), file: "r.json" });
  assert.match(notPicture.failures.join("\n"), /anchors "notes\.md" is not a picture/);
  const missing = checkModelSheet("x", { model_sheet: { ...sheet(), anchors: ["art/missing.png"] }, pronouns }, { root: process.cwd(), file: "r.json" });
  assert.deepEqual(missing.failures, []);
  assert.match(missing.gaps.join("\n"), /anchors art\/missing\.png is not on disk/);
});

test("a line longer than the limit fails: one visible fact per line", () => {
  const long = "dark curls ".repeat(30).trim();
  const r = checkModelSheet("x", { model_sheet: { ...sheet(), hair: [long] }, pronouns }, { root: process.cwd(), file: "r.json" });
  assert.match(r.failures.join("\n"), /hair\[0\] is \d+ characters \(limit 220\)/);
});
