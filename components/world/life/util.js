// Small math shared by the life files (Props, Penguins, Trail, Effects).
// No allocation, no state: every export is a pure number-in, number-out.

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Frame-rate independent easing toward a target: v += (target - v) * damp(rate, dt).
export const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Standard "back" overshoot curve: 0 at t=0, 1 at t=1, peaks around 1.1 on
// the way there. Multiply a resting value by this for a pop-in.
export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp(t, 0, 1) - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}
