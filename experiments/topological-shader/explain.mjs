// Explained mass X (PREREGISTRATION.md section 6.5, T1; the residual of section 3 D6). Per 1 Hz sample:
// w_k = clamp(<Hn, H_k> / <H_k, H_k>, 0, 1), S = sum_k w_k H_k, R = Hn - min(Hn, S), X = 1 - sum R / sum Hn.
// Each plate's weight is its own projection, as written; the weights are not solved jointly.

export function explainedMass(Hn, plates) {
  const n = Hn.length;
  let sumHn = 0;
  for (let v = 0; v < n; v++) sumHn += Hn[v];
  if (sumHn === 0) return null;
  const S = new Float64Array(n);
  for (const H of plates) {
    let num = 0;
    let den = 0;
    for (let v = 0; v < n; v++) {
      num += Hn[v] * H[v];
      den += H[v] * H[v];
    }
    const w = den > 0 ? Math.min(1, Math.max(0, num / den)) : 0;
    for (let v = 0; v < n; v++) S[v] += w * H[v];
  }
  let sumR = 0;
  for (let v = 0; v < n; v++) sumR += Hn[v] - Math.min(Hn[v], S[v]);
  return 1 - sumR / sumHn;
}

export function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return NaN;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export function sampleMedian(samples, plates) {
  const xs = [];
  for (const Hn of samples) {
    const x = explainedMass(Hn, plates);
    if (x !== null) xs.push(x);
  }
  return median(xs);
}

export function permutePlates(plates, perm) {
  return plates.map((H) => {
    const Q = new Float64Array(H.length);
    for (let v = 0; v < H.length; v++) Q[v] = H[perm[v]];
    return Q;
  });
}
