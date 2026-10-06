// NEBULA VOID SKY (bible: "Nebula void sky"). A baked dome: dark nebula of maroon, green and violet clouds, a luminous orb world
// upper-left (5% frame, pattern band), stars. One GLSL `sky(az, el)`; az = atan(d.x, -d.z), el = asin(d.y).
//
// MATHS
//   periodic noise  pf(x,y) = (1-w) fbm(x,y) + w fbm(x-P,y), w = (x+PI)/P, P = 2PI   (so az = -PI and +PI agree: no seam)
//   domain warp     q = p*1.3,  wv = (pf(q+a), pf(q+b)),  d_k = pf(p*s_k + 1.7*wv + o_k)         (soft variance, fbm + warp)
//   clouds          c = base + maroon*S(.30,.85,d1) + green*S(.45,.90,d2)*.8 + violet*S(.30,.80,d3)*.9      (smooth, never banded)
//   orb light       L = exp(-|p - orb| * 3.2): clouds near the orb are lifted by (1 + 2.2 L), the key falls off from the orb
//   orb disc        disc = 1 - S(r-aa, r+aa, |p-orb|);  limb = sqrt(1 - (|p-orb|/r)^2);  band = stripes of (y-orb.y)/r wobbled by fbm
//                   colour = mix(#fff8d8, #c8a868, band) * (0.55 + 0.6 limb)         (values > 1 on purpose: the orb blooms)
//   halo            #fff8d8 * 0.4 * exp(-|p-orb| / 0.05)
//   stars           cell = floor(p*260), h = h21(cell): a star where h > .985, radius from a second hash
import { V } from "../../../paint.js";

export const ORB = { az: -0.75, el: 0.42, r: 0.03 };

export function skyGLSL() {
  return /* glsl */ `
  const float PI2 = 6.2831853;
  float pf(vec2 p) { float w = clamp((p.x + 3.14159265) / PI2, 0.0, 1.0); return mix(fbm(p), fbm(p - vec2(PI2, 0.0)), w); }
  vec3 sky(float az, float el) {
    vec2 p = vec2(az, el);
    vec2 orb = vec2(${ORB.az.toFixed(3)}, ${ORB.el.toFixed(3)});
    float od = length((p - orb) * vec2(cos(el), 1.0));
    vec2 q = p * 1.3;
    vec2 wv = vec2(pf(q + vec2(1.7, 9.2)), pf(q + vec2(8.3, 2.8)));
    float d1 = pf(p * 1.6 + 1.7 * wv + vec2(3.1, 0.0));
    float d2 = pf(p * 2.3 + 1.5 * wv + vec2(11.7, 4.0));
    float d3 = pf(p * 1.1 + 1.9 * wv + vec2(7.3, 21.0));
    vec3 c = ${V("#0a0814")};
    c += ${V("#5a1a28")} * smoothstep(0.30, 0.85, d1) * 1.15;
    c += ${V("#2a4a3a")} * smoothstep(0.45, 0.90, d2) * 0.95;
    c += ${V("#3a2a5a")} * smoothstep(0.30, 0.80, d3) * 1.1;
    float lift = exp(-od * 3.2);
    c *= 1.0 + 2.2 * lift;
    c *= mix(0.55, 1.0, smoothstep(-0.7, 0.2, el));
    vec2 cell = floor(p * 260.0), f = fract(p * 260.0) - 0.5;
    float h = h21(cell + 3.0);
    float rad = 0.04 + 0.1 * h21(cell + 9.0);
    c += vec3(0.85, 0.9, 1.0) * step(0.985, h) * smoothstep(rad, 0.0, length(f)) * (0.7 + 0.8 * h21(cell + 5.0));
    float r = ${ORB.r.toFixed(3)}, aa = 0.0012;
    float disc = 1.0 - smoothstep(r - aa, r + aa, od);
    float limb = sqrt(max(1.0 - (od / r) * (od / r), 0.0));
    float yy = (p.y - orb.y) / r + 0.25 * fbm(p * 90.0);
    float band = smoothstep(0.35, 0.5, abs(fract(yy * 1.6) - 0.5)) * 0.9;
    vec3 oc = mix(${V("#fff8d8")}, ${V("#c8a868")}, band) * (0.55 + 0.6 * limb);
    c = mix(c, oc * 1.5, disc);
    c += ${V("#fff8d8")} * 0.4 * exp(-od / 0.05);
    return c;
  }`;
}

export function buildSky(ctx) {
  // the full circle of azimuth (the home shot looks from behind), -0.9..1.1 rad of elevation
  const dome = ctx.bake.sky(skyGLSL(), { tools: ["noise"], az: [-Math.PI, Math.PI], el: [-0.9, 1.1], pxPerRad: 640 });
  dome.name = "nebula-sky";
  return dome;
}
