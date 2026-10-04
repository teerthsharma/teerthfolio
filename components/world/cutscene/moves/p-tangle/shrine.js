// THE SHRINE ON THE MOUNTAIN: a long stone stair up the wooded hill between three vermilion torii and
// eight stone lanterns, the hall on its platform (a gabled slate roof with chigi, a lit lattice front,
// paper lanterns, a shimenawa) and the paper streamers (shide) that flutter on it. One merged mesh with
// per-vertex colour (alpha = how lit from within) plus one instanced streamer mesh.

import { BoxGeometry, BufferAttribute, BufferGeometry, ConeGeometry, CylinderGeometry, DoubleSide, InstancedMesh, Object3D, ShaderMaterial, SphereGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DISSOLVE, LIGHT, NOISE, OUT, SKY, g3, hash } from "./gl";
import { H, HILL, STAIR_A, STAIR_B } from "./land";

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
class Builder {
  constructor() {
    this.p = [];
  }
  add(geo, color, em = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.deleteAttribute("uv");
    g.computeVertexNormals();
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 4);
    const [r, gg, b] = hex(color);
    for (let i = 0; i < n; i++) c.set([r, gg, b, em], i * 4);
    g.setAttribute("color", new BufferAttribute(c, 4));
    this.p.push(g);
    return this;
  }
  box(w, h, d, x, y, z, color, em = 0, rx = 0, ry = 0, rz = 0) {
    return this.add(new BoxGeometry(w, h, d).rotateX(rx).rotateZ(rz).rotateY(ry).translate(x, y, z), color, em);
  }
  cyl(r0, r1, h, x, y, z, color, em = 0, seg = 8) {
    return this.add(new CylinderGeometry(r0, r1, h, seg).translate(x, y, z), color, em);
  }
  take() {
    return mergeGeometries(this.p);
  }
}
const place = (b, g, yaw, x, y, z) => {
  g.rotateY(yaw).translate(x, y, z);
  b.p.push(g);
};

const VERMILION = "#e04a30";
const BLACK = "#1c1820";
const STONE = "#8e88a8";

function torii(b, x, z, yaw, span, hgt, gy) {
  const t = new Builder();
  for (const s of [-1, 1]) {
    t.cyl(0.2, 0.26, hgt, s * span * 0.5, hgt / 2, 0, VERMILION, 0, 8);
    t.cyl(0.3, 0.3, 0.45, s * span * 0.5, 0.22, 0, BLACK, 0, 8);
  }
  t.box(span + 0.9, 0.2, 0.34, 0, hgt - 0.35, 0, BLACK);
  t.box(span + 1.7, 0.36, 0.5, 0, hgt + 0.05, 0, BLACK);
  for (const s of [-1, 1]) t.box(1.0, 0.34, 0.5, s * (span * 0.5 + 1.15), hgt + 0.22, 0, BLACK, 0, 0, 0, s * 0.3);
  t.box(span + 0.2, 0.24, 0.26, 0, hgt - 1.15, 0, VERMILION);
  t.box(0.22, 0.6, 0.22, 0, hgt - 0.65, 0, VERMILION);
  place(b, t.take(), yaw, x, gy, z);
}

function lantern(b, x, z, gy) {
  const t = new Builder();
  t.box(0.62, 0.16, 0.62, 0, 0.08, 0, STONE);
  t.cyl(0.1, 0.12, 0.7, 0, 0.5, 0, STONE, 0, 6);
  t.box(0.46, 0.1, 0.46, 0, 0.9, 0, STONE);
  t.box(0.4, 0.42, 0.4, 0, 1.16, 0, STONE);
  t.box(0.28, 0.3, 0.42, 0, 1.16, 0, "#ffbe66", 1);
  t.add(new ConeGeometry(0.46, 0.34, 4).rotateY(Math.PI / 4).translate(0, 1.54, 0), STONE);
  t.add(new SphereGeometry(0.08, 5, 4).translate(0, 1.78, 0), STONE);
  place(b, t.take(), 0, x, gy, z);
}

