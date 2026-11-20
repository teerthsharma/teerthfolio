// Hex-cell component tracker: hysteresis live set, persistence filter and frame-to-frame topology events.
export const LO = 0.35, HI = 0.65, DELTA = 0.10, DT = 1 / 60, R_NEAR = 6, R_FAR = 24;

export function makeLabeler(g) {
  const n = g.n;
  const parent = new Int32Array(n);
  const rootId = new Int32Array(n);
  const find = (x) => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  };
  return function label(mask, labels) {
    for (let i = 0; i < n; i++) {
      if (mask[i]) parent[i] = i;
      else labels[i] = -1;
    }
    for (let i = 0; i < n; i++) {
      if (!mask[i]) continue;
      for (let k = g.off[i]; k < g.off[i + 1]; k++) {
        const j = g.adj[k];
        if (j <= i || !mask[j]) continue;
        const a = find(i), b = find(j);
        if (a < b) parent[b] = a;
        else if (b < a) parent[a] = b;
      }
    }
    rootId.fill(-1);
    let count = 0;
    for (let i = 0; i < n; i++) {
      if (!mask[i]) continue;
      const r = find(i);
      if (rootId[r] < 0) rootId[r] = count++;
      labels[i] = rootId[r];
    }
    return count;
  };
}

export function diffComponents(prevLab, kPrev, currLab, kCurr, n) {
  const m = kPrev + kCurr;
  const par = new Int32Array(m);
  for (let a = 0; a < m; a++) par[a] = a;
  const find = (x) => {
    while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; }
    return x;
  };
  for (let i = 0; i < n; i++) {
    const p = prevLab[i], q = currLab[i];
    if (p < 0 || q < 0) continue;
    const a = find(p), b = find(kPrev + q);
    if (a !== b) par[a] = b;
  }
  const np = new Int32Array(m), nq = new Int32Array(m);
  for (let a = 0; a < kPrev; a++) np[find(a)]++;
  for (let b = kPrev; b < m; b++) nq[find(b)]++;
  const out = { birth: 0, death: 0, merge: 0, split: 0 };
  for (let r = 0; r < m; r++) {
    if (par[r] !== r) continue;
    const p = np[r], q = nq[r];
    if (p === 0 && q === 1) out.birth++;
    else if (q === 0 && p === 1) out.death++;
    else {
      if (p >= 2) out.merge += p - 1;
      if (q >= 2) out.split += q - 1;
    }
  }
  return out;
}

export function touchMask(g, water = null) {
  const out = new Uint8Array(g.n);
  for (let i = 0; i < g.n; i++) {
    let t = g.border[i];
    if (water) {
      if (water[i]) t = 1;
      for (let k = g.off[i]; k < g.off[i + 1]; k++) if (water[g.adj[k]]) t = 1;
    }
    out[i] = t;
  }
  return out;
}

export function makeDetector(g, { touch = g.border, lo = LO, hi = HI, delta = DELTA } = {}) {
  const n = g.n;
  const label = makeLabeler(g);
  const lane = () => ({ prev: new Int32Array(n), cur: new Int32Array(n), kPrev: 0, k: 0 });
  const rawLive = lane(), simpLive = lane(), rawHole = lane(), simpHole = lane();
  const live = new Uint8Array(n), prevLive = new Uint8Array(n);
  const S = new Uint8Array(n);
  const minC = new Float64Array(n), sig = new Uint8Array(n);
  const compMask = new Uint8Array(n), compLab = new Int32Array(n);
  const outFlag = new Uint8Array(n), holeId = new Int32Array(n);
  const thr = lo - delta + 1e-12;
  let cArr = null, first = true, firstEvents = true;

  const holeLabels = (mask, out) => {
    for (let i = 0; i < n; i++) compMask[i] = mask[i] ? 0 : 1;
    const kc = label(compMask, compLab);
    outFlag.fill(0, 0, kc);
    for (let i = 0; i < n; i++) if (compLab[i] >= 0 && touch[i]) outFlag[compLab[i]] = 1;
    holeId.fill(-1, 0, kc);
    let m = 0;
    for (let i = 0; i < n; i++) {
      const c = compLab[i];
      if (c < 0 || outFlag[c]) { out[i] = -1; continue; }
      if (holeId[c] < 0) holeId[c] = m++;
      out[i] = holeId[c];
    }
    return m;
  };

  const det = { live, prevLive, k: 0, holes: 0, tag: null, count: null, events: null, step: null };

  det.tag = (c) => {
    cArr = c;
    prevLive.set(live);
    if (first) {
      for (let i = 0; i < n; i++) live[i] = c[i] < lo ? 1 : 0;
      first = false;
    } else {
      for (let i = 0; i < n; i++) {
        const v = c[i];
        if (v < lo) live[i] = 1;
        else if (v > hi) live[i] = 0;
      }
    }
  };

  det.count = () => {
    rawLive.k = label(live, rawLive.cur);
    det.k = rawLive.k;
  };

  det.events = () => {
    const k = rawLive.k;
    minC.fill(Infinity, 0, k);
    for (let i = 0; i < n; i++) {
      if (!live[i]) continue;
      const q = rawLive.cur[i];
      if (cArr[i] < minC[q]) minC[q] = cArr[i];
    }
    for (let q = 0; q < k; q++) sig[q] = minC[q] <= thr ? 1 : 0;
    for (let i = 0; i < n; i++) S[i] = live[i] && sig[rawLive.cur[i]] ? 1 : 0;
    simpLive.k = label(S, simpLive.cur);
    rawHole.k = holeLabels(live, rawHole.cur);
    simpHole.k = holeLabels(S, simpHole.cur);
    det.holes = rawHole.k;

    const zero = { birth: 0, death: 0, merge: 0, split: 0 };
    let dRaw = zero, hRaw = zero, dSimp = zero, hSimp = zero;
    if (!firstEvents) {
      dRaw = diffComponents(rawLive.prev, rawLive.kPrev, rawLive.cur, rawLive.k, n);
      hRaw = diffComponents(rawHole.prev, rawHole.kPrev, rawHole.cur, rawHole.k, n);
      dSimp = diffComponents(simpLive.prev, simpLive.kPrev, simpLive.cur, simpLive.k, n);
      hSimp = diffComponents(simpHole.prev, simpHole.kPrev, simpHole.cur, simpHole.k, n);
    }
    firstEvents = false;
    for (const L of [rawLive, simpLive, rawHole, simpHole]) {
      const t = L.prev; L.prev = L.cur; L.cur = t; L.kPrev = L.k;
    }
    return {
      raw: { birth: dRaw.birth, death: dRaw.death, merge: dRaw.merge, split: dRaw.split, holeOpen: hRaw.birth, holeClose: hRaw.death, nLive: rawLive.kPrev, nHoles: rawHole.kPrev },
      simp: { birth: dSimp.birth, death: dSimp.death, merge: dSimp.merge, split: dSimp.split, holeOpen: hSimp.birth, holeClose: hSimp.death, nLive: simpLive.kPrev, nHoles: simpHole.kPrev },
    };
  };

  det.step = (c) => {
    det.tag(c);
    det.count();
    return det.events();
  };

  return det;
}
