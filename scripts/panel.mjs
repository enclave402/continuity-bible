#!/usr/bin/env node
/**
 * panel.mjs — checks for a simulated reader panel.
 *
 *   node scripts/panel.mjs quotes --text <built.txt> --answers <answers.json>
 *   node scripts/panel.mjs control --answers <answers.json> [--max 0]
 *   node scripts/panel.mjs paired --base <answers.json> --variant <answers.json> --field <name> [--out <report.md>]
 *   node scripts/panel.mjs check-report --base <answers.json> --variant <answers.json> --field <name> --report <report.md>
 *
 * A quote must be a verbatim substring of the spread it names. A no-read control
 * above the ceiling throws the quiz out. A paired line is the mean of
 * (variant − base) for readers who answered both, rounded to two decimals.
 * The script does not decide which text wins. Every report says it is simulated.
 * These answers are not a human audience.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const SIMULATED = "Simulated. This is not a human audience. The script does not decide which text wins.";

/** Spread bodies keyed by the number printed in the built text. */
export function spreadsOf(text) {
  const parts = text.split(/^=== SPREAD (\d+) OF \d+ ===$/m);
  const out = new Map();
  for (let i = 1; i < parts.length; i += 2) out.set(Number(parts[i]), parts[i + 1] ?? "");
  return out;
}

export function loadAnswers(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!data || !Array.isArray(data.readers)) throw new Error(`panel: ${file} has no readers array`);
  return data.readers;
}

/** Exit-style result: ok, and one line a person can read. */
export function checkQuotes(text, readers) {
  const spreads = spreadsOf(text);
  let n = 0;
  for (const reader of readers) {
    for (const quote of reader.quotes || []) {
      n += 1;
      const body = spreads.get(quote.spread);
      if (body == null || typeof quote.text !== "string" || quote.text.length === 0 || !body.includes(quote.text)) {
        return { ok: false, line: `panel: quote not verbatim ${reader.id} spread ${quote.spread}` };
      }
    }
  }
  if (!n) return { ok: false, line: "panel: no quotes to check" };
  return { ok: true, line: `panel: quotes OK (${n} quotes)` };
}

/** A no-read reader scoring above max throws the quiz out. At least one no-read reader is required. */
export function checkControl(readers, max = 0) {
  const controls = readers.filter((r) => r.read === false);
  if (!controls.length) return { ok: false, line: "panel: control missing; no no-read reader" };
  const over = controls.find((r) => typeof r.quiz_correct !== "number" || r.quiz_correct > max);
  if (over) return { ok: false, line: `panel: control failed; quiz thrown out (${over.id} scored ${over.quiz_correct})` };
  return { ok: true, line: `panel: control OK (${controls.length} no-read readers at or under ${max})` };
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

/** Mean paired difference for readers present on both sides. Unpaired ids are counted and left out. */
export function pairedDifference(baseReaders, variantReaders, field) {
  const base = new Map(baseReaders.map((r) => [r.id, r]));
  const variant = new Map(variantReaders.map((r) => [r.id, r]));
  const ids = [...base.keys()].filter((id) => variant.has(id)).sort();
  const diffs = [];
  for (const id of ids) {
    const a = base.get(id)[field];
    const b = variant.get(id)[field];
    if (typeof a === "number" && typeof b === "number") diffs.push(b - a);
  }
  const onlyBase = [...base.keys()].filter((id) => !variant.has(id));
  const onlyVariant = [...variant.keys()].filter((id) => !base.has(id));
  if (!diffs.length) return { ok: false, line: `panel: no paired numbers for ${field}` };
  const mean = round2(diffs.reduce((s, x) => s + x, 0) / diffs.length);
  const unpaired = onlyBase.length + onlyVariant.length;
  const line = `paired ${field} ${mean.toFixed(2)} over ${diffs.length} readers`;
  return { ok: true, mean, n: diffs.length, unpaired, line, report: `${SIMULATED}\n${line}\nunpaired ${unpaired}\n` };
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  try {
    if (cmd === "quotes") {
      const text = fs.readFileSync(arg(argv, "text"), "utf8");
      const result = checkQuotes(text, loadAnswers(arg(argv, "answers")));
      console.log(result.line);
      process.exit(result.ok ? 0 : 1);
    }
    if (cmd === "control") {
      const max = arg(argv, "max");
      const result = checkControl(loadAnswers(arg(argv, "answers")), max == null ? 0 : Number(max));
      console.log(result.line);
      process.exit(result.ok ? 0 : 1);
    }
    if (cmd === "paired" || cmd === "check-report") {
      const field = arg(argv, "field");
      const result = pairedDifference(loadAnswers(arg(argv, "base")), loadAnswers(arg(argv, "variant")), field);
      if (!result.ok) {
        console.error(result.line);
        process.exit(1);
      }
      if (cmd === "paired") {
        const out = arg(argv, "out");
        if (out) fs.writeFileSync(out, result.report);
        console.log(result.report.trimEnd());
        return;
      }
      const report = fs.readFileSync(arg(argv, "report"), "utf8");
      if (report !== result.report) {
        console.error("panel: report differs from the paired recomputation");
        process.exit(1);
      }
      console.log("panel: report OK");
      return;
    }
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  console.error("panel: use quotes, control, paired or check-report");
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
