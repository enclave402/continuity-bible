// Run from the repo root: npm test. The single mutation gate (scripts/mutate.mjs): every command on a temp copy of the
// example story, checked where the change is consumed (the built edition, parked-art.json, the worklog entry, the story
// gates), and every invariant's refusal path: exit 1 with the fix, and every file left exactly as it was.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  parseArgs, mergePatch, losses, isSubsequence, diffJson, typedNames, castProblems, propIdProblems,
  blockingFor, screenSide, canonicalWrist, lateralityProblems, Refusal,
} from "../scripts/mutate.mjs";
import { loadRegistry } from "../scripts/lib.mjs";

const SKIP = new Set([".git", "node_modules", ".worktrees", ".context", "research"]);
const STORY = "examples/story";
const STATE_FILES = [`${STORY}/scenes.json`, `${STORY}/editions/sam-first.json`, `${STORY}/editions/theo-first.json`, `${STORY}/parked-art.json`, `${STORY}/built/sam-first.txt`, `${STORY}/built/theo-first.txt`];
const WATCH = { name: "the tonneau watch", kind: "prop", story: "main-story", role: "a wrist prop for the laterality tests", prompt_tokens: "a gold tonneau watch on a leather strap", negative_tokens: ["round watch"] };
const WARDROBE = {
  characters: {
    "sam-hayes": {
      props: [{
        item_id: "sam-tonneau-watch", name: "tonneau watch", worn_on: "LEFT_WRIST_ONLY", intrinsic_laterality: "ANATOMICAL_LEFT_WRIST",
        screen_projection_rules: { facing_camera: "SCREEN_RIGHT", back_to_camera: "SCREEN_LEFT", profile_facing_screen_left: "NEAR_SIDE_FOREGROUND", profile_facing_screen_right: "FAR_SIDE_OCCLUDED" },
      }],
    },
  },
};
const NEW_SCENE = {
  title: "The first try",
  part: "Part one: six hours",
  narrator: "{{chloe-jenkins}}",
  characters: ["{{sam-hayes}}", "{{chloe-jenkins}}"],
  props: ["cracked-phone"],
  paragraphs: ["{{chloe-jenkins}} turned the lamp toward the table, and {{sam-hayes}} watched the screen."],
  picture: "A kitchen table under a lamp set in the wrong place, a phone face up.",
  time: "Thursday, 11:55 PM",
  layout: "single",
  art: ["main_read-at-1152-first-try.png"],
};

