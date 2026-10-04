// THE FOURTH SHINOBI WAR, as meshes: the sky shell (warm-grey war sky, dust
// haze, the moon's red sheen, the sky splitting for Tengai Shinsei, the crack
// web), the battlefield (one faceted ground mesh: scorched, cracked earth,
// a ridge the alliance stands on, old craters and two new ones), the
// Infinite Tsukuyomi (a disc: blood red, three rings of tomoe, cracking),
// rubble and debris (one rock shader, instanced), the pale threads that rise
// from the field to the moon, the two meteors. Every surface is a shard mesh
// (parts.js), so the second impact breaks the whole picture.
// Frame: the move's rig (the pup at the origin, the lens out along +z).

import { AdditiveBlending, Color, ConeGeometry, DoubleSide, IcosahedronGeometry, PlaneGeometry, ShaderMaterial, CircleGeometry, BufferAttribute, Vector3, DodecahedronGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PAINT } from "./painted";
import { SHARD_FRAG, SHARD_VERT, flat, hash, shardify } from "./parts";

// rig frame: low over the field, left of the Susanoo on a wide screen, above its sword arm on a tall one
export const MOON_WIDE = new Vector3(-30, 14, -118);
export const MOON_TALL = new Vector3(-10, 23, -118);
export const MOON_R = 19;
export const CRATERS = [
  [-26, -52, 6, 0.9],
  [22, -60, 7, 0.9],
  [-9, -20, 3.2, 0.6],
  [13, -16, 2.6, 0.55],
  [-38, -24, 4, 0.8],
];
export const HIT1 = [-13, -44]; // meteor one's crater (x, z)
export const HIT2 = [5, -38]; // meteor two's
const RIDGE_Z = -33;

