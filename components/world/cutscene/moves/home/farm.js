// THE FARMSTEAD, as meshes: the igloo promoted to the head of the farm (its
// stacked block courses, its entrance arch, its sky-blue telescope turret),
// turf-roofed longhouses with a smoke hole each, the wooden jetty the pup
// sits at the end of, a longship drawn up on the shingle (carved prow in
// shape only, shields along the gunwale, oars shipped inside), the eleven
// beacon cairns on the fjord's rim. Every part is painted (paper.js paint()),
// merged per kind, and shaded by the one wash material.

import { BoxGeometry, BufferGeometry, CatmullRomCurve3, CircleGeometry, CylinderGeometry, Euler, Float32BufferAttribute, IcosahedronGeometry, LatheGeometry, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, TorusGeometry, TubeGeometry, Vector2, Vector3 } from "three";
import { H, shoreL, shoreR } from "./land";
import { U, merge, paint } from "./paper";

const M = new Matrix4();
const E = new Euler();
const Qn = new Quaternion();
const V3 = new Vector3();
const S3 = new Vector3();
// move a geometry to (x, y, z), yawed ry, tilted rz, scaled s
const at = (g, x, y, z, ry = 0, s = 1, rz = 0) => {
  Qn.setFromEuler(E.set(0, ry, rz, "YXZ"));
  M.compose(V3.set(x, y, z), Qn, S3.set(s, s, s));
  return g.applyMatrix4(M);
};

// ---- the igloo ------------------------------------------------------------------
export const IGLOO = { x: -12.6, z: -6.4, ry: 0.55, s: 1.75 }; // the head of the farmstead
const PROFILE = [[2.7, 0], [2.68, 0.75], [2.58, 1.5], [2.38, 2.25], [2.06, 2.95], [1.62, 3.6], [1.05, 4.15], [0.45, 4.5], [0, 4.6]];
const SEG = 16;
function course([r0, y0], [r1, y1], ...tail) {
  const pts = [[r0, y0], [r0 + 0.07, y0 + 0.02], [r0 + 0.035, y0 + 0.07], [r1, y1], ...tail];
  return new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), SEG);
}
const halfPipe = (r, len) => new CylinderGeometry(r, r, len, SEG, 1, true, 0, Math.PI).rotateX(-Math.PI / 2);

export function iglooGeometry() {
  const parts = [];
  const snow = ["#f6f1e8", "#f1ece3", "#f8f3ea", "#eee9e2", "#f6f1e8", "#f1ece3", "#f8f3ea"];
  for (let i = 0; i < 6; i++) {
    const g = course(PROFILE[i], PROFILE[i + 1]);
    if (i % 2) g.rotateY(Math.PI / SEG);
    parts.push(paint(g, snow[i], 0.025, i));
  }
  const top = course(PROFILE[6], PROFILE[7], PROFILE[8]);
  parts.push(paint(top, snow[6], 0.025, 7));
  // the entrance arch, standing proud of the dome, with its three lips, and the sky-blue arch ring
  parts.push(paint(halfPipe(1, 1.7).translate(0, 0, 3.05), "#f3eee5", 0.03, 8));
  for (const f of [0.25, 0.5, 0.75]) parts.push(paint(halfPipe(1.05, 0.08).translate(0, 0, 2.2 + 1.7 * f), "#e8e3dc", 0.02, 9));
  parts.push(paint(new TorusGeometry(0.88, 0.15, 6, SEG, Math.PI).translate(0, 0, 3.95), "#6fb4ea", 0.05, 10));
  parts.push(paint(new CircleGeometry(0.72, SEG, 0, Math.PI).translate(0, 0, 3.93), "#2e3452", 0.02, 11)); // the doorway
  parts.push(paint(new PlaneGeometry(1.1, 0.9).translate(0, 0.45, 3.99), "#ffd990", 0.04, 12)); // the hearth glow in the arch
  // portholes in the third course, warm glass
  for (const th of [-0.7, 0.7, 1.57]) {
    parts.push(paint(new CylinderGeometry(0.32, 0.32, 0.12, 12).rotateX(Math.PI / 2).translate(0, 0, 2.5).rotateY(th).translate(0, 1.88, 0), "#2e3452", 0.02, 13));
    parts.push(paint(new CircleGeometry(0.22, 12).translate(0, 0, 2.61).rotateY(th).translate(0, 1.88, 0), "#ffd990", 0.03, 14));
  }
  // the sky-blue skylight and the vent: steam rises from it
  parts.push(paint(new CylinderGeometry(0.7, 0.95, 0.3, SEG).translate(0, 4.3, 0), "#6fb4ea", 0.05, 15));
  parts.push(paint(new CylinderGeometry(0.55, 0.55, 0.35, SEG).translate(0, 4.55, 0), "#2e3452", 0.02, 16)); // the turret drum
  return merge(parts);
}
// the telescope: tube, lens ring and lens, its base at the turret pivot (0, 4.55, 0) and pointing along +z
export function scopeGeometry() {
  const tube = new CylinderGeometry(0.3, 0.24, 1.6, 10).rotateX(Math.PI / 2).translate(0, 0, 0.8);
  return merge([
    paint(tube, "#6fb4ea", 0.04, 20),
    paint(new CylinderGeometry(0.34, 0.34, 0.14, 10).rotateX(Math.PI / 2).translate(0, 0, 1.6), "#2e3452", 0.02, 21),
    paint(new CircleGeometry(0.28, 10).translate(0, 0, 1.68), "#ffe2a0", 0.02, 22),
  ]);
}

