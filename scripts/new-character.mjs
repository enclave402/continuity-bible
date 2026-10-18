#!/usr/bin/env node
/**
 * new-character.mjs: put one character into character-registry.json by answering questions, instead of editing JSON by hand.
 *
 *   node scripts/new-character.mjs [--registry <path>]
 *
 * It asks for the name the story uses, the full name (Enter for the same), the id (made from the full name: lower-case
 * letters, digits and hyphens; Enter accepts it), a one-line role, how the character looks in plain words (forms.look, what
 * {{id:look}} becomes in a picture prompt) and what must never change, as trait=value or trait: value (canon_tags). kind is
 * "person" (animals and robots included) and story is the one the registry's characters are in, asked once when there are
 * none. With no registry yet it makes one, with the tutorial's token_sources and coverage; with one, it adds the entry and
 * leaves every other line of the file as it was. It refuses an id or a name that is already taken, validates the result
 * against the registry schema before writing, and prints the tokens to use in a scene. Nothing is written if the answers
 * stop early. Answers can be piped in; the reader is closed at the end so a real terminal gets its prompt back.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { registryPath, loadRegistry, readJson, validate, buildIndex, writeJsonLike, closestIds, SCHEMA_PATH } from "./lib.mjs";
import { readKeep } from "./anchor.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ID = /^[a-z0-9][a-z0-9-]*$/;
const low = (v) => String(v).trim().toLowerCase();

/** An id from a name: accents dropped, lower-case letters and digits, runs of anything else one hyphen. "" when nothing is left. */
export const idFrom = (text) => String(text || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** The new registry a first character goes into: the tutorial's token_sources and coverage. */
export const NEW_REGISTRY = () => ({
  registry_version: 1,
  token_sources: [{ file: "scene-*.md", why: "my scenes hold tokens, never a typed name" }],
  coverage: { ignore: ["built/**"] },
  characters: {},
});

/** [open, close]: the positions of the braces of the top-level "characters" object in a JSON text, or null. Strings are skipped. */
function charactersSpan(text) {
  let depth = 0, key = null, open = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      if (depth === 1 && /^\s*:/.test(text.slice(j + 1, j + 40))) key = text.slice(i + 1, j);
      i = j;
    } else if (c === "{" || c === "[") {
      if (c === "{" && depth === 1 && key === "characters" && open === -1) open = i;
      depth++;
    } else if (c === "}" || c === "]") {
      depth--;
      if (open !== -1 && depth === 1) return [open, i];
    }
  }
  return null;
}

/**
 * The registry text with one entry added as the last character, every other line kept as it was (indent, line endings,
 * one-line objects). null when the layout is not one this can follow (a one-line "characters"); the caller then writes the
 * whole file with writeJsonLike. The result is parsed and compared before it is returned, so it is never a broken file.
 */
export function insertEntry(text, id, entry) {
  const span = charactersSpan(text);
  if (!span) return null;
  const [open, close] = span;
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lineOf = (pos) => text.slice(text.lastIndexOf("\n", pos - 1) + 1, pos);
  const closeIndent = lineOf(close);
  if (!/^[ \t]*$/.test(closeIndent) && text.slice(open + 1, close).trim()) return null;
  const inner = text.slice(open + 1, close);
  const firstKey = inner.match(/\n([ \t]*)"/);
  const base = (lineOf(open).match(/^[ \t]*/) || [""])[0];
  const unit = firstKey && firstKey[1].startsWith(base) && firstKey[1].length > base.length ? firstKey[1].slice(base.length) : ((text.split("\n")[1] || "").match(/^[ \t]+/) || ["  "])[0];
  const indent = firstKey ? firstKey[1] : base + unit;
  const block = `${indent}${JSON.stringify(id)}: ${JSON.stringify(entry, null, unit).split("\n").join(eol + indent)}`;
  let out;
  if (inner.trim()) {
    const last = open + 1 + inner.trimEnd().length; // just after the last entry's closing brace
    out = text.slice(0, last) + "," + eol + block + text.slice(last);
  } else {
    out = text.slice(0, open + 1) + eol + block + eol + base + text.slice(close);
  }
  try {
    const before = JSON.parse(text), after = JSON.parse(out);
    return isDeepStrictEqual(after, { ...before, characters: { ...(before.characters || {}), [id]: entry } }) ? out : null;
  } catch { return null; }
}

// run as a command (also through a symlinked folder): compare real paths, not the spelling of argv[1]
const isMain = (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url)); } catch { return false; } })();
let reader = null;
if (isMain) main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => reader?.close());

