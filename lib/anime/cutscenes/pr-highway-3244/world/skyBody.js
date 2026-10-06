// the GLSL body of the sunset dome (maths in sky.js)
import { PAL, V, SUN } from "./common.js";

export function bakeSkyBody() {
  return /* glsl */ `
  const vec3 SUN_D = vec3(${SUN.map((c) => c.toFixed(5)).join(", ")});
  float skyBand(float y, float a, float b) { float w = fwidth(y) * 0.8 + 1e-5; return smoothstep(a - w, a + w, y) * (1.0 - smoothstep(b - w, b + w, y)); }
  float cloudF(vec2 p, float cov) { return fbm(p * 1.2) + 0.35 * cov - 0.18; }
  vec3 sky(float az, float el) {
    vec3 d = vec3(sin(az) * cos(el), sin(el), -cos(az) * cos(el));
    float y = d.y;
    float h = pow(clamp(y, 0.0, 1.0), 0.7);
    vec3 c = ${V(PAL.skyHorizon)};
    c = mix(c, ${V(PAL.skyRose)}, smoothstep(0.0, 0.14, h));
    c = mix(c, ${V(PAL.skyViolet)}, smoothstep(0.10, 0.40, h));
    c = mix(c, ${V(PAL.skyZenith)}, smoothstep(0.35, 0.95, h));
    // flat horizon strips
    c = mix(c, ${V(PAL.skyHorizon)} * 1.06, skyBand(y, 0.004, 0.012) * 0.7);
    c = mix(c, ${V(PAL.skyRose)}, skyBand(y, 0.022, 0.028) * 0.55);
    c = mix(c, ${V(PAL.skyViolet)}, skyBand(y, 0.056, 0.060) * 0.45);

    float sd = dot(d, SUN_D);
    float ang = acos(clamp(sd, -1.0, 1.0));
    float sunAz = atan(SUN_D.x, -SUN_D.z), sunEl = asin(SUN_D.y);
    float dAz = az - sunAz; dAz = atan(sin(dAz), cos(dAz));
    float dEl = el - sunEl;

    // sea strip behind the sun
    float seaMask = skyBand(y, -0.02, 0.011) * (1.0 - smoothstep(0.7, 1.1, abs(dAz)));
    vec3 sea = mix(${V(PAL.seaDeep)}, ${V(PAL.sea)}, smoothstep(0.0, 0.011, y));
    float glit = exp(-abs(dAz) * 14.0) * smoothstep(0.42, 0.7, fbm(vec2(az * 90.0, y * 700.0)));
    sea += ${V(PAL.sunHalo)} * glit * 1.1;
    c = mix(c, sea, seaMask);

    // clouds
    float cov = smoothstep(0.0, 0.07, y) * (1.0 - 0.6 * smoothstep(0.5, 0.9, y));
    vec2 q = d.xz / (max(y, 0.0) + 0.10);
    float f0 = cloudF(q, cov);
    float ew = fwidth(f0) * 1.5 + 1e-4; // derivatives taken outside the branch
    {
      vec2 up = -normalize(q + 1e-4) * 0.16;
      vec2 toSun = normalize(SUN_D.xz) * 0.14;
      if (y > 0.012 && f0 > 0.5) {
        float fDown = cloudF(q - up, smoothstep(0.0, 0.07, y - 0.012) );
        float fUp = cloudF(q + up, cov);
        float fSun = cloudF(q + toSun, cov);
        vec3 cc = ${V(PAL.cloudBody)};
        cc = mix(cc, ${V(PAL.cloudCrown)}, step(fUp, 0.5) + step(fSun, 0.5) > 0.0 ? 1.0 : 0.0);
        cc = mix(cc, ${V(PAL.cloudBelly)}, step(fDown, 0.5));
        // the sun side of a cloud near the sun catches fire
        cc += ${V(PAL.sunGlow1)} * 0.35 * pow(max(sd, 0.0), 6.0);
        // 1 px darker value edge
        cc *= 1.0 - 0.16 * (1.0 - smoothstep(0.5, 0.5 + ew, f0));
        // clouds melt into the horizon gold
        cc = mix(${V(PAL.skyHorizon)} * 1.05, cc, smoothstep(0.012, 0.10, y));
        c = cc;
      }
    }

    // sun: glow, halo, disc, core, one horizontal streak
    float sp = max(sd, 0.0);
    c += ${V(PAL.sunGlow1)} * 0.5 * pow(sp, 5.0) + ${V(PAL.sunGlow2)} * pow(sp, 40.0);
    c += ${V(PAL.sunHalo)} * 0.4 * exp(-pow(ang / 0.07, 2.0));
    float w = fwidth(ang) * 0.8 + 1e-6;
    c = mix(c, ${V(PAL.sunDisc)} * 3.0, 1.0 - smoothstep(0.0140 - w, 0.0140 + w, ang));
    c = mix(c, ${V(PAL.sunCore)} * 5.0, 1.0 - smoothstep(0.006 - w, 0.006 + w, ang));
    c += ${V(PAL.sunStreak)} * 0.9 * exp(-abs(dEl) * 480.0) * exp(-abs(dAz) * 3.2) * step(0.0, dEl + 0.01);
    // below the horizon: warm haze (the ground hides it; this only keeps seams gold)
    c = mix(c, ${V(PAL.haze)}, smoothstep(0.0, -0.06, y) * 0.9);
    float L = dot(c, vec3(0.299, 0.587, 0.114));
    return L > 6.0 ? c * (6.0 / L) : c;
  }`;
}
