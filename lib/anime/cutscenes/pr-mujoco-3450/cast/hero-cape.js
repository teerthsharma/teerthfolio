// HERO CAPE (E08): Saitama's white cape as a vertex-driven strip of 4 flat panels with 3 pleat folds (the "layman's cape" stitch),
// an ink hull, a collar tie knot. Attached to the seal's body with seal.attach(), so it rides the pose; the pup mesh is untouched.
//
// Geometry: a grid of COLS x ROWS quads, non-indexed (flat shaded: a pleat is a hard shadow edge), front copy + a back copy with
// reversed winding (it is cloth: seen from both sides). Point (u in -1..1, v in 0..1):
//   P = A + D L v + X u w(v) + N (pleat(i) v + wave)
//   A = (0, 0.52, -0.25) the nape;  D = (0, -cos th, -sin th) the hang direction, th = hang angle from straight down toward -z;
//   X = (1, 0, 0);  N = X x D = (0, sin th, -cos th) the outward normal;  w(v) = 0.15 + 0.12 v half width;  L = 0.5 m
//   pleat(i) = (-1)^i 0.016 (0.3 + 0.7 v)       the fold zig-zag between panels
//   wave     = a v^2 sin(16 t - 9 v + 1.1 i)     the 16 rad/s flap, growing toward the hem
// Hang angle th(t): 0.38 rad at rest (clears the tail stub), +0.25 as the crouch winds up, SNAPS to 1.35 rad horizontal at the
// strike (ones), flaps +-5 deg to f114, relaxes to 0.38 by f135. On at f70 (grows out of the nape), OFF f130-144 (E08: the home
// shot is a back view and nothing may cover the seal).
import { sm, eo3, win, lerp } from "./timeline.js";

export function buildHeroCape(ctx, T, P) {
  const { THREE } = ctx;
  const COLS = 4, ROWS = 8, L = 0.5;
  const nQ = COLS * ROWS, N = nQ * 12;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  ctx.sdf.painted(geo, ctx.sdf.paint("#f6f2ea", "#a8aec6", { line: 1 }));
  // per-panel tone: panels alternate lit #f6f2ea / mid #ddd9d4 (shadow #a8aec6 / #6f7690); the inward copy sits one step darker
  const cA = new THREE.Color("#f6f2ea"), sA = new THREE.Color("#a8aec6"), cB = new THREE.Color("#ddd9d4"), sB = new THREE.Color("#6f7690");
  const aCol = geo.attributes.aCol, aSh = geo.attributes.aShade;
  for (let q = 0; q < nQ; q++) {
    const panel = q % COLS;
    for (let c = 0; c < 2; c++) for (let v = 0; v < 6; v++) {
      const i = q * 12 + c * 6 + v, col = panel % 2 ? cB : cA, sh = panel % 2 ? sB : sA;
      const m = c ? 1 : 0.92; // copy 1 (reversed winding) faces outward/back: it takes the full tone
      aCol.setXYZ(i, col.r * m, col.g * m, col.b * m); aSh.setXYZ(i, sh.r * m, sh.g * m, sh.b * m);
    }
  }
  const fig = ctx.engine.figure(geo, { lineMul: 0.75, constant: true });
  fig.frustumCulled = false; fig.children.forEach((c) => { c.frustumCulled = false; });
  const g = new THREE.Group();
  g.add(fig);
  // collar tie knot at the throat + two short tie ends
  const knot = P.solid(new THREE.SphereGeometry(0.032, 10, 8), "#f6f2ea", "#a8aec6", { pos: [0, 0.425, 0.205], lineMul: 0.6 });
  const tieL = P.solid(new THREE.ConeGeometry(0.014, 0.075, 6), "#ddd9d4", "#6f7690", { pos: [-0.028, 0.385, 0.205], rot: [0, 0, 0.35], lineMul: 0.5 });
  const tieR = P.solid(new THREE.ConeGeometry(0.014, 0.075, 6), "#ddd9d4", "#6f7690", { pos: [0.028, 0.385, 0.205], rot: [0, 0, -0.35], lineMul: 0.5 });
  g.add(knot, tieL, tieR);
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const pt = (i, j, th, s, t, fl) => {
    const u = (i / COLS) * 2 - 1, v = j / ROWS, w = 0.15 + 0.12 * v;
    const cT = Math.cos(th), sT = Math.sin(th);
    const pl = (i % 2 ? 1 : -1) * 0.016 * (0.3 + 0.7 * v) * (1 - 0.5 * Math.min(1, th / 1.35));
    const wave = (0.007 + fl * 0.055) * v * v * Math.sin(16 * t - 9 * v + 1.1 * i);
    const d = [0, -cT, -sT], n = [0, sT, -cT];
    // grow out of the nape with s
    return [u * w * s, 0.52 + (d[1] * L * v + n[1] * (pl + wave)) * s - (1 - s) * 0.02, -0.25 + (d[2] * L * v + n[2] * (pl + wave)) * s];
  };
  function set(i, p) { pos.setXYZ(i, p[0], p[1], p[2]); }
  function update(t, tNow) {
    const { TP, at, crouch } = T;
    const on = sm(win(t, crouch, crouch + 0.2)) * (1 - sm(win(t, at(130), at(144))));
    g.visible = on > 0.001;
    if (!g.visible) return;
    const strike = tNow !== undefined && tNow >= TP && tNow < TP + 4 / T.F;
    const tc = strike ? tNow : t;                                         // the snap is drawn on ones
    let th = 0.38 + 0.25 * sm(win(tc, crouch, TP - 0.1));
    const snap = eo3(win(tc, TP, TP + 2 / T.F));
    const relax = sm(win(tc, at(114), at(135)));
    th = lerp(th, 1.35, snap * (1 - relax));
    const fl = (tc >= TP && tc < at(114)) ? 1 : (tc >= at(114) ? Math.max(0, 1 - (tc - at(114)) / 0.6) : 0);
    th += fl * 0.087 * Math.sin(16 * tc);                                  // +-5 deg flap
    let k = 0;
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
      const a = pt(i, j, th, on, tc, fl), b = pt(i + 1, j, th, on, tc, fl), c = pt(i, j + 1, th, on, tc, fl), d = pt(i + 1, j + 1, th, on, tc, fl);
      // copy 0 (faces the body): a c b / b c d ; copy 1 (reversed winding, faces out): a b c / b d c
      set(k++, a); set(k++, c); set(k++, b); set(k++, b); set(k++, c); set(k++, d);
      set(k++, a); set(k++, b); set(k++, c); set(k++, b); set(k++, d); set(k++, c);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals(); // non-indexed: exact face normals (flat shading, the pleats are hard shadow edges)
    nor.needsUpdate = true;
    fig.userData.mat.uniforms.uSmear.value.set(0, 0, -1, 0);
  }
  return { group: g, update, dispose() { geo.dispose(); } };
}
