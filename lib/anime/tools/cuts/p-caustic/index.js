// Stash pack for p-caustic — Madara blue Perfect Susanoo (PROTECTED look).
import { defineCut as M } from "../kit.glsl.js";

const F = "p-caustic";

export const worldPlate = M("worldPlate", F, "war set-cel: #2a241f / #6a5c4d / #bfa98b, Susanoo is the only cold",
  `vec3 worldPlate(vec2 p, float t){
    float y = clamp(p.y + cFbm(p * 2.4) * 0.04, 0.0, 1.0);
    vec3 top = vec3(0.165, 0.141, 0.122), mid = vec3(0.416, 0.361, 0.302), haze = vec3(0.749, 0.663, 0.545);
    return mix(mix(top, mid, cAA(y, 0.36)), haze, cAA(y, 0.72) * 0.45);
  }`, "worldPlate(p, t)");

export const worldHatch = M("worldHatch", F, "war-plain hatch: umber toner, ash grain",
  `vec3 worldHatch(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float shade = 1.0 - cAA(p.y, 0.40);
    return mix(c, c * vec3(0.78, 0.72, 0.64), cHatch(gl_FragCoord.xy, 5.5) * shade * 0.7);
  }`, "worldHatch(p, t)");

export const castSkin = M("castSkin", F, "Madara-seal skin: warm dust bounce, never grey",
  `vec3 castSkin(vec2 p, float t){
    float h = cNdL(p);
    return cCel3(h, 0.40, 0.74, vec3(0.282, 0.165, 0.149), vec3(0.627, 0.439, 0.361), vec3(0.863, 0.722, 0.627));
  }`, "castSkin(p, t)");

export const castCloth = M("castCloth", F, "Madara plate #b3202e, hair #33293d, gunbai umber",
  `vec3 castCloth(vec2 p, float t){
    float h = cNdL(p);
    vec3 plate = cCel3(h, 0.30, 0.66, vec3(0.416, 0.059, 0.102), vec3(0.702, 0.125, 0.180), vec3(0.847, 0.353, 0.361));
    vec3 hair = cCel3(h, 0.34, 0.62, vec3(0.200, 0.161, 0.239), vec3(0.416, 0.373, 0.525), vec3(0.541, 0.490, 0.627));
    return mix(hair, plate, cAA(p.y, 0.44));
  }`, "castCloth(p, t)");

export const castInk = M("castInk", F, "Pierrot hull #2a1f1a, 2.5px",
  `vec3 castInk(vec2 p, float t){
    float lip = cLine(length(cN(p)) - sqrt(0.22), 2.5);
    vec3 c = mix(vec3(0.165, 0.122, 0.102), castSkin(p, t), cCover(p));
    return cSign(mix(c, vec3(0.165, 0.122, 0.102), lip), p, t, 2.0);
  }`, "castInk(p, t)");

export const fxEnergy = M("fxEnergy", F, "Susanoo spirit: fresnel (1-|N.V|)^1.6, scrolling fire vn*vn, blue only",
  `vec3 fxEnergy(vec2 p, float t){
    vec2 q = cN(p);
    vec3 N = normalize(vec3(q, sqrt(max(0.0, 0.22 - dot(q, q)))));
    float fr = pow(1.0 - abs(N.z), 1.6);
    float vn = cVn(q * 6.0 + vec2(0.0, t * 0.6));
    float fire = vn * vn;
    vec3 body = mix(vec3(0.071, 0.122, 0.341), vec3(0.122, 0.302, 1.000), cAA(fire, 0.40));
    body = mix(body, vec3(0.349, 0.749, 1.000), cAA(fr, 0.55));
    float seam = cLine(abs(q.y) - 0.08 - fire * 0.04, 1.6);
    return mix(worldPlate(p, t), mix(body, vec3(0.749, 0.902, 1.000), seam * 0.5), cCover(p * vec2(0.7, 1.3) + vec2(0.2, 0.0)) + cAA(fr, 0.2) * 0.5);
  }`, "fxEnergy(p, t)");

export const fxImpact = M("fxImpact", F, "Tengai slam: warm flash #fff4e4, crater ring, never white-out",
  `vec3 fxImpact(vec2 p, float t){
    vec2 q = p - vec2(0.62, 0.28); float r = length(q);
    float star = cStar4(q, 0.26);
    float ring = cLine(r - 0.20, 2.2);
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.886, 0.788, 0.627), star * 0.75);
    return mix(c, vec3(0.847, 0.541, 0.165), ring * 0.6);
  }`, "fxImpact(p, t)");

