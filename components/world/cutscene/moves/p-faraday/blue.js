// THE CYANOTYPE: the dimension's look. Every surface is Prussian blue in three flat values with a fibre grain
// (B1), every mesh carries cream edge lines that overshoot their corners (B2), the deck, walkway and river carry
// a faint grid (B3). One warm colour exists: the amber shot, which scorches the drawing (B6) and, at the end,
// burns the whole sheet away to the real island. All of it lives in the shaders below, driven by one shared
// uniform set (U), so nothing here is a post pass and nothing allocates per frame.
// Frame: the bridge's own (x along the bridge, y up, the glass deck's top at y = 0, z across).
// The shaders write the picked sRGB straight to the framebuffer (a ShaderMaterial gets no output encoding).

import { BackSide, BufferGeometry, DataTexture, DoubleSide, EdgesGeometry, Float32BufferAttribute, LineSegments, LinearFilter, RGBAFormat, RepeatWrapping, ShaderMaterial, Vector3 } from "three";

export const CREAM = "#f1e6c8";
export const SHADE = "#0a2240";
export const MID = "#12426d";
export const LIT = "#2b72a8";
export const CYAN = "#8fe6ff";
export const LILAC = "#b79bff";
export const AMBER = "#ffa927";
export const GRIDC = "#5f9ccf";
export const NAVY = "#07182e";

export const BEAM = { y: 0.75, z: -0.95, speed: 55 }; // the shot's line, and m/s along +x
export const rgb = (hex) => new Vector3(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255));