const col = (h) => new Color(h);
// sRGB picks: these shaders write pow(c, 2.2), so a colour goes in as the hex reads, never as three's linear Color
const sr = (h) => new Vector3(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
const u = (v) => ({ value: v });

// shared GLSL: value noise, fbm, voronoi edge distance
const NOISE = /* glsl */ `
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; } return s; }
  // distance to the nearest voronoi edge (cracked earth), and the cell's id
  vec2 vor(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float d1 = 9.0, d2 = 9.0, id = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(x, y);
      vec2 o = vec2(h21(i + g), h21(i + g + 17.3));
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; id = h21(i + g + 5.1); } else if (d < d2) d2 = d;
    }
    return vec2(d2 - d1, id);
  }`;

// THE SKY SHELL: a jittered icosphere, its colour by the direction it was
// first seen in, so a falling shard carries its piece of the picture.
export function skyShell() {
  const g = shardify(new IcosahedronGeometry(1, 4), 0.035);
  const m = new ShaderMaterial({
    uniforms: {
      uCell: u(6), uTime: u(0), uBreak: u(-1), uPull: u(1), uCrack: u(0), uCrackDir: u(new Vector3(0, 0, -1)),
      uMoon: u(new Vector3()), uSplit: u(0), uSplitDir: u(new Vector3(-0.3, 0.8, -0.5)), uPulse: u(0), uAlpha: u(1), uInside: u(0),
      uTop: u(sr("#2a241f")), uMid: u(sr("#6a5c4d")), uHaze: u(sr("#bfa98b")), uLow: u(sr("#4a3f34")), uRed: u(sr("#b3122a")), uPink: u(sr("#e0559b")),
    },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      ${SHARD_VERT}
      varying vec3 vN;
      void main() {
        vec3 w = shard(position);
        vN = normalize(mat3(modelMatrix) * position);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uBreak, uCrack, uSplit, uPulse, uAlpha, uInside;
      uniform vec3 uCrackDir, uMoon, uSplitDir, uTop, uMid, uHaze, uLow, uRed, uPink;
      varying vec3 vOrig;
      varying vec3 vN;
      varying float vRand;
      ${PAINT}
      ${NOISE}
      ${SHARD_FRAG}
      void main() {
        vec3 v = normalize(vOrig - cameraPosition);
        float h = v.y;
        vec3 md = normalize(uMoon - cameraPosition);
        float a = 1.0 - dot(v, md);
        // the war sky: ash overhead, warm grey, a dusty band of haze on the horizon
        vec3 c = mix(uHaze, mix(uMid, uTop, smoothstep(0.12, 0.7, h)), smoothstep(-0.01, 0.16, h));
        if (h < 0.0) c = mix(uHaze, uLow, smoothstep(0.0, -0.12, h));
        // a painted matte: billows of smoke laid in with long horizontal strokes, dust drifting through the low sky
        float az = atan(v.x, -v.z);
        float smoke = fbm(vec2(az * 3.0 + uTime * 0.03, h * 7.0 - uTime * 0.02));
        float strokes = fbm(vec2(az * 1.5, h * 55.0 + fbm(vec2(az * 4.0, h * 6.0)) * 3.0));
        c *= 0.7 + 0.5 * smoke;
        c = mix(c, uHaze * 1.08, smoothstep(0.55, 0.8, strokes) * 0.35 * smoothstep(0.5, 0.0, h));
        float dust = fbm(vec2(az * 6.0 + uTime * 0.05, h * 18.0)) * exp(-abs(h - 0.05) * 9.0);
        c = mix(c, uHaze * 1.15, dust * 0.5);
        c *= 0.9 + 0.2 * brush();
        // the moon's red stays close to it: the one colour in the sky, pulsing
        float sheen = exp(-a * 30.0) * (0.75 + 0.25 * uPulse);
        c = mix(c, uRed * 0.8, sheen * 0.55);
        c += grain(uTime) * 0.08;
        // TENGAI SHINSEI: the sky splits along a jagged seam above the meteors
        if (uSplit > 0.0) {
          vec3 sd = normalize(uSplitDir);
          vec3 rt = normalize(cross(sd, vec3(0, 1, 0)));
          vec3 up = cross(rt, sd);
          vec2 p = vec2(dot(v, rt), dot(v, up));
          float along = p.x;
          float jag = 0.012 * sin(along * 70.0) + 0.02 * (vnoise(vec2(along * 30.0, 1.0)) - 0.5);
          float len = smoothstep(-0.05, 0.0, along + 0.9 * uSplit) * smoothstep(0.05, 0.0, along - 0.9 * uSplit);
          float d = abs(p.y - jag) / (0.004 + 0.03 * uSplit);
          c = mix(c, vec3(1.0, 0.95, 0.85), exp(-d * d) * len * float(dot(v, sd) > 0.0));
          c += vec3(0.9, 0.75, 0.55) * exp(-d * 0.18) * len * 0.3 * float(dot(v, sd) > 0.0);
        }
        // the break: a web of light runs out from the impact along every shard edge
        float reach = 1.0 - dot(v, normalize(uCrackDir));
        float web = crackLine(0.018) * (1.0 - smoothstep(uCrack * 2.2 - 0.25, uCrack * 2.2, reach));
        c = mix(c, vec3(1.0, 0.96, 0.9), web * (uBreak > 0.0 ? 0.5 : 0.9));
        float alpha = uAlpha;
        if (gl_FrontFacing && uInside < 0.5) {
          float f = pow(1.0 - abs(dot(normalize(vN), v)), 2.0);
          c += f * uPink * 0.6;
          alpha = mix(0.3, 1.0, f);
        }
        if (uBreak > 0.0) alpha *= 0.55 * (1.0 - smoothstep(1.0, 1.5, uBreak + 0.3 * vRand));
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), alpha);
      }`,
  });
  return { g, m };
}

// THE BATTLEFIELD: one faceted ground mesh, 180 m deep from behind the lens
export function groundHeight(x, z) {
  const r = Math.hypot(x, z);
  let y = (Math.sin(x * 0.31) * Math.cos(z * 0.27) * 0.35 + Math.sin(x * 0.9 + z * 0.7) * 0.12) * Math.min(1, Math.max(0, (r - 3) / 6));
  const ridge = Math.exp(-(((z - RIDGE_Z) / 4.5) ** 2)) * (1.7 + 0.4 * Math.sin(x * 0.2));
  y += ridge;
  for (const [cx, cz, cr, k] of CRATERS) y += crater(Math.hypot(x - cx, z - cz) / cr) * cr * 0.28 * k;
  return y;
}
function crater(q) {
  // a bowl, a raised lip, flat beyond
  return q < 1 ? -(1 - q * q) * 1.0 + 0.45 * q ** 6 : 0.45 * Math.exp(-(((q - 1) * 3.5) ** 2));
}
export function battlefield() {
  const base = new PlaneGeometry(180, 180, 70, 70).rotateX(-Math.PI / 2).translate(0, 0, -50);
  const g = shardify(base, 0);
  const p = g.attributes.position;
  // irregular facets: nudge each shared corner in x/z, then lift it to the ground's height
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const k = Math.round(x * 8) * 7.13 + Math.round(z * 8) * 3.71;
    const nx = x + (hash(k, 1) - 0.5) * 1.6;
    const nz = z + (hash(k, 2) - 0.5) * 1.6;
    p.setXYZ(i, nx, groundHeight(nx, nz), nz);
  }
  // the shard centres follow
  const c = g.attributes.aCenter;
  for (let t = 0; t < p.count; t += 3) {
    for (let a = 0; a < 3; a++) {
      const v = (p.array[t * 3 + a] + p.array[t * 3 + 3 + a] + p.array[t * 3 + 6 + a]) / 3;
      for (let k = 0; k < 3; k++) c.array[(t + k) * 3 + a] = v;
    }
  }
  const m = new ShaderMaterial({
    uniforms: {
      uCell: u(6), uTime: u(0), uBreak: u(-1), uPull: u(0), uMoon: u(new Vector3()), uPulse: u(0), uCrack: u(0), uCrackDir: u(new Vector3(0, 0, -1)),
      uC1: u(new Vector3(HIT1[0], 0, HIT1[1])), uC2: u(new Vector3(HIT2[0], 0, HIT2[1])), uK1: u(0), uK2: u(0), uHot1: u(0), uHot2: u(0),
      uAsh: u(sr("#9c8a72")), uSoot: u(sr("#433a30")), uHaze: u(sr("#bfa98b")), uRed: u(sr("#b3122a")), uEmber: u(sr("#e8c9a0")), uDot: u(sr("#2a231c")),
    },
    transparent: true,
    vertexShader: /* glsl */ `
      ${SHARD_VERT}
      uniform vec3 uC1, uC2;
      uniform float uK1, uK2;
      float bowl(float q) { return q < 1.0 ? -(1.0 - q * q) + 0.45 * pow(q, 6.0) : 0.45 * exp(-pow((q - 1.0) * 3.5, 2.0)); }
      void main() {
        vec3 p = position;
        // the two new craters open where the meteors land
        p.y += bowl(length(p.xz - uC1.xz) / 7.0) * 7.0 * 0.3 * uK1;
        p.y += bowl(length(p.xz - uC2.xz) / 11.0) * 11.0 * 0.3 * uK2;
        vec3 w = shard(p);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uBreak, uPulse, uCrack, uK1, uK2, uHot1, uHot2;
      uniform vec3 uMoon, uC1, uC2, uAsh, uSoot, uHaze, uRed, uEmber, uDot, uCrackDir;
      varying vec3 vOrig;
      varying float vRand;
      ${PAINT}
      ${NOISE}
      ${SHARD_FRAG}
      void main() {
        vec3 n = normalize(cross(dFdx(vOrig), dFdy(vOrig)));
        if (n.y < 0.0) n = -n;
        vec2 xz = vOrig.xz;
        // scorched earth: ash and soot in burnt patches
        float burn = fbm(xz * 0.09);
        vec3 c = mix(uSoot, uAsh, smoothstep(0.35, 0.75, burn));
        // cracked earth: dark seams with a few still glowing
        vec2 cr = vor(xz * 0.55);
        float seam = 1.0 - smoothstep(0.015, 0.045, cr.x + 0.03 * vnoise(xz * 3.0));
        c = mix(c, uSoot * 0.35, seam * 0.8);
        c += uEmber * seam * step(0.9, cr.y) * 0.25 * (0.7 + 0.3 * sin(uTime * 3.0 + cr.y * 40.0));
        // the moon's light rakes the facets
        vec3 md = normalize(uMoon - vOrig);
        float lit = max(dot(n, md), 0.0);
        c *= 0.8 + 0.5 * max(n.y, 0.0) * 0.4 + 0.6 * lit;
        c += uHaze * 0.1;
        c += uRed * pow(lit, 3.0) * 0.18 * (0.8 + 0.2 * uPulse);
        // the new craters: scorched bowls, molten at the heart while they are hot
        float q1 = length(xz - uC1.xz) / 7.0;
        float q2 = length(xz - uC2.xz) / 11.0;
        c = mix(c, uSoot * 0.5, (1.0 - smoothstep(0.6, 1.2, q1)) * uK1 * 0.8);
        c = mix(c, uSoot * 0.5, (1.0 - smoothstep(0.6, 1.2, q2)) * uK2 * 0.8);
        c += uEmber * ((1.0 - smoothstep(0.0, 0.7, q1)) * uHot1 + (1.0 - smoothstep(0.0, 0.7, q2)) * uHot2) * 1.4;
        // painted: strokes across the facets, the shadowed ones scumbled darker, grain over all
        float shade = (1.0 - lit) * 0.6;
        c = mix(c, uDot, shade * 0.35 * smoothstep(0.35, 0.7, brush()));
        c *= 0.9 + 0.2 * brush();
        c += grain(uTime) * 0.08;
        // dust haze swallows the far field into the sky's horizon
        float d = length(vOrig - cameraPosition);
        c = mix(c, uHaze, smoothstep(30.0, 115.0, d) * 0.9);
        float reach = 1.0 - dot(normalize(vOrig - cameraPosition), normalize(uCrackDir));
        float web = crackLine(0.015) * (1.0 - smoothstep(uCrack * 2.2 - 0.25, uCrack * 2.2, reach));
        c = mix(c, vec3(1.0, 0.96, 0.9), web * 0.9);
        float alpha = uBreak > 0.0 ? 0.6 * (1.0 - smoothstep(0.7, 1.2, uBreak + 0.3 * vRand)) : 1.0;
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), alpha);
      }`,
  });
  return { g, m };
}

// THE INFINITE TSUKUYOMI: a disc that faces the lens. Blood red, three
// concentric rings carrying three tomoe each, a pupil, limb darkening; it
// pulses, then cracks before anything else does.
export function moon() {
  const g = shardify(new CircleGeometry(1, 40, 0, Math.PI * 2), 0.0);
  // more shards: a second ring of triangles cut by the jitter is enough on a disc this far off
  const m = new ShaderMaterial({
    uniforms: { uCell: u(6), uTime: u(0), uBreak: u(-1), uPull: u(1), uPulse: u(0), uMoonCrack: u(0), uSpin: u(0), uAlpha: u(1) },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      ${SHARD_VERT}
      varying vec2 vUv2;
      void main() {
        vUv2 = position.xy;
        vec3 w = shard(position);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uBreak, uPulse, uMoonCrack, uSpin, uAlpha;
      varying vec2 vUv2;
      varying float vRand;
      ${PAINT}
      ${NOISE}
      float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
      void main() {
        vec2 p = vUv2;
        float r = length(p);
        float ang = atan(p.y, p.x);
        vec3 red = vec3(0.72, 0.04, 0.09) * (0.85 + 0.25 * uPulse);
        vec3 c = mix(red * 1.25, red * 0.55, smoothstep(0.2, 1.0, r)); // limb darkening
        c += vec3(0.25, 0.02, 0.04) * (1.0 - r) * fbm(p * 5.0) ;
        float ink = 0.0;
        // three rings, three tomoe on each (a dot with a tail), turning slowly
        for (int k = 0; k < 3; k++) {
          float rr = 0.3 + 0.25 * float(k);
          ink = max(ink, 1.0 - smoothstep(0.008, 0.02, abs(r - rr)));
          for (int j = 0; j < 3; j++) {
            float a0 = uSpin * (1.0 + 0.3 * float(k)) + 6.2832 * float(j) / 3.0 + float(k) * 0.6;
            vec2 head = rr * vec2(cos(a0), sin(a0));
            ink = max(ink, 1.0 - smoothstep(0.04 + 0.008 * float(k), 0.055 + 0.008 * float(k), length(p - head)));
            // the tail: a short arc behind the head, thinning
            for (int s = 1; s < 4; s++) {
              float as = a0 - 0.09 * float(s);
              vec2 q = (rr + 0.012 * float(s)) * vec2(cos(as), sin(as));
              ink = max(ink, 1.0 - smoothstep(0.03 - 0.008 * float(s), 0.04 - 0.008 * float(s), length(p - q)));
            }
          }
        }
        ink = max(ink, 1.0 - smoothstep(0.07, 0.085, r)); // the pupil
        c = mix(c, vec3(0.08, 0.0, 0.01), ink * 0.9);
        // painted: a dry-brushed limb and grain
        c *= 0.88 + 0.24 * brush();
        c += grain(uTime) * 0.06;
        // the cracks run out from the upper left
        vec2 cv = vor(p * 3.2 + 3.0);
        float reach = length(p - vec2(-0.55, 0.6));
        float crack = (1.0 - smoothstep(0.015, 0.05, cv.x)) * (1.0 - smoothstep(uMoonCrack * 2.2 - 0.3, uMoonCrack * 2.2, reach));
        c = mix(c, vec3(1.0, 0.9, 0.85), crack);
        float alpha = (1.0 - smoothstep(0.97, 1.0, r)) * uAlpha;
        if (uBreak > 0.0) alpha *= 0.7 * (1.0 - smoothstep(0.8, 1.3, uBreak + 0.3 * vRand));
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), alpha);
      }`,
  });
  return { g, m };
}

