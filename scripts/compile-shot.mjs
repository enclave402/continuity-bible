#!/usr/bin/env node
/**
 * compile-shot.mjs: the continuity block for one scene (or one shot) of a shot sheet, ready to paste into an image chatbot
 * or an API prompt. The cards and the sheet hold tokens and ids; this prints the words.
 *
 *   node scripts/compile-shot.mjs <scene> [--shot <id>] [--story <id>] [--out <file>] [--json] [--registry <path>]
 *
 * Reads the registry's shot-sheet and continuity-cards surfaces (--story when more than one sheet holds a scene of that
 * name), carries state from the first shot of the story day to the shots asked for, and prints one block per shot:
 *   - every present character, in cast order, as CHARACTER n: the look (the surface's `lead` form, default look; the name
 *     when the entry has no such form), WEARING, HAIR, ACCESSORIES, MARKS, IN HAND, ACTION, EYELINE, POSITION;
 *   - SHOT size, SETTING (the location's look), TIME, WEATHER; props in frame; the staging line;
 *   - CHANGED SINCE THE LAST SHOT, in words, or "nothing" (the first shot of a story day has no previous shot);
 *   - KEEP, from the render surface the shot is for (registry.render_surfaces, named by the shot or its scene header):
 *     the surface's style_lock, must_keep, hands_rule and no_text sentence, in the author's words, labelled with its name
 *     and size; this script holds no rule phrase of its own;
 *   - AVOID: the held props' negative tokens, every other value's words of the sheet surface's exclusive markers, and the
 *     render surface's exclude list (plus the word text when its no_text is true).
 * The character comes first and the setting after, the order the carded research recommends for a prompt. The whole gate
 * runs first: nothing is compiled from a sheet the gate fails, so a block never carries a contradiction. Exit 1 on a named
 * problem, 2 on usage. --json prints the same shots as data; --out writes built output (never edit it; edit the sheet).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadNames } from "./names.mjs";
import { CARD_REQUIRED, SCENE_REQUIRED, WARDROBE_LAYERS, avoidWords, buildIndex, carryContinuity, checkRegistry, continuityStories, loadRegistry, readJson, registryPath, surfacesOf } from "./lib.mjs";

const filled = (v) => v !== null && v !== undefined && String(v).trim() !== "";
const scalarsOf = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k, v]) => !k.startsWith("_") && ["string", "number", "boolean"].includes(typeof v)));
const sentence = (parts) => parts.filter((p) => typeof p === "string" && p.trim()).map((p) => p.trim().replace(/\.$/, "")).join(". ") + ".";
const articled = (text) => `the ${String(text).replace(/^(a|an|the)\s+/i, "")}`;
const problem = (message, exitCode = 1) => { const e = new Error(message); e.exitCode = exitCode; return e; };

/** "camel wool coat over wine silk blouse, black wide-leg trousers, black ankle boots": the outer layer over the next, then the rest in layer order, then any layer the card invented. */
export function wardrobeLine(wardrobe = {}) {
  const keys = [...WARDROBE_LAYERS.filter((k) => filled(wardrobe[k])), ...Object.keys(wardrobe).filter((k) => !WARDROBE_LAYERS.includes(k) && filled(wardrobe[k]))];
  const parts = keys.map((k) => String(wardrobe[k]).trim());
  if (!parts.length) return "";
  if (keys[0] === "outer" && parts.length > 1) return [`${parts[0]} over ${parts[1]}`, ...parts.slice(2)].join(", ");
  return parts.join(", ");
}

