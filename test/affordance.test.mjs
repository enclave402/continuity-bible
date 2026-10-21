import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseAffordanceResult, checkPromptAffordanceGuards, AFFORDANCE_INSPECTION_PROMPT, batchCheckAffordance, formatBatchTable, listImages } from "../scripts/check-affordance.mjs";

test("AFFORDANCE_INSPECTION_PROMPT includes Gaze-Affordance Decoupling rules", () => {
  assert.match(AFFORDANCE_INSPECTION_PROMPT, /Gaze-Affordance Decoupling/);
  assert.match(AFFORDANCE_INSPECTION_PROMPT, /canonical_view_bias_detected/);
});

test("parseAffordanceResult accurately identifies PASS and FAIL verdicts", () => {
  const passResult = JSON.stringify({
    device_detected: true,
    canonical_view_bias_detected: false,
    verdict: "PASS",
    reason: "Phone back chassis faces camera, screen angled inward toward user."
  });
  const parsedPass = parseAffordanceResult(passResult);
  assert.equal(parsedPass.pass, true);
  assert.equal(parsedPass.details.canonical_view_bias_detected, false);

  const failResult = JSON.stringify({
    device_detected: true,
    canonical_view_bias_detected: true,
    verdict: "FAIL",
    reason: "Screen faces camera while subject looks down at camera bump."
  });
  const parsedFail = parseAffordanceResult(failResult);
  assert.equal(parsedFail.pass, false);
  assert.equal(parsedFail.details.canonical_view_bias_detected, true);
});

test("checkPromptAffordanceGuards validates orientation tokens", () => {
  const unguardedPrompt = "Front medium shot of Sam looking down at her phone in the kitchen.";
  const guardedPrompt = "Front medium shot of Sam looking down at her phone in the kitchen, back chassis facing camera, screen angled inward toward her face.";

  const unguardedResult = checkPromptAffordanceGuards(unguardedPrompt);
  assert.equal(unguardedResult.relevant, true);
  assert.equal(unguardedResult.pass, false);
  assert.match(unguardedResult.warning, /back chassis facing camera/);

  const guardedResult = checkPromptAffordanceGuards(guardedPrompt);
  assert.equal(guardedResult.relevant, true);
  assert.equal(guardedResult.pass, true);
});

// Batch check. Why: a folder of renders is checked in one command, and one backwards phone stops the build.
// The answers below are what a vision AI returns for the --prompt rubric; the pictures are stand-in files.
const ANSWERS = {
  "p01-reading.png": { device_detected: true, canonical_view_bias_detected: false, verdict: "PASS", reason: "Back of the phone faces the camera; the screen faces her eyes." },
  "p02-backwards.png": { device_detected: true, canonical_view_bias_detected: true, verdict: "FAIL", reason: "The screen faces the camera while she looks at the camera bump." },
  "p03-porch.png": { device_detected: false, canonical_view_bias_detected: false, verdict: "PASS", reason: "No handheld device in the picture." },
};

