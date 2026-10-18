#!/usr/bin/env node
// scripts/worklog-append.mjs — repo-local appender. Delegates to the Machine-Norms canonical
// appender (~/Documents/Machine-Norms/bin/worklog-append.mjs) with --repo pinned to this repo.
// Usage: node scripts/worklog-append.mjs --event-type action --author "agent:<name>" --summary "..." [--details "..."]
// Never hand-write a line into worklog/log.jsonl (WORKLOG_STANDARD invariant 11).
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const bin = join(process.env.HOME || '', 'Documents/Machine-Norms/bin/worklog-append.mjs')
const r = spawnSync('node', [bin, '--repo', repo, ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(r.status ?? 1)
