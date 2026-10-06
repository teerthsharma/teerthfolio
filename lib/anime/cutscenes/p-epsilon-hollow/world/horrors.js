// THE NAMED TITANS (bible 3.6): hand, skull, god-form, maw, the far spire, and the plinths. One basalt, one cel shader.
// Geometry attributes: aGlow (0 stone, 1 teal socket, 2 gold socket), aSway (0 rigid .. 1 tentacle tip), aRow (instanced: atlas row).
import { BoxGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, DoubleSide, BackSide, Float32BufferAttribute, ShaderMaterial, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { U } from "./palette.js";
import { BANDS, NOISE3, SLASH } from "./glsl.js";

// ---- geometry -------------------------------------------------------------------------------------------------------
function part(g, glow = 0) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  const c = n.attributes.position.count;
  if (!n.attributes.aGlow) n.setAttribute("aGlow", new Float32BufferAttribute(new Float32Array(c).fill(glow), 1));
  if (!n.attributes.aSway) n.setAttribute("aSway", new Float32BufferAttribute(new Float32Array(c), 1));
  return n;
}
// a tapered tube along a Catmull-Rom path; aSway grows 0 -> sway along the length (v = ring index / tubular segments)
function tube(pts, r, glow = 0, sway = 0) {
  const TS = 14, RS = 5;
  const g = new TubeGeometry(new CatmullRomCurve3(pts.map(([x, y, z]) => new Vector3(x, y, z))), TS, r, RS, false);
  const a = new Float32Array(g.attributes.position.count);
  for (let v = 0; v < a.length; v++) a[v] = sway * Math.pow(Math.floor(v / (RS + 1)) / TS, 1.3);
  g.setAttribute("aSway", new Float32BufferAttribute(a, 1));
  return part(g, glow);
}
const merged = (parts) => mergeGeometries(parts);

// "TSS packing": a clawing hand, 4 fingers + thumb (a grasp of caps on a sphere)
export function hand() {
  const parts = [part(new BoxGeometry(1.7, 2.2, 0.7).translate(0, 1.0, 0))];
  [-0.6, -0.2, 0.2, 0.6].forEach((x, i) => parts.push(tube([[x, 2.0, 0], [x * 1.2, 3.1 + (i % 2) * 0.3, 0.2], [x * 1.3, 3.7, 0.9], [x * 1.2, 3.4, 1.5]], 0.2 - Math.abs(x) * 0.05)));
  parts.push(tube([[0.85, 1.0, 0.1], [1.5, 1.7, 0.4], [1.7, 2.4, 1.0]], 0.22));
  return merged(parts);
}
// "Certified beta-0": a skull with 7 sockets (the MST merge heights); ONE burns gold: the in-band edge it refuses on
export function skull() {
  const parts = [part(new SphereGeometry(1.7, 16, 12).scale(1, 0.85, 1.1).translate(0, 0.9, 0)), part(new BoxGeometry(1.8, 0.7, 1.2).translate(0, 0.2, 0.8))];
  [[-0.55, 1.15], [0.55, 1.15], [0, 1.65], [-0.95, 1.6], [0.95, 1.6], [-0.3, 0.6], [0.3, 0.6]].forEach(([x, y], i) =>
    parts.push(part(new SphereGeometry(0.22, 8, 6).translate(x, y, 1.72 - Math.abs(x) * 0.35), i === 2 ? 2 : 1)));
  return merged(parts);
}
// "T4 AGCR, not certified": the tentacled god-form, 6 tentacles that 2-cycle (aSway drives the tremor)
export function godform() {
  const parts = [part(new SphereGeometry(1.4, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.6).translate(0, 0.3, 0))];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    parts.push(tube([[c * 0.9, 0.6, s * 0.9], [c * 1.8, 2.0, s * 1.8], [c * 1.4, 3.6 + (i % 3) * 0.6, s * 1.4], [c * 2.2, 4.6 + (i % 2), s * 2.2]], 0.28 - (i % 2) * 0.06, 0, 1));
  }
  parts.push(part(new SphereGeometry(0.25, 8, 6).translate(0, 1.55, 0.8), 1));
  return merged(parts);
}
// "T8 TEB, Landauer": a maw with 16 teeth, the throat glowing (the maw eats bits)
export function maw() {
  const parts = [part(new TorusGeometry(1.7, 0.6, 10, 24).translate(0, 1.6, 0)), part(new CylinderGeometry(1.25, 1.25, 0.4, 20).rotateX(Math.PI / 2).translate(0, 1.6, -0.2), 1)];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    parts.push(part(new ConeGeometry(0.13, 0.55, 5).rotateZ(a + Math.PI / 2).translate(Math.cos(a) * 1.2, 1.6 + Math.sin(a) * 1.2, 0.15)));
  }
  return merged(parts);
}
// the far spire (LOD, ~60 tris): a crooked spire of bone and two stumps, one socket lit
export function spire() {
  return merged([
    part(new ConeGeometry(0.9, 5.5, 5, 1).translate(0, 2.75, 0)),
    part(new ConeGeometry(0.45, 3.4, 4, 1).rotateZ(0.5).translate(1.0, 1.4, 0.2)),
    part(new ConeGeometry(0.4, 2.8, 4, 1).rotateZ(-0.6).translate(-0.9, 1.1, -0.3)),
    part(new SphereGeometry(0.28, 4, 3).translate(0, 3.3, 0.55), 1),
  ]);
}
// the plinth: 1.6 x 0.4 x 0.4 m, face +z (aspect 4:1 = one atlas row). The name plinths are this scaled x1.95 (cap height ~0.35 m).
export const PLINTH_W = 1.6, PLINTH_H = 0.4;
export const plinth = () => part(new BoxGeometry(PLINTH_W, PLINTH_H, 0.4).translate(0, PLINTH_H / 2, 0));

