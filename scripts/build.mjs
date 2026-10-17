#!/usr/bin/env node
// build.mjs: prints a source file as written (tokens), then resolved (names). Default: examples/sample-scene.md
// By Coach Hype (https://coachhype.com). Runs the name build of https://rel8r.me

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
