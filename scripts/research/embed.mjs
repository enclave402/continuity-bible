/**
 * embed.mjs: the one embedding client for this repository, so every index uses identical settings.
 *
 * Works against an Ollama server (POST <base>/api/embed) or any OpenAI-compatible server (POST <base>/v1/embeddings):
 * the base URL decides (a base ending in /v1 is OpenAI-style). Documents are embedded plain; queries get the model's
 * asymmetric instruction ("Instruct: <task>\nQuery: <text>") when the config gives one. Vectors are L2-normalised, so a
 * dot product is a cosine. Vectors are cached per root under research/.vectors/<name>.<model>.json keyed by the text's hash,
 * and never mixed across models: switching the model means re-embedding.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { loadConfig } from "./config.mjs";

export const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
export const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
export const hashText = (s) => createHash("sha1").update(s).digest("hex").slice(0, 16);

export function embedder(cfg = loadConfig()) {
  const e = cfg.embedding;
  const openaiStyle = /\/v1\/?$/.test(e.base_url);
  const headers = { "Content-Type": "application/json", ...(e.api_key ? { Authorization: `Bearer ${e.api_key}` } : {}) };
  async function call(input) {
    const url = openaiStyle ? `${e.base_url.replace(/\/$/, "")}/embeddings` : `${e.base_url.replace(/\/$/, "")}/api/embed`;
    const body = openaiStyle ? { model: e.model, input } : { model: e.model, input, truncate: true, keep_alive: e.keep_alive };
    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`embedding endpoint ${r.status} for ${e.model} at ${url}: ${(await r.text()).slice(0, 200)}`);
    const json = await r.json();
    const vectors = openaiStyle ? json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding) : json.embeddings;
    return vectors.map(norm);
  }
  /** Plain documents, in input order. */
  async function embedDocs(texts) {
    const out = [];
    for (let i = 0; i < texts.length; i += e.batch) out.push(...(await call(texts.slice(i, i + e.batch))));
    return out;
  }
  /** One query, with the task instruction. */
  async function embedQuery(text, task = e.query_instruction) {
    return (await call([task ? `Instruct: ${task}\nQuery: ${text}` : text]))[0];
  }
  /** True when the endpoint answers for this model. */
  async function available() { try { await call(["ping"]); return true; } catch { return false; } }
  /** A persistent cache of document vectors keyed by text hash, for one named index. */
  function cache(name) {
    const dir = path.join(cfg.researchDir, ".vectors");
    const file = path.join(dir, `${name}.${e.model.replace(/[:/]/g, "_")}.json`);
    const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { model: e.model, vectors: {} };
    return {
      file,
      get: (text) => data.vectors[hashText(text)],
      async ensure(texts) {
        const need = [...new Set(texts.filter((t) => !data.vectors[hashText(t)]))];
        if (need.length) {
          const vs = await embedDocs(need);
          need.forEach((t, i) => { data.vectors[hashText(t)] = vs[i]; });
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(file, JSON.stringify(data));
        }
        return need.length;
      },
    };
  }
  return { model: e.model, base_url: e.base_url, embedDocs, embedQuery, available, cache };
}
