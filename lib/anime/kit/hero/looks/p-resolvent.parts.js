// PARTS for the p-resolvent look: Frieren's twin tails (tapered drawn locks with a hard shadow side), the face-framing
// side locks, the red earring rings at the tail roots and the neck clasp. Each is a figure the hero attaches to its head or body pivot.
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paint, polygonize } from "../../../sdf.js";
import { cached, darker, fieldOf, headPrims, piece } from "../body.js";

const GOLD = "#d9a93a", RED = "#c8262c", HAIR = "#d9dcec", HAIR_SH = "#8f95bd";

function build(engine, geo, lineMul = 1.2) {
  const fig = engine.figure(geo, { ink: "#1a0e16", lineMul });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}

// a flat tapered lock swept along pts: width w(t) across, thickness th(t), closed at both ends, leaf profile to a point
function lock(pts, w0, th0, wFn = (t) => Math.sin(Math.PI * Math.min(1, 0.32 + 0.68 * (1 - t) ** 0.8)) ** 0.5 * (1 - t ** 3)) {
  const c = new CatmullRomCurve3(pts.map((p) => new Vector3(...p))), N = 28, M = 10, fr = c.computeFrenetFrames(N, false), pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = c.getPoint(t), k = Math.max(0.0, wFn(t)), a = w0 * k, b = th0 * k;
    for (let j = 0; j < M; j++) { const u = (j / M) * Math.PI * 2, q = p.clone().addScaledVector(fr.normals[i], Math.cos(u) * a).addScaledVector(fr.binormals[i], Math.sin(u) * b); pos.push(q.x, q.y, q.z); }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + ((j + 1) % M), c2 = a + M, d = b + M; idx.push(a, b, c2, b, d, c2); }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// wind in 0..1 pushes the tails out and back, as the cutscene lifts them
export function tails(engine, wind = 0) {
  const geo = cached(`resolvent|tails|${wind}`, () => {
    const parts = [];
    for (const s of [1, -1]) {
      const out = 0.05 * wind, back = -0.1 * wind, up = 0.1 * wind;
      const root = [0.14 * s, 0.34, -0.06];
      const strand = (dx, dz, len, w, shade) => {
        const pts = [[root[0] + dx * 0.3, root[1], root[2]], [0.27 * s + dx + out * s, 0.22, -0.1 + dz], [0.33 * s + dx + out * 1.5 * s, 0.04 + up, -0.1 + dz + back * 0.4],
          [0.35 * s + dx + out * 2 * s, -0.14 * len + up * 2, -0.1 + dz + back * 0.7], [0.35 * s + dx + out * 2.4 * s + 0.01 * s, -0.31 * len + up * 3, -0.1 + dz + back], [0.34 * s + dx + out * 2.6 * s + 0.03 * s, -0.43 * len + up * 3.5, -0.1 + dz + back * 1.2]];
        parts.push(piece(lock(pts, w, 0.034), HAIR, shade).toNonIndexed());
      };
      strand(0, 0, 1, 0.04, HAIR_SH);
      strand(0.026 * s, 0.012, 0.88, 0.03, darker(HAIR_SH, 0.9));
      strand(-0.024 * s, -0.01, 0.8, 0.028, HAIR_SH);
    }
    return mergeGeometries(parts);
  });
  return build(engine, geo, 1.3);
}

// the two side locks that frame the face in front of the ears, ending in a point at the jaw
export function sideLocks(engine) {
  const geo = cached("resolvent|side", () => {
    const parts = [];
    for (const s of [1, -1]) parts.push(piece(lock([[0.15 * s, 0.31, 0.09], [0.2 * s, 0.22, 0.11], [0.215 * s, 0.14, 0.1], [0.212 * s, 0.085, 0.095]], 0.026, 0.016), HAIR, HAIR_SH).toNonIndexed());
    return mergeGeometries(parts);
  });
  return build(engine, geo);
}

export function bands(engine) {
  const geo = cached("resolvent|bands", () => {
    const parts = [];
    for (const s of [1, -1]) parts.push(piece(new TorusGeometry(0.03, 0.009, 8, 20).rotateY(Math.PI / 2).rotateZ(0.5 * s).translate(0.15 * s, 0.33, -0.06), RED, darker(RED, 0.55)).toNonIndexed());
    return mergeGeometries(parts);
  });
  return build(engine, geo);
}

export function clasp(engine) {
  const geo = cached("resolvent|clasp", () => piece(new SphereGeometry(0.02, 14, 8).scale(1, 1, 0.45).translate(0, 0.46, 0.2), GOLD, darker(GOLD, 0.55)).toNonIndexed());
  return build(engine, geo);
}

// the scalp cap: the dome grown a hair's thickness, cut at a straight blunt fringe over the brow and carried down the
// back to the nape, then drawn into locks by thin shadow-tone seams that run from the crown to the fringe
export function cap(engine) {
  const geo = cached("resolvent|cap", () => {
    const m = paint(HAIR, HAIR_SH), F = fieldOf(headPrims({ coat: HAIR, shade: HAIR_SH })), G = 0.016, C = [0, 0.17, 0];
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const hairline = (x, z) => {
      const front = clamp((z + 0.02) / 0.1), notch = 0.014 * Math.abs(((Math.abs(x) * 24 + 0.5) % 2) - 1);
      return 0.262 - notch * front - 0.24 * (1 - front);
    };
    const f = (x, y, z) => Math.max(F(x, y, z) - G, hairline(x, z) - y);
    const parts = [polygonize([{ f, m, k: 0, lo: [-0.3, 0, -0.3], hi: [0.3, 0.5, 0.3] }], 0.006)];
    const surf = (phi, th, lift) => {
      const d = new Vector3(Math.sin(phi) * Math.sin(th), Math.cos(phi), Math.sin(phi) * Math.cos(th)); let a = 0.05, b = 0.5;
      for (let i = 0; i < 28; i++) { const mid = (a + b) / 2; if (F(C[0] + d.x * mid, C[1] + d.y * mid, C[2] + d.z * mid) - G < 0) a = mid; else b = mid; }
      return new Vector3(C[0] + d.x * (a + lift), C[1] + d.y * (a + lift), C[2] + d.z * (a + lift));
    };
    for (const th of [-1.15, -0.8, -0.45, -0.15, 0.15, 0.45, 0.8, 1.15]) {
      const pts = [];
      for (let phi = 0.14; phi < 1.5; phi += 0.06) { const p = surf(phi, th, 0.0015); if (p.y < hairline(p.x, p.z) + 0.01) break; pts.push(p); }
      if (pts.length > 3) parts.push(piece(new TubeGeometry(new CatmullRomCurve3(pts), 24, 0.0032, 5, false), darker(HAIR_SH, 0.8), darker(HAIR_SH, 0.7), { line: 0.4 }));
    }
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  });
  return build(engine, geo, 1.4);
}