// ROCK: faceted, lit from the moon, red sheen; for rubble, debris and meteors' cores.
export function rockMaterial() {
  return new ShaderMaterial({
    uniforms: { uMoon: u(new Vector3()), uHot: u(0), uTime: u(0) },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      varying vec3 vC;
      void main() {
        mat4 im = mat4(1.0);
        vC = vec3(1.0);
        #ifdef USE_INSTANCING
          im = instanceMatrix;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #endif
        vec4 w = modelMatrix * im * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uMoon;
      uniform float uHot, uTime;
      varying vec3 vW;
      varying vec3 vC;
      ${PAINT}
      void main() {
        vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        if (dot(n, cameraPosition - vW) < 0.0) n = -n;
        float lit = max(dot(n, normalize(uMoon - vW)), 0.0);
        float d = 0.45 + 0.35 * smoothstep(0.25, 0.4, lit + (brush() - 0.5) * 0.25) + 0.2 * max(n.y, 0.0);
        vec3 c = sepia(vC, 0.0) * d + vec3(0.5, 0.06, 0.08) * pow(lit, 4.0) * 0.25;
        c += grain(uTime) * 0.08;
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
}
export const rockGeometry = () => new DodecahedronGeometry(1, 0).scale(1, 0.7, 1);

// THE METEORS: a rocky core with glowing seams and a fire tail behind it (aTail 1).
export function meteorGeometry() {
  const rock = flat(new IcosahedronGeometry(1, 2));
  const p = rock.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = Math.round(x * 20) * 7.1 + Math.round(y * 20) * 3.3 + Math.round(z * 20) * 1.7;
    const s = 0.85 + 0.3 * hash(k, 4);
    p.setXYZ(i, x * s, y * s, z * s);
  }
  // the tail streams back along +y (the move aims -y along the fall)
  const tail = flat(new ConeGeometry(1.15, 7, 10, 1, true).translate(0, 3.5 + 0.2, 0));
  const rt = new Float32Array(rock.attributes.position.count);
  const tt = new Float32Array(tail.attributes.position.count).fill(1);
  rock.setAttribute("aTail", new BufferAttribute(rt, 1));
  tail.setAttribute("aTail", new BufferAttribute(tt, 1));
  return mergeGeometries([rock, tail]);
}
export function meteorMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: u(0) },
    transparent: true,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aTail;
      varying float vTail;
      varying vec3 vL;
      varying vec3 vW;
      void main() {
        vTail = aTail;
        vL = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying float vTail;
      varying vec3 vL;
      varying vec3 vW;
      ${NOISE}
      ${PAINT}
      void main() {
        if (vTail > 0.5) {
          float along = clamp((vL.y - 0.2) / 7.0, 0.0, 1.0);
          float flick = fbm(vec2(atan(vL.x, vL.z) * 2.0, vL.y * 0.8 - uTime * 6.0));
          vec3 c = mix(vec3(0.62, 0.5, 0.38), vec3(0.28, 0.24, 0.2), along); // a painted smoke-and-fire trail, sepia
          float a = (1.0 - along) * (0.35 + 0.65 * flick);
          if (a < 0.03) discard;
          gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), a * 0.18);
          return;
        }
        vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        if (dot(n, cameraPosition - vW) < 0.0) n = -n;
        vec3 v = normalize(cameraPosition - vW);
        float lava = 1.0 - smoothstep(0.03, 0.09, abs(fbm(vL.xz * 3.0 + vL.y * 2.0) - 0.5));
        float front = smoothstep(-0.2, -0.9, normalize(vL).y); // the leading face, heated white
        vec3 c = vec3(0.16, 0.13, 0.1) * (0.5 + 0.6 * max(n.y, 0.0)) * (0.8 + 0.4 * brush());
        c = mix(c, vec3(0.9, 0.78, 0.6), lava * 0.7);
        c = mix(c, vec3(1.0, 0.94, 0.82), front * 0.12);
        c += vec3(0.95, 0.8, 0.6) * pow(1.0 - abs(dot(n, v)), 2.0) * 0.6;
        c += grain(uTime) * 0.08;
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
}

// THE THREADS: pale ribbons rising off the field toward the moon (additive).
export function threadMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        float a = (1.0 - abs(vUv.x * 2.0 - 1.0)) * smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y));
        gl_FragColor = vec4(vec3(0.95, 0.85, 0.86) * a * 0.55, 1.0);
      }`,
  });
}

export const INK = col("#100b0d");
