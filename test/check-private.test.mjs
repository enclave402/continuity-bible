// Run from the repo root: npm test. Proves the publication gate loads your private words when it runs from a linked
// worktree (.worktrees/<agent>-<task>), where the gitignored .private-terms file does not exist. It builds a throwaway
// git repo with the gate, a private terms file in the main checkout only, and one linked worktree. lessons-feed.mjs
// reads the same list through scripts/private-terms.mjs, so it is checked from the worktree too.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { gateLists } from "../scripts/lessons-feed.mjs";

const TERM = "zorblatt-quux";
// A clean environment: no git variables from a hook that may be running this test, no terms file from the caller.
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_") && k !== "PRIVATE_TERMS_FILE"));
Object.assign(env, { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com" });
const git = (cwd, ...args) => execFileSync("git", ["-c", "core.hooksPath=/dev/null", ...args], { cwd, env, encoding: "utf8" });
const gate = (cwd, extra = {}) => spawnSync(process.execPath, [path.join(cwd, "scripts/check-private.mjs")], { cwd, env: { ...env, ...extra }, encoding: "utf8" });

function makeRepo() {
  const main = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "ntssot-private-")));
  fs.mkdirSync(path.join(main, "scripts"));
  for (const f of ["check-private.mjs", "check-private.config.json", "private-terms.mjs"]) fs.copyFileSync(path.join(process.cwd(), "scripts", f), path.join(main, "scripts", f));
  fs.writeFileSync(path.join(main, ".gitignore"), ".private-terms\n.worktrees/\n");
  fs.writeFileSync(path.join(main, "story.md"), "A plain line.\n");
  git(main, "init", "-q", "-b", "main");
  git(main, "add", ".gitignore", "scripts", "story.md");
  git(main, "commit", "-q", "-m", "init");
  fs.writeFileSync(path.join(main, ".private-terms"), `# my words\n${TERM}\n`);
  const wt = path.join(main, ".worktrees", "agent-task");
  git(main, "worktree", "add", "-q", wt, "-b", "agent/task");
  return { main, wt };
}

test("from a linked worktree, the gate loads the main worktree's private terms and says where they came from", () => {
  const { main, wt } = makeRepo();
  assert.equal(fs.existsSync(path.join(wt, ".private-terms")), false, "the worktree has no copy of the gitignored file");
  const pass = gate(wt);
  assert.equal(pass.status, 0, pass.stderr);
  assert.match(pass.stdout, /1 private term\(s\) from the main worktree's \.private-terms/);
  const saved = { ...process.env };
  for (const k of Object.keys(process.env)) if (!(k in env)) delete process.env[k];
  try { assert.deepEqual(gateLists(wt).terms, [TERM], "lessons-feed reads the same list"); } finally { Object.assign(process.env, saved); }

  fs.appendFileSync(path.join(wt, "story.md"), `Then ${TERM} walked in.\n`);
  const hit = gate(wt);
  fs.rmSync(main, { recursive: true, force: true });
  assert.equal(hit.status, 1);
  assert.match(hit.stderr, /story\.md:2: private-term #2/);
  assert.equal((hit.stdout + hit.stderr).includes(TERM), false, "the gate never prints a private term");
  assert.equal((hit.stdout + hit.stderr).includes(main), false, "the gate never prints a local path");
});

test("a worktree's own .private-terms wins over the main one, and PRIVATE_TERMS_FILE wins over both", () => {
  const { main, wt } = makeRepo();
  fs.writeFileSync(path.join(wt, ".private-terms"), "qqxone\nqqxtwo\n");
  assert.match(gate(wt).stdout, /2 private term\(s\) from \.private-terms\)/);
  const own = path.join(main, "elsewhere.txt");
  fs.writeFileSync(own, "qqxa\nqqxb\nqqxc\n");
  assert.match(gate(wt, { PRIVATE_TERMS_FILE: own }).stdout, /3 private term\(s\) from PRIVATE_TERMS_FILE\)/);
  fs.rmSync(main, { recursive: true, force: true });
});

test("with no private terms file anywhere, the gate says so instead of passing silently", () => {
  const { main, wt } = makeRepo();
  fs.rmSync(path.join(main, ".private-terms"));
  const r = gate(wt);
  fs.rmSync(main, { recursive: true, force: true });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /0 private term\(s\) \(no private terms file found\)\)/);
});
