// SHIBUYA CROSSING, NIGHT (bible: Shibuya crossing city). Facades, not buildings (RULEBOOK 7): each building is a slab with
// baked window cards on the three faces the lens can see; the avenue (half width 10.5 m) runs along z through the seal.
// Cold black-blue (#1a1a2a haze), signs red or paper only (one accent), zebra bars, lamps, abandoned cars, a round sign
// tower, a station canopy with a clock, and a skyline row behind.
//
// DISMANTLE (the barrage): slash i cuts building order[i] at t_i + 0.15 s along a TILTED plane through the building:
//   a      = 0.35 + 0.4 u rad                  cut tilt;  D = (o cos a, -sin a, 0)  downhill direction, o = outward side
//   n      = D x z = (D.y, -D.x, 0), flipped so n.y > 0 ; plane n.p = n.y h_cut, h_cut = (0.42 + 0.2 u) h
//   upper  = clipSolid(box, n, d, +1) + crown ; lower = clipSolid(box, n, d, -1)   (true polyhedra with a paper-bright cap)
//   slide  : x = clamp((t - t_cut)/1.1), e = 1 - (1 - x)^3, upper.position = D L e (+ 0.25 sin(120 t)(1 - x) shake), L = 0.3 min(w,d) + 2
//   so the slab slides DOWN its own cut face, outward from the avenue, and stays there.
// LAMPS topple with a bounce:  theta = 1.45 bounce((t - t_l)/0.8) about the base, toward the avenue.
// SIGNS flicker out: after t_out, on = phase < 0.5 and floor(12 phase) even; off for good afterwards.
// DRAW-IN: a building grows from the ground as the wipe radius passes it:  s = sm((drawR - dist)/10) sm((rubR - dist)/10).
// Easter egg 5: a tiny Mahoraga halo flickers in a far window at 2.7 s.
import { BoxGeometry, CylinderGeometry, Group, Mesh, TorusGeometry, Vector2, Vector3 } from "three";
import { merge } from "../../../kit3d.js";
import { bounce, boxFaces, cardGeo, clipPoly, clipSolid, sm, solidGeo, surf } from "./util.js";

const FOG = [0.55, 0, 22, 170, "#1a1a2a"];
const WIN = /* glsl */ `
  // window card: a grid of cells; a cell is a dark pane, a paper-lit pane (22%), or the one red pane (3.5%); floor slab lines between
  //   win = step(.2,f.x) step(f.x,.8) step(.25,f.y) step(f.y,.78) ; lit = step(.78, h21(id)) ; red = step(.965, h21(id))
  uniform vec2 uGrid; uniform float uSeed;
  vec4 paint(vec2 p) {
    vec2 uv = vec2(p.x / uAsp, p.y);
    vec2 g = uv * uGrid, id = floor(g), f = fract(g);
    float r = h21(id * 1.37 + uSeed);
    float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.25, f.y) * step(f.y, 0.78);
    float lit = step(0.78, r), red = step(0.965, r);
    vec3 col = mix(vec3(0.012, 0.016, 0.030), vec3(0.80, 0.76, 0.66), lit);
    col = mix(col, vec3(0.80, 0.03, 0.06), red);
    float ledge = step(f.y, 0.07);
    col = mix(col, vec3(0.06, 0.07, 0.10), ledge * (1.0 - win));
    return vec4(col, max(win, ledge));
  }`;

