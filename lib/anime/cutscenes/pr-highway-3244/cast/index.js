// CAST layer for pr-highway-3244 (Fate/Zero, Iskandar). Layer 1, redrawn every step.
//  * the hero seal (locked pup, never restyled): per-beat poses and eye changes from the bible's section 4 key list (hero.js).
//  * the 12 rivals as SMALL COSTUMED SEALS (L6b): idle rock, 6-frame recoil anticipation, fishtail after the launch, then the
//    fling (a whole-turn tumble over 24 frames, bounce 3.2|sin(4.2 fl)|e^{-1.1 fl}, 4 m forward, 9 m sideways), landing reaction.
// Every motion is a pure function of the stepped clock `t`, so a scrubbed frame equals a played one.
// Cue names read (all optional; bible frame times are the fallbacks): lineA move launch kachow lineB credit collapse.
//   ctx.castRivals (published for the fx layer's hit bursts): [{ id, hit, pos(t) -> [x,y,z] }]. The hit time is a prescribed beat
//   and each rival is PLACED where the seal's path reaches it at that time, so the wheel and the rival always meet.
// Not built here: Iskandar, the chariot and the bulls (large approved figures; their geometry belongs to the world/fx layers).
import { RIVALS, makeProps } from "./rivals.js";
import { heroUpdate } from "./hero.js";

const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export default function build(ctx) {
  const { THREE: T, engine, kit, scene } = ctx;
  const group = new T.Group();
  group.name = "cast-highway";

  // ---- the seal's path (analytic, from scene.seal), so the rivals meet it
  const S = scene.seal ?? {}, s0 = S.at ?? [0, 0, 0], K = (S.scale ?? 0.58) / 0.58; // K: bible metres -> world (1 when the hero is 0.58)
  const moves = [...(S.moves ?? [])].sort((a, b) => a.t[0] - b.t[0]);
  const pathAt = (t) => {
    let p = [...s0];
    for (const m of moves) {
      if (t >= m.t[1]) p = [...m.to];
      else { if (t > m.t[0]) { const u = sm((t - m.t[0]) / Math.max(1e-6, m.t[1] - m.t[0])); p = p.map((v, i) => v + (m.to[i] - v) * u); } break; }
    }
    return p;
  };
  const end = pathAt(1e9);
  let fx = end[0] - s0[0], fz = end[2] - s0[2];
  const len = Math.hypot(fx, fz), moving = len > 1;
  if (moving) { fx /= len; fz /= len; } else { fx = Math.sin(S.yaw ?? 0); fz = Math.cos(S.yaw ?? 0); }
  const rx = -fz, rz = fx; // the travel direction's right on the ground plane
  // stationary seal (stub scene): a virtual wheel runs 22 m/s from the launch so the rivals still stand ahead and get hit
  const prog = (t) => (moving ? (pathAt(t)[0] - s0[0]) * fx + (pathAt(t)[2] - s0[2]) * fz : Math.max(0, t - 8.25) * 22 * K);
  const yawFacing = Math.atan2(-fx, -fz); // rivals face the oncoming wheel

  // ---- build the rivals
  const propLib = makeProps(ctx);
  const SC = 0.8 * K; // about 0.8 of the unseated pup
  const rivals = RIVALS.map((r, i) => {
    const spec = { ...r.spec, scale: SC };
    if (Array.isArray(spec.hair)) spec.hair = kit.defineHair(spec.hair[0], spec.hair[1]);
    const h = kit.costumedSeal(engine, spec);
    h.group.rotation.order = "YXZ";
    const extras = r.extras.map((n) => propLib[n]());
    for (const e of extras) { h.group.add(e.obj); ctx.setLayer(e.obj, 1); }
    group.add(h.group);
    const ahead = Math.max(2.5 * K, prog(r.hit) + 1.2 * K);
    return { r, h, extras, i, base: [s0[0] + fx * ahead + rx * r.lat * K, s0[2] + fz * ahead + rz * r.lat * K] };
  });

  // pure placement of a rival at time t (also published for fx)
  const place = (R, t) => {
    const { r, base } = R, fl = t - r.hit;
    let x = base[0], z = base[1], y = 0, rotX = 0, rotZ = 0;
    if (fl >= 0) {
      const dist = r.stumble ? 0.25 : 1; // Tokiomi stumbles on the spot, the rest are flung
      const fwd = 4 * K * (1 - Math.exp(-2.5 * fl)) * dist, lat = r.side * 9 * K * (1 - Math.exp(-2.2 * fl)) * dist;
      x += fx * fwd + rx * lat; z += fz * fwd + rz * lat;
      y = 3.2 * K * 0.3 * Math.abs(Math.sin(4.2 * fl)) * Math.exp(-1.1 * fl) * (r.stumble ? 0.1 : 1);
      const sp = r.spin * 2 * Math.PI * sm(fl / 1.0); // whole turns over 24 frames
      if (r.id === "kirei") rotZ = sp; else rotX = sp; // Kirei is spun sideways
    }
    return { x, y, z, rotX, rotZ, fl };
  };
  ctx.castRivals = rivals.map((R) => ({ id: R.r.id, hit: R.r.hit, pos: (t) => { const p = place(R, t); return [p.x, p.y, p.z]; } }));

  const hero = heroUpdate(ctx);

  function update(t, dt, cue) {
    hero(t, cue);
    const show = t >= 1.2; // the rivals join at the wide switch (f29)
    const launch = cue.beat?.("launch")?.t ?? 8.25;
    for (const R of rivals) {
      const { r, h } = R, p = place(R, t), fl = p.fl;
      h.group.visible = show && fl < 3.5; // all gone from frame well before f367
      if (!h.group.visible) continue;
      // idle rock (5 rad/s from f29); fishtail after the launch
      const rock = fl < 0 ? Math.sin(5 * (t - 1.2) + R.i * 0.9) * 0.045 * sm((t - 1.2) / 0.4) : 0;
      const fish = t > launch && fl < 0 ? Math.sin(9 * (t - launch) + R.i) * 0.35 * sm((t - launch) / 0.3) : 0;
      h.group.position.set(p.x, p.y, p.z);
      h.group.rotation.set(p.rotX, yawFacing + fish, p.rotZ + rock);
      // pose and reaction by phase (react() clears the pose channels first, so idle goes after it)
      if (fl < -0.25) { h.react("stand", 0); h.setPose(r.idle[0], r.idle[1]); h.expression(r.expr, 1); }
      else if (fl < 0) h.react("recoil", sm((fl + 0.25) / 0.25)); // 6 frames of anticipation
      else if (fl < 1.1) h.react(r.stumble ? "stagger" : "blown", sm(fl / 0.25));
      else h.react(r.kind, sm((fl - 1.1) / 0.4));
      h.update(t, dt);
      for (const e of R.extras) e.update?.(t, fl);
    }
  }
  return { group, update, dispose() { for (const R of rivals) R.h.dispose?.(); } };
}
