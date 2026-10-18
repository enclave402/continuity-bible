#!/usr/bin/env node
// cleanup-context-scratch.mjs: cross-platform twin of cleanup_scratch.sh. Deletes .context/**/*.tmp and .claude-tmp-*.
// Any agent, any harness: run it at session end, from pre-commit, or from a host scheduler. Always exits 0.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".context");
let removed = 0;
const walk = (dir) => { if (!fs.existsSync(dir)) return; for (const name of fs.readdirSync(dir)) { const p = path.join(dir, name); const st = fs.statSync(p); if (st.isDirectory()) walk(p); else if (name.endsWith(".tmp") || name.startsWith(".claude-tmp-")) { fs.unlinkSync(p); removed += 1; } } };
walk(root);
if (removed) console.log(`cleanup-context-scratch: removed ${removed} temp file(s)`);
process.exit(0);
