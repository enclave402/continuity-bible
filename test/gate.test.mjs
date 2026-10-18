// Run from the repo root: npm test. Plants one problem at a time in a temp copy of the repo and expects the gate to name it.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadNames } from "../scripts/names.mjs";
import { tokenizeText } from "../scripts/tokenize.mjs";

const SKIP = new Set([".git", "node_modules", ".worktrees", ".context", "research"]);
function copyRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-gate-"));
  fs.cpSync(process.cwd(), dir, { recursive: true, filter: (src) => !path.relative(process.cwd(), src).split(path.sep).some((p) => SKIP.has(p)) });
  return dir;
}
function check(dir) { return spawnSync(process.execPath, [path.join(dir, "scripts/check.mjs")], { cwd: dir, encoding: "utf8" }); }
function editJson(dir, rel, fn) { const f = path.join(dir, rel); const j = JSON.parse(fs.readFileSync(f, "utf8")); fn(j); fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n"); }
const names = loadNames(process.cwd());

test("a contextual form is picked by the unit's own field, falls back to default, and fails without one", () => {
  assert.equal(names.resolveDeep({ stage: "childhood", text: "{{brass-key:attitude}}" }).text, "clutched like a toy");
  assert.equal(names.resolveDeep({ stage: "adult", text: "{{brass-key:attitude}}" }).text, "kept in a drawer");
  assert.equal(names.resolveDeep({ text: "{{brass-key:attitude}}" }).text, "on the side table");
  assert.equal(names.resolveDeep({ stage: "adult", nested: { text: "{{brass-key:attitude}}" } }).nested.text, "kept in a drawer", "a nested object inherits the context");
  const dir = copyRepo();
  editJson(dir, "character-registry.json", (r) => { delete r.characters["brass-key"].forms.attitude.values.default; });
  const strict = loadNames(dir);
  assert.throws(() => strict.resolveDeep({ text: "{{brass-key:attitude}}" }), /picked by "stage".*no stage.*no default/);
  assert.throws(() => strict.resolveDeep({ stage: "teen", text: "{{brass-key:attitude}}" }), /stage "teen", which forms\.attitude\.values does not list/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a written-out variant of a contextual form is a label: tokenize finds it, the gate refuses it", () => {
  assert.equal(tokenizeText("the brass key kept in a drawer"), "{{brass-key}} {{brass-key:attitude}}");
  const dir = copyRepo();
  fs.appendFileSync(path.join(dir, "examples/sample-scene.md"), "\nIt was kept in a drawer.\n");
  const r = check(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /names "kept in a drawer" in a token source\. Fix: write \{\{brass-key:attitude\}\}/);
});

test("a prop is listed by id; an unknown prop id fails like an unknown name", () => {
  const dir = copyRepo();
  editJson(dir, "examples/scenes.json", (j) => { j.scenes["14-read-at-1152"].props.push("silver-locket"); });
  const r = check(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /unknown name "silver-locket"/);
});

test("forbid_keys: a field another file owns may not be copied into a surface", () => {
  const dir = copyRepo();
  editJson(dir, "examples/art.json", (j) => { j.art["art-14-kitchen-table"].visualDescription = "a copy that will go stale"; });
  const r = check(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /examples\/art\.json: art-14-kitchen-table: holds "visualDescription", which examples\/scenes\.json owns/);
});

test("exclusive_markers: a scene's text may not use another value's vocabulary", () => {
  const dir = copyRepo();
  editJson(dir, "examples/scenes.json", (j) => { j.scenes["14-read-at-1152"].narration += " Sunrise came late."; });
  const r = check(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /says "Sunrise" \(time_of_day morning\) but time_of_day is "evening"/);
});

test("coverage: a file that is nobody's surface and names a character is reported; strict makes it a failure", () => {
  const dir = copyRepo();
  fs.mkdirSync(path.join(dir, "notes"), { recursive: true });
  fs.writeFileSync(path.join(dir, "notes/run-notes.md"), "Session 3: Sam waited by the phone.\n");
  let r = check(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /gap: notes\/run-notes\.md:1: names "Sam" but is no surface, token source or record/);
  editJson(dir, "character-registry.json", (reg) => { reg.coverage.strict = true; });
  r = check(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /notes\/run-notes\.md:1: names "Sam"/);
});

test("render writes built output with names and contextual variants, never a token", () => {
  const r = spawnSync(process.execPath, ["scripts/render.mjs", "examples/scenes.json"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /the brass key stayed kept in a drawer/);
  assert.match(r.stdout, /Theodore Vance signed contracts/);
  assert.doesNotMatch(r.stdout, /\{\{/);
  const t = spawnSync(process.execPath, ["scripts/render.mjs", "examples/sample-scene.md"], { encoding: "utf8" });
  assert.equal(t.status, 0, t.stderr);
  assert.match(t.stdout, /Chloe picked up the phone/);
});
