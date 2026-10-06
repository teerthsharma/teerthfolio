// T3: THE TOPOLOGY-AWARE TIER GOVERNOR. The frame-time trace over a sliding
// window is a 1-D field. A compile hitch is a SHORT bar (one spike, a few
// frames); sustained overload is a LONG bar (a plateau). So:
//   1 the trace is persistence-simplified: dips shallower than tau x range are
//     filled (h0 on -ms, short bars raised to their death), so a plateau with
//     brief good frames stays one component;
//   2 the superlevel set {ms > budget} of the simplified trace is split into
//     components (beta_0 at the budget level);
//   3 DOWN only when one component lasts >= 1.5 s AND >= 20 frames AND the
//     Welford mean is above budget; the jump is sized by the pixel budget
//     (ms scales with mpx), so it is one change, not a staircase;
//   4 UP only when the window's Hilbert embedding has held still for 2 rounds
//     (TopologicalConvergence), c_v^2 = var/mean^2 < 0.05, mean < 0.7 budget x
//     the next rung's cost, and >= 10 s since the last change (no thrash).
import { TIERS } from "../world/quality.js";
import { csrGrid, h0Superlevel, TopologicalConvergence } from "./topology.js";

export function simplifyDips(ms, tau = 0.1) {
  const neg = Float64Array.from(ms, (x) => -x);
  const g = csrGrid(ms.length, 1);
  const bc = h0Superlevel(neg, g);
  let lo = Infinity; for (const x of neg) lo = Math.min(lo, x);
  const cut = tau * (bc.essential - lo);
  const out = Float64Array.from(neg);
  h0Superlevel(neg, g, (b, d, mem) => { if (b - d <= cut) for (const m of mem) out[m] = Math.min(out[m], d); });
  return { trace: Float64Array.from(out, (x) => -x), bc };
}

export class Governor {
  constructor(o = {}) {
    this.tier = o.tier ?? 2;
    this.budget = o.budgetMs ?? 1000 / 30;
    this.fixed = o.fixed ?? false;
    this.win = o.window ?? 4;
    this.s = []; // [t, ms]
    this.lastChange = -1e9;
    this.lastRound = 0;
    this.conv = new TopologicalConvergence(16, 0.05, 2);
    this.log = [];
  }
  observe(ms, t) {
    this.s.push([t, ms]);
    while (this.s.length && this.s[0][0] < t - this.win) this.s.shift();
    if (this.fixed || t - this.lastRound < 0.5 || this.s.length < 10) return this.tier;
    this.lastRound = t;
    const v = this.s.map((x) => x[1]);
    let mean = 0, m2 = 0;
    v.forEach((x, i) => { const d = x - mean; mean += d / (i + 1); m2 += d * (x - mean); }); // Welford
    const cv2 = m2 / v.length / (mean * mean);
    const { trace, bc } = simplifyDips(v);
    let longest = 0, frames = 0, start = -1;
    for (let i = 0; i <= trace.length; i++) {
      const over = i < trace.length && trace[i] > this.budget;
      if (over && start < 0) start = i;
      if (!over && start >= 0) {
        const dur = this.s[i - 1][0] - this.s[start][0] + this.s[i - 1][1] / 1000;
        if (i - start >= 20 && dur > longest) { longest = dur; frames = i - start; }
        start = -1;
      }
    }
    const still = this.conv.update(bc);
    let next = this.tier;
    if (longest >= 1.5 && mean > this.budget) {
      const now = TIERS[this.tier].mpx;
      next = 0;
      for (let k = this.tier - 1; k >= 0; k--) if ((mean * TIERS[k].mpx) / now <= this.budget * 0.85) { next = k; break; }
    } else if (still && cv2 < 0.05 && this.tier < TIERS.length - 1 && t - this.lastChange >= 10) {
      const cost = TIERS[this.tier + 1].mpx / TIERS[this.tier].mpx;
      if (mean * cost < 0.7 * this.budget) next = this.tier + 1;
    }
    if (next !== this.tier) {
      this.log.push({ t, from: this.tier, to: next, mean: +mean.toFixed(1), plateau: +longest.toFixed(2), frames });
      this.tier = next;
      this.lastChange = t;
      this.s = [];
      this.conv.reset();
    }
    return this.tier;
  }
}