/** One applied change in plain words. People are named by their label in the shot (CHARACTER 2) or, off-screen, by name. */
export function describeChange(change, labelOf, propText) {
  const who = labelOf(change.who);
  switch (change.kind) {
    case "wardrobe":
      if (!change.layer) return `${who} now wears ${change.to}`;
      if (change.to === undefined) return change.from ? `${who} has taken off ${articled(change.from)}` : `${who} has nothing on the ${change.layer} layer`;
      return change.from ? `${who} has swapped ${articled(change.from)} for ${change.to}` : `${who} has put on ${change.to}`;
    case "hair": return `${who}'s hair is now ${change.to}`;
    case "accessories": return change.add !== undefined ? `${who} has put on ${change.add}` : `${who} has taken off ${articled(change.remove)}`;
    case "marks": return change.add !== undefined ? `${who} now has ${change.add}` : `${who} no longer has ${articled(change.remove)}`;
    case "carries": return change.add !== undefined ? `${who} now carries ${propText(change.add)}` : `${who} no longer carries ${propText(change.remove)}`;
    case "hands": return `${who} hands ${propText(change.prop)} to ${change.to ? labelOf(change.to) : "someone off-screen"}`;
    default: return "";
  }
}

/** One compiled shot as data plus its pasteable block. */
/** The KEEP items and AVOID items a render surface contributes, in the author's words; nothing here is a rule of the engine's. */
export function surfaceRules(renderSurface) {
  if (!renderSurface || typeof renderSurface !== "object") return { keep: [], avoid: [], label: "" };
  const list = (v) => (Array.isArray(v) ? v : filled(v) ? [v] : []).filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim());
  const keep = [...list(renderSurface.style_lock), ...list(renderSurface.must_keep), ...list(renderSurface.hands_rule), ...(typeof renderSurface.no_text === "string" ? list(renderSurface.no_text) : [])];
  const avoid = [...list(renderSurface.exclude), ...(renderSurface.no_text === true ? ["text"] : [])];
  const size = filled(renderSurface.size) ? renderSurface.size : filled(renderSurface.aspect) ? renderSurface.aspect : "";
  const label = [renderSurface.name, size].filter(filled).join(", ");
  return { keep, avoid, label };
}

