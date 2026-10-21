// The Before & After showcase. Why: a case is a folder anyone can drop in, so the engine must find it with no code
// change, refuse a half-filled or dishonest one with a plain fix, and keep the two gallery files in step with the cases.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { discoverCases, validateCase, scaffoldCase, renderMarkdown, renderHtml, wordDiff, build, check } from "../scripts/showcase.mjs";

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SCRIPT = path.join(REPO, "scripts", "showcase.mjs");
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082", "hex");

/** A throwaway repository root with the real template, one proof file and the cases given. */
function sandbox(cases = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "showcase-"));
  fs.mkdirSync(path.join(root, "showcase", "cases"), { recursive: true });
  fs.copyFileSync(path.join(REPO, "showcase", "TEMPLATE.json"), path.join(root, "showcase", "TEMPLATE.json"));
  fs.mkdirSync(path.join(root, "scripts"));
  fs.writeFileSync(path.join(root, "scripts", "fix.mjs"), "// the fix\n");
  for (const [slug, { data, images = ["before.png", "after.png"] }] of Object.entries(cases)) {
    const dir = path.join(root, "showcase", "cases", slug);
    fs.mkdirSync(dir, { recursive: true });
    if (data !== undefined) fs.writeFileSync(path.join(dir, "case.json"), typeof data === "string" ? data : JSON.stringify(data, null, 2));
    for (const img of images) fs.writeFileSync(path.join(dir, img), PNG);
  }
  return root;
}
const goodCase = (over = {}) => ({ title: "Lost Hood", category: "garment-layering", evidence: "diagram", what_broke: "The hood fell off.", how_fixed: "Layers in the wardrobe file.", before_prompt: "a hooded coat", after_prompt: "a long coat with hood attached at the collar", proof_in_repo: ["scripts/fix.mjs"], ...over });
const run = (root, ...args) => spawnSync(process.execPath, [SCRIPT, "--root", root, ...args], { encoding: "utf8" });
const done = (root) => fs.rmSync(root, { recursive: true, force: true });

test("discovery finds every case folder, sorted, with its pictures, and lists a folder with no case.json instead of skipping it", () => {
  const root = sandbox({ "b-case": { data: goodCase() }, "a-case": { data: goodCase(), images: ["before.jpg", "after.svg"] }, "c-empty": { data: undefined, images: [] } });
  try {
    const found = discoverCases(root);
    assert.deepEqual(found.map((c) => c.slug), ["a-case", "b-case", "c-empty"]);
    assert.equal(found[0].before, "before.jpg");
    assert.equal(found[0].after, "after.svg");
    assert.equal(found[1].before, "before.png");
    assert.match(found[2].error, /no case\.json/);
  } finally { done(root); }
});

test("--new scaffolds a case.json from the template, prints the next steps, and never overwrites a folder", () => {
  const root = sandbox();
  try {
    const r = run(root, "--new", "phantom-hoodie");
    assert.equal(r.status, 0, r.stderr);
    const made = JSON.parse(fs.readFileSync(path.join(root, "showcase/cases/phantom-hoodie/case.json"), "utf8"));
    assert.deepEqual(made, JSON.parse(fs.readFileSync(path.join(root, "showcase/TEMPLATE.json"), "utf8")));
    assert.match(r.stdout, /before\.png \(the mistake\) and after\.png \(the fix\)/);
    assert.match(r.stdout, /--check/);
    fs.writeFileSync(path.join(root, "showcase/cases/phantom-hoodie/case.json"), "{\"mine\": true}");
    const again = run(root, "--new", "phantom-hoodie");
    assert.equal(again.status, 1);
    assert.match(again.stderr, /already exists\. Nothing was changed/);
    assert.equal(fs.readFileSync(path.join(root, "showcase/cases/phantom-hoodie/case.json"), "utf8"), "{\"mine\": true}", "the author's file is untouched");
    const bad = run(root, "--new", "Bad Name");
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /lowercase words joined by dashes/);
    assert.throws(() => scaffoldCase(root, undefined), /not a good case name/);
  } finally { done(root); }
});

