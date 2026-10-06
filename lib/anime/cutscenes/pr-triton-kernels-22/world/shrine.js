// MALEVOLENT SHRINE (bible: building; mirror ripple; skull mound). Geometry only, ported from worlds/shrine.js (kit3d) and
// re-painted in the protected ink palette; the FRAME is the owner's symmetric shrine: horn crown, orange eave, two red lacquer
// pillars, a black maw of human teeth, rubble and skull mounds, dead trees, and its mirror in the lake.
//
// Local frame: x across, y up, front +z, mound centre at the origin; the root is placed at z = -78 and scaled by S = 2.7
// (16 m tall in kit units -> 43 m ~ the bible's 47 m x 0.9) and 0.88 across (the frame's shrine is narrower than tall).
// Mirror: a second root with scale.y = -1 about the water line (y = 0), sharing geometry and materials; it takes the same rise,
// jaw and dissolve, plus a 24-frame ripple  dx = 0.05 sin(2 pi t) , dy = 0.015 sin(2 pi t + 1).
//
// ANIMATION (all pure functions of the stepped clock t):
//   rise     k = (t - rise)/riseDur ; scale.y = bo(k)           back.out from the waterline (no submerged geometry, no stray mirror)
//   jaw      each jaw beat j: open_j = sm((t - tj)/0.10) (1 - 0.6 sm((t - tj - 0.12)/0.40)); the jaw is the max over j,
//            floored at 0.35 once the first word has been said; snaps shut over 0.12 s at `close`.
//            lower jaw y -= 2.2 open (+ pitch 0.05 open), upper jaw y += 0.3 open: the HINGE reads at (0, 5.2, 6.0) scaled.
//   dissolve s = sm((t - dissolve)/dur): scale.y *= 1 - s, x jitter 0.03 s sin(97 t): the FX layer throws the ink flakes
//   rub      the whole shrine is hidden beyond the rub radius (dist 78 m from the seal)
//   easter egg 4: the skull mound holds 17 skulls and 804 bones (the PR numbers).
import { BoxGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, TorusGeometry } from "three";
import { bareTree, boulder, flipX, gableRoof, gumArc, hipRoof, horn, merge, rng, skull, teeth } from "../../../kit3d.js";
import { paint, painted } from "../../../sdf.js";
import { bo, sm, surf } from "./util.js";

export const SHRINE_Z = -78, SCALE = 2.7;

