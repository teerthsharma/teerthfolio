// The camera half of POP_2D (moments.js): a push-in, then a dolly-zoom to a
// near-orthographic view. The push moves the camera toward what it looks at
// (PUSH_IN: distance / (1 + PUSH_IN) at full), and at the end of the push the
// field of view closes to FLAT_FOV while the camera backs off along its own
// line of sight so the subject keeps its size: the perspective drains out and
// leaves a flat frame, azimuth untouched. No second camera, no package.
// CameraRig calls it last in its frame, so every frame starts from the plain
// follow camera: amount 0 restores the base lens at once (skip = one frame).
import { MathUtils } from "three";
import { ARRIVAL, POP_2D } from "../../../lib/world/moments";

const FLAT_FOV = 5; // deg: tan ratio ~11 at the 35 deg base lens
export const PUSH_IN = 0.45; // the camera ends 1/1.45 of the way to its target
let baseFov = 0;

export const reducedMotion = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

// Is the 3D seal hidden behind its 2D cutout at this ui.pop phase?
export const popHides = (pop) => pop >= 2 && pop <= 6 && !reducedMotion();

const ramp = (u, a, b) => MathUtils.smoothstep(u, a, b);
// { push, flat } in 0..1 for t seconds since the arrival began.
const amounts = { push: 0, flat: 0 };
export function popAmounts(t) {
  const out = t > POP_2D.out ? 1 - ramp(t, POP_2D.out, ARRIVAL.duration) : 1;
  amounts.push = t < POP_2D.push ? 0 : ramp(t, POP_2D.push, POP_2D.smash + 0.05) * out; // the push-in
  amounts.flat = t < POP_2D.smash ? 0 : ramp(t, POP_2D.smash, POP_2D.enter) * out; // the ortho slam at its end
  return amounts;
}

export function applyFlatten(camera, lookAt, amount, fog) {
  if (!baseFov) baseFov = camera.fov;
  if (amount.push <= 0 && amount.flat <= 0) {
    if (camera.fov !== baseFov) {
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
    }
    return;
  }
  const half = Math.tan(MathUtils.degToRad(baseFov) / 2);
  const flatHalf = Math.tan(MathUtils.degToRad(FLAT_FOV) / 2);
  const flatHalfNow = half + (flatHalf - half) * amount.flat; // linear in tan: constant-rate flatten
  const dist0 = camera.position.distanceTo(lookAt);
  const dist1 = dist0 / (1 + PUSH_IN * amount.push);
  const dist2 = (dist1 * half) / flatHalfNow;
  camera.position.sub(lookAt).setLength(dist2).add(lookAt);
  camera.fov = MathUtils.radToDeg(2 * Math.atan(flatHalfNow));
  camera.far = Math.max(camera.far, dist2 + 260); // CameraRig.jsx resets it each frame
  camera.updateProjectionMatrix();
  if (fog?.isFog) {
    fog.near += dist2 - dist0;
    fog.far += dist2 - dist0;
  }
}
