// Inverted prop index, version 1: the schema (scripts/prop-index.v1.schema.json) read through the
// repository's own zero-dependency validator, then the two things a schema cannot say on its own:
// chirality (the side a prop is worn on never flips) and the bijection between the scene matrix and
// each prop's timeline (every scene counted once, the counts add up).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validate } from "../scripts/lib.mjs";
import { projectLaterality } from "../scripts/check-prop-continuity.mjs";

const schemaPath = fileURLToPath(new URL("../scripts/prop-index.v1.schema.json", import.meta.url));
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

const SIDE_OF = {
  LEFT_WRIST_ONLY: "left",
  RIGHT_WRIST_ONLY: "right",
  ANATOMICAL_LEFT_WRIST: "left",
  ANATOMICAL_RIGHT_WRIST: "right",
  ANATOMICAL_LEFT_HAND: "left",
  ANATOMICAL_RIGHT_HAND: "right",
};

/**
 * Chirality and bijection problems in a schema-valid inverted prop index.
 * @param {{props: Record<string, object>}} index
 * @returns {string[]} one line per problem; empty when the index holds
 */
function propIndexProblems(index) {
  const problems = [];
  for (const [key, prop] of Object.entries(index.props)) {
    const at = `props.${key}`;
    if (prop.item_id !== key) problems.push(`${at}: keyed by "${key}" but item_id is "${prop.item_id}"`);

    // chirality: the worn side, the anatomical side and the projection rules agree
    const wornSide = SIDE_OF[prop.worn_on];
    const anatomicalSide = SIDE_OF[prop.intrinsic_laterality];
    if (wornSide && anatomicalSide !== wornSide) {
      problems.push(`${at}: worn_on ${prop.worn_on} but intrinsic_laterality ${prop.intrinsic_laterality}`);
    }
    if (anatomicalSide) {
      for (const facing of ["facing_camera", "back_to_camera"]) {
        const expected = projectLaterality(prop.intrinsic_laterality, facing);
        if (prop.screen_projection_rules[facing] !== expected) {
          problems.push(`${at}.screen_projection_rules.${facing}: ${prop.screen_projection_rules[facing]}, expected ${expected}`);
        }
      }
    }

    // bijection: each scene once, and the counts are the timeline's counts
    const seen = new Set();
    const count = { worn: 0, removed: 0, exempt: 0 };
    prop.timeline.forEach((entry, i) => {
      const where = `${at}.timeline[${i}] (${entry.slug})`;
      if (seen.has(entry.slug)) problems.push(`${where}: scene listed twice`);
      seen.add(entry.slug);
      count[entry.presence] += 1;
      const lateral = entry.side === "left" || entry.side === "right";
      if (entry.presence === "worn" && anatomicalSide && lateral && entry.side !== anatomicalSide) {
        problems.push(`${where}: chirality flip, worn on the ${entry.side} but the prop is ${prop.worn_on}`);
      }
      if (entry.presence === "worn" && anatomicalSide && entry.camera_facing && entry.projected_screen_side) {
        let expected;
        try {
          expected = projectLaterality(prop.intrinsic_laterality, entry.camera_facing);
        } catch {
          problems.push(`${where}: unknown camera_facing "${entry.camera_facing}"`);
        }
        if (expected && entry.projected_screen_side !== expected) {
          problems.push(`${where}: projected_screen_side ${entry.projected_screen_side}, expected ${expected} for ${entry.camera_facing}`);
        }
      }
    });
    if (prop.timeline.length !== prop.total_scenes) problems.push(`${at}: total_scenes ${prop.total_scenes} but the timeline holds ${prop.timeline.length}`);
    if (prop.worn_count !== count.worn) problems.push(`${at}: worn_count ${prop.worn_count} but ${count.worn} worn`);
    if (prop.removed_count !== count.removed) problems.push(`${at}: removed_count ${prop.removed_count} but ${count.removed} removed`);
    if (prop.total_scenes !== prop.worn_count + prop.removed_count + count.exempt) {
      problems.push(`${at}: total_scenes ${prop.total_scenes} is not worn ${prop.worn_count} + removed ${prop.removed_count} + exempt ${count.exempt}`);
    }
  }
  return problems;
}

