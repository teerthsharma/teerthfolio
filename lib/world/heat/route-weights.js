// D6 route weights, explained fraction and D10 plate pick of the topological shader (docs/topological-shader/README.md).
// Built behind the ?topo flag; T1 found the library does not explain roam heat, so nothing here claims that it does.
// Readings: experiments/topological-shader/PREREGISTRATION-D10.md.
const EPS0 = 1 / 255;

export function makeRouteWeights(plates, g, { wLo = 0.35, wHi = 0.65, gateM = 80, eps0 = EPS0 } = {}) {
  const n = g.n;
  if (!plates || plates.version !== 1 || !plates.grid || plates.grid.n !== n) throw new Error("route plates do not match the grid");
  if ((g.R !== undefined && plates.grid.R !== g.R) || (g.h !== undefined && plates.grid.h !== g.h)) throw new Error("route plates do not match the grid");
  const legs = plates.legs;
  if (!Array.isArray(legs) || legs.length === 0) throw new Error("route plates have no legs");
  const m = legs.length;
  const H = legs.map((leg) => {
    if (!leg.heat || leg.heat.length !== n) throw new Error(`route plate ${leg.id} has the wrong length`);
    return Float64Array.from(leg.heat);
  });
  const den = H.map((h) => h.reduce((s, x) => s + x * x, 0));

  const w = new Float32Array(m);
  const C = new Float32Array(n);
  const eCell = new Float32Array(n).fill(1);
  const latched = new Uint8Array(m);
  const slot = [-1, -1];
  const S = new Float64Array(n);
  let samples = 0;

  function best(skip) {
    let bk = -1;
    for (let k = 0; k < m; k++) if (!skip.includes(k) && latched[k] && (bk < 0 || w[k] > w[bk])) bk = k;
    return bk;
  }

  const rw = {
    w,
    C,
    eCell,
    latched,
    e: 1,
    t: 0,
    observe(c, hn, t, M) {
      const gated = (Number.isFinite(M) ? M : samples) < gateM;
      samples++;
      rw.t = t;
      S.fill(0);
      let sumHn = 0;
      for (let v = 0; v < n; v++) sumHn += hn[v];
      for (let k = 0; k < m; k++) {
        let wk = 0;
        if (!gated && den[k] > 0) {
          let num = 0;
          const h = H[k];
          for (let v = 0; v < n; v++) num += hn[v] * h[v];
          wk = Math.min(1, Math.max(0, num / den[k]));
          for (let v = 0; v < n; v++) S[v] += wk * h[v];
        }
        w[k] = wk;
        if (wk > wHi) latched[k] = 1;
        else if (wk < wLo) latched[k] = 0;
      }
      let sumR = 0;
      for (let v = 0; v < n; v++) {
        const R = hn[v] - Math.min(hn[v], S[v]);
        sumR += R;
        const e = gated ? 0 : 1 - R / Math.max(hn[v], eps0);
        eCell[v] = e;
        C[v] = Math.min(c[v], e);
      }
      rw.e = gated ? (sumHn > 0 ? 0 : 1) : sumHn > 0 ? 1 - sumR / sumHn : 1;
      for (let s = 0; s < 2; s++) if (slot[s] >= 0 && !latched[slot[s]]) slot[s] = -1;
      for (let s = 0; s < 2; s++) if (slot[s] < 0) slot[s] = best(slot);
      return C;
    },
    pick() {
      const out = [slot[0], slot[1]];
      for (let s = 0; s < 2; s++) {
        if (out[s] >= 0) continue;
        let bk = -1;
        for (let k = 0; k < m; k++) if (!out.includes(k) && (bk < 0 || w[k] > w[bk])) bk = k;
        out[s] = bk;
      }
      return out;
    },
  };
  return rw;
}
