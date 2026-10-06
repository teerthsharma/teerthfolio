// THE SCALE OF OBEDIENCE (bible 3.11): a symmetric balance, drawn as cel parts (the pans' flames and the black mass belong to the FX layer
// and read the pan positions from ctx.castRefs.panWorld).
//   heart-shaped bracket (two tube prongs meeting at a ring, finial on top), fulcrum disc with a bright centre circle, flat tapered beam with
//   dark diagonal bands, round end caps with a pin, each pan on THREE thin chains (a centre rod + two diagonals: a narrow triangle),
//   shallow half-bowl pans with a dark inner and a hard sheen crescent, a gold two-ring chain from the bracket to Aura's hand.
// Colour: brass lit #d9a93a, mid #a67f2a, shadow #4a3a28, highlight #f2e6c2, pan inner #383a4c. The weighing (pan_glow .. +1.4 s) is the
// SILVER state: the whole scale tints #e6f3f8 (the FX layer adds the white line and glow); brass after.
// Motion (pure functions of the stepped clock):
//   up 2.4 s (pop, 1.18x overshoot) | tip toward Aura at 3.0 s, damped, settling at 0.34 rad | trembles from 6.2 s |
//   swings to the pup's side 7.85..8.45 s (tilt -0.95 rad) | breaks at 8.5 s into 5 pieces on arcs (stem, 2 beam halves, 2 pans),
//   slow motion on sixes across 8.5..9.3 s; the beam halves land parallel as "=" (two weights, one operator: egg 4).
import { smooth, lerp, pop, makeFig, tintables } from "./util.js";
import { SCALE_P0, SCALE_K, FLOOR_Y, AURA_AT } from "./layout.js";

const BEAM = 0.9, CH = 0.78, HALF = BEAM; // BEAM = half-length of the whole beam; HALF = one half's length
const BRASS = ["#d9a93a", "#a67f2a"], DARK = ["#4a3a28", "#2a2018"];

