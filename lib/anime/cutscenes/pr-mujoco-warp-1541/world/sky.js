// NAMEK SKY (bible 3.1, 6 "Sky violet shift"): a live painted dome (layer 0). Not baked: the violet shift and the crack flash are
// uniforms, and the plate re-bakes on every moving shot, so the dome follows the power curve.
//
// The maths, per fragment, from the view direction d (az = atan(dx, -dz), el = asin(dy), q = (az cos el, el)):
//   1. dry-brush:  br = fbm(vec2(az*7, el*220))  long in az, ~4 px tall in el; the band edges wobble by (br-0.5)*0.035 rad
//   2. five hard bands: b_k = step(edge_k, el + wobble); colour = mix chain horizon #e9f7a8 .. zenith #1f8f7a (no gradient)
//   3. violet shift:  colour = mix(band, violetBand, uPow * (0.5 + 0.5 smoothstep(0, 0.7, el)))  zenith #7a3fb8, pink at the horizon
//   4. sparkle stars: hash grid cell 0.11 rad, 4-point astroid |x|^.5 + |y|^.5 < r^.5, r 0.007..0.013 rad (10-16 px), blink on twos;
//      sparse at the horizon always, whole sky as uPow rises
//   5. cumulus: 12 clouds, each a union of 4 squashed discs with a flat base; shadow = inside(p) && !inside(p - off) (a left-lower
//      crescent, away from the suns); 1.5 px #1f6a60 line on the shadow side only; drift 2 px/s on threes
//   6. three suns low camera-right: hard halo band, #ffd84a ring, #fffbe0 disc
//   7. crack flash: colour = mix(colour, #fff3c2, uFlash) for 2 frames
// Below the horizon the dome is only seen past the far sea edge: a haze band.
import { BackSide, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { glslFor } from "../../../tools/index.js";
import { V, sm } from "./common.js";

export function buildSky(ctx, U) {
  const { THREE } = ctx;
  const mat = new ShaderMaterial({
    side: BackSide, depthWrite: false,
    uniforms: { uPow: U.pow, uFlash: U.flash, uStep: U.step },
    vertexShader: "varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(p.xy, p.w * 0.99999, p.w); }",
    fragmentShader: /* glsl */ `
      uniform float uPow; uniform float uFlash; uniform float uStep; varying vec3 vD;
      ${glslFor(["noise"])}
      const vec3 B0 = ${V("#e9f7a8")}, B1 = ${V("#b7ec9c")}, B2 = ${V("#6fd0a0")}, B3 = ${V("#2fa88a")}, B4 = ${V("#1f8f7a")};
      const vec3 P0 = ${V("#f6c8e8")}, P1 = ${V("#e0a0e0")}, P2 = ${V("#b878d8")}, P3 = ${V("#9255c8")}, P4 = ${V("#7a3fb8")};
      const vec3 CLIT = ${V("#a8e6c8")}, CSHD = ${V("#3f9f8a")}, CLIN = ${V("#1f6a60")}, CVL = ${V("#d8b8f0")}, CVS = ${V("#7a3fb8")};
      const vec3 CREAM = ${V("#fbfaf7")}, GOLD = ${V("#ffd84a")}, DISC = ${V("#fffbe0")}, FLASH = ${V("#fff3c2")}, HALO = ${V("#d4f5a0")};

      // squashed-disc cumulus with a flat base: signed distance (<0 inside), p and c in (az cos el, el)
      float cloudD(vec2 p, vec2 c, float s, float seed) {
        float d = 1e3;
        for (int k = 0; k < 4; k++) {
          float fk = float(k);
          vec2 o = vec2((fk - 1.5) * 0.55 * s, (h21(vec2(seed, fk)) - 0.3) * 0.25 * s);
          float r = s * (0.38 + 0.22 * h21(vec2(fk, seed + 3.0))) * (1.0 - 0.15 * abs(fk - 1.5));
          d = min(d, length((p - c - o) * vec2(1.0, 1.45)) - r);
        }
        return max(d, (c.y - 0.2 * s) - p.y);                       // flat base
      }
      float star4(vec2 p, float r) { return step(sqrt(abs(p.x)) + sqrt(abs(p.y)), sqrt(r)); }

      void main() {
        vec3 d = normalize(vD);
        float el = asin(clamp(d.y, -1.0, 1.0)), az = atan(d.x, -d.z);
        vec2 q = vec2(az * cos(el), el);
        if (el < 0.0) { gl_FragColor = vec4(mix(B1, B3, smoothstep(0.0, -0.4, el)), 0.0); return; }

        float br = fbm(vec2(az * 7.0, el * 220.0));                        // dry-brush streak
        float elw = el + (br - 0.5) * 0.035;                               // band edges wobble
        vec3 c = B0;
        c = mix(c, B1, step(0.06, elw)); c = mix(c, B2, step(0.18, elw)); c = mix(c, B3, step(0.38, elw)); c = mix(c, B4, step(0.70, elw));
        vec3 v = P0;
        v = mix(v, P1, step(0.06, elw)); v = mix(v, P2, step(0.18, elw)); v = mix(v, P3, step(0.38, elw)); v = mix(v, P4, step(0.70, elw));
        float vk = clamp(uPow * (0.5 + 0.5 * smoothstep(0.0, 0.7, el)), 0.0, 1.0);
        c = mix(c, v, vk);
        c *= 0.965 + 0.07 * step(0.55, br);                                // hard-edged dry-brush streaks

        // sparkle stars: sparse at the horizon, the whole sky in the violet shift (blink on twos)
        vec2 g = q / 0.11, id = floor(g), f = fract(g) - 0.5, hh = h22(id);
        float dens = 0.05 * (1.0 - smoothstep(0.1, 0.4, el)) + 0.38 * uPow;
        float on = step(hh.x, dens) * step(0.3, h21(id + floor(uStep * 12.0) * 0.137));
        float rr = (0.007 + 0.006 * hh.y) * (0.6 + 0.4 * h21(id + floor(uStep * 12.0)));
        c = mix(c, CREAM, on * star4(f * 0.11 - (h22(id + 5.1) - 0.5) * 0.05, rr));

        // cumulus, 12 cards; drift 2 px per second (~0.002 rad/s) on threes
        float drift = floor(uStep * 8.0) / 8.0 * 0.002;
        vec3 clit = mix(CLIT, CVL, uPow * 0.6), cshd = mix(CSHD, CVS, uPow * 0.6);
        for (int i = 0; i < 12; i++) {
          float fi = float(i);
          vec2 cc = vec2(-1.9 + 3.8 * h21(vec2(fi, 1.0)) + drift, 0.12 + 0.45 * h21(vec2(fi, 2.0)));
          float s = 0.10 + 0.12 * h21(vec2(fi, 3.0));
          if (abs(q.x - cc.x) > s * 2.2 || abs(q.y - cc.y) > s * 1.4) continue;
          float dc = cloudD(q, cc, s, fi);
          if (dc > 0.003) continue;
          vec2 off = vec2(0.35, 0.25) * s;
          float shadow = step(0.0, cloudD(q - off, cc, s, fi));             // outside the cloud shifted toward the suns
          vec3 cl = mix(clit, cshd, shadow);
          float line = (1.0 - step(0.003, abs(dc))) * step(0.0, dot(normalize(q - cc), -normalize(off)));  // 1.5 px, shadow side only
          cl = mix(cl, CLIN, line);
          c = mix(c, cl, max(step(dc, 0.0), line));
        }

        // three low suns, camera-right: halo band, gold ring (3 px), pale disc
        vec3 S0 = vec3(0.52 * cos(0.10), 0.10, 0.052), S1 = vec3(0.74 * cos(0.17), 0.17, 0.036), S2 = vec3(0.93 * cos(0.075), 0.075, 0.030);
        for (int i = 0; i < 3; i++) {
          vec3 s = i == 0 ? S0 : (i == 1 ? S1 : S2);
          float ds = length(q - s.xy);
          c = mix(c, HALO, 0.55 * (1.0 - step(s.z * 2.4, ds)));
          c = mix(c, GOLD, 1.0 - step(s.z + 0.0065, ds));
          c = mix(c, DISC, 1.0 - step(s.z, ds));
        }
        c = mix(c, FLASH, uFlash);
        gl_FragColor = vec4(c, 0.0);
      }`,
  });
  const mesh = new Mesh(new SphereGeometry(380, 48, 24), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.userData.layer = 0;
  return { mesh, dispose() { mesh.geometry.dispose(); mat.dispose(); } };
}
export { sm };
