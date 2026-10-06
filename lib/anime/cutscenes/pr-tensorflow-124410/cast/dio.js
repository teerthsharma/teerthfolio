// pr-tensorflow-124410 CAST: the hero seal AS DIO (bible 3 "Hero seal as DIO", 4). The locked pup (pup.js) is never restyled: everything here is
// COSTUME that rides ctx.seal.body through ctx.seal.attach, exactly as the Madara cast does.
//   jacket   yellow #e0a020 (lit #ffd24a) / shadow #8a5a10 / deep #3a2008 hem, open front over the black shirt #0a0a12 (highlight #3a3a5a)
//   studs    gold #ffe27a on both shoulders; gold bracers #d0a020; gold heart buckle #d0a020 with a bead belt of 14 beads
//   cape     red #8a1a2a / lit #d02a3a / shadow #3a0a14, pinned with gold at the shoulders (its own mesh: it flares and whips)
//   hair     7 spiked blond clumps #f0c020 with the #fff08a highlight cut, shadow #b88010, and two brow locks
//   eyes     anime-eye-decal, tsurime, blood-dark iris, a lash line: smug (smirk) -> rage (WRYYY) -> calm (the stop) -> smug
//   flex     from the flex beat a cream flipper is raised slantwise across the brow (the Araki cover gesture); it NEVER covers the eyes
// Poses (arms spread, point, MUDA stance, JoJo twist) are the pose track's job (scene.seal.track / `pose` beats): this file never poses the pup.
// What it adds to the poses: the cape flares with the arms-spread beat, whips on the barrage, and narrows when the camera is behind (law "home")
// so nothing hangs between the lens and the seal. Luma law: nothing is emissive; the shared lit-luma cap 0.92 clamps every fill (out of bloom).
import { events, ramp, back, clamp01 } from "./timing.js";
import { propKit, pivot } from "./props.js";
import { PUP_HEAD2 } from "../../../pup.js";

const HEAD = { c: PUP_HEAD2.pos, r: [0.27, 0.245, 0.255] };
const HEAD_RING = { pos: PUP_HEAD2.pos, fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 };

