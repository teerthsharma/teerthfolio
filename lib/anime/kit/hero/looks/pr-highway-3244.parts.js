// PARTS for the pr-highway-3244 look: Iskandar's red chin beard (a fan of tapered locks along the jaw) and the mane that
// streams past the nape (tapered locks from the back of the skull). Tapered tubes laid on the head field; one figure each.
import { Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cached, darker, piece } from "../body.js";
import { HF, onF, taper } from "../wear/geo.js";

const HC = [0, 0.17, 0], lerp = (a, b, t) => a + (b - a) * t;
const NC = { col: "#c04a38", shade: "#7a2a20", hi: "#e08a6a" };

function locks(specs, o, key) {
  const c = { ...NC, ...o };
  const geo = cached(`hw3244|${key}|${c.col}|${c.shade}`, () => mergeGeometries(specs.map((s, i) => {
    const hi = key !== "beard3" && i % 3 === 1, col = hi ? c.hi : c.col;
    return piece(taper(s.pts, s.r, 0.003, 14, 6), col, hi ? darker(c.hi, 0.7) : c.shade, { line: 1 });
  }).map((g) => (g.index ? g.toNonIndexed() : g))));
  return geo;
}
const fig = (engine, geo, o) => { const f = engine.figure(geo, { ink: o.ink, lineMul: 1 }); f.userData.hull.uniforms.uConst.value = 1; return f; };

// three thick tapered masses rooted under the muzzle; the centre one hangs longest
export function beardFigure(engine, o = {}) {
  const specs = [-0.38, 0, 0.38].map((th, i) => {
    const mid = i === 1 ? 1 : 0, root = onF(HF, HC, th, 0.04, 0.004), L = 0.07 + 0.04 * mid, s = Math.sign(th);
    return { r: 0.034 + 0.01 * mid, pts: [root, root.clone().add(new Vector3(s * 0.008, -L * 0.45, 0.02)), root.clone().add(new Vector3(s * 0.012, -L * 0.8, 0.032)), root.clone().add(new Vector3(-s * 0.006, -L, 0.036))] };
  });
  return fig(engine, locks(specs, o, "beard3"), o);
}

// seven long locks from the back of the skull, sweeping down and back past the nape
export function maneFigure(engine, o = {}) {
  const n = 8, specs = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), th = lerp(2.2, 4.1, t), y = lerp(0.3, 0.2, Math.abs(2 * t - 1)), root = onF(HF, HC, th, y, 0.004), L = 0.2 + 0.07 * Math.sin(i * 1.7 + 1), out = new Vector3(Math.sin(th), 0, Math.cos(th));
    specs.push({ r: 0.03, pts: [root, root.clone().addScaledVector(out, 0.04).add(new Vector3(0, -L * 0.3, 0)), root.clone().addScaledVector(out, 0.08).add(new Vector3(0.01 * (i % 2 ? 1 : -1), -L * 0.7, 0)), root.clone().addScaledVector(out, 0.1).add(new Vector3(0.02 * (t - 0.5), -L, 0))] });
  }
  return fig(engine, locks(specs, o, "mane"), o);
}
