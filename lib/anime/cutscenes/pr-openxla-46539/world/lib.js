// SHARED HELPERS for the openxla world (this folder only; Consolidate may promote them).
import { Color, CustomBlending, Mesh, OneFactor, PlaneGeometry, ShaderMaterial, ZeroFactor, SrcAlphaFactor, OneMinusSrcAlphaFactor } from "three";
import { merge } from "../../../kit3d.js";
import { paint, painted } from "../../../sdf.js";

export const V = (h) => { const c = new Color(h); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

// ADDITIVE blending that keeps the target's alpha channel (the set id): rgb += src, alpha untouched.
export const ADD = { transparent: true, depthWrite: false, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor };
// OVER blending (soft alpha) that keeps the target alpha.
export const OVER = { transparent: true, depthWrite: false, blending: CustomBlending, blendSrc: SrcAlphaFactor, blendDst: OneMinusSrcAlphaFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor };

// a painted set mesh in one flat colour pair (the anime program cel-shades between them)
export function solid(engine, geo, col, shade, id = 0.5) {
  return engine.prop(painted(geo, paint(col, shade)), id);
}
export const mergeSolid = (engine, geos, col, shade, id, name) => solid(engine, merge(geos, name), col, shade, id);

// a cylindrical billboard: the card turns about Y to face the camera, whatever the parent's yaw
export function faceCamera(mesh) {
  const p = { x: 0, y: 0, z: 0 };
  mesh.onBeforeRender = (_r, _s, cam) => {
    const e = mesh.matrixWorld.elements; p.x = e[12]; p.z = e[14];
    const par = mesh.parent;
    const want = Math.atan2(cam.position.x - p.x, cam.position.z - p.z);
    let base = 0;
    if (par) { par.updateWorldMatrix(true, false); const m = par.matrixWorld.elements; base = Math.atan2(m[8], m[10]); }
    mesh.rotation.y = want - base;
    mesh.updateMatrixWorld(true);
  };
  return mesh;
}

// a soft additive glow sprite (radial falloff), unit quad; scale it per use. u.uA is the intensity, u.uCol the colour.
export function glowSprite(col, power = 2.2) {
  const m = new ShaderMaterial({
    ...ADD,
    uniforms: { uCol: { value: new Color(col) }, uA: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    // I = A * (1 - r)^p, r = |uv - 0.5| * 2 (zero at the quad edge)
    fragmentShader: `uniform vec3 uCol; uniform float uA; varying vec2 vUv;
      void main() { float r = clamp(length(vUv - 0.5) * 2.0, 0.0, 1.0); float k = pow(1.0 - r, ${power.toFixed(2)}); gl_FragColor = vec4(uCol * uA * k, 0.0); }`,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), m);
  mesh.userData.layer = 1; mesh.frustumCulled = false; mesh.renderOrder = 4;
  return mesh;
}

// STROKE TEXT as GLSL: emits `float <name>(vec2 p)`, the distance to the stroked string, p in glyph units
// (a glyph is 1.6 wide, 3 tall, advance 2.4). Distance to the nearest of the polyline segments.
const GLYPH = {
  P: [[[0, 0], [0, 3], [1.6, 3], [1.6, 1.5], [0, 1.5]]],
  L: [[[0, 3], [0, 0], [1.6, 0]]],
  U: [[[0, 3], [0, 0], [1.6, 0], [1.6, 3]]],
  S: [[[1.6, 3], [0, 3], [0, 1.5], [1.6, 1.5], [1.6, 0], [0, 0]]],
  T: [[[0, 3], [1.6, 3]], [[0.8, 3], [0.8, 0]]],
  R: [[[0, 0], [0, 3], [1.6, 3], [1.6, 1.5], [0, 1.5]], [[0.6, 1.5], [1.6, 0]]],
  A: [[[0, 0], [0.8, 3], [1.6, 0]], [[0.35, 1.1], [1.25, 1.1]]],
  ".": [[[0.7, 0], [0.9, 0]]],
};
export function textGLSL(name, str) {
  let body = "", x = 0;
  for (const ch of str) {
    if (ch !== " ") for (const line of GLYPH[ch] ?? []) for (let i = 0; i < line.length - 1; i++) {
      const [a, b] = [line[i], line[i + 1]];
      body += `d = min(d, sdSeg(p, vec2(${(a[0] + x).toFixed(2)}, ${a[1].toFixed(2)}), vec2(${(b[0] + x).toFixed(2)}, ${b[1].toFixed(2)})));\n`;
    }
    x += 2.4;
  }
  return `float ${name}(vec2 p) { float d = 1e3;\n${body}return d; }`;
}
export const textWidth = (str) => str.length * 2.4 - 0.8;
export const SEG = `float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }`;

// ev(): when did a named event start? A cue name is honoured only if it started inside the bible's window (+-tol s);
// otherwise the bible's own time is used, so scrubbing equals playing even if a beat name repeats.
export function evTime(cue, names, fallback, tol = 0.9) {
  for (const n of names) {
    const s = cue.since(n);
    if (Number.isFinite(s)) { const t0 = cue.t - s; if (Math.abs(t0 - fallback) <= tol) return t0; }
  }
  return fallback;
}
