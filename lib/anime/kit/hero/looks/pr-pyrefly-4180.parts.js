// PARTS for the pr-pyrefly-4180 look: Minato's wide Leaf forehead plate (a bent metal slab on the cloth band, rim and
// engraved spiral) and a flame hem ring for the haori (tall red tongues with an orange core). One figure each.
import { ExtrudeGeometry, Matrix4, Quaternion, Shape, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cached, darker, piece } from "../body.js";
import { HF, TAU, band, grown, normalAt, onF, poly } from "../wear/geo.js";

const HR = (x, y, z) => HF(x, y, z) - 0.013, HC = [0, 0.17, 0];
const merge = (gs) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)));

function onSurface(g, p, lift) {
  const n = normalAt(HR, p), q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), n);
  return g.applyMatrix4(new Matrix4().compose(p.clone().addScaledVector(n, lift), q, new Vector3(1, 1, 1)));
}
function slab(w, h, d, bend, r = 0.008) {
  const s = new Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: d * 0.4, bevelSize: d * 0.4, bevelSegments: 2, curveSegments: 5 }).translate(0, 0, -d / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - bend * p.getX(i) ** 2);
  g.computeVertexNormals();
  return g;
}

// the plate sits on the brow line, head-local; attach to "head"
export function plateFigure(engine, o = {}) {
  const metal = o.metal ?? "#d2d4dc", mark = o.mark ?? "#4a5468", W = 0.15, H = 0.05;
  const geo = cached(`pyrefly|plate|${metal}`, () => {
    const p = onF(HR, HC, 0, 0.262, 0.006), out = [piece(onSurface(slab(W, H, 0.008, 5.5), p, 0.018), metal, darker(metal, 0.55), { line: 1 })];
    const m = (g) => piece(onSurface(g, p, 0.0275), mark, "#2a3040", { line: 0.4 });
    out.push(m(new TorusGeometry(0.0125, 0.0022, 6, 24, TAU * 0.8)), m(new TorusGeometry(0.0065, 0.002, 6, 16, TAU * 0.8).translate(0.002, 0, 0)), m(new SphereGeometry(0.0025, 6, 4).translate(-0.006, 0.002, 0)));
    for (const s of [-1, 1]) out.push(m(new SphereGeometry(0.0028, 6, 4).translate(s * (W / 2 - 0.014), 0, 0)));
    return merge(out);
  });
  const fig = engine.figure(geo, { ink: o.ink, lineMul: 1 });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}

// the cloth band, hugging the head (tighter than the shared headband, which floats off the brow)
export function bandFigure(engine, o = {}) {
  const c = o.col ?? "#34456a", s = o.shade ?? "#1c2438", T = (x, y, z) => HF(x, y, z) - 0.006;
  const geo = cached(`pyrefly|band|${c}`, () => piece(band(T, [0, 0, 0], 0.238, 0.284, 0.011, { tilt: 0.022 }), c, s));
  return engine.figure(geo, { ink: o.ink, lineMul: 1 });
}

// tall flame tongues round the haori hem, body-local; attach to "body". The tongues start at the hem and bend toward the front
export function flameFigure(engine, o = {}) {
  const red = o.col ?? "#d83820", core = o.core ?? "#f08a3a", n = o.n ?? 16, hem = o.hem ?? 0.03, F = grown(o.grow ?? 0.02), C0 = [0, 0, -0.02];
  const geo = cached(`pyrefly|flame|${red}|${core}|${n}`, () => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const th = 0.22 + (i / (n - 1)) * (TAU - 0.44), d = (TAU - 0.44) / n * 0.7, h = 0.2 + 0.07 * Math.sin(i * 2.3 + 1), lean = (i % 2 ? 0.35 : -0.25) * d;
      out.push(piece(poly(F, C0, [[th - d, hem + 0.004], [th - d * 0.55, hem + h * 0.45], [th + lean, hem + h], [th + d * 0.5, hem + h * 0.5], [th + d, hem + 0.004]], 0.004), red, darker(red, 0.6), { line: 0.8 }));
      out.push(piece(poly(F, C0, [[th - d * 0.5, hem + 0.004], [th + lean * 0.4, hem + h * 0.55], [th + d * 0.5, hem + 0.004]], 0.0055), core, darker(core, 0.6), { line: 0.3 }));
    }
    return merge(out);
  });
  const fig = engine.figure(geo, { ink: o.ink, lineMul: 1 });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}