export default function buildDio(ctx) {
  const { THREE, engine, seal, kit, sdf } = ctx;
  const { Group, SphereGeometry, TorusGeometry } = THREE;
  const { paint, polygonize, ell, cone } = sdf;
  const P = propKit(ctx);
  const cos = new Group(); cos.name = "dio-costume";

  // ---- the jacket, the shirt, the beads, the heart and the bracers: ONE painted SDF shell (voxel 0.014 m)
  const GOLD = paint("#e8b82c", "#7a5a10", { line: 1.1 }), STUD = paint("#ffe27a", "#b8902a", { line: 1 });
  const prims = [
    // black shirt under the open jacket: a closed wrap with no collar (a V of shirt shows between the jacket panels)
    ...kit.COSTUME_LAYERS.uniform({ col: "#262640", shade: "#0a0a12", collar: false }),
    // the yellow jacket: open front, sleeves over the flippers, hem trim in the deep brown, a high collar in the lit yellow
    ...kit.COSTUME_LAYERS.coat({ col: "#f2b830", shade: "#8a5a10", open: 0.075, collar: "#ffd24a", trim: "#3a2008" }),
  ];
  // bead belt: 14 gold beads on the ellipse (0.39 cos a, 0.345 sin a) at y 0.17, radius 0.03
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; prims.push(ell([0.39 * Math.sin(a), 0.17, 0.345 * Math.cos(a)], [0.03, 0.03, 0.03], GOLD, 0.008)); }
  // the heart buckle: two lobes and a point, on the belt front
  prims.push(ell([-0.032, 0.2, 0.366], [0.042, 0.04, 0.026], GOLD, 0.008), ell([0.032, 0.2, 0.366], [0.042, 0.04, 0.026], GOLD, 0.008), cone([0, 0.195, 0.366], [0, 0.135, 0.366], 0.07, 0.008, GOLD, 0.006));
  for (const s of [1, -1]) {
    for (let j = 0; j < 3; j++) prims.push(ell([s * (0.255 + j * 0.034), 0.5 - j * 0.022, 0.0 + j * 0.02], [0.03, 0.03, 0.03], STUD, 0.006)); // shoulder studs
    prims.push(cone([s * 0.272, 0.255, 0.183], [s * 0.285, 0.2, 0.2], 0.1, 0.108, GOLD, 0.01));                                            // gold bracer
  }
  const shell = engine.figure(polygonize(prims, 0.014), { head: PUP_HEAD2, ink: "#2a1a05", lineMul: 1.2, constant: true });
  cos.add(shell);

  // ---- the cape: its own mesh pivoted at the shoulders so it can flare (x), whip (rx) and narrow (law "home")
  const capeGeo = polygonize(kit.COSTUME_LAYERS.cape({ col: "#b02232", shade: "#3a0a14", trim: "#d0a020" }), 0.014);
  const capeFig = engine.figure(capeGeo, { head: PUP_HEAD2, ink: "#1a0508", lineMul: 1.2, constant: true });
  const cape = pivot(THREE, capeFig, [0, 0.5, -0.08]);
  cos.add(cape);

  // ---- hair: 7 spiked blond clumps with the stepped highlight cut (hair-clump-kit) and two brow locks
  const hair = kit.hairMesh(engine, kit.defineHair("spiky", {
    band: [0.05, 1.0], sector: [-Math.PI, Math.PI], count: 7, layers: 1, length: [0.17, 0.3], width: 0.088, lift: 0.85, sweep: [0, 0.1, -0.5], spike: 0.85, curl: 0.03, seed: 124,
    color: { base: "#f0c020", shade: "#b88010", hi: "#fff08a" }, cut: { at: [0.35, 0.75], slant: 0.15, rate: 1 },
    fringe: { n: 2, length: 0.2, at: [0.06, 0.8, 0.2], sweep: [0.25, -0.8, 0.45] },
  }), HEAD_RING, { ink: "#2a1a05" });
  cos.add(hair);

  // ---- the eyes: the anime decal over the painted ones (a flag on the locked face, no restyle), restored on dispose
  const U = seal.fig.userData.mat.uniforms;
  const face0 = U.uFace.value.x;
  const eyes = kit.eyePair(HEAD, { style: "tsurime", iris: "#c0283a", irisLo: "#5a0a1a", lash: "#05020a" });
  seal.attach(eyes);
  U.uFace.value.x = 1; engine.syncFaces(seal.group);

  // ---- the flex flipper (cream fur #f4e7cc over the brow, a gold bracer at its root); hidden until the flex beat
  const flip = new Group();
  flip.add(P.fig(new SphereGeometry(0.1, 16, 12).scale(0.7, 2.0, 0.5), "#f4e7cc", "#cdbfb4", { line: 1, pos: [0, 0.1, 0] }));
  flip.add(P.fig(new TorusGeometry(0.058, 0.014, 8, 18), "#d0a020", "#7a5a10", { line: 0.8, pos: [0, -0.04, 0], rot: [Math.PI / 2, 0, 0] }));
  const flipP = pivot(THREE, flip, [0.2, 0.69, 0.3]); flip.position.set(0, 0, 0); flipP.position.set(0.2, 0.69, 0.3); flipP.rotation.z = -1.25; flipP.visible = false;
  cos.add(flipP);
  seal.attach(cos);

  return {
    group: cos,
    update(t, dt, cue) {
      const E = events(cue), ts = cue.ts ?? t, home = cue.law === "home";
      // cape: the arms-spread flare (2.4 s to the barrage), the whip on the barrage, narrowed behind the seal
      const spread = ramp(ts, E.approach - 0.6, 0.5) * (1 - ramp(ts, E.muda, 0.15));
      const whip = ts >= E.muda && ts < E.muda + E.mudaDur ? 1 : 0;
      const sx = (1 + 0.32 * spread + 0.1 * whip) * (home ? 0.5 : 1), sy = (1 + 0.1 * spread) * (home ? 0.55 : 1);
      cape.scale.set(sx, sy, 1);
      cape.rotation.set(0.1 + 0.07 * Math.sin(ts * 2.3) + 0.3 * whip + 0.1 * spread, 0.05 * Math.sin(ts * 1.7), 0.04 * Math.sin(ts * 1.9 + 1));
      hair.rotation.set(0.03 * Math.sin(ts * 2.1), 0, 0.04 * Math.sin(ts * 1.6 + 0.5));
      // eyes: smirk, the open WRYYY at the barrage, calm in the stopped second, smirk again
      const ex = ts >= E.flex ? ["smug", 1] : ts >= E.resume ? ["smug", 0.8] : ts >= E.timestop ? ["calm", 0.55] : ts >= E.muda ? ["rage", 0.95] : ts >= E.approach ? ["smug", 0.9] : ["smug", 0.6];
      eyes.userData.set(ex[0], ex[1]);
      // the flex flipper: grows with a little overshoot at the flex beat, gone with the dam cast at the credit
      const k = back(clamp01((ts - E.flex) / 0.3));
      flipP.visible = ts >= E.flex && ts < E.credit;
      flipP.scale.setScalar(Math.max(0.001, k));
    },
    dispose() { U.uFace.value.x = face0; cos.parent?.remove(cos); eyes.parent?.remove(eyes); eyes.userData.dispose?.(); },
  };
}
