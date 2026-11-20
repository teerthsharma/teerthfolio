// D7 latch and D8 region type of the topological shader (docs/topological-shader/README.md). Per cell the type is
// 0 LIVE while the latch is on, 1 BAKED when off and C is above the shifted high threshold, 2 BAND otherwise.
export function makeLatch(n, { lo = 0.35, hi = 0.65 } = {}) {
  const on = new Uint8Array(n).fill(1);
  const type = new Uint8Array(n);
  return {
    type,
    step(C, u) {
      const a = lo + u;
      const b = hi + u;
      for (let v = 0; v < n; v++) {
        const c = C[v];
        if (c < a) on[v] = 1;
        else if (c > b) on[v] = 0;
        type[v] = on[v] ? 0 : c > b ? 1 : 2;
      }
    },
  };
}
