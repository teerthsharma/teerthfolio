// Stash pack for home — Vinland Saga / Thors watercolor. No invert, no impact-as-fight.
import { defineCut as M } from "../kit.glsl.js";

const F = "home";

export const worldPlate = M("worldPlate", F, "Vinland set-cel: zenith #1f58ac, horizon apricot, watercolor tooth",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y + cFbm(p * 3.1 + t * 0.02) * 0.05, 0.0, 1.0);
    vec3 zen = vec3(0.122, 0.345, 0.675), mid = vec3(0.357, 0.608, 0.839), hor = vec3(0.847, 0.580, 0.471);
    vec3 c = mix(mix(zen, mid, cAA(y, 0.32)), hor, cAA(y, 0.78) * 0.55);
    float tooth = cVn(p * 28.0) * 0.08;
    return c * (0.94 + tooth);
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "Vinland shadow hatch: cool lilac toner on rock/snow fill",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float shade = 1.0 - cAA(p.y + cFbm(p * 4.0) * 0.1, 0.42);
    vec3 ink = vec3(0.541, 0.561, 0.839);
    return mix(c, mix(c, ink, 0.35), cHatch(gl_FragCoord.xy, 6.5) * shade * 0.65);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "Thors-seal skin: warm cream, cool snow bounce, never grey",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    vec3 deep = vec3(0.353, 0.227, 0.227), sss = vec3(0.722, 0.541, 0.478), lit = vec3(0.886, 0.792, 0.706);
    return cCel3(h * 0.72 + 0.14, 0.40, 0.74, deep, sss, lit);
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "Thors tunic #6b7a96, strap umber, gold buckle sliver",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 c = cCel3(h, 0.30, 0.66, vec3(0.310, 0.361, 0.471), vec3(0.420, 0.478, 0.588), vec3(0.580, 0.627, 0.706));
    float strap = cLine(abs(p.y - 0.46) - 0.018, 1.5);
    c = mix(c, vec3(0.290, 0.196, 0.149), strap * 0.7);
    return mix(c, vec3(0.784, 0.627, 0.290), cAA(h, 0.82) * 0.35);
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "WIT ink #3a2a22 hull, 1.4px, snow never blooms",
  `vec3 castInk(vec2 p, float t){
    vec2 q = cN(p); float lip = cLine(length(q) - sqrt(0.22), 1.4);
    vec3 c = mix(vec3(0.227, 0.165, 0.133), castSkin(p, t), cCover(p));
    return cSign(mix(c, vec3(0.227, 0.165, 0.133), lip), p, t, 5.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "eleven beacons: flame core #fff0b3, mid #fba83d, outer #db6128",
  `vec3 fxEnergy(vec2 p, float t){
    float r = length(p - vec2(0.72, 0.38));
    float tongue = cFbm(vec2(p.x * 8.0, p.y * 14.0 - t * 0.8));
    float body = 1.0 - cAA(r - tongue * 0.04, 0.11);
    vec3 c = cCel3(body, 0.35, 0.70, vec3(0.859, 0.380, 0.157), vec3(0.984, 0.659, 0.239), vec3(0.886, 0.820, 0.557));
    return mix(worldPlate(p, t) * 0.55, c, body);
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "plop / bloop rings: cream concentric, watercolor, not a punch",
  `vec3 fxImpact(vec2 p, float t){
    float r = length(p - vec2(0.62, 0.28));
    float rings = cLine(fract(r * 6.0 - t * 0.2) - 0.5, 1.6) * (1.0 - cAA(r, 0.34));
    vec3 c = worldPlate(p, t);
    return mix(c, vec3(0.910, 0.957, 0.965), rings * 0.55);
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "fwoom / plop plate: cream fill, indigo stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.70, 0.28)) * vec2(2.4, 3.6);
    float d = max(abs(q.x) - 0.50, abs(q.y) - 0.20);
    vec3 c = mix(vec3(0.988, 0.953, 0.902), vec3(0.169, 0.208, 0.345), cLine(d, 2.0));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "screen ellipse over cream wash, jetty hero hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.62, 0.38)) / vec2(0.24, 0.30);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.169, 0.208, 0.345) * (0.7 + 0.2 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "watercolor vignette 0.12 — home never inverts",
  `vec3 occludeInvert(vec2 p, float t){
    return mix(vec3(0.169, 0.208, 0.345) * 2.1, worldPlate(p, t), cVig(p, 0.38));
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "WIT print: warm key, cool lilac shadow, sat held",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    vec3 w = mix(col * vec3(0.90, 0.92, 1.06), col * vec3(1.06, 1.00, 0.92), smoothstep(0.30, 0.74, L));
    return w;
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "dawn_lift grade: horizon +gold, snow never blooms",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 gold = vec3(0.847, 0.627, 0.400);
    return mix(col, mix(col * vec3(0.82, 0.86, 1.04), gold, smoothstep(0.55, 0.88, L)), 0.28);
  }`, "gradeNight(worldPlate(p, t))");

export const vinlandDawn = M("vinlandDawn", F, "dawn wash: #1f58ac → #ffb978, cirrus peach, sun ring",
  `vec3 vinlandDawn(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float sun = length(p - vec2(0.78, 0.70));
    c = mix(c, vec3(0.886, 0.827, 0.690), 1.0 - cAA(sun, 0.055));
    c = mix(c, vec3(0.949, 0.627, 0.353), cLine(sun - 0.07, 2.0) * 0.65);
    float cirrus = cFbm(vec2(p.x * 4.0, p.y * 10.0)) * smoothstep(0.55, 0.82, p.y);
    return mix(c, vec3(0.847, 0.627, 0.627), cirrus * 0.22);
  }`, "vinlandDawn(p, t)");

export const fjordWater = M("fjordWater", F, "fjord two-tone #0e4a5c / #0a3446, sun path, ripple strokes",
  `vec3 fjordWater(vec2 p, float t){
    float y = max(p.y, 0.02), u = (p.x - 0.55) / y;
    float L = 0.28 + 0.45 * cFbm(vec2(u * 2.2, y * 8.0 - t * 0.15));
    vec3 wc = mix(vec3(0.039, 0.204, 0.275), vec3(0.055, 0.290, 0.361), cAA(L, 0.44));
    float path = exp(-u * u * 14.0) * smoothstep(0.05, 0.28, y);
    float ripple = cLine(fract(y * 22.0 + cVn(vec2(u * 6.0, t)) * 0.3) - 0.5, 1.3);
    wc = mix(wc, vec3(0.847, 0.725, 0.471), path * 0.45);
    return mix(wc, vec3(0.910, 0.957, 0.965), ripple * 0.25 * (1.0 - path));
  }`, "fjordWater(p, t)");

export const orcaWake = M("orcaWake", F, "orca fin cut: indigo mass, cream belly, wake arms",
  `vec3 orcaWake(vec2 p, float t){
    vec2 q = p - vec2(0.58, 0.26);
    float body = length(q / vec2(0.22, 0.07)) - 1.0;
    float fin = max(abs(q.x + 0.02) - 0.03, q.y - 0.08);
    float d = min(body, fin);
    vec3 c = mix(vec3(0.106, 0.149, 0.220), vec3(0.969, 0.953, 0.918), cAA(q.y, -0.01) * cFill(body));
    float wake = cLine(abs(q.y + 0.02) - 0.01, 1.4) * (1.0 - cAA(abs(q.x), 0.34));
    c = mix(c, vec3(0.910, 0.957, 0.965), wake * 0.5);
    return mix(fjordWater(p, t), c, cFill(d));
  }`, "orcaWake(p, t)");

export const beaconFlame = M("beaconFlame", F, "cairn flame: 3-band cel tongue, fwidth iso",
  `vec3 beaconFlame(vec2 p, float t){
    vec2 q = (p - vec2(0.30, 0.36)) * vec2(6.0, 4.2);
    float n = cFbm(q + vec2(0.0, -t * 1.1));
    float d = length(vec2(q.x, q.y - n * 0.35)) - 0.55;
    vec3 c = cCel3(cFill(d), 0.33, 0.66, vec3(0.859, 0.380, 0.157), vec3(0.949, 0.659, 0.227), vec3(0.886, 0.820, 0.557));
    return mix(worldPlate(p, t) * 0.7, c, cFill(d + 0.08));
  }`, "beaconFlame(p, t)");

export const paperBleed = M("paperBleed", F, "wash_bleed: cream disc, wobbling edge, ring #c9c3ea",
  `vec3 paperBleed(vec2 p, float t){
    float r = length(p - vec2(0.50, 0.42));
    float wob = (cVn(p * 10.0 + t) - 0.5) * 0.04;
    float disc = 1.0 - cAA(r, 0.38 + wob);
    vec3 paper = vec3(0.988, 0.953, 0.902);
    vec3 c = mix(worldPlate(p, t), paper, disc * 0.82);
    return mix(c, vec3(0.788, 0.765, 0.918), cLine(r - 0.38 - wob, 2.2) * 0.7);
  }`, "paperBleed(p, t)");

export const rainRunoff = M("rainRunoff", F, "rain + 7-column runoff: pigment runs, seal-exempt hole",
  `vec3 rainRunoff(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float col = floor(p.x * 7.0);
    float run = fract(p.y * 4.0 + cH21(vec2(col, floor(t * 8.0))) + t * 0.3);
    float streak = cLine(fract(p.x * 7.0) - 0.5, 1.2) * (1.0 - cAA(run, 0.55));
    c = mix(c, vec3(0.227, 0.165, 0.180), streak * 0.45);
    float rain = cLine(fract(p.x * 40.0 + p.y * 8.0 - t * 2.0) - 0.5, 0.9) * 0.22;
    c = mix(c, vec3(0.561, 0.651, 0.800), rain);
    return mix(c, castSkin(p, t), cCover(p) * 0.85);
  }`, "rainRunoff(p, t)");

export const iglooPlate = M("iglooPlate", F, "igloo blocks: cream brick, lilac seam, rim #6fb4ea",
  `vec3 iglooPlate(vec2 p, float t){
    vec2 q = p - vec2(0.28, 0.40);
    float dome = length(q / vec2(0.20, 0.16)) - 1.0;
    vec2 brick = vec2(fract(q.x * 8.0), fract(q.y * 6.0));
    float seam = min(cLine(brick.x - 0.5, 1.1), cLine(brick.y - 0.5, 1.1));
    vec3 c = cCel3(cNdL(p), 0.38, 0.70, vec3(0.722, 0.690, 0.800), vec3(0.965, 0.945, 0.910), vec3(0.886, 0.847, 0.800));
    c = mix(c, vec3(0.788, 0.765, 0.918), seam * 0.55);
    c = mix(c, vec3(0.435, 0.706, 0.918), cLine(dome, 1.8) * 0.65);
    return mix(worldPlate(p, t), c, cFill(dome));
  }`, "iglooPlate(p, t)");

export const wheatPath = M("wheatPath", F, "Vinland rise: wheat strokes, gold glint path to the headland",
  `vec3 wheatPath(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float path = exp(-pow((p.x - 0.42) / max(p.y * 0.8, 0.04), 2.0) * 3.0) * cAA(p.y, 0.48);
    float wheat = cHatch(vec2(p.x * 90.0, p.y * 40.0), 3.5) * path;
    c = mix(c, vec3(0.847, 0.690, 0.290), path * 0.4);
    return mix(c, vec3(0.949, 0.827, 0.478), wheat * 0.55);
  }`, "wheatPath(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  vinlandDawn, fjordWater, orcaWake, beaconFlame, paperBleed, rainRunoff, iglooPlate, wheatPath,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`home cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
