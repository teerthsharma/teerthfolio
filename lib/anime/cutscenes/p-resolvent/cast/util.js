// small pure helpers for the p-resolvent cast (no state; every call is a pure function of the clock)
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const lerp = (a, b, k) => a + (b - a) * k;
// pop-in with overshoot: 0 before t0, rises to `over` at 0.6 of dur, settles to 1 (bible: the scale 1.18x overshoot)
export const pop = (t, t0, dur = 0.25, over = 1.18) => {
  if (t < t0) return 0;
  const u = clamp((t - t0) / dur);
  return u < 0.6 ? lerp(0, over, smooth(u / 0.6)) : lerp(over, 1, smooth((u - 0.6) / 0.4));
};
// the beat's start time from scene.js beats (by name), else the bible default
export const timeOf = (ctx, T) => {
  const by = {};
  for (const b of ctx.scene?.beats ?? []) if (by[b.name] === undefined) by[b.name] = b.t;
  return (name) => by[name] ?? T[name];
};
// a lit, inked, flat-cel figure from a three geometry (same recipe the kit uses for props)
export const makeFig = (ctx) => (geo, col, shade, o = {}) => {
  const { paint, painted } = ctx.sdf;
  const dk = (h, k) => `#${new ctx.THREE.Color(h).multiplyScalar(k).getHexString()}`;
  const f = ctx.engine.figure(painted(geo, paint(col, shade ?? dk(col, 0.55), { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.9, ink: o.ink, constant: true });
  if (o.pos) f.position.set(...o.pos);
  if (o.rot) f.rotation.set(...o.rot);
  return f;
};
// every tintable uniform set under an object (kit convention: uTint / uTintAmt)
export const tintables = (root) => { const a = []; root.traverse((o) => { const u = o.userData?.mat?.uniforms; if (u?.uTint) a.push(u); }); return a; };
