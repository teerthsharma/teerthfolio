// THE INK SKY AND THE INK GROUND. The sky is blood red at the horizon sinking to black ink overhead,
// laid in with stretched brush strokes, a dot-screen gradient and radial speed lines that run out of
// the shrine (and flare on every cut). It is the sky, not a dome: it wipes in and out with ink noise
// in screen space. The ground is one big flat quad: asphalt in screentone, hand-inked cracks, the
// dark pool that spreads from the shrine (black ink, white ripples, red streaks) and the slash scars.

import { BackSide, DoubleSide, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector4 } from "three";
import { INK_LIB, hash } from "./ink";

const SKY_V = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const SKY_F = /* glsl */ `
  varying vec3 vW;
  uniform float uSkyVis, uFlare, uBurst;
  ${INK_LIB}
  void main() {
    vec3 v = normalize(vW - cameraPosition);
    vec2 fc = gl_FragCoord.xy / uDpr;
    // the wipe: ink noise in screen space (the sky is drawn in, then rubbed out)
    float wn = fbm(gl_FragCoord.xy / (170.0 * uDpr) + 3.7) * 1.18 + 0.02;
    float lim = uSkyVis * 1.25;
    if (wn > lim) discard;
    float wipe = 1.0 - smoothstep(0.0, 0.05, lim - wn);

    float h = v.y;
    float az = atan(v.x, -v.z);
    float g = smoothstep(-0.04, 0.62, h);
    vec3 low = mix(vec3(0.62), vec3(0.84, 0.035, 0.07), uSkyK);
    vec3 high = mix(vec3(0.3), vec3(0.1, 0.0, 0.02), uSkyK);
    vec3 c = mix(low, high, g);
    if (h < 0.0) c = low * 0.85;
    // long brush strokes of black ink laid across it
    float s1 = fbm(vec2(az * 2.4, h * 16.0 + fbm(vec2(az * 3.0, h * 5.0)) * 3.0));
    float stroke = smoothstep(0.52, 0.6, s1) * smoothstep(0.0, 0.3, h) * (0.25 + 0.75 * g);
    c = mix(c, vec3(0.03, 0.0, 0.01), stroke * 0.8);
    // a screentone gradient climbing from the horizon, in black dots
    vec2 dp = mat2(0.7071, -0.7071, 0.7071, 0.7071) * fc / 6.0;
    float dd = length(fract(dp) - 0.5);
    float band = smoothstep(0.0, 0.5, h) * (1.0 - smoothstep(0.5, 0.95, h));
    float dr = 0.55 * sqrt(clamp(band * 1.1, 0.0, 1.0));
    c = mix(c, vec3(0.02, 0.0, 0.01), (1.0 - smoothstep(dr - 0.06, dr + 0.06, dd)) * band * 0.9);
    // paper-coloured cloud shapes hanging low, outlined in ink
    float cl = fbm(vec2(az * 3.2 + 4.0, h * 9.0 - 0.6));
    float cloud = smoothstep(0.58, 0.6, cl) * (1.0 - smoothstep(0.1, 0.34, h)) * smoothstep(0.0, 0.05, h);
    float cedge = (smoothstep(0.55, 0.58, cl) - smoothstep(0.6, 0.63, cl)) * (1.0 - smoothstep(0.1, 0.34, h));
    c = mix(c, vec3(0.5, 0.02, 0.05) * uSkyK + vec3(0.6) * (1.0 - uSkyK), cloud * 0.6);
    c = mix(c, vec3(0.02, 0.0, 0.01), cedge * 0.9);
    // speed lines out of the shrine
    vec3 md = normalize(uMouth - cameraPosition);
    vec3 rx = normalize(cross(md, vec3(0.0, 1.0, 0.0)));
    vec3 ry = cross(rx, md);
    float ang = atan(dot(v, ry), dot(v, rx));
    float sector = floor(ang * 26.0 / 6.28318);
    float hs = h21(vec2(sector, 7.0));
    float lw = 0.12 + 0.3 * hs * hs;
    float rays = lineM(ang * 26.0 / 6.28318, lw, 0.02) * step(0.45, hs) * smoothstep(0.995, 0.7, dot(v, md)) * smoothstep(0.999, 0.985, dot(v, md));
    float near = 1.0 - smoothstep(0.0, 0.5, 1.0 - dot(v, md));
    c = mix(c, mix(vec3(0.02, 0.0, 0.01), vec3(0.93, 0.9, 0.84), step(0.7, h21(vec2(sector, 3.0)))), rays * (0.35 + 0.65 * uBurst) * uSkyK);
    c += vec3(0.7, 0.05, 0.08) * near * near * 0.35 * uSkyK;
    // a cut flares the whole sky for a beat
    c = mix(c, vec3(0.93, 0.9, 0.84), uFlare * 0.18 * step(0.5, fract(sin(floor(uT * 12.0) * 91.7) * 437.0)));
    c = mix(c, vec3(0.03, 0.0, 0.01), wipe * 0.95);
    c += (h21(floor(gl_FragCoord.xy) + fract(uT * 7.13) * 113.0) - 0.5) * 0.05;
    gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
  }`;

