// pr-tensorflow-124410 CAST: THE WORLD, the seal's Stand (bible 3 "The World", 4). Candidate shared module `stand-body` (stylised muscular hulk).
// Proportions (cel 04-stop-time.jpg): 3.4 m tall (scaled to 1.9 x the seal's height), shoulders 1.6 m, broad cream-yellow plated chest, grey-green limbs,
// a dark hooded head with a gold cross band, a tiny mouth. Built as 3.4-unit SDF shells (cream plate blocks, brown seam lines, gold armbands):
//   plates lit #f6e8b0 / mid #e8d49a / shadow #b8742a     limbs #7a8a7a / #4a5a5a     hood #4a4a50     band, belt, armbands #d0a020     seams #6a3a20
// Rig: torso shell + two arms (shoulder pivot -> upper arm; elbow pivot -> forearm, a fist). The forearm stretches on a punch (the long Stand reach).
//   shoulder rx: -pi/2 points the arm forward; rz swings it outward; elbow rx bends the fist toward the chest.
// Motion (all on the stepped clock ts): rises out of the crest at `stand` (grows with an 18 percent overshoot), sways on twos, throws MUDA on the
// barrage (one arm per 2 frames; each punch re-aims its fan by a hash of the step index; the body lunges and twists), spreads its arms in the
// stopped second (it MOVES while the world is frozen), raises a fist at the flex, dissolves at the credit.
// Staging: behind the seal (the camera arcs in front, so the Stand looms and never covers the hero); when the camera is behind (law "home") it
// stands ahead and to the right, facing the seal, so it is never between the lens and the hero.
// Bridge for the FX layer: ctx.marks.tensorflow.fistL / fistR (world positions of the Stand's fists, updated each step), .standYaw.
import { events, ramp, back, sm, hash, stageFrame } from "./timing.js";

