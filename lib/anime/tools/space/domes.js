// Domes / bullseye / twilight / storm shear — 15 operators on the sky sphere.
import { T } from "./kit.glsl.js";

export const DOMES = [
  T("bullseye-dome", "concentric value rings about a slightly sheared sky pole",
    `vec3 bullseyeDome(vec2 p) {
      vec2 q = p + vec2(p.y * 0.14, -p.x * 0.04);
      vec2 pol = spPolar(q, vec2(0.72, 0.62));
      float rr = pol.x / 0.055, f = fract(rr), w = clamp(fwidth(rr), 1e-4, 0.45);
      float band = floor(rr);
      vec3 a = spMix3(fract(band * 0.17), SP_VOID, SP_TEAL * 0.55, SP_ORCH * 0.4);
      vec3 b = spMix3(fract((band + 1.0) * 0.17), SP_VOID, SP_TEAL * 0.55, SP_ORCH * 0.4);
      float L = 0.22 + 0.18 * (1.0 - smoothstep(0.0, 1.1, pol.x));
      return mix(a, b, smoothstep(0.0, w * 1.2, f)) * L;
    }`, "bullseyeDome(p)"),

  T("bullseye-ripple", "bullseye rings whose radius is angularly modulated",
    `vec3 bullseyeRipple(vec2 p) {
      vec2 pol = spPolar(p, vec2(0.70, 0.58));
      float rr = (pol.x + 0.035 * sin(pol.y * 6.0)) / 0.06;
      float f = fract(rr), w = clamp(fwidth(rr), 1e-4, 0.5);
      vec3 c = mix(SP_VOID, SP_COLD * 0.35, 0.35 + 0.35 * sin(floor(rr) * 1.7));
      return mix(c * 0.7, c, smoothstep(0.0, w, f));
    }`, "bullseyeRipple(p)"),

  T("bullseye-log", "log-spaced rings — outer bands widen like a celestial target",
    `vec3 bullseyeLog(vec2 p) {
      vec2 pol = spPolar(p, vec2(0.74, 0.60));
      float rr = log(pol.x * 8.0 + 1.0) * 3.2, f = fract(rr), w = clamp(fwidth(rr), 1e-4, 0.5);
      vec3 c = mix(SP_INK, SP_TEAL * 0.5, 0.4 + 0.3 * fract(floor(rr) * 0.31));
      return mix(c * 0.65, c, smoothstep(0.0, w * 1.1, f));
    }`, "bullseyeLog(p)"),

  T("sheared-storm", "hard sheared storm bands: (az,el) sheared, iso-stepped with fwidth",
    `vec3 shearedStorm(vec2 p) {
      vec2 q = vec2(p.x * 2.6 + p.y * 3.4, p.y * 8.0 - p.x * 1.2);
      float n = spFbm(q), aa = fwidth(n) + 1e-4;
      float cl = smoothstep(0.56 - aa, 0.56 + aa, n) * smoothstep(-0.04, 0.08, spEl(p));
      vec3 sky = mix(SP_VOID, SP_TEAL * 0.25, 0.4 + 0.3 * p.y);
      vec3 cloud = sky * 0.42 + SP_INK * 0.38;
      float edge = (1.0 - smoothstep(0.0, aa * 2.0 + 0.004, abs(n - 0.56)));
      return mix(mix(sky, cloud, cl * 0.85), SP_INK, edge * 0.7);
    }`, "shearedStorm(p)"),

  T("storm-anvil", "sheared density with an anvil profile — wide head, narrow stem",
    `vec3 stormAnvil(vec2 p) {
      float el = spEl(p);
      float anvil = smoothstep(0.08, 0.22, el) * (1.0 - smoothstep(0.28, 0.42, el));
      float stem = (1.0 - smoothstep(0.08, 0.16, abs(p.x - 0.7))) * smoothstep(-0.05, 0.12, el);
      vec2 q = vec2(p.x * 2.1 + p.y * 2.8, p.y * 6.5);
      float n = spFbm(q);
      float d = n * (0.35 + 1.4 * anvil + 0.8 * stem);
      float aa = fwidth(d) + 1e-4;
      float cl = smoothstep(0.5 - aa, 0.5 + aa, d);
      return mix(mix(SP_VOID, SP_TEAL * 0.2, 0.3), SP_INK * 1.4 + SP_TEAL * 0.15, cl);
    }`, "stormAnvil(p)"),

  T("storm-shelf", "horizontal shelf-cloud step: density jumps on a sheared elevation",
    `vec3 stormShelf(vec2 p) {
      float s = p.y * 3.2 - p.x * 0.35 + 0.15 * spFbm(p * 4.0);
      float aa = fwidth(s) + 1e-4;
      float shelf = smoothstep(0.85 - aa, 0.85 + aa, s);
      vec3 up = mix(SP_VOID, SP_COLD * 0.22, 0.5);
      vec3 lo = SP_INK + SP_EMBER * 0.08;
      return mix(lo, up, shelf);
    }`, "stormShelf(p)"),

  T("twilight-grade", "three-stop elevation twilight: indigo zenith, ember belt, void ground",
    `vec3 twilightGrade(vec2 p) {
      float el = clamp(p.y, 0.0, 1.0);
      vec3 c = spMix3(el, SP_EMBER * 0.35, SP_ORCH * 0.28, SP_VOID);
      c += SP_HOT * 0.08 * exp(-abs(el - 0.22) * 18.0);
      return c;
    }`, "twilightGrade(p)"),

  T("twilight-moon", "twilight grade plus a limb-darkened moon disc, fwidth edge",
    `vec3 twilightMoon(vec2 p) {
      vec3 c = spMix3(clamp(p.y, 0.0, 1.0), SP_EMBER * 0.32, SP_ORCH * 0.22, SP_VOID);
      vec2 m = p - vec2(0.92, 0.72); float r = length(m);
      float mu = sqrt(max(0.0, 1.0 - (r / 0.11) * (r / 0.11)));
      float limb = pow(mu, 0.55);
      float disc = spDisc(r, 0.11);
      vec3 moon = SP_MOON * (0.28 + 0.62 * limb);
      return mix(c, moon, disc);
    }`, "twilightMoon(p)"),

  T("night-dome", "cos^n falloff from zenith — a dark indigo hemisphere",
    `vec3 nightDome(vec2 p) {
      float z = clamp(p.y, 0.0, 1.0);
      float fall = pow(z, 1.6);
      return mix(SP_INK, SP_VOID * 1.35 + SP_TEAL * 0.08, fall);
    }`, "nightDome(p)"),

  T("terminator-band", "thin day/night terminator stripe with fwidth, dusk on the lit side",
    `vec3 terminatorBand(vec2 p) {
      float s = p.x - 0.62 + 0.04 * sin(p.y * 3.0);
      float band = exp(-pow(s / 0.045, 2.0));
      float aa = spAA(abs(s) - 0.012);
      vec3 night = SP_VOID; vec3 dusk = SP_EMBER * 0.45 + SP_HOT * 0.12;
      vec3 day = mix(SP_TEAL * 0.2, SP_VOID, 0.55);
      vec3 c = mix(night, day, smoothstep(-0.02, 0.02, s));
      return mix(c, dusk, band * 0.85 * aa);
    }`, "terminatorBand(p)"),

  T("alpenglow-rim", "pink gaussian rim hugging the horizon only",
    `vec3 alpenglowRim(vec2 p) {
      float el = p.y;
      float rim = exp(-pow((el - 0.18) / 0.05, 2.0)) * (0.6 + 0.4 * sin(p.x * 9.0));
      vec3 c = mix(SP_INK, SP_VOID, clamp(el, 0.0, 1.0));
      return c + vec3(0.55, 0.18, 0.14) * rim * 0.55;
    }`, "alpenglowRim(p)"),

  T("polar-cap-glow", "exponential brightening toward a celestial pole",
    `vec3 polarCapGlow(vec2 p) {
      float th = length(p - vec2(0.72, 0.95));
      float g = exp(-th * 3.4);
      return mix(SP_VOID, SP_COLD * 0.55, g * 0.7);
    }`, "polarCapGlow(p)"),

  T("ecliptic-wash", "faint gaussian wash along a tilted ecliptic",
    `vec3 eclipticWash(vec2 p) {
      float d = abs(p.y - (0.40 + 0.18 * p.x));
      float w = exp(-pow(d / 0.07, 2.0));
      return SP_VOID + SP_GOLD * 0.12 * w + SP_HOT * 0.05 * w;
    }`, "eclipticWash(p)"),

  T("airglow-sheet", "thin green airglow layer at a fixed elevation, fwidth sheet",
    `vec3 airglowSheet(vec2 p) {
      float d = abs(p.y - 0.34 - 0.02 * sin(p.x * 7.0));
      float sheet = spAA(d - 0.012) * (0.5 + 0.5 * spFbm(vec2(p.x * 6.0, 3.0)));
      return SP_VOID + vec3(0.12, 0.38, 0.22) * sheet * 0.55;
    }`, "airglowSheet(p)"),

  T("moon-halo", "22-degree ice halo ring around a dim moon, fwidth annulus",
    `vec3 moonHalo(vec2 p) {
      vec2 c = vec2(0.78, 0.70); float r = length(p - c);
      float halo = spRing(r, 0.28, 0.012) * 0.55;
      float moon = spDisc(r, 0.045);
      vec3 col = SP_VOID + SP_MOON * 0.22 * halo;
      float mu = sqrt(max(0.0, 1.0 - (r / 0.045) * (r / 0.045)));
      return mix(col, SP_MOON * (0.3 + 0.5 * mu), moon);
    }`, "moonHalo(p)"),
];
