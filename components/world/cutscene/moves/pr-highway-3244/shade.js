// THE PIXAR-BRIGHT LOOK for the Highway dimension: one lit, glossy shader the
// whole speedway shares (cars, stands, crowd, mesas, flags), so every surface
// sits in the same warm desert sunset: a golden key from camera-left, a rose
// rim from the sun, a blue sky fill, a sand bounce from below, a tight
// specular and a sky reflection that grows with the fresnel (the car paint).
// Colours are picked in sRGB and written pow(c, 2.2), like the stage's.
// Cost: no lights, no shadow maps, no textures; geometry carries its colour.

import { BufferAttribute, Color, Euler, Matrix4, Quaternion, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export const rgb = (h) => {
  const c = new Color(h);
  return [c.r, c.g, c.b].map((v) => Math.pow(v, 1 / 2.2)); // back to the sRGB number the hex reads
};
export const sr = (h) => new Vector3(...rgb(h));
const u = (v) => ({ value: v });

// the sun the sky paints; the key light comes from camera-left, higher
export const SUN_SKY = new Vector3(-0.78, 0.09, -0.62).normalize();
export const KEY = new Vector3(-0.5, 0.5, 0.62).normalize();

// the sunset sky, by direction, and the horizon haze every surface fades to
export const SKY = /* glsl */ `
  uniform vec3 uSun;
  float sHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float sNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(sHash(i), sHash(i + vec2(1, 0)), f.x), mix(sHash(i + vec2(0, 1)), sHash(i + vec2(1, 1)), f.x), f.y);
  }
  float sFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * sNoise(p); p *= 2.03; a *= 0.5; } return s; }
  vec3 skyCol(vec3 d) {
    float h = d.y;
    vec3 zen = vec3(0.12, 0.2, 0.55);
    vec3 up = vec3(0.4, 0.42, 0.82);
    vec3 rose = vec3(0.98, 0.52, 0.5);
    vec3 gold = vec3(1.0, 0.76, 0.38);
    vec3 c = mix(gold, rose, smoothstep(0.0, 0.14, h));
    c = mix(c, up, smoothstep(0.1, 0.4, h));
    c = mix(c, zen, smoothstep(0.35, 0.95, h));
    float s = max(dot(d, uSun), 0.0);
    c += vec3(1.0, 0.7, 0.32) * pow(s, 5.0) * 0.5 + vec3(1.0, 0.86, 0.55) * pow(s, 40.0) * 0.5;
    c = mix(c, vec3(1.0, 0.97, 0.86), smoothstep(0.9993, 0.9998, dot(d, uSun)));
    // big soft cumulus, lit from under by the sun: pink on the belly, gold on the crown
    if (h > 0.02) {
      vec2 q = vec2(atan(d.x, -d.z) * 1.6, h * 5.0);
      float cl = sFbm(q * vec2(1.0, 2.2) + vec2(3.0, 0.0));
      float cm = smoothstep(0.52, 0.72, cl) * smoothstep(0.02, 0.14, h) * (1.0 - smoothstep(0.55, 0.9, h));
      float belly = smoothstep(0.62, 0.52, sFbm(q * vec2(1.0, 2.2) + vec2(3.0, 0.5)));
      vec3 cc = mix(vec3(1.0, 0.86, 0.72), vec3(1.0, 0.5, 0.52), belly);
      cc = mix(cc, vec3(1.0, 0.8, 0.45), pow(s, 3.0));
      c = mix(c, cc, cm * 0.9);
    }
    return c;
  }
  vec3 hazeCol(vec3 d) { return mix(vec3(1.0, 0.72, 0.42), vec3(0.98, 0.58, 0.5), clamp(d.y * 6.0, 0.0, 1.0)); }`;

// the lit surface: albedo, normal, world position, gloss (0..1), reflectivity (0..1)
export const LIGHT = /* glsl */ `
  uniform vec3 uKey;
  uniform vec3 uSky2;
  vec3 lit(vec3 alb, vec3 n, vec3 wp, float gloss, float refl, float fogK) {
    vec3 V = normalize(cameraPosition - wp);
    float ndl = dot(n, uKey);
    float wrap = clamp((ndl + 0.3) / 1.3, 0.0, 1.0);
    vec3 key = vec3(1.0, 0.8, 0.55) * wrap * 1.0;
    vec3 fill = mix(vec3(0.62, 0.45, 0.36), vec3(0.5, 0.58, 0.95), n.y * 0.5 + 0.5) * 0.62;
    float rimK = pow(1.0 - max(dot(n, V), 0.0), 2.5);
    vec3 rim = vec3(1.0, 0.62, 0.34) * rimK * max(dot(n, normalize(uSun * vec3(1.0, 0.0, 1.0) + vec3(0.0, 0.3, 0.0))) * 0.5 + 0.6, 0.0) * 0.55;
    vec3 c = alb * (key + fill) + alb * rim;
    vec3 H = normalize(uKey + V);
    float nh = max(dot(n, H), 0.0);
    c += vec3(1.0, 0.93, 0.78) * (pow(nh, 110.0) * 1.5 + pow(nh, 18.0) * 0.12) * gloss;
    vec3 R = reflect(-V, n);
    vec3 env = R.y > 0.0 ? skyCol(R) : mix(vec3(0.95, 0.62, 0.4), vec3(0.7, 0.45, 0.32), clamp(-R.y * 2.0, 0.0, 1.0));
    float fres = 0.14 + 0.86 * pow(1.0 - max(dot(n, V), 0.0), 3.0);
    c = mix(c, env * (0.7 + 0.5 * alb), clamp(refl * fres * 1.15, 0.0, 0.9));
    float d = length(cameraPosition - wp);
    c = mix(c, hazeCol(-V), clamp(1.0 - exp(-d * fogK), 0.0, 1.0));
    return mix(c, hazeCol(-V), smoothstep(190.0, 255.0, d));
  }`;

// every lit surface shares these two uniform objects, so the move turns the whole sun with one write per frame
export const SUN_U = u(SUN_SKY.clone());
export const KEY_U = u(KEY.clone());
export const lightUniforms = () => ({ uSun: SUN_U, uKey: KEY_U });

// GLSL for instancing and the plain vertex path, shared by the solid materials
const VERT = /* glsl */ `
  attribute vec3 aCol;
  attribute vec2 aMat; // x: how much the instance colour paints this vertex, y: gloss
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vCol;
  varying vec2 vMat;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = mat3(instanceMatrix) * n;
    #endif
    vec4 w = modelMatrix * p;
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * n);
    vCol = aCol;
    vMat = aMat;
    #ifdef USE_INSTANCING_COLOR
      vCol = mix(aCol, instanceColor, aMat.x);
    #endif
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

// The glossy solid: vertex colour (aCol), per-vertex gloss (aMat.y), the instance colour where aMat.x says.
export function solid({ fogK = 0.0042, refl = 1, side } = {}) {
  return new ShaderMaterial({
    uniforms: { ...lightUniforms(), uRefl: u(refl) },
    ...(side ? { side } : {}),
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform float uRefl;
      varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying vec2 vMat;
      ${SKY}
      ${LIGHT}
      void main() {
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        vec3 c = lit(vCol, n, vW, vMat.y, vMat.y * uRefl, ${fogK.toFixed(5)});
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
}

// ---- geometry helpers ---------------------------------------------------

// non-indexed with smooth or flat normals, no uv, plus the colour and material attributes
export function paint(geometry, hex, { gloss = 0.2, paintMask = 0, smooth = false, m4 } = {}) {
  let g = geometry;
  if (m4) g = g.clone().applyMatrix4(m4);
  if (!smooth) {
    g = g.index ? g.toNonIndexed() : g.clone();
    g.computeVertexNormals();
  } else if (!g.attributes.normal) g.computeVertexNormals();
  if (g.index) g = g.toNonIndexed();
  g.deleteAttribute("uv");
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const mt = new Float32Array(n * 2);
  const [r, gg, b] = rgb(hex);
  for (let i = 0; i < n; i++) {
    col[i * 3] = r;
    col[i * 3 + 1] = gg;
    col[i * 3 + 2] = b;
    mt[i * 2] = paintMask;
    mt[i * 2 + 1] = gloss;
  }
  g.setAttribute("aCol", new BufferAttribute(col, 3));
  g.setAttribute("aMat", new BufferAttribute(mt, 2));
  return g;
}
// per-vertex colour jitter (a little hand variation: no two facets quite alike)
export function jitterColour(g, amount = 0.06, seed = 1) {
  const c = g.attributes.aCol;
  for (let t = 0; t < c.count; t += 3) {
    const k = 1 + (hash(t * 0.37 + seed, 3) - 0.5) * 2 * amount;
    for (let j = 0; j < 3; j++) for (let a = 0; a < 3; a++) c.array[(t + j) * 3 + a] *= k;
  }
  return g;
}
export const merge = (list) => mergeGeometries(list);
const E = new Euler();
// a placement matrix: position, euler rotation, uniform or per-axis scale
export const at = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(E.set(rx, ry, rz)), Array.isArray(s) ? new Vector3(...s) : new Vector3(s, s, s));
