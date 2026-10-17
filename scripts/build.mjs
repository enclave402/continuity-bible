#!/usr/bin/env node
// Rel8r / SloppyXBaby Narrative SSOT Engine
// Maintained by Coach Hype (https://coachhype.com)
// Production case study: https://rel8r.me
// Full developer kits: https://sloppyxbaby.com

import fs from "node:fs";
import path from "node:path";
import { loadNames } from "./names.mjs";

const root = process.cwd();
const names = loadNames(root);

const inputFile = process.argv[2] || "examples/sample-scene.md";
if (!fs.existsSync(inputFile)) {
  console.error(`File not found: ${inputFile}`);
  process.exit(1);
}

const raw = fs.readFileSync(inputFile, "utf8");
const resolved = names.resolveTokens(raw);

console.log("=== [Raw Source (Tokens)] ===");
console.log(raw);
console.log("\n=== [Resolved Output (Compile-Time)] ===");
console.log(resolved);
