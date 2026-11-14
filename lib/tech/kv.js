const memory = new Map();

export const resetMemoryKv = () => memory.clear();

// Upstash Redis REST when configured; in-memory only off Vercel (local dev, tests).
function upstash() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (url && token) return { url: url.replace(/\/$/, ""), token };
  if (process.env.VERCEL) throw new Error("KV_REST_API_URL / KV_REST_API_TOKEN not set");
  return null;
}

async function run(cfg, commands) {
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.token}`, "content-type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`KV responded ${res.status}`);
  const out = await res.json();
  const failed = out.find((r) => r.error);
  if (failed) throw new Error(`KV error: ${failed.error}`);
  return out.map((r) => r.result);
}

function live(key) {
  const e = memory.get(key);
  if (e && e.exp <= Date.now()) memory.delete(key);
  return memory.get(key);
}

export const kv = {
  // Throws when the store is unusable, so callers can answer 503 before doing anything.
  ready() {
    upstash();
  },

  async set(key, value, ttlSeconds) {
    const ttl = Math.max(1, Math.ceil(ttlSeconds));
    const cfg = upstash();
    if (cfg) {
      await run(cfg, [["SET", key, JSON.stringify(value), "EX", ttl]]);
      return;
    }
    memory.set(key, { v: JSON.stringify(value), exp: Date.now() + ttl * 1000 });
  },

  // Atomic read-and-delete: a value is consumed by whoever reads it first.
  async getdel(key) {
    const cfg = upstash();
    let raw;
    if (cfg) {
      [raw] = await run(cfg, [["GETDEL", key]]);
    } else {
      raw = live(key)?.v ?? null;
      memory.delete(key);
    }
    return raw == null ? null : JSON.parse(raw);
  },

  // Fixed window: the window starts at the first hit and is not extended.
  async incr(key, windowSeconds) {
    const cfg = upstash();
    if (cfg) {
      const [n] = await run(cfg, [["INCR", key], ["EXPIRE", key, windowSeconds, "NX"]]);
      return n;
    }
    const e = live(key);
    const n = (e ? Number(e.v) : 0) + 1;
    memory.set(key, { v: String(n), exp: e ? e.exp : Date.now() + windowSeconds * 1000 });
    return n;
  },
};
