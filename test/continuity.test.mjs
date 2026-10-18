// Run from the repo root: npm test. Continuity cards and the shot sheet: the example compiles; every planted problem is named.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { carryContinuity, renderPhrases } from "../scripts/lib.mjs";
import { wardrobeLine } from "../scripts/compile-shot.mjs";

const SKIP = new Set([".git", "node_modules", ".worktrees", ".context", "research"]);
const CARDS = "examples/continuity/cards.json";
const SHEET = "examples/continuity/shot-sheet.json";
function copyRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-continuity-"));
  fs.cpSync(process.cwd(), dir, { recursive: true, filter: (src) => !path.relative(process.cwd(), src).split(path.sep).some((p) => SKIP.has(p)) });
  return dir;
}
const run = (dir, script, args = []) => spawnSync(process.execPath, [path.join(dir, "scripts", script), ...args], { cwd: dir, encoding: "utf8" });
const check = (dir) => run(dir, "check.mjs");
function editJson(dir, rel, fn) { const f = path.join(dir, rel); const j = JSON.parse(fs.readFileSync(f, "utf8")); fn(j); fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n"); }
/** Plant one problem, run the gate, clean up, return the result. */
function planted(plant) {
  const dir = copyRepo();
  try { plant(dir); return check(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const kitchen = (j) => j.scenes["14-read-at-1152"];

test("the example cards and shot sheet pass the gate, and the scene compiles with no token left", () => {
  const r = check(process.cwd());
  assert.equal(r.status, 0, r.stderr);
  const c = spawnSync(process.execPath, ["scripts/compile-shot.mjs", "14-read-at-1152"], { encoding: "utf8" });
  assert.equal(c.status, 0, c.stderr);
  assert.doesNotMatch(c.stdout, /\{\{/);
  assert.doesNotMatch(c.stdout, /\b0\./, "an empty list prints nothing, not a zero");
  assert.equal((c.stdout.match(/^=== 14-read-at-1152 · shot /gm) || []).length, 3);
});

test("state carries: the coat is on at the porch, off in the kitchen with the change spelled out, and stays off two shots later", () => {
  const porch = spawnSync(process.execPath, ["scripts/compile-shot.mjs", "13-the-porch"], { encoding: "utf8" }).stdout;
  assert.match(porch, /WEARING: camel wool coat over wine silk blouse, black wide-leg trousers, black ankle boots/);
  assert.doesNotMatch(porch, /CHANGED SINCE THE LAST SHOT/, "the first shot of a story day has no previous shot");
  const a = spawnSync(process.execPath, ["scripts/compile-shot.mjs", "14-read-at-1152", "--shot", "14a"], { encoding: "utf8" }).stdout;
  assert.match(a, /CHARACTER 1: a mixed-race woman[^\n]*WEARING: wine silk blouse, black wide-leg trousers, black ankle boots/);
  assert.match(a, /CHANGED SINCE THE LAST SHOT: CHARACTER 1 has taken off the camel wool coat\./);
  const c = spawnSync(process.execPath, ["scripts/compile-shot.mjs", "14-read-at-1152", "--shot", "14c"], { encoding: "utf8" }).stdout;
  assert.match(c, /CHARACTER 2: a mixed-race woman[^\n]*WEARING: wine silk blouse/);
  assert.match(c, /CHARACTER 2:[^\n]*IN HAND: nothing/);
  assert.match(c, /CHARACTER 1: a Black woman[^\n]*IN HAND: a black phone with a cracked corner in a clear case/);
  assert.match(c, /CHANGED SINCE THE LAST SHOT: CHARACTER 2 hands a black phone with a cracked corner in a clear case to CHARACTER 1\./);
});

test("the block puts the character first, builds AVOID from props and the declared vocabularies, and prints marks and props in frame", () => {
  const w = spawnSync(process.execPath, ["scripts/compile-shot.mjs", "15-across-town"], { encoding: "utf8" }).stdout;
  const lines = w.trim().split("\n");
  assert.match(lines[0], /^=== 15-across-town · shot 15a \(medium\) · day-1: The night of the text ===$/);
  assert.match(lines[1], /^CHARACTER 1: a tall white man/);
  assert.match(lines[1], /MARKS: fresh scrape across the right knuckles/);
  assert.match(w, /^SHOT: medium\. SETTING: a carpenter's workshop[^\n]*TIME: evening\. WEATHER: clear and cold\.$/m);
  assert.match(w, /^ALSO IN FRAME: a small tarnished brass key on a frayed red thread\.$/m);
  assert.match(w, /^AVOID: shiny gold key, keyring, morning, sunrise, dawn, daylight, porch, doorstep, front door, kitchen, stove, fridge, kettle, packaging, blister pack, price tags, logos, speech bubbles, panel borders, text\.$/m, "props, the other markers' words, then the render surface's exclude list and the word text for no_text: true");
  const k = spawnSync(process.execPath, ["scripts/compile-shot.mjs", "14-read-at-1152", "--shot", "14b", "--json"], { encoding: "utf8" });
  const json = JSON.parse(k.stdout);
  assert.equal(json.shots.length, 1);
  assert.deepEqual(json.shots[0].characters[0].in_hand, ["cracked-phone"]);
  assert.ok(json.shots[0].avoid.includes("workbench"));
  assert.match(json.shots[0].block, /^=== 14-read-at-1152 · shot 14b/);
});

test("a wardrobe change without a reason fails", () => {
  const r = planted((dir) => editJson(dir, SHEET, (j) => { delete kitchen(j).shots[0].changes[0].reason; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /shot-sheet\.json: 14-read-at-1152: shot 14a: changes\[0\]: the change for Sam has no reason\. Fix: add "reason"/);
});

test("a prop in a character's hand that the card does not give them fails", () => {
  const r = planted((dir) => editJson(dir, SHEET, (j) => { kitchen(j).shots[0].characters[1].holding = ["cracked-phone"]; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /shot 14a: Chloe holds "cracked-phone", which the card for day-1 does not give Chloe and no earlier change handed over\. Fix: add "cracked-phone" to cards\.chloe-jenkins\.day-1\.carries/);
});

test("after a hand-over the giver no longer holds the prop, in the same shot", () => {
  const r = planted((dir) => editJson(dir, SHEET, (j) => { kitchen(j).shots[2].characters[1].holding = ["cracked-phone"]; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /shot 14c: Sam holds "cracked-phone", which the card for day-1 does not give Sam and no earlier change handed over/);
});

test("a character in a shot with no card for the story day fails: there is nothing to carry", () => {
  const r = planted((dir) => editJson(dir, CARDS, (j) => { delete j.cards["chloe-jenkins"]; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /13-the-porch: shot 13a: Chloe is in this shot but has no continuity card for day-1\. Fix: add cards\.chloe-jenkins\.day-1 to examples\/continuity\/cards\.json \(wardrobe, hair at least\)/);
});

test("a card missing a required field fails, naming it", () => {
  const r = planted((dir) => editJson(dir, CARDS, (j) => { delete j.cards["theo-vance"]["day-1"].hair; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /cards\.json: cards\.theo-vance\.day-1: missing hair\. Fix: write Theo's hair at the start of day-1/);
});

test("exclusive markers: a shot in the kitchen may not describe the workshop", () => {
  const r = planted((dir) => editJson(dir, SHEET, (j) => { kitchen(j).shots[0].characters[1].action = "sweeps sawdust off the table"; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /shot-sheet\.json: 14-read-at-1152: says "sawdust" \(location workshop\) but location is "kitchen"/);
});

test("a scene header missing a required field, or naming an unknown day or place, fails", () => {
  let r = planted((dir) => editJson(dir, SHEET, (j) => { delete kitchen(j).time_of_day; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /14-read-at-1152: missing time_of_day\. Fix: every scene header says story_day, location, time_of_day/);
  r = planted((dir) => editJson(dir, SHEET, (j) => { kitchen(j).story_day = "day-9"; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /14-read-at-1152: story_day "day-9" is not a key of story_days in examples\/continuity\/cards\.json \(day-1\)/);
  r = planted((dir) => editJson(dir, SHEET, (j) => { kitchen(j).location = "garage"; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /14-read-at-1152: location "garage" is not a key of locations \(porch, kitchen, workshop\)/);
});

test("carries and holding take prop ids only", () => {
  let r = planted((dir) => editJson(dir, CARDS, (j) => { j.cards["sam-hayes"]["day-1"].carries.push("theo-vance"); }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /cards\.sam-hayes\.day-1: carries "theo-vance" is Theo \(kind person\), not a prop/);
  r = planted((dir) => editJson(dir, SHEET, (j) => { kitchen(j).shots[1].characters[0].holding = ["silver-locket"]; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /shot 14b: holding "silver-locket" is not a registry id/);
});

test("a typed name in the shot sheet fails with the token to write; a change that changes nothing fails", () => {
  let r = planted((dir) => editJson(dir, SHEET, (j) => { kitchen(j).shots[1].characters[0].action = "Sam reads the message one more time"; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /shot-sheet\.json: [^\n]*names "Sam" in a token source\. Fix: write \{\{sam-hayes\}\}/);
  r = planted((dir) => editJson(dir, SHEET, (j) => { kitchen(j).shots[0].changes[0] = { who: "{{sam-hayes}}", reason: "a reason with nothing to apply" }; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /shot 14a: changes\[0\]: changes nothing\. Fix: set one of wardrobe, hair, accessories, marks, carries, hands/);
});

test("the sheet and the story's scene file must agree on the time of day", () => {
  const r = planted((dir) => editJson(dir, "examples/scenes.json", (j) => { j.scenes["13-the-porch"].time_of_day = "morning"; j.scenes["13-the-porch"].narration = "Keys. The message again."; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /shot-sheet\.json: 13-the-porch: time_of_day "evening" but examples\/scenes\.json says "morning"/);
});

test("a shot sheet without continuity cards for its story fails", () => {
  const r = planted((dir) => editJson(dir, "character-registry.json", (j) => { j.surfaces = j.surfaces.filter((s) => s.type !== "continuity-cards"); }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /the shot-sheet surface examples\/continuity\/shot-sheet\.json \(main-story\) has no continuity-cards surface for the same story/);
});

test("marks that end a story day and vanish from the next day's card are a gap, not a failure", () => {
  const dir = copyRepo();
  editJson(dir, CARDS, (j) => { j.story_days["day-2"] = { label: "The morning after" }; j.cards["theo-vance"]["day-2"] = { wardrobe: "the same work clothes", hair: "wet from the shower", marks: [] }; });
  editJson(dir, SHEET, (j) => { j.scenes["16-next-morning"] = { surface: "story-scene", story_day: "day-2", time_of_day: "morning", location: "workshop", shots: [{ id: "16a", characters: [{ who: "{{theo-vance}}", action: "unlocks the shutter" }] }] }; });
  editJson(dir, "examples/scenes.json", (j) => { j.scenes["16-next-morning"] = { title: "Next morning", time_of_day: "morning", characters: ["{{theo-vance}}"], narration: "{{theo-vance}} unlocked the shutter." }; });
  const r = check(dir);
  const c = run(dir, "compile-shot.mjs", ["16-next-morning"]);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /gap: examples\/continuity\/cards\.json: cards\.theo-vance\.day-2: Theo ended day-1 with marks \[fresh scrape across the right knuckles\] that this card does not list/);
  assert.equal(c.status, 0, c.stderr);
  assert.match(c.stdout, /WEARING: the same work clothes\. HAIR: wet from the shower/, "a one-line wardrobe prints as written; a new day starts from its card");
  assert.doesNotMatch(c.stdout, /MARKS/);
});

test("compile-shot refuses a sheet the gate fails, and names an unknown scene or shot", () => {
  const dir = copyRepo();
  editJson(dir, SHEET, (j) => { delete kitchen(j).shots[0].changes[0].reason; });
  const refused = run(dir, "compile-shot.mjs", ["14-read-at-1152"]);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /has no reason/);
  assert.match(refused.stderr, /compile-shot: the gate fails \(1 problem\(s\)\); nothing is compiled from a sheet with a contradiction in it/);
  const scene = spawnSync(process.execPath, ["scripts/compile-shot.mjs", "99-nowhere"], { encoding: "utf8" });
  assert.equal(scene.status, 1);
  assert.match(scene.stderr, /no scene "99-nowhere" in examples\/continuity\/shot-sheet\.json\. Scenes: 13-the-porch, 14-read-at-1152, 15-across-town/);
  const shot = spawnSync(process.execPath, ["scripts/compile-shot.mjs", "14-read-at-1152", "--shot", "14z"], { encoding: "utf8" });
  assert.equal(shot.status, 1);
  assert.match(shot.stderr, /no shot "14z" in 14-read-at-1152\. Shots: 14a, 14b, 14c/);
});

test("render surfaces: the same prop compiles two different blocks, one per surface; a card scene carries no story continuity", () => {
  const story = spawnSync(process.execPath, ["scripts/compile-shot.mjs", "15-across-town"], { encoding: "utf8" }).stdout;
  const card = spawnSync(process.execPath, ["scripts/compile-shot.mjs", "card-brass-key"], { encoding: "utf8" }).stdout;
  assert.match(story, /^KEEP \(Story scene, 3:2 landscape\): painted graphic-novel panel, muted palette, visible brush texture, one light source; faces as in the anchor pictures; props exactly as described, nothing added to them; every hand shows all five fingers, none extra, none merged\.$/m);
  assert.match(story, /^ALSO IN FRAME: a small tarnished brass key on a frayed red thread\.$/m);
  assert.match(card, /^=== card-brass-key · shot card-1 \(square\) ===$/m, "no story day in the header");
  assert.match(card, /^SHOT: square\.$/m);
  assert.match(card, /^ALSO IN FRAME: a small tarnished brass key on a frayed red thread\.$/m, "the same prop");
  assert.match(card, /^STAGING: the key alone, its thread coiled beside it\.$/m);
  assert.match(card, /^KEEP \(Product card, 1:1 square\): studio product photograph on a white sweep, soft even light; the prop sealed in a clear blister pack on a printed cardboard backing; the prop centred, nothing else in frame; no hands in frame; no text except the card's own printed label\.$/m, "a no_text sentence joins KEEP as written");
  assert.match(card, /^AVOID: shiny gold key, keyring, people, hands, scenery, shadows that hide the prop\.$/m);
  assert.doesNotMatch(card, /CHARACTER|SETTING|TIME:|CHANGED SINCE|false|day-1/);
  const json = JSON.parse(spawnSync(process.execPath, ["scripts/compile-shot.mjs", "card-brass-key", "--json"], { encoding: "utf8" }).stdout);
  assert.equal(json.shots[0].surface.id, "product-card");
  assert.equal(json.shots[0].surface.continuity, false);
  assert.deepEqual(json.shots[0].surface.avoid, ["people", "hands", "scenery", "shadows that hide the prop"]);
  const r = check(process.cwd());
  assert.match(r.stdout, /, 2 render surface\(s\), 1 template\(s\)\)/);
});

test("a template that retypes a render surface phrase fails with the file, the phrase and the fix", () => {
  const r = planted((dir) => fs.appendFileSync(path.join(dir, "examples/templates/redo-prompt.md"), "\nAlways: every hand shows all five fingers, none extra, none merged.\n"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /examples\/templates\/redo-prompt\.md: line \d+: retypes the render surface phrase "every hand shows all five fingers, none extra, none merged" \(render_surfaces\.story-scene\.hands_rule\)\. Fix: read it from the surface: node scripts\/compile-shot\.mjs prints KEEP and AVOID from render_surfaces\.story-scene, and a builder reads that entry from the registry/);
});

test("a token source that retypes a rule fails too; a single word of a rule is vocabulary, not a phrase", () => {
  const r = planted((dir) => editJson(dir, SHEET, (j) => { kitchen(j).shots[1].characters[0].action = "reads the message; painted graphic-novel panel, muted palette, visible brush texture, one light source"; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /shot-sheet\.json: scenes\.14-read-at-1152\.shots\[1\]\.characters\[0\]\.action: retypes the render surface phrase "painted graphic-novel panel, muted palette, visible brush texture, one light source" \(render_surfaces\.story-scene\.style_lock\)/);
  assert.deepEqual(renderPhrases({ s: { name: "S", exclude: ["hands", "blister pack"], must_keep: "one line", no_text: true, hands_rule: "no hands", why: "why is never a phrase" } }).map((p) => p.phrase), ["one line", "blister pack", "no hands"], "style_lock, must_keep, exclude, hands_rule, in that order; single words and why are left out");
});

test("once a surface is declared every shot names one; an unknown or missing surface fails, so does a surface with none declared or a template glob with no file", () => {
  let r = planted((dir) => editJson(dir, SHEET, (j) => { kitchen(j).shots[1].surface = "poster"; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /shot 14b: surface "poster" is not in render_surfaces \(story-scene, product-card\)\. Fix: add it to render_surfaces in character-registry\.json with its look rules, or correct it here/);
  r = planted((dir) => editJson(dir, SHEET, (j) => { delete kitchen(j).surface; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /shot 14a: has no surface: where will this picture be used\? Fix: set "surface" on the shot or on the scene header, one of story-scene, product-card/);
  r = planted((dir) => editJson(dir, "character-registry.json", (j) => { delete j.render_surfaces; delete j.render_templates; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /shot 13a: names surface "story-scene" but character-registry\.json declares no render_surfaces\. Fix: declare render_surfaces there \(name, style_lock, must_keep, exclude, size, no_text, hands_rule, why\), or remove surface here/);
  r = planted((dir) => editJson(dir, "character-registry.json", (j) => { j.render_templates = ["templates/nowhere/**"]; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /render_templates "templates\/nowhere\/\*\*" matches no tracked file\. Fix: correct the glob or remove it/);
});

test("--out writes built output and says so", () => {
  const dir = copyRepo();
  const r = run(dir, "compile-shot.mjs", ["14-read-at-1152", "--shot", "14b", "--out", "built/14b.txt"]);
  const written = fs.existsSync(path.join(dir, "built/14b.txt")) ? fs.readFileSync(path.join(dir, "built/14b.txt"), "utf8") : "";
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /compile-shot: 14-read-at-1152 shot 14b -> built\/14b\.txt \(1 shot\(s\); built output, do not edit\)/);
  assert.match(written, /^=== 14-read-at-1152 · shot 14b/);
});

test("carryContinuity is pure: a one-line wardrobe becomes the outfit layer, a layered change goes over it, and hands moves the prop", () => {
  const characters = {
    a: { name: "Ann", kind: "person", story: "s" }, b: { name: "Bo", kind: "person", story: "s" },
    key: { name: "the key", kind: "prop", story: "s" },
  };
  const cards = { story_days: { d1: { label: "one" } }, cards: { a: { d1: { wardrobe: "a green dress", carries: ["key"] } }, b: { d1: { wardrobe: { top: "shirt" } } } } };
  const sheet = { scenes: { s1: { story_day: "d1", location: "hall", time_of_day: "noon", shots: [
    { id: "1", characters: ["a", "b"] },
    { id: "2", characters: ["a", "b"], changes: [{ who: "a", wardrobe: { outer: "a grey shawl" }, reason: "cold" }, { who: "a", hands: "key", to: "b", reason: "handing it over" }] },
    { id: "3", characters: [{ who: "b", holding: ["key"] }] },
  ] } } };
  const r = carryContinuity({ cards, sheet, characters, story: "s" });
  assert.deepEqual(r.failures, []);
  const [one, two, three] = r.scenes.s1.shots;
  assert.deepEqual(one.characters[0].state.wardrobe, { outfit: "a green dress" });
  assert.equal(wardrobeLine(two.characters[0].state.wardrobe), "a grey shawl over a green dress");
  assert.deepEqual(two.characters[0].state.carries, []);
  assert.deepEqual(two.characters[1].state.carries, ["key"]);
  assert.deepEqual(three.characters[0].holding, ["key"]);
  assert.equal(one.first_of_day, true);
  assert.equal(two.first_of_day, false);
  assert.equal(r.labels, 13, "every reference counts as a resolved label: 2 cards, 1 carried prop, 5 cast entries, 2 who, 1 handed prop, 1 to, 1 held prop");
});

test("a story folder with markdown scenes and no scene file still compiles: the sheet is the only structured plan", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-story-"));
  fs.mkdirSync(path.join(dir, "continuity"));
  fs.writeFileSync(path.join(dir, "character-registry.json"), JSON.stringify({
    registry_version: 1,
    token_sources: [{ file: "scene-*.md" }],
    surfaces: [
      { type: "continuity-cards", file: "continuity/cards.json", story: "the-lighthouse" },
      { type: "shot-sheet", file: "continuity/shot-sheet.json", story: "the-lighthouse", exclusive_markers: [{ field: "time_of_day", values: { dusk: ["dusk", "sunset"], night: ["night", "stars"] }, fields: ["shots[].characters[].action"] }] },
    ],
    characters: {
      "june-okafor": { name: "June", kind: "person", story: "the-lighthouse", role: "nine", prose_only: true, forms: { look: "a nine-year-old girl with dark brown skin and black curls in two puffs" } },
      "abel-marsh": { name: "Abel", kind: "person", story: "the-lighthouse", role: "keeper", prose_only: true, forms: { look: "a tall old man with light brown skin and a short white beard" } },
      "the-matchbox": { name: "the matchbox", kind: "prop", story: "the-lighthouse", role: "lights the lamp", prompt_tokens: "a dented tin matchbox", negative_tokens: ["lighter"] },
    },
  }, null, 2));
  fs.writeFileSync(path.join(dir, "scene-01.md"), "# Scene 1\n\n{{june-okafor}} held the ladder.\n");
  fs.writeFileSync(path.join(dir, "continuity/cards.json"), JSON.stringify({
    story_days: { "day-1": { label: "The night the lamp is lit" } },
    cards: {
      "june-okafor": { "day-1": { wardrobe: { outer: "yellow raincoat", bottom: "blue dungarees", shoes: "red boots" }, hair: "two puffs" } },
      "abel-marsh": { "day-1": { wardrobe: { top: "navy wool sweater", bottom: "grey trousers", shoes: "black boots" }, accessories: ["flat grey cap"], carries: ["the-matchbox"] } },
    },
  }, null, 2));
  fs.writeFileSync(path.join(dir, "continuity/shot-sheet.json"), JSON.stringify({
    locations: { "lamp-room": { look: "the top of a lighthouse, a big brass lamp in the middle" } },
    scenes: { "scene-01": { story_day: "day-1", time_of_day: "dusk", location: "lamp-room", shots: [
      { id: "1a", size: "wide", characters: [{ who: "{{june-okafor}}", action: "holds the bottom of the ladder" }, { who: "{{abel-marsh}}", action: "halfway up, reaching for the lamp" }] },
      { id: "1b", size: "close-up", changes: [{ who: "{{abel-marsh}}", hands: "the-matchbox", to: "{{june-okafor}}", reason: "he needs both hands on the ladder" }], characters: [{ who: "{{june-okafor}}", action: "looks up", holding: ["the-matchbox"] }] },
    ] } },
  }, null, 2));
  const gate = spawnSync(process.execPath, [path.join(process.cwd(), "scripts/check.mjs")], { cwd: dir, encoding: "utf8" });
  const out = spawnSync(process.execPath, [path.join(process.cwd(), "scripts/compile-shot.mjs"), "scene-01", "--shot", "1b"], { cwd: dir, encoding: "utf8" });
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(gate.status, 0, gate.stderr);
  assert.match(gate.stdout, /character registry: pass \(3 entries, 10 labels resolved on 2 surfaces/); // 2 cards, 1 carried prop, 3 cast, 1 who, 1 handed prop, 1 to, 1 held prop
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /CHARACTER 1: a nine-year-old girl[^\n]*WEARING: yellow raincoat over blue dungarees, red boots\. HAIR: two puffs\. IN HAND: a dented tin matchbox\. ACTION: looks up\./);
  assert.match(out.stdout, /CHANGED SINCE THE LAST SHOT: Abel hands a dented tin matchbox to CHARACTER 1\./, "someone off-screen is named");
  assert.match(out.stdout, /AVOID: lighter, night, stars\./);
});
