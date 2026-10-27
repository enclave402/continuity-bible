import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NARRATIVE_QUESTIONS,
  optionsFor,
  softmax,
  answerFromLogprobs,
  heuristicFallback,
  evaluateNarrative,
  THRESHOLDS
} from '../scripts/jev-narrative-linter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '../scripts/jev-system-one.v1.schema.json');

test('JEV System One schema: valid JSON schema with all four primitives', () => {
  const raw = readFileSync(schemaPath, 'utf8');
  const schema = JSON.parse(raw);
  assert.equal(schema.title, 'JEV System One Decision Primitives and Narrative Questions Schema, Version 1');
  assert.ok(schema.$defs.question.properties.type.enum.includes('noul'));
  assert.ok(schema.$defs.question.properties.type.enum.includes('choice'));
  assert.ok(schema.$defs.question.properties.type.enum.includes('score'));
  assert.ok(schema.$defs.question.properties.type.enum.includes('box'));
});

test('optionsFor: correctly extracts options for question types', () => {
  assert.deepEqual(optionsFor({ type: 'noul' }), ['true', 'false']);
  assert.deepEqual(
    optionsFor({ type: 'choice', criteria: { opt_a: 'desc a', opt_b: 'desc b' } }),
    ['opt_a', 'opt_b']
  );
  assert.deepEqual(
    optionsFor({ type: 'score', criteria: ['low', 'mid', 'high'] }),
    ['low', 'mid', 'high']
  );
});

test('softmax and answerFromLogprobs: computes calibrated probability distribution', () => {
  const probs = softmax([0, 0]);
  assert.equal(probs.length, 2);
  assert.ok(Math.abs(probs[0] - 0.5) < 0.01);
  assert.ok(Math.abs(probs[1] - 0.5) < 0.01);

  const answer = answerFromLogprobs(
    { type: 'noul' },
    { '1]': 2.0, '2]': 0.0 }
  );
  assert.equal(answer.type, 'noul');
  assert.ok(answer.noul > 0.85);
});

test('heuristicFallback: validates clean Coach Hype narrative vs jargon-laden text', () => {
  const cleanCoachHype = `Read. No reply. I've opened my phone eleven times and the word hasn't changed.
Everyone I've ever lost went quiet first, so my body already knows how this ends.
On their side, a slow reply is usually about their day, not a verdict on me.
A fourth message in one night tells them my alarm is theirs to manage, and it isn't.`;

  const jargonDense = `The patient exhibits acute polyvagal autonomic dysregulation and maladaptive internal working model hyperactivation.
Clinical neurobiology dictates transdiagnostic epistemic psychopathology in avoidant relational dynamics.`;

  const cleanGrade = heuristicFallback('is_8th_grade', cleanCoachHype);
  assert.ok(cleanGrade.noul >= THRESHOLDS.noulPass, 'Clean sensory prose passes 8th-grade gate');

  const jargonGrade = heuristicFallback('is_8th_grade', jargonDense);
  assert.ok(jargonGrade.noul < THRESHOLDS.noulFail, 'Jargon-dense text fails 8th-grade gate');

  const cleanValidation = heuristicFallback('is_validation_first', cleanCoachHype);
  assert.ok(cleanValidation.noul >= THRESHOLDS.noulPass, 'Opening in crisis passes validation-first gate');

  const cleanBothSides = heuristicFallback('honors_both_sides', cleanCoachHype);
  assert.ok(cleanBothSides.noul >= THRESHOLDS.noulPass, 'Explaining both sides passes dual-audience gate');

  const cleanGrounding = heuristicFallback('storycraft_grounding', cleanCoachHype);
  assert.ok(cleanGrounding.noul >= THRESHOLDS.noulPass, 'Phone and real objects pass grounding gate');
});