export function buildCity(ctx, T, U) {
  const { engine } = ctx;
  const R = ctx.rng(7), C0 = ctx.scene.seal?.at ?? [0, 0, 0];
  const out = new Group();
  const grow = [], cuts = [], toppl = [], flick = [], cards = [], geos = [];
  const add = (parent, mesh) => { parent.add(mesh); return mesh; };

  // ---- layout ----
  const specs = [];
  for (const o of [-1, 1]) for (const dirn of [1, -1]) {
    let z = dirn * 9;
    for (let i = 0; i < 5; i++) {
      const d = 12 + R() * 8, w = 15 + R() * 10, h = 20 + R() * 38, zc = z + dirn * d / 2;
      if (dirn < 0 && z - d < -50) break;
      const kind = o === -1 && dirn < 0 && i === 1 ? "tower" : o === 1 && dirn > 0 && i === 1 ? "canopy" : "block";
      specs.push({ o, x: o * (11.2 + w / 2), z: zc, w, d, h, row: 1, kind });
      z += dirn * (d + 1.4);
    }
  }
  for (const o of [-1, 1]) for (let i = 0; i < 7; i++)
    specs.push({ o, x: o * (46 + R() * 14), z: -40 + i * 18 + R() * 6, w: 22 + R() * 8, d: 20, h: 40 + R() * 45, row: 2, kind: "block" });
  const cuttable = specs.filter((s) => s.kind === "block").sort((a, b) => a.row - b.row || Math.abs(a.z) - Math.abs(b.z)).slice(0, 18);
  cuttable.forEach((s, i) => { s.cut = i; });

  // ---- buildings ----
  specs.forEach((s, bi) => {
    const g = new Group(); g.position.set(s.x, 0, s.z); out.add(g);
    grow.push({ g, dist: Math.hypot(s.x - C0[0], s.z - C0[2]) });
    const id = 0.5 + 0.001 * bi;
    if (s.kind === "tower") {                                           // the round sign tower
      const m1 = add(g, surf(engine, new CylinderGeometry(5, 5, 46, 24).translate(0, 23, 0), "#2a2d3c", "#07080d", id, { fog: FOG, ink: 1 }));
      const m2 = add(g, surf(engine, new CylinderGeometry(5.15, 5.15, 3, 24).translate(0, 30, 0), "#cc0a17", "#7a0610", id + 0.0003, { emit: [0.8, 0.02, 0.06] }));
      const m3 = add(g, surf(engine, new CylinderGeometry(5.15, 5.15, 2.4, 24).translate(0, 36, 0), "#ece5d2", "#9a9484", id + 0.0006, { emit: [0.6, 0.58, 0.5] }));
      geos.push(m1, m2, m3); return;
    }
    if (s.kind === "canopy") {                                          // the station canopy with its clock
      const slab = merge([new BoxGeometry(20, 1, 16).translate(0, 7.5, 0), ...[[-9, -7], [9, -7], [-9, 7], [9, 7]].map(([x, z]) => new BoxGeometry(1, 7, 1).translate(x, 3.5, z))], "canopy");
      const a = add(g, surf(engine, slab, "#2a2d3c", "#07080d", id, { fog: FOG, ink: 1 }));
      const clock = add(g, surf(engine, new CylinderGeometry(2.4, 2.4, 0.5, 24).rotateX(Math.PI / 2).translate(0, 11, 8.3), "#ece5d2", "#9a9484", id + 0.0004, { emit: [0.55, 0.53, 0.46] }));
      const hands = add(g, surf(engine, merge([new BoxGeometry(0.2, 1.8, 0.2).translate(0, 11.8, 8.6), new BoxGeometry(1.3, 0.2, 0.2).translate(0.6, 11, 8.6)], "hands"), "#0e0b0d", "#0e0b0d", id + 0.0005));
      geos.push(a, clock, hands); return;
    }
    // a block: window cards on +z, -z and the avenue face, baked once per building
    const hx = s.w / 2, hy = s.h / 2, hz = s.d / 2;
    const col = s.row === 1 ? "#2a2d3c" : "#1f2130", shade = "#07080d";
    const bodyF = { fog: FOG, ink: s.row === 1 ? 0.8 : 0, stone: s.row === 2 ? [4, 0.28, 1.1, 0.5] : null };
    let cardMat = null, rects = [];
    if (s.row === 1) {
      const cols = Math.max(3, Math.round((s.w + s.d) / 2 / 2.4)), rows = Math.max(4, Math.round(s.h / 3.4));
      const c = ctx.bake.card(WIN, { w: 192, h: 384, size: [s.w, s.h], uniforms: { uGrid: { value: new Vector2(cols, rows) }, uSeed: { value: bi * 3.7 } } });
      cardMat = c.material; cards.push(c);
      const e = 0.06, ix = -s.o * (hx + e);
      rects = [
        [[-hx, 0, hz + e, 0, 0], [hx, 0, hz + e, 1, 0], [hx, s.h, hz + e, 1, 1], [-hx, s.h, hz + e, 0, 1]],
        [[hx, 0, -hz - e, 0, 0], [-hx, 0, -hz - e, 1, 0], [-hx, s.h, -hz - e, 1, 1], [hx, s.h, -hz - e, 0, 1]],
        [[ix, 0, hz, 0, 0], [ix, 0, -hz, 1, 0], [ix, s.h, -hz, 1, 1], [ix, s.h, hz, 0, 1]],
      ];
    }
    const face = boxFaces(hx, hy, hz, hy);
    const crown = s.row === 1 && s.h > 30 && s.cut === undefined ? boxFaces(hx * 0.6, 2, hz * 0.6, s.h + 2) : [];
    if (s.cut === undefined) {
      const m = add(g, surf(engine, solidGeo([...face, ...crown], col, shade), col, shade, id, bodyF));
      geos.push(m);
      for (const r of rects) { const cm = new Mesh(cardGeo([r]), cardMat); cm.frustumCulled = false; g.add(cm); geos.push(cm); }
      return;
    }
    // a cut building: two true polyhedra and two halves of every card
    const a = 0.35 + 0.4 * R(), D = new Vector3(s.o * Math.cos(a), -Math.sin(a), 0);
    const n = new Vector3(D.y, -D.x, 0).normalize(); if (n.y < 0) n.negate();
    const cutH = s.h * (0.42 + 0.2 * R()), d0 = n.y * cutH;
    const up = new Group(), low = new Group(); g.add(low, up);
    const capC = ["#ece5d2", "#9a9484"];
    const upG = solidGeo([...clipSolid(face, n, d0, 1), ...(s.row === 1 && s.h > 30 ? boxFaces(hx * 0.6, 2, hz * 0.6, s.h + 2) : [])], col, shade, capC[0], capC[1]);
    const loG = solidGeo(clipSolid(face, n, d0, -1), col, shade, capC[0], capC[1]);
    const upM = add(up, surf(engine, upG, col, shade, id, bodyF)), loM = add(low, surf(engine, loG, col, shade, id + 0.0002, bodyF));
    geos.push(upM, loM);
    for (const r of rects) for (const [grp, sgn] of [[up, 1], [low, -1]]) {
      const p = clipPoly(r, n, d0, sgn); if (p.length < 3) continue;
      const cm = new Mesh(cardGeo([p]), cardMat); cm.frustumCulled = false; grp.add(cm); geos.push(cm);
    }
    cuts.push({ up, D, o: s.o, L: 0.3 * Math.min(s.w, s.d) + 2, i: s.cut, tilt: 0.02 * s.o });
  });

  // ---- signs (red or paper only), merged per flicker group ----
  const sg = [[[], []], [[], []], [[], []]];
  specs.filter((s) => s.row === 1 && s.kind === "block").forEach((s, i) => {
    for (let k = 0; k < 2; k++) {
      const hh = 2 + R() * 4, y = 4 + R() * Math.max(1, 0.35 * s.h - hh - 4);
      sg[(i + k) % 3][R() < 0.3 ? 1 : 0].push(new BoxGeometry(0.5, hh, 1.5 + R() * 3).translate(s.x - s.o * (s.w / 2 + 0.28), y + hh / 2, s.z + (R() - 0.5) * s.d * 0.6));
    }
  });
  sg.forEach((pair, gi) => {
    const ms = [];
    pair.forEach((list, ci) => {
      if (!list.length) return;
      const m = surf(engine, merge(list, "signs"), ci ? "#cc0a17" : "#ece5d2", ci ? "#7a0610" : "#9a9484", 0.7 + gi * 0.01 + ci * 0.003, { reveal: U, emit: ci ? [0.9, 0.03, 0.08] : [0.85, 0.82, 0.7] });
      out.add(m); ms.push({ m, on: ci ? [0.9, 0.03, 0.08] : [0.85, 0.82, 0.7] }); geos.push(m);
    });
    flick.push({ ms, i: gi });
  });

  // ---- street lamps (8 topple, 2 stand), abandoned cars ----
  const pole = merge([new CylinderGeometry(0.09, 0.12, 7, 8).translate(0, 3.5, 0), new BoxGeometry(0.9, 0.08, 0.08).translate(-0.4, 6.9, 0)], "pole");
  const head = new BoxGeometry(0.9, 0.22, 0.4).translate(-0.7, 6.8, 0);
  const poleM = surf(engine, pole, "#2a2d3c", "#07080d", 0.72, { reveal: U, ink: 0.6, fog: FOG });
  const headM = surf(engine, head, "#ece5d2", "#9a9484", 0.721, { reveal: U, emit: [0.8, 0.78, 0.68] });
  geos.push(poleM, headM);
  [-48, -36, -24, -14, 14, 24, 36, 48, 60, 72].forEach((z, i) => {
    const o = i % 2 ? 1 : -1, lg = new Group(); lg.position.set(o * 11.2, 0, z); lg.scale.x = o;    // the head leans over the avenue
    lg.add(new Mesh(poleM.geometry, poleM.material), new Mesh(headM.geometry, headM.material));
    out.add(lg); if (i < 8) toppl.push({ lg, o, i });
  });
  const carP = [], carI = [];
  [[-3.5, -44], [4, -30], [-5, -20], [5, 18], [-4, 28], [3.5, 40], [-6, 54], [5.5, 66]].forEach(([x, z], i) => {
    const yaw = (R() - 0.5) * 0.5, g1 = merge([new BoxGeometry(1.8, 0.9, 4.2).translate(0, 0.65, 0), new BoxGeometry(1.6, 0.7, 2.2).translate(0, 1.4, -0.2)], "car").rotateY(yaw).translate(x, 0, z);
    (i % 2 ? carP : carI).push(g1);
  });
  for (const [list, c, sh] of [[carP, "#d8d2c0", "#8a8878"], [carI, "#1a1a24", "#05050a"]])
    if (list.length) { const m = surf(engine, merge(list, "cars"), c, sh, 0.73, { reveal: U, ink: 0.7, fog: FOG, gloss: [0.5, 30, 0.2, 0] }); out.add(m); geos.push(m); }

  // ---- the Mahoraga halo in the farthest window ----
  const far = specs.filter((s) => s.row === 1 && s.kind === "block").sort((a, b) => a.z - b.z)[0];
  const halo = surf(engine, new TorusGeometry(0.7, 0.1, 8, 24).rotateY(Math.PI / 2).translate(far.x + (far.w / 2 + 0.4) * -far.o, 0.45 * far.h, far.z), "#ece5d2", "#9a9484", 0.74, { emit: [0.9, 0.88, 0.8] });
  out.add(halo); geos.push(halo);

  return {
    object: out,
    update(t) {
      const dR = U.drawR.value, rR = U.rubR.value;
      for (const b of grow) { const s = sm((dR - b.dist) / 10) * sm((rR - b.dist) / 10); b.g.visible = s > 0.002; b.g.scale.y = Math.max(s, 1e-3); }
      for (const c of cuts) {
        const tc = (T.slash[c.i % T.slash.length] ?? 8.1) + 0.15, x = Math.min(1, Math.max(0, (t - tc) / 1.1)), e = 1 - (1 - x) ** 3;
        const shake = t >= tc ? 0.25 * Math.sin(120 * t) * (1 - x) : 0;
        c.up.position.set(c.D.x * c.L * e + shake, c.D.y * c.L * e, 0);
        c.up.rotation.z = c.tilt * e;
      }
      for (const l of toppl) {
        const tl = (T.slash[(2 + 2 * l.i) % T.slash.length] ?? 9) + 0.25;
        l.lg.rotation.z = l.o * 1.45 * bounce((t - tl) / 0.8);
      }
      for (const f of flick) {
        const tout = T.slash[(2 + f.i * 4) % T.slash.length] ?? 9, ph = t - tout;
        const on = ph < 0 ? 1 : ph < 0.5 && Math.floor(ph * 12) % 2 === 0 ? 1 : 0;
        for (const { m, on: c } of f.ms) m.material.uniforms.uEmit.value.setRGB(c[0] * on, c[1] * on, c[2] * on);
      }
      const hp = t - T.halo; halo.visible = hp > 0 && hp < 0.9 && Math.floor(hp * 12) % 3 !== 1 && dR > Math.hypot(far.x, far.z) && rR > 70;
    },
    dispose() {
      for (const m of geos) { m.geometry?.dispose(); m.material?.dispose?.(); }
      for (const c of cards) c.userData.dispose?.();
      for (const r of [poleM, headM]) { r.geometry.dispose(); r.material.dispose(); }
    },
  };
}
