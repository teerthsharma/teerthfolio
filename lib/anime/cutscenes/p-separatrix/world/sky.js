// p-separatrix WORLD: the sky dome. ONE live dome shader holds three skies and the three state changes, because the sky must erase,
// swap to the King Crimson cosmos, repaint and un-paint with the rest of the set (a baked dome cannot).
//
// MATHS (az = atan(d.x, -d.z), el = asin(d.y), d the view direction; p = (az + drift, el)):
//  DUSK   t = clamp(el / 1.25); s = q6(t^0.55) where q6(x) = (floor(6x) + smoothstep(0, fwidth(6x), fract(6x))) / 6 is a 6-step
//         hard-edged posterise; colour = ramp4(s, horizon #f2bd45, rose #d96a52, upper #5a1a8c, zenith #1d1a6e). Below the horizon
//         the dome goes rose (the ground plane covers it). Sun at SUN (0.5, 0.2, -0.84): disc r 0.045 rad core #fff3c4 x 1.25, two hard halo
//         steps at 0.10 and 0.22 rad. Chalk mottle: x (1 + 0.175 (fbm(38 p) - 0.5) + 0.0875 (fbm(90 p) - 0.5)); craquelure: cell borders
//         (F2 - F1 < fwidth) of vor(22 p) at 20 percent #7a2290 on the zenith band only (smoothstep(0.55, 0.8, t)).
//  CLOUDS 8 pigment clouds, each an ellipse (c, r) in (az, el) with a rough edge: q = (p - c) / r, d = |q| - 1 + 0.35 (fbm(14 p + 7 c) - 0.5).
//         Three flat tones from s = dot(q, R30(toSun)): lit #fbd9a0 (s > 0.25), mid #d98f78 (s > -0.35), shade #7a2290; the shadow edge is a
//         hard diagonal 30 degrees from the sun side. A 2px umber #2a1a24 rim where d > -2 fwidth(d). No gradient inside a cloud.
//         Drift 0.4 deg/s (0.00698 rad/s) on twos: uDrift.
//  COSMOS (King Crimson time skip) base #0b0612, faint magenta wisps, ~140 stars: cell grid 0.065 rad, one star per cell with probability 0.7,
//         radius 0.6..1.8 px (measured in cell units by fwidth), pink #ff9be0 or white, brightness 0.65 + 0.35 sin(6 uTw + 40 h) with uTw
//         stepped on threes, a thin 4-point glint on the largest. uCosmos 0..1 in quarters: a 4-frame dither dissolve (per 2x2 block hash).
//  ERASE  f = fbm(7 p + 3); erased where f < mix(0.05, 0.98, uErase) and el + 0.15 >= uSkyG (the gild repaint grows up from the horizon):
//         pigment -> grey plaster #8a7a8a / sinopia #b9573a mix with a flake rim.
//  ZERO   el + 0.15 < uSkyZ -> blank plaster #fbf6e8 (rises from the horizon, matching the ring that expands from the saddle).
import { Mesh, ShaderMaterial, SphereGeometry, BackSide } from "three";
import { glslFor } from "../../../tools/index.js";
import { C, SUN, hex, mixHex, stepK } from "./common.js";