// geometry, built once and shared by the shrine and its mirror
function geometry() {
  const R = rng(17), G = {};
  const hm = (x, z) => 1.6 * Math.sqrt(Math.max(0, 1 - (x / 12.6) ** 2 - (z / 5) ** 2));
  const rub = [boulder([12.6, 1.6, 5], [0, -0.1, 0], 1)], bone = [], dark = [];
  for (let i = 0; i < 140; i++) { const a = R() * 6.2832, r = Math.sqrt(R()) * 0.98, x = Math.cos(a) * r * 12.6, z = Math.sin(a) * r * 5, s = 0.25 + R() ** 2 * 0.9;
    rub.push(boulder([s * 1.2, s * 0.9, s], [x, hm(x, z) - s * 0.3, z], i + 2)); }
  for (let i = 0; i < 17; i++) {                       // 17 skulls: the PR's 17 tests
    const a = R() * 6.2832, r = Math.sqrt(R()) * 0.95, x = Math.cos(a) * r * 12.6, z = Math.sin(a) * r * 5, s = 0.2 + R() * 0.2;
    const k = skull(s, { broken: R() > 0.5 }), yaw = (R() - 0.5) * 1.6;
    bone.push(k.bone.rotateY(yaw).translate(x, hm(x, z) + s * 0.5, z)); dark.push(k.dark.rotateY(yaw).translate(x, hm(x, z) + s * 0.5, z)); }
  for (let i = 0; i < 804; i++) {                      // 804 bones: the PR's 804 lines added (cheap 5-sided shafts)
    const a = R() * 6.2832, r = Math.sqrt(R()) * 0.97, x = Math.cos(a) * r * 12.6, z = Math.sin(a) * r * 5, l = 0.35 + R() * 0.9;
    bone.push(new CylinderGeometry(0.035 + R() * 0.03, 0.05 + R() * 0.03, l, 5).rotateZ(Math.PI / 2 * (0.3 + R() * 1.4)).rotateY(R() * 6.28).translate(x, hm(x, z) + 0.05, z)); }
  G.heap = merge(rub, "heap"); G.bones = merge(bone, "bones"); G.sockets = merge(dark, "sockets");
  // the pagoda: body, black doorway
  const zf = 2.4;
  G.body = merge([new BoxGeometry(11, 0.4, 6.4).translate(0, 1.5, 0), new BoxGeometry(9.2, 6.2, 4.6).translate(0, 4.8, -0.1)], "body");
  G.door = new BoxGeometry(8.6, 6.1, 0.1).translate(0, 4.75, zf + 0.02);
  // the maw: two rows of human teeth per jaw on gums (closed gap: upper tips 4.2, lower tips 5.0, interlocked)
  const mouth = (span, arc, rt, len, n, yU, yL, z, sd, xf = (g) => g) => {
    const U = { T: [], G: [] }, L = { T: [], G: [] };
    for (const [down, y, s, o] of [[true, yU, 1, U], [false, yL, -1, L]]) {
      o.T.push(xf(teeth(n, span, len, rt, down, sd + s, arc, 0.05).translate(0, y, z + 0.2)));
      o.T.push(xf(teeth(n + 1, span * 0.9, len * 0.75, rt * 0.8, down, sd + 10 + s, arc, 0.1).translate(0, y - s * 0.05, z - 0.25)));
      o.G.push(xf(gumArc(span * 1.04, arc, rt * 0.75, down).translate(0, y + s * rt * 0.35, z)));
    }
    return { U, L };
  };
  const m = mouth(5.6, 0.8, 0.42, 1.05, 9, 5.25, 3.95, zf + 0.3, 3);
  G.teethU = merge(m.U.T, "teethU"); G.gumU = merge(m.U.G, "gumU"); G.teethL = merge(m.L.T, "teethL"); G.gumL = merge(m.L.G, "gumL");
  const sideT = [], sideG = [];
  for (const s of [-1, 1]) { const q = mouth(2.6, 0.9, 0.3, 0.7, 5, 5.7, 3.4, 0, 40 + s, (g) => g.rotateY(s * 1.05).translate(s * 5.9, 0, 0.4));
    sideT.push(...q.U.T, ...q.L.T); sideG.push(...q.U.G, ...q.L.G); }
  G.sideT = merge(sideT, "sideT"); G.sideG = merge(sideG, "sideG");
  const c = mouth(1.9, 0.5, 0.17, 0.36, 6, 12.55, 11.75, 3.95, 60);
  G.crestT = merge([...c.U.T, ...c.L.T], "crestT"); G.crestG = merge([...c.U.G, ...c.L.G], "crestG");
  G.crestMaw = new SphereGeometry(1, 24, 12).scale(1.3, 0.8, 0.3).translate(0, 12.15, 3.75);
  // lacquer pillars with corbels, the beams
  const red = [];
  for (const x of [-4.9, 4.9]) red.push(new CylinderGeometry(0.55, 0.6, 6.2, 18).translate(x, 4.8, zf + 0.3), new BoxGeometry(1.5, 0.9, 1.0).translate(x, 7.9, zf + 0.3),
    new TorusGeometry(0.45, 0.14, 8, 16).translate(x, 7.9, zf + 0.85), new CylinderGeometry(0.55, 0.6, 6.2, 18).translate(x, 4.8, -2.3));
  red.push(new BoxGeometry(11.2, 0.55, 0.7).translate(0, 8.3, zf + 0.3), new BoxGeometry(10.2, 0.3, 0.5).translate(0, 7.55, zf + 0.3));
  G.lacquer = merge(red, "lacquer");
  // the ember bracket band under the eave: it glows orange
  const brk = [];
  for (const [y, w, n, dz] of [[8.85, 5.6, 30, 0.7], [9.2, 6.6, 36, 1.2], [9.55, 7.6, 42, 1.7], [9.9, 8.6, 48, 2.2]]) {
    for (let i = 0; i < n; i++) brk.push(new BoxGeometry(w * 2 / n * 0.75, 0.32, 0.9).translate(-w + w * 2 * (i + 0.5) / n, y, zf + dz - 0.4));
    brk.push(new BoxGeometry(w * 2, 0.08, 0.5).translate(0, y + 0.22, zf + dz - 0.4));
  }
  G.brackets = merge(brk, "brackets");
  G.roof = merge([hipRoof(10.2, 5.4, 0.55, 1.7).translate(0, 10.15, 0), gableRoof(6.6, 3.0, 3.9, 0.4, 0.8).translate(0, 10.6, 0)], "roof");
  // the horn crown: crescents opening inward (two large outer, two middle), a small inner pair, a ringed finial
  const horns = [];
  for (const [x, y, h, r, b, cu] of [[6.9, 10.6, 5.8, 0.85, 0.72, 1.65], [4.4, 11.9, 4.6, 0.66, 0.7, 1.6], [1.6, 13.6, 2.2, 0.4, 0.9, 0]])
    for (const s of [-1, 1]) horns.push((s < 0 ? flipX(horn(r, h, b, 24, cu, 0.06)) : horn(r, h, b, 24, cu, 0.06)).translate(s * x, y, 0.3));
  horns.push(new CylinderGeometry(0.12, 0.2, 1.2, 8).translate(0, 14.6, 0), new TorusGeometry(0.4, 0.09, 8, 20).translate(0, 15.0, 0));
  G.horns = merge(horns, "horns");
  G.trees = merge([bareTree([-7.3, 1.2, 1.0], 1.5, 3), bareTree([7.4, 1.2, 1.0], 1.4, 8)], "trees");
  return G;
}

