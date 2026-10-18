#!/usr/bin/env bash
# cleanup_scratch.sh: delete ephemeral agent scratch (.context/**/*.tmp). Safe to run any time; always exits 0.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -d "$ROOT/.context" ]; then
  find "$ROOT/.context" -type f \( -name '*.tmp' -o -name '.claude-tmp-*' \) -delete 2>/dev/null || true
fi
exit 0
