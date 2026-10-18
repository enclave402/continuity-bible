// Run from the repo root: npm test. new-character.mjs puts a reader's own character into the registry from answers.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { idFrom, insertEntry } from "../scripts/new-character.mjs";

// One temp story folder per run. keepOpen spawns with stdin never ended, as a terminal's is (see askOnOpenStdin in anchor.test.mjs).
function newRun({ answers, files = {}, keepOpen = false, args = [] }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-new-"));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
  const script = path.resolve("scripts/new-character.mjs");
  if (!keepOpen) { const r = spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: "utf8", input: answers }); return { status: r.status, out: r.stdout, err: r.stderr, dir }; }
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: dir, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout.on("data", (d) => { out += d; }); child.stderr.on("data", (d) => { err += d; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 4000);
    child.on("exit", (code) => { clearTimeout(timer); resolve({ status: code, exitedByItself: code !== null && !child.killed, out, err, dir }); });
    child.stdin.write(answers);   // deliberately no child.stdin.end()
  });
}
const read = (dir) => fs.readFileSync(path.join(dir, "character-registry.json"), "utf8");
const node = (dir, ...a) => spawnSync(process.execPath, a.map((x, i) => (i === 0 ? path.resolve(x) : x)), { cwd: dir, encoding: "utf8" });

// the tutorial's two characters, as a reader types them
const JUNE = ["The Lighthouse", "June", "June Okafor", "", "Nine-year-old who wants to see the lamp lit", "a nine-year-old girl with dark brown skin, black curls tied in two puffs, a yellow raincoat and red boots", "skin=dark brown"].join("\n") + "\n";
const ABEL = ["Abel", "Abel Marsh", "", "The last keeper of the lighthouse", "a tall old man with light brown skin, a short white beard, a navy wool sweater and a flat grey cap", "skin: light brown, beard: white"].join("\n") + "\n";
// the registry box in START-HERE step 3, byte for byte: the file a reader who copied the box already has
const TUTORIAL_BOX = fs.readFileSync("docs/1-tutorials/START-HERE.md", "utf8").match(/Create `my-story\/character-registry\.json`[\s\S]*?```json\n([\s\S]*?)```/)[1];

test("a new registry from piped answers: the file the tutorial's box writes, which the gate passes and render turns into words", () => {
  const r = newRun({ answers: JUNE });
  assert.equal(r.status, 0, r.err);
  assert.match(r.out, /^There is no character-registry\.json here yet, so this makes one, with your character in it\./);
  assert.match(r.out, /What is your story called\? A few words, like The Lighthouse\.\n> \n  Using: the-lighthouse\./);
  assert.match(r.out, /June's id will be june-okafor\. You write it in scenes, like \{\{june-okafor\}\}\. Press Enter to use it, or type another id\.\n> \n  Using: june-okafor\./);
  assert.match(r.out, /  Using: skin=dark brown\.\nMade character-registry\.json with june-okafor in it, in the story the-lighthouse\./);
  assert.match(r.out, /  \{\{june-okafor\}\}       becomes  June\n  \{\{june-okafor:full\}\}  becomes  June Okafor\n  \{\{june-okafor:look\}\}  becomes  a nine-year-old girl with dark brown skin/);
  const two = spawnSync(process.execPath, [path.resolve("scripts/new-character.mjs")], { cwd: r.dir, encoding: "utf8", input: ABEL });
  assert.equal(two.status, 0, two.stderr);
  assert.doesNotMatch(two.out ?? two.stdout, /What is your story called/, "the story comes from the characters already in");
  assert.deepEqual(JSON.parse(read(r.dir)), JSON.parse(TUTORIAL_BOX), "June and Abel by answers are the tutorial's box");
  fs.writeFileSync(path.join(r.dir, "scene-01.md"), "{{june-okafor}} and {{abel-marsh:full}}.\n\n{{june-okafor:look}}.\n");
  const gate = node(r.dir, "scripts/check.mjs");
  assert.equal(gate.status, 0, gate.stderr);
  const built = node(r.dir, "scripts/render.mjs", "scene-01.md");
  assert.equal(built.stdout, "June and Abel Marsh.\n\na nine-year-old girl with dark brown skin, black curls tied in two puffs, a yellow raincoat and red boots.\n");
  fs.rmSync(r.dir, { recursive: true, force: true });
});

test("adding to an existing registry keeps every other line as it was, and the robot's tokens render", () => {
  const r = newRun({ files: { "character-registry.json": TUTORIAL_BOX }, answers: "Bolt\n\n\nA garden robot who waters the plants\na small round robot with blue panels and one red eye\npanels=blue\n" });
  assert.equal(r.status, 0, r.err);
  assert.match(r.out, /^This adds one character to character-registry\.json\./);
  assert.match(r.out, /Added bolt to character-registry\.json, in the story the-lighthouse\./);
  assert.doesNotMatch(r.out, /\{\{bolt:full\}\}/, "no full name, no :full line");
  const bolt = { name: "Bolt", kind: "person", story: "the-lighthouse", role: "A garden robot who waters the plants", prose_only: true, forms: { look: "a small round robot with blue panels and one red eye" }, canon_tags: { panels: "blue" } };
  const expected = TUTORIAL_BOX.replace(/\n    \}\n  \}\n\}\n$/, `\n    },\n    "bolt": ${JSON.stringify(bolt, null, 2).split("\n").join("\n    ")}\n  }\n}\n`);
  assert.notEqual(expected, TUTORIAL_BOX);
  assert.equal(read(r.dir), expected, "the old file, a comma after Abel, and Bolt: every other line as it was, one-line objects included");
  const reg = JSON.parse(read(r.dir));
  assert.deepEqual(Object.keys(reg.characters), ["june-okafor", "abel-marsh", "bolt"]);
  fs.writeFileSync(path.join(r.dir, "scene-01.md"), "{{bolt}} waved. {{bolt:look}}.\n");
  assert.equal(node(r.dir, "scripts/check.mjs").status, 0);
  assert.equal(node(r.dir, "scripts/render.mjs", "scene-01.md").stdout, "Bolt waved. a small round robot with blue panels and one red eye.\n");
  fs.rmSync(r.dir, { recursive: true, force: true });
});

