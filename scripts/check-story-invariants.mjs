#!/usr/bin/env node
/**
 * scripts/check-story-invariants.mjs — Universal Story Invariants & Banned Lore Gate.
 *
 * WHY THIS EXISTS (Andrej Karpathy Principle):
 * AI story writers and large language models frequently reintroduce plot points you already
 * deleted (like bringing back a pet who wasn't there, or making two characters meet when
 * they shouldn't). This script acts as an automated guardrail so you never have to play
 * whack-a-mole with recurring plot mistakes.
 *
 * HOW IT WORKS:
 * 1. You list forbidden phrases or patterns in `character-registry.json` under "invariants".
 * 2. You explain WHY it is forbidden in plain English (e.g. "Bob Barker never met Theo").
 * 3. This script scans all your story scenes, prose, and dialogue files.
 * 4. If any forbidden phrase appears, it stops the build, points directly to the line,
 *    and tells you exactly how to fix it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry, registryPath } from './lib.mjs';

export function checkStoryInvariants({ registry, root, files } = {}) {
  const rootDir = root || registry?._root || process.cwd();
  const invariants = registry?.invariants || [];

  if (!invariants.length) {
    return {
      pass: true,
      hits: [],
      filesScanned: 0,
      invariantsCount: 0,
      message: '0 invariants declared. (Add an invariant in character-registry.json under "invariants" to protect against plot regressions).'
    };
  }

  // Compile invariant regexes
  const compiled = invariants.map((inv) => {
    let regex;
    try {
      regex = new RegExp(inv.pattern, 'i');
    } catch {
      regex = new RegExp(inv.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    return {
      ...inv,
      regex
    };
  });

  // Determine files to scan if not explicitly provided
  let targetFiles = files;
  if (!targetFiles || !targetFiles.length) {
    const gathered = new Set();

    // Add files from surfaces
    if (registry.surfaces) {
      for (const s of registry.surfaces) {
        if (s.file) {
          const resolved = path.isAbsolute(s.file) ? s.file : path.join(rootDir, s.file);
          if (fs.existsSync(resolved)) gathered.add(resolved);
        }
      }
    }

    // Add token sources
    if (registry.token_sources) {
      for (const ts of registry.token_sources) {
        const pattern = ts.file;
        if (pattern && !pattern.includes('*')) {
          const resolved = path.isAbsolute(pattern) ? pattern : path.join(rootDir, pattern);
          if (fs.existsSync(resolved)) gathered.add(resolved);
        }
      }
    }

    // Also scan examples directory if it exists
    const examplesDir = path.join(rootDir, 'examples');
    if (fs.existsSync(examplesDir)) {
      function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) walk(full);
          } else if (/\.(json|md|txt|html)$/.test(entry.name)) {
            gathered.add(full);
          }
        }
      }
      walk(examplesDir);
    }

    targetFiles = Array.from(gathered);
  }

  const hits = [];
  let scannedCount = 0;

  for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) continue;
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }
    scannedCount++;
    const lines = content.split('\n');
    const rel = path.relative(rootDir, filePath);

    lines.forEach((line, index) => {
      for (const inv of compiled) {
        if (inv.regex.test(line)) {
          hits.push({
            file: rel,
            line: index + 1,
            name: inv.name || inv.pattern,
            why: inv.why,
            text: line.trim()
          });
        }
      }
    });
  }

  return {
    pass: hits.length === 0,
    hits,
    filesScanned: scannedCount,
    invariantsCount: invariants.length
  };
}

// CLI execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(`Story Invariants Checker (Guardrail against recurring plot mistakes)

WHY:
  Prevents AI or authors from reintroducing plot points you previously decided against.

HOW:
  node scripts/check-story-invariants.mjs [--registry path/to/character-registry.json]

CONFIGURATION (in character-registry.json):
  "invariants": [
    {
      "pattern": "phrase to ban",
      "name": "Short title",
      "why": "Plain explanation of why this cannot happen in your story"
    }
  ]
`);
    process.exit(0);
  }

  let reg;
  try {
    reg = loadRegistry(registryPath());
  } catch (err) {
    console.error(`check-story-invariants: failed to load registry: ${err.message}`);
    process.exit(1);
  }

  const result = checkStoryInvariants({ registry: reg });
  if (!result.pass) {
    console.error(`\n❌ Story Invariant Violated! Found banished assertion:\n`);
    for (const h of result.hits) {
      console.error(`  File: ${h.file} (line ${h.line})`);
      console.error(`  Matched: "${h.text}"`);
      console.error(`  Rule: ${h.name}`);
      console.error(`  Why: ${h.why}\n`);
    }
    console.error(`FIX: Edit the file to remove or fix the sentence, or update your rule in character-registry.json if the story intentionally changed.\n`);
    process.exit(1);
  }

  if (result.invariantsCount === 0) {
    console.log(`check-story-invariants: ${result.message}`);
  } else {
    console.log(`check-story-invariants: OK (${result.filesScanned} files scanned, ${result.invariantsCount} invariants held)`);
  }
}
