// THE RESERVOIR (layer 1: it animates). One plane at y = -4 from the dam wall to the far shores. Flat, hard-edged, built to
// throw the bullseye back at the lens:
//   reflection   R = reflect(V, up) with a stepped-noise wobble (0.05 rad, drifting on the WORLD clock, which the time stop
//                freezes); sky = awSky(R) (the very same rings and storm as the dome); L = luma(sky);
//   water        wc = mix(deep, shallow, smoothstep(0.15, 0.7, L)) then mix(wc, sky, 0.28): two flat tones, cyan under the bright
//                rings, blue under the dark ones, the ring colours leaking through
//   strokes      cream wave dashes: rows v = z * 0.55 + 0.25 sin(0.21 x + t'), a random on/off per (segment, row) from awVn,
//                tapered by sin(pi fract(seg)), thickness 0.07 * taper, AA by fwidth(v); faded out when a row is under 3 px
//   foam         a scalloped cream band along the dam wall, edge z = -3.7 - 0.3 sin(1.7 x + t)
//   rings        up to 4 drops (x, z, age, on): radius r = 0.6 + 7 age, ring half-width 0.35 (1 - age / 1.6), a thinner second ring
//                at 0.62 r, and a white splash disc for the first 0.12 s; cream, hard-edged
//   shadow       the same hard diagonal band as the stone (darkens + shade tint)
//   fog          flat haze past 90 m
import { Mesh, PlaneGeometry, ShaderMaterial, Vector4 } from "three";
import { NOISE, PAL_UNIFORMS, SKY } from "./glsl.js";
import { L } from "./layout.js";

const V = /* glsl */ `varying vec3 vWP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const F = /* glsl */ `
  ${PAL_UNIFORMS} ${NOISE} ${SKY}
  uniform vec4 uDrop[4]; uniform float uWT; uniform float uId;
  varying vec3 vWP;
  const vec3 CREAM = vec3(0.90, 0.85, 0.66);
  void main() {
    vec3 V = normalize(vWP - cameraPosition);
    vec3 R = reflect(V, vec3(0.0, 1.0, 0.0));
    R.xz += (vec2(awVn(vWP.xz * 0.35 + uWT * 0.6), awVn(vWP.zx * 0.35 - uWT * 0.5 + 7.0)) - 0.5) * 0.05;
    R = normalize(R);
    vec3 sky = awSky(R);
    float Lm = dot(sky, AW_LUMA);
    vec3 wc = mix(uWater1, uWater0, smoothstep(0.15, 0.7, Lm));
    wc = mix(wc, sky, 0.28);
    // the hard diagonal shadow band (same law as the stone)
    float s = dot(vWP.xz, vec2(0.62, -0.78)) * 0.045 + uShift, fs = fract(s), sw = fwidth(s) + 1e-5;
    float cut = clamp(min(fs - 0.64, 1.0 - fs) / sw + 0.5, 0.0, 1.0);
    wc = mix(wc, wc * 0.62 + uShadeC * 0.2, cut * 0.6);
    // cream wave strokes
    float rv = vWP.z * 0.55 + 0.25 * sin(vWP.x * 0.21 + uWT * 0.7);
    float row = floor(rv), fr = fract(rv);
    float seg = vWP.x * 0.33 + awHash(vec2(row, 3.0)) * 20.0 + uWT * 0.4 * (awHash(vec2(row, 5.0)) - 0.5);
    float on = step(0.62, awVn(vec2(floor(seg), row)));
    float tap = sin(3.14159 * fract(seg));
    float dd = abs(fr - 0.5) - 0.07 * tap;
    float stroke = on * (1.0 - smoothstep(0.0, fwidth(rv) * 1.2 + 1e-4, dd)) * (1.0 - smoothstep(0.3, 0.55, fwidth(rv)));
    wc = mix(wc, CREAM, stroke * 0.85);
    // the foam band along the dam wall
    float edge = -3.7 - 0.3 * sin(vWP.x * 1.7 + uWT);
    float fw = fwidth(vWP.z) * 1.2 + 1e-4;
    float foam = (1.0 - smoothstep(0.0, fw, vWP.z - edge)) * smoothstep(-5.3, -5.3 + fw, vWP.z);
    wc = mix(wc, CREAM, foam * 0.9);
    // the rings of whatever drops in
    for (int i = 0; i < 4; i++) {
      vec4 d = uDrop[i];
      if (d.w < 0.5) continue;
      float age = d.z, r = length(vWP.xz - d.xy), R0 = 0.6 + 7.0 * age, hw = 0.35 * (1.0 - age / 1.6);
      float f1 = 1.0 - smoothstep(hw, hw + fwidth(r) * 1.2 + 1e-4, abs(r - R0));
      float hw2 = hw * 0.55, f2 = 1.0 - smoothstep(hw2, hw2 + fwidth(r) * 1.2 + 1e-4, abs(r - R0 * 0.62));
      float sp = (1.0 - smoothstep(0.0, 0.12, age)) * (1.0 - smoothstep(1.4, 1.4 + fwidth(r) + 1e-4, r));
      wc = mix(wc, CREAM, max(f1, f2 * 0.8) * 0.95);
      wc = mix(wc, vec3(0.92), sp);
    }
    float fd = smoothstep(90.0, 360.0, length(vWP - cameraPosition));
    wc = mix(wc, uHaze, fd * 0.75);
    gl_FragColor = vec4(min(wc, vec3(0.95)), uId);
  }`;

export function buildWater(U) {
  const drops = Array.from({ length: 4 }, () => new Vector4(0, 0, 0, 0));
  const mat = new ShaderMaterial({ uniforms: { ...U, uDrop: { value: drops }, uWT: { value: 0 }, uId: { value: 0.5 } }, vertexShader: V, fragmentShader: F });
  const m = new Mesh(new PlaneGeometry(520, 420).rotateX(-Math.PI / 2), mat);
  m.position.set(0, L.WATER_Y, -3.6 - 210);
  m.frustumCulled = false;
  // events: [{ t, x, z }]; set(t, wt) fills uDrop (x, z, age, on) and the world clock
  m.userData.set = (t, wt, events) => {
    mat.uniforms.uWT.value = wt;
    for (let i = 0; i < 4; i++) {
      const e = events[i], age = e ? t - e.t : -1;
      drops[i].set(e ? e.x : 0, e ? e.z : 0, age, e && age > 0 && age < 1.6 ? 1 : 0);
    }
  };
  return m;
}
