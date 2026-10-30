// Tests for scripts/check-self-explaining.mjs and scripts/parts-map.mjs.
// What this is: tests for the self-explaining parts check. Each case builds a tiny repo in a temp folder and runs it.
// Why it exists: the check must fail a part with no header, a hard header or a name that misleads, and it must
//   pass a good one. Without tests, the check could quietly stop working.
// How to use it: run node --test test/self-explaining.test.mjs. npm run verify runs it too.
// Next step: when you add a rule to the check, add a case here that fails without it.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, runCheck } from "../scripts/check-self-explaining.mjs";
import { buildMap } from "../scripts/parts-map.mjs";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REAL = loadConfig(REPO);

const GOOD = [
  "/**",
  " * widget-maker.mjs: makes widgets.",
  " *",
  " * What this is: a tool that makes widgets from a list.",
  " * Why it exists: we need the same widgets each time.",
  " * How to use it: run node widget-maker.mjs.",
  " * Next step: open the list and add a widget.",
  " */",
  "export const x = 1;",
].join("\n");

const HARD = GOOD.replace("a tool that makes widgets from a list.", "an extraordinarily sophisticated, configurable, multidimensional widget manufacturing apparatus, orchestrating heterogeneous organizational specifications simultaneously.");

function repo(files, cfgEdit = (c) => c) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "self-explaining-"));
  const cfg = cfgEdit(structuredClone({ ...REAL, scope: { include: ["src/"], skip_dirs: [] }, exempt: {}, parts_map: undefined }));
  const all = { "scripts/self-explaining.config.json": JSON.stringify(cfg), ...files };
  for (const [rel, text] of Object.entries(all)) {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return { dir, cfg: loadConfig(dir) };
}

test("a script with the four lines in plain words passes", () => {
  const { dir, cfg } = repo({ "src/widget-maker.mjs": GOOD });
  assert.deepEqual(runCheck(dir, cfg).errors, []);
});

test("a script with no header fails, naming the file, the missing line and the next step", () => {
  const { dir, cfg } = repo({ "src/widget-maker.mjs": "export const x = 1;\n" });
  const { errors } = runCheck(dir, cfg);
  assert.ok(errors.some((e) => e.startsWith("src/widget-maker.mjs:") && e.includes('"What this is"') && e.includes("Next step:")), errors.join("\n"));
  assert.equal(errors.length, 4);
});

test("a header above grade 8 fails with its grade", () => {
  const { dir, cfg } = repo({ "src/widget-maker.mjs": HARD });
  const { errors } = runCheck(dir, cfg);
  assert.equal(errors.length, 1, errors.join("\n"));
  assert.match(errors[0], /reads at grade [\d.]+, above 8/);
});

test("header lines out of order fail", () => {
  const swapped = GOOD.replace(" * What this is: a tool that makes widgets from a list.\n * Why it exists: we need the same widgets each time.", " * Why it exists: we need the same widgets each time.\n * What this is: a tool that makes widgets from a list.");
  const { dir, cfg } = repo({ "src/widget-maker.mjs": swapped });
  assert.match(runCheck(dir, cfg).errors.join("\n"), /out of order/);
});

test("a name the header never uses fails", () => {
  const { dir, cfg } = repo({ "src/lane-guard.mjs": GOOD });
  assert.match(runCheck(dir, cfg).errors.join("\n"), /src\/lane-guard\.mjs: has a name \("lane, guard"\)/);
});

test("a JSON data file needs an _about object with the four keys", () => {
  const about = { what: "A list of widgets.", why: "The tool reads it.", how: "Add a row.", next: "Run the tool." };
  const ok = repo({ "src/widgets.json": JSON.stringify({ _about: about, rows: [] }) });
  assert.deepEqual(runCheck(ok.dir, ok.cfg).errors, []);
  const bad = repo({ "src/widgets.json": JSON.stringify({ rows: [] }) });
  assert.equal(runCheck(bad.dir, bad.cfg).errors.length, 4);
});

test("a schema needs labelled sentences in its description and a description on every field", () => {
  const description = "What this is: the shape of a widget list. Why it exists: tools agree on widgets. How to use it: validate against it. Next step: add a field.";
  const schema = { description, properties: { name: { type: "string", description: "The widget's name." }, size: { type: "number" } } };
  const { dir, cfg } = repo({ "src/widget.schema.json": JSON.stringify(schema) });
  const { errors } = runCheck(dir, cfg);
  assert.equal(errors.length, 1, errors.join("\n"));
  assert.match(errors[0], /1 field\(s\) with no "description": size/);
});

test("a doc can keep the four lines in its front matter", () => {
  const doc = "---\ntitle: Widgets\nwhat: A page about widgets.\nwhy: People ask about them.\nhow: Read it top to bottom.\nnext: Make a widget.\n---\n\n# Widgets\n";
  const { dir, cfg } = repo({ "src/WIDGETS.md": doc });
  assert.deepEqual(runCheck(dir, cfg).errors, []);
});

test("the baseline lets an old part wait, fails it once it changes, and only shrinks", () => {
  const { dir, cfg } = repo({ "src/old-thing.mjs": "export const y = 2;\n" });
  assert.deepEqual(runCheck(dir, cfg, { writeNewBaseline: true }).errors, []);
  assert.deepEqual(runCheck(dir, cfg).errors, []);
  assert.match(runCheck(dir, cfg, { writeNewBaseline: true }).errors[0], /already exists/);

  fs.writeFileSync(path.join(dir, "src/old-thing.mjs"), "export const y = 3;\n");
  assert.match(runCheck(dir, cfg).errors.join("\n"), /changed since the baseline/);

  fs.writeFileSync(path.join(dir, "src/old-thing.mjs"), GOOD.replace(/widget-maker|widgets?/g, "old thing"));
  assert.match(runCheck(dir, cfg).errors.join("\n"), /now passes, but .* still lists it/);
  runCheck(dir, cfg, { updateBaseline: true });
  const base = JSON.parse(fs.readFileSync(path.join(dir, cfg.baseline), "utf8"));
  assert.deepEqual(base.parts, {});
  assert.deepEqual(runCheck(dir, cfg).errors, []);
});

test("a known misleading name fails until its fix is recorded", () => {
  const entry = { path: "src/widget-maker.mjs", why: "it also deletes widgets" };
  const open = repo({ "src/widget-maker.mjs": GOOD }, (c) => ({ ...c, known_misleading: [entry] }));
  assert.match(runCheck(open.dir, open.cfg).errors.join("\n"), /known to mislead/);
  const fixed = repo({ "src/widget-maker.mjs": GOOD }, (c) => ({ ...c, known_misleading: [{ ...entry, fixed_by: "header rewritten" }] }));
  assert.deepEqual(runCheck(fixed.dir, fixed.cfg).errors, []);
});

test("the parts map lists each part with its What this is line", () => {
  const { dir, cfg } = repo({ "src/widget-maker.mjs": GOOD, "src/old.mjs": "export const z = 1;\n" });
  const map = buildMap(dir, { ...cfg, parts_map: REAL.parts_map }, runCheck(dir, cfg).results);
  assert.match(map, /\| \[src\/widget-maker\.mjs\]\(\.\.\/\.\.\/src\/widget-maker\.mjs\) \| a tool that makes widgets from a list\. \|/);
  assert.match(map, /\| \[src\/old\.mjs\]\([^)]*\) \| \*no header yet/);
});
