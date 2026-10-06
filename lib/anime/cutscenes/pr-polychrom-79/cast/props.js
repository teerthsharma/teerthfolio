// CAST props for pr-polychrom-79: everything the seal wields or leaves on the ground. All 3D, cel-lit via engine.figure.
// Reusable helpers worth promoting: cloth() (a free-standing cloth layer as a mesh), starFlare() (additive glint card).
import { PUP_HEAD2 } from "../../../pup.js";

// a cloth layer (kit COSTUME_LAYERS) as its own mesh, so it can sway, flare or tear off independently of the body shell.
export function cloth(ctx, layers, h = 0.014, ink = "#3a0a10") {
  const prims = layers.flatMap((L) => ctx.kit.COSTUME_LAYERS[L.type](L));
  const geo = ctx.sdf.polygonize(prims, h);
  const f = ctx.engine.figure(geo, { head: PUP_HEAD2, ink, lineMul: 1.2, constant: true });
  f.userData.geo = geo;
  return f;
}

const fig = (ctx, geo, col, shade, o = {}) => {
  const f = ctx.engine.figure(ctx.sdf.painted(geo, ctx.sdf.paint(col, shade ?? col, { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.9, ink: o.ink ?? "#3a0a10", constant: true });
  if (o.pos) f.position.set(...o.pos);
  if (o.rot) f.rotation.set(...o.rot);
  return f;
};

// an additive 4-point star card (glint / spark). Colour <= 1 so it never crosses the bloom threshold on its own.
export function starFlare(ctx, col = "#fff2c0", size = 0.3) {
  const T = ctx.THREE, g = new T.Group();
  const m = new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
  const bar = new T.PlaneGeometry(size, size * 0.09), bar2 = new T.PlaneGeometry(size * 0.09, size);
  g.add(new T.Mesh(bar, m), new T.Mesh(bar2, m));
  const d = new T.Mesh(bar.clone(), m); d.rotation.z = Math.PI / 4; d.scale.setScalar(0.55);
  const d2 = new T.Mesh(bar.clone(), m); d2.rotation.z = -Math.PI / 4; d2.scale.setScalar(0.55);
  g.add(d, d2);
  g.userData.mat = m; g.userData.geos = [bar, bar2];
  g.traverse((o) => o.layers.set(1));
  return g;
}

// KEY OF THE HEAVENS: a bow ring, a shaft, three teeth, a gem, engraved bands. Gold #ffe27a / #ffb020 / #c98a12.
export function buildKey(ctx) {
  const T = ctx.THREE, g = new T.Group(), gold = "#ffb020", sh = "#c98a12", lit = "#ffe27a";
  g.add(fig(ctx, new T.TorusGeometry(0.075, 0.022, 10, 28), gold, sh, { pos: [0, 0.2, 0] }));
  g.add(fig(ctx, new T.TorusGeometry(0.042, 0.012, 8, 20), lit, gold, { pos: [0, 0.2, 0] }));
  g.add(fig(ctx, new T.SphereGeometry(0.026, 12, 10), "#d3122e", "#8a0c1e", { pos: [0, 0.2, 0.012] }));
  g.add(fig(ctx, new T.CylinderGeometry(0.016, 0.02, 0.34, 10), gold, sh, { pos: [0, 0.0, 0] }));
  for (let i = 0; i < 3; i++) g.add(fig(ctx, new T.BoxGeometry(0.075 - i * 0.012, 0.03, 0.02), lit, gold, { pos: [0.045, -0.1 - i * 0.045, 0] }));
  for (const y of [0.09, 0.03]) g.add(fig(ctx, new T.TorusGeometry(0.024, 0.007, 6, 14).rotateX(Math.PI / 2), lit, gold, { pos: [0, y, 0] }));
  g.userData.glint = starFlare(ctx, "#fff2c0", 0.34); g.userData.glint.position.set(0, 0.2, 0.06); g.add(g.userData.glint);
  return g;
}

// EA: a black drill-sword, 3 red rotating segments. Local +y is the blade. Each segment = a black core + 4 red fins + a ridge ring;
// spin about y = angle, so a fin sweeping round reads as a drill. Returns { group, segs, setSpin(angles[3]) }.
export function buildEa(ctx) {
  const T = ctx.THREE, g = new T.Group(), segs = [];
  g.add(fig(ctx, new T.CylinderGeometry(0.02, 0.022, 0.22, 10), "#1a0a10", "#07060a", { pos: [0, 0.0, 0] }));            // hilt
  g.add(fig(ctx, new T.BoxGeometry(0.2, 0.025, 0.04), "#1a0a10", "#07060a", { pos: [0, 0.12, 0] }));                      // guard
  g.add(fig(ctx, new T.SphereGeometry(0.03, 10, 8), "#ff2a3a", "#d3122e", { pos: [0, 0.12, 0.025] }));                    // guard gem
  for (let s = 0; s < 3; s++) {
    const sg = new T.Group(), y0 = 0.15 + s * 0.28, len = 0.26, r = 0.055 - s * 0.012;
    sg.position.y = y0;
    sg.add(fig(ctx, new T.CylinderGeometry(r * 0.9, r, len, 12), "#1a0a10", "#07060a", { pos: [0, len / 2, 0] }));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2, fin = fig(ctx, new T.BoxGeometry(r * 1.9, len * 0.8, 0.012), s === 1 ? "#ff2a3a" : "#d3122e", "#8a0c1e", { pos: [0, len / 2, 0] });
      fin.rotation.y = a; sg.add(fin);
    }
    sg.add(fig(ctx, new T.TorusGeometry(r * 1.05, 0.009, 6, 18).rotateX(Math.PI / 2), "#ff2a3a", "#d3122e", { pos: [0, len, 0] }));
    g.add(sg); segs.push(sg);
  }
  g.add(fig(ctx, new T.ConeGeometry(0.03, 0.14, 10), "#1a0a10", "#07060a", { pos: [0, 0.15 + 3 * 0.28 - 0.02 + 0.07, 0] }));  // tip
  return { group: g, segs, setSpin(a) { for (let i = 0; i < 3; i++) segs[i].rotation.y = a * (i % 2 ? -1 : 1) * (1 + i * 0.12); } };
}

// the invisible-air shimmer on Saber's sword: a tapered additive ribbon, pale blue-white
export function airWave(ctx) {
  const T = ctx.THREE, m = new T.MeshBasicMaterial({ color: "#a8c8f0", transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
  const geo = new T.PlaneGeometry(0.1, 0.9, 1, 6), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = (p.getY(i) + 0.45) / 0.9; p.setX(i, p.getX(i) * (1 - 0.7 * v) + 0.03 * Math.sin(v * 9)); }
  const mesh = new T.Mesh(geo, m); mesh.layers.set(1); mesh.userData.mat = m;
  return mesh;
}

// a sword hilt standing in the ground: grip, gold cross-guard, pommel, a half-buried blade (the 16 mismatched frees)
export function hilt(ctx) {
  const T = ctx.THREE, g = new T.Group();
  g.add(fig(ctx, new T.BoxGeometry(0.07, 0.5, 0.012), "#8a98b8", "#3a4560", { pos: [0, 0.22, 0] }));
  g.add(fig(ctx, new T.BoxGeometry(0.22, 0.03, 0.035), "#ffb020", "#c98a12", { pos: [0, 0.5, 0] }));
  g.add(fig(ctx, new T.CylinderGeometry(0.018, 0.018, 0.18, 8), "#6a0c1e", "#3a0610", { pos: [0, 0.6, 0] }));
  g.add(fig(ctx, new T.SphereGeometry(0.03, 8, 6), "#ffe27a", "#c98a12", { pos: [0, 0.7, 0] }));
  return g;
}
