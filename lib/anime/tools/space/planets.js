// Planet limb / atmosphere scatter / eclipse — 10 body operators.
import { T } from "./kit.glsl.js";

export const PLANETS = [
  T("planet-limb", "planet disc with limb darkening, fwidth edge",
    `vec3 planetLimb(vec2 p) {
      vec2 c = vec2(0.72, 0.38); float r = length(p - c), R = 0.28;
      float mu = sqrt(max(0.0, 1.0 - (r / R) * (r / R)));
      float limb = pow(mu, 0.65);
      float disc = spDisc(r, R);
      vec3 body = mix(SP_INK, vec3(0.22, 0.26, 0.38), limb);
      return mix(SP_VOID, body, disc);
    }`, "planetLimb(p)"),

  T("atmosphere-scatter", "Rayleigh limb: blue scatter ring outside the disc",
    `vec3 atmosphereScatter(vec2 p) {
      vec2 c = vec2(0.72, 0.36); float r = length(p - c), R = 0.26;
      float disc = spDisc(r, R);
      float mu = sqrt(max(0.0, 1.0 - (r / R) * (r / R)));
      vec3 body = mix(SP_INK, vec3(0.16, 0.22, 0.34), pow(mu, 0.7));
      float atm = exp(-pow((r - R) / 0.03, 2.0)) * (1.0 - disc);
      return mix(SP_VOID, body, disc) + SP_COLD * 0.45 * atm;
    }`, "atmosphereScatter(p)"),

  T("eclipse-diamond", "diamond-ring eclipse: dark disc, one Bailey bead",
    `vec4 eclipseDiamond(vec2 p) {
      vec2 m = vec2(0.72, 0.52), s = vec2(0.735, 0.53);
      float moon = spDisc(length(p - m), 0.16);
      float sun = spDisc(length(p - s), 0.162);
      float bead = exp(-length(p - vec2(0.88, 0.54)) * 40.0);
      float rim = sun * (1.0 - moon);
      vec3 col = mix(SP_VOID, SP_INK, moon) + SP_HOT * 0.55 * rim + SP_HOT * 0.7 * bead;
      return vec4(col, spEmit(rim + bead));
    }`, "eclipseDiamond(p).rgb"),

  T("eclipse-corona", "total eclipse plus solar corona streamers",
    `vec4 eclipseCorona(vec2 p) {
      vec2 c = vec2(0.72, 0.52); float r = length(p - c), th = atan(p.y - c.y, p.x - c.x);
      float moon = spDisc(r, 0.14);
      float stream = pow(0.5 + 0.5 * cos(th * 6.0), 2.6) * exp(-(r - 0.14) * 7.0) * (1.0 - moon);
      vec3 col = mix(SP_VOID + SP_GOLD * 0.35 * stream, SP_INK, moon);
      return vec4(col, spEmit(stream));
    }`, "eclipseCorona(p).rgb"),

  T("earthshine", "earthshine crescent: dark disc with a faint night side",
    `vec3 earthshine(vec2 p) {
      vec2 c = vec2(0.72, 0.48); float r = length(p - c), R = 0.2;
      float disc = spDisc(r, R);
      float phase = clamp((p.x - c.x) / R, -1.0, 1.0);
      float day = smoothstep(-0.05, 0.15, phase);
      float mu = sqrt(max(0.0, 1.0 - (r / R) * (r / R)));
      vec3 lite = SP_MOON * (0.25 + 0.5 * pow(mu, 0.6));
      vec3 night = vec3(0.06, 0.10, 0.16) * mu;
      return mix(SP_VOID, mix(night, lite, day), disc);
    }`, "earthshine(p)"),

  T("terminator-haze", "haze along the planet terminator",
    `vec3 terminatorHaze(vec2 p) {
      vec2 c = vec2(0.72, 0.40); float r = length(p - c), R = 0.26;
      float disc = spDisc(r, R);
      float term = exp(-pow((p.x - c.x) / 0.03, 2.0)) * disc;
      float mu = sqrt(max(0.0, 1.0 - (r / R) * (r / R)));
      vec3 body = mix(SP_INK, vec3(0.18, 0.2, 0.3), pow(mu, 0.7));
      return mix(SP_VOID, body, disc) + SP_EMBER * 0.25 * term;
    }`, "terminatorHaze(p)"),

  T("ring-occult", "ring occultation: thin ring crossing a limb-dark disc",
    `vec3 ringOccult(vec2 p) {
      vec2 c = vec2(0.72, 0.40); float r = length(p - c), R = 0.22;
      float disc = spDisc(r, R);
      float mu = sqrt(max(0.0, 1.0 - (r / R) * (r / R)));
      vec3 body = mix(SP_INK, vec3(0.28, 0.22, 0.16), pow(mu, 0.6));
      vec2 q = (p - c) / vec2(1.0, 0.28);
      float ring = spRing(length(q), 0.38, 0.018) * (1.0 - disc * 0.35);
      return mix(SP_VOID, body, disc) + SP_GOLD * 0.35 * ring;
    }`, "ringOccult(p)"),

  T("airless-limb", "airless body: sharp fwidth limb, no atmosphere",
    `vec3 airlessLimb(vec2 p) {
      vec2 c = vec2(0.72, 0.40); float r = length(p - c), R = 0.24;
      float mu = sqrt(max(0.0, 1.0 - (r / R) * (r / R)));
      float crat = 0.15 * spFbm(p * 10.0);
      vec3 body = vec3(0.22, 0.21, 0.20) * (0.35 + 0.5 * mu - crat);
      return mix(SP_VOID, body, spDisc(r, R));
    }`, "airlessLimb(p)"),

  T("twilight-arc", "twilight arc: thin scatter along the lit limb only",
    `vec3 twilightArc(vec2 p) {
      vec2 c = vec2(0.72, 0.38); float r = length(p - c), R = 0.25;
      float disc = spDisc(r, R);
      float arc = spRing(r, R, 0.01) * smoothstep(-0.05, 0.2, p.x - c.x);
      vec3 body = vec3(0.10, 0.12, 0.20) * disc;
      return mix(SP_VOID, body, disc) + vec3(0.55, 0.22, 0.12) * 0.45 * arc;
    }`, "twilightArc(p)"),

  T("transit-silhouette", "transit: small dark disc on a bright limb-dark star",
    `vec3 transitSilhouette(vec2 p) {
      vec2 s = vec2(0.72, 0.50); float R = 0.22, r = length(p - s);
      float mu = sqrt(max(0.0, 1.0 - (r / R) * (r / R)));
      float star = spDisc(r, R);
      vec3 lite = SP_HOT * (0.35 + 0.45 * pow(mu, 0.5));
      float planet = spDisc(length(p - vec2(0.78, 0.52)), 0.045);
      vec3 col = mix(SP_VOID, lite, star);
      return mix(col, SP_INK, planet * star);
    }`, "transitSilhouette(p)"),
];
