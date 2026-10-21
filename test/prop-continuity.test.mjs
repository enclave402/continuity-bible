import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  projectLaterality,
  validatePropLateralityRegistry,
  lintPromptLaterality
} from '../scripts/check-prop-continuity.mjs';

test('projectLaterality computes correct 2D screen projections across all camera facings', () => {
  // Intrinsic Left Wrist
  assert.equal(projectLaterality('ANATOMICAL_LEFT_WRIST', 'facing_camera'), 'SCREEN_RIGHT');
  assert.equal(projectLaterality('ANATOMICAL_LEFT_WRIST', 'back_to_camera'), 'SCREEN_LEFT');
  assert.equal(projectLaterality('ANATOMICAL_LEFT_WRIST', 'profile_facing_screen_left'), 'NEAR_SIDE_FOREGROUND');
  assert.equal(projectLaterality('ANATOMICAL_LEFT_WRIST', 'profile_facing_screen_right'), 'FAR_SIDE_OCCLUDED');

  // Intrinsic Right Wrist
  assert.equal(projectLaterality('ANATOMICAL_RIGHT_WRIST', 'facing_camera'), 'SCREEN_LEFT');
  assert.equal(projectLaterality('ANATOMICAL_RIGHT_WRIST', 'back_to_camera'), 'SCREEN_RIGHT');
  assert.equal(projectLaterality('ANATOMICAL_RIGHT_WRIST', 'profile_facing_screen_left'), 'FAR_SIDE_OCCLUDED');
  assert.equal(projectLaterality('ANATOMICAL_RIGHT_WRIST', 'profile_facing_screen_right'), 'NEAR_SIDE_FOREGROUND');
});

test('validatePropLateralityRegistry validates compliant Karpathian prop schemas', () => {
  const validRegistry = {
    characters: {
      "sam-hayes": {
        props: [
          {
            item_id: "sam-watch",
            name: "Tonneau watch",
            worn_on: "LEFT_WRIST_ONLY",
            intrinsic_laterality: "ANATOMICAL_LEFT_WRIST",
            screen_projection_rules: {
              facing_camera: "SCREEN_RIGHT",
              back_to_camera: "SCREEN_LEFT",
              profile_facing_screen_left: "NEAR_SIDE_FOREGROUND",
              profile_facing_screen_right: "FAR_SIDE_OCCLUDED"
            }
          }
        ]
      }
    }
  };

  const result = validatePropLateralityRegistry(validRegistry);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('validatePropLateralityRegistry rejects missing intrinsic_laterality or inverted projection rules', () => {
  const invalidRegistry = {
    characters: {
      "theo-vance": {
        props: [
          {
            item_id: "theo-watch",
            name: "Tank watch",
            worn_on: "LEFT_WRIST_ONLY"
            // Missing intrinsic_laterality and screen_projection_rules
          },
          {
            item_id: "inverted-watch",
            name: "Buggy watch",
            worn_on: "LEFT_WRIST_ONLY",
            intrinsic_laterality: "ANATOMICAL_LEFT_WRIST",
            screen_projection_rules: {
              facing_camera: "SCREEN_LEFT", // Inverted! Left wrist facing camera is screen right
              back_to_camera: "SCREEN_RIGHT"
            }
          }
        ]
      }
    }
  };

  const result = validatePropLateralityRegistry(invalidRegistry);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length >= 2, true);
  assert.match(result.errors[0], /missing "intrinsic_laterality"/i);
  assert.match(result.errors[2] || result.errors[1], /Invalid facing_camera projection/i);
});

test('lintPromptLaterality detects unprojected ambiguous prompts and passes disambiguated prompts', () => {
  // Ambiguous prompt: mixes screen split "Left:" with anatomical "left wrist" without projection
  const ambiguousPrompt = "Split macro plate. Left: Theo's left wrist checks the stepped tank watch. Right: Sam's phone glows.";
  const badResult = lintPromptLaterality(ambiguousPrompt);
  assert.equal(badResult.valid, false);
  assert.match(badResult.errors[0], /Ambiguous Laterality Conflation/i);

  // Disambiguated prompt: explicitly defines camera facing and screen side
  const clearPrompt = "Split macro plate. Screen-left plate: Theo faces camera; his own left wrist appears on screen-right checking the watch.";
  const goodResult = lintPromptLaterality(clearPrompt);
  assert.equal(goodResult.valid, true);
});
