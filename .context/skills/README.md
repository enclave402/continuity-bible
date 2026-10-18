# `.context/skills/`: on-demand payloads (tier 2)

Repo-local procedures an agent loads only when the task matches. One skill per file, JSON or tight Markdown, versioned like source. Do not load the whole directory into every session.

Machine-wide skills (whatever your harness supports) stay outside the repo; this folder is the repo-native path that works for any agent that can read files.

Conventions: `<name>.md` with a one-line `description:` front-matter key, or `<name>.json` with `{ "name", "description", "steps" }`.