async function main() {
  const stop = (msg) => { console.error(msg); process.exit(1); };
  const file = registryPath(process.argv);
  const flagged = process.argv.includes("--registry") || Boolean(process.env.CHARACTER_REGISTRY);
  // run from the tool's own folder, it would add to the project's example registry instead of the story's
  const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
  if (!flagged && real(process.cwd()) === real(path.dirname(HERE))) stop("new-character: this is the tool's own folder, not your story folder. Fix: make your story folder and go into it (mkdir my-story, then cd my-story), then run node ../scripts/new-character.mjs");
  const shown = path.relative(process.cwd(), file) || path.basename(file);
  let registry = null, text = "";
  if (fs.existsSync(file)) {
    try { registry = loadRegistry(file); } catch (e) { stop(e.message); }
    text = fs.readFileSync(registry._file, "utf8");
    if (registry._caseNote) console.log(registry._caseNote);
  }
  const characters = registry?.characters || {};
  const taken = (id) => Object.prototype.hasOwnProperty.call(characters, id);
  const who = (id) => `${id} (${characters[id].full_name || characters[id].name})`;
  const stories = Object.values(characters).map((e) => e.story).filter(Boolean);
  let story = stories.sort((a, b) => stories.filter((s) => s === b).length - stories.filter((s) => s === a).length)[0] || "";

  const rl = reader = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (prompt) => { process.stdout.write(prompt); const { value, done } = await lines.next(); if (!process.stdin.isTTY) process.stdout.write("\n"); return done ? null : String(value).trim(); };
  const ended = () => stop("new-character: the answers stopped before the end, so nothing was written. Run it again when you are ready");
  const answer = async (again) => { for (;;) { const a = await ask("> "); if (a === null) ended(); if (a) return a; console.log(`  ${again}`); } };

  console.log(registry
    ? `This adds one character to ${shown}. Answer each question and press Enter.`
    : `There is no ${shown} here yet, so this makes one, with your character in it. Answer each question and press Enter.`);
  if (!story) {
    console.log("What is your story called? A few words, like The Lighthouse.");
    for (;;) {
      story = idFrom(await answer("Type a few words, like The Lighthouse."));
      if (story) break;
      console.log("  Type it with the letters a to z or digits, like The Lighthouse.");
    }
    console.log(`  Using: ${story}.`);
  }

  // a name another character has (as its name, an alias or a retired form) would make the gate fail: one name is one person
  const { index, retired } = buildIndex({ ...(registry || {}), characters });
  console.log("What does the story call this character? Type the name you use most, like Mika.");
  let name;
  for (;;) {
    name = await answer("Type a name, like Mika.");
    const owner = index.get(name.toLowerCase())?.id;
    const gone = retired.find((r) => low(r.form) === low(name));
    if (owner) console.log(`  The registry already has a character called ${name}: ${who(owner)}. One name is one person, or the checker cannot tell them apart. If that is this character, it is already in: press Ctrl-C to stop. Otherwise type a name only this one uses.`);
    else if (gone) console.log(`  ${name} is a retired name of ${who(gone.id)}, so it may not come back. Type another name.`);
    else break;
  }
  console.log(`What is ${name}'s full name? Press Enter if it is just ${name}.`);
  const fullAnswer = await ask("> ");
  if (fullAnswer === null) ended();
  const full = fullAnswer || name;

  const suggested = idFrom(full) || idFrom(name);
  const offer = suggested && !taken(suggested) ? suggested : "";
  if (offer) console.log(`${name}'s id will be ${offer}. You write it in scenes, like {{${offer}}}. Press Enter to use it, or type another id.`);
  else if (suggested) console.log(`The registry already has ${who(suggested)}. Each character needs its own id. Type an id for ${name}, like ${suggested}-2.`);
  else console.log(`Type an id for ${name}: lower-case letters, digits and hyphens, like mika-tanaka. You write it in scenes, like {{mika-tanaka}}.`);
  let id;
  for (;;) {
    const a = await ask("> ");
    if (a === null) ended();
    const orEnter = offer ? `, or press Enter for ${offer}` : "";
    if (!a) { if (offer) { id = offer; break; } console.log("  Type an id: lower-case letters, digits and hyphens."); continue; }
    if (!ID.test(a)) { console.log(`  "${a}" is not an id: an id uses only lower-case letters, digits and hyphens, like ${idFrom(a) || "mika-tanaka"}. Type it again${orEnter}.`); continue; }
    if (taken(a)) { console.log(`  The registry already has ${who(a)}. Each character needs its own id. Type another${orEnter}.`); continue; }
    id = a;
    break;
  }
  console.log(`  Using: ${id}.`);
  // a close spelling of an id that is already in is usually the same character typed again
  const near = closestIds(id, Object.keys(characters)).filter((k) => k !== id && k !== suggested);
  if (near.length) console.log(`  Note: the registry already has ${near.map(who).join(" and ")}. If that is this same character, press Ctrl-C now: it is already in.`);

  console.log(`Who is ${name}, in one line? Like: Ten-year-old who builds robots in the garage.`);
  const role = await answer(`Type one line about who ${name} is.`);
  console.log(`How does ${name} look? One line, in the words a picture prompt should use, like: a ten-year-old girl with brown skin, short black hair, round glasses and a green hoodie.`);
  let look = await answer(`Type how ${name} looks, so the picture prompt can ask for it.`);
  if (new RegExp(`(^|[^a-z])${name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(look.toLowerCase())) {
    console.log(`  Noted: the look says "${name}". A picture model does not know your characters by name, so the look should say what to draw. Type the look again without the name, or press Enter to keep it.`);
    const b = await ask("> ");
    if (b === null) ended();
    if (b) look = b;
  }

  console.log(`What about ${name} must never change, in any picture? Type each trait like skin=dark brown, with commas between them. Press Enter for none.`);
  let keep;
  for (;;) {
    const a = await ask("> ");
    if (a === null) ended();
    const r = readKeep(a);
    if (a && r.unread.length) { console.log(`  I could not read: ${r.unread.join("; ")}. Type each trait like skin=dark brown, with commas between them, or press Enter for none.`); continue; }
    keep = r.keep;
    break;
  }
  const pairs = Object.entries(keep).map(([k, v]) => `${k}=${v}`).join(", ");
  console.log(`  Using: ${pairs || "nothing fixed"}.`);
  // a fixed trait the look never mentions is never asked for, so the pictures will not keep it
  const unsaid = Object.values(keep).filter((v) => !look.toLowerCase().includes(low(v)));
  if (unsaid.length) {
    console.log(`  Noted: the look does not say ${unsaid.map((v) => `"${v}"`).join(" or ")}. A picture prompt asks only for what the look says. Type the whole look again with it, or press Enter to keep the look as it is.`);
    const b = await ask("> ");
    if (b === null) ended();
    if (b) look = b;
  }

  const entry = { name, ...(full !== name ? { full_name: full } : {}), kind: "person", story, role, prose_only: true, forms: { look }, ...(pairs ? { canon_tags: keep } : {}) };
  const { _file, _root, _caseNote, ...bare } = registry || NEW_REGISTRY();
  const next = { ...bare, characters: { ...(bare.characters || {}), [id]: entry } };
  // the gate's schema check and its one-name-one-person check, before anything is written: only what this entry adds counts
  const schema = readJson(SCHEMA_PATH);
  const had = new Set(registry ? [...validate(schema, bare), ...buildIndex({ ...bare, _file: shown }).failures] : []);
  const adds = [...validate(schema, next), ...buildIndex({ ...next, _file: shown }).failures].filter((p) => !had.has(p));
  if (adds.length) stop(`new-character: the registry would not pass with this character, so nothing was written: ${adds.join("; ")}`);
  const target = registry?._file || file;
  const inserted = registry ? insertEntry(text, id, entry) : null;
  if (inserted !== null) fs.writeFileSync(target, inserted);
  else writeJsonLike(target, next, text);

  console.log(registry ? `Added ${id} to ${shown}, in the story ${story}.` : `Made ${shown} with ${id} in it, in the story ${story}.`);
  const rows = [[`{{${id}}}`, name], ...(full !== name ? [[`{{${id}:full}}`, full]] : []), [`{{${id}:look}}`, look]];
  const width = Math.max(...rows.map(([t]) => t.length));
  console.log(`In your scenes, write these instead of ${name}'s name or look:`);
  for (const [t, words] of rows) console.log(`  ${t.padEnd(width)}  becomes  ${words}`);
  const rel = path.relative(process.cwd(), HERE).split(path.sep).join("/") || ".";
  const scripts = rel.startsWith("../../../") ? HERE : rel; // from a story folder it is ../scripts; from far away, the whole path
  console.log(`To add another character, run this again. Next: write your scene with these tokens, then check it with node ${scripts}/check.mjs`);
}
