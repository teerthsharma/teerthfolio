// CAST helpers for p-monodromy. Reusable (candidates for promotion): beat-start lookup, easing, merged-geometry builder.
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
// smoothstep over [a,b]:  3x^2 - 2x^3
export const sm = (a, b, t) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
// easeOutBack pop: 0 before a, overshoots to ~1.12 then settles on 1 over d seconds:  1 + c3 (x-1)^3 + c1 (x-1)^2
export const pop = (a, d, t) => { const x = clamp01((t - a) / d); if (x <= 0) return 0; const y = x - 1; return 1 + 2.4 * y * y * y + 1.4 * y * y; };
// start time of the first of `names` that has fired, else the bible default. Reads the cue; never throws on an unknown name.
export function beatStart(cue, names, def) {
  for (const n of names) { const s = cue.since?.(n); if (Number.isFinite(s)) return cue.t - s; }
  return def;
}
// merge [{ geo, m }] (geo cloned, matrix applied) into ONE non-indexed BufferGeometry (position, normal, uv)
export function mergeInstances(THREE, items) {
  const parts = items.map(({ geo, m }) => { const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m); return g; });
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
  let o = 0;
  for (const g of parts) {
    P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(P, 3)); out.setAttribute("normal", new THREE.BufferAttribute(N, 3)); out.setAttribute("uv", new THREE.BufferAttribute(U, 2));
  return out;
}
