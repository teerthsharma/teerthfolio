// THE MAGI LOOK: Arabian Nights in anime cel. One shared cel material paints every solid of Sindria (palace,
// terrace, rock, palms, ships, crowd): three hard bands of warm light and violet shadow, ink creases where the
// facets turn, a dark rim on every silhouette, a gold rim from the low sun, aerial haze that goes peach at the
// horizon. A kind per vertex (aK) picks the surface: marble, gold, turquoise tile, gold-and-teal frieze,
// cloth, glowing lantern, sandstone strata, the patterned terrace floor, electric armour.
// Everything folds: uFold squeezes the whole world toward one plane through the lens (the crack).
// Frame: the move's rig (the pup at the origin, the lens out along +z). No post pass.

import { BufferAttribute, Color, DoubleSide, Euler, Matrix4, Quaternion, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// sRGB for the shaders (they pick in sRGB and write pow 2.2, like the stage's)
export const sr = (h) => new Vector3(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
const v3 = (x, y, z) => ({ value: new Vector3(x, y, z) });

// shared by every material of the scene: written once a frame by the move
export const U = {
  uTime: { value: 0 },
  uStorm: { value: 0 }, // 0 sunlit .. 1 the djinn's storm
  uFlash: { value: 0 }, // the lightning's cold flash on every surface
  uGust: { value: 0.12 }, // wind: palms and cloth
  uFold: { value: 0 }, // 0 whole .. 1 folded flat into the crack
  uFoldN: v3(1, 0, 0), // the crack's plane (through the lens): its normal
  uFoldC: v3(0, 0, 0), // and a point on it (the lens)
  uSun: v3(-0.55, 0.58, 0.6),
};
U.uSun.value.normalize();

// the colours of Sindria, as hex
export const C = {
  marble: "#f6ead2", gold: "#e9b23a", goldDeep: "#c98a1b", turq: "#0f8f8a", teal: "#0f8f8a", sand: "#dfae70", sandDeep: "#c4864f",
  coral: "#e4566a", crimson: "#b3123a", violet: "#2a1f6b", palm: "#2c9a5b", palmLight: "#7bd06a", trunk: "#8a6540", ink: "#140f3a",
  skin: "#c98a5b", cream: "#fff3d6",
};

// shared GLSL: world fold, noise
export const COMMON = /* glsl */ `
  uniform float uTime, uStorm, uFlash, uGust, uFold;
  uniform vec3 uSun, uFoldN, uFoldC;
  // THE FOLD: every point of the world moves along the crack plane's normal toward the plane (which holds the lens).
  // At 1 the whole world is a sliver on the crack, the way a page closes along its fold.
  vec3 foldW(vec3 w) { return w - uFoldN * dot(w - uFoldC, uFoldN) * uFold; }
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; } return s; }
  // girih: an 8-fold star lattice (four grids turned by k*pi/4), 1 on the lines; p in cells
  float girih(vec2 p) {
    float d = 1.0;
    for (int k = 0; k < 4; k++) {
      float a = float(k) * 0.7853982;
      vec2 b = abs(fract(mat2(cos(a), -sin(a), sin(a), cos(a)) * p) - 0.5);
      d = min(d, min(b.x, b.y));
    }
    return 1.0 - smoothstep(0.02, 0.06, d);
  }
  vec3 hazeCol() { return mix(vec3(1.0, 0.7, 0.46), vec3(0.34, 0.42, 0.62), uStorm * 0.85); }`;

const CEL_VERT = /* glsl */ `
  ${COMMON}
  attribute float aK;
  varying vec3 vP;
  varying vec3 vL;
  varying vec3 vN;
  varying vec3 vCol;
  varying float vK;
  void main() {
    vec3 pos = position;
    #ifdef WIND
      // palms: the whole tree leans with the gust, the fronds flutter hard at their tips
      float ph = float(gl_InstanceID) * 1.7;
      float h = max(pos.y, 0.0) / 7.0;
      float gust = uGust * (0.55 * sin(uTime * 2.6 + ph) + 0.35 * sin(uTime * 5.3 + ph * 2.1 + pos.x));
      pos.x += gust * h * h * 1.6;
      pos.z += 0.35 * gust * h * h * 1.6;
      pos.y += sin(uTime * 8.0 + ph + length(pos.xz) * 2.0) * uGust * 0.1 * smoothstep(0.7, 1.0, h) * length(pos.xz);
    #endif
    vec4 lp = vec4(pos, 1.0);
    vec3 nn = normal;
    #ifdef USE_INSTANCING
      lp = instanceMatrix * lp;
      nn = mat3(instanceMatrix) * nn;
    #endif
    vec4 w = modelMatrix * lp;
    vP = w.xyz;
    vL = lp.xyz;
    vN = normalize(mat3(modelMatrix) * nn);
    vK = aK;
    vCol = vec3(1.0);
    #ifdef USE_COLOR
      vCol = pow(color.rgb, vec3(1.0 / 2.2));
    #endif
    #ifdef USE_INSTANCING_COLOR
      if ((aK > 8.5 && aK < 9.5) || (aK > 4.5 && aK < 5.5)) vCol *= pow(instanceColor, vec3(1.0 / 2.2));
    #endif
    gl_Position = projectionMatrix * viewMatrix * vec4(foldW(w.xyz), 1.0);
  }`;

const CEL_FRAG = /* glsl */ `
  ${COMMON}
  varying vec3 vP;
  varying vec3 vL;
  varying vec3 vN;
  varying vec3 vCol;
  varying float vK;
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(cameraPosition - vP);
    float k = vK;
    vec3 c = vCol;
    vec3 gold = vec3(0.914, 0.698, 0.227);
    vec3 ink = vec3(0.16, 0.11, 0.24);
    float nv = clamp(dot(n, v), 0.0, 1.0);
    bool glow = k > 4.5 && k < 5.5;
    if (k > 0.5 && k < 1.5) {
      // white marble: soft veins
      c *= 0.95 + 0.07 * fbm(vP.xy * 0.9 + vP.zz * 0.3);
      c = mix(c, gold, smoothstep(0.55, 0.2, nv) * 0.5); // ivory, gold at the rim
    } else if (k > 11.5 && k < 12.5) {
      // the frieze: crimson girih on gold
      vec2 q = abs(n.x) > abs(n.z) ? vP.zy : vP.xy;
      c = mix(gold, vec3(0.7, 0.07, 0.23), girih(q / 0.8));
    } else if (k > 2.5 && k < 3.5) {
      // turquoise tile scales (offset rows, a dark grout)
      vec2 g = vec2(vP.x + vP.z, vP.y * 2.2);
      g.x = g.x * 1.5 + 0.5 * mod(floor(g.y), 2.0);
      float e = min(fract(g.x), fract(g.y));
      c = mix(c, c * 0.55, 1.0 - smoothstep(0.04, 0.1, e));
      c *= 0.9 + 0.2 * h21(floor(g));
    } else if (k > 9.5 && k < 10.5) {
      // sandstone strata
      float s = fract(vP.y * 0.5);
      c *= 0.88 + 0.12 * step(0.5, s);
      c = mix(c, c * 0.72, smoothstep(0.88, 1.0, s));
      c *= 0.9 + 0.2 * fbm(vP.xz * 0.35 + vP.yy * 0.8);
    } else if (k > 10.5 && k < 11.5) {
      // THE TERRACE: an eight-point star tiling in turquoise and white, a gold lattice, and a patterned border
      vec2 p = vL.xz * 0.42;
      vec2 f = fract(p) - 0.5;
      float s1 = max(abs(f.x), abs(f.y));
      float s2 = (abs(f.x) + abs(f.y)) * 0.7071;
      float oct = max(s1, s2 * 1.02);
      float starLine = min(abs(s1 - 0.36), abs(s2 - 0.3));
      vec2 id = floor(p);
      vec3 tileA = vec3(0.06, 0.56, 0.54);
      vec3 tileB = vec3(0.96, 0.92, 0.82);
      c = mix(tileB, tileA, step(oct, 0.37));
      c = mix(c, vec3(0.06, 0.45, 0.55), step(s2, 0.1) * step(mod(id.x + id.y, 2.0), 0.5));
      c = mix(c, gold, 1.0 - smoothstep(0.012, 0.03, starLine));
      c = mix(c, gold, girih(vL.xz / 0.8) * 0.9 * step(oct, 0.37)); // gold girih on the teal
      c *= 0.96 + 0.06 * h21(id);
      float edge = min(11.0 - abs(vL.x), min(vL.z + 10.0, 14.0 - vL.z));
      if (edge < 2.2) {
        float st = fract(edge * 1.6);
        vec3 bc = mix(vec3(0.99, 0.95, 0.88), vec3(0.1, 0.62, 0.66), step(0.5, st));
        bc = mix(bc, gold, step(abs(edge - 1.1), 0.12));
        float dashes = step(0.5, fract((abs(vL.x) < 12.9 ? vL.z : vL.x) * 1.5));
        bc = mix(bc, vec3(0.72, 0.16, 0.3), dashes * step(abs(edge - 0.45), 0.2));
        c = mix(c, bc, smoothstep(2.2, 2.1, edge));
      }
    } else if (k > 8.5 && k < 9.5) {
      // cloth: broad stripes, lighter on the white ones
      float s = step(0.5, fract((vP.x * 0.8 + vP.z * 0.8 + vP.y * 0.5) * 1.6));
      c = mix(c, mix(c, vec3(0.97, 0.94, 0.88), 0.5), s);
    } else if (k > 3.5 && k < 4.5) {
      float s = step(0.5, fract((vP.x + vP.z) * 1.1));
      c = mix(c, c * 0.62 + vec3(0.12, 0.08, 0.06), s);
    }
    // the cel: three hard bands, warm light, violet shadow
    float d = dot(n, uSun);
    if (k > 8.5 && k < 9.5) d = abs(d) * 0.9 + 0.1; // cloth glows with the light behind it
    vec3 shade = c * vec3(0.56, 0.55, 0.82) + vec3(0.02, 0.0, 0.07);
    vec3 mid = c * vec3(0.93, 0.91, 0.96);
    vec3 lit = c * vec3(1.07, 1.03, 0.95);
    vec3 col = mix(shade, mid, smoothstep(-0.14, -0.06, d));
    col = mix(col, lit, smoothstep(0.38, 0.46, d));
    // gold: a hard highlight band like polished metal
    if (k > 1.5 && k < 2.5) {
      float sp = dot(reflect(-v, n), uSun);
      col = mix(col, vec3(1.0, 0.95, 0.72), smoothstep(0.8, 0.84, sp) * 0.9);
      col *= 0.78 + 0.22 * smoothstep(-0.4, 0.5, n.y);
    }
    // electric armour: blue steel with a white-gold edge and a crawling vein of light
    if (k > 13.5 && k < 14.5) {
      float vein = abs(fbm(vP.xz * 2.6 + vP.yy * 1.9 + vec2(uTime * 1.6, -uTime * 0.7)) - 0.5);
      col = mix(col, vec3(0.7, 0.92, 1.0), (1.0 - smoothstep(0.012, 0.05, vein)) * 0.95);
      col += vec3(0.45, 0.62, 0.95) * pow(1.0 - nv, 2.0) * 0.55;
    }
    // the ink: creases where facets turn, a dark rim on the silhouette, a gold rim from the low sun behind
    float crease = length(fwidth(n));
    // (a surface that faces up, like a floor, has no silhouette to ink however flat the lens sees it)
    float edgeInk = smoothstep(0.3, 0.8, crease) * 0.5 + (1.0 - smoothstep(0.1, 0.3, nv)) * 0.65 * (1.0 - smoothstep(0.7, 0.95, abs(n.y)));
    if (k > 11.5 && k < 12.5) edgeInk *= 0.5;
    if (k > 10.5 && k < 11.5) edgeInk = 0.0;
    if (!glow) col = mix(col, ink, edgeInk);
    col += gold * pow(1.0 - nv, 3.0) * clamp(dot(n, vec3(0.45, 0.2, -0.75)), 0.0, 1.0) * 0.45;
    if (glow) col = vCol * (3.0 + 0.4 * sin(uTime * 6.0 + vP.x * 2.0 + vP.z)) * (1.0 + 0.6 * uStorm);
    // the air: peach haze toward the horizon, then the storm and the flash on top
    float dist = length(vP - cameraPosition);
    float hz = 1.0 - exp(-pow(dist * 0.0075, 1.35));
    col = mix(col, hazeCol(), hz * 0.82 * (glow ? 0.3 : 1.0));
    col = mix(col, col * vec3(0.6, 0.7, 0.97), uStorm * 0.68 * (glow ? 0.0 : 1.0));
    col = mix(col, vec3(0.8, 0.91, 1.0), uFlash * 0.32);
    col += (h21(gl_FragCoord.xy + fract(uTime * 7.1) * 113.0) - 0.5) * 0.03;
    gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
  }`;

// THE CEL MATERIAL: `wind` for the palms.
export function celMat({ wind = false, side = DoubleSide } = {}) {
  return new ShaderMaterial({ uniforms: U, vertexShader: CEL_VERT, fragmentShader: CEL_FRAG, vertexColors: true, side, defines: wind ? { WIND: 1 } : {} });
}

// THE PUP'S CEL TWIN: its own colours in the same three bands, so the real pup is drawn in the dimension's style
// while the scene stands; the instant it is home it snaps back to its own materials.
export function pupCel(root) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial) return; // the contact shadow keeps its own
    const m = o.material;
    let p = twins.get(m);
    if (!p) {
      p = new ShaderMaterial({
        uniforms: { uSun: U.uSun, uTime: U.uTime, uStorm: U.uStorm, uFlash: U.uFlash, uBase: { value: new Color().copy(m.color ?? new Color(1, 1, 1)).convertLinearToSRGB() }, uOpacity: { value: m.opacity ?? 1 } },
        vertexColors: Boolean(m.vertexColors),
        transparent: m.transparent,
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV; varying vec3 vCol;
          void main() {
            vCol = vec3(1.0);
            #ifdef USE_COLOR
              vCol = pow(color.rgb, vec3(1.0 / 2.2));
            #endif
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vV = -mv.xyz;
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uBase, uSun;
          uniform float uOpacity, uTime, uStorm, uFlash;
          varying vec3 vN; varying vec3 vV; varying vec3 vCol;
          void main() {
            vec3 n = normalize(vN);
            vec3 v = normalize(vV);
            vec3 s = normalize((viewMatrix * vec4(uSun, 0.0)).xyz);
            float d = dot(n, s);
            vec3 c = uBase * vCol;
            vec3 shade = c * vec3(0.62, 0.6, 0.86) + vec3(0.02, 0.0, 0.06);
            vec3 col = mix(shade, c * vec3(0.95, 0.93, 0.97), smoothstep(-0.12, -0.04, d));
            col = mix(col, c * vec3(1.1, 1.04, 0.92), smoothstep(0.4, 0.48, d));
            col += vec3(1.0, 0.8, 0.4) * pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.4;
            col = mix(col, col * vec3(0.7, 0.78, 1.0), uStorm * 0.4);
            col = mix(col, vec3(0.8, 0.91, 1.0), uFlash * 0.4);
            gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), uOpacity);
          }`,
      });
      twins.set(m, p);
    }
    list.push([o, m, p]);
  });
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, p] of list) o.material = v ? p : m;
    },
    dispose() {
      this.set(false);
      for (const p of twins.values()) p.dispose();
    },
  };
}

// ---- building blocks for merged geometry: every part carries a vertex colour and a kind ----
const MAT = new Matrix4();
const QUAT = new Quaternion();
const EUL = new Euler();
// at: [x, y, z, rx, ry, rz, sx, sy, sz]
export function part(g, hex, k = 0, at) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  if (at) {
    const [x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx] = at;
    n.applyMatrix4(MAT.compose(new Vector3(x, y, z), QUAT.setFromEuler(EUL.set(rx, ry, rz)), new Vector3(sx, sy, sz)));
  }
  const cnt = n.attributes.position.count;
  const c = new Color(hex);
  const arr = new Float32Array(cnt * 3);
  for (let i = 0; i < cnt; i++) arr.set([c.r, c.g, c.b], i * 3);
  n.setAttribute("color", new BufferAttribute(arr, 3));
  n.setAttribute("aK", new BufferAttribute(new Float32Array(cnt).fill(k), 1));
  return n;
}
export const merge = (list) => mergeGeometries(list);
export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
