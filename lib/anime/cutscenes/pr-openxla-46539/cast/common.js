// CAST helpers for pr-openxla-46539 (cast folder only; a candidate for promotion to a shared crowd/stage helper).
// Staging frame: every cast member is placed in the seal's own frame (f forward, r right, y up), anchored on scene.seal.at/yaw/scale
// so that moving the seal in scene.js moves the whole stage with it. Cues come from scene.js beats; each has a bible-time default
// so the cast still plays if the direction layer omits a beat.
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;

// the stage frame. F(f, r, y) -> world [x, y, z]; f and r are metres in seal units (x S), y is metres (x S) above the seal's ground
export function makeFrame(ctx) {
  const s = ctx.scene.seal ?? {}, a = s.at ?? [0, 0, 0], yaw = s.yaw ?? 0, S = s.scale ?? 1;
  const sn = Math.sin(yaw), cs = Math.cos(yaw);
  return {
    a, yaw, S, fwd: [sn, cs], right: [cs, -sn],
    F: (f, r = 0, y = 0) => [a[0] + (sn * f + cs * r) * S, a[1] + y * S, a[2] + (cs * f - sn * r) * S],
  };
}
// the start time of a named beat, or its bible default when the scene carries no such beat
export const startOf = (cue, name, def) => { const s = cue.since(name); return Number.isFinite(s) ? cue.t - s : def; };

// one painted, inked rigid prop (the same call the kit uses for hats and weapons)
export function fig(ctx, geo, col, shade, o = {}) {
  const { paint, painted } = ctx.sdf;
  const f = ctx.engine.figure(painted(geo, paint(col, shade ?? col, { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.9, ink: o.ink ?? "#12070a", constant: true });
  if (o.pos) f.position.set(...o.pos);
  if (o.rot) f.rotation.set(...o.rot);
  if (o.scale) f.scale.set(...o.scale);
  return f;
}