// ONE small shared grain texture: paper fibres
let GRAIN = null;
function grain() {
  if (GRAIN) return GRAIN;
  const n = 64;
  const d = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) {
    const v = 120 + Math.floor((((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1 * 110);
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  GRAIN = new DataTexture(d, n, n, RGBAFormat);
  GRAIN.wrapS = GRAIN.wrapT = RepeatWrapping;
  GRAIN.magFilter = GRAIN.minFilter = LinearFilter;
  GRAIN.needsUpdate = true;
  return GRAIN;
}
export const disposeGrain = () => {
  GRAIN?.dispose();
  GRAIN = null;
  U.uGrain.value = null;
};

// shared by every material (the {value} objects are the same references)
export const U = {
  uTime: { value: 0 },
  uHead: { value: -99 }, // the shot's head along +x (m); -99 before the shot
  uShot: { value: 1e5 }, // the clock time of the shot
  uAway: { value: -99 }, // the burn front (m from the bridge's axis); < -40 is no burn
  uAmber: { value: 0 }, // the coupling's rise, 0..1
  uWind: { value: 0 }, // the shot's wind on hair and tails
  uAng: { value: 0 }, // the turbines' angle
  uGrain: { value: null },
};
export const resetU = () => {
  U.uTime.value = 0;
  U.uHead.value = -99;
  U.uShot.value = 1e5;
  U.uAway.value = -99;
  U.uAmber.value = 0;
  U.uWind.value = 0;
  U.uAng.value = 0;
};

export const DECL = /* glsl */ `
  uniform float uTime, uHead, uShot, uAway, uAmber, uWind, uAng;
  uniform vec3 uOff;
  uniform sampler2D uGrain;
  varying vec3 vL;`;
export const COMMON = /* glsl */ `
  ${DECL}
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  const float BY = ${BEAM.y.toFixed(2)};
  const float BZ = ${BEAM.z.toFixed(2)};
  const float BSPEED = ${BEAM.speed.toFixed(1)};
  // the shot's scorch: a char line with a glowing amber rim, laid along the beam's path as it passes (B6)
  vec3 scorch(vec3 col, float w) {
    float age = uTime - uShot - (vL.x - 0.8) / BSPEED;
    if (vL.x < 0.8 || age < 0.0 || uHead < -50.0) return col;
    float dz = abs(vL.z - BZ);
    float wob = w * (1.0 + 0.22 * sin(vL.x * 2.9) + 0.15 * sin(vL.x * 7.3 + 1.0));
    float burnt = 1.0 - smoothstep(wob * 0.72, wob, dz);
    float rim = smoothstep(wob * 0.55, wob * 0.9, dz) * (1.0 - smoothstep(wob, wob * 1.35, dz));
    float glow = 0.3 + 0.7 * exp(-age * 0.9);
    col = mix(col, vec3(0.17, 0.085, 0.04), burnt * 0.93);
    return mix(col, vec3(1.0, 0.62, 0.17), rim * glow);
  }
  // the burn that ends the dimension: the sheet chars, glows at its edge and falls away from the shot's line
  vec3 burnAway(vec3 col) {
    if (uAway < -40.0) return col;
    vec3 p = vL;
    float m = length(p - vec3(clamp(p.x, -30.0, 30.0), 0.0, BZ));
    float q = uAway - (m * 0.8 + vn(p.xz * 0.3 + p.y * 0.17) * 9.0);
    if (q > 0.0) discard;
    float e = 1.0 - smoothstep(0.0, 1.6, -q);
    float rim = 1.0 - smoothstep(0.0, 0.5, -q);
    col = mix(col, vec3(0.13, 0.065, 0.03), e * 0.95);
    return mix(col, vec3(1.0, 0.66, 0.2), rim);
  }`;

const VERT = /* glsl */ `
  ${DECL}
  attribute float aK;
  attribute float aW;
  attribute float aC;
  varying float vK;
  varying float vC;
  void main() {
    vec4 lp = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      lp = instanceMatrix * lp;
    #endif
    #ifdef WIND
      lp.x += sin(uTime * 9.0 + aW * 7.0) * aW * (0.05 + 0.4 * uWind);
      lp.y += sin(uTime * 7.0 + aW * 5.0) * aW * 0.05 * (1.0 + 3.0 * uWind);
    #endif
    vK = aK;
    vC = aC;
    vL = lp.xyz + uOff;
    gl_Position = projectionMatrix * modelViewMatrix * lp;
  }`;

const uni = (extra = {}) => ({ ...U, uOff: { value: new Vector3() }, ...extra });

// THE PAPER: three flat values by the face's own normal, a grain, an optional grid, lit windows and screens
export function paperMaterial({ grid = false, windows = false } = {}) {
  U.uGrain.value ||= grain();
  return new ShaderMaterial({
    uniforms: uni({ uShade: { value: rgb(SHADE) }, uMid: { value: rgb(MID) }, uLit: { value: rgb(LIT) }, uGridC: { value: rgb(GRIDC) }, uCream: { value: rgb(CREAM) }, uCyan: { value: rgb(CYAN) } }),
    defines: { GRID: grid ? 1 : 0, WINDOWS: windows ? 1 : 0 },
    side: DoubleSide,
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uShade, uMid, uLit, uGridC, uCream, uCyan;
      varying float vK;
      varying float vC;
      void main() {
        vec3 n = normalize(cross(dFdx(vL), dFdy(vL)));
        float d = dot(n, normalize(vec3(-0.5, 0.78, 0.38)));
        vec3 c = d > 0.5 ? uLit : d > -0.05 ? uMid : uShade;
        float g = texture2D(uGrain, vL.xz * 0.5 + vL.y * 0.37).r;
        c *= 0.9 + 0.2 * g;
        #if GRID
          if (n.y > 0.7) {
            vec2 w = max(fwidth(vL.xz), vec2(1e-4));
            vec2 a = abs(fract(vL.xz - 0.5) - 0.5) / w;
            float l = 1.0 - min(min(a.x, a.y), 1.0);
            vec2 a5 = abs(fract(vL.xz / 5.0 - 0.5) - 0.5) / (w / 5.0);
            float l5 = 1.0 - min(min(a5.x, a5.y), 1.0);
            c = mix(c, uGridC, 0.2 * l + 0.34 * l5);
          }
        #endif
        #if WINDOWS
          if (abs(n.y) < 0.3) {
            float u = (abs(n.x) > abs(n.z) ? vL.z : vL.x) * 0.9;
            vec2 cell = vec2(floor(u), floor(vL.y * 0.55));
            vec2 f = vec2(fract(u), fract(vL.y * 0.55));
            float on = step(0.6, h21(cell + vec2(7.0, 3.0) + floor(vK) * 5.0));
            float flick = step(0.5, h21(cell + floor(uTime * 2.0 + h21(cell) * 9.0) * 0.37));
            float inRect = step(0.22, f.x) * step(f.x, 0.78) * step(0.3, f.y) * step(f.y, 0.7);
            if (vK > 0.5 && vK < 1.5) c = mix(c, uCyan, inRect * on * (0.55 + 0.4 * flick));
            if (vK > 1.5) {
              // a big screen: bars that scroll, no lettering
              float bar = step(0.5, fract(vL.y * 0.8 - uTime * 0.4 + h21(vec2(floor(u * 0.4), 1.0)) * 4.0));
              float edge = step(0.06, f.x) * step(f.x, 0.94);
              c = mix(c, mix(uCyan, uCream, bar), 0.8 * edge * step(0.1, fract(vL.y * 0.07)));
            }
          }
        #endif
        c = scorch(c, 0.55);
        c = burnAway(c);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

// THE LINEWORK: cream, flat, over everything it outlines
export function lineMaterial({ color = CREAM, rotor = false } = {}) {
  return new ShaderMaterial({
    uniforms: uni({ uC: { value: rgb(color) } }),
    vertexShader: rotor ? ROTOR_VERT : VERT,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uC;
      void main() {
        gl_FragColor = vec4(burnAway(uC), 1.0);
      }`,
  });
}

// the turbines' rotors: each vertex carries its hub (aHub) and a speed/phase (aSP); the axis faces the lens
const ROTOR_VERT = /* glsl */ `
  ${DECL}
  attribute vec3 aHub;
  attribute vec2 aSP;
  void main() {
    vec3 r = position - aHub;
    float a = uAng * aSP.x + aSP.y;
    float c = cos(a), s = sin(a);
    r = vec3(c * r.x - s * r.y, s * r.x + c * r.y, r.z);
    float ca = 0.84, sa = -0.54;
    r = vec3(ca * r.x + sa * r.z, r.y, -sa * r.x + ca * r.z);
    vec3 lp = aHub + r;
    vL = lp + uOff;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(lp, 1.0);
  }`;

export function rotorPaper() {
  U.uGrain.value ||= grain();
  return new ShaderMaterial({
    uniforms: uni({ uShade: { value: rgb(SHADE) }, uMid: { value: rgb(MID) }, uLit: { value: rgb(LIT) } }),
    side: DoubleSide,
    vertexShader: ROTOR_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uShade, uMid, uLit;
      void main() {
        vec3 n = normalize(cross(dFdx(vL), dFdy(vL)));
        float d = dot(n, normalize(vec3(-0.5, 0.78, 0.38)));
        vec3 c = d > 0.5 ? uLit : d > -0.05 ? uMid : uShade;
        // the shot lights the blades amber as it passes
        float age = uTime - uShot - (vL.x - 0.8) / BSPEED;
        float amber = (uHead > vL.x && age > 0.0) ? exp(-age * 0.55) : 0.0;
        c = mix(c, vec3(1.0, 0.66, 0.2), amber * 0.9);
        gl_FragColor = vec4(burnAway(c), 1.0);
      }`,
  });
}

// THE SILHOUETTE: solid deep navy; aC > 0.5 is cream (an armband, a hem); aW sways in the wind.
// The hull (hullOf, drawn back-faced in cream) is its outline.
export function silMaterial(hull = false) {
  return new ShaderMaterial({
    uniforms: uni({ uN: { value: rgb(NAVY) }, uC: { value: rgb(CREAM) } }),
    defines: { WIND: 1 },
    side: hull ? BackSide : DoubleSide,
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uN, uC;
      varying float vC;
      void main() {
        gl_FragColor = vec4(burnAway(${hull ? "uC" : "(vC > 0.5 ? uC : uN)"}), 1.0);
      }`,
  });
}

// A hull: the same geometry pushed out along its smoothed normals by w, so drawn back-faced it is an outline.
export function hullOf(src, w) {
  const g = src.index ? src.toNonIndexed() : src.clone();
  const p = g.attributes.position;
  const key = (i) => `${Math.round(p.getX(i) * 400)},${Math.round(p.getY(i) * 400)},${Math.round(p.getZ(i) * 400)}`;
  const sum = new Map();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (let t = 0; t < p.count; t += 3) {
    a.fromBufferAttribute(p, t);
    b.fromBufferAttribute(p, t + 1).sub(a);
    c.fromBufferAttribute(p, t + 2).sub(a);
    const n = b.cross(c).normalize();
    for (let k = 0; k < 3; k++) {
      const s = key(t + k);
      const v = sum.get(s) ?? new Vector3();
      sum.set(s, v.add(n));
    }
  }
  for (let i = 0; i < p.count; i++) {
    const n = sum.get(key(i)).clone().normalize();
    p.setXYZ(i, p.getX(i) + n.x * w, p.getY(i) + n.y * w, p.getZ(i) + n.z * w);
  }
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  return g;
}

// cream edge lines for a geometry (about 25 degrees), each edge overshooting its ends a few percent, like a draftsman's
const A = new Vector3();
const B = new Vector3();
const D = new Vector3();
export function edgeGeometry(src, threshold = 25, over = 0.04) {
  const e = new EdgesGeometry(src, threshold);
  const p = e.attributes.position;
  const out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 2) {
    A.fromBufferAttribute(p, i);
    B.fromBufferAttribute(p, i + 1);
    D.subVectors(B, A);
    const len = D.length();
    D.multiplyScalar(Math.min(over, 0.16 / Math.max(len, 1e-3)));
    A.sub(D).toArray(out, i * 3);
    B.add(D).toArray(out, i * 3 + 3);
  }
  e.dispose();
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(out, 3));
  return g;
}

export function lines(src, mat, threshold, over) {
  const l = new LineSegments(edgeGeometry(src, threshold, over), mat);
  l.frustumCulled = false;
  return l;
}
