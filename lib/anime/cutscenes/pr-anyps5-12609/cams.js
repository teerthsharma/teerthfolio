// CAMS for pr-anyps5-12609: the eight held shots as world cameras, and the helper that pins a cast object to a point of the painted band.
// The plates are screen-space, so every plate-anchored object is solved per drawing: (band u, band v, depth) -> world position.
import { PerspectiveCamera, Vector3 } from "three";

export const BAND_AR = 2.39;
const rig = (az, r, el, fov, look = [0, 0.4, 0]) => ({ eye: [r * Math.sin(az), el, r * Math.cos(az)], look, fov });

// shot table: [t0, t1, law, camera]; hero at the origin, the director aims at the chest so its keep-in-frame pass never moves the aim
export const SHOTS = [
  { n: 1, t: [0, 1], law: "wide", ...rig(0, 4.2, 0.7, 34) },
  { n: 2, t: [1, 2], law: "wide", ...rig(0.15, 15, 1.7, 34) },
  { n: 3, t: [2, 3.5], law: "arc", ...rig(0.2, 5, 1.0, 32) },
  { n: 4, t: [3.5, 5.5], law: "arc", ...rig(-0.3, 5, 1.0, 36) },
  { n: 5, t: [5.5, 8], law: "free", ...rig(0.1, 11.5, 2.2, 38) },
  { n: 6, t: [8, 8.5], law: "free", ...rig(0.1, 11.5, 2.2, [38, 37.2]) },
  { n: 7, t: [8.5, 10.5], law: "free", ...rig(0.35, 12, 2.0, 42) },
  { n: 8, t: [10.5, 12], law: "home", ...rig(0, 9, 1.9, 36) },
];

export const shotAt = (t) => { let s = SHOTS[0]; for (const k of SHOTS) if (t >= k.t[0] - 1e-6) s = k; return s; };
const fovOf = (s, t) => (Array.isArray(s.fov) ? s.fov[0] + (s.fov[1] - s.fov[0]) * Math.min(1, Math.max(0, 1 - (1 - Math.min(1, (t - s.t[0]) / (s.t[1] - s.t[0]))) ** 3)) : s.fov);

// the scene.js shot entries: held, world-space eye and aim
export const shotData = () => SHOTS.map((s) => {
  const e = { n: s.n, t: s.t, law: s.law, eye: [s.eye], lookAt: [s.look], minFrac: 0.01, moving: true };
  if (Array.isArray(s.fov)) Object.assign(e, { fov: s.fov, eye: [s.eye, s.eye], lookAt: [s.look, s.look], ease: "out", step: 24 });
  else Object.assign(e, { fov: s.fov, hold: true });
  return e;
});

export function bandOf(aspect) {
  const bar = Math.max(0, (1 - aspect / BAND_AR) / 2);
  return { bar, h: 1 - 2 * bar };
}

const cam = new PerspectiveCamera(34, 1.6, 0.1, 100), fwd = new Vector3(), tmp = new Vector3();
// world point for the band point (u 0..1 across, v 0..1 DOWN the band) at `depth` metres along the camera axis
export function pin(s, t, aspect, u, v, depth, out = new Vector3()) {
  const { bar, h } = bandOf(aspect);
  cam.fov = fovOf(s, t); cam.aspect = aspect;
  cam.position.fromArray(s.eye); cam.up.set(0, 1, 0); cam.lookAt(s.look[0], s.look[1], s.look[2]);
  cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
  tmp.set(2 * u - 1, 1 - 2 * (bar + v * h), 0.5).unproject(cam).sub(cam.position).normalize();
  cam.getWorldDirection(fwd);
  return out.copy(cam.position).addScaledVector(tmp, depth / tmp.dot(fwd));
}

// distance along the axis at which an object `m` metres tall fills `frac` of the band height
export function depthFor(s, t, aspect, m, frac) {
  const { h } = bandOf(aspect);
  return m / (2 * Math.tan((fovOf(s, t) * Math.PI) / 360) * frac * h);
}
