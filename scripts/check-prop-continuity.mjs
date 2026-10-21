#!/usr/bin/env node
/**
 * scripts/check-prop-continuity.mjs
 * 
 * CONTINUITY GATE: Intrinsic Anatomical Laterality & Screen Projection Linter
 * 
 * Enforces the Andrej Karpathy self-announcing architecture across prop registries
 * and compiled scene prompts to eliminate Bilateral Chirality Inversion in diffusion models.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Deterministically projects an intrinsic anatomical laterality coordinate
 * into 2D viewer screen space given the subject's camera facing.
 * 
 * @param {'ANATOMICAL_LEFT_WRIST'|'ANATOMICAL_RIGHT_WRIST'|'ANATOMICAL_LEFT_HAND'|'ANATOMICAL_RIGHT_HAND'} intrinsicLaterality
 * @param {'facing_camera'|'back_to_camera'|'profile_facing_screen_left'|'profile_facing_screen_right'} facing
 * @returns {string} Projected screen-space position
 */
export function projectLaterality(intrinsicLaterality, facing) {
  const isLeft = intrinsicLaterality.includes('LEFT');
  
  switch (facing) {
    case 'facing_camera':
      // Facing viewer: intrinsic left is viewer's screen right
      return isLeft ? 'SCREEN_RIGHT' : 'SCREEN_LEFT';
    case 'back_to_camera':
      // Back to viewer: intrinsic left is viewer's screen left
      return isLeft ? 'SCREEN_LEFT' : 'SCREEN_RIGHT';
    case 'profile_facing_screen_left':
      // Profiling left: intrinsic left is near camera (foreground), right is occluded
      return isLeft ? 'NEAR_SIDE_FOREGROUND' : 'FAR_SIDE_OCCLUDED';
    case 'profile_facing_screen_right':
      // Profiling right: intrinsic right is near camera (foreground), left is occluded
      return isLeft ? 'FAR_SIDE_OCCLUDED' : 'NEAR_SIDE_FOREGROUND';
    default:
      throw new Error(`Unknown character facing orientation: "${facing}"`);
  }
}

/**
 * Validates a wardrobe and props registry object against Karpathian laterality rules.
 * 
 * @param {object} registry
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePropLateralityRegistry(registry) {
  const errors = [];
  const characters = registry.characters || {};

  for (const [charId, charData] of Object.entries(characters)) {
    const props = charData.props || [];
    for (const prop of props) {
      const isWristProp = prop.worn_on === 'LEFT_WRIST_ONLY' || prop.worn_on === 'RIGHT_WRIST_ONLY';
      
      if (isWristProp) {
        if (!prop.intrinsic_laterality) {
          errors.push(`Character "${charId}" prop "${prop.item_id || prop.name}": Worn on "${prop.worn_on}" but missing "intrinsic_laterality"`);
        }
        if (!prop.screen_projection_rules) {
          errors.push(`Character "${charId}" prop "${prop.item_id || prop.name}": Missing "screen_projection_rules" coordinate mapping matrix`);
        } else {
          // Verify projection rules match mathematical specification
          const expectedFacing = prop.worn_on === 'LEFT_WRIST_ONLY' ? 'SCREEN_RIGHT' : 'SCREEN_LEFT';
          const expectedBack = prop.worn_on === 'LEFT_WRIST_ONLY' ? 'SCREEN_LEFT' : 'SCREEN_RIGHT';
          
          if (prop.screen_projection_rules.facing_camera !== expectedFacing) {
            errors.push(`Character "${charId}" prop "${prop.item_id}": Invalid facing_camera projection "${prop.screen_projection_rules.facing_camera}", expected "${expectedFacing}"`);
          }
          if (prop.screen_projection_rules.back_to_camera !== expectedBack) {
            errors.push(`Character "${charId}" prop "${prop.item_id}": Invalid back_to_camera projection "${prop.screen_projection_rules.back_to_camera}", expected "${expectedBack}"`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Lints a scene action prompt for unprojected or contradictory laterality instructions.
 * 
 * @param {string} promptText
 * @param {object} options
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function lintPromptLaterality(promptText, options = {}) {
  const errors = [];
  
  // Failure Mode: Mixing screen macro tags with bare anatomical left/right without disambiguation
  // e.g. "Left: Theo's left wrist checks the watch" -> Ambiguity between screen-left plate and body-left wrist
  const hasScreenSplit = /Split macro plate|Left:|Right:/i.test(promptText);
  const hasBareAnatomicalLeft = /\bleft wrist\b/i.test(promptText);
  const hasBareAnatomicalRight = /\bright wrist\b/i.test(promptText);

  if (hasScreenSplit && (hasBareAnatomicalLeft || hasBareAnatomicalRight)) {
    const hasDisambiguatedFacing = /facing camera|screen-left plate|screen-right plate|his own left wrist|her own left wrist/i.test(promptText);
    if (!hasDisambiguatedFacing) {
      errors.push(
        `Ambiguous Laterality Conflation: Prompt mixes screen-space split plates ("Left:/Right:") ` +
        `with intrinsic anatomical limbs ("left wrist / right wrist") without explicit camera projection ` +
        `("his own left wrist appearing on screen-right").`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// CLI Execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const targetPath = process.argv[2] || path.join(__dirname, '../examples/continuity/wardrobe-and-props.json');
  
  if (!fs.existsSync(targetPath)) {
    console.error(`Registry file not found at: ${targetPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(targetPath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`Invalid JSON in ${targetPath}:`, err.message);
    process.exit(1);
  }

  const result = validatePropLateralityRegistry(data);
  if (!result.valid) {
    console.error(`\n❌ Prop Continuity Gate Failed (${result.errors.length} errors):\n`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  } else {
    console.log(`\n✅ Prop Continuity Gate Passed: All props conform to Karpathian intrinsic laterality and screen projection standards.\n`);
    process.exit(0);
  }
}
