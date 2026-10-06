// p-resolvent WORLD: shared constants, the unmake/kintsugi/dusk GLSL every world material carries, and small helpers.
// Layout (metres): seal at the origin, Aura's dais at AURA, the fountain at FOUNT, curtain wall at z -34.6, keep and tower behind it.
import { BoxGeometry, CanvasTexture, Color, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Vector3 } from "three";
import { V } from "../../../paint.js";
import { surface } from "../../../kit/surface.js";

export { V };
export const VC = (c) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; // an already-linear Color -> GLSL
// bible hexes (s sampled, d derived, e estimated; see scripts/p-resolvent.md 2.2)
export const C = {
  zenith: "#6fc4c0", mid: "#b47491", horizon: "#da806a", gold: "#f0b840", sunHalo: "#ffd27a", disc: "#fff0c8",
  ridge1: "#b88c9a", ridge2: "#8e6a82", ridge3: "#5e5260", mist: "#be6443", cloudLit: "#ffdca0", cloudUnder: "#d68fa0",
  stone: ["#c4a67c", "#cdb088", "#d3b88f", "#b99c76"], stoneTop: "#f0d7ae", stoneShade: "#7a5578", cast: "#5a3c8a", deep: "#2f121e",
  line: "#1c1228", rim: "#ffb040", roof: "#b4502a", gateMouth: "#3b2a30", slit: "#ffd488",
  moss: "#5e7f2a", grassLight: "#97ae4a", grassTip: "#d8d872", grassWarm: "#e0784a", litter: ["#e08a2e", "#f0b840", "#b84a22"],
  tipLit: "#f0b840", treeBody: "#d18e4e", treeMid: "#9b543c", treeShade: "#5b1e10", trunk: "#5a3a2c",
  clover: "#f4f1e8", butter: "#1f7fd6", butterEdge: "#0b3d7a", puddle: "#8fd0c8", crack: "#2a1c26",
  kGold: "#ffd488", kEdge: "#d9a93a", snow: "#f4f1ea", snowShade: "#cfd6ea", ray: "#ffd488",
};
export const SUN = new Vector3(-0.55, 0.22, -0.62).normalize(); // direction TO the sun
export const SHADOW_DIR = [-SUN.x, -SUN.z].map((v, _, a) => v / Math.hypot(a[0], a[1]));
export const SHADOW_K = 2.2; // stylised: shadow length = height x 2.2 (true cot(elevation) is about 3.7)
export const AURA = [2.3, -5.0];
export const FOUNT = [-4.4, -4.6];

// the court bowl: flat to r 36, rising to 4.5 m at r 52, then gentle rolling hills
export function groundY(x, z) {
  const r = Math.hypot(x, z);
  if (r < 36) return 0;
  const t = Math.min((r - 36) / 16, 1);
  return 4.5 * t * t + (r > 52 ? 0.6 * Math.sin(x * 0.07) * Math.cos(z * 0.05) * Math.min((r - 52) / 20, 1) : 0);
}

// shared animated uniforms: crack reach, dissolve, dusk dim, and the origin the cracks and the dissolve spread from
export const makeU = () => ({ uCrack: { value: 0 }, uDis: { value: 0 }, uDim: { value: 0 }, uOrigin: { value: new Vector3(AURA[0], 0, AURA[1]) } });

