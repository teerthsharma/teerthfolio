// Family 3 — blazer wool / gold button / ribbon (6).
// Red ANHS wool under cold fluoro. Gold is a wavelength catch, not yellow paint.
import { T } from "./kit.glsl.js";

const F = "blazer";

export const BLAZER = [
  T("blazerWool", F, "red blazer wool: 3-step cel, quiet nap, fluoro key, no satin shine",
    `vec3 blazerWool(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      float h = scNdL(p);
      vec3 wool = scWool(p, h);
      return mix(c, wool, scCover(p));
    }`, "blazerWool(p, t)"),

  T("blazerTwill", F, "printed twill on the blazer: diagonal weave, fwidth, low contrast",
    `vec3 blazerTwill(vec2 p, float t) {
      vec3 c = blazerWool(p, t);
      float h = scNdL(p);
      float weave = abs(fract((p.x + p.y) * 22.0) - 0.5);
      float w = fwidth((p.x + p.y) * 22.0) + 1e-5;
      float twill = 1.0 - smoothstep(0.18 - w, 0.18 + w, weave);
      vec3 dyed = mix(scWool(p, h), scWool(p, h) * 0.86, twill * 0.45);
      return mix(c, dyed, scCover(p));
    }`, "blazerTwill(p, t)", ["blazerWool"]),

  T("goldButton", F, "ANHS gold button catch: dark body, one hard specular sheet, wavelength gold",
    `vec3 goldButton(vec2 p, float t) {
      vec3 c = blazerWool(p, t);
      vec2 b = vec2(0.78, 0.38);
      vec3 N = scSphereN(p);
      vec3 H = normalize(scLdir() + vec3(0.0, 0.08, 1.0));
      float spec = pow(max(dot(N, H), 0.0), 36.0);
      float disc = scFill(length(p - b) - 0.034);
      float rim = scLine(length(p - b) - 0.034, 1.5);
      vec3 gold = scGoldCatch(spec + (1.0 - length(p - b) * 8.0));
      c = mix(c, gold, disc);
      return mix(c, SC_GOLD_BODY * 0.7, rim * 0.55);
    }`, "goldButton(p, t)", ["blazerWool"]),

  T("collarSplit", F, "white collar over red blazer: value split at the neck, fluoro on the cotton",
    `vec3 collarSplit(vec2 p, float t) {
      vec3 c = blazerWool(p, t);
      float cov = scCover(p);
      float collar = scFill(scEllipse(p, vec2(0.72, 0.62), vec2(0.16, 0.08))) * scAA(p.y, 0.54);
      float inner = scFill(scEllipse(p, vec2(0.72, 0.64), vec2(0.10, 0.05)));
      vec3 cloth = mix(SC_COLLAR * 0.78, SC_COLLAR, scAA(scNdL(p), 0.55));
      c = mix(c, cloth, collar * cov);
      return mix(c, scSkin(scNdL(p)), inner * cov * 0.85);
    }`, "collarSplit(p, t)", ["blazerWool"]),

  T("ribbonKnot", F, "school ribbon knot at the collar: two tails, printed red, still",
    `vec3 ribbonKnot(vec2 p, float t) {
      vec3 c = collarSplit(p, t);
      float cov = scCover(p);
      float knot = scFill(scEllipse(p, vec2(0.72, 0.56), vec2(0.034, 0.022)));
      float tailL = scFill(scSeg(p, vec2(0.72, 0.55), vec2(0.64, 0.42), 0.010));
      float tailR = scFill(scSeg(p, vec2(0.72, 0.55), vec2(0.80, 0.41), 0.010));
      vec3 rib = mix(SC_RIBBON * 0.7, SC_RIBBON, scAA(scNdL(p), 0.50));
      return mix(c, rib, max(knot, max(tailL, tailR)) * cov);
    }`, "ribbonKnot(p, t)", ["collarSplit"]),

  T("blazerPiping", F, "blazer edge piping: one fwidth stitch line, observational, not a glow",
    `vec3 blazerPiping(vec2 p, float t) {
      vec3 c = blazerWool(p, t);
      vec2 q = p - vec2(0.72, 0.50);
      float r = length(q);
      float pipe = scLine(r - sqrt(0.22), 1.7);
      vec3 stitch = mix(SC_BLAZER_SHADE, SC_GOLD_BODY * 0.8, 0.35);
      return mix(c, stitch, pipe * scCover(p) * 0.70);
    }`, "blazerPiping(p, t)", ["blazerWool"]),
];
