// Exact Euclidean distance transform (Felzenszwalb and Huttenlocher) of a w x w occlusion mask.
const INF = 1e20;

// One-dimensional squared distance transform of f (length n) into out.
function dt1(f, n, out, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const d = q - v[k];
    out[q] = d * d + f[v[k]];
  }
}

// Occluded pixels get the distance to the nearest background pixel centre; the box border is background.
export function edt(mask, w = 32) {
  const W = w + 2;
  const g = new Float64Array(W * W);
  for (let y = 1; y <= w; y++) for (let x = 1; x <= w; x++) g[y * W + x] = mask[(y - 1) * w + (x - 1)] ? INF : 0;
  const f = new Float64Array(W), out = new Float64Array(W), v = new Int32Array(W), z = new Float64Array(W + 1);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < W; y++) f[y] = g[y * W + x];
    dt1(f, W, out, v, z);
    for (let y = 0; y < W; y++) g[y * W + x] = out[y];
  }
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) f[x] = g[y * W + x];
    dt1(f, W, out, v, z);
    for (let x = 0; x < W; x++) g[y * W + x] = out[x];
  }
  const res = new Float64Array(w * w);
  for (let y = 1; y <= w; y++) for (let x = 1; x <= w; x++) res[(y - 1) * w + (x - 1)] = Math.sqrt(g[y * W + x]);
  return res;
}
