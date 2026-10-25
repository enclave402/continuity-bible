#!/usr/bin/env node
/**
 * scripts/check-story-coherence.mjs — Visual Coherence Issue-Classes Linter.
 *
 * WHY THIS EXISTS (Andrej Karpathy Principle):
 * AI image generators have no memory. Two consecutive story panels can disagree
 * on whether a scene is indoors or outdoors, whether it is raining, or whose
 * coat is on whose shoulders. This script defines four canonical issue classes
 * that any story project inherits from narrative-token-ssot.
 *
 * ISSUE CLASSES (see docs/3-reference/operator/CONTINUITY-ISSUE-CLASSES.md):
 * 1. ENVIRONMENTAL POLARITY — indoor description + outdoor visual (or inverse)
 * 2. PRECIPITATION CONTRADICTION — rain/wet in description but not in grounding
 * 3. WARDROBE OWNERSHIP — a garment owned by one character appears on another
 * 4. SCREEN AFFORDANCE — phone/screen content without a declared affordance guard
 *
 * The linter reads a scene registry (default: examples/scenes.json) and outputs
 * findings-per-slug as JSON lines. Exit code 0 if zero hard-fails.
 *
 *   node scripts/check-story-coherence.mjs [--registry <path>] [--edition <path>]
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();

function loadJson(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

// ── Polarity heuristics ────────────────────────────────────────────
const OUTDOOR = /\b(outdoor|sidewalk|street|fire escape|rain|umbrella|wet (street|sidewalk|pavement)|curb|crosswalk|alley|park bench|skyline|rooftop|awning|mist)\b/i;
const INDOOR  = /\b(indoor|booth|table|trattoria|café|restaurant|bedroom|kitchen|hallway|loft|studio|office|elevator|lobby|subway station|interior|living room)\b/i;
const RAIN    = /\b(rain|raining|wet|slick|mist|drizzle|downpour|umbrella|storm|puddle)\b/i;
const SCREEN  = /\b(phone|screen|iMessage|text (message|bubble|thread)|glowing screen|staring at|look(ing|s) down at.*phone|checks? (his|her|their) phone|typing indicator|glass screen|phone screen|taps? out (a|the) text)\b/i;

function inferPolarity(text) {
  const out = OUTDOOR.test(text);
  const in_ = INDOOR.test(text);
  if (out && !in_) return 'outdoor';
  if (in_ && !out) return 'indoor';
  if (out && in_) return 'mixed';
  return null;
}

/**
 * Check a single scene for all four issue classes.
 * Returns {level, slug, class, detail}[] 
 */
export function checkScene(slug, scene) {
  const findings = [];
  const visualDesc = scene.visualDescription || '';
  const visualTruth = scene.visualGroundTruth || '';
  const paragraphs = (scene.paragraphs || []).join(' ');
  const allText = [visualDesc, visualTruth, paragraphs].join(' ');
  const polarity = scene.environment_polarity || inferPolarity(allText);

  // 1. Environmental polarity
  if (polarity === 'indoor' && OUTDOOR.test(visualDesc)) {
    findings.push({ level: 'fail', slug, class: 'polarity',
      detail: `environment_polarity=indoor but visualDescription matches outdoor signals` });
  } else if (polarity === 'outdoor' && INDOOR.test(visualDesc)) {
    findings.push({ level: 'fail', slug, class: 'polarity',
      detail: `environment_polarity=outdoor but visualDescription matches indoor signals` });
  }

  // 2. Precipitation
  const descRain = RAIN.test(visualDesc);
  const truthRain = RAIN.test(visualTruth);
  if (descRain && !truthRain) {
    findings.push({ level: 'warn', slug, class: 'precipitation',
      detail: 'visualDescription references rain/wet but visualGroundTruth does not' });
  }
  if (polarity === 'indoor' && descRain) {
    findings.push({ level: 'warn', slug, class: 'precipitation',
      detail: 'rain/wet references in an indoor scene' });
  }

  // 3. Screen affordance guard
  if (SCREEN.test(allText) && !scene.screen_affordance) {
    findings.push({ level: 'warn', slug, class: 'screen',
      detail: 'phone/screen content without screen_affordance guard' });
  }

  // 4. Wardrobe check is cross-scene (handled by checkStoryCoherence)

  if (!findings.length) {
    findings.push({ level: 'pass', slug, class: 'all', detail: 'no issues detected' });
  }
  return findings;
}

/**
 * Cross-scene wardrobe check using edition order.
 */
