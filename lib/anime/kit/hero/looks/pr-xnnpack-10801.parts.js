// PARTS for the pr-xnnpack-10801 look: the kanji for 5 (Fifth Division) printed on the haori back, and Kyoka Suigetsu as a
// thin pale blade in two figures (body and snapped tip) that the cutscene places; it is never held.
import { BoxGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cached, darker, piece } from "../body.js";
import { HF, grown, poly, strip } from "../wear/geo.js";

const C0 = [0, 0, -0.02], R = 0.26;
const merge = (gs) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)));

// a stroke between two [u, y] points (u in metres across the back, y up), as a quad on the haori surface
const stroke = (F, a, b, w) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = (-dy / l) * w / 2, ny = (dx / l) * w / 2;
  return poly(F, C0, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]].map(([u, y]) => [Math.PI + u / R, y]), 0.0035);
};

// 五 on the back, body-local; attach to "body". F is the outer cloth radius (uniform 0.011 + haori 0.02)
export function kanjiFigure(engine, o = {}) {
  const col = o.col ?? "#1a1a28", F = grown(o.grow ?? 0.031), y0 = o.y ?? 0.15;
  const geo = cached(`xnn|kanji|${col}`, () => merge([
    stroke(F, [-0.06, y0 + 0.125], [0.06, y0 + 0.125], 0.017), stroke(F, [-0.014, y0 + 0.125], [-0.032, y0 + 0.062], 0.016),
    stroke(F, [-0.045, y0 + 0.07], [0.045, y0 + 0.07], 0.016), stroke(F, [0.045, y0 + 0.07], [0.032, y0 + 0.012], 0.016),
    stroke(F, [-0.07, y0 + 0.008], [0.072, y0 + 0.008], 0.017),
  ].map((g) => piece(g, col, darker(col, 0.7), { line: 0.2 }))));
  const fig = engine.figure(geo, { ink: o.ink, lineMul: 1 });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}

// Kyoka Suigetsu: a long thin pale blade lying along +x on its flat, grip end at the origin. `blade` is the whole sword,
// `tip` the last 0.2 m as its own figure for the snap; set tip.position / blade.visible from the cutscene
export function bladeFigures(engine, o = {}) {
  const L = o.len ?? 0.9, T = 0.2, col = o.col ?? "#f4f4f0", edge = o.edge ?? "#d8ecff";
  const part = (a, b, key) => engine.figure(cached(`xnn|blade|${key}|${L}`, () => {
    const len = b - a, mid = (a + b) / 2;
    return merge([piece(new BoxGeometry(len, 0.004, 0.026).translate(mid, 0, 0), col, darker(col, 0.8), { line: 1 }), piece(new BoxGeometry(len, 0.0044, 0.006).translate(mid, 0, 0.013), edge, darker(edge, 0.8), { line: 0.3 })]);
  }), { ink: o.ink, lineMul: 1 });
  const blade = part(0, L - T, "a"), tip = part(L - T, L, "b");
  for (const f of [blade, tip]) f.userData.hull.uniforms.uConst.value = 1;
  return { blade, tip };
}

// the forelock (one wide lock and two thin strands) lying on the forehead from the crown, falling between the eyes to the
// nose bridge, slightly right of centre, plus seven raked-back locks ending in points at the nape. Ribbons hugging the head sculpt, head-local; attach to "head"
export function forelockFigure(engine, o = {}) {
  const col = o.col ?? "#946248", sh = o.shade ?? "#6a4230", HC = [0, 0.17, 0];
  const geo = cached(`xnn|fore|${col}`, () => {
    const lock = (th0, ys, w0, w1, lift) => strip(HF, HC, ys.map((y, i) => [th0 + 0.05 * (i / (ys.length - 1)), y]), w0, w1, lift);
    const ys = [0.37, 0.34, 0.31, 0.28, 0.25, 0.225, 0.205];
    return merge([
      piece(lock(0.2, ys, 0.07, 0.006, 0.011), col, sh, { line: 1 }),
      piece(lock(0.42, ys.slice(0, 6), 0.034, 0.004, 0.0125), col, sh, { line: 1 }),
      piece(lock(-0.1, ys.slice(0, 5), 0.03, 0.004, 0.0125), col, sh, { line: 1 }),
      ...[-1.15, -0.75, -0.38, 0, 0.38, 0.75, 1.15].map((d, i) => piece(strip(HF, HC, [0.33, 0.29, 0.25, 0.21, 0.17, 0.125 - 0.012 * (i % 2)].map((y, j) => [Math.PI + d * (1 + 0.1 * j), y]), 0.055, 0.005, 0.024), col, sh, { line: 1 })),
    ]);
  });
  const fig = engine.figure(geo, { ink: o.ink, lineMul: 1 });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}
