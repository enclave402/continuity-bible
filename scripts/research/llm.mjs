/**
 * llm.mjs: the one chat client for the research tools. Any OpenAI-compatible chat endpoint (a local Ollama at
 * <base>/v1, a hosted provider): POST <base>/chat/completions. Asks for JSON, parses defensively, never retries forever.
 */
import { loadConfig } from "./config.mjs";

export function chatClient(cfg = loadConfig()) {
  const l = cfg.llm;
  const headers = { "Content-Type": "application/json", ...(l.api_key ? { Authorization: `Bearer ${l.api_key}` } : {}) };
  const url = `${l.base_url.replace(/\/$/, "")}/chat/completions`;
  async function complete({ system, user, json = true, max_tokens = l.max_tokens, temperature = l.temperature }) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), l.timeout_ms);
    try {
      const body = { model: l.model, temperature, max_tokens, messages: [{ role: "system", content: system }, { role: "user", content: user }] };
      if (json) body.response_format = { type: "json_object" };
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: ctrl.signal });
      if (!r.ok) throw new Error(`chat endpoint ${r.status} for ${l.model} at ${url}: ${(await r.text()).slice(0, 300)}`);
      const data = await r.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      return { text, usage: data.usage || {}, model: data.model || l.model };
    } finally { clearTimeout(timer); }
  }
  /** Parse a JSON object out of a model reply, tolerating fences and leading prose. */
  function parseJson(text) {
    const cleaned = text.replace(/```(?:json)?/g, "").trim();
    try { return JSON.parse(cleaned); } catch {}
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) { try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {} }
    return null;
  }
  async function available() {
    try { const r = await complete({ system: "Reply with JSON.", user: 'Return {"ok": true}', max_tokens: 10 }); return !!parseJson(r.text); } catch { return false; }
  }
  return { model: l.model, base_url: l.base_url, complete, parseJson, available };
}
