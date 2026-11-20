// Per-occluder H0 persistence of a 32x32 occlusion mask, response classes by p, and per-frame topology events.
import { edt } from './mask.mjs';
import { makeLabeler, diffComponents } from '../topo-field/cc.mjs';
import { csrGrid, h0Superlevel } from '../../lib/anime/topology.js';

export const P_OVER = 1, P_SOLID = 3, P_OFFSET = 0.5;
const W = 32, N = W * W;
const GRID = csrGrid(W, W);
const LABEL_GRAPH = { n: N, off: GRID.off, adj: GRID.adj };

export function classify(p) { return p < P_OVER ? 0 : p > P_SOLID ? 2 : 1; }
export function showProb(p) { return p < P_OVER ? 1 : p > P_SOLID ? 0 : (P_SOLID - p) / 2; }

export function makeAnalyser({ pOffset = P_OFFSET } = {}) {
  const label = makeLabeler(LABEL_GRAPH);
  return function analyse(mask) {
    const d = edt(mask, W);
    const labels = new Int32Array(N);
    const k = label(mask, labels);
    if (k === 0) return { k, labels, p: new Float64Array(0), cls: new Uint8Array(0), d };
    const peak = new Float64Array(k), claimed = new Uint8Array(k);
    let nClaimed = 0;
    // A level-0 merge kills one tree whose only unclaimed component is its own; earlier kills are already claimed.
    const track = (birth, death, members) => {
      if (death !== 0) return;
      let own = -1;
      for (const m of members) {
        if (d[m] <= 0) continue;
        const c = labels[m];
        if (claimed[c]) continue;
        if (own >= 0 && own !== c) throw new Error('persist: a dying tree holds two unclaimed components');
        own = c;
      }
      if (own < 0) throw new Error('persist: a dying tree holds no component');
      claimed[own] = 1; peak[own] = birth; nClaimed++;
    };
    const bc = h0Superlevel(d, GRID, track);
    if (nClaimed !== k - 1) throw new Error(`persist: claimed ${nClaimed} of ${k - 1} components`);
    for (let c = 0; c < k; c++) if (!claimed[c]) peak[c] = bc.essential;
    const p = new Float64Array(k), cls = new Uint8Array(k);
    for (let c = 0; c < k; c++) { p[c] = peak[c] - pOffset; cls[c] = classify(p[c]); }
    return { k, labels, p, cls, d };
  };
}

export function makeEvents({ mode }) {
  if (mode !== 'raw' && mode !== 'plain' && mode !== 'latched') throw new Error(`persist: unknown mode ${mode}`);
  let first = true, prevLab = null, prevK = 0;
  let prevS = new Uint8Array(N), lin0 = new Uint8Array(N);
  return {
    step(an) {
      const { k, labels, cls } = an;
      const sig = new Uint8Array(k);
      for (let c = 0; c < k; c++) sig[c] = cls[c] === 2 ? 1 : 0;
      if (mode === 'latched') for (let i = 0; i < N; i++) if (labels[i] >= 0 && prevS[i]) sig[labels[i]] = 1;
      let f0 = 0;
      if (mode === 'latched') {
        if (first) for (let i = 0; i < N; i++) lin0[i] = labels[i] >= 0 ? 1 : 0;
        else {
          const lineComp = new Uint8Array(k), hadS = new Uint8Array(k);
          for (let i = 0; i < N; i++) {
            const c = labels[i];
            if (c < 0) continue;
            if (lin0[i]) lineComp[c] = 1;
            if (prevS[i]) hadS[c] = 1;
          }
          for (let c = 0; c < k; c++) if (sig[c] && !hadS[c] && lineComp[c]) f0++;
          for (let i = 0; i < N; i++) lin0[i] = labels[i] >= 0 ? lineComp[labels[i]] : 0;
        }
      }
      const lab = new Int32Array(N).fill(-1), inS = new Uint8Array(N);
      let kS = 0;
      if (mode === 'raw') {
        for (let i = 0; i < N; i++) if (labels[i] >= 0) { lab[i] = labels[i]; inS[i] = 1; }
        kS = k;
      } else {
        const id = new Int32Array(k).fill(-1);
        for (let c = 0; c < k; c++) if (sig[c]) id[c] = kS++;
        for (let i = 0; i < N; i++) {
          const c = labels[i];
          if (c >= 0 && sig[c]) { lab[i] = id[c]; inS[i] = 1; }
        }
      }
      const out = { birth: 0, death: 0, merge: 0, split: 0, frame0Births: f0 };
      if (!first) Object.assign(out, diffComponents(prevLab, prevK, lab, kS, N));
      prevLab = lab; prevK = kS; prevS = inS; first = false;
      return { birth: out.birth, death: out.death, merge: out.merge, split: out.split, frame0Births: out.frame0Births };
    },
  };
}