const FRAG = /* glsl */ `
  uniform float uErase; uniform float uSkyG; uniform float uSkyZ; uniform float uDrift; uniform float uCosmos; uniform float uTw;
  varying vec3 vD;
  const vec3 SUN = vec3(${SUN.x.toFixed(4)}, ${SUN.y.toFixed(4)}, ${SUN.z.toFixed(4)});
  float q6(float x) { float f = x * 6.0, w = fwidth(f) * 1.2 + 1e-4; return (floor(f) + smoothstep(0.0, w, fract(f))) / 6.0; }
  const vec4 CL[8] = vec4[8](vec4(0.95, 0.34, 0.20, 0.055), vec4(1.38, 0.18, 0.16, 0.040), vec4(0.05, 0.42, 0.24, 0.060), vec4(-0.50, 0.26, 0.18, 0.045),
    vec4(-1.00, 0.50, 0.22, 0.060), vec4(0.38, 0.11, 0.14, 0.030), vec4(2.40, 0.30, 0.20, 0.050), vec4(-2.40, 0.30, 0.20, 0.050));
  vec3 dusk(float az, float el, vec3 d) {
    vec2 p = vec2(az + uDrift, el);
    float t = clamp(el / 1.25, 0.0, 1.0);
    float s = q6(pow(t, 0.55));
    vec3 c = ramp4(s, ${hex(C.horizon)}, ${hex(C.rose)}, ${hex(C.upper)}, ${hex(C.zenith)});
    if (el < 0.0) c = mix(${hex(C.horizon)}, ${hex(C.rose)}, clamp(-el * 4.0, 0.0, 1.0));
    float sd = acos(clamp(dot(d, SUN), -1.0, 1.0)), sw = fwidth(sd) + 1e-5;
    c = mix(c, mix(c, ${hex(C.horizon)} * 1.05, 0.5), 1.0 - step(0.22, sd));
    c = mix(c, mix(c, ${hex(C.sunCore)}, 0.5), 1.0 - step(0.10, sd));
    c = mix(c, ${hex(C.sunCore)} * 1.25, 1.0 - smoothstep(0.045 - sw, 0.045 + sw, sd));
    c *= 1.0 + (fbm(p * 38.0) - 0.5) * 0.175 + (fbm(p * 90.0) - 0.5) * 0.0875;
    vec2 v = vor(p * 22.0);
    c = mix(c, ${hex(C.cloudShade)}, (1.0 - smoothstep(0.0, fwidth(v.y) * 0.8 + 1e-4, v.y)) * 0.2 * smoothstep(0.55, 0.8, t));
    vec2 sunAE = vec2(atan(SUN.x, -SUN.z), asin(SUN.y));
    mat2 R = mat2(0.866, 0.5, -0.5, 0.866);                                 // 30 degrees
    vec2 pw = vec2(fwidth(p.x), fwidth(p.y));
    for (int i = 0; i < 8; i++) {
      vec4 cl = CL[i]; vec2 dd = p - cl.xy; dd.x = mod(dd.x + 3.14159, 6.28318) - 3.14159;
      vec2 q = dd / cl.zw;
      if (abs(q.x) > 1.7 || abs(q.y) > 1.7) continue;
      float dist = length(q) - 1.0 + 0.35 * (fbm(p * 14.0 + cl.xy * 7.0) - 0.5);
      float fw = length(pw / cl.zw) * 1.8 + 1e-5, cov = 1.0 - smoothstep(-fw, fw, dist);
      if (cov <= 0.0) continue;
      vec2 toSun = normalize(sunAE - cl.xy + 1e-4); toSun = R * toSun;
      float sh = dot(q, toSun), sw2 = fw;
      vec3 cc = mix(${hex(C.cloudShade)}, ${hex(C.cloudMid)}, smoothstep(-0.35 - sw2, -0.35 + sw2, sh));
      cc = mix(cc, ${hex(C.cloudLit)}, smoothstep(0.25 - sw2, 0.25 + sw2, sh));
      cc = mix(cc, ${hex(C.deep)}, smoothstep(-fw * 2.0, -fw * 1.2, dist));  // 2 px umber rim
      c = mix(c, cc, cov);
    }
    return c;
  }
  vec3 cosmos(float az, float el) {
    vec2 p = vec2(az, el);
    vec3 c = ${hex(C.cosmos)} + ${hex(C.cosmosWisp)} * 0.035 * smoothstep(0.55, 0.9, fbm(p * 3.0 + 2.0));
    float cell = 0.065; vec2 g = p / cell, id = floor(g), f = fract(g);
    float h = h21(id + 11.0), keep = step(h, 0.7);
    vec2 pos = 0.15 + 0.7 * h22(id + 3.0);
    float pc = max(fwidth(g.x), fwidth(g.y)) + 1e-5, rad = mix(0.6, 1.8, h21(id + 7.0));
    float r = rad * pc, dd = length(f - pos);
    float star = 1.0 - smoothstep(r * 0.6, r * 1.2 + pc * 0.5, dd);
    float glint = (1.0 - smoothstep(0.0, pc * 0.7, min(abs(f.x - pos.x), abs(f.y - pos.y)))) * (1.0 - smoothstep(0.0, 0.16, dd)) * step(1.4, rad);
    float tw = 0.65 + 0.35 * sin(uTw * 6.0 + h * 40.0);
    vec3 sc = mix(${hex(C.starPink)}, ${hex(C.starWhite)}, step(0.55, h21(id + 5.0)));
    return c + sc * (star + glint * 0.6) * tw * keep;
  }
  void main() {
    vec3 d = normalize(vD);
    float az = atan(d.x, -d.z), el = asin(clamp(d.y, -1.0, 1.0));
    vec3 col;
    if (uCosmos >= 0.999) col = cosmos(az, el);
    else {
      col = dusk(az, el, d);
      vec2 p = vec2(az + uDrift, el);
      if (uErase > 0.001) {
        float f = fbm(p * 7.0 + 3.0), thr = mix(0.05, 0.98, uErase);
        float er = (1.0 - step(thr, f)) * step(uSkyG, el + 0.15);
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        vec3 pl = mix(${hex(C.greyPlaster)}, ${hex(C.sinopia)}, 0.35 + 0.4 * fbm(p * 4.0));
        pl = mix(pl, vec3(lum) * 0.8, 0.2);
        float rim = (1.0 - smoothstep(0.0, 0.014, abs(f - thr))) * step(uErase, 0.999);
        pl = mix(pl, ${mixHex(C.sinopia, "#000000", 0.45)}, rim * 0.85);
        col = mix(col, pl, er);
      }
      if (uSkyZ > -1.0) col = mix(col, ${hex(C.plaster)} * (0.97 + 0.05 * fbm(p * 30.0)), 1.0 - step(uSkyZ, el + 0.15));
      if (uCosmos > 0.001) {
        float hh = h21(floor(gl_FragCoord.xy / 2.0) + floor(uTw * 8.0) * 3.7);
        col = mix(col, cosmos(az, el), step(hh, uCosmos));
      }
    }
    gl_FragColor = vec4(col, 0.0);
  }`;

