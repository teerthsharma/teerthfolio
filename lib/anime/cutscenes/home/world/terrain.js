// TERRAIN for home: the fjord banks as ONE continuous slope plus a single flat-topped strata cliff band (bible 3.2), the snow
// shelf with lavender trails (3.3), turf only under the eaves, the shingle waterline. Static art: layer 0.
//
// HEIGHT FIELD (metres; x right, z toward the camera, the fjord runs down -z, Vinland at z = -150):
//   left bank, d = inland distance from shoreL(z), kz = smooth(-26, -40, z) (farmstead shelf -> fjord wall):
//     y = shelf(d) + fade * ( (1-kz)(19 smooth(36, 84, d) + 10 smooth(84, 90, d)) + kz(17 smooth(2, 34, d) + 11 smooth(34, 39, d)) ) + lumps    shelf = -0.62 + 1.1 min(1, d/3.6)^0.8 + 0.022 clamp(d-3.6, 0, 30)
//   right bank, d = x - shoreR(z):
//     y = -0.62 + 1.1 min(1, d/2.2)^0.8 + fade * ( 17 smooth(2, 36, d) + 11 smooth(36, 41, d) ) + lumps
//   channel: y = -0.62 - 2.6 smooth(0, 6, dw).   fade = 1 - 0.92 mouth(z): the walls fall to open sea past the mouth.
//   fjord head (behind the seal, z > 14): y = max(y, -0.62 + 1.2 smooth(14, 20, z) + 22 smooth(24, 64, z)) so a lens that looks aft still sees a world.
//   gravel bar (penguins) at z = -3.7, trimmed so the orca circle (centre 0.5, -0.3, r 3.3) never clips it.
//
// FRAGMENT (one toon pass, hard edges, no soft wash):
//   h = 0.5 N.L + 0.5, lit = step(h, 0.5) antialiased with fwidth (celStep).
//   flatK = smooth(0.84, 0.97, N.y) (shelf, plateau), steep = 1 - smooth(0.50, 0.78, N.y) (walls).
//   snow score s = 0.95 fbm(warp(..)) + 0.5 flatK + 0.2 smooth(0, 25, y); snow = max(flatK, step(0.74, s) (1 - steep))  -> broken patches
//   rock v = 0.85 h + 0.6 (fbm(stretched along the fall line) - 0.5), three flat tones by cel3, dry-brush strokes darken 10%.
//   cliff strata: vertical bands stripe = step(0.45, vn((x+z) 1.3)), two tones per side; the lip under the cap tinted lavender.
//   shadows on flat snow are PAINTED: an ellipse per longhouse and the igloo thrown away from the sun, colour snowShade (bible 3.3).
//   trails: min capsule distance to 6 segments < 0.5 + wobble -> lavender #c9c3ea.   turf: ellipse (footprint + 0.9) x patch noise.
//   aerial haze: 0.5 smooth(90, 300, dist), toward the sun apricot, away blue-violet #7d8fd0 (bible 3.20, cap 0.5).
//   lit luma capped at 0.92 (L8). Alpha = set id 0.5.
import { BufferAttribute, BufferGeometry, Mesh, ShaderMaterial, Vector3, Vector4 } from "three";
import { glslFor } from "../../../tools/index.js";
import { g, SUN, dirOf } from "./palette.js";
import { sm } from "./lib.js";

export const WATER_Y = -0.55, SHORE_L = -6;
const hash2 = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (hash2(ix, iz) * (1 - u) + hash2(ix + 1, iz) * u) * (1 - v) + (hash2(ix, iz + 1) * (1 - u) + hash2(ix + 1, iz + 1) * u) * v; };
const fbm = (x, z) => 0.5 * vn(x, z) + 0.25 * vn(x * 2.03, z * 2.03) + 0.125 * vn(x * 4.1, z * 4.1) + 0.0625 * vn(x * 8.3, z * 8.3);
export const mouth = (z) => sm(-118, -150, z);
export const shoreL = (z) => SHORE_L - 80 * mouth(z);
export const shoreR = (z) => 15 - 6 * sm(-15, -95, z) + 80 * mouth(z);