// ---- turf longhouses ----------------------------------------------------------------
function longhouse(L, W, wh, rh, seed) {
  const parts = [];
  parts.push(paint(new BoxGeometry(L + 0.4, 0.4, W + 0.4).translate(0, 0.2, 0), "#8d89a4", 0.08, seed));
  parts.push(paint(new BoxGeometry(L, wh, W).translate(0, 0.4 + wh / 2, 0), "#8c6b4d", 0.07, seed + 1));
  // the turf roof: a half-round bank, lumpy with sod, sage-green and dry ochre
  const roof = new CylinderGeometry(1, 1, L + 0.5, 12, 7, true, 0, Math.PI).rotateZ(Math.PI / 2);
  const p = roof.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const lump = 1 + 0.07 * Math.sin(x * 2.1 + z * 3.7 + seed) + 0.04 * Math.sin(x * 5.3 - z * 2.9);
    p.setXYZ(i, x, y * rh * lump, z * (W / 2 + 0.55) * lump);
  }
  roof.translate(0, 0.4 + wh, 0);
  roof.computeVertexNormals();
  parts.push(paint(roof, seed % 2 ? "#7f9b69" : "#8aa070", 0.14, seed + 2));
  // gable ends: timber
  for (const s of [-1, 1]) {
    const gable = new CircleGeometry(1, 12, 0, Math.PI).scale(W / 2 + 0.45, rh * 0.98, 1).rotateY(Math.PI / 2 * -s).translate(s * (L / 2 + 0.26), 0.4 + wh, 0);
    parts.push(paint(gable, "#7a5c43", 0.08, seed + 3));
  }
  parts.push(paint(new BoxGeometry(0.1, wh * 0.8, 1.0).translate(L / 2 + 0.28, 0.4 + wh * 0.4, 0), "#34304a", 0.02, seed + 4)); // the door
  // the smoke hole on the ridge, a dark slot in a timber frame
  parts.push(paint(new BoxGeometry(1.1, 0.25, 0.7).translate(0.4, 0.4 + wh + rh * 0.98, 0), "#4b3a30", 0.06, seed + 5));
  parts.push(paint(new BoxGeometry(0.8, 0.06, 0.45).translate(0.4, 0.4 + wh + rh * 0.98 + 0.15, 0), "#2c2840", 0.02, seed + 6));
  return merge(parts);
}
// L, W, wall height, roof height, x, z, yaw
export const HOUSES = [
  [9.5, 4.4, 1.5, 1.95, -22.5, -4.2, 0.12],
  [8.2, 4.0, 1.4, 1.8, -21, -14, -0.1],
  [7.0, 3.6, 1.3, 1.65, -31, -10, 0.35],
  [5.6, 3.2, 1.2, 1.5, -13.8, -16, -0.2],
  [6.4, 3.4, 1.2, 1.6, -29, 2.4, -0.15],
];
export function houseGeometry() {
  const list = HOUSES.map(([L, W, wh, rh, x, z, ry], i) => {
    const g = longhouse(L, W, wh, rh, 30 + i * 9);
    const y = H(x, z) - 0.05;
    return at(g, x, y, z, ry);
  });
  return merge(list);
}
export const SMOKE_AT = HOUSES.map(([, , wh, rh, x, z, ry]) => {
  const sx = 0.4;
  return [x + Math.cos(ry) * sx, H(x, z) + 0.4 + wh + rh * 0.98 + 0.3, z - Math.sin(ry) * sx];
});