export function buildSky(ctx, U) {
  const mat = new ShaderMaterial({
    side: BackSide, depthWrite: false, depthTest: false,
    uniforms: {
      uErase: U.uErase, uSkyG: { value: -9 }, uSkyZ: { value: -9 }, uDrift: { value: 0 }, uCosmos: { value: 0 }, uTw: { value: 0 },
    },
    vertexShader: "varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(p.xy, p.w * 0.99999, p.w); }",
    fragmentShader: glslFor(["noise"]) + FRAG,
  });
  const mesh = new Mesh(new SphereGeometry(400, 48, 24), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.userData.layer = 1;
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  return {
    mesh,
    update(cue) {
      const u = mat.uniforms, t = cue.ts ?? cue.t;
      u.uDrift.value = t * 0.00698;
      u.uTw.value = Math.floor(cue.t * 8) / 8;
      // cosmos: 3.0 .. 5.3, dissolve in and out over 4 frames (0.17 s) on threes
      let a, b = cue.beat && cue.beat("cosmos") ? cue.arg("cosmos", "dur", 2.3) : 2.3;
      a = cue.beat && cue.beat("cosmos") ? cue.since("cosmos") : cue.t - 3.0;
      const k = Number.isFinite(a) && a >= 0 ? Math.min(clamp01(a / 0.17), 1 - clamp01((a - (b - 0.17)) / 0.17)) : 0;
      u.uCosmos.value = stepK(k, 4);
      // the sky repaint and the zero grow up from the horizon, in step with the ground rings (90 m -> 1.8 rad, 130 m -> 2.1 rad)
      u.uSkyG.value = U.uGild.value < 0 ? -9 : U.uGild.value * 0.02 - 0.15;
      u.uSkyZ.value = U.uZero.value < 0 ? -9 : U.uZero.value * 0.0162 - 0.15;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
