// Ported from components/world/cutscene/cel.js; the face path only (faceMesh, faceGeometry, faceParts); its notes live with the original.

import { Mesh, BufferAttribute, BufferGeometry, CircleGeometry, Color, DoubleSide, ShaderMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const PACK = `
  uniform float uPack;
  vec4 pack_(vec4 c) { c.z = mix(c.z, -c.w + 0.02 * (c.z + c.w), uPack); return c; }`;
const U = () => ({ uPack: { value: 0 } });

export function faceMaterial() {
  return new ShaderMaterial({
    uniforms: U(),
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    vertexShader: `
      attribute vec3 color;
      varying vec3 vC;
      ${PACK}
      void main() { vC = color; gl_Position = pack_(projectionMatrix * modelViewMatrix * vec4(position, 1.0)); }`,
    fragmentShader: `
      varying vec3 vC;
      void main() { gl_FragColor = vec4(vC, 0.99); }`,
  });
}

function paint(g, hex) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  if (!n.attributes.normal) n.computeVertexNormals();
  const c = new Color(hex);
  const k = n.attributes.position.count;
  const a = new Float32Array(k * 3);
  for (let i = 0; i < k; i++) a.set([c.r, c.g, c.b], i * 3);
  n.setAttribute("color", new BufferAttribute(a, 3));
  return n;
}
export function faceParts(f, head, r) {
  const out = [];
  const [hx, hy, hz] = head;
  const zAt = (x, y) => hz + r * Math.sqrt(Math.max(0.12, 1 - (x / 0.94) ** 2 - (y / 1.12) ** 2)) + 0.015;
  let layer = 0;
  const flat = (g, hex) => {
    layer++;
    const p = paint(g, hex);
    p.deleteAttribute("normal");
    out.push(p);
  };
  const disc = (x, y, w, h, hex, tilt = 0) => {
    const g = new CircleGeometry(1, 16).scale(w * r, h * r, 1).rotateZ(tilt).translate(hx + x * r, hy + y * r, zAt(x, y) + layer * 0.004);
    flat(g, hex);
  };
  const stroke = (pts, w, hex) => {
    const pos = [];
    const col = new Color(hex);
    const P = pts.map(([x, y]) => [hx + x * r, hy + y * r, zAt(x, y) + layer * 0.004]);
    for (let i = 0; i < P.length - 1; i++) {
      const [x0, y0, z0] = P[i];
      const [x1, y1, z1] = P[i + 1];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const d = Math.hypot(dx, dy) || 1;
      const nx = (-dy / d) * w * r * 0.5;
      const ny = (dx / d) * w * r * 0.5;
      pos.push(x0 + nx, y0 + ny, z0, x0 - nx, y0 - ny, z0, x1 + nx, y1 + ny, z1, x1 + nx, y1 + ny, z1, x0 - nx, y0 - ny, z0, x1 - nx, y1 - ny, z1);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    const a = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) a.set([col.r, col.g, col.b], i);
    g.setAttribute("color", new BufferAttribute(a, 3));
    out.push(g);
    layer++;
  };
  const ink = "#1c1226";
  const e = f.eyes === null ? null : f.eyes ?? { shape: "round", iris: "#3a2a5a" };
  const shape = {
    round: { w: 0.25, h: 0.3, iris: 0.8, tilt: 0 },
    sharp: { w: 0.27, h: 0.2, iris: 0.8, tilt: 0.22 },
    narrow: { w: 0.27, h: 0.13, iris: 0.7, tilt: 0.15 },
    hooded: { w: 0.25, h: 0.16, iris: 0.8, tilt: 0.05 },
    socket: { w: 0.25, h: 0.3, iris: 0.34, tilt: 0.1 },
  }[e?.shape ?? "round"];
  const ex = 0.4;
  const ey = 0.06;
  for (const s of e ? [-1, 1] : []) {
    const tilt = s * shape.tilt;
    if (e.shape === "socket") {
      disc(s * ex, ey, shape.w, shape.h, "#10061c", tilt);
      disc(s * ex, ey - 0.02, shape.w * 0.38, shape.h * 0.4, e.iris, 0);
    } else {
      disc(s * ex, ey, shape.w, shape.h, e.sclera ?? "#fbfaf7", tilt);
      disc(s * ex, ey - 0.012, shape.w * shape.iris, shape.h * 0.98, e.iris, tilt);
      disc(s * ex, ey - 0.012, shape.w * 0.3, shape.h * 0.6, ink, 0);
      disc(s * ex + 0.06, ey + 0.07, 0.04, 0.045, "#ffffff", 0);
      stroke([[s * (ex - 0.22), ey + shape.h * 0.82], [s * (ex + 0.22), ey + shape.h * 0.95 + s * 0 + 0.0]], 0.07, ink);
      if (e.extra) disc(s * (ex + 0.04), ey - 0.26, 0.09, 0.05, e.iris, tilt);
    }
  }
  if (f.brow) {
    const b = f.brow;
    for (const s of [-1, 1]) {
      const y0 = 0.4 - (b.tilt ?? 0) * 0.3;
      stroke([[s * 0.2, y0 - (b.tilt ?? 0) * 0.5], [s * 0.62, y0 + (b.tilt ?? 0) * 0.6]], b.thick ?? 0.08, b.color ?? ink);
    }
  }
  if (f.nose === "hole") {
    disc(0, -0.2, 0.06, 0.1, "#10061c", 0);
  } else {
    stroke([[0.02, -0.12], [-0.03, -0.22], [0.05, -0.23]], 0.04, "#c68a70");
  }
  const m = f.mouth?.kind;
  const mc = "#5a1424";
  if (m === "smile") stroke([[-0.22, -0.4], [-0.1, -0.5], [0.1, -0.5], [0.22, -0.4]], 0.07, mc);
  else if (m === "smirk") stroke([[-0.2, -0.46], [0, -0.48], [0.18, -0.46], [0.3, -0.36]], 0.07, mc);
  else if (m === "flat") stroke([[-0.18, -0.46], [0.18, -0.46]], 0.07, mc);
  else if (m === "frown") stroke([[-0.2, -0.52], [-0.08, -0.43], [0.08, -0.43], [0.2, -0.52]], 0.07, mc);
  else if (m === "open") {
    disc(0, -0.46, 0.13, 0.15, mc, 0);
    disc(0, -0.41, 0.09, 0.05, "#fbfaf7", 0);
  } else if (m === "grin") {
    disc(0, -0.45, 0.34, 0.17, mc, 0);
    disc(0, -0.37, 0.3, 0.06, "#fbfaf7", 0);
    for (const s of [-1, 1]) stroke([[s * 0.34, -0.4], [s * 0.45, -0.32]], 0.06, mc);
  } else if (m === "teeth") {
    disc(0, -0.48, 0.3, 0.14, "#10061c", 0);
    for (const x of [-0.18, -0.06, 0.06, 0.18]) stroke([[x, -0.4], [x, -0.56]], 0.035, "#efe4c6");
  }
  for (const mk of f.marks ?? []) {
    if (mk === "cheeks") for (const s of [-1, 1]) for (const y of [-0.16, -0.28]) stroke([[s * 0.5, y], [s * 0.72, y + 0.02]], 0.05, ink);
    if (mk === "chin") stroke([[0, -0.72], [0, -0.86]], 0.05, ink);
  }
  if (f.blush) for (const s of [-1, 1]) disc(s * 0.56, -0.2, 0.15, 0.08, "#ff9aa0", 0);
  return out;
}

export const faceGeometry = (face, head, r) => mergeGeometries(faceParts(face, head, r));

export function faceMesh(face, head, r, dim = 1) {
  const g = faceGeometry(face, head, r);
  if (dim !== 1) {
    const c = g.attributes.color;
    for (let i = 0; i < c.array.length; i++) c.array[i] *= dim;
  }
  const m = new Mesh(g, faceMaterial());
  m.frustumCulled = false;
  return m;
}