// ---- the jetty ---------------------------------------------------------------------
export const JETTY = { x0: -6.6, x1: 1.4, w: 1.55 };
export function jettyGeometry() {
  const parts = [];
  const n = 26;
  const pw = (JETTY.x1 - JETTY.x0) / n;
  for (let i = 0; i < n; i++) {
    const g = new BoxGeometry(pw * 0.9, 0.1, JETTY.w + 0.1 * Math.sin(i * 2.3)).translate(JETTY.x0 + pw * (i + 0.5), -0.05, 0);
    parts.push(paint(g, i % 3 ? "#a58a67" : "#957a5a", 0.12, 40 + i));
  }
  for (const z of [-0.5, 0.5]) parts.push(paint(new BoxGeometry(JETTY.x1 - JETTY.x0, 0.14, 0.12).translate((JETTY.x0 + JETTY.x1) / 2, -0.17, z), "#6b5645", 0.06, 80));
  for (let i = 0; i < 6; i++) {
    const x = JETTY.x0 + 0.6 + i * 1.5;
    for (const s of [-1, 1]) {
      const g = new CylinderGeometry(0.1, 0.12, 2.3, 6).translate(0, -0.8, 0);
      parts.push(at(paint(g, "#5f4b3c", 0.1, 90 + i * 2 + s), x, 0, s * 0.68, 0, 1, 0.03 * s));
    }
  }
  // the mooring posts at the head, a coil of rope between them
  for (const s of [-1, 1]) parts.push(paint(new CylinderGeometry(0.1, 0.12, 0.7, 6).translate(JETTY.x1 - 0.1, 0.3, s * 0.62), "#66503f", 0.06, 100));
  parts.push(paint(new TorusGeometry(0.2, 0.06, 5, 10).rotateX(Math.PI / 2).translate(JETTY.x1 - 0.55, 0.04, -0.45), "#c8b48e", 0.05, 101));
  return merge(parts);
}

