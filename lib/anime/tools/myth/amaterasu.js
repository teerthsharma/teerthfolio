// Family 2 — soot / black-flame crawl / ember (6). Warp, stretch, hash, ridge, gravity, ring.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "amaterasu", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const AMATERASU = [
  D("mythSootCrawl", "domain-warped fbm soot tongues crawling across a seal plate",
    /* glsl */ `
    vec3 mythSootCrawl(vec2 p, float t) {
      vec2 q = myWarp(p * 2.6 + vec2(0.0, -t * 0.18), 0.55);
      float d = myFbm(q);
      float tongue = smoothstep(0.38, 0.72, d);
      vec3 c = mix(MY_INDIGO, MY_SEAL * 0.42, p.y * 0.4);
      c = mix(c, MY_SOOT, tongue);
      c = mix(c, MY_CINNABAR, tongue * tongue * 0.35);
      return myOut(c);
    }`),

  D("mythBlackFlame", "vertically stretched flame SDF, 3-step cel — not warped soot",
    /* glsl */ `
    vec3 mythBlackFlame(vec2 p, float t) {
      vec2 q = (p - vec2(0.72, 0.22)) * vec2(2.8, 1.15);
      q.x += 0.12 * sin(q.y * 3.2 + t * 2.1);
      float n = myFbm(q * 1.6 + t * 0.4);
      float d = length(vec2(q.x, q.y * 0.45)) - (0.22 + 0.18 * n);
      float h = clamp(q.y * 0.35 + 0.4, 0.0, 1.0);
      vec3 c = myMix3(myCelN(h * myFill(d), 3.0), MY_SOOT, MY_CINNABAR, MY_EMBER);
      c = mix(MY_INDIGO, c, myFill(d));
      return myOut(c);
    }`),

  D("mythEmberHash", "cell-hashed rising sparks — power-law mag, not a flame body",
    /* glsl */ `
    vec3 mythEmberHash(vec2 p, float t) {
      vec2 uv = p + vec2(0.0, t * 0.22);
      vec2 gv = floor(uv * 16.0), f = fract(uv * 16.0) - 0.5;
      float h = myH21(gv), mag = pow(h, 5.5);
      vec2 j = (myH22(gv + 3.0) - 0.5) * 0.35;
      float disc = myFill(length(f - j) - (0.04 + 0.10 * mag));
      vec3 c = mix(MY_INDIGO, MY_SOOT, 0.55);
      c = mix(c, mix(MY_EMBER, MY_TORCH, mag), disc * mag);
      return myOut(c);
    }`),

  D("mythSootVeil", "full-frame ridged-noise veil — folded spines, not tongues",
    /* glsl */ `
    vec3 mythSootVeil(vec2 p, float t) {
      float r = myRidge(myWarp(p * 2.4 + t * 0.06, 0.4));
      float m = smoothstep(0.42, 0.86, r);
      vec3 c = mix(MY_INDIGO, MY_SOOT, m);
      c = mix(c, MY_CINNABAR * 0.55, m * m * 0.4);
      return myOut(c);
    }`),

  D("mythAshFall", "gravity-offset hash flakes — y += 0.5*age^2, not rising embers",
    /* glsl */ `
    vec3 mythAshFall(vec2 p, float t) {
      vec3 c = mix(MY_INDIGO, MY_SKYRED * 0.35, clamp(p.y, 0.0, 1.0) * 0.5);
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float age = fract(t * (0.12 + fi * 0.04) + fi * 0.31);
        vec2 uv = p * (10.0 + fi * 4.0);
        uv.y -= 0.55 * age * age * 6.0;
        vec2 gv = floor(uv), f = fract(uv) - 0.5;
        float h = myH21(gv + fi * 9.0);
        float keep = step(0.62, h);
        float flake = myFill(length(f) - 0.08 * h) * keep * (1.0 - age);
        c = mix(c, MY_CROW, flake * 0.85);
      }
      return myOut(c);
    }`),

  D("mythCinderRing", "expanding polar ember ring with soot interior — annulus, not a field",
    /* glsl */ `
    vec3 mythCinderRing(vec2 p, float t) {
      float r = length(p - MY_C);
      float head = 0.08 + fract(t * 0.18) * 0.42;
      float ring = myFill(myRing(r, head, 0.028));
      float inner = myFill(r - head);
      float n = myFbm(p * 6.0 + t);
      vec3 c = mix(MY_INDIGO, MY_SOOT, inner * (0.55 + 0.3 * n));
      c = mix(c, MY_EMBER, ring);
      c = mix(c, MY_TORCH, ring * n);
      return myOut(c);
    }`),
];

export default AMATERASU;
