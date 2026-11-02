/**
 * private-terms.mjs: finds and reads your own private words, the gitignored list the publication gate refuses.
 *
 * Why it exists: the list is gitignored, so it lives only in the checkout where you made it, usually the main one.
 * A linked worktree (.worktrees/<agent>-<task>) has no copy. Without a fallback, the gate loaded 0 words there and
 * still passed. Both check-private.mjs and lessons-feed.mjs read the list through this file, so they always agree.
 *
 * Order: PRIVATE_TERMS_FILE, else <root>/.private-terms, else the main worktree's .private-terms.
 * Next step: keep one term per line in .private-terms at the main checkout's root; # starts a comment.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** The file to read and a label for it. The label names no local path, so the gate's output stays safe to paste. */
export function privateTermsSource(root) {
  if (process.env.PRIVATE_TERMS_FILE) return { file: process.env.PRIVATE_TERMS_FILE, label: "PRIVATE_TERMS_FILE" };
  const here = path.join(root, ".private-terms");
  if (fs.existsSync(here)) return { file: here, label: ".private-terms" };
  try {
    const common = path.resolve(root, execFileSync("git", ["-C", root, "rev-parse", "--git-common-dir"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
    const main = path.join(path.dirname(common), ".private-terms");
    if (fs.existsSync(main)) return { file: main, label: "the main worktree's .private-terms" };
  } catch {}
  return { file: null, label: null };
}

/** The words in the file as [term, line number] pairs; blank lines and # comments are skipped. */
export function readPrivateTerms(file) {
  if (!file || !fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").map((l, i) => [l.trim(), i + 1]).filter(([t]) => t && !t.startsWith("#"));
}
