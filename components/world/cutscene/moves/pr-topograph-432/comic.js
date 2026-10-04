// THE COMIC LOOK of Nazarick (modern American cover art, Mignola / Lee): one toon shader family.
//   cel shading in three flat bands, cross-hatching in the shadow bands drawn in SCREEN SPACE (gl_FragCoord),
//   an inverted-hull ink outline pushed out in CLIP SPACE so it is the same pixel width at every distance,
//   flat colour fills (vertex colours), a gold rim, no soft gradients. All of it in materials: no post pass.
import { BackSide, BufferAttribute, Color, DoubleSide, Group, Mesh, ShaderMaterial, Vector2, Vector3 } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const INK = new Color("#05020a");
// shared uniforms: one write reaches every material
export const SH = {
  uTime: { value: 0 },
  uRes: { value: new Vector2(1, 1) },
  uOut: { value: 2.5 },
  uKey: { value: new Vector3(-0.45, 0.8, 0.55).normalize() },
};

const VERT = /* glsl */ `
  uniform float uTime, uOut;
  uniform vec2 uRes;
  #ifdef SWAY
  attribute float aSway;
  #endif
  varying vec3 vN, vC, vW;
  void main() {
    vec3 p = position;
    #ifdef SWAY
    p.x += sin(uTime * 2.3 + position.y * 1.7) * 0.22 * aSway;
    p.z += cos(uTime * 1.9 + position.x * 1.3) * 0.4 * aSway;
    #endif
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal + vec3(1e-6));
    #ifdef USE_COLOR
    vC = color;
    #else
    vC = vec3(1.0);
    #endif
    vec4 c = projectionMatrix * viewMatrix * w;
    #ifdef OUTLINE
    vec3 nv = mat3(viewMatrix) * vN;
    c.xy += normalize(nv.xy + vec2(1e-5)) * uOut * 2.0 / uRes * c.w;
    #endif
    gl_Position = c;
  }`;

const FRAG = /* glsl */ `
  uniform vec3 uKey, uTint, uInk, uRim;
  uniform float uEmit;
  varying vec3 vN, vC, vW;
  void main() {
    #ifdef OUTLINE
    gl_FragColor = vec4(pow(uInk, vec3(2.2)), 1.0);
    #else
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    float d = dot(n, uKey);
    vec3 base = vC * uTint;
    float band = d > 0.3 ? 1.25 : d > -0.2 ? 0.92 : 0.62; // brighter cel bands: the hall read near-black
    vec3 col = base * band;
    // screen-space cross-hatching in the shadows (diagonal lines, a second set across them in the deepest band)
    vec2 fc = gl_FragCoord.xy;
    float h1 = step(0.55, fract((fc.x + fc.y) / 6.0));
    float h2 = step(0.55, fract((fc.x - fc.y) / 6.0));
    if (band < 0.7) col = mix(col, uInk, max(h1, h2) * 0.5);
    else if (band < 1.0) col = mix(col, uInk, h1 * 0.25);
    vec3 v = normalize(cameraPosition - vW);
    float rim = step(0.78, 1.0 - abs(dot(n, v))) * step(-0.2, d);
    col = mix(col, uRim, rim * 0.75);
    col = mix(col, base * 1.15, uEmit);
    gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
    #endif
  }`;

const mk = (o) =>
  new ShaderMaterial({
    uniforms: { ...SH, uTint: { value: new Color("#ffffff") }, uInk: { value: INK }, uRim: { value: new Color("#ffc43a") }, uEmit: { value: 0 } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    ...o,
  });
// vertexColors: the geometry carries flat colour; sway: aSway weights the cape's flutter
export const toon = ({ sway = false, side = false } = {}) => mk({ vertexColors: true, side: side ? DoubleSide : 0, defines: sway ? { SWAY: 1 } : {} });
export const inkMat = ({ sway = false } = {}) => {
  const m = mk({ side: BackSide, vertexColors: false, defines: { OUTLINE: 1, ...(sway ? { SWAY: 1 } : {}) } });
  return m;
};

// a smooth-normalled twin of a geometry (so the hull has no gaps at a box's corners)
export function hullGeo(g) {
  let h = g.clone();
  for (const k of Object.keys(h.attributes)) if (k !== "position" && k !== "aSway") h.deleteAttribute(k);
  if (h.index) h = h.toNonIndexed();
  if (!h.attributes.aSway) h.setAttribute("aSway", new BufferAttribute(new Float32Array(h.attributes.position.count), 1));
  h = mergeVertices(h, 1e-3);
  h.computeVertexNormals();
  return h;
}

// flat-coloured primitive: indexed geometry with a colour attribute, placed by a matrix-free transform
export function paint(geo, hex, sway = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  const n = g.attributes.position.count;
  const c = new Color(hex);
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new BufferAttribute(arr, 3));
  g.setAttribute("aSway", new BufferAttribute(new Float32Array(n).fill(sway), 1));
  return g;
}
// mixed indexed/non-indexed parts make mergeGeometries return null (which blanked the whole world via prewarm)
export const fuse = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false);

// a lit mesh with its ink hull as a child: one Group, both share the transform
export function inked(geo, { sway = false, side = false, hull: ink = true } = {}) {
  const g = new Group();
  const lit = new Mesh(geo, toon({ sway, side }));
  const hg = hullGeo(geo);
  const hull = new Mesh(hg, inkMat({ sway }));
  g.add(lit);
  if (ink) g.add(hull);
  g.userData = { lit, hull, geos: [geo, hg] };
  g.traverse((o) => (o.frustumCulled = false));
  return g;
}
export function disposeInked(g) {
  for (const x of g.userData.geos ?? []) x.dispose();
  g.userData.lit?.material.dispose();
  g.userData.hull?.material.dispose();
}