export function shrineGeometry() {
  const b = new Builder();
  const x0 = HILL[0];
  const z0 = HILL[1] + 0.4;
  const y0 = H(x0, z0);
  const FY = y0 + 0.9;
  // the platform
  b.box(10.4, 2.6, 8.2, x0, y0 - 0.9, z0, "#7c7498");
  b.box(8.8, 0.5, 6.6, x0, y0 + 0.65, z0, STONE);
  for (let i = 0; i < 3; i++) b.box(4.4, 0.22, 0.5, x0, y0 + 0.5 - i * 0.18, z0 + 3.5 + 0.34 * (i + 1) * 0.0 + i * 0.4, STONE);
  // the hall: pillars, plaster, a lit lattice front
  const hz = 2.2;
  for (const px of [-3.0, -1.0, 1.0, 3.0]) for (const pz of [-hz, hz]) b.box(0.3, 3.0, 0.3, x0 + px, FY + 1.5, z0 + pz, "#7a4a3a");
  b.box(6.4, 2.9, 0.2, x0, FY + 1.5, z0 - hz - 0.05, "#d9ccb8");
  for (const s of [-1, 1]) b.box(0.2, 2.9, 4.4, x0 + s * 3.15, FY + 1.5, z0, "#d9ccb8");
  b.box(6.0, 0.5, 4.2, x0, FY + 0.25, z0, "#4a3a3a");
  for (const px of [-2.0, 0, 2.0]) b.box(1.7, 2.3, 0.1, x0 + px, FY + 1.35, z0 + hz - 0.12, "#ffc87a", 0.85);
  for (const px of [-2.0, -1.0, 0, 1.0, 2.0]) b.box(0.05, 2.3, 0.14, x0 + px - 0.0, FY + 1.35, z0 + hz - 0.08, "#4a2a22");
  b.box(6.6, 0.22, 0.34, x0, FY + 2.55, z0 + hz, "#5a3828");
  // the roof: two slate slopes, a ridge, the chigi crossing at each gable
  const RY = FY + 4.5;
  const th = 0.5;
  for (const s of [1, -1]) {
    b.box(8.6, 0.3, 3.9, x0, RY - 0.95, z0 + s * 1.72, "#2c3050", 0, s * th);
    b.box(8.7, 0.12, 0.3, x0, RY - 0.95 - Math.sin(th) * 1.95 - 0.1, z0 + s * (1.72 + Math.cos(th) * 1.95), "#6a7098");
  }
  b.box(8.8, 0.34, 0.6, x0, RY - 0.05, z0, BLACK);
  for (const s of [-1, 1]) {
    b.box(0.12, 1.5, 0.12, x0 + s * 4.35, RY + 0.55, z0, BLACK, 0, 0, 0, 0.32);
    b.box(0.12, 1.5, 0.12, x0 + s * 4.35, RY + 0.55, z0, BLACK, 0, 0, 0, -0.32);
  }
  // the shimenawa across the front, a bell rope, two paper lanterns under the eave
  b.add(new CylinderGeometry(0.1, 0.1, 6.6, 6).rotateZ(Math.PI / 2).translate(x0, FY + 2.95, z0 + hz + 0.85), "#e0c27a");
  b.cyl(0.04, 0.04, 2.1, x0, FY + 1.9, z0 + hz + 0.9, "#c8503c", 0, 5);
  b.add(new SphereGeometry(0.2, 6, 5).translate(x0, FY + 0.82, z0 + hz + 0.9), "#e0c27a");
  for (const s of [-1, 1]) b.add(new SphereGeometry(0.3, 8, 6).scale(1, 1.2, 1).translate(x0 + s * 2.5, FY + 2.4, z0 + hz + 1.0), "#ff6a3c", 1);
  // the stair
  const N = 54;
  const ex = STAIR_B[0] - STAIR_A[0];
  const ez = STAIR_B[1] - STAIR_A[1];
  const yaw = Math.atan2(ex, ez) + Math.PI; // the way up faces -z
  const nx = -ez;
  const nz = ex;
  const nl = Math.hypot(nx, nz);
  for (let i = 0; i < N; i++) {
    const s = i / (N - 1);
    const x = STAIR_A[0] + ex * s;
    const z = STAIR_A[1] + ez * s;
    const y = Math.max(0.25, Math.floor((H(x, z) + 0.1) / 0.3) * 0.3);
    b.add(new BoxGeometry(3.4, 0.9, 0.62).rotateY(yaw).translate(x, y - 0.45 + 0.02, z), i % 2 ? "#9a94b4" : "#8e88a8");
    if (i % 5 === 2) for (const side of [-1, 1]) b.add(new BoxGeometry(0.3, 0.5, 0.62).rotateY(yaw).translate(x + (nx / nl) * 1.85 * side, y + 0.18, z + (nz / nl) * 1.85 * side), "#7c7498");
  }
  // torii on the stair, small to large as the way goes up; lanterns in pairs
  for (const [s, span] of [[0.02, 5.0], [0.38, 4.2], [0.74, 3.6]]) {
    const x = STAIR_A[0] + ex * s;
    const z = STAIR_A[1] + ez * s;
    torii(b, x, z, yaw + Math.PI, span, span * 0.95 + 1.2, Math.max(0.25, Math.floor((H(x, z) + 0.1) / 0.3) * 0.3) - 0.2);
  }
  for (const s of [0.14, 0.3, 0.5, 0.66, 0.84]) {
    for (const side of [-1, 1]) {
      const x = STAIR_A[0] + ex * s + (nx / nl) * 2.3 * side;
      const z = STAIR_A[1] + ez * s + (nz / nl) * 2.3 * side;
      lantern(b, x, z, Math.max(H(x, z), 0.1) - 0.1);
    }
  }
  return b.take();
}

