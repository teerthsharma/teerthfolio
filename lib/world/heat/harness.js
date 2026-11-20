// Harness texture codec: packs each hex cell's region, critical type, multiplicity and C, kappa, lambda into one RGBA8 texel of the 43x49 harness grid (texel = row * TH_COLS + col, cell col and row offset so the grid's smallest index is 0).
export const TH_COLS = 43;
export const TH_ROWS = 49;

function toByte(v) {
  return Math.min(255, Math.max(0, Math.round(v * 255)));
}

// Texel index of every cell, recovered from the grid's xs and zs (odd-r rows: x = i*h + h/2 on odd rows).
function texelIndex(g) {
  const zs = Array.from(new Set(g.zs)).sort((a, b) => a - b);
  let s = Infinity;
  for (let k = 1; k < zs.length; k++) s = Math.min(s, zs[k] - zs[k - 1]);
  const h = (2 * s) / Math.sqrt(3);
  const rowOf = new Map(zs.map((z, k) => [z, k]));
  const col = new Int32Array(g.n);
  const row = new Int32Array(g.n);
  let minI = Infinity;
  for (let c = 0; c < g.n; c++) {
    const q = g.xs[c] / h;
    const half = Math.abs(q - Math.round(q)) > 0.25 ? 0.5 : 0;
    col[c] = Math.round(q - half);
    row[c] = rowOf.get(g.zs[c]);
    minI = Math.min(minI, col[c]);
  }
  const texel = new Int32Array(g.n);
  for (let c = 0; c < g.n; c++) {
    col[c] -= minI;
    if (col[c] >= TH_COLS || row[c] >= TH_ROWS) throw new RangeError("hex grid exceeds the 43x49 harness texture");
    texel[c] = row[c] * TH_COLS + col[c];
  }
  return texel;
}

export function packTh(out, type, crit, mult, C, kappa, lambda, g) {
  if (out.length !== TH_COLS * TH_ROWS * 4) throw new RangeError("harness output must be the 43x49 RGBA8 texture");
  out.fill(0);
  const texel = texelIndex(g);
  for (let c = 0; c < g.n; c++) {
    const t = texel[c] * 4;
    out[t] = (type[c] << 6) | (crit[c] << 4) | Math.min(mult[c], 15);
    out[t + 1] = toByte(C[c]);
    out[t + 2] = kappa ? toByte(kappa[c]) : 0;
    out[t + 3] = lambda ? toByte(lambda[c]) : 0;
  }
  return out;
}

export function unpackTh(data, col, row) {
  const t = (row * TH_COLS + col) * 4;
  const r = data[t];
  return {
    s: r >> 6,
    crit: (r >> 4) & 3,
    mult: r & 15,
    C: data[t + 1] / 255,
    kappa: data[t + 2] / 255,
    lambda: data[t + 3] / 255,
  };
}
