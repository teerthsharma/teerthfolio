// Pre-registered verdict as a pure function: the bars are the prereg text, and the logic is the prereg order.
export const BARS = {
  pass: 'PASS bar (fixed now): SIMPLIFIED topology events median <= 1 per second AND <= 0.1 x B1 chunk crossings per second, at h=4, N=20, on all 3 seeds.',
  dead: 'DEAD if SIMPLIFIED events > 1 per 10 frames at h=4, N=20. Anything between is reported as unresolved, not as a pass.',
  e2: 'Bar: p95 <= 0.5 ms CPU per frame.',
  k5: 'K5 negative control: same walk with mover positions re-randomised every frame: events/frame must be at least 20x the real walk (shows the detector can see events).',
};

export function verdictPostHoc({ kPassed, k5Ratio, simpHCells, e2P95Ms }) {
  const v = verdict({
    kPassed,
    k5Ratio,
    e1Cells: simpHCells.map((c) => ({ seed: c.seed, frames: c.frames, simpEvents: c.simpH.total, simpMedianPerSec: c.simpH.medianPerSec, b1PerSec: c.b1.perSec })),
    e2P95Ms,
  });
  return { e1: v.e1, e2: v.e2, reasons: v.reasons.map((s) => s.replaceAll('SIMPLIFIED', 'SIMP-H')) };
}

export function verdict({ kPassed, k5Ratio, e1Cells, e2P95Ms }) {
  const reasons = [];
  let e1;
  if (!kPassed || !(k5Ratio >= 20)) {
    e1 = 'INVALID';
    if (!kPassed) reasons.push('E1 INVALID: the known-answer gate (known.test.mjs) did not pass.');
    if (!(k5Ratio >= 20)) reasons.push(`E1 INVALID: K5 shuffled control is ${k5Ratio}x the real walk, below the 20x bar.`);
  } else {
    const events = e1Cells.reduce((s, c) => s + c.simpEvents, 0);
    const frames = e1Cells.reduce((s, c) => s + c.frames, 0);
    const pooled = events / frames;
    if (pooled > 0.1) {
      e1 = 'DEAD';
      reasons.push(`E1 DEAD: SIMPLIFIED events ${events} over ${frames} frames is ${pooled.toFixed(4)} per frame, above 0.1.`);
    } else {
      const failing = e1Cells.filter((c) => !(c.simpMedianPerSec <= 1 && c.simpEvents / (c.frames / 60) <= 0.1 * c.b1PerSec));
      if (failing.length === 0) {
        e1 = 'PASS';
        reasons.push(`E1 PASS: every seed has SIMPLIFIED median <= 1/s and mean rate <= 0.1 x B1 (pooled ${pooled.toFixed(4)} per frame).`);
      } else {
        e1 = 'UNRESOLVED';
        for (const c of failing) {
          reasons.push(`E1 UNRESOLVED on seed ${c.seed}: SIMPLIFIED median ${c.simpMedianPerSec}/s (bar <= 1), mean ${(c.simpEvents / (c.frames / 60)).toFixed(4)}/s vs 0.1 x B1 = ${(0.1 * c.b1PerSec).toFixed(4)}/s.`);
        }
      }
    }
  }
  const e2 = e2P95Ms <= 0.5 ? 'PASS' : 'FAIL';
  reasons.push(`E2 ${e2}: pooled core p95 ${e2P95Ms} ms per frame at h=4, N=20 (bar <= 0.5 ms).`);
  return { e1, e2, reasons };
}
