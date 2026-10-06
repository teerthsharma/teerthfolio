// gate-rings: Gate of Babylon as gold concentric rings. Pocket colour is #d9a441.
// TOOLKIT: engine/anime:lib/anime/tools/rings.js  (ringAA / ringPulse — this branch has no rings.js)
//
// Maths (az, el) on the view sphere, y up, az = atan(x, -z):
//   rho = acos(clamp(sin(el), -1, 1))                 zenith angle, 0 at the zenith
//   phase = rho / lambda - drift                       Archimedean ring index
//   band = ringAA(phase, duty)                         fwidth of phase, duty = gold fraction
//   pulse = exp(-((rho - R) / w)^2)                    opening iris at radius R(t)
//   complementary shade: gold hue ~40 deg → shadow hue ~220 deg, value × 0.55 (not grey, not magenta)
//   luma cap: c *= min(1, 0.92 / max(dot(c, Rec.709), 1e-4))
// Live uT moves drift and the second family so a 3 s still ≠ an 8 s still.
import { BackSide, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { KIT, V } from "../../../paint.js";

export const meta = {
  params: {
    lambda: { default: 0.085, range: [0.04, 0.2], doc: "ring spacing, rad" },
    duty: { default: 0.46, range: [0.2, 0.7], doc: "gold fraction of each ring" },
    gold: { default: "#d9a441" },
  },
};

export const GLSL = /* glsl */ `
  const vec3 GR_GOLD = ${V("#d9a441")};
  const vec3 GR_LIT  = ${V("#e8c36a")};
  const vec3 GR_CORE = ${V("#f0d48a")};
  const vec3 GR_INK  = ${V("#3a2450")};
  const vec3 GR_STONE= ${V("#3a3228")};
  const vec3 GR_TEMP = ${V("#6a625c")};
  float grAA(float phase, float duty) {
    float f = fract(phase), w = fwidth(phase) + 1e-5;
    return smoothstep(0.0, w, f) * (1.0 - smoothstep(duty, duty + w, f));
  }
  float grPulse(float r, float R, float w) { float x = (r - R) / max(w, 1e-4); return exp(-x * x); }
  vec3 grCap(vec3 c) {
    float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return c * min(1.0, 0.92 / max(Y, 1e-4));
  }
  vec3 skyGates(float az, float el, float t) {
    float rho = acos(clamp(sin(el), -1.0, 1.0));
    float drift = t * 0.11;
    float open = smoothstep(0.0, 2.4, t);
    float duty = mix(0.44, 0.62, open);
    float band = grAA(rho / 0.085 - drift, duty);
    float band2 = grAA(rho / 0.052 - drift * 1.7 + 0.31, 0.28) * smoothstep(3.4, 6.2, t);
    float spoke = grAA(atan(sin(az), cos(az)) / 6.2831853 * 16.0 + rho * 1.4 - t * 0.07, 0.11);
    float iris = grPulse(rho, 0.22 + 0.08 * sin(t * 0.7), 0.045) * open;
    // temple room between rings: warm stone, complementary violet in the shade — never a magenta card
    float hgt = smoothstep(-0.2, 0.55, el);
    vec3 room = mix(GR_STONE, GR_TEMP, hgt);
    room = mix(room, GR_INK, (1.0 - hgt) * 0.55);
    vec3 gold = mix(GR_GOLD, GR_LIT, spoke * 0.45 + iris * 0.35);
    gold = mix(gold, GR_CORE, iris * 0.5);
    vec3 c = mix(room, gold, clamp(band * 0.92 + band2 * 0.55 + iris * 0.35, 0.0, 1.0));
    // far portal discs: gold rings, not orange fire
    for (int L = 0; L < 2; L++) {
      float cell = L == 0 ? 0.22 : 0.14;
      float ncol = floor(6.2831853 / cell + 0.5), cw = 6.2831853 / ncol;
      float cx = floor((az + 3.14159265) / cw), cy = floor(max(el, 0.0) / cell);
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 id = vec2(mod(cx + float(i), ncol), cy + float(j)) + float(L) * 19.0;
        vec2 h = h22(id);
        float caz = (cx + float(i) + 0.25 + 0.5 * h.x) * cw - 3.14159265;
        float cel = (cy + float(j) + 0.3 + 0.4 * h.y) * cell;
        if (h.x > 0.62 + 0.2 * open) continue;
        float da = az - caz; da -= 6.2831853 * floor(da / 6.2831853 + 0.5);
        vec2 dd = vec2(da * cos(el), el - cel);
        float rad = cell * (0.28 + 0.16 * h.y);
        float d = length(dd) / max(rad, 1e-4);
        float ring = 1.0 - smoothstep(0.0, fwidth(d) * 1.6 + 0.04, abs(d - 0.72));
        float disc = 1.0 - smoothstep(0.95, 1.08, d);
        c = mix(c, GR_GOLD, disc * 0.55);
        c = mix(c, GR_LIT, ring * 0.85);
      }
    }
    return grCap(c);
  }`;

export const SKY_GATES = /* glsl */ `
  ${GLSL}
  vec3 sky(float az, float el) { return skyGates(az, el, 3.0); }`;

export const SKY_GATES_DARK = /* glsl */ `
  ${GLSL}
  vec3 sky(float az, float el) { return skyGates(az, el, 3.0) * 0.34; }`;

export function liveGates() {
  const mat = new ShaderMaterial({
    side: BackSide, depthWrite: false,
    uniforms: { uT: { value: 0 } },
    vertexShader: "varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(p.xy, p.w * 0.9998, p.w); }",
    fragmentShader: `uniform float uT; varying vec3 vD; ${KIT} ${GLSL}
      void main() {
        vec3 d = normalize(vD);
        gl_FragColor = vec4(skyGates(atan(d.x, -d.z), asin(clamp(d.y, -1.0, 1.0)), uT), 0.0);
      }`,
  });
  const mesh = new Mesh(new SphereGeometry(395, 64, 32), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -9;
  mesh.userData.layer = 1;
  return {
    mesh,
    uniforms: mat.uniforms,
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
