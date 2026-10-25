// The public example compiles to a prop index, and --check fails when that file drifts.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validate } from "../scripts/lib.mjs";
import { checkPropIndex, compilePropIndex, propIndexProblems } from "../scripts/compile-prop-index.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "scripts/prop-index.v1.schema.json"), "utf8"));
const LAYERS = ["outer", "hood_or_cowl", "top", "bottom", "footwear", "fabric_spec"];

test("the public example compiles to a schema-valid prop index", () => {
  const index = compilePropIndex(root);
  assert.deepEqual(validate(schema, index), []);
  assert.deepEqual(propIndexProblems(index), []);
  const watch = index.props["sam-tonneau-watch"];
  assert.equal(watch.character, "sam-hayes");
  assert.deepEqual(watch.timeline.map((e) => e.slug), ["the-porch", "read-at-1152", "the-text-sent"]);
  assert.ok(watch.timeline.every((e) => e.presence === "worn" && e.side === "left"));
  assert.equal(index.props["brass-key"].timeline[0].presence, "exempt");
  assert.match(index.props["brass-key"].timeline[1].reason, /theo-vance's hand/);
  assert.match(index.props["cracked-phone"].timeline[1].reason, /chloe-jenkins/);
  assert.equal(index.props["cracked-phone"].timeline[1].side, "unspecified");
  assert.doesNotMatch(JSON.stringify(index), /malik|barnaby-bear|mochi|windsor|bob-barker|The Five/i);
});

test("--check passes the saved file and fails when a page is dropped", () => {
  assert.deepEqual(checkPropIndex(root), []);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-prop-index-"));
  const copy = (rel) => {
    const dest = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, rel), dest);
  };
  for (const rel of [
    "character-registry.json",
    "scripts/prop-index.v1.schema.json",
    "examples/story/scenes.json",
    "examples/story/editions/sam-first.json",
    "examples/story/editions/theo-first.json",
    "examples/continuity/wardrobe-and-props.json",
    "examples/continuity/cards.json",
    "examples/continuity/shot-sheet.json",
    "examples/continuity/prop-index.json",
  ]) copy(rel);
  const ok = spawnSync(process.execPath, ["scripts/compile-prop-index.mjs", "--check", "--root", dir], { cwd: root, encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  const indexPath = path.join(dir, "examples/continuity/prop-index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  index.props["brass-key"].timeline.pop();
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  const bad = spawnSync(process.execPath, ["scripts/compile-prop-index.mjs", "--check", "--root", dir], { cwd: root, encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /out of date/);
});

test("the three leads have two layered outfits and a four-view turnaround", () => {
  const wardrobe = JSON.parse(fs.readFileSync(path.join(root, "examples/continuity/wardrobe-and-props.json"), "utf8"));
  for (const id of ["chloe-jenkins", "sam-hayes", "theo-vance"]) {
    const person = wardrobe.characters[id];
    const outfits = Object.values(person.outfits);
    assert.ok(outfits.length >= 2, id);
    for (const outfit of outfits) {
      for (const layer of LAYERS) assert.equal(typeof outfit.layers[layer], "string", `${id} ${layer}`);
      assert.ok(outfit.negative_tokens.length >= 1, id);
    }
    for (const view of ["front", "back", "profile_left", "profile_right"]) {
      assert.match(person.turnaround[view].path, /\.png$/);
      assert.ok(person.turnaround[view].description.length > 20, `${id} ${view}`);
    }
  }
  assert.ok(wardrobe.characters["sam-hayes"].outfits["evening-entrance"]);
  const pet = JSON.parse(fs.readFileSync(path.join(root, "examples/continuity/archie-terrier.json"), "utf8"));
  assert.equal(pet.id, "archie-terrier");
  assert.equal(pet.prop.item_id, "archie-terrier");
  assert.equal(pet.token, "{{archie-terrier}}");
});
