// Certainty field c(x): a clearing round the seal, seeded movers, and fixed water on a grid.
const DT = 1 / 60;
const TWO_PI = 2 * Math.PI;

export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}

export function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function makeField(grid, { N = 0, seed = 1, shuffle = false, water = true, waterR0 = 76, rMove = 80, rNear = 6, rFar = 24 } = {}) {
  const { n, x, z } = grid;
  const rng = mulberry32(seed + 1000);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(TWO_PI * rng());
  const wat = new Uint8Array(n);
  for (let i = 0; i < n; i++) wat[i] = water && Math.hypot(x[i], z[i]) >= waterR0 ? 1 : 0;
  const c = new Float64Array(n);
  const movers = { x: new Float64Array(N), z: new Float64Array(N), th: new Float64Array(N) };
  for (let i = 0; i < N; i++) {
    const r = rMove * Math.sqrt(rng());
    const a = TWO_PI * rng();
    movers.x[i] = r * Math.cos(a);
    movers.z[i] = r * Math.sin(a);
    movers.th[i] = TWO_PI * rng();
  }
  let first = true;

  const redraw = () => {
    for (let i = 0; i < N; i++) {
      const r = rMove * Math.sqrt(rng());
      const a = TWO_PI * rng();
      movers.x[i] = r * Math.cos(a);
      movers.z[i] = r * Math.sin(a);
    }
  };

  const advance = () => {
    for (let i = 0; i < N; i++) {
      movers.th[i] += 1.5 * Math.sqrt(DT) * gauss();
      movers.x[i] += Math.cos(movers.th[i]) * DT;
      movers.z[i] += Math.sin(movers.th[i]) * DT;
      const h = Math.hypot(movers.x[i], movers.z[i]);
      if (h > rMove) {
        movers.th[i] = Math.atan2(-movers.z[i], -movers.x[i]);
        movers.x[i] *= rMove / h;
        movers.z[i] *= rMove / h;
      }
    }
  };

  const fill = (sx, sz) => {
    for (let i = 0; i < n; i++) {
      const s = smoothstep(rNear, rFar, Math.hypot(x[i] - sx, z[i] - sz));
      let m = 0;
      for (let k = 0; k < N; k++) {
        const dx = x[i] - movers.x[k];
        const dz = z[i] - movers.z[k];
        const q = dx * dx + dz * dz;
        if (q < 9) m = Math.max(m, 1 - smoothstep(1.5, 3, Math.sqrt(q)));
      }
      c[i] = wat[i] ? 0 : s * (1 - m);
    }
  };

  const update = (sx, sz) => {
    if (shuffle) redraw();
    else if (!first) advance();
    first = false;
    fill(sx, sz);
  };

  return { c, water: wat, update, movers };
}
