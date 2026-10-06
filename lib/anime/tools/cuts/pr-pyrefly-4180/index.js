// Stash pack for pr-pyrefly-4180 — yellow flash / Hiraishin.
// Cloak #e8c040, headband #1d2a52. Night village, not a VFX fox.
import { defineCut as M } from "../kit.glsl.js";

const F = "pr-pyrefly-4180";

export const worldPlate = M("worldPlate", F, "paper night: indigo #1d2a52, roof umber, yellow reserved for the cloak",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y + cFbm(p * 2.2) * 0.03, 0.0, 1.0);
    vec3 night = vec3(0.078, 0.094, 0.176), mid = vec3(0.114, 0.165, 0.322), paper = vec3(0.290, 0.243, 0.220);
    vec3 c = mix(paper, mid, cAA(y, 0.32));
    c = mix(c, night, cAA(y, 0.58));
    float roof = (1.0 - cAA(p.y, 0.30)) * cAA(cVn(p * vec2(6.0, 2.0)), 0.55);
    return mix(c, vec3(0.243, 0.176, 0.149), roof * 0.55);
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "kiri-e paper tooth: night shade only, no speed-line",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float shade = cAA(p.y, 0.36);
    return mix(c, c * vec3(0.70, 0.74, 0.86), cVn(p * 32.0) * shade * 0.30);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "night-warm skin: headband shadow, yellow bounce only on the west",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    vec3 skin = cCel3(h, 0.40, 0.74, vec3(0.282, 0.161, 0.176), vec3(0.627, 0.420, 0.353), vec3(0.820, 0.659, 0.541));
    float band = cAA(abs(p.y - 0.60), 0.0) * (1.0 - cAA(abs(p.y - 0.60), 0.04)) * cCover(p);
    return mix(skin, skin * vec3(0.55, 0.58, 0.72), band * 0.55);
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "yellow flash cloak #e8c040, headband #1d2a52, no white-out",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 cloak = cCel3(h, 0.32, 0.66, vec3(0.557, 0.400, 0.110), vec3(0.820, 0.690, 0.220), vec3(0.910, 0.753, 0.251));
    float band = (1.0 - cAA(abs(p.y - 0.62) - 0.018, 0.0)) * cCover(p);
    cloak = mix(cloak, vec3(0.114, 0.165, 0.322), band);
    float plate = cFill(length(p - vec2(0.72, 0.62)) - 0.018);
    return mix(cloak, vec3(0.220, 0.290, 0.478), plate);
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "Pierrot hull #1a2030, 1.7px, yellow never blooms the lip",
  `vec3 castInk(vec2 p, float t){
    float lip = cLine(length(cN(p)) - sqrt(0.22), 1.7);
    vec3 ink = vec3(0.102, 0.125, 0.188);
    vec3 c = mix(ink, castSkin(p, t), cCover(p));
    return cSign(mix(c, ink, lip), p, t, 3.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "Hiraishin marks: three kunai seals, yellow flash between",
  `vec3 fxEnergy(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    vec2 a = vec2(0.28, 0.40), b = vec2(0.62, 0.62), d = vec2(0.84, 0.36);
    float marks = cFill(length(p - a) - 0.018) + cFill(length(p - b) - 0.018) + cFill(length(p - d) - 0.018);
    c = mix(c, vec3(0.910, 0.753, 0.251), marks);
    float ab = cLine(abs((p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y)), 1.4);
    return mix(c, vec3(0.820, 0.690, 0.220), ab * 0.25 * (1.0 - cAA(length(p - mix(a, b, 0.5)), 0.28)));
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "teleport cut: yellow afterimage smear, never white-out",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = p - vec2(0.68, 0.50);
    q.x *= 0.40;
    float smear = length(q) - 0.10;
    float star = cStar4(p - vec2(0.80, 0.52), 0.08);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.820, 0.690, 0.220), cFill(smear) * 0.60);
    return mix(c, vec3(0.910, 0.753, 0.251), star * 0.50);
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "FLASH plate: yellow fill, headband-navy stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.78, 0.20)) * vec2(2.0, 3.6);
    float d = max(abs(q.x) - 0.50, abs(q.y) - 0.16);
    vec3 c = mix(vec3(0.910, 0.753, 0.251), vec3(0.114, 0.165, 0.322), cLine(d, 2.2));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "night ellipse: indigo glue, cloak-hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.70, 0.48)) / vec2(0.18, 0.28);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.078, 0.094, 0.176) * (0.82 + 0.14 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "luma-safe invert on the teleport smear only",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    vec2 q = (p - vec2(0.68, 0.50)) * vec2(2.5, 1.0);
    float smear = 1.0 - cAA(length(q), 0.12);
    return mix(c, cInvert(c), smear * 0.55);
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "Pierrot night print: indigo grey, yellow is the only sat",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    vec3 grey = mix(vec3(0.102, 0.125, 0.188), vec3(0.478, 0.455, 0.439), L);
    float yel = smoothstep(0.08, 0.22, col.r * 0.45 + col.g * 0.55 - col.b);
    return mix(mix(col, grey, 0.36), col * vec3(1.06, 1.02, 0.86), yel);
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "village night: indigo lift, yellow hinge only on the cloak",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 lifted = mix(vec3(0.078, 0.094, 0.176), col, smoothstep(0.03, 0.22, L));
    float yel = smoothstep(0.10, 0.24, col.r * 0.4 + col.g * 0.5 - col.b);
    return mix(lifted, lifted * vec3(1.08, 1.02, 0.82), yel * 0.40);
  }`, "gradeNight(worldPlate(p, t))");

export const flashCloak = M("flashCloak", F, "cloak mass: hanging yellow, wind fold, navy lining peek",
  `vec3 flashCloak(vec2 p, float t){
    vec2 q = p - vec2(0.64, 0.44);
    float body = length(q / vec2(0.15, 0.22)) - 1.0 + 0.03 * sin(q.y * 9.0 + t);
    vec3 cloth = cCel3(cNdL(p), 0.32, 0.66, vec3(0.557, 0.400, 0.110), vec3(0.820, 0.690, 0.220), vec3(0.910, 0.753, 0.251));
    float lining = cLine(q.x + 0.08, 1.6);
    cloth = mix(cloth, vec3(0.114, 0.165, 0.322), lining * 0.40);
    return mix(worldPlate(p, t), cloth, cFill(body));
  }`, "flashCloak(p, t)");

export const headbandKnot = M("headbandKnot", F, "headband #1d2a52: plate disc, tails in the wind",
  `vec3 headbandKnot(vec2 p, float t){
    vec3 c = mix(worldPlate(p, t), castSkin(p, t), cCover(p));
    float band = max(abs(p.y - 0.62) - 0.016, abs(p.x - 0.72) - 0.12);
    float plate = length(p - vec2(0.72, 0.62)) - 0.022;
    float tail = max(abs(p.x - 0.86 - 0.02 * sin(p.y * 12.0 + t)) - 0.012, abs(p.y - 0.56) - 0.08);
    vec3 navy = vec3(0.114, 0.165, 0.322);
    c = mix(c, navy, max(cFill(band), cFill(tail)) * cCover(p));
    return mix(c, vec3(0.220, 0.290, 0.478), cFill(plate));
  }`, "headbandKnot(p, t)");

export const hiraishinMark = M("hiraishinMark", F, "seal formula: three stacked chevrons + center disc, yellow",
  `vec3 hiraishinMark(vec2 p, float t){
    vec2 q = p - vec2(0.36, 0.42);
    vec3 c = worldPlate(p, t);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float chev = abs(q.x) + (q.y - 0.02 * fi) * 0.9 - 0.05 - 0.02 * fi;
      c = mix(c, vec3(0.910, 0.753, 0.251), cFill(abs(chev) - 0.008) * cFill(0.08 - abs(q.x)));
    }
    return mix(c, vec3(0.114, 0.165, 0.322), cFill(length(q) - 0.012));
  }`, "hiraishinMark(p, t)");

export const kunaiArc = M("kunaiArc", F, "kunai: navy blade, yellow wrap, trailing formula ticks",
  `vec3 kunaiArc(vec2 p, float t){
    vec2 q = p - vec2(0.58, 0.40);
    q = mat2(0.87, -0.50, 0.50, 0.87) * q;
    float blade = max(abs(q.y) - 0.010 + max(q.x, 0.0) * 0.15, abs(q.x) - 0.12);
    float wrap = max(abs(q.x + 0.06) - 0.02, abs(q.y) - 0.016);
    vec3 c = mix(worldPlate(p, t), vec3(0.220, 0.290, 0.478), cFill(blade));
    c = mix(c, vec3(0.910, 0.753, 0.251), cFill(wrap));
    float ticks = cLine(fract((q.x + 0.20) * 8.0) - 0.5, 1.0) * cAA(-q.x, 0.12);
    return mix(c, vec3(0.820, 0.690, 0.220), ticks * 0.45);
  }`, "kunaiArc(p, t)");

export const yellowAfter = M("yellowAfter", F, "afterimage: three offset cloaks fading, last is navy",
  `vec3 yellowAfter(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 o = vec2(0.58 - fi * 0.08, 0.46 + 0.01 * sin(t + fi));
      float d = length((p - o) / vec2(0.08, 0.16)) - 1.0;
      vec3 col = i < 2 ? vec3(0.910, 0.753, 0.251) : vec3(0.114, 0.165, 0.322);
      c = mix(c, col, cFill(d) * (0.55 - fi * 0.15));
    }
    return c;
  }`, "yellowAfter(p, t)");

export const leafNight = M("leafNight", F, "village roofs: four gables, paper umber, one lantern sliver",
  `vec3 leafNight(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 o = vec2(0.14 + fi * 0.20, 0.26);
      float gable = abs(p.x - o.x) + (p.y - o.y) * 1.4 - 0.10;
      float wall = max(abs(p.x - o.x) - 0.07, abs(p.y - (o.y - 0.06)) - 0.05);
      c = mix(c, vec3(0.243, 0.176, 0.149), max(cFill(abs(gable) - 0.012) * (1.0 - cAA(p.y, o.y + 0.08)), cFill(wall)));
    }
    float lan = length(p - vec2(0.54, 0.30)) - 0.016;
    return mix(c, vec3(0.820, 0.690, 0.220), cFill(lan) * 0.70);
  }`, "leafNight(p, t)");

export const teleportCut = M("teleportCut", F, "cut between marks: yellow seam, navy gap, fwidth",
  `vec3 teleportCut(vec2 p, float t){
    float s = p.x * 0.85 + p.y * 0.53 - 0.72;
    float d = abs(s) - 0.010;
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.078, 0.094, 0.176), cFill(d));
    return mix(c, vec3(0.910, 0.753, 0.251), cLine(d, 2.0));
  }`, "teleportCut(p, t)");

export const sealFormula = M("sealFormula", F, "208-link formula card: navy field, yellow ticks in a ring",
  `vec3 sealFormula(vec2 p, float t){
    vec2 q = p - vec2(0.32, 0.58);
    float card = max(abs(q.x) - 0.12, abs(q.y) - 0.16);
    vec3 field = vec3(0.114, 0.165, 0.322);
    float a = atan(q.y, q.x);
    float ticks = cLine(fract(a / 0.224399) - 0.5, 1.0) * (1.0 - cAA(length(q), 0.10)) * cAA(length(q), 0.04);
    field = mix(field, vec3(0.910, 0.753, 0.251), ticks);
    float hoop = cLine(length(q) - 0.07, 1.6);
    field = mix(field, vec3(0.420, 0.353, 0.627), hoop * 0.55);
    return mix(worldPlate(p, t), field, cFill(card));
  }`, "sealFormula(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  flashCloak, headbandKnot, hiraishinMark, kunaiArc, yellowAfter, leafNight, teleportCut, sealFormula,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`pr-pyrefly-4180 cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
