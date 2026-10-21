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
 * 3. BATCH CHECK: It checks a whole folder of pictures at once and prints one plain table:
 *    which pictures pass, which fail, and why. One bad picture makes the command exit 1,
 *    so a build can stop before a backwards phone reaches a reader.
 *    This script never calls a model itself. Each picture's answer comes from the vision
 *    AI you already use: saved next to the picture as <picture>.affordance.json, or
 *    printed by a command you name with --inspector (or the AFFORDANCE_INSPECTOR setting).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const isImage = (f) => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase());

/** "renders/*.png" or "renders/**" as a regular expression over a path with forward slashes. */
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') { re += '.*'; i++; if (glob[i + 1] === '/') i++; }
    else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => !d.name.startsWith('.'))
    .flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}

/**
 * The picture files a --batch argument names: every picture in a folder (and its subfolders), or every picture a glob
 * such as "renders/*.png" matches. Sorted by path, so two runs print the same table. Throws when nothing is there.
 */
export function listImages(target) {
  if (!target) throw new Error('--batch needs a folder or a pattern, for example: --batch renders/ or --batch "renders/*.png"');
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) return walk(target).filter(isImage).sort();
  if (fs.existsSync(target)) return isImage(target) ? [target] : [];
  if (!/[*?]/.test(target)) throw new Error(`no folder or file at "${target}". Fix: check the path, or quote a pattern like "renders/*.png"`);
  const slashed = target.split(path.sep).join('/');
  const parts = slashed.split('/');
  const firstGlob = parts.findIndex((p) => /[*?]/.test(p));
  const base = parts.slice(0, firstGlob).join('/') || '.';
  if (!fs.existsSync(base)) throw new Error(`no folder at "${base}", where the pattern "${target}" starts`);
  const re = globToRegExp(slashed.replace(/^\.\//, ''));
  return walk(base)
    .filter((f) => isImage(f) && re.test(f.split(path.sep).join('/').replace(/^\.\//, '')))
    .sort();
}

/** The default inspector: the vision AI's answer saved next to the picture, as <picture>.affordance.json. */
export function sidecarInspector(file) {
  const answer = `${file}.affordance.json`;
  if (!fs.existsSync(answer)) throw new Error(`no inspection saved at ${path.basename(answer)}. Fix: give the picture and the --prompt rubric to a vision AI and save its JSON answer there, or name a checker with --inspector`);
  return fs.readFileSync(answer, 'utf8');
}

/** An inspector that runs a command of yours with the picture's path as its last argument and reads the JSON it prints. */
export function commandInspector(command) {
  const [cmd, ...cmdArgs] = command.trim().split(/\s+/);
  return (file) => {
    const r = spawnSync(cmd, [...cmdArgs, file], { encoding: 'utf8' });
    if (r.error) throw new Error(`the inspector "${cmd}" could not start: ${r.error.message}`);
    if (r.status !== 0) throw new Error(`the inspector "${cmd}" stopped with exit ${r.status}${r.stderr ? `: ${r.stderr.trim().split('\n')[0]}` : ''}`);
    return r.stdout;
  };
}

/** One picture's verdict in plain words, from the vision AI's answer (or the problem that kept it from being checked). */
function judge(file, raw, problem) {
  const row = { file, name: path.basename(file), device_detected: null, canonical_view_bias_detected: null, verdict: 'FAIL', reason: '' };
  if (problem) return { ...row, checked: false, reason: `Not checked: ${problem}` };
  const parsed = parseAffordanceResult(raw);
  if (parsed.error) return { ...row, checked: false, reason: `Not checked: the answer is not the JSON the rubric asks for (${parsed.error.replace(/^Failed to parse affordance result: /, '')})` };
  const d = parsed.details || {};
  const device = d.device_detected === true;
  const bias = d.canonical_view_bias_detected === true;
  const said = typeof d.reason === 'string' && d.reason.trim() ? d.reason.trim() : '';
  const out = { ...row, checked: true, device_detected: device, canonical_view_bias_detected: bias };
  if (!device) return { ...out, verdict: 'PASS', reason: said || 'No phone or tablet in the picture, so there is nothing to get backwards.' };
  // a "PASS" that also reports the bias contradicts itself; the bias wins, because a backwards phone is what this gate stops
  if (bias || d.verdict !== 'PASS') return { ...out, verdict: 'FAIL', reason: said || 'The screen faces the camera while the person looks at the back of the device.' };
  return { ...out, verdict: 'PASS', reason: said || 'The screen faces the person; the back of the device faces the camera.' };
}

/**
 * Checks many pictures for the backwards-phone mistake (Gaze-Affordance Decoupling) and counts the results.
 *   files: picture paths; or dir: a folder or glob to scan (see listImages).
 *   inspector: (file) => the vision AI's JSON answer for that picture (a string or an object; may return a Promise).
 *     Default: sidecarInspector, which reads <picture>.affordance.json.
 * Returns { total, passed, failed, no_device, unchecked, results }. A picture with no device passes. A picture whose
 * answer is missing or unreadable fails as "Not checked", never as a silent pass.
 */
export async function batchCheckAffordance({ files, dir, inspector = sidecarInspector } = {}) {
  const list = files ? [...files] : listImages(dir);
  const results = [];
  for (const file of list) {
    let raw, problem = '';
    try { raw = await inspector(file); } catch (err) { problem = err.message; }
    results.push(judge(file, raw, problem));
  }
  const passed = results.filter((r) => r.verdict === 'PASS').length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    no_device: results.filter((r) => r.checked && !r.device_detected).length,
    unchecked: results.filter((r) => !r.checked).length,
    results,
  };
}

/** The batch result as a plain text table with a one-line summary, for a person to read. */
export function formatBatchTable(summary) {
  const yesNo = (v) => (v === true ? 'yes' : v === false ? 'no' : '?');
  const head = ['File', 'Device', 'Canonical view bias', 'Verdict', 'Reason'];
  const rows = summary.results.map((r) => [r.name, yesNo(r.device_detected), yesNo(r.canonical_view_bias_detected), r.verdict, r.reason]);
  const widths = head.slice(0, 4).map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells) => cells.map((c, i) => (i < 4 ? c.padEnd(widths[i]) : c)).join('  ').trimEnd();
  const lines = [line(head), line(widths.map((w) => '-'.repeat(w)).concat('------')), ...rows.map(line)];
  const extra = [summary.no_device ? `${summary.no_device} with no device` : '', summary.unchecked ? `${summary.unchecked} not checked` : ''].filter(Boolean);
  lines.push('', `${summary.total} picture(s): ${summary.passed} PASS, ${summary.failed} FAIL${extra.length ? ` (${extra.join(', ')})` : ''}.`);
  if (summary.results.some((r) => r.checked && r.verdict === 'FAIL')) lines.push('FIX: redraw each FAIL with "back chassis facing camera, screen angled inward toward face" in the prompt.');
  if (summary.unchecked) lines.push('FIX: a "Not checked" picture has no answer yet; it counts as FAIL until a vision AI has looked at it.');
  return lines.join('\n');
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

  node scripts/check-affordance.mjs --batch <folder or "pattern/*.png"> [--inspector "<command>"] [--json]
      Checks every picture at once and prints a table: file, device, canonical view bias, verdict, reason.
      Each picture's answer is the vision AI's JSON, saved next to it as <picture>.affordance.json.
      Or name a command with --inspector (or set AFFORDANCE_INSPECTOR): it gets the picture's path
      as its last argument and prints the JSON. Exit 0 when every picture passes (or shows no device),
      exit 1 when any picture fails or has no answer yet, exit 2 when the folder or pattern is wrong.
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

  const batchIdx = args.indexOf('--batch');
  if (batchIdx !== -1) {
    const target = args[batchIdx + 1] && !args[batchIdx + 1].startsWith('--') ? args[batchIdx + 1] : '';
    const inspectorIdx = args.indexOf('--inspector');
    const command = (inspectorIdx !== -1 ? args[inspectorIdx + 1] : '') || process.env.AFFORDANCE_INSPECTOR || '';
    let files;
    try { files = listImages(target); } catch (err) { console.error(`check-affordance: ${err.message}`); process.exit(2); }
    if (!files.length) { console.error(`check-affordance: no pictures (${IMAGE_EXTENSIONS.join(', ')}) at "${target}"`); process.exit(2); }
    const summary = await batchCheckAffordance({ files, inspector: command ? commandInspector(command) : sidecarInspector });
    console.log(args.includes('--json') ? JSON.stringify(summary, null, 2) : formatBatchTable(summary));
    process.exit(summary.failed ? 1 : 0);
  }

  console.error('check-affordance: unknown arguments. Run with --help to see what it can do.');
  process.exit(2);
}
