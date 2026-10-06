// KURAMA, the Nine-Tails (the enemy), in the Pierrot shape of the bible: a crouching four-legged fox, black fur #3a1a1a / #140a10,
// an ochre belly and chest #e89a30 / #b86a20, a jagged fur hem, red slit eyes #e02020, six white upper fangs, ears pinned back and
// NINE tails fanned behind with orange tips #d8782a. Real 3D (SDF surface nets), cel-shaded by the engine, ink hull = the black line.
//
// Local frame: origin on the ground between the paws, +z forward (the head), +y up, metres; shoulder height = 5.5 (LAYOUT.kurama.size).
// Parts (separate meshes so they can move): body, head (pivot at the neck), jaw (pivot in the head), 9 tails (pivots at the root).
//
// MOTION MATHS (every channel is a function of the STEPPED clock ts, so a scrub equals a play):
//   roar   R(ts)  = bump(ts - T.roar, 0.25, roarDur - 0.65, 0.4)         head pitch -0.45 R, jaw yaw +0.7 R, torso rear -0.12 R, +0.5 R m
//   orb    O(ts)  = sm((ts - T.orb)/orbDur) (1 - sm((ts - T.flash0)/0.3))  jaw held at 0.3 O, the orb grows to 1.35 O m ahead of the snout
//   flinch F(ts)  = bump(ts - T.chain, 0.12, 0.1, 0.15)                    frames 0-8 after the first link: torso -0.8 F m, head jerks up
//   thrash H(ts)  = [T.chain+0.33 < ts < T.pin] (0.35 + 0.65 S)            S = sm((ts - T.surge)/surgeDur); noise from jit() at 17 and 23 rad/s
//   pinned P(ts)  = sm((ts - T.pin)/0.25)                                  frames 0-6: shake -> 0, torso sags 0.55 m, head hangs +0.4 rad, tails go limp
//   coral  C(ts)  = 0.6 S [ts < T.burst] + 0.9 bump(ts - T.burst, 0, 0.1, 0.5) + 0.12 P   mix of #ff6b57 over every Kurama material (uTint)
//   tails  sway_i = (0.07 + 0.05 H) sin(1.6 ts + 0.7 i) about z and 0.05 cos(1.3 ts + 1.1 i) about x; limp: x P
export const KURAMA_SIZE = 5.5;
import { bump, jit, sm } from "./layout.js";

