// SKY for pr-pyrefly-4180: the baked night dome (burning Konoha, Pierrot fire-glow horizon) and the island veil that wipes in
// at the end. az here is bakedDome's convention: az = atan(x, -z), so az 0 looks BEHIND the seal (the fire side).
import { Color, Mesh, SphereGeometry, ShaderMaterial, BackSide } from "three";
import { KIT, V } from "../../../paint.js";
import { C } from "./palette.js";

// ---- the baked dome ---------------------------------------------------------------------------------------------
// MATHS. Dome gradient d(e) = mix(MID, TOP, smoothstep(0, .9, e)) with e = max(el, -.2).
// Fire glow  g = L(az) * B(e),  L = exp(-da^2 / (2 s^2)) (s = .85 rad, da = wrapped azimuth),  B = exp(-e / .13)  (the 14 % horizon band).
// Fire ramp  col = ramp4(g*1.25, d, SMOKE #5a1010, FIRE #d8501a, AMBER #ffb04a); core overshoot AMBER * g^4 * 1.3 blooms.
// Smoke-red wash on the left: second lobe at az = -1.25 (s = .6, e-falloff .35) mixes the dome toward SMOKE.
// Smoke clouds: n = fbm(warp(q, .8)), q = (az * 2.2, e * 4); cloud = smoothstep(.52, .62, n) * band(e); the under-lit rim is
//   smoothstep(.52, .58, n) - smoothstep(.6, .7, n), tinted EMBER and scaled by the glow lobe: Pierrot's lit smoke edges.
// Stars: cell = (az * 70, e * 70); a star where hash > .993, round falloff, hidden by cloud and by the horizon.
// Skyline: cells of 1/24 rad, pitched roofs top = .012 + .04 r (1 - .5 |2 fx|), bell chimneys when r > .92 (+ .05); silhouette
//   #2a3048 darkened, rim-lit toward #5a2418 by the lobe; windows on a (140, 140) grid are AMBER > 1 (they bloom).
export const SKY_GLSL = /* glsl */ `
  const vec3 TOP = ${V(C.plum)}, MIDC = ${V(C.violet)}, SMOKE = ${V(C.smoke)}, SMOKED = ${V(C.smokeDark)}, FIRE = ${V(C.fire)}, AMBER = ${V(C.lamp)},
             EMBER = ${V(C.ember)}, STAR = ${V(C.star)}, ROOF = ${V(C.roofShade)}, NIGHT = ${V(C.night)};
  vec3 sky(float az, float el) {
    float e = max(el, -0.2);
    float da = atan(sin(az), cos(az));
    vec3 dome = mix(MIDC, TOP, smoothstep(0.0, 0.9, e));
    float lobe = exp(-da * da / (2.0 * 0.85 * 0.85));
    float hv = exp(-max(e, 0.0) / 0.13);
    float g = lobe * hv;
    float da2 = da + 1.25;
    float lobe2 = exp(-da2 * da2 / (2.0 * 0.6 * 0.6)) * exp(-max(e, 0.0) / 0.35);
    dome = mix(dome, SMOKE, lobe2 * 0.7);
    vec3 col = ramp4(clamp(g * 1.25, 0.0, 1.0), dome, SMOKE, FIRE, AMBER) + AMBER * pow(g, 4.0) * 1.3;
    // smoke clouds with under-lit rims
    vec2 q = vec2(az * 2.2, e * 4.0);
    float n = fbm(warp(q + vec2(1.3, 0.0), 0.8));
    float band = smoothstep(0.02, 0.35, e) * (1.0 - smoothstep(0.7, 1.1, e));
    float cloud = smoothstep(0.52, 0.62, n) * band;
    float rim = (smoothstep(0.52, 0.58, n) - smoothstep(0.6, 0.7, n)) * band;
    vec3 cloudCol = mix(SMOKED, SMOKE * 0.6, smoothstep(0.55, 0.85, n));
    col = mix(col, cloudCol, cloud * 0.85);
    col += EMBER * rim * lobe * exp(-max(e, 0.0) / 0.4) * 0.8;
    // pinprick stars
    vec2 cell = vec2(az * 70.0, e * 70.0);
    float h = h21(floor(cell));
    float star = step(0.993, h) * smoothstep(0.35, 0.0, length(fract(cell) - 0.5)) * (1.0 - cloud) * smoothstep(0.1, 0.3, e);
    col += STAR * 1.5 * star;
    // the village skyline: pitched roofs, bell chimneys, lit windows
    float sc = az * 24.0;
    float cid = floor(sc), fx = fract(sc) - 0.5;
    float r = h21(vec2(cid, 3.0));
    float top = (0.012 + 0.04 * r) * (1.0 - 0.5 * abs(fx * 2.0)) + step(0.92, r) * step(abs(fx), 0.09) * 0.05;
    if (el < top) {
      vec3 sil = mix(ROOF * 0.5, vec3(0.35, 0.14, 0.09), lobe * 0.5 * smoothstep(top - 0.012, top, el));
      vec2 wc = vec2(az * 140.0, el * 140.0);
      float on = step(0.72, h21(floor(wc) + 9.0)) * step(abs(fract(wc.x) - 0.5), 0.3) * step(abs(fract(wc.y) - 0.5), 0.3) * step(el, top - 0.004) * step(0.0, el);
      col = sil + AMBER * 1.3 * on * (0.5 + 0.5 * lobe);
      if (el < 0.0) col = mix(NIGHT, col, smoothstep(-0.05, 0.0, el));
    }
    return col;
  }`;

export function bakeNightDome(ctx) {
  // the whole circle: the camera arcs and the chase shot looks the other way
  return ctx.bake.dome(SKY_GLSL, { az: [-Math.PI, Math.PI], el: [-0.3, 1.2], pxPerRad: 640 });
}

// ---- the island veil: a layer-1 dome that dither-wipes in the pale island sky over the night (uIsland 0..1) ------------
// MATHS. A fragment survives when bayer4(frag) < uIsland, a 16-level ordered dither: the posterised look of the stage folding away.
// Colour: zenith #c8d8e8 to horizon #f4f4f0, soft fbm cloud bands (mix .18).
export function islandVeil(uniforms) {
  const m = new ShaderMaterial({
    side: BackSide, depthWrite: false,
    uniforms: { uIsland: uniforms.uIsland },
    vertexShader: "varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(p.xy, p.w * 0.99999, p.w); }",
    fragmentShader: `uniform float uIsland; varying vec3 vD; ${KIT}
      float bayer4(vec2 f) { ivec2 i = ivec2(mod(f, 4.0)); int k = i.x + i.y * 4;
        float m[16] = float[16](0.,8.,2.,10., 12.,4.,14.,6., 3.,11.,1.,9., 15.,7.,13.,5.);
        return (m[k] + 0.5) / 16.0; }
      void main() {
        if (uIsland <= 0.001 || bayer4(gl_FragCoord.xy) > uIsland) discard;
        vec3 d = normalize(vD);
        float az = atan(d.x, -d.z), el = asin(clamp(d.y, -1.0, 1.0));
        vec3 c = mix(${V(C.islandPale)}, ${V(C.islandBlue)}, smoothstep(0.0, 0.8, el));
        c = mix(c, ${V(C.islandPale)}, 0.18 * smoothstep(0.45, 0.7, fbm(vec2(az * 2.0, el * 5.0))));
        gl_FragColor = vec4(c, 0.0);
      }`,
  });
  const s = new Mesh(new SphereGeometry(390, 48, 24), m);
  s.frustumCulled = false; s.renderOrder = -9; s.userData.layer = 1;
  return s;
}
export { Color };