// ---- the longship ------------------------------------------------------------------
export const SHIP = { x: -9.0, z: 4.4, ry: 0.1, L: 9.0 };
const edgeK = (u) => Math.abs(2 * u - 1);
export function shipGeometry() {
  const L = SHIP.L;
  const N = 30;
  const S = 8;
  const yk = (u) => 1.5 * edgeK(u) ** 4.5;
  const yg = (u) => yk(u) + 0.95 + 0.95 * edgeK(u) ** 2.2;
  const bw = (u) => 1.2 * (1 - edgeK(u) ** 2.4) ** 0.55;
  const hw = (u, s) => bw(u) * (0.1 + 0.9 * s ** 0.72);
  const strake = ["#8d6c4e", "#6a4d3a", "#8d6c4e", "#a5453a", "#6a4d3a", "#8d6c4e", "#a5453a", "#6a4d3a"];
  const parts = [];
  for (const side of [-1, 1]) {
    for (let s = 0; s < S; s++) {
      const pos = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        for (const ss of [s / S, (s + 1) / S]) pos.push((u - 0.5) * L, yk(u) + (yg(u) - yk(u)) * ss, side * hw(u, ss));
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new Float32BufferAttribute(pos, 3));
      const idx = [];
      for (let i = 0; i < N; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      g.setIndex(idx);
      g.computeVertexNormals();
      parts.push(paint(g, strake[s], 0.06, 110 + s + (side + 1) * 5));
    }
  }
  // the deck boards, the thwarts and the oars shipped (laid inboard along the thwarts, blades aft)
  parts.push(paint(new BoxGeometry(L * 0.8, 0.06, 1.1).translate(0, 0.42, 0), "#6e5642", 0.06, 130));
  for (let i = 0; i < 9; i++) {
    const u = 0.14 + i * 0.09;
    parts.push(paint(new BoxGeometry(0.34, 0.1, bw(u) * 1.75).translate((u - 0.5) * L, yk(u) + 0.88, 0), "#8f6f50", 0.06, 135 + i));
  }
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1;
    const zz = side * (0.25 + 0.075 * ((i / 2) | 0));
    parts.push(at(paint(new BoxGeometry(5.2, 0.07, 0.07), "#cdb184", 0.05, 150 + i), -0.4 + 0.03 * i, 1.02 + 0.015 * ((i / 2) | 0), zz, side * 0.025));
    parts.push(at(paint(new BoxGeometry(0.9, 0.04, 0.2), "#cdb184", 0.05, 160 + i), -3.05 + 0.03 * i, 1.02 + 0.015 * ((i / 2) | 0), zz, side * 0.025));
  }
  // the carved prow and the stern post: the neck rises and curls, the head opens its jaws (shape only)
  const prow = new CatmullRomCurve3([[4.5, 2.4, 0], [4.7, 3.2, 0], [5.0, 3.9, 0], [5.45, 4.25, 0], [5.8, 4.0, 0]].map((p) => new Vector3(...p)));
  parts.push(paint(new TubeGeometry(prow, 14, 0.15, 6), "#5b4231", 0.06, 170));
  parts.push(at(paint(new IcosahedronGeometry(0.3, 1).scale(1.7, 0.75, 0.72), "#5b4231", 0.06, 171), 6.05, 3.95, 0, 0, 1, -0.5));
  parts.push(at(paint(new BoxGeometry(0.5, 0.12, 0.3), "#c8a04a", 0.05, 172), 6.1, 3.72, 0, 0, 1, -0.35));
  for (let i = 0; i < 3; i++) parts.push(paint(new IcosahedronGeometry(0.1, 0).scale(0.7, 1.3, 0.7).translate(4.75 + i * 0.28, 3.5 + i * 0.28, 0), "#c8a04a", 0.05, 173 + i)); // the carved frill down the neck
  const stern = new CatmullRomCurve3([[-4.5, 2.4, 0], [-4.62, 3.0, 0], [-4.9, 3.5, 0], [-5.3, 3.55, 0], [-5.45, 3.15, 0]].map((p) => new Vector3(...p)));
  parts.push(paint(new TubeGeometry(stern, 12, 0.13, 6), "#5b4231", 0.06, 180));
  return merge(parts);
}
export function shieldGeometry() {
  return new CylinderGeometry(0.4, 0.4, 0.06, 14).rotateX(Math.PI / 2);
}
export const SHIELD_COLS = ["#a5453a", "#e0cfa6", "#4f7a8c", "#d8a64b"];
export function shieldSpots() {
  const L = SHIP.L;
  const out = [];
  const yk = (u) => 1.5 * edgeK(u) ** 4.5;
  const yg = (u) => yk(u) + 0.95 + 0.95 * edgeK(u) ** 2.2;
  const bw = (u) => 1.2 * (1 - edgeK(u) ** 2.4) ** 0.55;
  for (const side of [-1, 1]) for (let i = 0; i < 10; i++) {
    const u = 0.17 + i * 0.07;
    out.push([(u - 0.5) * L, yg(u) - 0.18, side * (bw(u) + 0.05), side]);
  }
  return out;
}

