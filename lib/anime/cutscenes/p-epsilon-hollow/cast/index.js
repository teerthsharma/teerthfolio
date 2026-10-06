// CAST layer for p-epsilon-hollow (Naruto, Itachi and Tsukuyomi on the graveyard planet). Layer 1.
// Bible: scripts/p-epsilon-hollow.md sections 3.8-3.10, 4, 7. Law L6b: every victim is a COSTUMED SEAL (the opponents Itachi faced), never a silhouette.
//
// What lives here
//   1. The chorus: S1 Sasuke, S2 Kakashi (legs crossed on a block, ref 06, easter egg 2), S3 Kurenai, S4 Asuma. 0.6 m tall, 3.5-6 m from the pup,
//      facing it, half-petrified from the feet: a stone slab with the cel ink line climbing 0.15 m per 2 s over 3-23 s (capped at 40% of body,
//      0.32 local units); first flinch at 3.0, heads lower at 15.0 (14.6 + 0.4), sag / knees per seal; at 27.0 the slab cracks gold, falls away
//      in 6 frames (0.25 s) with 4 stone chips each, and they STAGGER and stand: they survive.
//   2. The shard the hero wields (shard.js) and the crow (crow.js).
//   3. The hero's eyes: half-lidded and calm 3.0-6.4, narrow for ONE frame at 27.0 (uFace.w, the painted eye radius; nothing else is touched).
//      Poses (sign, raise, point, chase) are the direction layer's seal.track; the hero is never restyled and never covered:
//      nothing here stands between the lens and the seal (victims are ahead of it at 3.5+ m, the shard hangs 0.3 m to its right).
// Cue names read (all optional, with the bible times as fallbacks): move (shard rise 6.4), lineB (9.0), lineC (14.6), credit (23.0),
// crow (20.0), collapse (27.0; the swing starts 0.2 s before it).
// Characters animate on the STEPPED t (threes/twos); nothing here reads Math.random.
import { CHORUS } from "./costumes.js";
import { buildShard } from "./shard.js";
import { buildCrow } from "./crow.js";