/** A representative index: one left-wrist prop across the example story's five placed scenes. */
function fixture() {
  return {
    $schema: "./prop-index.v1.schema.json",
    _about: "Built from the scene matrix; never edited by hand.",
    version: 1,
    generated_at: "2026-10-21T12:00:00-04:00",
    props: {
      "sam-watch": {
        item_id: "sam-watch",
        character: "sam-hayes",
        geometry: "tonneau case, leather strap",
        worn_on: "LEFT_WRIST_ONLY",
        intrinsic_laterality: "ANATOMICAL_LEFT_WRIST",
        screen_projection_rules: { facing_camera: "SCREEN_RIGHT", back_to_camera: "SCREEN_LEFT" },
        total_scenes: 5,
        worn_count: 3,
        removed_count: 1,
        timeline: [
          { slug: "the-porch", spread_number: 1, story_day: "day-1", in_universe_time: "21:40", presence: "worn", side: "left", camera_facing: "facing_camera", projected_screen_side: "SCREEN_RIGHT", image_filename: "the-porch.png", thumbnail_path: "thumbs/the-porch.png" },
          { slug: "read-at-1152", spread_number: 2, story_day: "day-1", in_universe_time: "23:52", presence: "worn", side: "left", camera_facing: "back_to_camera", projected_screen_side: "SCREEN_LEFT" },
          { slug: "across-town", spread_number: 3, story_day: "day-1", presence: "exempt", side: "none", reason: "the wearer is not in the scene" },
          { slug: "morning-at-the-workbench", spread_number: 4, story_day: "day-2", presence: "removed", side: "none", reason: "taken off to wash up" },
          { slug: "the-text-sent", spread_number: 5, story_day: "day-2", presence: "worn", side: "unspecified" },
        ],
      },
    },
  };
}

test("schema: a representative inverted prop index is valid and holds its invariants", () => {
  const index = fixture();
  assert.deepEqual(validate(schema, index), []);
  assert.deepEqual(propIndexProblems(index), []);
});

test("schema: an empty props map and a prop with no scenes are valid", () => {
  assert.deepEqual(validate(schema, { version: 1, props: {} }), []);
  const index = fixture();
  Object.assign(index.props["sam-watch"], { total_scenes: 0, worn_count: 0, removed_count: 0, timeline: [] });
  assert.deepEqual(validate(schema, index), []);
  assert.deepEqual(propIndexProblems(index), []);
});

test("schema: the draft and the top-level contract are as specified", () => {
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.deepEqual(schema.required, ["version", "props"]);
  assert.equal(schema.additionalProperties, false);
});

for (const field of ["item_id", "timeline", "worn_count"]) {
  test(`schema: a prop missing ${field} fails`, () => {
    const index = fixture();
    delete index.props["sam-watch"][field];
    assert.deepEqual(validate(schema, index), [`$.props.sam-watch: missing ${field}`]);
  });
}

test("schema: an index missing version or props fails", () => {
  assert.deepEqual(validate(schema, { props: {} }), ["$: missing version"]);
  assert.deepEqual(validate(schema, { version: 1 }), ["$: missing props"]);
});

test("schema: a timeline entry missing presence fails", () => {
  const index = fixture();
  delete index.props["sam-watch"].timeline[0].presence;
  assert.deepEqual(validate(schema, index), ["$.props.sam-watch.timeline[0]: missing presence"]);
});

test("schema: enum violations fail", () => {
  const cases = [
    [(p) => { p.worn_on = "ANKLE"; }, "$.props.sam-watch.worn_on: must be one of"],
    [(p) => { p.intrinsic_laterality = "LEFT"; }, "$.props.sam-watch.intrinsic_laterality: must be one of"],
    [(p) => { p.screen_projection_rules.facing_camera = "SCREEN_CENTER"; }, "$.props.sam-watch.screen_projection_rules.facing_camera: must be one of"],
    [(p) => { p.timeline[0].presence = "missing"; }, "$.props.sam-watch.timeline[0].presence: must be one of"],
    [(p) => { p.timeline[0].side = "LEFT"; }, "$.props.sam-watch.timeline[0].side: must be one of"],
  ];
  for (const [mutate, prefix] of cases) {
    const index = fixture();
    mutate(index.props["sam-watch"]);
    const problems = validate(schema, index);
    assert.equal(problems.length, 1, problems.join("; "));
    assert.ok(problems[0].startsWith(prefix), problems[0]);
  }
});

test("schema: types, minimums and unknown fields fail", () => {
  const cases = [
    [(i) => { i.version = 0; }, "$.version: below 1"],
    [(i) => { i.version = "1"; }, "$.version: expected integer, got string"],
    [(i) => { i.props["sam-watch"].worn_count = -1; }, "$.props.sam-watch.worn_count: below 0"],
    [(i) => { i.props["sam-watch"].timeline[0].spread_number = 0; }, "$.props.sam-watch.timeline[0].spread_number: below 1"],
    [(i) => { i.props["sam-watch"].exempt_count = 1; }, "$.props.sam-watch: unknown field exempt_count"],
    [(i) => { i.props["sam-watch"].timeline[0].colour = "red"; }, "$.props.sam-watch.timeline[0]: unknown field colour"],
    [(i) => { i.props["sam-watch"].screen_projection_rules.profile = "SCREEN_LEFT"; }, "$.props.sam-watch.screen_projection_rules: unknown field profile"],
    [(i) => { i.extra = true; }, "$: unknown field extra"],
  ];
  for (const [mutate, expected] of cases) {
    const index = fixture();
    mutate(index);
    assert.deepEqual(validate(schema, index), [expected]);
  }
});

