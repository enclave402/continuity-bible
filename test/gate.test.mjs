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

// A token source must not reach a chatbot with a broken token in it: the gate fails it and render refuses it.
test("the gate fails an unknown id, an unknown form and a token lookalike in a token source, each with the token to write", () => {
  const dir = copyRepo();
  const scene = path.join(dir, "examples/sample-scene.md");
  const original = fs.readFileSync(scene, "utf8");
  for (const [typed, want] of [
    ["{{chloe-jenkinz}}", /\{\{chloe-jenkinz\}\} is not a character in the registry\. Fix: check the spelling: did you mean \{\{chloe-jenkins\}\}\?/],
    ["{{chloe-jenkins:nickame}}", /chloe-jenkins has no form "nickame"\. Fix: use one of .*\{\{chloe-jenkins:nickname\}\}/],
    ["{{Chloe-jenkins}}", /\{\{Chloe-jenkins\}\} looks like a token but is not one: ids use only lower-case letters, digits and hyphens, with no spaces\. Fix: write \{\{chloe-jenkins\}\}/],
    ["{{ chloe-jenkins }}", /\{\{ chloe-jenkins \}\} looks like a token but is not one.* Fix: write \{\{chloe-jenkins\}\}/],
  ]) {
    fs.writeFileSync(scene, original.replace("{{chloe-jenkins}} picked up", `${typed} picked up`));
    const r = check(dir);
    assert.equal(r.status, 1, `${typed} must fail the gate\n${r.stdout}${r.stderr}`);
    assert.match(r.stderr, want);
    const rd = spawnSync(process.execPath, [path.join(dir, "scripts/render.mjs"), "examples/sample-scene.md"], { cwd: dir, encoding: "utf8" });
    assert.equal(rd.status, 1, `${typed} must not render`);
    assert.match(rd.stderr, want);
    assert.match(rd.stderr, /render: nothing written/);
  }
  // a file that also feeds another template tool may say so; its typed names are still checked
  fs.writeFileSync(scene, original.replace("{{chloe-jenkins}} picked up", "{{#each pages}} picked up"));
  assert.equal(check(dir).status, 1, "a lookalike fails until the file says it holds other placeholders");
  editJson(dir, "character-registry.json", (j) => { j.token_sources[0].other_placeholders = true; });
  assert.equal(check(dir).status, 0, check(dir).stderr);
  fs.writeFileSync(scene, original.replace("{{chloe-jenkins}} picked up", "Chloe picked up"));
  assert.match(check(dir).stderr, /names "Chloe" in a token source/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("render refuses a typed name in a token source, finds the file by its real name, and checks a mis-capitalised one", () => {
  const dir = copyRepo();
  const scene = path.join(dir, "examples/sample-scene.md");
  fs.writeFileSync(scene, fs.readFileSync(scene, "utf8").replace("{{chloe-jenkins}} picked up", "Chloe picked up"));
  const r = spawnSync(process.execPath, [path.join(dir, "scripts/render.mjs"), "examples/sample-scene.md"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /names "Chloe" in a token source\. Fix: write \{\{chloe-jenkins\}\}/);
  const moved = path.join(dir, "examples/Sample-scene.md");
  fs.renameSync(scene, moved);
  const m = spawnSync(process.execPath, [path.join(dir, "scripts/render.mjs"), "examples/Sample-scene.md"], { cwd: dir, encoding: "utf8" });
  assert.equal(m.status, 1, "a mis-capitalised token source is still checked");
  assert.match(m.stderr, /its name does not match token_sources "examples\/\*\.md" exactly|names "Chloe" in a token source/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a registry that is missing, mis-named or not plain JSON gets a plain answer from the gate and from render, never a stack trace", () => {
  const dir = copyRepo();
  const reg = path.join(dir, "character-registry.json");
  const good = fs.readFileSync(reg, "utf8");
  fs.renameSync(reg, reg + ".txt");
  for (const script of ["check.mjs", "render.mjs"]) {
    const r = spawnSync(process.execPath, [path.join(dir, "scripts", script), "examples/sample-scene.md"], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 1, script);
    assert.match(r.stderr, /registry missing: .*There is "character-registry\.json\.txt" here: rename it to character-registry\.json/, script);
    assert.doesNotMatch(r.stderr, /node:internal|ENOENT|at Object\./, script);
  }
  fs.renameSync(reg + ".txt", reg);
  for (const [bad, cause] of [
    [good.replace('"registry_version"', "\u201cregistry_version\u201d"), /curly quotes/],
    [good.replace(/\}\s*$/, ",\n}\n"), /comma just before this \}/],
    ["{\\rtf1\\ansi\\deff0 " + good + "}", /saved as rich text, not plain text/],
  ]) {
    fs.writeFileSync(reg, bad);
    for (const script of ["check.mjs", "render.mjs"]) {
      const r = spawnSync(process.execPath, [path.join(dir, "scripts", script), "examples/sample-scene.md"], { cwd: dir, encoding: "utf8" });
      assert.equal(r.status, 1, script);
      assert.match(r.stderr, /character-registry\.json: line \d+, column \d+: this is not valid JSON\. Likely cause: /, script);
      assert.match(r.stderr, cause, script);
      assert.doesNotMatch(r.stderr, /node:internal|<anonymous_script>/, script);
    }
  }
  fs.writeFileSync(reg, good);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("near-tokens fail too: single braces around an id, a missing or extra brace, and a scene saved as rich text", () => {
  const dir = copyRepo();
  const scene = path.join(dir, "examples/sample-scene.md");
  const original = fs.readFileSync(scene, "utf8");
  for (const [typed, want] of [
    ["{chloe-jenkins}", /\{chloe-jenkins\} has single braces, so it is not a token\. Fix: write \{\{chloe-jenkins\}\}/],
    ["{chloe-jenkins:nickname}", /has single braces.* Fix: write \{\{chloe-jenkins:nickname\}\}/],
    ["{{chloe-jenkins}", /has a \{\{ without a matching \}\}, or the other way round/],
    ["{{chloe-jenkins}}}", /has three braces in a row/],
  ]) {
    fs.writeFileSync(scene, original.replace("{{chloe-jenkins}} picked up", `${typed} picked up`));
    const r = check(dir);
    assert.equal(r.status, 1, `${typed}\n${r.stdout}${r.stderr}`);
    assert.match(r.stderr, want, typed);
  }
  fs.writeFileSync(scene, "{\\rtf1\\ansi\\deff0 " + original + "}");
  const rtf = check(dir);
  assert.equal(rtf.status, 1);
  assert.match(rtf.stderr, /examples\/sample-scene\.md: was saved as rich text, not plain text/);
  fs.writeFileSync(scene, original.replace("Across the table", "Across the {table}"));
  assert.equal(check(dir).status, 0, "ordinary braces around words that are no character are left alone");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a scene saved with .txt on the end is named by the gate and by render; the gate run one folder up says which registry it checked", () => {
  const dir = copyRepo();
  const story = path.join(dir, "my-story");
  fs.mkdirSync(story);
  fs.writeFileSync(path.join(story, "character-registry.json"), JSON.stringify({ registry_version: 1, token_sources: [{ file: "scene-*.md" }], characters: { "june-okafor": { name: "June", kind: "person", story: "s", role: "r", prose_only: true } } }));
  fs.writeFileSync(path.join(story, "scene-01.md.txt"), "{{june-okafor}} held the ladder.\n");
  const g = spawnSync(process.execPath, [path.join(dir, "scripts/check.mjs")], { cwd: story, encoding: "utf8" });
  assert.equal(g.status, 1);
  assert.match(g.stderr, /matches no tracked file\. There is "scene-01\.md\.txt" here: rename it so it matches exactly/);
  const rd = spawnSync(process.execPath, [path.join(dir, "scripts/render.mjs"), "scene-01.md"], { cwd: story, encoding: "utf8" });
  assert.match(rd.stderr, /render: scene-01\.md is not in this folder\. There is "scene-01\.md\.txt" here: rename it to scene-01\.md\./);
  const up = check(dir);
  assert.match(up.stdout, /note: this checked character-registry\.json in this folder\. my-story\/ has its own registry: to check your story, cd my-story and run node \.\.\/scripts\/check\.mjs/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a registry field with the wrong value is said in plain words, with what most characters use", () => {
  const dir = copyRepo();
  editJson(dir, "character-registry.json", (j) => { j.characters["sam-hayes"].kind = "robot"; });
  const r = check(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /character "sam-hayes", field "kind": must be one of person, companion, voice, group, prop\. Most characters are "person", animals and robots included/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a name in capital letters, an empty scene and a scene holding the paste command all fail; an invalid id is said in plain words", () => {
  const dir = copyRepo();
  const scene = path.join(dir, "examples/sample-scene.md");
  const original = fs.readFileSync(scene, "utf8");
  fs.writeFileSync(scene, original.replace("{{chloe-jenkins}} picked up", "CHLOE picked up"));
  assert.match(check(dir).stderr, /names "CHLOE" in a token source\. Fix: write \{\{chloe-jenkins\}\}; the name is printed the way the registry spells it/);
  fs.writeFileSync(scene, "");
  assert.match(check(dir).stderr, /examples\/sample-scene\.md: is empty\. Fix: copy the grey box/);
  fs.writeFileSync(scene, "pbpaste > sample-scene.md\n");
  assert.match(check(dir).stderr, /examples\/sample-scene\.md: holds a command instead of the scene's text/);
  fs.writeFileSync(scene, original);
  editJson(dir, "character-registry.json", (j) => { j.characters["Mika Tanaka"] = j.characters["sam-hayes"]; delete j.characters["sam-hayes"]; });
  const r = check(dir);
  assert.match(r.stderr, /character id "Mika Tanaka" is not allowed: an id uses only lower-case letters, digits and hyphens\. Fix: change it to "mika-tanaka" in the registry, and write \{\{mika-tanaka\}\} in your scenes/);
  assert.doesNotMatch(r.stderr, /use one of [^\n]*Mika Tanaka/, "an invalid id is never suggested as a fix");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("render suggests the ending a file name left off and always ends the screen on a new line; a mis-cased registry is named", () => {
  const dir = copyRepo();
  const miss = spawnSync(process.execPath, [path.join(dir, "scripts/render.mjs"), "examples/sample-scene"], { cwd: dir, encoding: "utf8" });
  assert.equal(miss.status, 1);
  assert.match(miss.stderr, /render: examples\/sample-scene is not in this folder\. Did you mean sample-scene\.md\?/);
  const scene = path.join(dir, "examples/sample-scene.md");
  fs.writeFileSync(scene, fs.readFileSync(scene, "utf8").replace(/\n+$/, ""));
  const out = spawnSync(process.execPath, [path.join(dir, "scripts/render.mjs"), "examples/sample-scene.md"], { cwd: dir, encoding: "utf8" });
  assert.ok(out.stdout.endsWith("\n"), "a source with no final new line still ends the screen on one");
  const story = path.join(dir, "my-story"); fs.mkdirSync(story);
  fs.writeFileSync(path.join(story, "Character-Registry.json"), JSON.stringify({ registry_version: 1, characters: {} }));
  const insensitive = fs.existsSync(path.join(story, "character-registry.json"));
  const r = spawnSync(process.execPath, [path.join(dir, "scripts/check.mjs")], { cwd: story, encoding: "utf8" });
  if (insensitive) assert.match(r.stdout, /note: the registry file is named Character-Registry\.json\. Rename it to character-registry\.json/);
  else assert.match(r.stderr, /There is "Character-Registry\.json" here: rename it to character-registry\.json/);
  fs.rmSync(dir, { recursive: true, force: true });
});
