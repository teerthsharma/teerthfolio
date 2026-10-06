// CAST helpers for p-separatrix (own folder only). Pure functions of the clock: a scrubbed frame equals a played one.
import { Group } from "three";

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const lerp = (a, b, k) => a + (b - a) * k;
// smoothstep(a, b, x) = 3u^2 - 2u^3 with u = clamp((x - a) / (b - a))
export const sm = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
// 1 inside [a, b], smooth ramps ra (in) and rb (out)
export const win = (t, a, b, ra = 0.15, rb = 0.15) => sm(a, a + ra, t) * (1 - sm(b - rb, b, t));
// pop with overshoot: 0 -> peak -> 1 over [a, b]:  s(u) = 1 + (peak - 1) * sin(pi * min(1, u / 0.6))^... kept simple:
// rises to `peak` at 70 percent of the window, settles to 1 by the end (the bible's 1.16 costume overshoot)
export function pop(t, a, b, peak = 1.16) {
  const u = clamp01((t - a) / (b - a));
  if (u <= 0) return 0;
  return u < 0.7 ? sm(0, 0.7, u) * peak : peak - (peak - 1) * sm(0.7, 1, u);
}
// the clock of a named beat: when the direction layer started it, else the bible's own absolute time
export function T(cue, name, abs) {
  const s = cue?.since?.(name);
  return Number.isFinite(s) ? cue.t - s : abs;
}

// the home frame: the scene's seal (x right, y up, z forward, yaw turns it). w(lx,ly,lz) -> world [x,y,z] in metres x scale.
export function mkFrame(sealSpec) {
  const at = sealSpec?.at ?? [0, 0, 0], yaw = sealSpec?.yaw ?? 0, s = sealSpec?.scale ?? 1;
  const c = Math.cos(yaw), si = Math.sin(yaw);
  return { at, yaw, s, w: (x, y, z) => [at[0] + (x * c + z * si) * s, at[1] + y * s, at[2] + (-x * si + z * c) * s] };
}

// L1 guard: is the body (feet at pos, height h, radius r) on the lens-to-seal ray?  Samples 4 heights; the seal chest is the target.
// distance from sample p to segment eye->tgt, only when p lies between them: d = |p - (eye + t (tgt - eye))|, t = (p-eye).(tgt-eye)/|tgt-eye|^2
export function occludes(eye, tgt, pos, h, r) {
  const d = [tgt[0] - eye[0], tgt[1] - eye[1], tgt[2] - eye[2]], l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1;
  for (const f of [0.15, 0.4, 0.7, 0.95]) {
    const p = [pos[0] - eye[0], pos[1] + h * f - eye[1], pos[2] - eye[2]];
    const t = (p[0] * d[0] + p[1] * d[1] + p[2] * d[2]) / l2;
    if (t <= 0.02 || t >= 0.97) continue;
    const q = [p[0] - d[0] * t, p[1] - d[1] * t, p[2] - d[2] * t];
    if (Math.hypot(q[0], q[1], q[2]) < r) return true;
  }
  return false;
}

// a rigid cel prop through the shared figure program: painted colours + ink hull
export function figProp(ctx, geo, col, shade, o = {}) {
  const { painted, paint } = ctx.sdf;
  const f = ctx.engine.figure(painted(geo, paint(col, shade ?? col, { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.9, ink: o.ink, constant: true });
  if (o.pos) f.position.set(...o.pos);
  if (o.rot) f.rotation.set(...o.rot);
  if (o.scl) f.scale.set(...o.scl);
  return f;
}
// an SDF part (prims already painted) polygonised once into a cel figure
export function sdfPart(ctx, prims, h, o = {}) {
  const geo = ctx.sdf.polygonize(prims, h);
  const f = ctx.engine.figure(geo, { ink: o.ink, lineMul: o.lineMul ?? 1.1, constant: true });
  f.userData.geo = geo;
  return f;
}
// a group whose child turns about a pivot given in the child's frame
export function pivoted(obj, pivot) {
  const g = new Group();
  g.position.set(...pivot);
  obj.position.set(-pivot[0], -pivot[1], -pivot[2]);
  g.add(obj);
  return g;
}
export const layer1 = (o) => { o.traverse((c) => c.layers.set(1)); return o; };
// world position of a point in an object's local frame
export function wp(obj, p, out) { obj.updateMatrixWorld(); return obj.localToWorld(out.set(p[0], p[1], p[2])); }