const H0 = 3.4;
export default function buildStand(ctx, marks) {
  const { THREE, engine, seal, sdf } = ctx;
  const { Group, Vector3 } = THREE;
  const { paint, polygonize, ell, cone } = sdf;
  const PL = paint("#f0dea4", "#b8742a", { line: 1.2 }), GR = paint("#8a9a8a", "#4a5a5a", { line: 1.2 }), HD = paint("#5a5a62", "#2a2a30", { line: 1.2 });
  const GD = paint("#e0b030", "#7a5a10", { line: 1.1 }), SM = paint("#6a3a20", "#2a1408", { line: 0.4 }), EY = paint("#ffe14a", "#c09a10", { line: 0.4 }), MO = paint("#3a1a14", "#1a0a08", { line: 0.3 });
  const FIG = { ink: "#05020a", lineMul: 1.6, constant: true };

  // ---- torso shell, Stand-local metres, +z forward, feet at y = 0
  const T = [];
  for (const s of [1, -1]) {
    T.push(cone([s * 0.3, 0.1, 0], [s * 0.3, 1.38, 0], 0.27, 0.33, GR, 0.04));                      // legs
    T.push(ell([s * 0.3, 0.55, 0.14], [0.2, 0.3, 0.12], PL, 0.03));                                  // shin guards
    T.push(ell([s * 0.3, 0.06, 0.1], [0.27, 0.07, 0.36], PL, 0.03));                                 // boots
    T.push(ell([s * 0.3, 1.0, 0.2], [0.14, 0.12, 0.08], GD, 0.02));                                  // knee studs
    T.push(ell([s * 0.3, 2.64, 0.0], [0.34, 0.26, 0.34], PL, 0.04), ell([s * 0.34, 2.5, 0.0], [0.34, 0.07, 0.34], GD, 0.02)); // pauldrons and their gold rims
    T.push(ell([s * 0.3, 2.42, 0.27], [0.33, 0.27, 0.2], PL, 0.04));                                 // pec plates (cream blocks)
    T.push(ell([s * 0.46, 2.4, 0.05], [0.1, 0.5, 0.06], SM, 0.01));                                  // seam down each flank
  }
  T.push(ell([0, 1.45, 0], [0.56, 0.26, 0.36], GR, 0.04), ell([0, 1.62, 0], [0.6, 0.08, 0.4], GD, 0.02));  // pelvis and the gold belt
  for (let i = 0; i < 3; i++) {                                                                      // abdomen: three stacked cream blocks and the seams between
    T.push(ell([0, 1.78 + i * 0.21, 0.17], [0.36, 0.1, 0.2], PL, 0.03));
    T.push(ell([0, 1.88 + i * 0.21, 0.24], [0.4, 0.012, 0.16], SM, 0.004));
  }
  T.push(ell([0, 2.3, 0], [0.76, 0.58, 0.4], GR, 0.05), ell([0, 2.43, 0.4], [0.025, 0.34, 0.06], SM, 0.004)); // chest and the sternum seam
  T.push(cone([0, 2.62, 0], [0, 2.86, 0.0], 0.22, 0.18, GR, 0.03));                                  // neck
  T.push(ell([0, 3.07, 0.02], [0.29, 0.31, 0.29], HD, 0.04));                                         // hooded head
  T.push(cone([0, 3.3, -0.04], [0, 3.36, -0.22], 0.12, 0.05, HD, 0.03));                            // hood ridge
  T.push(ell([0, 3.09, 0.0], [0.31, 0.055, 0.3], GD, 0.015), cone([0, 3.36, 0.02], [0, 3.1, 0.3], 0.04, 0.05, GD, 0.01)); // gold band and the cross band
  T.push(ell([0, 2.97, 0.15], [0.19, 0.16, 0.13], PL, 0.03));                                         // cream face plate
  for (const s of [1, -1]) T.push(ell([s * 0.09, 3.07, 0.25], [0.065, 0.026, 0.03], EY, 0.006));    // slit eyes
  T.push(ell([0, 2.92, 0.28], [0.04, 0.014, 0.02], MO, 0.004));                                      // the tiny mouth
  const torso = engine.figure(polygonize(T, 0.045), FIG);

  // ---- arm parts, hanging down -y from their pivots
  const upGeo = polygonize([cone([0, 0, 0], [0, -0.8, 0], 0.2, 0.17, GR, 0.03), ell([0, -0.22, 0.04], [0.22, 0.18, 0.2], PL, 0.03), ell([0, -0.5, 0], [0.205, 0.05, 0.205], GD, 0.015), ell([0, 0, 0], [0.22, 0.2, 0.22], PL, 0.03)], 0.04);
  const foGeo = polygonize([cone([0, 0, 0], [0, -0.74, 0], 0.17, 0.14, GR, 0.03), ell([0, 0, 0], [0.18, 0.15, 0.18], GR, 0.03), ell([0, -0.58, 0], [0.165, 0.05, 0.165], GD, 0.015), ell([0, -0.15, 0.05], [0.16, 0.12, 0.1], PL, 0.03)], 0.04);
  const fiGeo = polygonize([ell([0, 0, 0], [0.2, 0.2, 0.22], GR, 0.03), ell([0, 0.03, 0.15], [0.15, 0.1, 0.1], PL, 0.02), ell([0, 0.1, 0.18], [0.12, 0.012, 0.012], SM, 0.003)], 0.035);
  const rig = new Group(); rig.add(torso);
  const arms = [1, -1].map((s) => {
    const sh = new Group(); sh.position.set(s * 0.85, 2.6, 0.0);
    const up = engine.figure(upGeo, FIG), el = new Group(), fo = engine.figure(foGeo, FIG), fi = engine.figure(fiGeo, FIG);
    el.position.set(0, -0.8, 0); el.add(fo); fi.position.set(0, -0.74, 0); el.add(fi);
    sh.add(up, el); rig.add(sh);
    return { s, sh, el, fo, fi };
  });
  const root = new Group(); root.name = "the-world-stand"; root.add(rig); root.visible = false;
  root.traverse((o) => { o.layers.set(1); });
  const frame = stageFrame(ctx, true);
  const tmp = new Vector3();
  const M = marks;
  M.fistL = new Vector3(); M.fistR = new Vector3(); M.standYaw = 0; M.standVisible = false;

  // arm pose = { sx (shoulder rx), sz, ex (elbow rx), ext (forearm stretch) }; the three rest poses
  const IDLE = (s) => ({ sx: -0.95, sz: s * 0.14, ex: -1.0, ext: 1 });                    // looming, fists forward
  const STOP = (s, i) => ({ sx: -0.35 + 0.05 * i, sz: s * 1.25, ex: -0.25, ext: 1 });      // arms thrown wide: the ZA WARUDO flourish
  const FLEX = (s, i) => (i === 0 ? { sx: -2.55, sz: s * 0.2, ex: -1.4, ext: 1 } : { sx: -0.5, sz: s * 1.0, ex: -0.5, ext: 1 }); // one fist up, one out: the cover pose

  return {
    group: root,
    update(t, dt, cue) {
      const E = events(cue), ts = cue.ts ?? t, home = cue.law === "home";
      const vis = ts >= E.stand && ts < E.credit + 0.5;
      root.visible = vis; M.standVisible = vis;
      if (!vis) return;
      // height = 1.9 x the seal's height; the grow-in overshoots 18 percent, the credit dissolves it
      const sc = ((1.9 * seal.height * seal.scale) / H0) * Math.max(0.001, back((ts - E.stand) / 0.5) * (1 - ramp(ts, E.credit, 0.45)));
      root.scale.setScalar(sc);
      const m0 = E.muda, m1 = E.muda + E.mudaDur, inM = ts >= m0 && ts < m1, n = Math.floor(ts * 12 + 1e-6);
      // lunge: forward by 0.3 S over the first 0.25 s of the barrage, home at the end (a pure function of ts)
      const lunge = 0.3 * sm((ts - m0) / 0.25) * (1 - sm((ts - m1) / 0.3));
      const pz = home ? 2.2 : -1.55 + lunge, px = home ? 1.5 : 0;
      frame.to(px, 0, pz, tmp);
      root.position.set(tmp.x, tmp.y + 0.015 * seal.scale * Math.sin(ts * 3.1), tmp.z);
      const wob = inM ? 0.16 * Math.sin(n * Math.PI) : 0.05 * Math.sin(ts * 1.7);
      root.rotation.y = frame.yaw() + (home ? 3.4 : 0) + wob;
      // arm blends: idle -> stop (hold the flourish) -> idle -> flex, overridden by the barrage
      const wStop = ramp(ts, E.timestop, 0.45) * (1 - ramp(ts, E.resume, 0.35)), wFlex = ramp(ts, E.flex, 0.5);
      for (let i = 0; i < 2; i++) {
        const a = arms[i], s = a.s;
        let p = IDLE(s);
        const lerp = (q, w) => { p = { sx: p.sx + (q.sx - p.sx) * w, sz: p.sz + (q.sz - p.sz) * w, ex: p.ex + (q.ex - p.ex) * w, ext: p.ext + (q.ext - p.ext) * w }; };
        lerp(STOP(s, i), wStop); lerp(FLEX(s, i), wFlex);
        if (inM) { // one arm punches per step, the other recoils; the fan direction is re-rolled by a hash of the step (re-randomised each 2 frames)
          const hot = (n + i) % 2 === 0, h1 = hash(n * 2 + i, 1), h2 = hash(n * 2 + i, 2);
          p = hot ? { sx: -1.15 - 0.4 * h1, sz: s * (0.08 + 0.55 * h2) * (h1 > 0.5 ? 1 : -1), ex: -0.05, ext: 1.85 } : { sx: -0.8, sz: s * 0.2, ex: -1.5, ext: 1.0 };
        }
        const trem = (wStop > 0.5 ? 0.025 : 0) * Math.sin(ts * 31 + i);
        a.sh.rotation.set(p.sx + trem, 0, p.sz);
        a.el.rotation.set(p.ex, 0, 0);
        a.fo.scale.set(1, p.ext, 1);
        a.fi.position.y = -0.74 * p.ext;
      }
      root.updateMatrixWorld(true);
      arms[0].fi.getWorldPosition(M.fistL); arms[1].fi.getWorldPosition(M.fistR);
      M.standYaw = root.rotation.y;
    },
    dispose() { root.traverse((o) => { if (o.isMesh) { o.geometry?.dispose?.(); o.material?.dispose?.(); } }); },
  };
}