test("an invalid typed id is refused with the id it could be, and asked again", () => {
  const r = newRun({ answers: "Robots\nMika\nMika Tanaka\nMika Tanaka\nmika_t\nmika-t\nBuilds robots\na girl with round glasses\n\n" });
  assert.equal(r.status, 0, r.err);
  assert.match(r.out, /  "Mika Tanaka" is not an id: an id uses only lower-case letters, digits and hyphens, like mika-tanaka\. Type it again, or press Enter for mika-tanaka\./);
  assert.match(r.out, /  "mika_t" is not an id: .*like mika-t\./);
  assert.match(r.out, /  Using: mika-t\./);
  assert.match(r.out, /  Using: nothing fixed\./);
  const reg = JSON.parse(read(r.dir));
  assert.deepEqual(Object.keys(reg.characters), ["mika-t"]);
  assert.equal(reg.characters["mika-t"].canon_tags, undefined, "nothing fixed writes no canon_tags");
  fs.rmSync(r.dir, { recursive: true, force: true });
});

test("a taken id or name is refused; a close spelling of one is pointed out; an unreadable trait is asked again", () => {
  const box = { "character-registry.json": TUTORIAL_BOX };
  const dup = newRun({ files: box, answers: "Junie\nJune Okafor\n\njune-okafor\n" });
  assert.equal(dup.status, 1);
  assert.match(dup.out, /The registry already has june-okafor \(June Okafor\)\. Each character needs its own id\. Type an id for Junie, like june-okafor-2\./, "the id made from the full name is taken, so Enter offers nothing");
  assert.match(dup.out, /  Type an id: lower-case letters, digits and hyphens\.\n> \n  The registry already has june-okafor \(June Okafor\)\. Each character needs its own id\. Type another\./);
  assert.match(dup.err, /the answers stopped before the end, so nothing was written/);
  assert.equal(read(dup.dir), TUTORIAL_BOX, "nothing written");
  fs.rmSync(dup.dir, { recursive: true, force: true });
  const name = newRun({ files: box, answers: "june\n" });
  assert.match(name.out, /  The registry already has a character called june: june-okafor \(June Okafor\)\. One name is one person, or the checker cannot tell them apart\./);
  fs.rmSync(name.dir, { recursive: true, force: true });
  const near = newRun({ files: box, answers: "Abe\nAbel Marsch\n\nr\na man with a beard\nbeard=gray beard\n\n" });
  assert.equal(near.status, 0, near.err);
  assert.match(near.out, /  Using: abel-marsch\.\n  Note: the registry already has abel-marsh \(Abel Marsh\)\. If that is this same character, press Ctrl-C now: it is already in\./);
  assert.match(near.out, /  Noted: the look does not say "gray beard"\. A picture prompt asks only for what the look says\. Type the whole look again with it, or press Enter to keep the look as it is\./);
  const tricky = newRun({ answers: "S\nNova\n\n\nr\na robot\nsilver robot\n\n" });
  assert.match(tricky.out, /  I could not read: silver robot\. Type each trait like skin=dark brown, with commas between them, or press Enter for none\./);
  assert.equal(tricky.status, 0, tricky.err);
  fs.rmSync(near.dir, { recursive: true, force: true });
  fs.rmSync(tricky.dir, { recursive: true, force: true });
});

