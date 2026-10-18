// Run from the repo root: npm test. Uses the sample character-registry.json.
import test from "node:test";
import assert from "node:assert/strict";
import { loadNames, atomicLabels } from "../scripts/names.mjs";
import { tokenizeText } from "../scripts/tokenize.mjs";

const names = loadNames(process.cwd());
const draft = "Sam texted Theo at midnight. Theodore Vance never answered, so Samantha called Chloe.";

test("tokenize replaces every registered name, the main names included", () => {
  assert.equal(
    tokenizeText(draft),
    "{{sam-hayes}} texted {{theo-vance}} at midnight. {{theo-vance:full}} never answered, so {{sam-hayes:formal}} called {{chloe-jenkins}}.",
  );
});

test("tokenize then resolve gives back the original text", () => {
  assert.equal(names.resolveTokens(tokenizeText(draft)), draft);
});

test("tokenize never rewrites inside an existing token", () => {
  assert.equal(tokenizeText("{{sam-hayes}} and Sam"), "{{sam-hayes}} and {{sam-hayes}}");
});

test("one entry owning a label twice is not shared, and the bare token wins", () => {
  const { list, shared } = atomicLabels({ sam: { name: "Sam", forms: { short: "Sam" } } });
  assert.deepEqual(shared, []);
  assert.deepEqual(list, [["Sam", "{{sam}}"]]);
});

test("a label two entries share is skipped and reported", () => {
  const { list, shared } = atomicLabels({ a: { name: "Alex" }, b: { name: "Alex", full_name: "Alex Kim" } });
  assert.deepEqual(shared, ["Alex"]);
  assert.deepEqual(list, [["Alex Kim", "{{b:full}}"]]);
});

test("an unknown id fails the build instead of printing a name", () => {
  assert.throws(() => names.resolveTokens("He texted {{theo-vanse}} back."), /unknown token \{\{theo-vanse\}\}/);
});

test("check passes on the examples and fails on a written-out name, with the token to write", async () => {
  const { spawnSync } = await import("node:child_process");
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const pass = spawnSync(process.execPath, ["scripts/check.mjs"], { encoding: "utf8" });
  assert.equal(pass.status, 0, pass.stderr);
  assert.match(pass.stdout, /character registry: pass \(4 entries, 7 labels resolved on 2 surfaces/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-"));
  fs.cpSync(process.cwd(), dir, { recursive: true, filter: (src) => !path.relative(process.cwd(), src).split(path.sep).some((p) => [".git", "node_modules", ".worktrees", ".context", "research"].includes(p)) });
  fs.appendFileSync(path.join(dir, "examples/sample-scene.md"), "\nSam waited.\n");
  const fail = spawnSync(process.execPath, ["scripts/check.mjs"], { cwd: dir, encoding: "utf8" });
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(fail.status, 1);
  assert.match(fail.stderr, /names "Sam" in a token source\. Fix: write \{\{sam-hayes\}\}/);
});