// GLSL prelude. Maths:
//  dissolve field f(P) = 0.55 fbm(P.xz 0.22) + 0.45 clamp(|P.xz - origin| / 70) : low near the scale, so the court unmakes outward
//    from it with a ragged front. A fragment with f < 1.25 uDis - 0.05 is discarded; the next 0.03 of f is the gold edge.
//  kintsugi: the crack front reaches R = 58 uCrack metres from the origin; crack lines are the cell borders of two Voronoi layers
//    (F2 - F1 ~ 0), the coarse one always, the fine one only in half of its cells so it BRANCHES off the trunk lines; the 1.4 percent
//    wide core is gold #ffd488, the 4 percent wide edge #d9a93a (hard, 2 tone, no glow gradient).
//  dusk: c *= mix(1, violet (0.62, 0.5, 0.86), 0.6 uDim): the court goes violet round the column.
export const UN = /* glsl */ `
  uniform float uCrack; uniform float uDis; uniform float uDim; uniform vec3 uOrigin;
  float dissField(vec3 P) { return 0.55 * fbm(P.xz * 0.22 + 4.0) + 0.45 * clamp(length(P.xz - uOrigin.xz) / 70.0, 0.0, 1.0) + P.y * 0.004; }
  float unmakeEdge(vec3 P) {
    if (uDis <= 0.0) return 0.0;
    float f = dissField(P), d = uDis * 1.25 - 0.05;
    if (f < d) discard;
    return 1.0 - smoothstep(d, d + 0.03, f);
  }
  vec3 kintsugi(vec3 c, vec3 P) {
    if (uCrack <= 0.0) return c;
    float r = length(P.xz - uOrigin.xz), reach = uCrack * 58.0;
    float grow = 1.0 - smoothstep(reach - 4.0, reach, r);
    vec2 q = P.xz + 0.35 * vec2(fbm(P.xz * 0.5), fbm(P.xz * 0.5 + 9.0));
    vec2 a = vor(q * 0.30), b = vor(q * 0.85 + 7.0);
    float trunk = 1.0 - smoothstep(0.0, 0.040, a.y);
    float twig = (1.0 - smoothstep(0.0, 0.028, b.y)) * step(0.45, h21(floor(q * 0.85 + 7.0)));
    float k = clamp(trunk + twig, 0.0, 1.0) * grow;
    float core = (1.0 - smoothstep(0.0, 0.014, min(a.y, b.y + 0.02))) * grow;
    c = mix(c, ${V(C.kEdge)} * 1.2, k);
    return mix(c, ${V(C.kGold)} * 1.8, core * step(0.5, k));
  }
  vec3 finish(vec3 c, vec3 P, float edge) {
    c = kintsugi(c, P);
    c *= mix(vec3(1.0), vec3(0.62, 0.5, 0.86), uDim * 0.6);
    return mix(c, vec3(1.0, 0.78, 0.38) * 2.2, edge);
  }`;

// a world material: the surface kit with the unmake uniforms and prelude. body defines `vec3 shade(vec3 P, vec3 N, vec3 V)`.
export function mat(ctx, U, body, { tools = ["noise"], uniforms = {}, ...rest } = {}) {
  return surface(ctx.engine.shared, UN + body, { tools, uniforms: { ...U, ...uniforms }, ...rest });
}
// a flat 2 tone cel colour: lit = hex, shadow = hex x 0.55 rotated toward violet (the shadow-hue rule, 2.2)
export function flat(ctx, U, hex, o = {}) {
  const lit = new Color(hex).multiplyScalar(o.mul ?? 1), sh = new Color(hex).multiplyScalar(0.55).lerp(new Color(C.cast), 0.3);
  return mat(ctx, U, `vec3 shade(vec3 P, vec3 N, vec3 Vw) { float e = unmakeEdge(P);
    float lam = dot(N, normalize(uLightDir)); vec3 c = mix(${VC(sh)}, ${VC(lit)}, smoothstep(0.08, 0.12, lam));
    return finish(c, P, e); }`, o);
}
// blend that keeps the target alpha (the set id): over for colour, alpha untouched
export const OVER = { transparent: true, depthWrite: false, blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201 };
export const ADD = { transparent: true, depthWrite: false, blending: 5, blendSrc: 204, blendDst: 201, blendSrcAlpha: 200, blendDstAlpha: 201 };

export function box(w, h, d, [x, y, z], yaw = 0) {
  const g = new BoxGeometry(w, h, d); g.rotateY(yaw); g.translate(x, y, z); return g;
}

// a painted text decal (relief carvings, the Graz lintel): a canvas texture on a plane, over-blended.
export function decal(text, { w = 2, h = 0.5, col = "#5a3c8a", alpha = 0.6, strike = false, light = null, font = "italic 700" } = {}) {
  const m = new Mesh(new PlaneGeometry(w, h));
  if (typeof document === "undefined") return m;
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = Math.round(512 * h / w);
  const g = cv.getContext("2d"); g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `${font} ${Math.round(cv.height * 0.8)}px Georgia, serif`;
  if (light) { g.fillStyle = light; g.fillText(text, cv.width / 2 + 3, cv.height / 2 + 4); }
  g.fillStyle = col; g.fillText(text, cv.width / 2, cv.height / 2);
  if (strike) { g.strokeStyle = col; g.lineWidth = cv.height * 0.07; g.beginPath(); g.moveTo(cv.width * 0.14, cv.height * 0.54); g.lineTo(cv.width * 0.86, cv.height * 0.46); g.stroke(); }
  const tex = new CanvasTexture(cv); tex.colorSpace = SRGBColorSpace;
  m.material = new ShaderMaterial({
    ...OVER, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2,
    uniforms: { tT: { value: tex }, uA: { value: alpha } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform sampler2D tT; uniform float uA; varying vec2 vUv; void main() { vec4 t = texture2D(tT, vUv); gl_FragColor = vec4(t.rgb, t.a * uA); }",
  });
  m.userData.dispose = () => { tex.dispose(); m.material.dispose(); m.geometry.dispose(); };
  return m;
}
export const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
