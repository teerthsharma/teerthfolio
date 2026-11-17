// CONFORMAL STROKES: ribbons laid on the sculpted head (face marks, fur flicks, whisker dots, a mouth line), one mesh.
// A stroke is { pts: [[x, y]...] head-front metres, w0, w1 (width at the start and end), col }; every point is dropped
// onto the head surface along z, the ribbon follows the surface normal and is flat paint (unlit ink).
import { BufferAttribute, BufferGeometry, Color, Mesh, ShaderMaterial, Vector3 } from "three";

const VERT = "attribute vec3 aCol; varying vec3 vCol; void main() { vCol = aCol; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const FRAG = "varying vec3 vCol; void main() { gl_FragColor = vec4(vCol, 1.0); }";

const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
function sample(pts, per = 7) {
  if (pts.length < 3) return pts.length === 2 ? Array.from({ length: per + 1 }, (_, i) => [pts[0][0] + (pts[1][0] - pts[0][0]) * i / per, pts[0][1] + (pts[1][1] - pts[0][1]) * i / per]) : pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], d = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) { const t = k / per; out.push([cr(a[0], b[0], c[0], d[0], t), cr(a[1], b[1], c[1], d[1], t)]); }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function strokeGeometry(surf, strokes, lift = 0.0018) {
  const pos = [], col = [], idx = [], c = new Color();
  for (const s of strokes) {
    const line = sample(s.pts, s.per ?? 7), n = line.length;
    if (n < 2) continue;
    const base = pos.length / 3;
    c.set(s.col ?? "#241a24");
    const P = line.map(([x, y]) => surf.at(x, y));
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), a = P[Math.max(0, i - 1)].p, b = P[Math.min(n - 1, i + 1)].p;
      const tan = new Vector3().subVectors(b, a).normalize(), nrm = P[i].n;
      const side = new Vector3().crossVectors(tan, nrm).normalize();
      const w = ((s.w0 ?? 0.006) + ((s.w1 ?? s.w0 ?? 0.006) - (s.w0 ?? 0.006)) * t) * 0.5;
      const q = P[i].p.clone().addScaledVector(nrm, lift);
      for (const sg of [-1, 1]) { const v = q.clone().addScaledVector(side, sg * w); pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); }
      if (i > 0) { const k = base + 2 * i; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aCol", new BufferAttribute(new Float32Array(col), 3));
  g.setIndex(idx);
  return g;
}

export function strokeMesh(surf, strokes, lift) {
  const m = new Mesh(strokeGeometry(surf, strokes, lift), new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, side: 2, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  m.renderOrder = 1; m.frustumCulled = false;
  return m;
}

// a dot is a short stroke
export const dot = (x, y, r, col) => ({ pts: [[x - r, y], [x + r, y]], w0: r * 2, w1: r * 2, col, per: 1 });
