#!/usr/bin/env bash
# install-git-hooks.sh: point git at the tracked hooks in scripts/git-hooks (pre-commit, pre-push). Run once per clone.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
chmod +x "$ROOT"/scripts/git-hooks/* "$ROOT"/scripts/cleanup_scratch.sh
git -C "$ROOT" config core.hooksPath scripts/git-hooks
echo "git hooks installed: core.hooksPath = scripts/git-hooks"
