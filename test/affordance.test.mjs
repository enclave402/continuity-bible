import test from "node:test";
import assert from "node:assert/strict";
import { parseAffordanceResult, checkPromptAffordanceGuards, AFFORDANCE_INSPECTION_PROMPT } from "../scripts/check-affordance.mjs";

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
