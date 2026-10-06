// AURA THE GUILLOTINE (bible 3.8, 4.1): a small seal x1.15 in the Guillotine costume, on the dais, facing the hero.
// Costume (all separate cel parts): wig (bob 6 clumps + two braids forward over the chest, 3 tassels each; lit #a77ac8, shade #453d6b,
// sheen #d8bdf0), cream curled horns, white-inlaid bodice #2a1b4e with a diamond jewel, burgundy cape #8a2e5a + gold clasp,
// white skirt with gold hem, gold choker + V pendant, dark gloves. Eyes: gold #e8b81a tsurime decal.
// Timeline (all pure functions of the stepped clock t):
//   pop 1.75 (1.18 overshoot) | smug to 5.0 | calm (shot 3) to 6.4 | brows lower 6.4..7.7 | release 7.7: stagger back 0.4 m, tip 0.1 rad
//   (release+0.1 .. +0.45), braid tassels whip, shock then stunned (flat brows) to 9.6 | still (calm) after; speaks from 11.0
import { smooth, lerp, pop, makeFig } from "./util.js";
import { AURA_AT, AURA_YAW, AURA_K } from "./layout.js";

export function buildAura(ctx, time) {
  const { THREE, engine, kit } = ctx;
  const fig = makeFig(ctx);
  const sc = AURA_K * (ctx.seal.scale ?? 1);
  const wig = { base: "#a77ac8", shade: "#453d6b", hi: "#d8bdf0" };
  const spec = {
    scale: sc,
    // gold choker + bodice (uniform: closed jacket with white-inlay buttons) + short burgundy cape; skirt and pendant are added below
    layers: [
      { type: "cape", col: "#8a2e5a", shade: "#4b2d5a", trim: "#e9b84a" },
      { type: "uniform", col: "#2a1b4e", shade: "#14102a", collar: "#e9b84a", buttons: "#cdd0f0" },
    ],
    hat: { kind: "horns", col: "#e6d6ae", shade: "#b09a70" },
    hair: kit.defineHair("bob", { count: 6, layers: 1, seed: 7, length: [0.18, 0.26], width: 0.08, color: wig, cut: { at: [0.4, 0.68], slant: 0.1, rate: 0.9 }, fringe: { n: 4, length: 0.12, at: [0, 0.8, 0.22], sweep: [0, -0.5, 0.6], width: 0.08 } }),
    eyes: { style: "tsurime", iris: "#e8b81a", irisLo: "#a87a10" },
    shadowTint: "#4b2d5a",
  };
  const h = kit.costumedSeal(engine, spec);
  const g = h.group;

  // two ornate braids forward over the chest, each a pivot so the tassels can whip
  const braids = [];
  for (const s of [1, -1]) {
    const bs = kit.defineHair("twintail", { count: 0, seed: 21 + s, droop: 0.6, spike: 0.5, curl: 0.03,
      tail: { n: 5, length: 0.46, width: 0.065, at: [s * 0.15, 0.5, 0.2] }, color: wig, cut: { at: [0.3, 0.6], slant: 0.08, rate: 1 } });
    const m = kit.hairMesh(engine, bs, { pos: [0, 0.555, 0.03], fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 });
    const pv = new THREE.Group(); pv.position.set(s * 0.15, 0.5, 0.2); m.position.set(-s * 0.15, -0.5, -0.2); pv.add(m);
    braids.push({ pv, s }); h.body.add(pv);
  }
  // white skirt with gold hem, round gold clasp at the right hip, V pendant, diamond jewel, ram-horn ridge rings, dark gloves
  const skirt = fig(new THREE.ConeGeometry(0.4, 0.2, 28, 1, true), "#f2eef8", "#b8b4d0", { pos: [0, 0.1, 0.0], lineMul: 1.1 });
  const hem = fig(new THREE.TorusGeometry(0.4, 0.014, 6, 36).rotateX(Math.PI / 2), "#d9a93a", "#8a6a20", { pos: [0, 0.01, 0], lineMul: 0.6 });
  const clasp = fig(new THREE.CylinderGeometry(0.04, 0.04, 0.014, 14).rotateX(Math.PI / 2), "#e9b84a", "#a67f2a", { pos: [0.3, 0.2, -0.04] });
  const pendant = fig(new THREE.ConeGeometry(0.03, 0.07, 3).rotateX(Math.PI), "#e9b84a", "#a67f2a", { pos: [0, 0.405, 0.285], lineMul: 0.5 });
  const jewel = fig(new THREE.OctahedronGeometry(0.036), "#cdd0f0", "#8a8ec8", { pos: [0, 0.33, 0.315], lineMul: 0.6 });
  h.body.add(skirt, hem, clasp, pendant, jewel);
  for (const s of [1, -1]) {
    h.body.add(fig(new THREE.CylinderGeometry(0.075, 0.09, 0.2, 12), "#1d1e37", "#101020", { pos: [s * 0.3, 0.3, 0.16], rot: [0, 0, s * -0.35], lineMul: 0.8 })); // long glove over the fore flipper
    for (const r of [0.5, 0.8]) h.props.add(fig(new THREE.TorusGeometry(0.036, 0.008, 6, 14).rotateX(Math.PI / 2), "#cbbb90", "#8a7a50", { pos: [s * (0.13 + 0.01 * r), 0.8 + 0.05 * r, 0.1], rot: [0, 0, s * -0.3], lineMul: 0.4 })); // ridge rings
  }
  ctx.setLayer(g, 1);
  g.position.set(...AURA_AT);
  g.rotation.y = AURA_YAW;

  const tmp = new THREE.Vector3();
  const tRel = () => time("release");
  return {
    group: g,
    // world position of the raised hand (the gold ring-chain starts here)
    handWorld(out) { tmp.set(0.3, 0.72, 0.12); g.updateMatrixWorld(true); return out.copy(g.localToWorld(tmp)); },
    headWorld(out) { tmp.set(0, 0.8, 0); g.updateMatrixWorld(true); return out.copy(g.localToWorld(tmp)); },
    update(t, dt) {
      const tp = time("aura_pop");
      const P = pop(t, tp, 0.25, 1.18);
      g.visible = P > 0.001;
      if (!g.visible) return;
      const R = tRel(), brk = time("scale_break");
      // expression track: smirk (smug) -> calm -> grim (rage 0.55) -> shock (terror) -> stunned (neutral) -> calm
      let expr = "smug", ek = 1;
      if (t >= 5.0) { expr = "calm"; ek = 1; }
      if (t >= 6.4) { expr = "rage"; ek = 0.55; }
      if (t >= R) { expr = "terror"; ek = 1; }
      if (t >= R + 0.5) { expr = "neutral"; ek = 1; }
      if (t >= 9.6) { expr = "calm"; ek = 0.8; }
      // reaction: back-lean (2 frames at 24) -> recoil (4 frames) -> held to frame 230 (9.6 s)
      const since = t - R;
      const hit = since < 0 ? 0 : smooth(since / 0.25) * (t < 9.6 ? 1 : 1 - smooth((t - 9.6) / 0.8) * 0.7);
      h.react("terror", 0); // clear poses; the body is posed below
      h.expression(expr, ek);
      h.update(t, dt);
      // base placement + stagger back 0.4 m along the facing axis (away from the hero) and a 0.1 rad tip
      const back = smooth((since - 0.1) / 0.35) * 0.4 * (t < 9.6 ? 1 : 1 - smooth((t - 9.6) / 1.2) * 0.8);
      g.position.set(AURA_AT[0] + back, AURA_AT[1], AURA_AT[2]);
      g.scale.setScalar(sc * P);
      // smug: torso tilts toward the pup 0.1 rad; frozen mid-step (8.5..9.6): hold dead still; recoil tip -0.1 on the release
      const tilt = t < R ? 0.1 * smooth((t - tp) / 0.4) : lerp(0.1, -0.1, smooth(since / 0.45));
      h.body.rotation.x += t < brk ? tilt : t < 9.6 ? -0.1 : 0;
      h.body.position.y += 0.02 * hit;
      // braids: tassels whip after the release (frame-stepped sine, decaying), idle sway before
      for (const { pv, s } of braids) {
        const whip = since < 0 ? 0 : Math.exp(-since * 2.2) * Math.sin(since * 26 + s) * 0.55;
        pv.rotation.set(0.05 * Math.sin(t * 3 + s) + whip * 0.5, 0, s * (0.03 + whip * 0.6));
      }
    },
    dispose() { h.dispose(); },
  };
}