export function skyMaterial(U) {
  return new ShaderMaterial({
    uniforms: { ...U, uSkyVis: { value: 0 }, uFlare: { value: 0 }, uBurst: { value: 0 } },
    vertexShader: SKY_V,
    fragmentShader: SKY_F,
    side: BackSide,
    depthWrite: false,
  });
}
export const skyGeometry = () => new SphereGeometry(205, 28, 14);

// ---- the ground

export const SCARS = Array.from({ length: 14 }, (_, k) => {
  const x = (hash(k, 1) - 0.5) * 70;
  const z = -4 - hash(k, 2) * 60;
  const a = (hash(k, 3) - 0.5) * 2.2 + (k % 2 ? 0.7 : -0.7);
  const len = 10 + hash(k, 4) * 24;
  return { x1: x, z1: z, x2: x + Math.cos(a) * len, z2: z + Math.sin(a) * len, t: 5.5 + 0.18 * k };
});

const GROUND_V = /* glsl */ `
  varying vec3 vW;
  varying vec2 vL;
  void main() {
    vL = position.xz;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const GROUND_F = /* glsl */ `
  varying vec3 vW;
  varying vec2 vL;
  uniform vec4 uScar[14];
  uniform float uScarT[14];
  ${INK_LIB}
  float segD(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  void main() {
    float grow = uReveal - distance(vW.xz, uCenter.xz) + (vn(vW.xz * 0.22) - 0.5) * 14.0;
    if (grow < 0.0) discard;
    float wipe = 1.0 - smoothstep(0.0, 1.3, grow);
    vec2 fc = gl_FragCoord.xy / uDpr;
    vec2 l = vL;
    float road = max(step(abs(l.x), 12.0), step(abs(l.y), 12.0));
    float tone = mix(0.6, 0.34, road) + (fbm(l * 0.15) - 0.5) * 0.12;
    // the kerb line and the lane lines are geometry; here the surface only
    vec2 ic = inkCov(tone, fc, 0.6);
    vec3 col = mix(PAPER * 0.97, INK, ic.x * 0.8);
    col = mix(col, INK, ic.y);
    // hand-inked cracks
    float cn = fbm(l * 0.42 + 9.0);
    float cpx = abs(cn - 0.5) / max(fwidth(cn), 1e-5);
    col = mix(col, INK, (1.0 - smoothstep(0.5 * uDpr, 1.6 * uDpr, cpx)) * 0.7 * road);
    // THE POOL: black ink, white ripples running out of the shrine, red streaks, an inked edge
    float pd = distance(vW.xz, uPoolC.xz) + (vn(vW.xz * 0.25) - 0.5) * 7.0;
    float inP = step(pd, uPoolR);
    float rip = lineM(pd * 0.5 - uT * 0.45, 0.16, 0.07) * (0.35 + 0.65 * vn(vW.xz * 0.6));
    float streak = step(0.8, vn(vec2(vW.x * 0.7, vW.z * 0.1 + uT * 0.5))) * smoothstep(80.0, 20.0, pd);
    vec3 pool = mix(INK, PAPER, rip * 0.55);
    pool = mix(pool, RED, streak * 0.85 * uSkyK);
    col = mix(col, pool, inP);
    float pedge = 1.0 - smoothstep(0.3 * uDpr, 1.6 * uDpr, abs(pd - uPoolR) / max(fwidth(pd), 1e-5));
    col = mix(col, INK, pedge * step(0.5, uPoolR));
    // the slash scars: a white core in a black wound
    float sc = 0.0;
    float so = 0.0;
    for (int k = 0; k < 14; k++) {
      float d = segD(vW.xz, uScar[k].xy, uScar[k].zw);
      float on = step(uScarT[k], uT);
      sc = max(sc, (1.0 - smoothstep(0.03, 0.11, d)) * on);
      so = max(so, (1.0 - smoothstep(0.1, 0.28, d)) * on);
    }
    col = mix(col, INK, so * (1.0 - inP));
    col = mix(col, PAPER, sc);
    col = mix(col, INK, wipe * 0.92);
    col += (h21(floor(gl_FragCoord.xy) + fract(uT * 7.13) * 113.0) - 0.5) * 0.045;
    gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
  }`;

export function groundMaterial(U) {
  return new ShaderMaterial({
    uniforms: { ...U, uScar: { value: SCARS.map((s) => new Vector4(s.x1, s.z1, s.x2, s.z2)) }, uScarT: { value: SCARS.map((s) => s.t) } },
    vertexShader: GROUND_V,
    fragmentShader: GROUND_F,
    side: DoubleSide,
  });
}
export const groundGeometry = () => new PlaneGeometry(520, 520).rotateX(-Math.PI / 2).translate(0, 0.02, -120);
