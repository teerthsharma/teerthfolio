// Hex grid on a disc: odd-r offset cell centres, CSR 6-neighbour adjacency, border flags.
export function makeHexGrid(R, h) {
  const s = h * Math.sqrt(3) / 2;
  const J = Math.ceil(R / s) + 1;
  const I = Math.ceil(R / h) + 2;
  const W = 2 * I + 1;
  const lookup = new Int32Array(W * (2 * J + 1)).fill(-1);
  const xs = [], zs = [], cols = [], rows = [];
  for (let j = -J; j <= J; j++) {
    for (let i = -I; i <= I; i++) {
      const x = i * h + ((j & 1) ? h / 2 : 0);
      const z = j * s;
      if (Math.hypot(x, z) > R) continue;
      lookup[(j + J) * W + (i + I)] = xs.length;
      xs.push(x); zs.push(z); cols.push(i); rows.push(j);
    }
  }
  const n = xs.length;
  const off = new Uint32Array(n + 1);
  const nbrs = new Array(n);
  for (let c = 0; c < n; c++) {
    const i = cols[c], j = rows[c];
    const cand = [[i - 1, j], [i + 1, j]];
    if (j & 1) cand.push([i, j - 1], [i + 1, j - 1], [i, j + 1], [i + 1, j + 1]);
    else cand.push([i - 1, j - 1], [i, j - 1], [i - 1, j + 1], [i, j + 1]);
    const ids = [];
    for (const [a, b] of cand) {
      const id = lookup[(b + J) * W + (a + I)];
      if (id >= 0) ids.push(id);
    }
    ids.sort((p, q) => p - q);
    nbrs[c] = ids;
    off[c + 1] = off[c] + ids.length;
  }
  const adj = new Uint32Array(off[n]);
  for (let c = 0; c < n; c++) adj.set(nbrs[c], off[c]);
  const deg = new Uint8Array(n);
  const border = new Uint8Array(n);
  for (let c = 0; c < n; c++) {
    deg[c] = off[c + 1] - off[c];
    border[c] = deg[c] < 6 ? 1 : 0;
  }
  return { h, R, n, x: Float64Array.from(xs), z: Float64Array.from(zs), off, adj, deg, border };
}