function pictureFolder({ withAnswers = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-affordance-"));
  for (const [name, answer] of Object.entries(ANSWERS)) {
    fs.writeFileSync(path.join(dir, name), "not a real picture");
    if (withAnswers) fs.writeFileSync(path.join(dir, `${name}.affordance.json`), JSON.stringify(answer));
  }
  fs.writeFileSync(path.join(dir, "notes.txt"), "not a picture, never checked");
  return dir;
}

test("batchCheckAffordance counts PASS and FAIL, passes a picture with no device, and keeps each reason", async () => {
  const files = Object.keys(ANSWERS);
  const summary = await batchCheckAffordance({ files, inspector: (f) => ANSWERS[path.basename(f)] });
  assert.equal(summary.total, 3);
  assert.equal(summary.passed, 2);
  assert.equal(summary.failed, 1);
  assert.equal(summary.no_device, 1);
  assert.equal(summary.unchecked, 0);
  const byName = Object.fromEntries(summary.results.map((r) => [r.name, r]));
  assert.equal(byName["p02-backwards.png"].verdict, "FAIL");
  assert.equal(byName["p02-backwards.png"].canonical_view_bias_detected, true);
  assert.match(byName["p02-backwards.png"].reason, /screen faces the camera/);
  assert.equal(byName["p03-porch.png"].verdict, "PASS");
  assert.equal(byName["p03-porch.png"].device_detected, false);
});

test("batchCheckAffordance never passes a picture it could not check, and a PASS that reports the bias is a FAIL", async () => {
  const answers = {
    "a.png": () => { throw new Error("the vision service is down"); },
    "b.png": () => "this is not json",
    "c.png": () => "```json\n" + JSON.stringify({ device_detected: true, canonical_view_bias_detected: true, verdict: "PASS", reason: "" }) + "\n```",
    "d.png": async () => ({ device_detected: true, canonical_view_bias_detected: false, verdict: "PASS", reason: "" }),
  };
  const summary = await batchCheckAffordance({ files: Object.keys(answers), inspector: (f) => answers[f]() });
  assert.deepEqual(summary.results.map((r) => r.verdict), ["FAIL", "FAIL", "FAIL", "PASS"]);
  assert.equal(summary.unchecked, 2);
  assert.match(summary.results[0].reason, /^Not checked: the vision service is down/);
  assert.match(summary.results[1].reason, /^Not checked: the answer is not the JSON the rubric asks for/);
  assert.match(summary.results[2].reason, /screen faces the camera/, "an empty reason gets a plain one");
  assert.match(summary.results[3].reason, /screen faces the person/);
});

test("--batch scans a folder or a pattern, prints the table, and exits 1 on a backwards phone, 0 when all pass", async () => {
  const dir = pictureFolder();
  try {
    assert.deepEqual(listImages(dir).map((f) => path.basename(f)), Object.keys(ANSWERS), "pictures only, sorted");
    assert.deepEqual(listImages(path.join(dir, "*-porch.png")).map((f) => path.basename(f)), ["p03-porch.png"], "a pattern picks its pictures");
    const summary = await batchCheckAffordance({ dir });
    assert.equal(summary.failed, 1, "the default inspector reads <picture>.affordance.json");
    const table = formatBatchTable(summary);
    assert.match(table, /^File\s+Device\s+Canonical view bias\s+Verdict\s+Reason/);
    assert.match(table, /p02-backwards\.png\s+yes\s+yes\s+FAIL\s+The screen faces the camera/);
    assert.match(table, /p03-porch\.png\s+no\s+no\s+PASS/);
    assert.match(table, /3 picture\(s\): 2 PASS, 1 FAIL \(1 with no device\)\./);
    assert.match(table, /FIX: redraw each FAIL with "back chassis facing camera/);

    const fail = spawnSync(process.execPath, ["scripts/check-affordance.mjs", "--batch", dir], { encoding: "utf8" });
    assert.equal(fail.status, 1, fail.stderr);
    assert.match(fail.stdout, /p02-backwards\.png\s+yes\s+yes\s+FAIL/);
    assert.doesNotMatch(fail.stdout, /notes\.txt/);

    const pass = spawnSync(process.execPath, ["scripts/check-affordance.mjs", "--batch", path.join(dir, "p01-*.png")], { encoding: "utf8" });
    assert.equal(pass.status, 0, pass.stdout + pass.stderr);
    assert.match(pass.stdout, /1 picture\(s\): 1 PASS, 0 FAIL/);

    const json = spawnSync(process.execPath, ["scripts/check-affordance.mjs", "--batch", dir, "--json"], { encoding: "utf8" });
    assert.deepEqual(JSON.parse(json.stdout).results.map((r) => r.verdict), ["PASS", "FAIL", "PASS"]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("--batch says plainly when answers are missing, the folder is wrong, or an --inspector command answers instead", () => {
  const dir = pictureFolder({ withAnswers: false });
  try {
    const missing = spawnSync(process.execPath, ["scripts/check-affordance.mjs", "--batch", dir], { encoding: "utf8" });
    assert.equal(missing.status, 1, "a picture nobody has checked is not a pass");
    assert.match(missing.stdout, /Not checked: no inspection saved at p01-reading\.png\.affordance\.json/);
    assert.match(missing.stdout, /3 not checked/);

    const nowhere = spawnSync(process.execPath, ["scripts/check-affordance.mjs", "--batch", path.join(dir, "no-such-folder")], { encoding: "utf8" });
    assert.equal(nowhere.status, 2);
    assert.match(nowhere.stderr, /no folder or file at/);

    const inspector = path.join(dir, "inspect.mjs");
    fs.writeFileSync(inspector, `const f = process.argv[2]; console.log(JSON.stringify(f.includes("backwards") ? { device_detected: true, canonical_view_bias_detected: true, verdict: "FAIL", reason: "flipped" } : { device_detected: true, canonical_view_bias_detected: false, verdict: "PASS", reason: "fine" }));`);
    const viaCommand = spawnSync(process.execPath, ["scripts/check-affordance.mjs", "--batch", dir, "--inspector", `${process.execPath} ${inspector}`], { encoding: "utf8" });
    assert.equal(viaCommand.status, 1, viaCommand.stderr);
    assert.match(viaCommand.stdout, /p02-backwards\.png\s+yes\s+yes\s+FAIL\s+flipped/);
    assert.match(viaCommand.stdout, /3 picture\(s\): 2 PASS, 1 FAIL\./);
    const viaEnv = spawnSync(process.execPath, ["scripts/check-affordance.mjs", "--batch", dir], { encoding: "utf8", env: { ...process.env, AFFORDANCE_INSPECTOR: `${process.execPath} ${inspector}` } });
    assert.equal(viaEnv.status, 1);
    assert.match(viaEnv.stdout, /2 PASS, 1 FAIL/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
