// CAMS for p-asmodeus: the eleven held shots as free world cameras (the pr-anyps5-12609 pattern) and the pin that places a cast object on the painted band.
import { PerspectiveCamera, Vector3 } from "three";
import { K } from "./clock.js";

export const BAND_AR = 2.39;
const rig = (az, r, el, fov, look = [0, 0.4, 0]) => ({ eye: [r * Math.sin(az), el, r * Math.cos(az)], look, fov });

export const SHOTS = [
  { n: 1, t: [0, 1], law: "wide", ...rig(0, 4.4, 1.0, [28, 36], [0, 0.45, 0]), ease: "out", step: 24 },
  { n: 2, t: [1, 2], law: "arc", ...rig(0.15, 3.4, 0.8, 34) },
  { n: 3, t: [2, 4.5], law: "wide", ...rig(0.5, 6.0, 3.8, 34) },
  { n: 4, t: [4.5, 5.5], law: "arc", ...rig(-0.3, 4.2, 1.0, 36) },
  { n: 5, t: [5.5, 5.5 + 2 / 12], law: "free", ...rig(0, 1.7, 0.9, 30), ease: "cut" },
  { n: 6, t: [5.5 + 2 / 12, 6.5], law: "arc", ...rig(-0.3, 4.2, 1.0, 36) },
  { n: 7, t: [6.5, 8], law: "kill", ...rig(0.35, 3.6, 0.3, 34, [0, 0.8, 0]), dutch: [0, 4] },
  { n: 8, t: [8, K(8)], law: "kill", ...rig(0.35, 3.6, 0.3, [34, 32.3], [0, 0.8, 0]), ease: "out", step: 24 },
  { n: 9, t: [K(8), 8.5], law: "free", ...rig(0, 6.5, 1.2, 38, [0, 0.7, 0]) },
  { n: 10, t: [8.5, 10.5], law: "home", ...rig(Math.PI, 3.6, 2.1, [36, 40], [0, 0.9, 3]), ease: "out", step: 12 },
  { n: 11, t: [10.5, 12], law: "home", ...rig(0.1, 3.0, 0.8, 34) },
];

export const shotAt = (t) => { let s = SHOTS[0]; for (const k of SHOTS) if (t >= k.t[0] - 1e-6) s = k; return s; };

const fovOf = (s, t) => {
  if (!Array.isArray(s.fov)) return s.fov;
  const tq = s.step ? s.t[0] + Math.floor((t - s.t[0]) * s.step + 1e-6) / s.step : t;
  const p = Math.min(1, Math.max(0, (tq - s.t[0]) / (s.t[1] - s.t[0])));
  return s.fov[0] + (s.fov[1] - s.fov[0]) * (1 - (1 - p) ** 3);
};

// the scene.js entries: free world keys (eye, lookAt) as pr-anyps5-12609; a fixed camera is held, so the plate is baked once per drawing
export const shotData = () => SHOTS.map((s) => ({
  n: s.n, t: s.t, law: s.law, minFrac: 0.01, moving: true,
  eye: [s.eye], lookAt: [s.look], fov: s.fov, dutch: s.dutch ?? 0,
  ...(s.ease && { ease: s.ease }), ...(s.step && { step: s.step }),
  ...(!Array.isArray(s.fov) && !Array.isArray(s.dutch) ? { hold: true } : {}),
}));

export function bandOf(aspect) {
  const bar = Math.max(0, (1 - aspect / BAND_AR) / 2);
  return { bar, h: 1 - 2 * bar };
}

const cam = new PerspectiveCamera(34, 1.6, 0.1, 100), fwd = new Vector3(), tmp = new Vector3();
// world point for band point (u 0..1 across, v 0..1 DOWN the band) at `depth` metres along the camera axis
export function pin(s, t, aspect, u, v, depth, out = new Vector3()) {
  const { bar, h } = bandOf(aspect);
  cam.fov = fovOf(s, t); cam.aspect = aspect;
  cam.position.fromArray(s.eye); cam.up.set(0, 1, 0); cam.lookAt(s.look[0], s.look[1], s.look[2]);
  cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
  tmp.set(2 * u - 1, 1 - 2 * (bar + v * h), 0.5).unproject(cam).sub(cam.position).normalize();
  cam.getWorldDirection(fwd);
  return out.copy(cam.position).addScaledVector(tmp, depth / tmp.dot(fwd));
}

// depth at which an object `m` metres tall fills `frac` of the band height
export function depthFor(s, t, aspect, m, frac) {
  const { h } = bandOf(aspect);
  return m / (2 * Math.tan((fovOf(s, t) * Math.PI) / 360) * frac * h);
}