test("a freshly scaffolded case fails --check until its pictures and words are the author's own", () => {
  const root = sandbox();
  try {
    scaffoldCase(root, "new-one");
    const errors = validateCase(discoverCases(root)[0], root);
    for (const key of ["title", "what_broke", "how_fixed", "before_prompt", "after_prompt"]) assert.ok(errors.some((e) => e.includes(`"${key}" still has the template's words`)), `${key}: ${errors.join("\n")}`);
    assert.ok(errors.some((e) => /"category" is/.test(e)), "the template's list of categories is not a category");
    assert.ok(errors.some((e) => /"evidence" is/.test(e)));
    assert.ok(errors.some((e) => /no before picture/.test(e)) && errors.some((e) => /no after picture/.test(e)));
  } finally { done(root); }
});

test("--check passes good cases with up-to-date gallery files and exits 0", () => {
  const root = sandbox({ "lost-hood": { data: goodCase() } });
  try {
    assert.equal(run(root).status, 0);
    const r = run(root, "--check");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /showcase: pass \(1 case\(s\), gallery files up to date\)/);
  } finally { done(root); }
});

test("--check fails with exit 1 and one plain fix per problem", () => {
  const root = sandbox({
    "no-after": { data: goodCase(), images: ["before.png"] },
    "empty-words": { data: goodCase({ title: "  ", what_broke: "", how_fixed: 7 }) },
    "leaky": { data: goodCase({ before: "/" + "Users/someone/pics/before.png", how_fixed: "see /" + "home/me/notes" }) },
    "bad-proof": { data: goodCase({ proof_in_repo: ["scripts/missing.mjs", "../outside.txt"] }) },
    "wrong-kind": { data: goodCase({ category: "vibes", evidence: "trust me" }) },
    "broken-json": { data: "{ not json" },
    "blank-label": { data: goodCase({ before_label: " " }) },
  });
  try {
    assert.equal(run(root).status, 1, "the build says some cases were left out");
    const r = run(root, "--check");
    assert.equal(r.status, 1);
    const e = r.stderr;
    assert.match(e, /no-after: no after picture\. Fix: add after\.png/);
    for (const k of ["title", "what_broke", "how_fixed"]) assert.match(e, new RegExp(`empty-words/case\\.json: "${k}" is empty`));
    assert.match(e, /leaky\/case\.json: "before" is "\/Users\/someone\/pics\/before\.png"\. Fix: put the picture inside the case folder/);
    assert.match(e, /leaky\/case\.json: "how_fixed" holds a path from someone's computer/);
    assert.match(e, /bad-proof\/case\.json: proof_in_repo names scripts\/missing\.mjs, which does not exist/);
    assert.match(e, /bad-proof\/case\.json: proof_in_repo entry "\.\.\/outside\.txt" must be a path inside this repository/);
    assert.match(e, /wrong-kind\/case\.json: "category" is "vibes"/);
    assert.match(e, /wrong-kind\/case\.json: "evidence" is "trust me"\. .*never call a drawing a real picture/);
    assert.match(e, /broken-json: case\.json is not valid JSON/);
    assert.match(e, /blank-label\/case\.json: "before_label" must be a short caption, or left out/);
    assert.match(e, /showcase: fail/);
  } finally { done(root); }
});

test("--check fails when a gallery file is missing or out of date with the cases", () => {
  const root = sandbox({ "lost-hood": { data: goodCase() } });
  try {
    let r = run(root, "--check");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /docs\/SHOWCASE\.md is missing\. Fix: run npm run showcase/);
    assert.match(r.stderr, /showcase\.html is missing/);
    run(root);
    fs.writeFileSync(path.join(root, "showcase/cases/lost-hood/case.json"), JSON.stringify(goodCase({ title: "Lost Hood, renamed" })));
    r = run(root, "--check");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /docs\/SHOWCASE\.md is out of date with the cases\. Fix: run npm run showcase/);
    assert.equal(check(root).errors.length, 2);
  } finally { done(root); }
});