export function H(x, z) {
  const dL = shoreL(z) - x, dR = x - shoreR(z), fade = 1 - mouth(z) * 0.92;
  let y;
  if (dL > 0) {
    const shelf = -0.62 + 1.1 * Math.pow(Math.min(1, dL / 3.6), 0.8) + 0.022 * Math.min(Math.max(dL - 3.6, 0), 30);
    const kz = sm(-26, -40, z); // past the farmstead the bank becomes the steep fjord wall (same profile as the right bank)
    const gentle = 19 * sm(36, 84, dL) + 10 * sm(84, 90, dL), steep = 17 * sm(2, 34, dL) + 11 * sm(34, 39, dL);
    y = shelf + (gentle * (1 - kz) + steep * kz) * fade;
    y += (fbm(x * 0.5, z * 0.5) - 0.5) * 0.35 * sm(3, 8, dL) * (1 - sm(34, 50, dL));
    y += (fbm(x * 0.07, z * 0.07) - 0.5) * 7 * sm(40, 84, dL) * (1 - sm(84, 90, dL)) * (1 - kz) * fade; // lumps stop at the cliff foot: its face stays vertical
    y += (fbm(x * 0.09 - 9, z * 0.09) - 0.5) * 6 * sm(10, 34, dL) * (1 - sm(34, 39, dL)) * kz * fade;
  } else if (dR > 0) {
    const base = -0.62 + 1.1 * Math.pow(Math.min(1, dR / 2.2), 0.8);
    y = base + (17 * sm(2, 36, dR) + 11 * sm(36, 41, dR)) * fade;
    y += (fbm(x * 0.09 + 9, z * 0.09) - 0.5) * 6 * sm(10, 36, dR) * (1 - sm(36, 41, dR)) * fade;
  } else {
    y = -0.62 - 2.6 * sm(0, 6, Math.min(-dL, -dR));
  }
  y = Math.max(y, -0.62 + 1.2 * sm(14, 20, z) + 22 * sm(24, 64, z)); // the fjord head: the world closes behind the seal
  if (x > SHORE_L - 1) y = Math.max(y, -0.58 + 0.78 * Math.exp(-(((z + 3.7) / 1.05) ** 2)) * (1 - sm(-2.6, -1.2, x)) * (1 - sm(-7, -5, -x)));
  return y;
}

// the five longhouses: [length, width, wall h, roof h, x, z, yaw]; the igloo is the head of the farmstead
export const HOUSES = [
  [9.5, 4.4, 1.5, 1.95, -22.5, -4.2, 0.12],
  [8.2, 4.0, 1.4, 1.8, -21, -14, -0.1],
  [7.0, 3.6, 1.3, 1.65, -31, -10, 0.35],
  [5.6, 3.2, 1.2, 1.5, -13.8, -16, -0.2],
  [6.4, 3.4, 1.2, 1.6, -29, 2.4, -0.15],
];
export const IGLOO = { x: -12.6, z: -6.4, ry: 0.55, s: 1.75 };
export const TRAILS = [ // packed-trail segments [x0, z0, x1, z1]: two longhouses and the ship to the jetty root
  [-18.0, -3.6, -11.5, -1.8], [-11.5, -1.8, -6.8, 0.0],
  [-17.5, -12.0, -12.0, -7.5], [-12.0, -7.5, -7.4, -1.2],
  [-24.0, 1.4, -14.5, 1.6], [-14.5, 1.6, -6.8, 0.6],
];

const COLS = 340, ROWS = 210;
const gx = (u) => SHORE_L + (u < 0 ? 140 : 110) * Math.sign(u) * Math.abs(u) ** 1.6;
const gz = (v) => 70 - 285 * v ** 1.5;
export function terrainGeometry() {
  const nx = COLS + 1, nz = ROWS + 1, pos = new Float32Array(nx * nz * 3), idx = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = gx((i / COLS) * 2 - 1), z = gz(j / ROWS);
    pos.set([x, H(x, z), z], (j * nx + i) * 3);
  }
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, b, c, b, d, c); }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