// ---- material -------------------------------------------------------------------------------------------------------
// vertex: instance matrix, tentacle tremor. Offset = aSway * 0.3 m * (sin(2pi 0.4 t + ph + 1.3 y), 0.4 sin(...), cos(...)), t on threes.
const VERT = /* glsl */ `
  attribute float aGlow; attribute float aSway; attribute float aRow;
  uniform float uThree;
  varying vec3 vWorld; varying vec3 vN; varying vec3 vObj; varying float vGlow; varying float vSeed; varying float vRow;
  vec3 sway(vec3 p, mat4 m) {
    float ph = m[3].x * 0.37 + m[3].z * 0.53;
    float w = uThree * 2.5133;                               // 2 pi 0.4 Hz
    return p + aSway * 0.3 * vec3(sin(w + ph + p.y * 1.3), 0.4 * sin(w * 1.3 + ph * 1.7), cos(w + ph * 0.6 + p.y * 0.9));
  }
  void main() {
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = modelMatrix * instanceMatrix;
    #endif
    vec3 pos = sway(position, m);
    vec4 w = m * vec4(pos, 1.0);
    vWorld = w.xyz; vObj = position;
    vN = normalize(mat3(m) * normal);
    vGlow = aGlow; vRow = aRow;
    vSeed = fract(sin(dot(m[3].xz, vec2(12.9, 78.2))) * 43758.5);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

// fragment maths (bible 3.6 shared block):
//   key = normalize(hole + up*0.45)  (the eye on the horizon + a grazing tilt)   l = dot(N, key)
//   band3(l): shadow #231e2a (<0), mid #5a4a63 (0..0.5), lit gold #c98a4e -> #ffd9a0 (>0.5)   hard edges
//   teal bounce from below: + teal * 0.18 * clamp(-dot(N, up), 0, 1) in shadow;  4 px hatch in shadow
//   gold rim, ~1.5 px: step(0.80, 1 - |N.V|) where the surface faces the key  -> #ffb524
//   cracks: abs(n3(1.7 obj + seed) - 0.5) < 0.022 above y 0.25 m, light teal (gold if seed < 0.2), pulse 0.6 + 0.4 sin(t 1.3 + 30 seed) on twos
//   sockets: aGlow 1 teal, 2 the one gold socket (the in-band edge certified_beta0 refuses on)
//   PLINTH: the face (obj z > 0.19) samples the atlas row, ink teal #19e6c8; the top edge (obj y > 0.38) is the gold rim
//   mist: knee-high (0..0.6 m above the crust) teal, posterised to 2 levels, + the far distance mist as on the planet
const FRAG = /* glsl */ `
  ${NOISE3}
  ${BANDS}
  ${SLASH}
  uniform float uTime, uId, uR, uRows;
  uniform vec3 uHole, uCenter;
  uniform vec3 cDeep, cDark, cLit, cTeal, cGold, cRimG, cRimM, cMist;
  uniform sampler2D uMap;
  varying vec3 vWorld; varying vec3 vN; varying vec3 vObj; varying float vGlow; varying float vSeed; varying float vRow;
  void main() {
    vec3 ec; float ed;
    if (slashCut(ec, ed) > 0.5) discard;
    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    vec3 rel = vWorld - uCenter;
    float rl = max(length(rel), 1e-3);
    vec3 up = rel / rl;
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 key = normalize(uHole + up * 0.45);
    float l = dot(N, key);
    vec3 lit = mix(cRimM, cRimG, smoothstep(0.5, 1.0, l));
    vec3 shadow = cDark + cTeal * 0.18 * clamp(-dot(N, up), 0.0, 1.0);
    vec3 col = band3(l, shadow, cLit, lit);
    col *= 0.78 + 0.45 * n3(vObj * 3.0);
    if (l < 0.0) col = mix(col, cDeep, 0.5 * hatch4());
    float rim = step(0.80, 1.0 - abs(dot(N, V))) * step(0.1, l);
    col = mix(col, cGold, rim);
    vec3 glowC = (vSeed < 0.2 || vGlow > 1.5) ? cGold : cTeal;
    float pulse = 0.6 + 0.4 * sin(uTime * 1.3 + vSeed * 30.0);
    float cr = abs(n3(vObj * 1.7 + vSeed * 9.0) - 0.5);
    float crack = smoothstep(0.022, 0.0, cr) * step(0.25, vObj.y);
    col += glowC * (crack * 0.6 + vGlow * 0.9) * pulse;
    #ifdef NAMED
      if (vObj.z > 0.19) {
        vec2 uv = vec2(vObj.x / 1.6 + 0.5, vObj.y / 0.4);
        uv.y = 1.0 - (vRow + 1.0 - uv.y) / uRows;
        float ink = 1.0 - texture2D(uMap, uv).r;
        col = mix(col, cTeal * 1.15, ink * 0.92);
      }
      col = mix(col, cGold * 1.2, step(0.38, vObj.y) * step(0.2, N.y));      // the gold rim on the top edge
    #endif
    // knee-high mist, then the far ground mist
    float h = rl - uR;
    float knee = (1.0 - smoothstep(0.0, 0.6, h)) * 0.7;
    knee = floor(knee * 2.0 + 0.5) * 0.5;
    col = mix(col, cMist, knee * 0.8);
    float d = length(vWorld - cameraPosition);
    float alt = length(cameraPosition - uCenter) - uR;
    float fm = smoothstep(14.0, 60.0, d) * (1.0 - smoothstep(8.0, 45.0, alt));
    col = mix(col, cMist, floor(fm * 2.0 + 0.5) * 0.5 * 0.8);
    col = mix(col, ec, ed);
    gl_FragColor = vec4(col, uId);
  }`;

// the 2 px ink hull: the inverted hull pushed along the clip-space normal by a constant 2 px (hull #120a1a)
const HULL_VERT = /* glsl */ `
  attribute float aSway;
  uniform float uThree; uniform vec2 uRes;
  varying vec3 vWorld;
  void main() {
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = modelMatrix * instanceMatrix;
    #endif
    float ph = m[3].x * 0.37 + m[3].z * 0.53;
    float w = uThree * 2.5133;
    vec3 pos = position + aSway * 0.3 * vec3(sin(w + ph + position.y * 1.3), 0.4 * sin(w * 1.3 + ph * 1.7), cos(w + ph * 0.6 + position.y * 0.9));
    vec4 wp = m * vec4(pos, 1.0);
    vWorld = wp.xyz;
    vec4 c = projectionMatrix * viewMatrix * wp;
    vec3 nw = normalize(mat3(m) * normal);
    vec2 nd = (projectionMatrix * viewMatrix * vec4(nw, 0.0)).xy;
    vec2 dirPx = normalize(nd * uRes + 1e-6);
    c.xy += dirPx * (2.0 * 2.0 / uRes) * c.w;                  // 2 px: NDC spans 2 units across uRes
    gl_Position = c;
  }`;
const HULL_FRAG = /* glsl */ `
  ${SLASH}
  uniform float uId; uniform vec3 cHull;
  varying vec3 vWorld;
  void main() { vec3 ec; float ed; if (slashCut(ec, ed) > 0.5) discard; gl_FragColor = vec4(mix(cHull, ec, ed), uId); }`;

const stoneUniforms = (S, id) => ({
  uTime: S.uTime, uThree: S.uThree, uId: { value: id }, uR: { value: S.R }, uRows: { value: 1 }, uHole: S.uHole, uCenter: S.uCenter,
  uCut: S.uCut, uCutN: S.uCutN, uRes: S.uRes, uEdgeA: S.uEdgeA, uEdgeB: S.uEdgeB, uMap: { value: null },
  cDeep: U("deep"), cDark: U("basaltDark"), cLit: U("basaltLit"), cTeal: U("teal"), cGold: U("gold"), cRimG: U("rimGold"), cRimM: U("rimMid"), cMist: U("mist"),
});

// rows/map: an atlas -> the plinth variant (NAMED); otherwise the plain basalt
export function stoneMaterial(S, { id = 0.7, map = null, rows = 1 } = {}) {
  const u = stoneUniforms(S, id);
  u.uMap.value = map; u.uRows.value = rows;
  return new ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, defines: map ? { NAMED: 1 } : {}, side: DoubleSide });
}
export function hullMaterial(S, id = 0.7) {
  return new ShaderMaterial({
    side: BackSide,
    uniforms: { uThree: S.uThree, uRes: S.uRes, uId: { value: id }, cHull: U("hull"), uCut: S.uCut, uCutN: S.uCutN, uEdgeA: S.uEdgeA, uEdgeB: S.uEdgeB },
    vertexShader: HULL_VERT, fragmentShader: HULL_FRAG,
  });
}
