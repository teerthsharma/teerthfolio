// cut-helpers: the small helpers the cutscene layers each wrote privately (promoted at Consolidate; ADDITIVE, the docks keep their own copies).
// Canonical names: startOf (cue-or-bible start time), win (0..1 progress inside a window), smooth, pop (overshoot ease), additive (id-alpha-keeping add blend).
import { CustomBlending, AddEquation, OneFactor, ZeroFactor } from "three";

// Start time (s) of the named beat if scene.js fired it, else the bible time `fb`. Same contract as the per-dock startOf/T/tOf/beatStart copies.
export function startOf(cue, name, fb) { const s = cue.since?.(name); return Number.isFinite(s) ? cue.t - s : fb; }

// win(t, a, b): 0 before a, 1 after b, linear between.
export const win = (t, a, b) => (b > a ? Math.min(1, Math.max(0, (t - a) / (b - a))) : t >= a ? 1 : 0);

// smooth(x): smoothstep 3x^2 - 2x^3 on x in [0,1].
export const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// pop(x, over): ease-out-back style overshoot, 0 -> 1 with a peak of 1 + over mid-way (over = 0.18 gives 18% overshoot).
export function pop(x, over = 0.18) {
  x = Math.min(1, Math.max(0, x));
  const s = 1 + over * 10; // back constant; c3 = s + 1
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}

// additive(material): adds colour but keeps the destination alpha (the engine's id/set channel), no depth write.
export function additive(m) {
  Object.assign(m, { transparent: true, depthWrite: false, blending: CustomBlending, blendEquation: AddEquation, blendSrc: OneFactor, blendDst: OneFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor });
  return m;
}
