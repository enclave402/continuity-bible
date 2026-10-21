#!/usr/bin/env node
/**
 * scripts/check-affordance.mjs — Universal Gaze-Affordance & Orientation Linter.
 *
 * WHY THIS EXISTS (Andrej Karpathy Principle):
 * When AI models draw a character holding a smartphone or tablet from the front,
 * they almost always make an annoying mistake: they turn the glowing screen outward toward
 * the camera lens so the viewer can see it, forcing the character to stare at the solid
 * metal back or camera bump!
 * In computer vision and cognitive science, this is called:
 * 1. "Canonical View Bias" (the AI prefers the most recognizable side of an object).
 * 2. "Gaze-Affordance Decoupling" (the character's eyes are looking at the back of the object
 *    rather than where the interactive screen actually is).
 *
 * HOW THIS FIXES IT:
 * 1. PROMPT GUARD: It checks your image prompt before generation to make sure you tell the AI:
 *    "back chassis facing camera, screen angled inward toward face".
 * 2. IMAGE INSPECTOR: It gives vision models a strict, simple rubric to check whether an
 *    image has the backwards-phone bug or passes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AFFORDANCE_INSPECTION_PROMPT = `
Look at the person in this picture holding or looking at a handheld device (like a smartphone or tablet):

1. Is the person looking down at a device?
2. Check the device's direction:
   - Does the screen face outward toward the camera lens (making the person look at the solid back chassis / camera bump)?
   - Or does the screen face inward toward the person's eyes, with the back chassis facing the camera?

EVALUATION RULES:
- PASS: The screen is turned toward the person's eyes (or the back of the phone faces the camera).
- FAIL: Gaze-Affordance Decoupling detected (the screen is turned outward toward the camera while the person stares at the back of the phone).

Respond strictly in JSON format:
{
  "device_detected": boolean,
  "canonical_view_bias_detected": boolean,
  "verdict": "PASS" | "FAIL",
  "reason": "1-sentence plain explanation"
}
`.trim();

export function parseAffordanceResult(rawJson) {
  try {
    const cleaned = typeof rawJson === 'string'
      ? rawJson.replace(/```(?:json)?/g, '').trim()
      : JSON.stringify(rawJson);
    const data = JSON.parse(cleaned);
    return {
      pass: data.verdict === 'PASS',
      details: data
    };
  } catch (err) {
    return {
      pass: false,
      error: `Failed to parse affordance result: ${err.message}`
    };
  }
}

/**
 * Checks if a prompt describing handheld device interaction includes essential
 * geometric orientation cues to prevent AI Canonical View Bias / backwards screen errors.
 */
export function checkPromptAffordanceGuards(promptText) {
  const text = (promptText || '').toLowerCase();
  const mentionsDevice = /phone|smartphone|screen|tablet|device|mobile/.test(text);

  if (!mentionsDevice) {
    return { relevant: false, pass: true };
  }

  // Check if camera is front-facing / looking at subject
  const isFrontOrFacing = /front view|medium shot|looking down at|three-quarter|facing camera|portrait/.test(text);
  if (!isFrontOrFacing) {
    return { relevant: true, pass: true };
  }

  // Check for gaze-affordance grounding tokens
  const hasOrientationGrounding = /back chassis|chassis facing|screen angled toward|screen faces (her|him|them|face|chest)|back of (the )?phone/.test(text);

  return {
    relevant: true,
    pass: hasOrientationGrounding,
    warning: hasOrientationGrounding ? null : 'Prompt describes character looking at a phone from front/medium view without specifying "back chassis facing camera" or "screen angled inward toward face". High risk of AI backwards-screen generation.'
  };
}

// CLI execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    console.log(`Gaze-Affordance & Orientation Tool (Fixes backwards phone/device AI errors)

WHY:
  AI image generators often flip phones backwards so the screen faces the camera instead of the person.
  This tool prevents that in your prompts and verifies your images.

HOW TO USE:
  node scripts/check-affordance.mjs --prompt
      Prints the inspection prompt to give to a vision AI (like ChatGPT, Claude, or Gemini).

  node scripts/check-affordance.mjs --check-prompt "<your image prompt>"
      Tests whether your prompt has the magic phrase ("back chassis facing camera") to prevent the error.

  node scripts/check-affordance.mjs --parse '<json output from vision AI>'
      Reads the vision AI's check and reports PASS or FAIL.
`);
    process.exit(0);
  }

  if (args.includes('--prompt')) {
    console.log(AFFORDANCE_INSPECTION_PROMPT);
    process.exit(0);
  }

  const promptIdx = args.indexOf('--check-prompt');
  if (promptIdx !== -1 && args[promptIdx + 1]) {
    const res = checkPromptAffordanceGuards(args[promptIdx + 1]);
    if (!res.pass) {
      console.warn(`\n⚠️ Affordance Warning:\n${res.warning}\n\nFIX: Add this phrase to your prompt: "back chassis facing camera, screen angled inward toward face".\n`);
      process.exit(1);
    } else {
      console.log('✅ check-affordance: Prompt includes proper orientation guardrails.');
      process.exit(0);
    }
  }

  const parseIdx = args.indexOf('--parse');
  if (parseIdx !== -1 && args[parseIdx + 1]) {
    const res = parseAffordanceResult(args[parseIdx + 1]);
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.pass ? 0 : 1);
  }
}