export function checkWardrobe(scenes, edition) {
  const findings = [];
  const garmentState = {}; // item → current wearer

  // Known garments to track (declared in character-registry wardrobe props)
  const GARMENTS = [
    { name: 'coat', ownerPattern: /theo|{{theo-vance}}/i, pattern: /\b(coat|overcoat|charcoal wool)\b/i },
    { name: 'sweater', ownerPattern: /sam|{{sam-hayes}}/i, pattern: /\b(sweater|knit)\b/i },
    { name: 'headphones', ownerPattern: /theo|{{theo-vance}}/i, pattern: /\b(headphones?)\b/i },
  ];

  for (const g of GARMENTS) garmentState[g.name] = 'owner';

  const spreads = edition?.spreads || edition?.scenes || [];
  for (const ref of spreads) {
    const slug = ref.slug || ref;
    const scene = scenes[slug];
    if (!scene) continue;

    const text = [scene.visualDescription||'', scene.visualGroundTruth||'', 
                  (scene.paragraphs||[]).join(' ')].join(' ');

    for (const g of GARMENTS) {
      if (!g.pattern.test(text)) continue;
      // Simple check: is coat on Sam?
      const onSam = /(her|{{sam-hayes}}[^.]{0,40}(coat|overcoat|sweater))|((coat|overcoat|sweater)[^.]{0,30}(her|{{sam-hayes}}))/i;
      const onTheo = /\b(his|{{theo-vance}}[^.]{0,40}(coat|overcoat|headphones))|((coat|overcoat|headphones)[^.]{0,30}(his|{{theo-vance}}))\b/i;

      if (g.name === 'coat' && onSam.test(text) && !/placed|set|gave|handed|draped/.test(text)) {
        findings.push({ level: 'warn', slug, class: 'wardrobe',
          detail: `coat appears on non-owner without transfer verb (placed/set/gave/handed/draped)` });
      }
    }
  }

  return findings;
}

/**
 * Main entry: check all scenes in a registry.
 */
export function checkStoryCoherence({ registryPath, editionPath } = {}) {
  const regPath = registryPath || resolve(ROOT, 'examples/scenes.json');
  const edPath  = editionPath;

  const scenes = loadJson(regPath);
  if (!scenes) return { findings: [], error: `registry not found: ${regPath}` };

  const edition = edPath ? loadJson(edPath) : null;
  const allFindings = [];

  // Per-scene checks
  const entries = scenes.scenes || scenes;
  for (const [slug, scene] of Object.entries(entries)) {
    allFindings.push(...checkScene(slug, scene));
  }

  // Cross-scene wardrobe
  if (edition) {
    allFindings.push(...checkWardrobe(entries, edition));
  }

  // Deduplicate: keep highest severity per slug+class
  const byKey = {};
  for (const f of allFindings) {
    const key = `${f.slug}::${f.class}`;
    const existing = byKey[key];
    if (!existing || (f.level === 'fail' && existing.level !== 'fail')) {
      byKey[key] = f;
    }
  }

  // Remove blanket passes when there's a real finding
  const final = Object.values(byKey).filter(f => {
    if (f.level === 'pass') {
      return !Object.values(byKey).some(
        other => other.slug === f.slug && other.level !== 'pass' && other.class !== 'all'
      );
    }
    return true;
  });

  const fails = final.filter(f => f.level === 'fail');
  const warns = final.filter(f => f.level === 'warn');

  return { findings: final, fails, warns, total: final.length };
}

// CLI
function main() {
  const args = process.argv.slice(2);
  let registryPath = null;
  let editionPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--registry' && args[i+1]) registryPath = resolve(args[++i]);
    else if (args[i] === '--edition' && args[i+1]) editionPath = resolve(args[++i]);
  }

  const result = checkStoryCoherence({ registryPath, editionPath });

  if (result.error) {
    process.stderr.write(`${result.error}\n`);
    process.exit(1);
  }

  for (const f of result.findings) {
    process.stdout.write(JSON.stringify(f) + '\n');
  }

  process.stderr.write(`\ncoherence: ${result.total} findings (${result.fails.length} fail, ${result.warns.length} warn)\n`);

  if (result.fails.length) {
    process.stderr.write(`FAILS:\n`);
    for (const f of result.fails) {
      process.stderr.write(`  ${f.slug} [${f.class}]: ${f.detail}\n`);
    }
  }

  process.exit(result.fails.length ? 1 : 0);
}

// Only run CLI when executed directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^\.\//, ''))) {
  main();
}

export default checkStoryCoherence;