test("the Markdown gallery explains why and how, shows each pair side by side with relative paths, and says what kind of pictures they are", () => {
  const root = sandbox({ "lost-hood": { data: goodCase() }, "real-one": { data: goodCase({ title: "Real Pair", evidence: "real-pictures", before_prompt: "", after_prompt: "", before_label: "First try, 2026-10-15", after_label: "Redone, no anchor yet" }), images: ["before.jpg", "after.jpg"] } });
  try {
    const md = build(root).markdown;
    assert.match(md, /^<!-- generated by scripts\/showcase\.mjs; do not edit/);
    assert.match(md, /\*\*Why this page exists:\*\*/);
    assert.match(md, /\*\*How to add your own case/);
    assert.ok(md.indexOf("## Real Pair") < md.indexOf("## Lost Hood"), "real pictures lead the gallery");
    assert.match(md, /\| !\[Before: Lost Hood\]\(\.\.\/showcase\/cases\/lost-hood\/before\.png\) \| !\[After: Lost Hood\]\(\.\.\/showcase\/cases\/lost-hood\/after\.png\) \|/);
    assert.match(md, /\*\*What broke:\*\* The hood fell off\./);
    assert.match(md, /\*\*How it was fixed:\*\* Layers in the wardrobe file\./);
    assert.match(md, /Diagram: a simple drawing that shows the kind of mistake\. It is not a generated picture\./);
    assert.match(md, /Words the fix added: `long` · `with hood attached at the collar`/);
    assert.match(md, /No prompts were saved for this pair\./);
    assert.match(md, /\| Before: the mistake \| After: the fix \|/, "default captions");
    assert.match(md, /\| First try, 2026-10-15 \| Redone, no anchor yet \|/, "a case's own captions replace the defaults");
    assert.match(md, /\[`scripts\/fix\.mjs`\]\(\.\.\/scripts\/fix\.mjs\)/);
    assert.doesNotMatch(md, /\/Users\/|\/home\/|\/tmp|\/var\/folders/, "no machine paths");
  } finally { done(root); }
});

test("the HTML viewer is one static page: escaped text, both pictures, a slider, a word-by-word prompt diff, no outside files", () => {
  const root = sandbox({ "lost-hood": { data: goodCase({ what_broke: "The <hood> & the coat." }) } });
  try {
    const html = build(root).html;
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /<b>Why this page exists:<\/b>/);
    assert.match(html, /<b>How to add your own case:<\/b>/);
    assert.match(html, /The &lt;hood&gt; &amp; the coat\./);
    assert.match(html, /src="showcase\/cases\/lost-hood\/before\.png"/);
    assert.match(html, /src="showcase\/cases\/lost-hood\/after\.png"/);
    assert.match(html, /<input type="range"/);
    assert.match(html, /a <del>hooded<\/del> <ins>long<\/ins> coat <ins>with hood attached at the collar<\/ins>/);
    assert.doesNotMatch(html, /<script src=|<link rel="stylesheet"|https?:\/\//, "zero dependencies");
    assert.doesNotMatch(html, /\/Users\/|\/home\/|\/tmp|\/var\/folders/);
    assert.match(renderHtml([]), /No cases yet/);
    assert.match(renderMarkdown([]), /No cases yet/);
  } finally { done(root); }
});

test("wordDiff keeps shared words and marks what was added and dropped", () => {
  assert.deepEqual(wordDiff("a b c", "a x c d"), [{ op: "same", text: "a" }, { op: "drop", text: "b" }, { op: "add", text: "x" }, { op: "same", text: "c" }, { op: "add", text: "d" }]);
  assert.deepEqual(wordDiff("", "new words"), [{ op: "add", text: "new words" }]);
});

test("the repository's own cases pass and its gallery files are up to date", () => {
  const r = spawnSync(process.execPath, [SCRIPT, "--check"], { encoding: "utf8", cwd: REPO });
  assert.equal(r.status, 0, r.stderr);
  const slugs = discoverCases(REPO).map((c) => c.slug);
  for (const s of ["the-prosecutors-finger", "phantom-hoodie", "backwards-phone"]) assert.ok(slugs.includes(s), s);
});
