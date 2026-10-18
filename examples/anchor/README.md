# examples/anchor

`embeddings.jsonl` is a synthetic set of eleven generated images of one character: three in the original state, seven drifted to a second state, one failed render. Each row carries the image path, its order, a unit vector from "an encoder" (three dimensions here; yours will have 512 or more) and attribute tags.

```bash
node scripts/anchor.mjs examples/anchor/embeddings.jsonl --ask
node scripts/anchor.mjs examples/anchor/embeddings.jsonl --prefer fewest-redraws
node scripts/anchor.mjs examples/anchor/embeddings.jsonl --keep "hair=copper red" --prefer first-look
node scripts/anchor.mjs examples/anchor/embeddings.jsonl --policy mode --prune-outliers 2
```

With `--keep hair=copper red` only the three original-state images are eligible and the other eight are always on the bill, whatever the second answer. Without it, fewest redraws keeps the drifted majority and bills four.

How to produce real rows from your own images is in `docs/2-how-to/HOW-TO-RESOLVE-CHARACTER-DRIFT.md`. Nothing in this folder is a picture; the images are referenced, never stored here.
