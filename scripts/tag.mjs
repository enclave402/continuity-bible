#!/usr/bin/env node
/**
 * tag.mjs: write a character's tags file by answering questions about each picture, instead of typing JSON by hand.
 *
 *   node scripts/tag.mjs <character-id> [--pictures renders] [--out tags-<name>.jsonl] [--traits hair,coat] [--registry <path>]
 *
 * It lists the pictures in the pictures folder in name order (scene-01-01.png, scene-01-02.png, ...), asks which traits to
 * track (the character's fixed traits from canon_tags, plus any you add), then asks what you see for each trait in each
 * picture. From the second picture on, Enter repeats the answer for the picture before. "unknown" is the word for "I cannot
 * tell" (the registry's drift_resolution.unreadable replaces it). It writes one line per picture, in the format
 * scripts/anchor.mjs reads, and never guesses a value: what you type is what is written. Answers can be piped in; the
 * reader is closed at the end so a real terminal gets its prompt back.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { registryPath, loadRegistry, closestIds } from "./lib.mjs";

const PICTURE = /\.(png|jpe?g|webp|gif)$/i;
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? "" : argv[i + 1] || ""; };
const VALUE_FLAGS = new Set(["--pictures", "--out", "--traits", "--registry"]);
const id = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
const stop = (msg) => { console.error(msg); process.exit(1); };
if (!id) { console.error("usage: node scripts/tag.mjs <character-id> [--pictures renders] [--out tags-<name>.jsonl] [--traits hair,coat]"); process.exit(2); }

let registry;
try { registry = loadRegistry(registryPath(process.argv)); } catch (e) { stop(e.message); }
const entry = registry.characters?.[id];
if (!entry) {
  const ids = Object.keys(registry.characters || {});
  const near = closestIds(id, ids);
  stop(`tag: there is no character "${id}" in ${path.basename(registry._file)}. ${near.length ? `Did you mean ${near.join(" or ")}? ` : ""}Fix: use the id exactly as the registry writes it${ids.length ? ` (${ids.join(", ")})` : ""}`);
}
const name = entry.name || id;
const folder = flag("--pictures") || "renders";
if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) stop(`tag: there is no ${folder} folder here. Fix: make it with mkdir ${folder}, put your pictures in it, and run this from your story folder`);
const pictures = fs.readdirSync(folder).filter((n) => PICTURE.test(n)).sort((a, b) => a.localeCompare(b, "en", { numeric: true })).map((n) => path.posix.join(folder.split(path.sep).join("/"), n));
if (!pictures.length) stop(`tag: the ${folder} folder has no pictures in it (.png, .jpg, .webp). Fix: move your downloaded pictures into it first`);
const out = flag("--out") || `tags-${String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || id}.jsonl`;
const fixed = entry.canon_tags || {};
const low = (v) => String(v).trim().toLowerCase();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
const lines = rl[Symbol.asyncIterator]();
const ask = async (prompt) => { process.stdout.write(prompt); const { value, done } = await lines.next(); if (!process.stdin.isTTY) process.stdout.write("\n"); return done ? null : String(value).trim(); };
const ended = () => stop(`tag: the answers stopped before the end, so nothing was written. Run it again when you are ready`);

try {
  if (fs.existsSync(out)) {
    console.log(`${out} is already here. Type y and press Enter to replace it, or just press Enter to stop.`);
    const a = await ask("> ");
    if (!/^y/i.test(a || "")) { console.log(`Nothing changed. ${out} is as it was.`); process.exit(0); }
  }
  let traits = Object.keys(fixed);
  if (flag("--traits")) traits = [...new Set([...traits, ...flag("--traits").split(",").map((t) => low(t)).filter(Boolean)])];
  else {
    console.log(`Which traits do you want to write down for ${name}? ${traits.length ? `The fixed traits are: ${traits.join(", ")}.` : "There are no fixed traits in the registry."}`);
    console.log("Type any others to track, with commas between them, like hair, coat. Press Enter for none.");
    const a = await ask("> ");
    if (a === null) ended();
    traits = [...new Set([...traits, ...a.split(/[,;]|\s+and\s+/).map((t) => low(t)).filter(Boolean)])];
  }
  if (!traits.length) stop("tag: there is nothing to write down: no fixed traits and no others. Fix: run it again and type the traits to track, like hair, coat");
  console.log(`  Using: ${traits.join(", ")}.`);
  console.log("Look at each picture and type what you see. Type unknown if you cannot tell. From the second picture on, press Enter if a trait is the same as in the picture before.");
  const rows = [];
  for (const [i, image] of pictures.entries()) {
    console.log(`Picture ${i + 1} of ${pictures.length}: ${image}`);
    const tags = {};
    for (const t of traits) {
      const canonKey = Object.keys(fixed).find((k) => low(k) === t);
      for (;;) {
        console.log(`  ${t}${canonKey ? ` (fixed: ${fixed[canonKey]})` : ""}`);
        const a = await ask("> ");
        if (a === null) ended();
        if (!a) {
          if (i > 0) { tags[canonKey || t] = rows[i - 1].tags[canonKey || t]; break; }
          console.log("  Type what you see in this picture, or unknown if you cannot tell.");
          continue;
        }
        // the fixed value typed in another case is written the registry's way, so the two match exactly
        const value = canonKey && low(a) === low(fixed[canonKey]) ? fixed[canonKey] : a;
        if (canonKey && value !== fixed[canonKey] && low(a) !== "unknown") console.log(`  Noted: that is not the fixed ${t} (${fixed[canonKey]}). If the picture does show ${fixed[canonKey]}, type it exactly that way instead.`);
        tags[canonKey || t] = value;
        break;
      }
    }
    rows.push({ image, order: i + 1, tags });
  }
  const q = (v) => JSON.stringify(v);
  const text = rows.map((r) => `{"image": ${q(r.image)}, "order": ${r.order}, "tags": {${Object.entries(r.tags).map(([k, v]) => `${q(k)}: ${q(v)}`).join(", ")}}}`).join("\n") + "\n";
  fs.writeFileSync(out, text);
  console.log(`Wrote ${out}: ${rows.length} picture${rows.length === 1 ? "" : "s"}, ${traits.length} trait${traits.length === 1 ? "" : "s"} each.`);
  console.log(`Next: node ../scripts/anchor.mjs ${out} --character ${id} --ask`);
} finally {
  rl.close();
}
