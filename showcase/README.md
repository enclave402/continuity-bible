# Before & After showcase

**Why this folder exists:** AI picture tools make the same few mistakes again and again. Each folder in `cases/` holds one mistake next to its fix, so anyone can see in ten seconds what this repository is for.

**How it works:** a case is a folder, `cases/<short-name>/`, with three files:

- `before.png`: the mistake (`.jpg`, `.jpeg`, `.webp` or `.svg` works too)
- `after.png`: the fix
- `case.json`: what broke, how it was fixed, and whether the pictures are real, a diagram or a placeholder

Drop a folder in and it shows up. No code changes.

```bash
node scripts/showcase.mjs --new my-case   # make cases/my-case/ with a case.json to fill in (TEMPLATE.json explains each field)
npm run test:showcase                     # check every case, and that the gallery is up to date
npm run showcase                          # rebuild docs/SHOWCASE.md and showcase.html
```

The gallery is [`docs/SHOWCASE.md`](../docs/SHOWCASE.md) on GitHub, or `showcase.html` at the top of the repository (download it and open it in a browser for a slider on each pair). Keep paths short and relative, never name a character, and never call a drawing a real picture.