// ---- beacons -------------------------------------------------------------------------
// eleven cairns along the fjord's rim: right wall, left wall, on, away down the fjord
export function beaconSpots() {
  const out = [];
  for (let j = 0; j < 11; j++) {
    const z = -32 - 8.6 * j;
    const right = j % 2 === 0;
    let x = right ? shoreR(z) + 3 : shoreL(z) - 3;
    for (let k = 0; k < 90; k++) {
      if (H(x, z) >= 17) break;
      x += right ? 0.6 : -0.6;
    }
    out.push([x, H(x, z), z]);
  }
  return out;
}
export function cairnGeometry(spots) {
  const parts = [];
  spots.forEach(([x, y, z], i) => {
    parts.push(paint(new IcosahedronGeometry(0.7, 0).scale(1.1, 0.7, 1).translate(x, y + 0.2, z), "#8a8aa0", 0.1, 200 + i));
    parts.push(paint(new IcosahedronGeometry(0.45, 0).scale(1, 0.8, 1).translate(x + 0.15, y + 0.75, z - 0.05), "#9a97ae", 0.1, 220 + i));
    parts.push(paint(new IcosahedronGeometry(0.25, 0).translate(x - 0.1, y + 1.1, z + 0.05), "#a8a4b8", 0.1, 240 + i));
  });
  return merge(parts);
}

// a flame as a wash: a teardrop of orange pigment over a warm bloom, bare paper in its core,
// drawn view-aligned. instanceMatrix: translation = base, scale = size.
export function flameMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: U.uTime, uRun: U.uRun, uRes: U.uRes, uPx: U.uPx, uPaper: U.uPaper },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vSeed;
      void main() {
        vUv = uv;
        vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vSeed = c.x * 0.37 + c.z * 0.11;
        float sc = length(instanceMatrix[0].xyz);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 w = c + (right * position.x + up * position.y) * sc;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uRun, uPx;
      uniform vec2 uRes;
      uniform vec3 uPaper;
      varying vec2 vUv;
      varying float vSeed;
      ${"float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }"}
      void main() {
        vec2 q = vec2(vUv.x - 0.5, vUv.y);
        float tw = floor(uTime * 12.0) + vSeed; // on twos
        float sway = (h21(vec2(tw, 1.0)) - 0.5) * 0.08 * q.y;
        float v = clamp(q.y / 0.62, 0.0, 1.0);
        float hw = 0.2 * pow(1.0 - v, 0.75) * (0.85 + 0.2 * h21(vec2(tw, 2.0)));
        float m = 1.0 - smoothstep(hw - 0.03, hw, abs(q.x - sway)) ;
        m *= step(q.y, 0.62);
        float r = length(vec2(q.x, q.y - 0.18));
        float glow = exp(-r * 5.2) * 0.45;
        vec3 outer = vec3(0.86, 0.38, 0.17);
        vec3 mid = vec3(0.98, 0.66, 0.24);
        vec3 core = vec3(1.0, 0.92, 0.7);
        vec3 c = mix(outer, mid, smoothstep(0.0, 0.5, 1.0 - abs(q.x - sway) / max(hw, 0.001)));
        c = mix(c, core, smoothstep(0.5, 0.95, 1.0 - abs(q.x - sway) / max(hw, 0.001)) * (1.0 - v));
        c = mix(vec3(1.0, 0.8, 0.5), c, m);
        float a = max(m, glow);
        float sy = 1.0 - gl_FragCoord.y / uRes.y;
        float lifted = smoothstep(0.0, 0.2, uRun * 1.95 - sy - h21(vec2(floor(gl_FragCoord.x / (uPx * 7.0)), 4.0)) * 0.45);
        c = mix(c, uPaper, lifted);
        gl_FragColor = vec4(c, a * (1.0 - lifted * 0.7));
      }`,
  });
}