export function shrineMaterial(U) {
  return new ShaderMaterial({
    uniforms: U,
    vertexColors: true,
    vertexShader: /* glsl */ `
      varying vec3 vW; varying vec3 vL; varying vec3 vN; varying vec4 vC;
      void main() {
        vC = vec4(1.0);
        #if defined(USE_COLOR_ALPHA)
          vC = color;
        #endif
        vL = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW; varying vec3 vL; varying vec3 vN; varying vec4 vC;
      ${NOISE}
      ${SKY}
      ${LIGHT}
      ${DISSOLVE}
      void main() {
        vec3 V = normalize(vW - cameraPosition);
        float dist = length(vW - cameraPosition);
        vec3 base = vC.rgb * (0.9 + 0.2 * vnoise(vL.xz * 4.0 + vL.y * 2.0));
        vec3 col = lightLand(base, normalize(vN), V, dist, 1.4);
        col = mix(col, vC.rgb * (1.1 + 0.4 * uTw), vC.a * (1.0 - smoothstep(60.0, 190.0, dist) * 0.5));
        float e = dissolveEdge(clamp(dist / 230.0, 0.0, 1.0) * 0.95);
        col += e * ${g3("#ffd6a0")} * 1.5;
        ${OUT}
      }`,
  });
}

// SHIDE: zigzag paper streamers on the shimenawa and the torii ropes, fluttering in the lake wind
export function streamers(U) {
  const w = 0.2;
  const seg = 5;
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const x = (i % 2 ? 1 : -1) * 0.06 * (i > 0 ? 1 : 0);
    pos.push(x - w / 2, -u * 0.95, 0, x + w / 2, -u * 0.95, 0);
    uv.push(0, u, 1, u);
    if (i < seg) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  g.setIndex(idx);
  const spots = [];
  const x0 = HILL[0];
  const z0 = HILL[1] + 0.4;
  const FY = H(x0, z0) + 0.9;
  for (let i = 0; i < 8; i++) spots.push([x0 - 3.1 + i * 0.89, FY + 2.88, z0 + 3.1]);
  const ex = STAIR_B[0] - STAIR_A[0];
  const ez = STAIR_B[1] - STAIR_A[1];
  for (const [s, span, hg] of [[0.02, 5.0, 5.9], [0.38, 4.2, 5.2], [0.74, 3.6, 4.6]]) {
    const x = STAIR_A[0] + ex * s;
    const z = STAIR_A[1] + ez * s;
    const gy = Math.max(0.25, Math.floor((H(x, z) + 0.1) / 0.3) * 0.3) - 0.2;
    for (let k = 0; k < 4; k++) spots.push([x - span * 0.4 + (k * span * 0.8) / 3, gy + hg - 1.35, z]);
  }
  const m = new InstancedMesh(g, new ShaderMaterial({
    uniforms: U,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vW; varying vec2 vUv; varying float vPh;
      uniform float uTime;
      void main() {
        vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float ph = base.x * 2.1 + base.z * 1.3;
        vPh = ph;
        vec4 p = vec4(position, 1.0);
        float s = uv.y;
        p.z += s * s * (0.35 * sin(uTime * 2.6 + ph) + 0.12 * sin(uTime * 5.3 + ph * 2.0));
        p.x += s * 0.1 * sin(uTime * 3.4 + ph * 1.7);
        p.y *= 1.0 - 0.1 * s * (0.5 + 0.5 * sin(uTime * 2.6 + ph));
        p = instanceMatrix * p;
        vUv = uv;
        vec4 w = modelMatrix * p;
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW; varying vec2 vUv; varying float vPh;
      ${NOISE}
      ${SKY}
      ${LIGHT}
      ${DISSOLVE}
      void main() {
        float dist = length(vW - cameraPosition);
        float lit = 0.55 + 0.45 * sin(vUv.y * 7.0 + vPh);
        vec3 col = mix(${g3("#c8bce0")}, ${g3("#fff0d8")}, lit * (1.0 - uTw * 0.6));
        col = mix(col, hazeAt(normalize(vW - cameraPosition)) * 1.0, (1.0 - exp(-dist * 0.004)) * 0.5);
        float e = dissolveEdge(clamp(dist / 230.0, 0.0, 1.0) * 0.95);
        col += e * ${g3("#ffd6a0")} * 1.5;
        ${OUT}
      }`,
  }), spots.length);
  m.frustumCulled = false;
  const D = new Object3D();
  spots.forEach(([x, y, z], i) => {
    D.position.set(x, y, z);
    D.rotation.set(0, hash(i, 1) * 0.3, 0);
    D.scale.setScalar(0.85 + 0.3 * hash(i, 2));
    D.updateMatrix();
    m.setMatrixAt(i, D.matrix);
  });
  return m;
}
