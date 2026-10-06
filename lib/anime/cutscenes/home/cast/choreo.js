// CAST choreography helpers for home: pure functions of time, so a scrubbed frame equals a played one.
// Beat anchors: every timing reads the beat's real start when scene.js defines it (cue.since), else the bible's fallback
// (frames at 24 fps from scripts/home.md). The direction agent can move a beat and the cast follows.
export const F = (f) => f / 24;
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const sm = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const lerp = (a, b, u) => a + (b - a) * u;
// the shortest-arc angle lerp
export const lerpAng = (a, b, u) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * u; };

// start time (s) of beat `name`: the real one when scene.js declares it, else the bible's fallback
export function tOf(cue, name, fallback) {
  const s = cue.since(name);
  return Number.isFinite(s) ? cue.t - s : fallback;
}

// L2 (nothing covers the seal): push a point out of the corridor between the lens and the seal, in the ground plane.
// Math: s = ((p - e) . (c - e)) / |c - e|^2 is the position along the lens->seal segment; d = signed perpendicular distance.
// For 0 < s < 1 and |d| < w the point is moved to |d| = w on the side it already sits (continuous at the corridor edge).
export function clearRay(p, eye, seal, w) {
  if (!eye) return p;
  const ex = seal[0] - eye[0], ez = seal[2] - eye[2], L2 = ex * ex + ez * ez;
  if (L2 < 1e-6) return p;
  const px = p[0] - eye[0], pz = p[2] - eye[2];
  const s = (px * ex + pz * ez) / L2;
  if (s <= 0 || s >= 1.05) return p;
  const L = Math.sqrt(L2), nx = -ez / L, nz = ex / L; // unit normal to the lens->seal line
  const d = px * nx + pz * nz;
  if (Math.abs(d) >= w) return p;
  const sg = d >= 0 ? 1 : -1, push = sg * w - d;
  return [p[0] + nx * push, p[1], p[2] + nz * push];
}

// ---- THE ORCA (bible 3.11): fin cuts f120, circles f139-f255, spy-hop f257-f270, sink f278-f302, bloop f288.
// Frame: relative to the hero seal. Returns { pos:[x,y,z], yaw, pitch, roll, vis, eye } at absolute time t.
const CX = 0.5, CZ = -0.3, RX = 3.3, RZ = 2.7, WATER = -0.55;
const TH_END = -1.3, SWEEP = Math.PI * 2 * 0.95, TH0 = TH_END - SWEEP; // ccw circle ending on the far side from the lens
export function orcaAt(t, T) {
  const { fin, circle, spy, sink } = T;
  const circEnd = circle + 4.8;
  let x, z, yaw, y = WATER + 0.12, pitch = 0, roll = 0, vis = t >= fin && t < sink + 1.1;
  const ell = (th) => [CX + RX * Math.cos(th), CZ + RZ * Math.sin(th)];
  const head = (th) => Math.atan2(-RX * Math.sin(th), RZ * Math.cos(th)); // tangent of the ccw ellipse: (dx, dz) = (-RX sin, RZ cos)
  if (t < circle) { // approach from the far water to the circle's start
    const u = sm(fin, circle, t), a = [5.5, -5.5], b = ell(TH0);
    x = lerp(a[0], b[0], u); z = lerp(a[1], b[1], u);
    yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); y = WATER + 0.02 + 0.1 * u; // the fin cuts: back just awash
  } else if (t < circEnd + 0.1) {
    const u = (t - circle) / 4.8, th = TH0 + SWEEP * Math.min(1, u);
    [x, z] = ell(th); yaw = head(th); roll = 0.12 * Math.sin(th * 2); pitch = 0.05 * Math.sin(th * 3);
  } else { // spy-hop beside the pup, eye to eye with the camera-side pup: rises, tilts up (pitch to -1.02 rad, head up), holds, then sinks
    const c = ell(TH_END), tgt = [0.9, -1.9];
    const u = sm(circEnd, spy, t);
    x = lerp(c[0], tgt[0], u); z = lerp(c[1], tgt[1], u);
    const toward = Math.atan2(0 - x, 0 - z) + 0.35; // face the pup, three-quarter to the lens
    yaw = lerpAng(head(TH_END), toward, u);
    const up = sm(spy, spy + 0.2, t) * (1 - sm(spy + 0.45, sink, t)); // tilt-up f257 .. hold .. settle
    pitch = -1.02 * up; y = WATER + 0.1 + 1.5 * up;
    // sink: nose-down, tail lifts, falls below the surface
    const s = sm(sink, sink + 1.0, t);
    pitch = lerp(pitch, 0.6, s); y = lerp(y, WATER - 2.4, s) + 0.5 * Math.sin(Math.PI * s) * 0.4;
    roll = 0.2 * s;
  }
  return { pos: [x, y, z], yaw, pitch, roll, vis, up: t > spy - 0.05 && t < sink };
}