export function buildKurama(ctx, parts, T) {
  const { THREE: Th, engine, sdf, kit } = ctx;
  const { cone, ell, paint, polygonize } = sdf;
  const FUR = paint("#3a1a1a", "#140a10", { line: 1.3 }), DEEP = paint("#140a10", "#08040a", { line: 1.2 }), BELLY = paint("#e89a30", "#b86a20", { line: 1 });
  const TIP = paint("#d8782a", "#a04a10", { line: 1 }), FANG = paint("#f4ecd8", "#c8bca0", { line: 1 }), MOUTH = paint("#7a1418", "#3a0608", { line: 1 });
  const root = new Th.Group(), mats = [], fig = (geo, o = {}) => { const f = engine.figure(parts.geo(geo), { ink: "#000000", lineMul: 2.0, constant: true, ...o }); mats.push(f.userData.mat.uniforms); return f; };

  // ------------------------------------------------------------ body: crouched torso, haunches, four legs, neck, jagged hem, spine spikes
  const B = [
    ell([0, 3.9, 1.2], [1.7, 1.8, 1.9], FUR, 0.3), ell([0, 3.5, -1.0], [1.6, 1.6, 2.6], FUR, 0.3),
    ell([1.5, 2.4, -2.6], [1.0, 1.5, 1.5], FUR, 0.25), ell([-1.5, 2.4, -2.6], [1.0, 1.5, 1.5], FUR, 0.25),
    ell([0, 2.4, 0.6], [1.35, 1.2, 2.4], BELLY, 0.2), ell([0, 3.1, 2.3], [0.85, 1.25, 0.6], BELLY, 0.15), // belly + chest patch (ochre)
    cone([0, 4.2, 1.8], [0, 5.1, 2.7], 1.05, 0.9, FUR, 0.3), // neck to the head pivot
  ];
  for (const s of [1, -1]) {
    B.push(cone([s * 1.2, 3.6, 1.3], [s * 1.35, 2.0, 2.2], 0.8, 0.55, FUR, 0.2), cone([s * 1.35, 2.0, 2.2], [s * 1.4, 0.35, 3.0], 0.55, 0.45, FUR, 0.15), ell([s * 1.4, 0.3, 3.2], [0.55, 0.3, 0.7], FUR, 0.1));
    B.push(cone([s * 1.5, 2.4, -2.4], [s * 1.55, 1.0, -1.4], 0.9, 0.55, FUR, 0.2), ell([s * 1.55, 0.3, -1.1], [0.6, 0.3, 0.8], FUR, 0.1));
    for (let c = -1; c <= 1; c++) { B.push(cone([s * 1.4 + c * 0.22, 0.2, 3.7], [s * 1.4 + c * 0.3, 0.05, 4.25], 0.09, 0.015, FANG, 0.0)); B.push(cone([s * 1.55 + c * 0.22, 0.2, -0.5], [s * 1.55 + c * 0.3, 0.05, -0.05], 0.09, 0.015, FANG, 0.0)); } // claws
  }
  // the jagged fur hem along both flanks (the Pierrot cut-out edge), and a ridge of spikes along the spine and back of the neck
  for (const s of [1, -1]) for (let i = 0; i < 9; i++) { const z = -3.0 + i * 0.75; B.push(cone([s * 1.35, 2.4, z], [s * 1.4, 1.45 + 0.25 * Math.sin(i * 2.3), z - 0.28], 0.26, 0.015, DEEP, 0.05)); }
  for (let i = 0; i < 8; i++) { const z = -3.2 + i * 0.7, y = 4.9 - 0.12 * Math.abs(i - 3); B.push(cone([0, y, z], [0, y + 0.85, z - 0.35], 0.28, 0.015, DEEP, 0.05)); }
  const body = fig(polygonize(B, 0.16));
  root.add(body);

  // ------------------------------------------------------------ head (pivot = the neck top (0,5.2,2.7)); head-local origin at the pivot
  const HC = [0, 0.2, 0.4], HR = [1.1, 0.9, 1.2];
  const H = [
    ell(HC, HR, FUR, 0.2), cone([0, 0.05, 1.1], [0, -0.1, 2.3], 0.62, 0.42, FUR, 0.15), ell([0, 0.05, 2.35], [0.34, 0.26, 0.3], DEEP, 0.1), // skull, snout, nose
    ell([0.55, 0.78, 1.0], [0.5, 0.2, 0.5], DEEP, 0.1, [0, 0, -0.35]), ell([-0.55, 0.78, 1.0], [0.5, 0.2, 0.5], DEEP, 0.1, [0, 0, 0.35]), // heavy brow ridge (angry slant)
    ell([0, -0.28, 1.35], [0.52, 0.16, 0.75], MOUTH, 0.05), // the mouth, showing when the jaw opens
  ];
  for (const s of [1, -1]) {
    H.push(cone([s * 0.7, 0.9, -0.1], [s * 1.0, 2.35, -1.0], 0.4, 0.04, FUR, 0.1), cone([s * 0.72, 0.95, -0.12], [s * 0.98, 2.0, -0.85], 0.2, 0.03, BELLY, 0.05)); // ears pinned back, ochre inner
    for (let k = 0; k < 3; k++) H.push(cone([s * 0.95, -0.05 - k * 0.2, 0.5 - k * 0.15], [s * (1.9 + 0.2 * k), -0.45 - k * 0.5, -0.5 - k * 0.4], 0.28 - k * 0.04, 0.02, DEEP, 0.05)); // cheek tufts
    for (let k = 0; k < 3; k++) H.push(cone([s * (0.28 + 0.07 * k), -0.28, 1.15 + k * 0.45], [s * (0.3 + 0.07 * k), -0.95 - 0.1 * (k === 1), 1.2 + k * 0.45], 0.075, 0.012, FANG, 0.0)); // six upper fangs (3 a side)
  }
  const head = new Th.Group(); head.position.set(0, 5.2, 2.7);
  head.add(fig(polygonize(H, 0.1)));
  // red slit eyes: the anime-eye-decal on the head ellipsoid (rage: slanted lids, slit pupil, two highlights)
  const eyes = kit.eyePair({ c: HC, r: HR }, { style: "slit", iris: "#e02020", irisLo: "#9a1010", sclera: "#e84a38", pupilCol: "#08040a", lash: "#140a10", gap: 0.5, y: 0.5, size: [0.7, 0.42], lift: 0.03 });
  head.add(eyes);
  // the jaw: pivot (0,-0.15,0.5) in head-local; lower jaw, four lower fangs, a tongue
  const J = [cone([0, -0.2, 0.55], [0, -0.3, 2.0], 0.5, 0.36, FUR, 0.12), ell([0, -0.15, 1.1], [0.38, 0.1, 0.8], MOUTH, 0.05)];
  for (const s of [1, -1]) for (let k = 0; k < 2; k++) J.push(cone([s * (0.22 + 0.1 * k), -0.12, 1.5 + 0.35 * k], [s * (0.24 + 0.1 * k), 0.55, 1.55 + 0.35 * k], 0.07, 0.012, FANG, 0.0));
  const jaw = new Th.Group(); jaw.position.set(0, -0.15, 0.5);
  const jg = polygonize(J, 0.08); jg.translate(0, 0.15, -0.5); // re-centre on the pivot
  jaw.add(fig(jg));
  head.add(jaw);
  // the dark orb floats ahead of the snout
  const orb = parts.orb(); orb.group.position.set(0, -0.3, 3.6); head.add(orb.group);
  root.add(head);

  // ------------------------------------------------------------ nine tails, fanned behind and up; the last two segments are orange
  const tails = [], tailRoot = [0, 3.7, -3.9];
  for (let i = 0; i < 9; i++) {
    const a = ((i - 4) / 4) * 1.15, L = 7.2 + 1.1 * Math.cos(a * 1.3), d = [Math.sin(a) * 1.1, 0.95 * Math.cos(a) + 0.2, -0.55 - 0.25 * Math.abs(Math.sin(a))];
    const n = Math.hypot(...d); d[0] /= n; d[1] /= n; d[2] /= n;
    const pts = [];
    for (let s = 0; s <= 6; s++) { const u = s / 6; pts.push([d[0] * L * u + Math.sin(a) * 0.9 * u * u, d[1] * L * u + 1.5 * u ** 3, d[2] * L * u]); }
    const P = [];
    for (let s = 0; s < 6; s++) { const u = s / 6, u2 = (s + 1) / 6, r = (x) => 0.62 * (1 - x) ** 0.8 + 0.14; P.push(cone(pts[s], pts[s + 1], r(u), r(u2), s >= 4 ? TIP : s === 3 ? FUR : FUR, 0.18)); }
    const g = new Th.Group(); g.position.set(...tailRoot); g.add(fig(polygonize(P, 0.2)));
    tails.push(g); root.add(g);
  }

  // ------------------------------------------------------------ the Eight Trigrams seal on the belly (an easter egg, 7.9 s)
  let tri = null;
  if (typeof document !== "undefined") {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256;
    const c = cv.getContext("2d"); c.translate(128, 128); c.strokeStyle = "#fdf8e0"; c.fillStyle = "#fdf8e0"; c.lineWidth = 5;
    c.beginPath(); c.arc(0, 0, 118, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(0, 0, 58, 0, Math.PI * 2); c.stroke(); // two rings (r = 118, 58)
    for (let i = 0; i < 8; i++) { // trigram i at angle 45 i deg: three bars; bar j is whole when bit j of (i + 1) is set, else broken
      c.save(); c.rotate((i * Math.PI) / 4);
      for (let j = 0; j < 3; j++) { const y = -(72 + j * 14), whole = ((i + 1) >> j) & 1; if (whole) c.fillRect(-18, y - 4, 36, 8); else { c.fillRect(-18, y - 4, 15, 8); c.fillRect(3, y - 4, 15, 8); } }
      c.restore();
    }
    c.fillStyle = "#cfe6f8"; c.beginPath(); c.arc(0, 0, 16, 0, Math.PI * 2); c.fill(); // the tai-chi dot
    const tex = new Th.CanvasTexture(cv);
    tri = new Th.Mesh(new Th.CircleGeometry(0.72, 40), new Th.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: Th.DoubleSide }));
    tri.position.set(0, 3.1, 2.93); tri.renderOrder = 3; // on the chest patch, facing +z
    root.add(tri);
    parts.geo(tri.geometry); parts.geo({ dispose() { tex.dispose(); tri.material.dispose(); } });
  }

  // ------------------------------------------------------------ per-step animation
  const coral = new Th.Color("#ff6b57");
  function update(ts) {
    const R = bump(ts - T.roar, 0.25, Math.max(0.1, T.roarDur - 0.65), 0.4);
    const O = sm((ts - T.orb) / T.orbDur) * (1 - sm((ts - T.flash[0]) / 0.3));
    const Fl = bump(ts - T.chain, 0.12, 0.1, 0.15), S = sm((ts - T.surge) / T.surgeDur), P = sm((ts - T.pin) / 0.25);
    const Hh = ts > T.chain + 0.33 && ts < T.pin ? 0.35 + 0.65 * S : 0;
    const C = (ts < T.burst ? 0.6 * S : 0) + 0.9 * bump(ts - T.burst, 0, 0.1, 0.5) + 0.12 * P;
    // body: breathing, rear on the roar, recoil on the flinch, thrash, pinned sag
    const breathe = 1 + 0.015 * Math.sin(ts * 2.2);
    root.position.set(jit(ts, 0.22 * Hh, 17) + jit(ts, 0.05 * R, 31), 0.5 * R - 0.55 * P + jit(ts, 0.14 * Hh, 23) + jit(ts, 0.06 * R, 37), -0.8 * Fl);
    root.rotation.set(-0.12 * R - 0.03 * Fl + jit(ts, 0.05 * Hh, 19), jit(ts, 0.09 * Hh, 13), jit(ts, 0.07 * Hh, 29));
    body.scale.set(1, breathe, 1);
    // head and jaw
    head.rotation.set(-0.45 * R - 0.1 * O - 0.3 * Fl + 0.4 * P + jit(ts, 0.1 * Hh, 21), jit(ts, 0.18 * Hh, 15), jit(ts, 0.06 * Hh, 27));
    jaw.rotation.x = Math.max(0.7 * R, 0.3 * O, 0.4 * Fl) * (1 - 0.9 * P);
    orb.set(O, ts);
    // eyes: rage always, blazing on the roar; calm and heavy once pinned
    if (P > 0.5) eyes.userData.set("calm", P); else eyes.userData.set("rage", 0.6 + 0.4 * Math.max(R, Fl));
    // tails
    for (let i = 0; i < 9; i++) {
      const g = tails[i], limp = P;
      g.rotation.z = ((0.07 + 0.05 * Hh) * Math.sin(1.6 * ts + 0.7 * i) + 0.0) * (1 - 0.8 * limp) + (i - 4) * 0.02 * limp;
      g.rotation.x = 0.05 * Math.cos(1.3 * ts + 1.1 * i) * (1 - limp) + 0.35 * limp + 0.2 * R;
    }
    // coral surge over every Kurama material
    for (const u of mats) { u.uTint.value.copy(coral); u.uTintAmt.value = Math.min(1, C); }
    if (tri) tri.material.opacity = ts < T.trigram ? 0 : sm((ts - T.trigram) / 0.25) * (ts < T.burst ? 0.6 + 0.35 * Math.abs(Math.sin(ts * 9)) : 0.35);
    return { P, Hh };
  }
  return { group: root, update, head, dispose() { eyes.userData.dispose?.(); } };
}