export function buildScale(ctx, time, aura) {
  const { THREE } = ctx;
  const fig = makeFig(ctx);
  const root = new THREE.Group();
  root.position.set(...SCALE_P0);
  root.name = "scale-of-obedience";
  const mk = (geo, c, pos, o = {}) => fig(geo, c[0], c[1], { pos, lineMul: o.lm ?? 0.7, rot: o.rot });

  // ---- stem: heart bracket + ring + finial + fulcrum disc
  const stem = new THREE.Group();
  for (const s of [1, -1]) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.05, 0.08, 0), new THREE.Vector3(s * 0.24, 0.28, 0), new THREE.Vector3(s * 0.17, 0.52, 0), new THREE.Vector3(0, 0.62, 0)]);
    stem.add(mk(new THREE.TubeGeometry(curve, 24, 0.022, 8, false), BRASS, [0, 0, 0]));
  }
  stem.add(mk(new THREE.TorusGeometry(0.05, 0.013, 8, 18), BRASS, [0, 0.67, 0]),
    mk(new THREE.SphereGeometry(0.036, 10, 8), BRASS, [0, 0.76, 0]), mk(new THREE.ConeGeometry(0.022, 0.07, 8), BRASS, [0, 0.82, 0]),
    mk(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 24).rotateX(Math.PI / 2), BRASS, [0, 0, 0]),
    mk(new THREE.CylinderGeometry(0.075, 0.075, 0.034, 20).rotateX(Math.PI / 2), ["#f2e6c2", "#c9b27a"], [0, 0, 0.004], { lm: 0.4 }));
  root.add(stem);

  // ---- beam halves: tapered (inner end full, outer end 55%), dark diagonal bands, round end cap + pin. Built outer-end at +x.
  const half = () => {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(HALF, 0.09, 0.05, 6, 1, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * lerp(1, 0.55, (p.getX(i) + HALF / 2) / HALF)); // inner end at -x
    g.add(mk(geo, BRASS, [0, 0, 0]));
    for (let i = 0; i < 3; i++) g.add(mk(new THREE.BoxGeometry(0.03, 0.12, 0.054), DARK, [-0.3 + i * 0.3, 0, 0], { rot: [0, 0, 0.7], lm: 0.3 }));
    g.add(mk(new THREE.CylinderGeometry(0.065, 0.065, 0.06, 18).rotateX(Math.PI / 2), BRASS, [HALF / 2, 0, 0]),
      mk(new THREE.SphereGeometry(0.02, 8, 6), ["#f2e6c2", "#c9b27a"], [HALF / 2, 0, 0.034], { lm: 0.3 }));
    return g;
  };
  const beamR = half(), beamL = half(); // left half is the same part turned half a turn (pi about z)
  root.add(beamR, beamL);

  // ---- pans: shallow half-bowl (lower hemisphere squashed), dark inner disc, brass rim, hard sheen crescent
  const pan = () => {
    const g = new THREE.Group();
    const bowl = mk(new THREE.SphereGeometry(0.34, 22, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.45, 1), BRASS, [0, 0, 0]);
    bowl.userData.mat && (bowl.userData.mat.side = THREE.DoubleSide);
    g.add(bowl, mk(new THREE.CylinderGeometry(0.325, 0.325, 0.012, 22), ["#383a4c", "#1d1e2c"], [0, -0.004, 0], { lm: 0.3 }),
      mk(new THREE.TorusGeometry(0.34, 0.014, 6, 30).rotateX(Math.PI / 2), BRASS, [0, 0, 0], { lm: 0.5 }),
      mk(new THREE.TorusGeometry(0.27, 0.011, 6, 12, 1.2).rotateX(Math.PI / 2).rotateY(2.3), ["#f2e6c2", "#c9b27a"], [0, -0.1, 0], { lm: 0.2 }));
    return g;
  };
  const panL = pan(), panR = pan();
  root.add(panL, panR);

  // ---- chains: 3 per pan (centre rod + two diagonals)
  const chains = [];
  for (let i = 0; i < 6; i++) { const c = mk(new THREE.CylinderGeometry(0.008, 0.008, 1, 5), BRASS, [0, 0, 0], { lm: 0.3 }); root.add(c); chains.push(c); }
  const A = new THREE.Vector3(), B = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const rod = (m, a, b) => { B.copy(b).sub(a); const len = B.length(); m.position.copy(a).addScaledVector(B, 0.5); m.scale.set(1, len, 1); m.quaternion.setFromUnitVectors(Y, B.divideScalar(len)); };

  // ---- the gold two-ring chain from the bracket to Aura's hand (world-space links, parented to the cast group by the caller)
  const links = [];
  const linkGroup = new THREE.Group();
  for (let i = 0; i < 8; i++) { const l = fig(new THREE.TorusGeometry(0.034, 0.009, 6, 14), "#e9b84a", "#a67f2a", { lineMul: 0.4 }); linkGroup.add(l); links.push(l); }

  const all = tintables(root);
  const hand = new THREE.Vector3(), top = new THREE.Vector3();
  const panCenters = { L: new THREE.Vector3(), R: new THREE.Vector3() }; // world, refreshed each update

  // ---- the beam tilt tau (+ = toward Aura, the +x end sinks)
  const tilt = (t) => {
    const tt = time("scale_tip"), sw = time("scale_swing");
    let a = 0;
    if (t >= tt) { const u = t - tt; a = 0.34 * (1 - Math.exp(-6 * u) * Math.cos(10 * u)); }
    if (t >= time("scale_tremble")) a += 0.012 * Math.sin(t * 40) * smooth((t - time("scale_tremble")) / 0.8);
    if (t >= sw) a = lerp(0.34, -0.95, smooth((t - sw) / 0.6));
    return a;
  };
  // ---- the intact rig at time t: {piece: {p:[x,y,z] root-local, rz, rx}} (root-local, before SK)
  const rig = (t) => {
    const th = -tilt(t), c = Math.cos(th), s = Math.sin(th);
    const eR = [BEAM * c, BEAM * s], eL = [-BEAM * c, -BEAM * s];
    return {
      stem: { p: [0, 0, 0], rz: 0, rx: 0 },
      beamR: { p: [(HALF / 2) * c, (HALF / 2) * s, 0], rz: th, rx: 0 },
      beamL: { p: [-(HALF / 2) * c, -(HALF / 2) * s, 0], rz: th + Math.PI, rx: 0 },
      panR: { p: [eR[0], eR[1] - CH, 0], rz: 0, rx: 0 },
      panL: { p: [eL[0], eL[1] - CH, 0], rz: 0, rx: 0 },
      eR, eL,
    };
  };
  // landing spots (world, y = resting height) and spin: the beam halves land parallel, "=" (egg 4)
  const LAND = {
    stem: { p: [3.2, FLOOR_Y + 0.05, 0.9], rz: 1.5, rx: 0 },
    beamR: { p: [2.1, FLOOR_Y + 0.04, 0.85], rz: 0, rx: 0 },
    beamL: { p: [1.9, FLOOR_Y + 0.04, 0.55], rz: Math.PI, rx: 0 },
    panR: { p: [3.0, FLOOR_Y + 0.08, -1.0], rz: 0.3, rx: 2.4 },
    panL: { p: [1.4, FLOOR_Y + 0.08, -1.1], rz: -0.3, rx: -2.0 },
  };
  const FLIGHT = { stem: 0.95, beamR: 0.85, beamL: 0.9, panR: 1.0, panL: 1.05 }, G = -9.8;
  const pieces = { stem, beamR, beamL, panR, panL };
  let silver = 0;

  const apply = (name, st) => { const o = pieces[name]; o.position.set(st.p[0], st.p[1], st.p[2]); o.rotation.set(st.rx, 0, st.rz); };

  return {
    group: root,
    linkGroup, // add to the cast group: its links live in world space
    panWorld(side, out) { return out.copy(side === "aura" || side === "R" ? panCenters.R : panCenters.L); },
    update(t) {
      const tu = time("scale_up"), P = pop(t, tu, 0.25, 1.18), brk = time("scale_break");
      root.visible = P > 0.001;
      linkGroup.visible = root.visible && t < brk;
      if (!root.visible) return;
      root.scale.setScalar(SCALE_K * P);
      // silver weighing state, brass after
      const g0 = time("pan_glow");
      silver = smooth((t - g0) / 0.25) * (1 - smooth((t - (g0 + 1.4)) / 0.4));
      for (const u of all) { u.uTint.value.set("#e6f3f8"); u.uTintAmt.value = 0.75 * silver; }

      const R = rig(t);
      if (t < brk) {
        for (const n of Object.keys(pieces)) apply(n, R[n]);
        // chains: centre rod + two diagonals per pan, end cap to pan rim
        [[R.eL, R.panL, 0], [R.eR, R.panR, 3]].forEach(([e, pn, i0]) => {
          A.set(e[0], e[1], 0);
          [[0, 0.11], [-0.3, 0.04], [0.3, 0.04]].forEach(([dx, dy], i) => { B.set(pn.p[0] + dx, pn.p[1] + dy, 0); rod(chains[i0 + i], A, B); });
        });
        for (const c of chains) c.visible = true;
        // the hand chain
        aura.handWorld(hand);
        top.set(SCALE_P0[0], SCALE_P0[1] + SCALE_K * P * 0.84, SCALE_P0[2]);
        links.forEach((l, i) => {
          const u = (i + 0.5) / links.length;
          l.position.lerpVectors(hand, top, u).y -= 0.08 * Math.sin(Math.PI * u);
          l.rotation.set(i % 2 ? Math.PI / 2 : 0, 0, 0.4);
        });
      } else {
        for (const c of chains) c.visible = false;
        // thrown on arcs, slow motion on sixes across 8.5..9.3 s, then at rest
        const raw = t - brk;
        const tau = raw < 0.8 ? Math.floor(raw * 6) / 6 * 0.5 : 0.4 + (raw - 0.8);
        const Rb = rig(brk);
        // (slow motion: the first 0.8 s run at half speed, quantised to sixes, then normal speed)
        for (const n of Object.keys(pieces)) {
          const T = FLIGHT[n], L = LAND[n], p0w = [SCALE_P0[0] + SCALE_K * Rb[n].p[0], SCALE_P0[1] + SCALE_K * Rb[n].p[1], SCALE_P0[2]];
          const ease = smooth(tau / T), fl = tau < T;
          const w = [0, 1, 2].map((i) => {
            const v = i === 1 ? (L.p[1] - p0w[1] - 0.5 * G * T * T) / T : (L.p[i] - p0w[i]) / T;
            return fl ? p0w[i] + v * tau + (i === 1 ? 0.5 * G * tau * tau : 0) : L.p[i];
          });
          const sp = 2 * Math.PI * (n.startsWith("pan") ? 1 : 0);
          apply(n, { p: [(w[0] - SCALE_P0[0]) / (SCALE_K * P), (w[1] - SCALE_P0[1]) / (SCALE_K * P), (w[2] - SCALE_P0[2]) / (SCALE_K * P)],
            rz: lerp(Rb[n].rz, L.rz + sp, ease), rx: lerp(Rb[n].rx, L.rx, ease) });
        }
      }
      // pan centres for the FX layer (world)
      for (const [k, n] of [["L", "panL"], ["R", "panR"]]) { const o = pieces[n]; panCenters[k].set(SCALE_P0[0] + o.position.x * SCALE_K * P, SCALE_P0[1] + o.position.y * SCALE_K * P, SCALE_P0[2]); }
    },
    dispose() { root.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); linkGroup.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); },
  };
}
