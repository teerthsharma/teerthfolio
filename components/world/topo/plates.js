// Loader for the baked route plates (public/topo/README.md). Reached only from core.js, which only a ?topo=on page imports. Any failure
// (no fetch, network, non-ok, bad JSON, wrong version, wrong n, not 8 legs) returns null and the caller stays ALL-LIVE; nothing throws or logs.
const URL_PLATES = "/topo/route-plates.json";
const N = 1615; // cells of makeHexGrid(84, 4)
const LEGS = 8;
const cache = new WeakMap();

function valid(p) {
  return p?.version === 1 && p.grid?.n === N && Array.isArray(p.legs) && p.legs.length === LEGS && p.legs.every((l) => Array.isArray(l?.heat) && l.heat.length === N);
}

export function loadRoutePlates(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") return Promise.resolve(null);
  if (!cache.has(fetchImpl)) {
    cache.set(
      fetchImpl,
      Promise.resolve()
        .then(() => fetchImpl(URL_PLATES))
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => (valid(p) ? p : null))
        .catch(() => null),
    );
  }
  return cache.get(fetchImpl);
}
