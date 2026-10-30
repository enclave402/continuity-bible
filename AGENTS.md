# AGENTS.md

**What this is:** the rules for any coding agent in this repo (Claude Code, Codex, Cursor, Copilot, Gemini, and others).
**Why it exists:** so every agent, and every person who downloads this repo, works to the same standard.
**How to use it:** read Rules, then Ethos, then Session. What this repo ships is in `PRODUCT.md`. Where things are is in `.context/_index.md`.
**Next step:** run `npm run verify` before you finish.

## Rules

### Names and pronouns are tokens

Never type a character's name in a scene, prompt or manifest. Write a token:

| Write | Becomes |
| :--- | :--- |
| `{{sam-hayes}}` | Sam |
| `{{sam-hayes:full}}` | Samantha Hayes |
| `{{sam-hayes:formal}}` | Samantha (any key under `forms`) |
| `{{sam-hayes:first}}` | first word of the display name |
| `{{sam-hayes:initial}}` | S |

Ids live in `character-registry.json`. An unknown token fails the build on purpose. Never guess an id: add the entry first.

Pronouns follow the same rule. They come from the character's entry, never from memory. Pronoun tokens such as `{{sam-hayes:subject}}` are planned. The build does not read them yet.

## Ethos

One line each. Plain words lead; the trade terms are in the *Also called* list below.

1. **Grade 8.** Every page, header and error message reads at Flesch-Kincaid grade 8.0 or below. Explain a hard word the first time you use it.
2. **Meet the industry standard, then beat it.** Name the known practice you follow. Then say what you do beyond it.
3. **Plain words first.** Lead with the plain word, like "character card". Put trade terms and synonyms after it, in a short *Also called* line. Experts and search engines still find it.
4. **Every page explains itself.** Someone with no memory opens any file or message. It tells them what it is, why it exists, how to use it, and one next step. An error says what failed, why, and the one fix.
5. **Write it down once, as linked pages.** Each idea gets one page, kept current. One read is enough to act. Nothing lives only in a chat or in an agent's memory.
6. **Two masters.** Master 1 is the product: the story a reader sees. Master 2 is the framework: this repo, the method anyone can reuse. Every change says what it does for each. See `PRODUCT.md`.
7. **Any vendor.** Rules name roles, such as maker and judge, plus small adapters. They never name one company or model. `CLAUDE.md` and `GEMINI.md` just load this file.
8. **Every character stays on-model.** Each character has one card that sets their look. Every new picture is checked against that card, fact by fact. This holds for every character, not just the lead.
9. **New pictures, not patched ones.** To fix a picture, make a new one from the card. Never paint over part of a picture. Never edit someone else's art.
10. **One picture, one place.** A scene or character picture is used in one spot only. Small interface parts, like icons, may repeat.
11. **The maker does not grade its own work.** A different tool or model checks what one made.
12. **Proof from outside.** Back each best practice with an outside source. Look for what would prove you wrong, not just what agrees. Mark anything you did not check as UNVERIFIED. Never point to a file that does not exist.
13. **No made-up sign-offs.** Do not add "check with the author" or any other approval step that these rules do not name.
14. **Nothing hard-coded.** Each value lives in one place and is read from there. Names and pronouns live in the registry. A look lives on its card. Paths, models, limits and word lists live in config or the environment, never in one machine. Name a new file by slot and version, never by a person.
15. **One place per fact.** If a fact shows up twice, one copy becomes a link to the other.
16. **Numbers come from scripts.** Never type a count from memory. Quote it with the script and date that made it.
17. **Close the loop.** Before you say done, check every ask in the session against the record: the issue tracker and the repo. List what is not yet written down.

*Also called:*
1: readability score.
4: amnesiac protocol, self-documenting.
5: Karpathy wiki, knowledge base.
7: vendor-neutral, LLM-agnostic.
8: character consistency, model sheet, turnaround, character bible.
9: no inpainting.
10: asset reuse ban.
11: separation of duties.
12: confirmation bias check, truthful inventory.
14: no magic values.
15: single source of truth, master data, golden record.

## Session

1. Work on a branch named `<agent>/<task>`. Make it in a worktree at `.worktrees/<agent>-<task>` from `origin/main`. The root tree stays on `main`.
2. Never push to `main`. Open a merge request on `origin`, the private upstream where all work happens. This public repo gets only finished `main`. A publish step runs `scripts/check-private.mjs` and `npm run verify` first, so work in progress never shows here.
3. Stage files by name, never `git add .`. Use Conventional Commits with an `Agent: <name>` trailer.

## Before you finish

```bash
npm run verify
```

It runs the names gate, tests, story gates, publish gate, research index and docs check. All must pass. Then close the loop (Ethos 17).

## Boundaries

- **Public repo.** No personal data, local paths, keys or private project names. `scripts/check-private.mjs` is the gate. Keep your own words in a gitignored `.private-terms`.
- **No new packages.** Node's own library only.
- **Add, never replace.** When art is missing or wanted, add it. Never delete or overwrite a picture, panel, slot or prompt. A new version gets a new file name. The old one stays.
- Never edit a test to pass it. Never make up story data or names.
- Docs go under `docs/` by what the reader wants to do. The rules are in `CONTRIBUTING.md`. Decisions go in `docs/4-explanation/decisions/`.
- A research claim traces to a card in `research/`. Ask `node scripts/research/ask.mjs "<question>"` before you open a card.