export function formatShot(scene, shot, { names, story, surface, characters, lead = "look", renderSurfaces = {} }) {
  const context = { ...scalarsOf(scene), ...scalarsOf(shot) };
  const r = (text, extra = {}) => names.resolveTokens(String(text), story, { context: { ...context, ...extra } });
  const propText = (id) => r(characters[id]?.prompt_tokens || characters[id]?.name || id);
  const labelOf = (id) => { const i = shot.in_shot.indexOf(id); return i === -1 ? r(`{{${id}}}`) : `CHARACTER ${i + 1}`; };
  const people = shot.characters.map((c, i) => {
    const own = scalarsOf(c);
    const leadText = characters[c.id]?.forms?.[lead] !== undefined ? r(`{{${c.id}:${lead}}}`, own) : r(`{{${c.id}}}`, own);
    const wearing = wardrobeLine(Object.fromEntries(Object.entries(c.state.wardrobe).map(([k, v]) => [k, r(v, own)])));
    const out = {
      id: c.id, label: `CHARACTER ${i + 1}`, lead: leadText, wearing, hair: filled(c.state.hair) ? r(c.state.hair, own) : "",
      accessories: c.state.accessories.map((a) => r(a, own)), marks: c.state.marks.map((m) => r(m, own)),
      in_hand: [...c.holding], in_hand_text: c.holding.map(propText),
      action: filled(c.action) ? r(c.action, own) : "", eyeline: filled(c.eyeline) ? r(c.eyeline, own) : "", position: filled(c.position) ? r(c.position, own) : "",
    };
    out.line = sentence([
      `${out.label}: ${out.lead}`,
      out.wearing && `WEARING: ${out.wearing}`,
      out.hair && `HAIR: ${out.hair}`,
      out.accessories.length ? `ACCESSORIES: ${out.accessories.join(", ")}` : "",
      out.marks.length ? `MARKS: ${out.marks.join(", ")}` : "",
      `IN HAND: ${out.in_hand_text.length ? out.in_hand_text.join("; ") : "nothing"}`,
      out.action && `ACTION: ${out.action}`,
      out.eyeline && `EYELINE: ${out.eyeline}`,
      out.position && `POSITION: ${out.position}`,
    ]);
    return out;
  });
  const setting = filled(scene.place?.look) ? r(scene.place.look) : filled(scene.location) ? String(scene.location) : "";
  const weather = filled(scene.weather) ? r(scene.weather) : filled(scene.day?.weather) ? r(scene.day.weather) : "";
  const changes = shot.changes.map((c) => describeChange(c, labelOf, propText)).filter(Boolean);
  const renderSurface = shot.surface ? renderSurfaces?.[shot.surface] : undefined;
  const rules = surfaceRules(renderSurface);
  const keep = rules.keep.map((k) => r(k));
  const continuity = shot.continuity !== false;
  const avoid = [...new Set([
    ...shot.characters.flatMap((c) => c.holding.flatMap((p) => characters[p]?.negative_tokens || [])),
    ...shot.props.flatMap((p) => characters[p]?.negative_tokens || []),
    ...avoidWords(surface, scene),
    ...rules.avoid.map((a) => r(a)),
  ])];
  const lines = [
    `=== ${scene.slug} · shot ${shot.id}${filled(shot.size) ? ` (${shot.size})` : ""}${filled(scene.story_day) ? ` · ${scene.story_day}${filled(scene.day?.label) ? `: ${r(scene.day.label)}` : ""}` : ""} ===`,
    ...people.map((p) => p.line),
    sentence([filled(shot.size) && `SHOT: ${shot.size}`, setting && `SETTING: ${setting}`, filled(scene.time_of_day) && `TIME: ${scene.time_of_day}`, weather && `WEATHER: ${weather}`]),
    shot.props.length ? `ALSO IN FRAME: ${shot.props.map(propText).join("; ")}.` : "",
    filled(shot.action) ? `STAGING: ${r(shot.action)}.` : "",
    changes.length ? `CHANGED SINCE THE LAST SHOT: ${changes.join("; ")}.` : shot.first_of_day || !continuity ? "" : "CHANGED SINCE THE LAST SHOT: nothing.",
    keep.length ? `KEEP${rules.label ? ` (${rules.label})` : ""}: ${keep.join("; ")}.` : "",
    avoid.length ? `AVOID: ${avoid.join(", ")}.` : "",
  ].filter((l) => l && l !== ".");
  return {
    scene: scene.slug, shot: shot.id, size: shot.size ?? "", story_day: scene.story_day ?? "", story_day_label: filled(scene.day?.label) ? r(scene.day.label) : "",
    time_of_day: scene.time_of_day ?? "", location: scene.location ?? "", setting, weather,
    characters: people.map(({ line, ...rest }) => rest), also_in_frame: shot.props.map((p) => ({ id: p, text: propText(p) })),
    staging: filled(shot.action) ? r(shot.action) : "", changes,
    surface: shot.surface ? { id: shot.surface, name: renderSurface?.name ?? "", label: rules.label, keep, avoid: rules.avoid.map((a) => r(a)), continuity } : null,
    avoid, block: lines.join("\n"),
  };
}