// [geometry key, colour, shade, set id, uniforms, hull px mul, jaw group]
const PARTS = [
  ["heap", "#20323c", "#030807", 0.5, { stone: [3, 1.6, 1.0, 0.2] }, 0, "fix"],
  ["bones", "#cfc8b0", "#2a2a30", 0.51, { stone: [3, 3, 0.5, 0.1] }, 0, "fix"],
  ["sockets", "#050206", "#000000", 0.511, {}, 0, "fix"],
  ["body", "#16222a", "#050e16", 0.55, { stone: [3, 1.2, 0.6, 0.3] }, 0.9, "fix"],
  ["door", "#050206", "#000000", 0.556, {}, 0, "fix"],
  ["teethU", "#dbe4f0", "#7a8aa8", 0.57, { gloss: [0.9, 60, 0.3, 0], emit: [0.02, 0.03, 0.04] }, 0.6, "up"],
  ["gumU", "#6a2636", "#24060e", 0.555, { gloss: [0.6, 40, 0.2, 0] }, 0, "up"],
  ["teethL", "#dbe4f0", "#7a8aa8", 0.571, { gloss: [0.9, 60, 0.3, 0], emit: [0.02, 0.03, 0.04] }, 0.6, "low"],
  ["gumL", "#6a2636", "#24060e", 0.5551, { gloss: [0.6, 40, 0.2, 0] }, 0, "low"],
  ["sideT", "#dbe4f0", "#7a8aa8", 0.572, { gloss: [0.9, 60, 0.3, 0] }, 0.5, "fix"],
  ["sideG", "#6a2636", "#24060e", 0.5552, {}, 0, "fix"],
  ["crestMaw", "#050206", "#000000", 0.5561, {}, 0, "fix"],
  ["crestG", "#9a4456", "#3a0c18", 0.5562, {}, 0, "fix"],
  ["crestT", "#e6f0f4", "#9aaab8", 0.5721, { emit: [0.25, 0.3, 0.32] }, 0, "fix"],
  ["lacquer", "#d1260c", "#5a0a0a", 0.58, { gloss: [0.5, 40, 0.3, 0], emit: [0.3, 0.035, 0.0] }, 0.9, "fix"],
  ["brackets", "#ff9a2a", "#a02a08", 0.585, { emit: [0.4, 0.14, 0.01], glow: [0, 25.9, -64.5, 8.6, "#ffb040"] }, 0, "fix"],
  ["roof", "#1a3a3a", "#010302", 0.59, { stone: [4, 2.6, 0.9, 0.6], glow: [0, 25.4, -64.5, 14.8, "#ff7a2a"] }, 1.1, "fix"],
  ["horns", "#b8b0e8", "#5a4a98", 0.6, { gloss: [0.9, 50, 0.6, 0] }, 1.1, "fix"],
  ["trees", "#100c0a", "#020101", 0.61, {}, 0.5, "fix"],
];

