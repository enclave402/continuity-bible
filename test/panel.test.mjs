import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkControl, checkQuotes, pairedDifference, SIMULATED } from "../scripts/panel.mjs";

const text = fs.readFileSync(new URL("../examples/story/built/sam-first.txt", import.meta.url), "utf8");
const answers = (name) => JSON.parse(fs.readFileSync(new URL(`../examples/panel/${name}`, import.meta.url), "utf8")).readers;

test("a quote that sits in the named spread passes", () => {
  const result = checkQuotes(text, answers("quotes-ok.json"));
  assert.equal(result.ok, true);
  assert.match(result.line, /quotes OK \(1 quotes\)/);
});

test("a quote that is not in the spread fails", () => {
  const readers = [{ id: "reader-a", quotes: [{ spread: 1, text: "He replied at once." }] }];
  const result = checkQuotes(text, readers);
  assert.equal(result.ok, false);
  assert.match(result.line, /quote not verbatim reader-a spread 1/);
});

test("a no-read control at zero passes and a score above the ceiling throws the quiz out", () => {
  assert.equal(checkControl(answers("control-ok.json")).ok, true);
  const over = checkControl([{ id: "no-read", read: false, quiz_correct: 1 }]);
  assert.equal(over.ok, false);
  assert.match(over.line, /quiz thrown out/);
});

test("a missing no-read reader is not a passed control", () => {
  const result = checkControl([{ id: "reader-a", read: true, quiz_correct: 0 }]);
  assert.equal(result.ok, false);
  assert.match(result.line, /control missing/);
});

test("the paired difference is the mean of the same readers and the report says simulated", () => {
  const result = pairedDifference(answers("base.json"), answers("variant.json"), "satisfaction");
  assert.equal(result.ok, true);
  assert.equal(result.mean, 1);
  assert.equal(result.n, 2);
  assert.equal(result.unpaired, 0);
  assert.ok(result.report.startsWith(SIMULATED));
  assert.match(result.report, /paired satisfaction 1\.00 over 2 readers/);
});

test("a reader on only one side is counted unpaired and is not filled in", () => {
  const result = pairedDifference(
    [{ id: "reader-a", satisfaction: 1 }],
    [{ id: "reader-a", satisfaction: 1 }, { id: "reader-c", satisfaction: 5 }],
    "satisfaction",
  );
  assert.equal(result.mean, 0);
  assert.equal(result.n, 1);
  assert.equal(result.unpaired, 1);
});
