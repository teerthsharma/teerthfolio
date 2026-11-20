// Hex cells on a disc of radius R with centre spacing h (odd-r rows): CSR 6-neighbour graph, border flags, nearest-cell lookup.
export function makeHexGrid(R, h) {
  const s = (h * Math.sqrt(3)) / 2;
  const J = Math.ceil(R / s) + 1;
  const I = Math.ceil(R / h) + 2;
  const W = 2 * I + 1;
  const slot = new Int32Array(W * (2 * J + 1)).fill(-1);
  const xs = [];
  const zs = [];
  const cols = [];
  const rows = [];
  for (let j = -J; j <= J; j++) {
    for (let i = -I; i <= I; i++) {
      const x = i * h + (j & 1 ? h / 2 : 0);
      const z = j * s;
      if (Math.hypot(x, z) > R) continue;
      slot[(j + J) * W + (i + I)] = xs.length;
      xs.push(x);
      zs.push(z);
      cols.push(i);
      rows.push(j);
    }
  }
  const n = xs.length;
  const lists = new Array(n);
  const offsets = new Uint32Array(n + 1);
  for (let c = 0; c < n; c++) {
    const i = cols[c];
    const j = rows[c];
    const cand = [
      [i - 1, j],
      [i + 1, j],
    ];
    if (j & 1) cand.push([i, j - 1], [i + 1, j - 1], [i, j + 1], [i + 1, j + 1]);
    else cand.push([i - 1, j - 1], [i, j - 1], [i - 1, j + 1], [i, j + 1]);
    const ids = [];
    for (const [a, b] of cand) {
      const id = slot[(b + J) * W + (a + I)];
      if (id >= 0) ids.push(id);
    }
    ids.sort((p, q) => p - q);
    lists[c] = ids;
    offsets[c + 1] = offsets[c] + ids.length;
  }
  const indices = new Uint32Array(offsets[n]);
  const border = new Uint8Array(n);
  for (let c = 0; c < n; c++) {
    indices.set(lists[c], offsets[c]);
    border[c] = offsets[c + 1] - offsets[c] < 6 ? 1 : 0;
  }
  const xArr = Float64Array.from(xs);
  const zArr = Float64Array.from(zs);
  const cell = (x, z) => {
    if (Math.hypot(x, z) > R) return -1;
    let best = 0;
    let bd = Infinity;
    for (let v = 0; v < n; v++) {
      const d = Math.hypot(xArr[v] - x, zArr[v] - z);
      if (d < bd) {
        bd = d;
        best = v;
      }
    }
    return best;
  };
  return {
    n,
    xs: xArr,
    zs: zArr,
    adj: { offsets, indices },
    border,
    cols: Math.max(...cols) - Math.min(...cols) + 1,
    rows: Math.max(...rows) - Math.min(...rows) + 1,
    cell,
  };
}