const FRAG = /* glsl */ `
  uniform vec3 uLightDir; uniform vec3 uSunDir;
  uniform vec4 uHouse[5]; uniform float uHY[5]; uniform vec4 uIgloo; uniform vec4 uTrail[6];
  varying vec3 vWP; varying vec3 vN;
  ${glslFor(["noise", "cel"])}
  float seg(vec2 p, vec4 s) { vec2 pa = p - s.xy, ba = s.zw - s.xy; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
  vec2 rotP(vec2 d, float a) { float c = cos(a), s = sin(a); return vec2(c * d.x - s * d.y, s * d.x + c * d.y); }
  void main() {
    vec3 N = normalize(vN); vec3 L = normalize(uLightDir);
    vec2 P = vWP.xz; float y = vWP.y;
    float flatK = smoothstep(0.84, 0.97, N.y), steep = 1.0 - smoothstep(0.50, 0.78, N.y);
    float h = 0.5 * dot(N, L) + 0.5;
    float lit = celStep(h, 0.5);

    // painted cast shadows thrown away from the low sun, and the thaw ring under each eave
    vec2 away = -normalize(L.xz + 1e-4) * 3.2; float cast = 0.0, turf = 0.0;
    for (int i = 0; i < 5; i++) {
      vec2 hl = uHouse[i].zw;
      vec2 q = rotP(P - uHouse[i].xy - away, uHY[i]) / (hl + vec2(0.8)); cast = max(cast, 1.0 - step(1.0, dot(q, q)));
      vec2 e = rotP(P - uHouse[i].xy, uHY[i]) / (hl + vec2(0.9)); turf = max(turf, 1.0 - celStep(length(e), 1.0));
    }
    { vec2 d = (P - uIgloo.xy - away * 1.4) / uIgloo.z; cast = max(cast, 1.0 - step(1.0, dot(d, d))); }
    cast *= flatK; turf *= flatK * step(0.38, vn(P * 1.7));

    // snow: broken patches on slopes, pure on the shelf
    float sn = fbm(warp(vec2(P.x * 0.09 + P.y * 0.045, y * 0.085 + P.y * 0.03), 0.8));
    float score = 0.95 * sn + 0.5 * flatK + 0.2 * smoothstep(0.0, 25.0, y);
    float snow = max(flatK, step(0.74, score) * (1.0 - steep));
    vec3 sLit = mix(${g("snowLit")}, ${g("shelf")}, flatK);
    sLit = mix(sLit, ${g("apricot")}, 0.12 * lit);
    vec3 sSh = mix(${g("snowShade")}, ${g("snowDeep")}, (1.0 - flatK) * 0.8);
    vec3 snowCol = mix(sSh, sLit, lit * (1.0 - cast));
    // packed trails
    float dT = 1e3; for (int i = 0; i < 6; i++) dT = min(dT, seg(P, uTrail[i]));
    float tr = (1.0 - celStep(dT, 0.5 + 0.32 * (vn(P * 0.8) - 0.5))) * flatK;
    snowCol = mix(snowCol, mix(${g("#9ea0d8")}, ${g("track")}, lit * (1.0 - cast)), tr);
    // thaw turf under the eaves only (saturation kept, L8)
    snowCol = mix(snowCol, mix(${g("turfShade")}, ${g("turf")}, lit), turf);
    // shingle at the waterline, wet and dark at the edge
    float shin = (1.0 - smoothstep(-0.12, 0.38, y)) * flatK;
    float pebble = step(0.26, vor(P * 2.6).x);
    vec3 shCol = mix(${g("shingleShade")}, ${g("shingle")}, lit * pebble);
    shCol = mix(shCol, ${g("rockShade")}, 1.0 - smoothstep(-0.55, -0.25, y));
    snowCol = mix(snowCol, shCol, shin);

    // rock: three flat tones, dry-brush down the fall line
    float nr = fbm(vec2((P.x + P.y) * 0.55, y * 0.07));
    vec3 rock = cel3(h * 0.85 + (nr - 0.5) * 0.6, 0.40, 0.82, ${g("rockShade")}, ${g("rockMid")}, ${g("rockLit")});
    rock *= 0.9 + 0.2 * step(0.55, strokes(vec2(P.x + P.y, y), 1.5708, 3.0, 0.12));
    rock = mix(rock, ${g("apricot")}, 0.06 * lit);

    // the single strata cliff band, a lavender-underlit snow cap on its lip
    float cl = steep * smoothstep(12.0, 20.0, y);
    float stripe = step(0.45, vn(vec2((P.x + P.y) * 1.3, 0.37)));
    vec3 cliffCol = mix(mix(${g("strata")}, ${g("cliff")} * 0.8, stripe), mix(${g("cliff")}, ${g("cliffLit")}, stripe), lit);
    float lip = steep * smoothstep(24.5, 27.0, y) * step(0.45, vn(P * 0.6));
    cliffCol = mix(cliffCol, ${g("snowShade")}, lip * 0.9);

    vec3 col = mix(rock, cliffCol, cl);
    col = mix(col, snowCol, snow * (1.0 - cl * 0.85));

    // aerial haze: apricot toward the sun, blue-violet away, never above 0.5
    vec3 vd = vWP - cameraPosition; float dist = length(vd);
    float sd = dot(vd / max(dist, 1e-3), uSunDir);
    vec3 hz = mix(${g("haze")}, ${g("horizon")}, smoothstep(0.35, 0.95, sd));
    col = mix(col, hz, 0.5 * smoothstep(90.0, 300.0, dist));
    col *= min(1.0, 0.92 / max(dot(col, vec3(0.2126, 0.7152, 0.0722)), 1e-4));
    gl_FragColor = vec4(col, 0.5);
  }`;

export function buildTerrain(engine) {
  const mat = new ShaderMaterial({
    uniforms: {
      uLightDir: engine.shared.uLightDir, uSunDir: { value: new Vector3(...dirOf(SUN.az, SUN.el)) },
      uHouse: { value: HOUSES.map(([L, W, , , x, z]) => new Vector4(x, z, L / 2, W / 2)) },
      uHY: { value: HOUSES.map((h) => h[6]) },
      uIgloo: { value: new Vector4(IGLOO.x, IGLOO.z, 4.7, 0) },
      uTrail: { value: TRAILS.map((t) => new Vector4(...t)) },
    },
    vertexShader: "varying vec3 vWP; varying vec3 vN; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: FRAG,
  });
  const mesh = new Mesh(terrainGeometry(), mat);
  mesh.frustumCulled = false; mesh.name = "terrain";
  mesh.userData.layer = 0;
  return mesh;
}