test("a run cut short writes nothing, new file or old; a broken registry is named and left alone", () => {
  const fresh = newRun({ answers: JUNE.split("\n").slice(0, 6).join("\n") + "\n" });
  assert.equal(fresh.status, 1);
  assert.match(fresh.err, /^new-character: the answers stopped before the end, so nothing was written\. Run it again when you are ready/);
  assert.equal(fs.existsSync(path.join(fresh.dir, "character-registry.json")), false);
  fs.rmSync(fresh.dir, { recursive: true, force: true });
  const old = newRun({ files: { "character-registry.json": TUTORIAL_BOX }, answers: "Bolt\n\n\n" });
  assert.equal(old.status, 1);
  assert.equal(read(old.dir), TUTORIAL_BOX);
  fs.rmSync(old.dir, { recursive: true, force: true });
  const curly = TUTORIAL_BOX.replace('"name": "June"', "“name”: “June”");
  const broken = newRun({ files: { "character-registry.json": curly }, answers: ABEL });
  assert.equal(broken.status, 1);
  assert.match(broken.err, /character-registry\.json: line 11, column 7: this is not valid JSON\. Likely cause: that line has curly quotes/);
  assert.equal(read(broken.dir), curly);
  fs.rmSync(broken.dir, { recursive: true, force: true });
});

test("it exits by itself with stdin left open, and refuses to write into the tool's own folder", async () => {
  const open = await newRun({ answers: JUNE, keepOpen: true });
  assert.ok(open.exitedByItself, "new-character.mjs must end by itself after the last answer\n" + open.out + open.err);
  assert.equal(open.status, 0, open.err);
  assert.ok(JSON.parse(read(open.dir)).characters["june-okafor"]);
  fs.rmSync(open.dir, { recursive: true, force: true });
  const notes = await newRun({ answers: "Abe\nAbel Marsch\n\nr\na man\nbeard=white\n\n", files: { "character-registry.json": TUTORIAL_BOX }, keepOpen: true });
  assert.ok(notes.exitedByItself, "a note asks one more question; the command still ends by itself\n" + notes.out + notes.err);
  fs.rmSync(notes.dir, { recursive: true, force: true });
  const before = fs.readFileSync("character-registry.json", "utf8");
  const own = spawnSync(process.execPath, ["scripts/new-character.mjs"], { encoding: "utf8", input: JUNE });
  assert.equal(own.status, 1);
  assert.match(own.stderr, /this is the tool's own folder, not your story folder\. Fix: .*cd my-story/);
  assert.equal(fs.readFileSync("character-registry.json", "utf8"), before);
});

test("idFrom and insertEntry: accents dropped, the file's own indent and line endings, null for a one-line characters", () => {
  assert.equal(idFrom("Zoë Núñez"), "zoe-nunez");
  assert.equal(idFrom("  R2-D2!  "), "r2-d2");
  assert.equal(idFrom("美咲"), "");
  const entry = { name: "B", kind: "person", story: "s", role: "r" };
  const crlf = '{\r\n\t"registry_version": 1,\r\n\t"characters": {\r\n\t\t"a": { "name": "A", "kind": "person", "story": "s", "role": "r" }\r\n\t}\r\n}\r\n';
  const out = insertEntry(crlf, "b", entry);
  assert.ok(out.startsWith(crlf.slice(0, crlf.indexOf("}\r\n\t}") + 1) + ",\r\n\t\t\"b\": {\r\n\t\t\t\"name\": \"B\""), out);
  assert.ok(!/[^\r]\n/.test(out), "CRLF stays CRLF");
  const empty = insertEntry('{\n  "registry_version": 1,\n  "characters": {}\n}\n', "b", entry);
  assert.deepEqual(JSON.parse(empty).characters, { b: entry });
  assert.match(empty, /\n  "characters": \{\n    "b": \{\n      "name": "B",/);
  assert.equal(insertEntry('{"registry_version":1,"characters":{"a":{"name":"A"}}}', "b", entry), null);
});
