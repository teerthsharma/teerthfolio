// The T1 verdict (PREREGISTRATION.md section 6.5). Pure: numbers in, verdict out. The bar strings are quoted verbatim
// from PREREGISTRATION.md and a test asserts that they occur in it. Precedence: VOID, then DEAD, then PASS, else UNRESOLVED.
import { median, permutePlates, sampleMedian } from "./explain.mjs";

export const BARS = {
  PASS: "PASS: tour X_A >= 0.5, and on the roams median(X_A - max(X_U, median X_B)) >= 0.15.",
  DEAD: "DEAD: that median <= 0.05, or median X_A < 0.2.",
  UNRESOLVED: "Anything else UNRESOLVED.",
  VOID: "Known answers, or the run is void: a walk built only of L8 legs gives X >= 0.95; with the plate cells permuted that walk loses >= 0.2.",
};

export const GATE = { explained: 0.95, loss: 0.2 };

export function knownAnswerGate(walkSamples, plates, perm) {
  const xWalk = sampleMedian(walkSamples, plates);
  const xPerm = sampleMedian(walkSamples, permutePlates(plates, perm));
  return { xWalk, xPerm, ok: xWalk >= GATE.explained && xWalk - xPerm >= GATE.loss };
}

export function verdict({ gate, tourXA, roams }) {
  if (!gate.ok) return { verdict: "VOID", bar: BARS.VOID };
  const margin = median(roams.map((r) => r.xA - Math.max(r.xU, r.medB)));
  const medXA = median(roams.map((r) => r.xA));
  if (margin <= 0.05 || medXA < 0.2) return { verdict: "DEAD", bar: BARS.DEAD, margin, medXA };
  if (tourXA >= 0.5 && margin >= 0.15) return { verdict: "PASS", bar: BARS.PASS, margin, medXA };
  return { verdict: "UNRESOLVED", bar: BARS.UNRESOLVED, margin, medXA };
}