test("chirality: a left-wrist prop worn on the right in a scene is rejected", () => {
  const index = fixture();
  index.props["sam-watch"].timeline[0].side = "right";
  assert.deepEqual(validate(schema, index), [], "the schema alone cannot see a flip");
  assert.deepEqual(propIndexProblems(index), [
    "props.sam-watch.timeline[0] (the-porch): chirality flip, worn on the right but the prop is LEFT_WRIST_ONLY",
  ]);
});

test("chirality: worn_on and intrinsic_laterality on opposite sides are rejected", () => {
  const index = fixture();
  const prop = index.props["sam-watch"];
  prop.intrinsic_laterality = "ANATOMICAL_RIGHT_WRIST";
  prop.screen_projection_rules = { facing_camera: "SCREEN_LEFT", back_to_camera: "SCREEN_RIGHT" };
  const problems = propIndexProblems(index);
  assert.ok(problems.includes("props.sam-watch: worn_on LEFT_WRIST_ONLY but intrinsic_laterality ANATOMICAL_RIGHT_WRIST"), problems.join("\n"));
});

test("chirality: projection rules that mirror the wrong way are rejected", () => {
  const index = fixture();
  index.props["sam-watch"].screen_projection_rules = { facing_camera: "SCREEN_LEFT", back_to_camera: "SCREEN_RIGHT" };
  assert.deepEqual(propIndexProblems(index), [
    "props.sam-watch.screen_projection_rules.facing_camera: SCREEN_LEFT, expected SCREEN_RIGHT",
    "props.sam-watch.screen_projection_rules.back_to_camera: SCREEN_RIGHT, expected SCREEN_LEFT",
  ]);
});

test("chirality: a scene's projected screen side must follow its camera facing", () => {
  const index = fixture();
  index.props["sam-watch"].timeline[1].projected_screen_side = "SCREEN_RIGHT";
  assert.deepEqual(propIndexProblems(index), [
    "props.sam-watch.timeline[1] (read-at-1152): projected_screen_side SCREEN_RIGHT, expected SCREEN_LEFT for back_to_camera",
  ]);
});

test("chirality: a right-wrist prop projects as the mirror of a left-wrist one", () => {
  const index = fixture();
  const prop = index.props["sam-watch"];
  prop.worn_on = "RIGHT_WRIST_ONLY";
  prop.intrinsic_laterality = "ANATOMICAL_RIGHT_WRIST";
  prop.screen_projection_rules = { facing_camera: "SCREEN_LEFT", back_to_camera: "SCREEN_RIGHT" };
  Object.assign(prop.timeline[0], { side: "right", projected_screen_side: "SCREEN_LEFT" });
  Object.assign(prop.timeline[1], { side: "right", projected_screen_side: "SCREEN_RIGHT" });
  assert.deepEqual(validate(schema, index), []);
  assert.deepEqual(propIndexProblems(index), []);
});

test("chirality: side is not checked for a prop with no laterality or a scene where it is not worn", () => {
  const index = fixture();
  const prop = index.props["sam-watch"];
  prop.timeline[3].side = "right"; // removed: the side it was not worn on says nothing
  assert.deepEqual(propIndexProblems(index), []);
  Object.assign(prop, { worn_on: "NECK", intrinsic_laterality: "NONE" });
  prop.timeline[0].side = "right";
  assert.deepEqual(propIndexProblems(index), []);
});

test("invariant: total_scenes === worn_count + removed_count + exempt count", () => {
  const index = fixture();
  const prop = index.props["sam-watch"];
  const exempt = prop.timeline.filter((e) => e.presence === "exempt").length;
  assert.equal(prop.total_scenes, prop.worn_count + prop.removed_count + exempt);

  prop.total_scenes = 4;
  assert.deepEqual(propIndexProblems(index), [
    "props.sam-watch: total_scenes 4 but the timeline holds 5",
    "props.sam-watch: total_scenes 4 is not worn 3 + removed 1 + exempt 1",
  ]);
});

test("bijection: counts that disagree with the timeline are rejected", () => {
  const index = fixture();
  index.props["sam-watch"].worn_count = 4;
  index.props["sam-watch"].removed_count = 0;
  assert.deepEqual(propIndexProblems(index), [
    "props.sam-watch: worn_count 4 but 3 worn",
    "props.sam-watch: removed_count 0 but 1 removed",
  ]);
});

test("bijection: a scene listed twice in one prop's timeline is rejected", () => {
  const index = fixture();
  const prop = index.props["sam-watch"];
  prop.timeline[4] = { ...prop.timeline[0], spread_number: 5 };
  const problems = propIndexProblems(index);
  assert.ok(problems.includes("props.sam-watch.timeline[4] (the-porch): scene listed twice"), problems.join("\n"));
});

test("bijection: a prop keyed by an id other than its item_id is rejected", () => {
  const index = fixture();
  index.props["other-watch"] = index.props["sam-watch"];
  delete index.props["sam-watch"];
  assert.deepEqual(propIndexProblems(index), ['props.other-watch: keyed by "other-watch" but item_id is "sam-watch"']);
});
