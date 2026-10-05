// THE CEL FIGURE KIT: one material family with the pup (phase1/shaders.md): a three-band toon ramp with a
// hue-shifted, place-tinted shadow, a ground bounce on the undersides, a rim from behind, and a constant-WIDTH
// ink hull (the offset is in clip space, so the line is the same pixels at 32 px and at close range). Faces are
// flat unlit strokes on the head. Everything is built from lib/world/cutscene/cast.js.

import { Mesh, BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Quaternion, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BUILDS } from "../../../lib/world/cutscene/timeline";

const UP = new Vector3(0, 1, 0);
const A = new Vector3();
const B = new Vector3();
const Q = new Quaternion();

// A guest draws over any pocket wall, but its own parts must still hide each other: so the figure keeps its depth
// test and its whole depth range is packed into the first 2 % of the buffer (uPack = 1), in front of the set.
const PACK = /* glsl */ `
  uniform float uPack;
  vec4 pack_(vec4 c) { c.z = mix(c.z, -c.w + 0.02 * (c.z + c.w), uPack); return c; }`;
const U = () => ({ uPack: { value: 0 } });

// ---- materials -------------------------------------------------------------------------------------------------
export function celMaterial() {
  return new ShaderMaterial({
    uniforms: { ...U(), uShade: { value: new Color("#8a7cc4") }, uBounce: { value: new Color("#ffb070") }, uRim: { value: new Color("#ffffff") } },
    vertexShader: /* glsl */ `
      attribute vec3 color;
      varying vec3 vN, vW, vC, vV;
      ${PACK}
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vW = normalize(mat3(modelMatrix) * normal);
        vV = mv.xyz;
        vC = color;
        gl_Position = pack_(projectionMatrix * mv);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uShade, uBounce, uRim;
      varying vec3 vN, vW, vC, vV;
      float band(float x, float e) { float w = 0.75 * fwidth(x) + 0.004; return smoothstep(e - w, e + w, x); }
      void main() {
        vec3 n = normalize(vN);
        vec3 L = normalize(vec3(-0.5, 0.62, 0.62));            // the key: upper left, toward the lens
        float t = (dot(n, L) + 0.35) / 1.35;                   // wrap
        float b1 = band(t, 0.38), b2 = band(t, 0.78);
        vec3 shade = vC * uShade;                              // cool, place-tinted shadow, never black
        // ground bounce: the undersides take the ground's warmth
        float down = clamp(-vW.y * 1.4, 0.0, 1.0);
        shade += uBounce * vC * 0.45 * down;
        vec3 col = mix(shade, vC, b1);
        col = mix(col, min(vC * 1.14 + 0.02, vec3(1.0)), b2);
        // rim from behind and to the right, constant width in n.v
        vec3 v = normalize(-vV);
        float rim = band(1.0 - clamp(dot(n, v), 0.0, 1.0), 0.66) * band(dot(n, normalize(vec3(0.7, 0.35, -0.6))), 0.05);
        col += uRim * rim * 0.55;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// the ink hull, constant pixel width
export function hullMaterial() {
  return new ShaderMaterial({
    uniforms: { ...U(), uInk: { value: new Color("#120820") }, uRes: { value: [1280, 800] }, uPx: { value: 2.4 } },
    side: BackSide,
    vertexShader: /* glsl */ `
      uniform vec2 uRes;
      uniform float uPx;
      ${PACK}
      void main() {
        vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec2 nd = (projectionMatrix * vec4(normalMatrix * normal, 0.0)).xy;
        nd *= inversesqrt(max(dot(nd, nd), 1e-12));
        c.xy += nd * (uPx * 2.0 / uRes) * c.w;
        c.z += 0.0006 * c.w;
        gl_Position = pack_(c);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk;
      void main() { gl_FragColor = vec4(uInk, 1.0); }`,
  });
}

// the face plate: flat colour, no light (an anime face is drawn, not lit)
export function faceMaterial() {
  return new ShaderMaterial({
    uniforms: U(),
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    vertexShader: /* glsl */ `
      attribute vec3 color;
      varying vec3 vC;
      ${PACK}
      void main() { vC = color; gl_Position = pack_(projectionMatrix * modelViewMatrix * vec4(position, 1.0)); }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC;
      void main() { gl_FragColor = vec4(vC, 1.0); }`,
  });
}

// ---- geometry helpers -------------------------------------------------------------------------------------------
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
function limb(a, b, r1, r2, hex, sx = 1, sz = 1, seg = 10) {
  A.fromArray(a);
  B.fromArray(b);
  const g = new CylinderGeometry(r2, r1, A.distanceTo(B), seg, 1).scale(sx, 1, sz);
  g.applyQuaternion(Q.setFromUnitVectors(UP, B.clone().sub(A).normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return paint(g, hex);
}
const ball = (at, r, hex, sx = 1, sy = 1, sz = 1) => paint(new SphereGeometry(r, 14, 10).scale(sx, sy, sz).translate(...at), hex);

const S = (s, x, y, z) => [s * x, y, z];
// the arms, as the old kit's poses (tall figure's space, facing +z)
const ARMS = {
  pockets: (s) => [[S(s, 0.3, 1.58, 0), S(s, 0.42, 1.22, -0.04)], [S(s, 0.42, 1.22, -0.04), S(s, 0.21, 1.0, 0.08)]],
  side: (s) => [[S(s, 0.3, 1.58, 0), S(s, 0.37, 1.22, -0.02)], [S(s, 0.37, 1.22, -0.02), S(s, 0.39, 0.9, 0.04), true]],
  point: (s) => (s < 0 ? [[S(s, 0.3, 1.58, 0), S(s, 0.62, 1.52, 0.2)], [S(s, 0.62, 1.52, 0.2), S(s, 0.98, 1.5, 0.45), true]] : ARMS.side(s)),
  handout: (s) => (s < 0 ? [[S(s, 0.3, 1.58, 0), S(s, 0.5, 1.36, 0.25)], [S(s, 0.5, 1.36, 0.25), S(s, 0.66, 1.34, 0.62), true]] : ARMS.side(s)),
  hip: (s) => (s > 0 ? [[S(s, 0.3, 1.58, 0), S(s, 0.5, 1.28, 0.02)], [S(s, 0.5, 1.28, 0.02), S(s, 0.24, 1.02, 0.02)]] : [[S(s, 0.3, 1.58, 0), S(s, 0.5, 1.82, 0.16)], [S(s, 0.5, 1.82, 0.16), S(s, 0.66, 2.1, 0.36), true]]),
  crossed: (s) => [[S(s, 0.3, 1.58, 0), S(s, 0.38, 1.27, 0.12)], [S(s, 0.38, 1.27, 0.12), S(s, -0.22, 1.36 + 0.03 * s, 0.24)]],
  cane: (s) => [[S(s, 0.3, 1.58, 0), S(s, 0.36, 1.26, 0.14)], [S(s, 0.36, 1.26, 0.14), S(s, 0.05, 1.02, 0.34)]],
};

// ---- hair --------------------------------------------------------------------------------------------------------
const SP = {
  crop: [[-70, 0.05, 0.16], [-45, -0.05, 0.22], [-20, 0.04, 0.26], [4, -0.06, 0.29], [26, 0.05, 0.26], [48, -0.04, 0.22], [70, 0.03, 0.16], [-10, -0.7, 0.2], [20, -0.7, 0.2]],
  minato: [[-72, 0.05, 0.2], [-50, -0.05, 0.3], [-26, 0.04, 0.38], [-4, -0.06, 0.42], [20, 0.05, 0.4], [42, -0.04, 0.32], [64, 0.03, 0.24], [-18, -0.6, 0.32], [18, -0.6, 0.3], [0, -0.9, 0.26]],
  messy: [[-70, 0.05, 0.12], [-44, -0.05, 0.17], [-18, 0.04, 0.2], [8, -0.06, 0.22], [34, 0.05, 0.19], [58, -0.04, 0.15], [0, -0.8, 0.14]],
};
function hairParts(h, head, k, hex) {
  const parts = [];
  const spike = (dir, len, r = 0.075, at = 0.1) => {
    const g = new ConeGeometry(r * k, len * k, 6);
    g.translate(0, (len * k) / 2, 0);
    g.applyQuaternion(Q.setFromUnitVectors(UP, dir.clone().normalize()));
    g.translate(head[0] + dir.x * at * k, head[1] + 0.04 * k + dir.y * at * k, head[2] + dir.z * at * k);
    parts.push(paint(g, hex));
  };
  const cap = (sy = 0.62, dz = -0.02) => parts.push(ball([head[0], head[1] + 0.045 * k, head[2] + dz * k], 0.172 * k, hex, 0.97, sy * 1.2, 1.02)); // a skull cap of hair over the crown
  if (SP[h.style]) {
    cap(0.6);
    for (const [deg, back, len] of SP[h.style]) {
      const a = (deg * Math.PI) / 180;
      spike(new Vector3(Math.sin(a), Math.cos(a) * 0.95 + 0.15, back), len);
    }
    if (h.style === "minato") {
      // two long fringes down the sides of the face
      for (const s of [-1, 1]) spike(new Vector3(s * 0.55, -1, 0.5), 0.34, 0.05, 0.9);
    }
  } else if (h.style === "crest") {
    cap(0.7);
    for (const x of [-0.5, -0.25, 0, 0.25, 0.5]) spike(new Vector3(x * 0.5, 0.95, -0.35), 0.4 - Math.abs(x) * 0.12, 0.085);
    spike(new Vector3(0, 0.55, -1), 0.3, 0.08);
    spike(new Vector3(0.45, 0.5, 0.55), 0.22, 0.05);
    spike(new Vector3(-0.45, 0.5, 0.55), 0.22, 0.05);
  } else if (h.style === "long") {
    cap(0.7);
    parts.push(ball([head[0], head[1] - 0.45 * k, head[2] - 0.1 * k], 0.19 * k, hex, 1, 2.8, 0.6)); // a curtain down the back
    for (const s of [-1, 1]) parts.push(ball([head[0] + s * 0.16 * k, head[1] - 0.2 * k, head[2] + 0.02 * k], 0.07 * k, hex, 0.8, 2.6, 0.9)); // the side locks
    spike(new Vector3(0, 0.2, 1), 0.12, 0.1, 0.5); // the fringe
  } else if (h.style === "swept") {
    cap(0.66);
    for (const x of [-0.5, -0.25, 0, 0.25, 0.5]) spike(new Vector3(x * 0.6, 0.45, -1), 0.3, 0.085);
    spike(new Vector3(0.2, 0.4, 0.9), 0.14, 0.04, 0.6);
  } else if (h.style === "mane") {
    cap(0.7);
    for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) spike(new Vector3(x * 0.5, -0.9, -0.55), 0.58, 0.1);
    for (const deg of [-50, -20, 10, 40]) spike(new Vector3(Math.sin((deg * Math.PI) / 180), 0.9, -0.2), 0.2);
  }
  return parts;
}

// ---- the face ----------------------------------------------------------------------------------------------------
// flat strokes on the head's front. (x, y) are in head radii from the head centre.
function faceParts(f, head, r) {
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
      disc(s * ex, ey - 0.02, shape.w * 0.38, shape.h * 0.4, e.iris, 0); // the red spark
    } else {
      disc(s * ex, ey, shape.w, shape.h, e.sclera ?? "#fbfaf7", tilt);
      disc(s * ex, ey - 0.012, shape.w * shape.iris, shape.h * 0.98, e.iris, tilt);
      disc(s * ex, ey - 0.012, shape.w * 0.3, shape.h * 0.6, ink, 0);
      disc(s * ex + 0.06, ey + 0.07, 0.04, 0.045, "#ffffff", 0); // the catchlight
      stroke([[s * (ex - 0.22), ey + shape.h * 0.82], [s * (ex + 0.22), ey + shape.h * 0.95 + s * 0 + 0.0]], 0.07, ink); // the upper lid line
      if (e.extra) disc(s * (ex + 0.04), ey - 0.26, 0.09, 0.05, e.iris, tilt); // a second, small pair below
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
    disc(0, -0.37, 0.3, 0.06, "#fbfaf7", 0); // the top teeth
    for (const s of [-1, 1]) stroke([[s * 0.34, -0.4], [s * 0.45, -0.32]], 0.06, mc); // the grin's corners
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

// ---- accessories ------------------------------------------------------------------------------------------------
function accessories(spec, head, r, b) {
  const [hx, hy, hz] = head;
  const out = [];
  for (const a of spec.acc ?? []) {
    if (a === "headband") {
      out.push(paint(new CylinderGeometry(r * 1.02, r * 1.02, 0.05, 16, 1, true).scale(0.97, 1, 1.04).translate(hx, hy + r * 0.52, hz), "#27418c"));
      out.push(paint(new BoxGeometry(r * 0.9, 0.065, 0.014).translate(hx, hy + r * 0.52, hz + r * 1.03), "#d8dde8")); // the plate
    } else if (a === "earrings") {
      for (const s of [-1, 1]) out.push(ball([hx + s * r * 1.0, hy - r * 0.45, hz], 0.04, "#fff0a0"));
    } else if (a === "halo") {
      out.push(paint(new TorusGeometry(0.3 * b.w, 0.028, 6, 28).translate(hx, hy + 0.04, hz - 0.2), "#f6c82e")); // behind the skull
    } else if (a === "staff") {
      out.push(paint(new CylinderGeometry(0.03, 0.03, 2.1 * b.h, 6).translate(-0.4 * b.w, 1.05 * b.h, 0.3), "#e8b02a"));
      out.push(paint(new TorusGeometry(0.15 * b.w, 0.026, 6, 20).translate(-0.4 * b.w, 2.2 * b.h, 0.3), "#f6c82e"));
      ["#ff3b3b", "#ffb52e", "#35d0ff", "#7a5cff", "#ff5ad2", "#3be06a", "#ffe14a"].forEach((c, i) => {
        const an = (i / 7) * Math.PI * 2;
        out.push(ball([-0.4 * b.w + Math.cos(an) * 0.15 * b.w, 2.2 * b.h + Math.sin(an) * 0.15 * b.w, 0.3], 0.034, c));
      });
    } else if (a === "beard") {
      out.push(ball([hx, hy - r * 0.72, hz + r * 0.5], r * 0.62, spec.hair.color, 1.05, 0.9, 0.7));
    } else if (a === "ribbon") {
      for (const s of [-1, 1]) out.push(paint(new ConeGeometry(0.05, 0.12, 4).rotateZ((s * Math.PI) / 2).translate(hx + s * 0.09, hy + r * 0.7, hz - r * 0.55), "#ff2d3c"));
      out.push(ball([hx, hy + r * 0.72, hz - r * 0.55], 0.04, "#ff2d3c"));
    } else if (a === "horns") {
      for (const s of [-1, 1]) out.push(paint(new ConeGeometry(0.05, 0.28, 6).rotateZ(-s * 0.7).translate(hx + s * r * 0.95, hy + r * 0.85, hz - 0.02), "#2a2036"));
    }
  }
  return out;
}

// ---- the figure --------------------------------------------------------------------------------------------------
const CACHE = new WeakMap();
// the face alone, for a figure a move draws itself (Gojo): head centre and radius, the same strokes
export const faceGeometry = (face, head, r) => mergeGeometries(faceParts(face, head, r));

// a ready face mesh for a figure a move draws itself; `dim` darkens it to sit in a dim scene (the plate is unlit)
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

export function celFigure(sp, spec) {
  let f = CACHE.get(sp);
  if (f) return f;
  const b = BUILDS[spec.build ?? sp.build] ?? BUILDS.tall;
  const P = (p) => [p[0] * b.w, p[1] * b.h, p[2]];
  const head = [0, 1.9 * b.h, 0.02];
  const r = 0.155 * b.head;
  const body = [];
  const robe = !!spec.robe;
  for (const s of [-1, 1]) {
    if (!robe) {
      body.push(limb(P([s * 0.11, 0.05, 0.03]), P([s * 0.13, 1.0, 0]), 0.085 * b.w, 0.115 * b.w, spec.pants));
      body.push(paint(new BoxGeometry(0.13 * b.w, 0.075, 0.22).translate(s * 0.11 * b.w, 0.037, 0.08), spec.shoe));
    }
    for (const [a, z, hand] of (ARMS[sp.pose] ?? ARMS.side)(s)) {
      body.push(limb(P(a), P(z), 0.095 * b.w, 0.08 * b.w, spec.jacket));
      if (hand) body.push(ball(P(z), 0.075 * b.w, spec.skin));
    }
  }
  if (spec.armor) {
    body.push(limb(P([0, 1.0, 0]), P([0, 1.58, 0]), 0.235 * b.w, 0.285 * b.w, spec.armor.color, 1.3, 0.88));
    for (const s of [-1, 1]) body.push(ball(P([s * 0.31, 1.6, 0]), 0.125 * b.w, spec.armor.color, 1.1, 0.8, 1));
    body.push(limb(P([0, 1.0, 0]), P([0, 1.04, 0]), 0.245 * b.w, 0.245 * b.w, spec.armor.trim, 1.3, 0.9));
  }
  body.push(limb(P([0, 0.88, 0]), P([0, 1.6, 0]), 0.2 * b.w, 0.25 * b.w, spec.jacket, 1.3, 0.8));
  body.push(limb(P([0, robe ? 0.04 : 0.72, 0]), P([0, 1.0, 0]), (robe ? 0.4 : 0.27) * b.w, 0.21 * b.w, robe ? spec.jacket : spec.hem, 1.15, 0.85));
  if (robe) body.push(limb(P([0, 0.04, 0]), P([0, 0.12, 0]), 0.405 * b.w, 0.4 * b.w, spec.hem, 1.15, 0.85));
  body.push(limb(P([0, 0.96, 0]), P([0, 1.04, 0]), 0.255 * b.w, 0.25 * b.w, spec.belt, 1.2, 0.85)); // the sash
  body.push(limb(P([-0.31, 1.6, 0]), P([0.31, 1.6, 0]), 0.08 * b.w, 0.08 * b.w, spec.jacket));
  body.push(limb(P([0, 1.58, 0]), P([0, 1.8, 0.01]), 0.07 * b.w, 0.06 * b.w, spec.skin));
  if (spec.cape) {
    body.push(paint(new BoxGeometry(0.62 * b.w, 1.25 * b.h, 0.05).translate(0, 1.0 * b.h, -0.2), spec.cape.color));
    body.push(paint(new BoxGeometry(0.64 * b.w, 0.1 * b.h, 0.055).translate(0, 0.42 * b.h, -0.2), spec.cape.trim));
  }
  body.push(paint(new SphereGeometry(r, 18, 14).scale(0.94, 1.12, 1).translate(...head), spec.skin));
  body.push(...hairParts(spec.hair, head, b.head, spec.hair.color));
  body.push(...accessories(spec, head, r, b));
  const ink = mergeGeometries(body);
  for (const p of body) p.dispose();
  // the hull's welded smooth normals, position-only, so the line closes and is the same pixels everywhere
  const hull = ink.clone();
  hull.deleteAttribute("color");
  hull.deleteAttribute("normal");
  const outline = mergeVertices(hull, 1e-3);
  outline.computeVertexNormals();
  const faceParts_ = faceParts(spec.face, head, r);
  const face = mergeGeometries(faceParts_);
  f = { ink, outline, face };
  CACHE.set(sp, f);
  return f;
}
