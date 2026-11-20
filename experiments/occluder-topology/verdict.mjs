// Pre-registered occluder-topology verdict as a pure function; the bars are the PREREGISTRATION.md text.
export const BARS = {
  pass: 'PASS: filtered events <= 0.1 x B1 (0.069-0.079/s) on all 3 seeds, and the control rate >= 20x the real rate.',
  dead: "DEAD: filtered events >= that seed's B1 (0.69-0.79/s) on any seed.",
  mid: 'Anything between: UNRESOLVED.',
};

const CONTROL_BAR = 20;
const f = (x) => (Number.isFinite(x) ? x.toFixed(4) : String(x));

export function verdict({ kPassed, controlRatio, seeds }) {
  if (!kPassed) {
    return { verdict: 'INVALID', reasons: ['INVALID: the known-answer gate (known.test.mjs) did not pass, so no verdict is given (D6).'] };
  }
  if (!seeds.length) return { verdict: 'UNRESOLVED', reasons: ['UNRESOLVED: no seeds were given.'] };

  const seedLine = (s) => {
    const cut = 0.1 * s.b1PerSec;
    const status = s.perSec >= s.b1PerSec ? 'DEAD-level' : s.perSec <= cut ? 'under 0.1 x B1' : 'between';
    return `seed ${s.seed}: filtered ${f(s.perSec)}/s, B1 ${f(s.b1PerSec)}/s, 0.1 x B1 ${f(cut)}/s: ${status}.`;
  };
  const controlOk = controlRatio >= CONTROL_BAR;
  const controlLine = `control ratio ${f(controlRatio)}x ${controlOk ? 'meets' : 'is below'} the 20x bar${controlOk ? '' : ', so PASS is blocked even if every seed is under 0.1 x B1'}.`;
  const reasons = [...seeds.map(seedLine), controlLine];

  if (seeds.some((s) => s.perSec >= s.b1PerSec)) return { verdict: 'DEAD', reasons };
  if (controlOk && seeds.every((s) => s.perSec <= 0.1 * s.b1PerSec)) return { verdict: 'PASS', reasons };
  return { verdict: 'UNRESOLVED', reasons };
}

export function verdictLatched(input) {
  const v = verdict(input);
  return { verdict: v.verdict, reasons: v.reasons.map((s) => `LATCHED: ${s}`) };
}
