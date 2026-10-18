# `.context/scratch/`: ephemeral scratchpad (tier 3)

1. Dump raw or verbose tool output into `<name>.tmp` here.
2. Keep only a summary or a retrieval handle in the active conversation.
3. At session end, extract durable facts into the worklog or docs, then delete the temps.
4. Never re-ingest an orphaned `.tmp` as truth in a later session.
5. Never leave secrets in temps.

Cleanup: `bash scripts/cleanup_scratch.sh` or `node scripts/cleanup-context-scratch.mjs`. Both also run from the pre-commit hook; `*.tmp` under `.context/` is gitignored.
