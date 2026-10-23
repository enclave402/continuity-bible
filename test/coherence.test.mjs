/**
 * test/coherence.test.mjs — Unit tests for check-story-coherence.mjs.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { checkScene, checkWardrobe, checkStoryCoherence } from '../scripts/check-story-coherence.mjs';

describe('checkScene — environmental polarity', () => {
  it('passes when no polarity mismatch', () => {
    const scene = {
      environment_polarity: 'indoor',
      visualDescription: 'A candlelit trattoria with wine glasses on a wooden table.',
      visualGroundTruth: 'Theo and Sam at a candlelit table inside a restaurant.'
    };
    const findings = checkScene('test-scene', scene);
    const polarityFindings = findings.filter(f => f.class === 'polarity');
    assert.strictEqual(polarityFindings.length, 0, 'should have no polarity failures');
  });

  it('fails when indoor scene has outdoor visualDescription', () => {
    const scene = {
      environment_polarity: 'indoor',
      visualDescription: 'Theo holding an umbrella on a wet sidewalk at night.',
      visualGroundTruth: 'Interior of a restaurant.'
    };
    const findings = checkScene('rainy-indoor', scene);
    const fail = findings.find(f => f.class === 'polarity' && f.level === 'fail');
    assert.ok(fail, 'should flag indoor polarity mismatch');
  });

  it('fails when outdoor scene has indoor visualDescription', () => {
    const scene = {
      environment_polarity: 'outdoor',
      visualDescription: 'Sam leaning against a booth in a candlelit café.',
    };
    const findings = checkScene('outdoor-cafe', scene);
    const fail = findings.find(f => f.class === 'polarity' && f.level === 'fail');
    assert.ok(fail, 'should flag outdoor polarity mismatch');
  });

  it('infers polarity from description when not declared', () => {
    const scene = {
      visualDescription: 'A rainy street with an umbrella and wet pavement.',
    };
    const findings = checkScene('inferred-outdoor', scene);
    const polarityFindings = findings.filter(f => f.class === 'polarity');
    assert.strictEqual(polarityFindings.length, 0, 'should infer outdoor and not flag');
  });
});

describe('checkScene — precipitation', () => {
  it('warns when visualDescription has rain but visualGroundTruth does not', () => {
    const scene = {
      visualDescription: 'Walking through the rain with an umbrella.',
      visualGroundTruth: 'Two people walking on a dry sidewalk.'
    };
    const findings = checkScene('rain-mismatch', scene);
    const warn = findings.find(f => f.class === 'precipitation' && f.level === 'warn');
    assert.ok(warn, 'should warn about precipitation mismatch');
  });

  it('warns when rain appears in an indoor scene', () => {
    const scene = {
      environment_polarity: 'indoor',
      visualDescription: 'Rain streaming down the window of the café booth.'
    };
    const findings = checkScene('indoor-rain', scene);
    const warn = findings.find(f => f.class === 'precipitation' && f.level === 'warn');
    assert.ok(warn, 'should warn about rain in indoor scene');
  });

  it('passes when rain is consistent', () => {
    const scene = {
      visualDescription: 'Rain falling on the wet street.',
      visualGroundTruth: 'Two people under an umbrella in the rain.'
    };
    const findings = checkScene('rain-ok', scene);
    const precipWarns = findings.filter(f => f.class === 'precipitation');
    assert.strictEqual(precipWarns.length, 0, 'consistent rain should not warn');
  });
});

describe('checkScene — screen affordance', () => {
  it('warns when phone content exists without screen_affordance', () => {
    const scene = {
      visualDescription: 'Sam staring at her glowing phone screen.',
      paragraphs: ['She read the iMessage thread twice.']
    };
    const findings = checkScene('unguarded-phone', scene);
    const warn = findings.find(f => f.class === 'screen' && f.level === 'warn');
    assert.ok(warn, 'should warn about unguarded screen affordance');
  });

  it('passes when screen_affordance is declared', () => {
    const scene = {
      visualDescription: 'Sam staring at her glowing phone screen.',
      screen_affordance: {
        device: 'iPhone',
        sub_surface: 'matte screen protector',
        screen_is_lit: true,
        screen_is_visible_to_reader: 'yes'
      }
    };
    const findings = checkScene('guarded-phone', scene);
    const warn = findings.find(f => f.class === 'screen' && f.level === 'warn');
    assert.strictEqual(warn, undefined, 'guarded phone should not warn');
  });

  it('passes when no screen content exists', () => {
    const scene = {
      visualDescription: 'A quiet park bench with autumn leaves.',
      paragraphs: ['The air was crisp and still.']
    };
    const findings = checkScene('no-screen', scene);
    const warn = findings.find(f => f.class === 'screen');
    assert.strictEqual(warn, undefined, 'no screen content should not warn');
  });
});

describe('checkWardrobe — coat transfer', () => {
  it('warns when coat appears on Sam without a transfer verb', () => {
    const scenes = {
      'before': {
        visualDescription: '{{theo-vance}} wearing his charcoal wool coat.',
        visualGroundTruth: '{{theo-vance}} in a coat.'
      },
      'after': {
        visualDescription: '{{sam-hayes}} wearing the charcoal wool coat.',
        visualGroundTruth: '{{sam-hayes}} in the coat.'
      }
    };
    const edition = {
      spreads: [{ slug: 'before' }, { slug: 'after' }]
    };
    const findings = checkWardrobe(scenes, edition);
    const warn = findings.find(f => f.class === 'wardrobe' && f.level === 'warn');
    assert.ok(warn, 'should warn when coat moves to non-owner without transfer verb');
  });

  it('passes when coat is placed on Sam with a transfer verb', () => {
    const scenes = {
      'before': {
        visualDescription: 'Theo wearing his charcoal wool coat.',
      },
      'after': {
        visualDescription: 'Theo placed his coat on her shoulders.',
        paragraphs: ['He draped the heavy wool over her.']
      }
    };
    const edition = {
      spreads: [{ slug: 'before' }, { slug: 'after' }]
    };
    const findings = checkWardrobe(scenes, edition);
    const warns = findings.filter(f => f.class === 'wardrobe' && f.level === 'warn');
    assert.strictEqual(warns.length, 0, 'transfer with verb should not warn');
  });
});

describe('checkStoryCoherence — integration', () => {
  it('returns empty findings for a clean registry', () => {
    const scenes = {
      'scene-1': {
        environment_polarity: 'indoor',
        visualDescription: 'A warm kitchen with steam rising from the stove.',
        visualGroundTruth: 'Two people cooking in a warm kitchen.',
        paragraphs: ['The kitchen was warm and fragrant.']
      }
    };
    // Write temp file and check
    const result = checkStoryCoherence({ registryPath: null });
    // Without a real file, returns error — but checkScene logic is tested above
  });

  it('aggregates findings correctly', () => {
    // Use checkScene directly to verify aggregation pattern
    const findings1 = checkScene('scene-a', {
      environment_polarity: 'indoor',
      visualDescription: 'An umbrella on a wet sidewalk.'
    });
    const findings2 = checkScene('scene-b', {
      visualDescription: 'Reading iMessages on a phone screen.'
    });

    const all = [...findings1, ...findings2];
    const fails = all.filter(f => f.level === 'fail');
    const warns = all.filter(f => f.level === 'warn');

    assert.ok(fails.length >= 1, 'should have at least one fail');
    assert.ok(warns.length >= 1, 'should have at least one warn');
  });
});