/** A temp copy of the repository with an empty story-mutation log, so no test ever writes this repository's own trail. */
function fixture({ watch = false, wardrobe = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-mutate-"));
  fs.cpSync(process.cwd(), dir, { recursive: true, filter: (src) => !path.relative(process.cwd(), src).split(path.sep).some((p) => SKIP.has(p)) });
  fs.mkdirSync(path.join(dir, "logs"), { recursive: true });
  fs.writeFileSync(path.join(dir, "logs", "story-mutations.jsonl"), "");
  if (watch) edit(dir, "character-registry.json", (j) => { j.characters["sam-tonneau-watch"] = WATCH; });
  if (wardrobe) fs.writeFileSync(path.join(dir, STORY, "wardrobe-and-props.json"), JSON.stringify(WARDROBE, null, 2) + "\n");
  return dir;
}
const cleanup = (dir) => fs.rmSync(dir, { recursive: true, force: true });
const read = (dir, rel) => JSON.parse(fs.readFileSync(path.join(dir, rel), "utf8"));
function edit(dir, rel, fn) { const j = read(dir, rel); fn(j); fs.writeFileSync(path.join(dir, rel), JSON.stringify(j, null, 2) + "\n"); }
const put = (dir, name, value) => { const f = path.join(dir, name); fs.writeFileSync(f, JSON.stringify(value, null, 2) + "\n"); return f; };
const mutate = (dir, ...args) => spawnSync(process.execPath, [path.join(dir, "scripts", "mutate.mjs"), ...args], { cwd: dir, encoding: "utf8" });
const story = (dir, ...args) => spawnSync(process.execPath, [path.join(dir, "scripts", "story.mjs"), ...args], { cwd: dir, encoding: "utf8" });
const entries = (dir) => fs.readFileSync(path.join(dir, "logs", "story-mutations.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const snapshot = (dir) => Object.fromEntries(STATE_FILES.map((f) => [f, fs.readFileSync(path.join(dir, f), "utf8")]));
const AUTHOR = ["--author", "agent:test"];

/** Run a command that must be refused: exit `code`, the expected words on stderr, no file changed, nothing logged. */
function refused(dir, args, pattern, code = 1) {
  const before = snapshot(dir);
  const logged = entries(dir).length;
  const r = mutate(dir, ...args);
  assert.equal(r.status, code, `expected exit ${code}, got ${r.status}\n${r.stdout}${r.stderr}`);
  assert.match(r.stderr, pattern);
  assert.deepEqual(snapshot(dir), before, "a refused change must leave every file as it was");
  assert.equal(entries(dir).length, logged, "a refused change is not logged");
  return r;
}

// ---- the pure parts ----

test("parseArgs takes a command, a story folder and value flags, and refuses anything else with exit 2", () => {
  assert.deepEqual(parseArgs(["verify", "examples/story"]), { command: "verify", dir: "examples/story", flags: {} });
  assert.deepEqual(parseArgs(["retire-scene", "s", "--slug", "a", "--owner-auth", "yes"]).flags, { slug: "a", "owner-auth": "yes" });
  for (const argv of [["delete-scene", "s"], ["verify"], ["verify", "s", "--force", "x"], ["add-scene", "s", "--slug"], ["verify", "s", "extra"], ["verify", "s", "--slug", "a", "--slug", "b"]]) {
    assert.throws(() => parseArgs(argv), (e) => e instanceof Refusal && e.exitCode === 2, argv.join(" "));
  }
});

test("a merge patch adds, replaces and removes (null), and losses() names every value a change would lose", () => {
  const scene = { title: "A", paragraphs: ["one", "two"], art: ["a.png"] };
  assert.deepEqual(mergePatch(scene, { footnote: "f" }), { ...scene, footnote: "f" });
  assert.deepEqual(mergePatch(scene, { title: null }), { paragraphs: ["one", "two"], art: ["a.png"] });
  assert.deepEqual(losses(scene, mergePatch(scene, { footnote: "f", paragraphs: ["zero", "one", "between", "two", "three"] })), [], "additions anywhere in a list keep every old item in order");
  assert.match(losses(scene, mergePatch(scene, { title: null })).join(), /title would be removed/);
  assert.match(losses(scene, mergePatch(scene, { title: "B" })).join(), /title would be overwritten: "A" -> "B"/);
  assert.match(losses(scene, mergePatch(scene, { paragraphs: ["one"] })).join(), /paragraphs would drop or replace 1 item/);
  assert.match(losses(scene, mergePatch(scene, { paragraphs: ["two", "one"] })).join(), /paragraphs would drop or replace/, "reordering loses the order");
  assert.match(losses({ d: { speaker: "x", text: "y" } }, { d: { speaker: "x" } }).join(), /d\.text would be removed/);
  assert.equal(isSubsequence([], ["a"]), true);
  assert.equal(isSubsequence(["a", "b"], ["b", "a"]), false);
  assert.deepEqual(diffJson({ a: 1, b: [1] }, { a: 2, c: 3, b: [1] }), [{ path: "a", op: "replace", before: 1, after: 2 }, { path: "c", op: "add", after: 3 }]);
});

test("the projection: facing the camera the left wrist is on screen-right, back to the camera screen-left, profile needs a direction", () => {
  assert.deepEqual(blockingFor("left", "facing"), { intrinsic_wrist: "left", camera_facing: "facing", screen_side: "SCREEN_RIGHT" });
  assert.equal(blockingFor("left", "back").screen_side, "SCREEN_LEFT");
  assert.equal(blockingFor("right", "facing").screen_side, "SCREEN_LEFT");
  assert.equal(blockingFor("right", "back").screen_side, "SCREEN_RIGHT");
  assert.deepEqual(blockingFor("left", "profile", "screen-left"), { intrinsic_wrist: "left", camera_facing: "profile", profile_toward: "screen-left", screen_side: "NEAR_SIDE_FOREGROUND" });
  assert.equal(blockingFor("left", "profile", "screen-right").screen_side, "FAR_SIDE_OCCLUDED");
  assert.equal(screenSide({ intrinsic_wrist: "right", camera_facing: "profile", profile_toward: "screen-right" }), "NEAR_SIDE_FOREGROUND");
  for (const [w, f, t, re] of [["left", "profile", undefined, /needs --toward/], ["left", "facing", "screen-left", /applies to --camera-facing profile only/], ["both", "facing", undefined, /--intrinsic-wrist/], ["left", "front", undefined, /--camera-facing/]]) {
    assert.throws(() => blockingFor(w, f, t), (e) => e instanceof Refusal && e.exitCode === 2 && re.test(e.message));
  }
});

test("names are tokens: a typed name fails with its token; people are tokens of registered people; props are ids, never names", () => {
  const registry = loadRegistry(path.resolve("character-registry.json"));
  assert.deepEqual(typedNames(registry, { paragraphs: ["{{sam-hayes}} waited."], _note: "Sam is fine in a note" }), []);
  assert.match(typedNames(registry, { paragraphs: ["Sam waited."] }).join(), /writes the name "Sam"\. Fix: write the token \{\{sam-hayes\}\}/);
  assert.match(typedNames(registry, { picture: "a phone, the cracked phone" }).join(), /"the cracked phone"\. Fix: write the token \{\{cracked-phone\}\}/);
  const cast = (scene) => castProblems(registry, scene, "main-story", "s").join("\n");
  assert.equal(cast({ characters: ["{{sam-hayes}}"], narrator: "{{chloe-jenkins}}", dialogue: [{ speaker: "{{theo-vance}}", text: "hi" }], props: ["brass-key"], margin_author: "{{sam-hayes}} (looking back)" }), "");
  assert.match(cast({ characters: ["Bob"] }), /characters\[0\] "Bob" is not a token/);
  assert.match(cast({ characters: ["{{nobody-here}}"] }), /not in the registry/);
  assert.match(cast({ dialogue: [{ speaker: "{{cracked-phone}}", text: "x" }] }), /is a prop, not a person/);
  assert.match(cast({ margin_author: "looking back" }), /margin_author "looking back" holds no token/);
  assert.match(propIdProblems(registry, "the cracked phone", "main-story", "p").join(), /is the name of a prop\. Fix: write its id cracked-phone/);
  assert.match(propIdProblems(registry, "{{cracked-phone}}", "main-story", "p").join(), /listed by its bare id/);
  assert.match(propIdProblems(registry, "sam-hayes", "main-story", "p").join(), /is a person, not a prop/);
  assert.match(propIdProblems(registry, "cracked-phon", "main-story", "p").join(), /did you mean "cracked-phone"/);
});

test("the laterality check: a wrong screen side, a wrist against the canon, a missing profile direction and a mixed-up picture line all fail", () => {
  const wardrobe = { file: "wardrobe-and-props.json", json: WARDROBE };
  assert.deepEqual(canonicalWrist(wardrobe, "sam-tonneau-watch"), { wrist: "left", owner: "sam-hayes" });
  assert.equal(canonicalWrist(wardrobe, "brass-key"), undefined);
  const ok = { a: { props: ["sam-tonneau-watch"], picture: "x", prop_blocking: { "sam-tonneau-watch": blockingFor("left", "facing") } } };
  assert.deepEqual(lateralityProblems(ok, ["a"], wardrobe, "w"), []);
  const flipped = { a: { ...ok.a, prop_blocking: { "sam-tonneau-watch": blockingFor("right", "facing") } } };
  assert.match(lateralityProblems(flipped, ["a"], wardrobe, "w").join(), /worn on the left wrist in wardrobe-and-props\.json \(sam-hayes\), but this scene blocks it on the right/);
  const typed = { a: { ...ok.a, prop_blocking: { "sam-tonneau-watch": { intrinsic_wrist: "left", camera_facing: "facing", screen_side: "SCREEN_LEFT" } } } };
  assert.match(lateralityProblems(typed, ["a"], null, "w").join(), /screen_side is SCREEN_LEFT, but a left wrist facing the camera projects to SCREEN_RIGHT/);
  const profile = { a: { ...ok.a, prop_blocking: { "sam-tonneau-watch": { intrinsic_wrist: "left", camera_facing: "profile", screen_side: "NEAR_SIDE_FOREGROUND" } } } };
  assert.match(lateralityProblems(profile, ["a"], null, "w").join(), /in profile with no profile_toward/);
  const unlisted = { a: { props: [], picture: "x", prop_blocking: { "sam-tonneau-watch": blockingFor("left", "back") } } };
  assert.match(lateralityProblems(unlisted, ["a"], null, "w").join(), /not in the scene's props/);
  const mixed = { a: { picture: "Split macro plate. Left: her left wrist on the rail." } };
  assert.match(lateralityProblems(mixed, ["a"], null, "w").join(), /Ambiguous Laterality Conflation/);
  const badCanon = { file: "wardrobe-and-props.json", json: { characters: { "sam-hayes": { props: [{ item_id: "w", worn_on: "LEFT_WRIST_ONLY" }] } } } };
  assert.match(lateralityProblems({}, [], badCanon, "w").join(), /missing "intrinsic_laterality"/);
});

// ---- the commands, end to end ----

test("verify passes on the example story and fails on a typed name or a blocking whose screen side is wrong", () => {
  const ok = mutate(process.cwd(), "verify", STORY);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /mutate: verify: pass \(6 scenes, 2 editions, 0 blocked prop\(s\)/);
  const dir = fixture();
  try {
    edit(dir, `${STORY}/scenes.json`, (j) => { j.scenes["the-porch"].prop_blocking = { "cracked-phone": { intrinsic_wrist: "left", camera_facing: "back", screen_side: "SCREEN_RIGHT" } }; });
    let r = mutate(dir, "verify", STORY);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /the-porch: prop_blocking\.cracked-phone\.screen_side is SCREEN_RIGHT, but a left wrist with the back to the camera projects to SCREEN_LEFT/);
    edit(dir, `${STORY}/scenes.json`, (j) => { delete j.scenes["the-porch"].prop_blocking; j.scenes["the-porch"].footnote = "Theo was asleep."; });
    r = mutate(dir, "verify", STORY);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /the-porch: footnote writes the name "Theo"/);
  } finally { cleanup(dir); }
});

test("add-scene places the record after --after in every edition, unparks its picture, rebuilds, passes the gates and logs one entry", () => {
  const dir = fixture();
  try {
    const payload = put(dir, "new.json", NEW_SCENE);
    const r = mutate(dir, "add-scene", STORY, "--slug", "read-at-1152-first-try", "--payload", payload, "--after", "read-at-1152", ...AUTHOR, "--reason", "the first render earns its own spread");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /spread 3 of sam-first, 5 of theo-first/);
    assert.match(r.stdout, /unparked main_read-at-1152-first-try\.png/);
    assert.deepEqual(read(dir, `${STORY}/editions/sam-first.json`).order.slice(1, 3), ["read-at-1152", "read-at-1152-first-try"]);
    assert.ok(!read(dir, `${STORY}/parked-art.json`).parked.some((p) => p.file === "main_read-at-1152-first-try.png"));
    const built = fs.readFileSync(path.join(dir, STORY, "built/sam-first.txt"), "utf8");
    assert.match(built, /=== SPREAD 3 OF 6 ===\nPART: Part one: six hours\nTITLE: The first try/);
    assert.match(built, /Chloe turned the lamp toward the table, and Sam watched the screen\./, "the reader meets names, not tokens");
    assert.equal(story(dir, "check", STORY).status, 0);
    const [entry] = entries(dir);
    assert.equal(entry.author, "agent:test");
    assert.equal(entry.scope, "story-mutation");
    const details = JSON.parse(entry.details);
    assert.equal(details.command, "add-scene");
    assert.equal(details.reason, "the first render earns its own spread");
    assert.equal(details.authorization, "none needed: the change only adds");
    assert.ok(details.diff["scenes.json"].some((d) => d.path === "scenes.read-at-1152-first-try" && d.op === "add"));
    assert.ok(details.diff["parked-art.json"].length);
    assert.match(entry.run.files, /examples\/story\/scenes\.json/);
  } finally { cleanup(dir); }
});

test("add-scene with no --after places the scene last in every edition", () => {
  const dir = fixture();
  try {
    const r = mutate(dir, "add-scene", STORY, "--slug", "read-at-1152-first-try", "--payload", put(dir, "new.json", NEW_SCENE), ...AUTHOR, "--reason", "last");
    assert.equal(r.status, 0, r.stderr);
    for (const ed of ["sam-first", "theo-first"]) assert.equal(read(dir, `${STORY}/editions/${ed}.json`).order.at(-1), "read-at-1152-first-try");
  } finally { cleanup(dir); }
});

test("add-scene refuses an existing slug, a typed name, an untokened character, a prop by name, a missing picture and an unplaced --after", () => {
  const dir = fixture();
  try {
    const add = (slug, scene, ...extra) => ["add-scene", STORY, "--slug", slug, "--payload", put(dir, "p.json", scene), ...AUTHOR, "--reason", "r", ...extra];
    refused(dir, add("the-porch", NEW_SCENE), /the-porch is already a scene\. Fix: add-scene never overwrites/);
    refused(dir, add("read-at-1152-first-try", { ...NEW_SCENE, paragraphs: ["Chloe turned the lamp."] }), /writes the name "Chloe"\. Fix: write the token \{\{chloe-jenkins\}\}/);
    refused(dir, add("read-at-1152-first-try", { ...NEW_SCENE, characters: ["{{sam-hayes}}", "the bartender"] }), /characters\[1\] "the bartender" is not a token/);
    refused(dir, add("read-at-1152-first-try", { ...NEW_SCENE, props: ["the cracked phone"] }), /is the name of a prop\. Fix: write its id cracked-phone/);
    refused(dir, add("read-at-1152-second", { ...NEW_SCENE, art: ["main_read-at-1152-second.png"] }), /art "main_read-at-1152-second\.png" is not in examples\/story\/art\//);
    refused(dir, add("read-at-1152-first-try", NEW_SCENE, "--after", "the-napkin-timeline"), /--after the-napkin-timeline is not placed in edition sam-first/);
    refused(dir, add("read-at-1152-first-try", { ...NEW_SCENE, picture: "Split macro plate. Left: her left wrist. Right: the lamp." }), /Ambiguous Laterality Conflation/);
    refused(dir, add("read-at-1152-first-try", { ...NEW_SCENE, layout: "triptych" }), /layout "triptych" carries 3 picture\(s\) but art lists 1[\s\S]*every file was put back/);
    refused(dir, ["add-scene", STORY, "--slug", "x", "--payload", put(dir, "p.json", NEW_SCENE), "--author", "test", "--reason", "r"], /must be agent:<name> or human:<name>/, 2);
    refused(dir, ["add-scene", STORY, "--slug", "x", "--payload", put(dir, "p.json", NEW_SCENE), ...AUTHOR], /add-scene needs --reason/, 2);
  } finally { cleanup(dir); }
});

test("update-scene applies an additive patch, and refuses an overwrite, a removal and a dropped item without an authorization", () => {
  const dir = fixture();
  try {
    const patch = (value) => put(dir, "patch.json", value);
    const upd = (value, ...extra) => ["update-scene", STORY, "--slug", "the-porch", "--patch", patch(value), ...AUTHOR, "--reason", "r", ...extra];
    let r = mutate(dir, ...upd({ footnote: "Read receipts show when a message was opened, not what the reader felt." }));
    assert.equal(r.status, 0, r.stderr);
    assert.match(fs.readFileSync(path.join(dir, STORY, "built/sam-first.txt"), "utf8"), /FOOTNOTE: Read receipts show when a message was opened/);
    const paragraphs = read(dir, `${STORY}/scenes.json`).scenes["the-porch"].paragraphs;
    r = mutate(dir, ...upd({ paragraphs: [...paragraphs, "The bulb buzzed."] }));
    assert.equal(r.status, 0, "appending a paragraph is additive");
    refused(dir, upd({ title: "The porch at night" }), /the-porch: title would be overwritten: "The porch" -> "The porch at night"[\s\S]*--market-test <id>[\s\S]*--owner-auth/);
    refused(dir, upd({ margin_note: null }), /margin_note would be removed/);
    refused(dir, upd({ paragraphs: paragraphs.slice(1) }), /paragraphs would drop or replace/);
    refused(dir, upd({ dialogue: [{ speaker: "{{sam-hayes}}", text: "He read it." }] }), /dialogue would drop or replace/);
    refused(dir, upd({}), /the patch changes nothing/);
    refused(dir, ["update-scene", STORY, "--slug", "no-such-scene", "--patch", patch({ footnote: "x" }), ...AUTHOR, "--reason", "r"], /no-such-scene is not a scene/);
    refused(dir, upd({ footnote2: "x" }, "--owner-auth", "ok"), /unknown field footnote2[\s\S]*every file was put back/);
    assert.equal(entries(dir).length, 2, "only the two accepted changes are logged");
  } finally { cleanup(dir); }
});

test("update-scene with --owner-auth replaces a value and a picture: the old picture is parked, the new one unparked, the owner's words logged", () => {
  const dir = fixture();
  try {
    const p = put(dir, "patch.json", { title: "Read at 11:52, again", art: ["main_read-at-1152-first-try.png"] });
    const r = mutate(dir, "update-scene", STORY, "--slug", "read-at-1152", "--patch", p, ...AUTHOR, "--reason", "the first render wins", "--owner-auth", "use the first render on the kitchen spread");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /replaced \(authorized\): title would be overwritten/);
    const parked = read(dir, `${STORY}/parked-art.json`).parked;
    assert.ok(!parked.some((x) => x.file === "main_read-at-1152-first-try.png"), "the picture now loaded leaves parked");
    const old = parked.find((x) => x.file === "main_read-at-1152.png");
    assert.match(old.reason, /replaced on \d{4}-\d{2}-\d{2} by mutate\.mjs update-scene read-at-1152 under the owner's authorization recorded in the worklog: the first render wins/);
    assert.ok(fs.existsSync(path.join(dir, STORY, "art/main_read-at-1152.png")), "nothing is deleted from disk");
    assert.equal(story(dir, "check", STORY).status, 0);
    const details = JSON.parse(entries(dir)[0].details);
    assert.deepEqual(details.authorization, { kind: "owner", text: "use the first render on the kitchen spread" });
    assert.ok(details.diff["scenes.json"].some((d) => d.path === "scenes.read-at-1152.title" && d.before === "Read at 11:52"), "the old value is kept in the diff");
  } finally { cleanup(dir); }
});

test("retire-scene always needs an authorization; a market test must be recorded, authorized by the author and list the scene", () => {
  const dir = fixture();
  try {
    const retire = (...extra) => ["retire-scene", STORY, "--slug", "across-town", ...AUTHOR, "--reason", "the workshop opening tested slower", ...extra];
    refused(dir, retire(), /retire-scene takes across-town out of sam-first and theo-first[\s\S]*--market-test <id>/);
    refused(dir, retire("--market-test", "mt-01"), /market-tests\.json does not exist/);
    const ledger = (tests) => fs.writeFileSync(path.join(dir, STORY, "market-tests.json"), JSON.stringify({ tests }, null, 2));
    ledger([{ id: "mt-01", decision: "open on the porch", authorizes: ["across-town"] }]);
    refused(dir, retire("--market-test", "mt-01"), /has no authorized_by: the author has not authorized/);
    ledger([{ id: "mt-01", decision: "open on the porch", authorized_by: "the author", authorizes: ["the-porch"] }]);
    refused(dir, retire("--market-test", "mt-01"), /does not list across-town under authorizes/);
    refused(dir, retire("--market-test", "mt-02"), /mt-02 is not in .*market-tests\.json \(did you mean "mt-01"\?\)/);
    refused(dir, retire("--market-test", "mt-01", "--owner-auth", "yes"), /not both/, 2);
    refused(dir, retire("--owner-auth", "  "), /--owner-auth is empty/);
    refused(dir, ["retire-scene", STORY, "--slug", "across-town", ...AUTHOR, "--reason", "Theo asked", "--owner-auth", "yes"], /--reason \(it is written into parked-art\.json\): reason writes the name "Theo"/);
    refused(dir, ["retire-scene", STORY, "--slug", "the-napkin-timeline", ...AUTHOR, "--reason", "r", "--owner-auth", "yes"], /already retired in every edition/);
    ledger([{ id: "mt-01", decision: "open on the porch", authorized_by: "the author", authorizes: ["across-town"] }]);
    const r = mutate(dir, ...retire("--market-test", "mt-01"));
    assert.equal(r.status, 0, r.stderr);
    for (const ed of ["sam-first", "theo-first"]) {
      const j = read(dir, `${STORY}/editions/${ed}.json`);
      assert.ok(!j.order.includes("across-town") && j.retired.includes("across-town"));
    }
    assert.ok(read(dir, `${STORY}/scenes.json`).scenes["across-town"], "the record stays");
    assert.ok(fs.existsSync(path.join(dir, STORY, "art/main_across-town.png")), "the picture stays on disk");
    const parked = read(dir, `${STORY}/parked-art.json`).parked.find((p) => p.file === "main_across-town.png");
    assert.match(parked.reason, /retired on .* under market test mt-01 \(authorized by the author\): the workshop opening tested slower; the record and the picture stay/);
    assert.doesNotMatch(fs.readFileSync(path.join(dir, STORY, "built/theo-first.txt"), "utf8"), /TITLE: Across town/);
    assert.equal(story(dir, "check", STORY).status, 0);
    const [entry] = entries(dir);
    assert.match(entry.summary, /retire-scene across-town .*market test mt-01; record and pictures kept/);
    assert.equal(JSON.parse(entry.details).authorization.id, "mt-01");
  } finally { cleanup(dir); }
});

test("retire-scene with --owner-auth records the owner's words in the worklog, never in the token sources", () => {
  const dir = fixture();
  try {
    const r = mutate(dir, "retire-scene", STORY, "--slug", "the-porch", ...AUTHOR, "--reason", "open in the workshop", "--owner-auth", "retire the porch, Sam's scene");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(entries(dir)[0].details).authorization.text, "retire the porch, Sam's scene");
    assert.doesNotMatch(fs.readFileSync(path.join(dir, STORY, "parked-art.json"), "utf8"), /Sam's scene/);
  } finally { cleanup(dir); }
});

test("set-prop computes the screen side, lists the prop on the scene, records the old blocking, and refuses ambiguity and names", () => {
  const dir = fixture({ watch: true });
  try {
    const set = (...extra) => ["set-prop", STORY, "--slug", "the-porch", ...AUTHOR, ...extra];
    let r = mutate(dir, ...set("--prop", "sam-tonneau-watch", "--intrinsic-wrist", "left", "--camera-facing", "facing"));
    assert.equal(r.status, 0, r.stderr);
    let scene = read(dir, `${STORY}/scenes.json`).scenes["the-porch"];
    assert.deepEqual(scene.props, ["cracked-phone", "sam-tonneau-watch"], "set-prop lists a prop the scene lacked, additively");
    assert.deepEqual(scene.prop_blocking["sam-tonneau-watch"], { intrinsic_wrist: "left", camera_facing: "facing", screen_side: "SCREEN_RIGHT" });
    r = mutate(dir, ...set("--prop", "sam-tonneau-watch", "--intrinsic-wrist", "left", "--camera-facing", "profile", "--toward", "screen-right"));
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /left wrist, profile toward screen-right -> FAR_SIDE_OCCLUDED \(was left wrist -> SCREEN_RIGHT/);
    scene = read(dir, `${STORY}/scenes.json`).scenes["the-porch"];
    assert.equal(scene.prop_blocking["sam-tonneau-watch"].screen_side, "FAR_SIDE_OCCLUDED");
    const last = JSON.parse(entries(dir).at(-1).details);
    assert.ok(last.diff["scenes.json"].some((d) => d.before === "SCREEN_RIGHT" && d.after === "FAR_SIDE_OCCLUDED"));
    assert.equal(mutate(dir, "verify", STORY).status, 0);
    refused(dir, set("--prop", "sam-tonneau-watch", "--intrinsic-wrist", "left", "--camera-facing", "profile", "--toward", "screen-right"), /already blocks sam-tonneau-watch this way/);
    refused(dir, set("--prop", "sam-tonneau-watch", "--intrinsic-wrist", "left", "--camera-facing", "profile"), /needs --toward/, 2);
    refused(dir, set("--prop", "the tonneau watch", "--intrinsic-wrist", "left", "--camera-facing", "facing"), /is the name of a prop\. Fix: write its id sam-tonneau-watch/);
    refused(dir, set("--prop", "sam-hayes", "--intrinsic-wrist", "left", "--camera-facing", "facing"), /is a person, not a prop/);
    refused(dir, ["set-prop", STORY, "--slug", "the-porch", "--prop", "sam-tonneau-watch", "--intrinsic-wrist", "left", ...AUTHOR], /set-prop needs --camera-facing/, 2);
  } finally { cleanup(dir); }
});

test("set-prop refuses a wrist against the canon in wardrobe-and-props.json: the watch-on-the-wrong-wrist defect never reaches a record", () => {
  const dir = fixture({ watch: true, wardrobe: true });
  try {
    refused(dir, ["set-prop", STORY, "--slug", "read-at-1152", "--prop", "sam-tonneau-watch", "--intrinsic-wrist", "right", "--camera-facing", "facing", ...AUTHOR],
      /sam-tonneau-watch is worn on the left wrist in wardrobe-and-props\.json \(sam-hayes\), but this scene blocks it on the right\. Fix: --intrinsic-wrist left/);
    const r = mutate(dir, "set-prop", STORY, "--slug", "read-at-1152", "--prop", "sam-tonneau-watch", "--intrinsic-wrist", "left", "--camera-facing", "back", ...AUTHOR, "--reason", "her back to the camera at the counter");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(read(dir, `${STORY}/scenes.json`).scenes["read-at-1152"].prop_blocking["sam-tonneau-watch"].screen_side, "SCREEN_LEFT");
    assert.equal(JSON.parse(entries(dir)[0].details).reason, "her back to the camera at the counter");
    // a patch that writes a blocking by hand goes through the same check
    refused(dir, ["update-scene", STORY, "--slug", "the-porch", "--patch", put(dir, "p.json", { props: ["cracked-phone", "sam-tonneau-watch"], prop_blocking: { "sam-tonneau-watch": { intrinsic_wrist: "left", camera_facing: "facing", screen_side: "SCREEN_LEFT" } } }), ...AUTHOR, "--reason", "r"],
      /projects to SCREEN_RIGHT/);
  } finally { cleanup(dir); }
});

test("a mutation with no worklog to record it is refused before anything is written", () => {
  const dir = fixture();
  try {
    fs.rmSync(path.join(dir, "logs", "story-mutations.jsonl"));
    const before = snapshot(dir);
    const r = mutate(dir, "add-scene", STORY, "--slug", "read-at-1152-first-try", "--payload", put(dir, "new.json", NEW_SCENE), ...AUTHOR, "--reason", "r");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /no logs\/story-mutations\.jsonl in examples\/story or any folder above it[\s\S]*--worklog <repo>/);
    assert.deepEqual(snapshot(dir), before);
    const other = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-mutate-nolog-"));
    const r2 = mutate(dir, "add-scene", STORY, "--slug", "read-at-1152-first-try", "--payload", put(dir, "new.json", NEW_SCENE), ...AUTHOR, "--reason", "r", "--worklog", other);
    assert.equal(r2.status, 1);
    assert.match(r2.stderr, /has no logs\/story-mutations\.jsonl/);
    cleanup(other);
  } finally { cleanup(dir); }
});