export const fxLetter = M("fxLetter", F, "GOGOGO / DOOOM plate: #ffb15a fill, #2a1208 stroke",
  `vec3 fxLetter(vec2 p, float t){
    vec2 q = (p - vec2(0.78, 0.22)) * vec2(2.0, 3.4);
    float d = max(abs(q.x) - 0.58, abs(q.y) - 0.22);
    vec3 c = mix(vec3(0.847, 0.694, 0.353), vec3(0.165, 0.071, 0.031), cLine(d, 2.4));
    return mix(worldPlate(p, t), c, cFill(d));
  }`, "fxLetter(p, t)");

export const occludeSeal = M("occludeSeal", F, "war-plain ellipse: ash glue, LOW-lens hero hole",
  `vec3 occludeSeal(vec2 p, float t){
    vec2 q = (p - vec2(0.68, 0.36)) / vec2(0.18, 0.26);
    float d = length(q) - 1.0;
    vec3 glue = vec3(0.165, 0.141, 0.110) * (0.75 + 0.2 * p.y);
    return mix(glue, worldPlate(p, t), cAA(d, 0.0));
  }`, "occludeSeal(p, t)");

export const occludeInvert = M("occludeInvert", F, "luma-safe invert for the 3-frame slam (white / inverted / normal)",
  `vec3 occludeInvert(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float k = step(0.5, fract(t * 2.0));
    return mix(c, cInvert(c), k * (1.0 - cCover(p)));
  }`, "occludeInvert(p, t)");

export const gradePrint = M("gradePrint", F, "Pierrot print: warm dust over all but the Susanoo blue",
  `vec3 gradePrint(vec3 col){
    float L = cLuma(col);
    vec3 dust = col * vec3(1.06, 0.98, 0.88);
    float blue = smoothstep(0.08, 0.22, col.b - col.r);
    return mix(dust, col, blue * 0.85);
  }`, "gradePrint(worldPlate(p, t))");

export const gradeNight = M("gradeNight", F, "war-dust night: lifted umber, moon-red hinge",
  `vec3 gradeNight(vec3 col){
    float L = cLuma(col);
    vec3 a = vec3(0.122, 0.094, 0.078), b = vec3(0.478, 0.227, 0.180);
    return mix(col, mix(a, b, smoothstep(0.15, 0.70, L)), 0.38);
  }`, "gradeNight(worldPlate(p, t))");

export const susanooBlue = M("susanooBlue", F, "PROTECTED Susanoo body: dark translucent, rim #59bfff / #ccebff",
  `vec3 susanooBlue(vec2 p, float t){
    return fxEnergy(p, t);
  }`, "susanooBlue(p, t)");

export const bloodMoon = M("bloodMoon", F, "Limbo moon: #b80a17 disc, #140003 mottled ink, pink sheen",
  `vec3 bloodMoon(vec2 p, float t){
    vec2 q = p - vec2(0.22, 0.78); float r = length(q);
    float mott = cFbm(q * 8.0);
    vec3 c = mix(vec3(0.078, 0.012, 0.020), vec3(0.722, 0.039, 0.090), cAA(mott, 0.45));
    c = mix(c, vec3(0.878, 0.333, 0.604), (1.0 - cAA(r, 0.09)) * 0.2);
    vec3 sky = worldPlate(p, t);
    sky = mix(sky, c, 1.0 - cAA(r, 0.11));
    return mix(sky, vec3(0.886, 0.800, 0.753), cLine(r - 0.115, 2.0) * 0.45);
  }`, "bloodMoon(p, t)");

export const tengaiMeteor = M("tengaiMeteor", F, "Tengai rock: #2a211a mass, lava #e6c799, ember tail",
  `vec3 tengaiMeteor(vec2 p, float t){
    vec2 q = p - vec2(0.58 + 0.04 * sin(t), 0.70);
    float d = length(q / vec2(0.10, 0.07)) - 1.0;
    vec3 rock = cCel3(cVn(q * 8.0), 0.35, 0.65, vec3(0.165, 0.129, 0.102), vec3(0.420, 0.361, 0.290), vec3(0.627, 0.541, 0.439));
    vec2 tail = p - vec2(0.58, 0.70);
    float trail = exp(-abs(tail.x + tail.y * 0.4) * 12.0) * cAA(tail.y, 0.0);
    vec3 c = mix(worldPlate(p, t), rock, cFill(d));
    return mix(c, vec3(0.847, 0.541, 0.165), trail * 0.55);
  }`, "tengaiMeteor(p, t)");