export default function build(ctx) {
  const { THREE, engine } = ctx, group = new THREE.Group(), clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ramp = (t, a, b) => clamp((t - a) / (b - a)), sm = ctx.ease.smooth;
  const mk = (geo, col, shade, o = {}) => engine.figure(ctx.sdf.painted(geo, ctx.sdf.paint(col, shade, { line: 1 })), { lineMul: o.lineMul ?? 0.9, ink: o.ink, constant: true });
  // the frame: where the hero starts (victims stay put in the world even if the hero moves)
  const frame = new THREE.Group(), S0 = ctx.scene.seal ?? {};
  frame.position.set(...(S0.at ?? [0, 0, 0])); frame.rotation.y = S0.yaw ?? 0; frame.scale.setScalar(S0.scale ?? 1);
  group.add(frame);

  // ---- the chorus
  const stoneGeo = new THREE.CylinderGeometry(0.34, 0.38, 1, 9).translate(0, 0.5, 0);
  const chipGeo = new THREE.BoxGeometry(0.07, 0.05, 0.06);
  const GOLD = new THREE.Color("#ffb524");
  const seals = CHORUS.map((c, i) => {
    const v = ctx.kit.costumedSeal(engine, c.spec);
    v.place(c.pos[0], c.pos[1], c.pos[2], Math.atan2(-c.pos[0], -c.pos[2])); // faces the pup at the origin
    frame.add(v.group);
    // the half-petrified stone: a slab on the feet, same ink line
    const slab = mk(stoneGeo, "#5a4a63", "#231e2a", { lineMul: 1.5, ink: "#120a1a" });
    slab.visible = false; v.group.add(slab); ctx.setLayer(slab, 1);
    const slabU = slab.userData.mat?.uniforms;
    const chips = [];
    for (let k = 0; k < 4; k++) {
      const ch = mk(chipGeo, "#5a4a63", "#231e2a", { lineMul: 1.2, ink: "#120a1a" });
      ch.visible = false; v.group.add(ch); ctx.setLayer(ch, 1);
      const a = (k / 4) * Math.PI * 2 + i, r = ctx.rng(100 + i * 7 + k);
      chips.push({ m: ch, a, vx: Math.cos(a) * (0.7 + r() * 0.5), vz: Math.sin(a) * (0.7 + r() * 0.5), vy: 0.9 + r() * 0.7, spin: 6 + r() * 8 });
    }
    let block = null;
    if (c.block) { // the throne block (ref 06): Kakashi sits on it legs crossed
      block = mk(new THREE.BoxGeometry(0.9, 0.22, 0.9), "#5a4a63", "#231e2a", { lineMul: 1.4, ink: "#120a1a" });
      block.position.set(c.pos[0], 0.11, c.pos[2]); block.rotation.y = v.group.rotation.y; frame.add(block); ctx.setLayer(block, 1);
    }
    let stub = null;
    const weapon = () => v.props.children[v.props.children.length - 1]; // the costume's weapon is the last prop
    if (c.id === "asuma") { // the unlit cigarette stub #e8dcc0, and trench knives at half length
      stub = mk(new THREE.BoxGeometry(0.014, 0.014, 0.07), "#e8dcc0", "#b9ad90", { lineMul: 0.5 });
      stub.position.set(0.045, 0.455, 0.29); v.body.add(stub); ctx.setLayer(stub, 1);
      weapon()?.scale.setScalar(0.5);
    }
    if (c.id === "sasuke") weapon()?.scale.setScalar(0.8);
    return { c, v, slab, slabU, chips, block, stub, i, y0: c.pos[1] };
  });

  // the per-seal timeline: poses (name -> k), expression (name, k), stone: all pure functions of the clock
  function drive(s, t, T) {
    const { v, c } = s, tc = t - T.collapse, post = tc >= 0;
    const poses = {};
    const flinch = 0.5 * ramp(t, 3.0, 3.25) * (1 - 0.7 * ramp(t, 3.25, 4.2)); // first flinch at the sign hold
    const lower = 0.2 * ramp(t, T.lineC + 0.4, T.lineC + 0.8);                  // heads lower at 14.6 + 0.4
    const lower2 = 0.2 * ramp(t, T.credit, T.credit + 0.5);                      // and again under the credit
    let expr = c.eyesExpr, k = c.eyesK;
    if (!post) {
      if (flinch > 0) poses.recoil = flinch;
      if (c.id === "sasuke") {
        poses.kneel = 0.5 * ramp(t, T.lineB, T.lineB + 0.5);          // one knee drops at 9.0
        poses.bow = lower + 0.35 * ramp(t, T.credit, T.credit + 0.5);  // head lowers at 23.0
        if (t >= T.lineB) { expr = "sad"; k = 0.4 * ramp(t, T.lineB, T.lineB + 0.6) + 0.2; }
      } else if (c.id === "kakashi") {
        poses.kneel = 0.85;                                             // legs crossed on the block, hand on the knee
        poses.bow = 0.25 * ramp(t, T.lineB, T.lineB + 0.6) + lower * 0.5 + lower2 * 0.5; // sags at 9.0
      } else if (c.id === "kurenai") {
        if (t >= 3.0) { expr = "awe"; k = ramp(t, 3.0, 3.25); }         // eyes wide at 3.0
        if (t >= T.lineC) { expr = "sad"; k = 0.8 * ramp(t, T.lineC, T.lineC + 0.5); }
        poses.kneel = 0.9 * sm(ramp(t, T.lineC, T.lineC + 0.7));        // to her knees at 14.6
        poses.bow = lower2;
      } else {
        poses.kneel = 0.5;                                              // crouch
        poses.bow = lower + 0.4 * ramp(t, T.credit, T.credit + 0.5);    // lowers head at 23.0
      }
    } else { // they survive: stagger, then stand (S2 keeps its seat)
      poses.stagger = 0.6 * (1 - ramp(tc, 0, 0.9));
      if (c.id === "kakashi") poses.kneel = 0.85;
      else if (c.id === "asuma") poses.kneel = 0.5 * (1 - ramp(tc, 0.3, 1.0));
      expr = "awe"; k = 0.8 * (1 - ramp(tc, 0.6, 1.8));
    }
    for (const n of Object.keys(v.state.poses)) delete v.state.poses[n];
    for (const [n, kk] of Object.entries(poses)) v.setPose(n, kk);
    v.expression(expr, k);
    // idle breath, on the stepped clock
    v.group.position.y = s.y0 + (c.block ? 0 : 0.004 * Math.sin(t * 2.1 + s.i * 1.7));
    if (s.stub) s.stub.rotation.x = 0.04 * Math.sin(t * 3.1);
    // the stone: rises 0.15 m per 2 s from 3.0 (the bible rate, capped at 40% of the 0.8-unit body); cracks gold and falls away at 27.0
    const CAP = 0.32;
    let lvl = ramp(t, 3.0, 23.0) * CAP, gold = 0;
    if (post) { lvl = tc < 0.1 ? CAP : CAP * (1 - ramp(tc, 0.1, 0.25)); gold = tc < 0.1 ? tc / 0.1 : 1 - ramp(tc, 0.1, 0.25); }
    s.slab.visible = lvl > 0.003 && !c.block; // Kakashi sits on the block, not in stone
    s.slab.scale.set(1, Math.max(lvl, 0.001), 1);
    s.slab.position.y = post ? -0.05 * ramp(tc, 0.1, 0.25) : 0;
    if (s.slabU?.uTint) { s.slabU.uTint.value.copy(GOLD); s.slabU.uTintAmt.value = 0.85 * gold; }
    // the 6-frame fall: 4 chips each, ballistic p = p0 + v tau + 0.5 g tau^2 (g = 3.2 local units/s^2)
    for (const ch of s.chips) {
      const tau = tc - 0.1, on = !c.block && tau >= 0 && tau < 0.25;
      ch.m.visible = on;
      if (on) {
        ch.m.position.set(Math.cos(ch.a) * 0.35 + ch.vx * tau, 0.16 + ch.vy * tau - 1.6 * tau * tau, Math.sin(ch.a) * 0.35 + ch.vz * tau);
        ch.m.rotation.set(ch.spin * tau, ch.spin * tau * 0.7, 0); ch.m.scale.setScalar(1 - tau * 2.2);
      }
    }
    v.update(t);
  }

  // ---- the hero's eyes (the locked painted eye radius is scaled for beats and restored; the design is untouched)
  let eyeU = null, eye0 = 0;
  const heroEyes = (t, T) => {
    if (!eyeU) { eyeU = ctx.seal.fig?.userData?.mat?.uniforms?.uFace ?? null; if (!eyeU) return; eye0 = eyeU.value.w; }
    const lid = ramp(t, 3.0, 3.4) * (1 - ramp(t, T.rise, T.rise + 0.3));   // half-lidded and calm 3.0-6.4
    const narrow = t >= T.collapse && t < T.collapse + 1 / 12 ? 1 : 0;       // ONE stepped frame at 27.0
    eyeU.value.w = eye0 * (1 - 0.2 * lid - 0.45 * narrow);
  };

  // ---- the shard (copies the hero's world transform; lives directly under the layer group) and the crow
  const shard = buildShard(ctx, mk); group.add(shard.root);
  const crow = buildCrow(ctx, mk); frame.add(crow.group);

  const start = (cue, name, d) => { const s = cue.since?.(name); return Number.isFinite(s) ? cue.t - s : d; };
  return {
    group,
    update(t, dt, cue) {
      const T = { rise: start(cue, "move", 6.4), lineB: start(cue, "lineB", 9.0), lineC: start(cue, "lineC", 14.6), credit: start(cue, "credit", 23.0), crow: start(cue, "crow", 20.0), collapse: start(cue, "collapse", 27.0) };
      for (const s of seals) drive(s, t, T);
      heroEyes(t, T);
      shard.update(t, { rise: T.rise, swing: T.collapse - 0.2 });
      crow.update(t, T.crow);
    },
    dispose() {
      for (const s of seals) s.v.dispose();
      group.traverse((o) => { o.geometry?.dispose?.(); if (o.material && !o.userData?.shared) o.material.dispose?.(); });
      if (eyeU) eyeU.value.w = eye0;
    },
  };
}