export function buildShrine(ctx, T) {
  const { engine } = ctx;
  const G = geometry();
  const root = new Group(), mroot = new Group(), pool = new Group();
  const mats = [];
  root.position.set(0, 0, SHRINE_Z); mroot.position.set(0, 0, SHRINE_Z);
  const body = new Group(), mbody = new Group();
  body.scale.x = mbody.scale.x = 0.88; mbody.scale.y = -1;
  root.add(body); mroot.add(mbody);
  const jaws = { fix: [new Group(), new Group()], up: [new Group(), new Group()], low: [new Group(), new Group()] };
  for (const k of Object.keys(jaws)) { body.add(jaws[k][0]); mbody.add(jaws[k][1]); }
  for (const [key, col, shade, id, f, ink, grp] of PARTS) {
    const g = G[key]; painted(g, paint(col, shade));
    const m = surf(engine, g, col, shade, id, { ...f, ink: ink || 0 });
    jaws[grp][0].add(m);
    const mm = new Mesh(g, m.material); jaws[grp][1].add(mm);   // the mirror shares geometry and material, no hull
    mats.push(m.material);
  }
  const S = SCALE;
  root.scale.set(S, S, S); mroot.scale.set(S, S, S);
  pool.add(root, mroot);

  const jawAt = (t) => {
    let o = 0;
    for (const tj of T.jaw) o = Math.max(o, sm((t - tj) / 0.10) * (1 - 0.6 * sm((t - tj - 0.12) / 0.40)));
    if (t > T.jaw[0] + 0.5) o = Math.max(o, 0.35);                       // between words the mouth stays half open
    if (t >= T.close) o = 0.35 * (1 - sm((t - T.close) / 0.12));         // the snap: shut in 3 drawings
    return o;
  };
  return {
    object: pool,
    update(t, dist = 78, rubR = 1e5) {
      const k = (t - T.rise) / T.riseDur;
      const diss = sm((t - T.dissolve) / T.dissolveDur);
      const vis = sm((rubR - dist) / 10);
      let sy = (k <= 0 ? 0 : bo(k)) * (1 - diss) * vis;
      const on = sy > 0.001;
      root.visible = mroot.visible = on;
      if (!on) return;
      const open = jawAt(t);
      const jx = 0.8 * diss * Math.sin(97 * t);
      root.scale.set(S * (1 + 0.02 * diss), S * sy, S); mroot.scale.set(S * (1 + 0.02 * diss), S * sy, S);
      const rp = 0.05 * Math.sin(6.2832 * t), rq = 0.015 * Math.sin(6.2832 * t + 1);   // 24-frame mirror ripple (1 s period)
      root.position.x = jx; mroot.position.x = jx + rp; mroot.position.y = rq;
      for (let i = 0; i < 2; i++) {
        jaws.low[i].position.y = -2.2 * open; jaws.low[i].rotation.x = 0.05 * open;
        jaws.up[i].position.y = 0.3 * open;
      }
    },
    dispose() { for (const g of Object.values(G)) g.dispose(); for (const m of mats) m.dispose(); },
  };
}