export const warSky = M("warSky", F, "Fourth-war sky: bruise #7a4a3c, sunset gold strip, cloud #1a0b0b",
  `vec3 warSky(vec2 p, float t){
    vec3 c = worldPlate(p, t);
    float strip = smoothstep(0.58, 0.64, p.y) * (1.0 - smoothstep(0.66, 0.72, p.y));
    c = mix(c, vec3(0.847, 0.722, 0.353), strip * 0.4);
    float cloud = cFbm(vec2(p.x * 3.0, p.y * 6.0));
    return mix(c, vec3(0.102, 0.043, 0.043), cAA(cloud, 0.62) * smoothstep(0.50, 0.80, p.y) * 0.55);
  }`, "warSky(p, t)");

export const crackedEarth = M("crackedEarth", F, "groundCrack / craterWeb: jagged 6-ray umber fissure",
  `vec3 crackedEarth(vec2 p, float t){
    vec2 q = (p - vec2(0.62, 0.30)) * 2.4; float best = 1.0;
    for (int i = 0; i < 6; i++) {
      float fi = float(i), a = fi * 1.047; vec2 d = vec2(cos(a), sin(a));
      float tt = dot(q, d), n = dot(q, vec2(-d.y, d.x));
      float jag = (cVn(vec2(tt * 9.0, fi)) - 0.5) * 0.22 * (0.3 + tt);
      best = min(best, abs(n - jag) - 0.03 * (1.0 - clamp(tt / 0.95, 0.0, 1.0)));
    }
    vec3 col = mix(vec3(0.165, 0.141, 0.110), vec3(0.847, 0.722, 0.502), cFill(best));
    return mix(worldPlate(p, t), col, cFill(best + 0.02));
  }`, "crackedEarth(p, t)");

export const limboThread = M("limboThread", F, "Tsukuyomi threads: #fbf0f0 filaments, halo #ffe8e0",
  `vec3 limboThread(vec2 p, float t){
    float y = p.y * 8.0 + cVn(vec2(p.x * 12.0, floor(t * 6.0))) * 0.4;
    float th = cLine(fract(p.x * 18.0 + sin(y) * 0.15) - 0.5, 1.2) * smoothstep(0.2, 0.8, p.y);
    vec3 c = worldPlate(p, t);
    return mix(c, vec3(0.886, 0.820, 0.800), th * 0.55);
  }`, "limboThread(p, t)");

export const skyTear = M("skyTear", F, "skyTear seam: #fff2d8 lip, #0a0408 gap, fwidth",
  `vec3 skyTear(vec2 p, float t){
    float s = p.x * 0.9 + p.y * 0.4 - 0.55;
    float d = abs(s) - 0.012;
    vec3 c = worldPlate(p, t);
    c = mix(c, vec3(0.039, 0.016, 0.031), cFill(d));
    return mix(c, vec3(0.886, 0.847, 0.722), cLine(d, 2.0));
  }`, "skyTear(p, t)");

export const warShatter = M("warShatter", F, "uBreak shards: warm cel facets flying off the war plate",
  `vec3 warShatter(vec2 p, float t){
    vec2 id = floor(p * 8.0);
    vec2 f = fract(p * 8.0) - 0.5;
    float h = cH21(id);
    vec2 off = (cH22(id) - 0.5) * 0.4 * fract(t * 0.2 + h);
    float d = length(f - off) - 0.22;
    vec3 shard = mix(vec3(0.416, 0.361, 0.302), vec3(0.749, 0.663, 0.545), h);
    return mix(worldPlate(p, t), shard, cFill(d) * 0.85);
  }`, "warShatter(p, t)");

export const CUT_SHADERS = [
  worldPlate, worldHatch, castSkin, castCloth, castInk,
  fxEnergy, fxImpact, fxLetter, occludeSeal, occludeInvert,
  gradePrint, gradeNight,
  susanooBlue, bloodMoon, tengaiMeteor, warSky, crackedEarth, limboThread, skyTear, warShatter,
];
export const CUT_SHADER_COUNT = 20;
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`p-caustic cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default CUT_SHADERS;
