// pr-topograph-432 FX helpers (layer-local; Consolidate may promote). Pure functions of the clock: scrub == play.
// Seal-local frame: x right, y up, z forward, scaled by seal.scale and turned by seal.yaw (rotation.y = yaw maps local z to (sin yaw, 0, cos yaw)).
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Points, ShaderMaterial } from "three";

export const PAL = {
  goldLit: "#ffd24a", gold: "#e6b43a", goldDk: "#a8741a", hi: "#fff4c0",
  purple: "#b46bff", violet: "#34205f", deep: "#09030f", deepV: "#241044", stone: "#7a6aa0",
  crimson: "#c82040", crimsonDk: "#7a1428", pink: "#ff8a8a", white: "#ffffff",
  // the seven gems of the Staff of Ainz Ooal Gown, canonical order (bible easter egg 2)
  gems: ["#c82040", "#3a8a5a", "#2f6ab0", "#f0b429", "#b46bff", "#e0e0e0", "#ff8a3a"],
};
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sst = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const easeOut3 = (u) => 1 - Math.pow(1 - clamp(u), 3);
export const easeInOut = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
// seconds since a cue started; the bible's own time is the fallback when direction omits the beat (so the layer plays standalone)
export const since = (cue, name, fallbackT, t) => { const s = cue.since(name); return Number.isFinite(s) ? s : t - fallbackT; };
export const col = (hex) => new Color(hex);

// 4-point star / disk billboards. Shape 0: astroid |x|^.6+|y|^.6 < 1 (the cartoon 4-point sparkle); 1: disk. Optional black ink ring (non-additive).
// Per-point size is in metres; gl_PointSize = size * uK / depth. CPU writes positions, colours and sizes each step (counts stay < 300).
const PV = `attribute vec3 aCol; attribute float aSize; varying vec3 vC; uniform float uK;
void main(){ vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize <= 0.0 ? 0.0 : max(2.0, aSize * uK / max(0.1, -mv.z)); }`;
const PF = `varying vec3 vC; uniform float uShape, uInk, uAlpha;
void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; float d;
  if (uShape < 0.5) d = pow(abs(p.x), 0.6) + pow(abs(p.y), 0.6); else d = length(p) * 1.0;
  float lim = uShape < 0.5 ? 1.0 : 1.0;
  if (d > lim) discard;
  vec3 c = vC; float a = uAlpha;
  if (uInk > 0.5 && d > lim - 0.16) { c = vec3(0.035, 0.012, 0.06); a = 1.0; }  // 3 px ink rim
  else if (uShape < 0.5) c = mix(c, vec3(1.0), smoothstep(0.55, 0.0, d));       // white hot core
  gl_FragColor = vec4(c, a); }`;

export function makePoints(n, { shape = 0, additive = false, ink = false, alpha = 1, k = 900 } = {}) {
  const g = new BufferGeometry();
  const pos = new Float32Array(n * 3), cols = new Float32Array(n * 3), size = new Float32Array(n);
  g.setAttribute("position", new BufferAttribute(pos, 3)); g.setAttribute("aCol", new BufferAttribute(cols, 3)); g.setAttribute("aSize", new BufferAttribute(size, 1));
  const m = new ShaderMaterial({
    vertexShader: PV, fragmentShader: PF, transparent: true, depthWrite: false, depthTest: true, blending: additive ? AdditiveBlending : 1,
    uniforms: { uK: { value: k }, uShape: { value: shape }, uInk: { value: ink ? 1 : 0 }, uAlpha: { value: alpha } },
  });
  const pts = new Points(g, m); pts.frustumCulled = false; pts.renderOrder = 6;
  const c = new Color();
  return {
    pts, pos, cols, size, n,
    set(i, x, y, z, hex, s) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; c.set(hex); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; size[i] = s; },
    off(i) { size[i] = 0; },
    flush() { g.attributes.position.needsUpdate = g.attributes.aCol.needsUpdate = g.attributes.aSize.needsUpdate = true; },
    dispose() { g.dispose(); m.dispose(); },
  };
}

// seal-local -> world, for CPU-placed points
export function localTo(seal, x, y, z, out) {
  const s = seal.scale, cy = Math.cos(seal.yaw), sy = Math.sin(seal.yaw);
  out[0] = seal.at[0] + (x * cy + z * sy) * s; out[1] = seal.at[1] + y * s; out[2] = seal.at[2] + (-x * sy + z * cy) * s; return out;
}
export const ink = (hex = PAL.deep, o = {}) => ({ color: hex, side: DoubleSide, ...o });
