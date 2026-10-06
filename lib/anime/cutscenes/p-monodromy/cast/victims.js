// VICTIMS and EXTRAS for p-monodromy: Ja'far, 8 Al-Thamen seals, the Sindria crowd. All costumed seals (L6b).
// Time model: every actor is a pure function of the stepped clock tt, so scrubbing equals playing.
//   undo  R(t) = 1 before 10.0, then 1 - smooth(10.0, 11.3): the island reassembles and the blow runs BACKWARD (the monodromy loop closes).
import { JAFAR, ALTHAMEN, crowdSpec } from "./costumes.js";
import { sm, clamp01, beatStart } from "./util.js";

export function buildVictims(ctx) {
  const { THREE, engine, kit, seal } = ctx;
  const group = new THREE.Group();
  const O = () => seal.at;
  const fig = (geo, col, shade, pos, rot, lm = 0.7) => { const f = engine.figure(ctx.sdf.painted(geo, ctx.sdf.paint(col, shade, { line: 1 })), { lineMul: lm, constant: true }); f.position.set(...pos); if (rot) f.rotation.set(...rot); return f; };
  const hood = (h, col, shade) => h.props.add(fig(new THREE.SphereGeometry(0.3, 18, 10, Math.PI / 2 + 0.75, Math.PI * 2 - 1.5, 0, Math.PI * 0.62), col, shade, [0, 0.55, -0.02]));

  // ---------------------------------------------------------------- Ja'far (3 m left of the hero)
  const jf = kit.costumedSeal(engine, { ...JAFAR, name: "jafar" });
  hood(jf, "#2aa05a", "#1b6e3a");
  jf.props.add(fig(new THREE.BoxGeometry(0.07, 0.05, 0.012), "#e9c040", "#a8741a", [0, 0.69, 0.27], [-0.35, 0, 0], 0.5)); // gold badge
  for (const s of [1, -1]) jf.props.add(fig(new THREE.SphereGeometry(0.012, 6, 5), "#c8826a", null, [s * 0.15, 0.5, 0.275], null, 0.2)); // freckles x2 per cheek
  for (const s of [1, -1]) jf.props.add(fig(new THREE.SphereGeometry(0.012, 6, 5), "#c8826a", null, [s * 0.185, 0.485, 0.262], null, 0.2));
  jf.props.add(fig(new THREE.TorusGeometry(0.05, 0.008, 6, 14), "#c0262e", null, [0.27, 0.2, 0.2], [Math.PI / 2, 0, 0], 0.3)); // red thread on a flipper
  group.add(jf.group);

  // ---------------------------------------------------------------- Al-Thamen (8, far quay fan, x -9..9, z -9.5..-6)
  const at = [];
  for (let i = 0; i < 8; i++) {
    const h = kit.costumedSeal(engine, { ...ALTHAMEN, name: `althamen${i}` });
    hood(h, "#1c1830", "#0c0a1c");
    h.props.add(fig(new THREE.ConeGeometry(0.07, 0.17, 6), "#1c1830", "#0c0a1c", [0, 0.86, 0.1], [0.9, 0, 0])); // 12 px hood peak wedge
    for (const s of [1, -1]) h.props.add(fig(new THREE.BoxGeometry(0.008, 0.075, 0.006), "#b3123a", null, [s * 0.045, 0.47, 0.314], [0, 0, s * 0.12], 0.2)); // the two thin red lines
    const x = -9 + (18 * i) / 7, z = i % 2 ? -6.2 : -9.4;
    at.push({ h, x, z, rank: 0, phase: i * 0.7, jx: ctx.rng("al")() });
    group.add(h.group);
  }
  // hit order by distance from the palace axis (x = 0): A,B at the strike, then two every 2 frames
  [...at].sort((a, b) => Math.abs(a.x) - Math.abs(b.x)).forEach((v, r) => { v.rank = r; });

  // ---------------------------------------------------------------- the blue sparks: 6 per Al-Thamen, 12 frames after each hit
  const NS = 8 * 6, sp = new Float32Array(NS * 3), vel = [];
  const rs = ctx.rng("sparks");
  for (let i = 0; i < NS; i++) vel.push([(rs() - 0.5) * 1.4, 0.6 + rs() * 1.2, (rs() - 0.5) * 1.4]);
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ color: "#8fd8ff", size: 0.09, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparks.frustumCulled = false; group.add(sparks);

  // ---------------------------------------------------------------- crowd (24-40; 32): ring about the hero, off the lens line
  const crowd = [], rc = ctx.rng("crowd");
  for (let i = 0; i < 32; i++) {
    let x, z, tries = 0;
    do { x = (rc() - 0.5) * 20; z = (rc() - 0.5) * 20; tries++; } while (tries < 40 && (Math.hypot(x, z) < 3.8 || (z > -1 && Math.abs(x) < 1.6) || Math.hypot(x - 2.9, z + 2) < 1.5));
    const h = kit.costumedSeal(engine, { ...crowdSpec(i), name: `crowd${i}` });
    crowd.push({ h, x, z, ph: rc() * 6.28 });
    group.add(h.group);
  }

  function update(tt, cue) {
    const o = O(), tS = beatStart(cue, ["strike", "bolt", "zzaap", "baraqq"], 6.4), R = 1 - sm(10.0, 11.3, tt);
    // ---- Ja'far: arms folded 0-2.3; panic ramp 2.3-2.7; shaking 2.7-6.4; cower 6.4-6.65; clings 7.0-8.4
    {
      const panic = sm(2.3, 2.7, tt), cw = sm(tS, tS + 0.25, tt), cling = sm(7.0, 7.6, tt);
      jf.react("terror", panic * R);
      if (cw > 0) { jf.setPose("terror", panic * (1 - cw) * R); jf.setPose("cower", cw * R); jf.setPose("stagger", Math.max(0, 1 - Math.abs(tt - tS - 0.05) / 0.08) * 0.8 * R); }
      jf.expression(cw > 0.5 ? "terror" : panic > 0 ? "terror" : "neutral", Math.max(panic, cw) * R);
      const x = 2.9 - 1.7 * cling * R, z = -2.0 + 1.4 * cling * R;
      jf.place(o[0] + x, o[1], o[2] + z, -0.9 * cling * R);
      jf.update(tt);
    }
    // ---- Al-Thamen
    let si = 0;
    for (const v of at) {
      const hit = tS + (v.rank >> 1) * (2 / 24), kb = clamp01((tt - hit) / 0.25), kn = sm(tS + 0.25, tS + 0.6, tt);
      const back = (1 - Math.pow(1 - kb, 2)) * 3.5 * R;                    // 3.5 m along -z in 6 frames, ease-out
      if (tt < hit) { v.h.react("stagger", 0); v.h.setPose("stagger", 0.1); v.h.expression("calm", 1); }
      else { v.h.setPose("stagger", 0); v.h.setPose("blown", kb * (1 - kn) * R); v.h.setPose("kneel", kn * R); v.h.expression(kn > 0.7 && v.rank >= 6 ? "awe" : kn > 0.5 ? "sad" : "terror", R); }
      const sw = tt < hit ? Math.sin(tt * 6 + v.phase) * 0.04 : 0;
      v.h.place(o[0] + v.x + sw, o[1], o[2] + v.z - back, -v.x * 0.03);
      v.h.update(tt);
      // sparks
      const age = tt - hit;
      for (let k = 0; k < 6; k++, si++) {
        const on = age >= 0 && age < 0.5 && R > 0.99;
        if (!on) { sp[si * 3 + 1] = -100; continue; }
        const vv = vel[si];
        sp[si * 3] = o[0] + v.x + vv[0] * age; sp[si * 3 + 1] = o[1] + 0.2 + vv[1] * age - 2.2 * age * age; sp[si * 3 + 2] = o[2] + v.z - back + vv[2] * age;
      }
    }
    sg.attributes.position.needsUpdate = true;
    // ---- crowd: hop on twos 0-2.3 and again after the lock; duck 4.9 (the violet sky); flat 6.4-7.0; look up at the crack 7.0
    const duck = sm(4.9, 5.5, tt), flat = sm(tS, tS + 0.25, tt), up = sm(7.0, 7.4, tt);
    for (const c of crowd) {
      const cheer = (tt < 2.3 || tt > 10.5) ? 1 : 0, hop = cheer ? Math.max(0, Math.sin(tt * 9 + c.ph)) * 0.05 : 0; // 5 cm on twos
      c.h.react("cower", 0);
      const d = Math.max(duck, flat) * R;
      c.h.setPose("cower", d * (1 - up) + d * up * 0.25); c.h.setPose("recoil", up * 0.45 * R);
      c.h.setPose("salute", cheer ? 0.6 : 0);
      c.h.expression(tt < 2.3 || tt > 10.5 ? "awe" : up > 0.5 ? "awe" : "terror", 0.6);
      c.h.place(o[0] + c.x, o[1] + hop, o[2] + c.z).lookAtPoint(o[0], o[2]);
      c.h.update(tt);
    }
  }
  const all = [jf, ...at.map((v) => v.h), ...crowd.map((c) => c.h)];
  return { group, update, dispose() { for (const h of all) h.dispose(); sg.dispose(); sparks.material.dispose(); } };
}