/** The compiled shots of one scene (or one shot of it): the carry engine's result rendered through names.mjs. */
export function compileContinuity(registry, { story, scene: slug, shot: shotId } = {}) {
  const root = registry._root;
  const abs = (rel) => (path.isAbsolute(rel) ? rel : path.join(root, rel));
  const pairs = continuityStories(surfacesOf(registry)).filter((p) => p.sheet && (!story || p.story === story));
  if (!pairs.length) throw problem(`no shot-sheet surface${story ? ` for story ${story}` : ""} in ${registry._file}. Fix: declare { "type": "shot-sheet", "file": "<shot-sheet.json>", "story": "<id>" } and a continuity-cards surface for the same story`);
  const sheets = pairs.map((p) => ({ pair: p, sheet: fs.existsSync(abs(p.sheet.file)) ? readJson(abs(p.sheet.file)) : null }));
  const holders = sheets.filter((s) => s.sheet?.scenes?.[slug]);
  if (!holders.length) throw problem(`no scene "${slug}" in ${sheets.map((s) => s.pair.sheet.file).join(", ")}. Scenes: ${sheets.flatMap((s) => Object.keys(s.sheet?.scenes || {})).join(", ") || "none yet"}`);
  if (holders.length > 1) throw problem(`scene "${slug}" is in ${holders.length} shot sheets (${holders.map((h) => h.pair.story).join(", ")}). Fix: pass --story <id>`, 2);
  const { pair, sheet } = holders[0];
  if (!pair.cards) throw problem(`${registry._file}: story ${pair.story} has a shot sheet but no continuity-cards surface. Fix: declare one; the sheet carries what the cards start`);
  const cards = readJson(abs(pair.cards.file));
  const characters = registry.characters || {};
  const carried = carryContinuity({ cards, sheet, characters, index: buildIndex(registry).index, story: pair.story, cardsFile: pair.cards.file, sheetFile: pair.sheet.file, cardRequired: pair.cards.required || CARD_REQUIRED, sceneRequired: pair.sheet.required || SCENE_REQUIRED, renderSurfaces: registry.render_surfaces, registryFile: path.basename(registry._file) });
  const compiled = carried.scenes[slug];
  const shots = shotId !== undefined ? compiled.shots.filter((s) => s.id === String(shotId)) : compiled.shots;
  if (shotId !== undefined && !shots.length) throw problem(`no shot "${shotId}" in ${slug}. Shots: ${compiled.shots.map((s) => s.id).join(", ")}`);
  const names = loadNames(root);
  return {
    story: pair.story, scene: slug, failures: carried.failures, gaps: carried.gaps,
    shots: shots.map((shot) => formatShot(compiled, shot, { names, story: pair.story, surface: pair.sheet, characters, lead: pair.sheet.lead || "look", renderSurfaces: registry.render_surfaces || {} })),
  };
}

const isMain = (() => { try { return fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) {
  const argv = process.argv.slice(2);
  const VALUE_FLAGS = new Set(["--shot", "--story", "--out", "--registry"]);
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? "" : argv[i + 1] || ""; };
  const slug = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
  if (!slug) { console.error("usage: node scripts/compile-shot.mjs <scene> [--shot <id>] [--story <id>] [--out <file>] [--json] [--registry <path>]"); process.exit(2); }
  let registry;
  try { registry = loadRegistry(registryPath(process.argv)); } catch (e) { console.error(`compile-shot: ${e.message}`); process.exit(e.exitCode || 1); }
  const gate = checkRegistry(registry);
  if (gate.failures.length) {
    for (const f of gate.failures) console.error(f);
    console.error(`compile-shot: the gate fails (${gate.failures.length} problem(s)); nothing is compiled from a sheet with a contradiction in it. Fix the lines above, then run again`);
    process.exit(1);
  }
  let result;
  try { result = compileContinuity(registry, { story: flag("--story") || undefined, scene: slug, shot: flag("--shot") || undefined }); }
  catch (e) { console.error(`compile-shot: ${e.message}`); process.exit(e.exitCode || 1); }
  const text = argv.includes("--json") ? JSON.stringify({ story: result.story, scene: result.scene, shots: result.shots }, null, 2) + "\n" : result.shots.map((s) => s.block).join("\n\n") + "\n";
  const dest = flag("--out");
  if (dest) {
    fs.mkdirSync(path.dirname(path.resolve(dest)), { recursive: true });
    fs.writeFileSync(dest, text);
    console.log(`compile-shot: ${slug}${flag("--shot") ? ` shot ${flag("--shot")}` : ""} -> ${dest} (${result.shots.length} shot(s); built output, do not edit)`);
  } else process.stdout.write(text);
}
