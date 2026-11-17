// tkGatePlate: the Malevolent Shrine as a two-tier red pagoda with a toothed gate (horn crown, skulls, orange eaves), its mirror water and sky, in one plate. The dock table's shrine is a flat box under a teeth card.
import { defineCut } from "../kit.glsl.js";

const KD = ["cutKit", "tkKit"];

export const tkGatePlate = {
  ...defineCut(
    "tkGatePlate",
    "pr-triton-kernels-22",
    "red two-tier horned pagoda with nine teeth above and below its gate, skulls on the eaves, standing on black mirror water between two teal columns under a red-veined sky",
    `void tkPart(inout vec3 col, inout float a, float d, vec3 fill, float ink) {
    float f = cFill(d);
    col = mix(col, fill, f);
    a = max(a, f);
    float l = cLine(d, ink);
    col = mix(col, TK_INK, l);
    a = max(a, l);
  }
  float tkTrap(vec2 m, float yb, float yt, float hwb, float hwt, float up, out float s) {
    s = clamp((m.y - yb) / (yt - yb), 0.0, 1.0);
    float hw = mix(hwb, hwt, s);
    float ybx = yb + up * pow(clamp(abs(m.x) / hwb, 0.0, 1.3), 3.0);
    return max(abs(m.x) - hw, max(ybx - m.y, m.y - yt));
  }
  float tkHorn2(vec2 m, vec2 a, vec2 b, vec2 c, float w) {
    vec2 pa = m - a, ba = b - a;
    float k = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float d1 = length(pa - ba * k) - mix(w, w * 0.6, k);
    pa = m - b; ba = c - b;
    k = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return min(d1, length(pa - ba * k) - mix(w * 0.6, 0.0015, k));
  }
  vec4 tkGateRGBA(vec2 p, float t) {
    vec2 m = tkM(p);
    vec2 q = vec2(m.x, m.y + (1.0 - uTkRise) * 0.492);
    float dry = step(TK_WL, p.y);
    vec3 col = TK_SKY;
    float a = 0.0;
    vec3 red = vec3(0.784, 0.031, 0.110), redD = vec3(0.45, 0.07, 0.10), roofD = vec3(0.36, 0.07, 0.10), roofL = vec3(0.86, 0.20, 0.15);
    vec3 tealR = vec3(0.098, 0.510, 0.545), amber = vec3(1.0, 0.604, 0.165), bone = vec3(0.690, 0.715, 0.752);
    float s;
    // body wall behind the gate, with rib stripes
    float dW = tkBox(q - vec2(0.0, 0.5325), vec2(0.285, 0.1475), 0.0);
    float rx = abs(q.x) * (1.0 + 1.2 * (q.y - 0.385));
    float rb = cLine(abs(fract(rx / 0.045 + 0.5) - 0.5) * 0.045, 1.6);
    tkPart(col, a, dW, mix(redD, TK_INK, rb * 0.7), 2.5);
    // the gate: a dark throat edged in gum
    float dG = tkBox(q - vec2(0.0, 0.5225), vec2(0.19, 0.1375), 0.012);
    tkPart(col, a, dG, vec3(0.353, 0.039, 0.039), 2.0);
    col = mix(col, TK_INK, cFill(dG + 0.016));
    // teeth: nine above and nine below, the rows closing on the bite clock
    float o = tkJawO(tkBiteK(t));
    float tipU = mix(0.50, 0.62, o), tipL = mix(0.465, 0.425, o);
    float dt = 1e3, lx = 0.0;
    for (int i = 0; i < 9; i++) {
      float cx = (float(i) - 4.0) * 0.0445;
      vec2 lu = q - vec2(cx, tipU + 0.045);
      float tu = clamp((0.045 - lu.y) / 0.09, 0.0, 1.0);
      float du = tkBox(vec2(lu.x / (1.0 - 0.5 * tu), lu.y), vec2(0.0175, 0.045), 0.012);
      if (du < dt) { dt = du; lx = lu.x / 0.0175; }
      vec2 ll = q - vec2(cx, tipL - 0.04);
      float tl = clamp((ll.y + 0.04) / 0.08, 0.0, 1.0);
      float dl = tkBox(vec2(ll.x / (1.0 - 0.5 * tl), ll.y), vec2(0.0175, 0.04), 0.012);
      if (dl < dt) { dt = dl; lx = ll.x / 0.0175; }
    }
    float gumU = tkBox(q - vec2(0.0, 0.66 - 0.5 * (0.66 - tipU - 0.04)), vec2(0.185, 0.5 * (0.66 - tipU - 0.04)), 0.0);
    col = mix(col, vec3(0.353, 0.039, 0.039), cFill(gumU) * cFill(dG + 0.004));
    vec3 tooth = mix(vec3(0.859, 0.894, 0.941), vec3(0.416, 0.541, 0.596), cAA(lx, 0.30));
    float inG = cFill(dG + 0.004);
    col = mix(col, tooth, cFill(dt) * inG);
    col = mix(col, TK_INK, cLine(dt, 2.0) * inG);
    // gate pillars with an amber band
    for (int i = 0; i < 2; i++) {
      float sg = i == 0 ? -1.0 : 1.0;
      float dp = tkBox(q - vec2(sg * 0.208, 0.5325), vec2(0.0175, 0.1475), 0.0);
      vec3 pc = mix(vec3(0.50, 0.04, 0.07), red, cAA(-sg * (q.x - sg * 0.208), -0.002));
      pc = mix(pc, amber, cFill(abs(q.y - 0.625) - 0.004) * 0.8);
      tkPart(col, a, dp, pc, 2.5);
    }
    // lintel, then the lower tier roof with upturned eaves
    float dL = tkBox(q - vec2(0.0, 0.6675), vec2(0.265, 0.0125), 0.0);
    tkPart(col, a, dL, mix(roofD, amber, cFill(abs(q.y - 0.658) - 0.003)), 2.5);
    float d1 = tkTrap(q, 0.68, 0.75, 0.32, 0.20, 0.07, s);
    float lit1 = cAA(s, 0.55);
    vec3 r1 = mix(roofD, roofL, lit1);
    r1 = mix(r1, TK_INK, cHatch(gl_FragCoord.xy, 6.0) * (1.0 - lit1) * 0.45);
    float yb1 = 0.68 + 0.07 * pow(clamp(abs(q.x) / 0.32, 0.0, 1.3), 3.0);
    r1 = mix(r1, amber, 1.0 - cAA(q.y - yb1, 0.013));
    tkPart(col, a, d1, r1, 3.5);
    // upper tier wall and roof
    float d2w = tkBox(q - vec2(0.0, 0.7725), vec2(0.14, 0.0225), 0.0);
    tkPart(col, a, d2w, mix(redD, red, cAA(q.y, 0.78)), 2.5);
    float d2 = tkTrap(q, 0.795, 0.845, 0.20, 0.07, 0.05, s);
    float lit2 = cAA(s, 0.55);
    vec3 r2 = mix(roofD, roofL, lit2);
    float yb2 = 0.795 + 0.05 * pow(clamp(abs(q.x) / 0.20, 0.0, 1.3), 3.0);
    r2 = mix(r2, amber, 1.0 - cAA(q.y - yb2, 0.011));
    tkPart(col, a, d2, r2, 3.5);
    // six crescent horns
    float dH = 1e3;
    for (int i = 0; i < 6; i++) {
      float sg = i < 3 ? -1.0 : 1.0;
      int j = i < 3 ? i : i - 3;
      float x0 = 0.035 + 0.045 * float(j);
      float h = 0.090 - 0.020 * float(j);
      dH = min(dH, tkHorn2(q, vec2(sg * x0, 0.84), vec2(sg * (x0 + 0.012 + 0.014 * float(j)), 0.84 + h * 0.55), vec2(sg * (x0 + 0.045 + 0.02 * float(j)), 0.84 + h), 0.021));
    }
    tkPart(col, a, dH, mix(roofD, bone, cAA(q.y, 0.862)), 2.5);
    // eight skulls on the eave corners and the lintel ends
    float dS = 1e3, eye = 1e3;
    for (int i = 0; i < 8; i++) {
      float sg = (i & 1) == 0 ? -1.0 : 1.0;
      int k = i / 2;
      vec2 c = k == 0 ? vec2(0.305, 0.722) : (k == 1 ? vec2(0.197, 0.827) : (k == 2 ? vec2(0.262, 0.652) : vec2(0.143, 0.795)));
      c.x *= sg;
      vec2 l = q - c;
      dS = min(dS, length(l) - 0.013);
      eye = min(eye, min(length(l - vec2(-0.005, 0.002)), length(l - vec2(0.005, 0.002))) - 0.0034);
    }
    tkPart(col, a, dS, bone, 2.0);
    col = mix(col, TK_INK, cFill(eye));
    // bone rib arcs along the flanks, two cel bands
    vec2 fl = vec2(abs(q.x) - 0.285, q.y - 0.385);
    float ra = min(abs(length(fl) - 0.07), abs(length(fl) - 0.12)) - 0.004;
    col = mix(col, bone, cFill(ra) * step(0.215, abs(q.x)) * step(q.y, 0.56) * step(0.385, q.y));
    // the waterline lip
    float dP = tkBox(q - vec2(0.0, 0.3825), vec2(0.335, 0.0075), 0.0);
    tkPart(col, a, dP, vec3(0.45, 0.07, 0.10), 2.5);
    float dm = d1;
    vec2 gn = vec2(dFdx(dm), dFdy(dm));
    gn = gn / max(length(gn), 1e-6);
    float rim = (1.0 - cAA(-dm, 0.009)) * smoothstep(0.35, 0.8, gn.x * sign(q.x));
    col = mix(col, tealR, rim * step(0.10, abs(q.x)) * uTkRim * 0.9 * a);
    return vec4(col, a * dry * step(0.002, uTkRise));
  }
  vec3 tkWaterBase(vec2 p, float t) {
    float ht = floor(t * 12.0 + 0.0001) / 12.0;
    float dep = clamp((TK_WL - p.y) / TK_WL, 0.0, 1.0);
    vec3 c = vec3(0.047, 0.118, 0.122);
    float bands = cVn(vec2(p.x * 3.0, p.y * 70.0) + ht * 0.3);
    c = mix(c, vec3(0.067, 0.290, 0.298), cAA(bands, 0.66) * (1.0 - dep * 0.6));
    float b2 = cVn(vec2(p.x * 7.0 + 4.0, p.y * 150.0) - ht * 0.2);
    c = mix(c, vec3(0.098, 0.400, 0.420), cAA(b2, 0.80) * (1.0 - dep * 0.7));
    float ring = abs(length(vec2((p.x - 0.5) * 2.39, (p.y - 0.25) * 6.0)) - fract(ht * 0.35) * 1.2);
    c = mix(c, vec3(0.20, 0.52, 0.56), (1.0 - cAA(ring, 0.004)) * 0.6 * dep);
    return mix(c, vec3(0.30, 0.72, 0.78), (1.0 - cAA(abs(p.y - TK_WL + 0.002), 0.003)) * 0.9);
  }
  vec3 tkGateWater(vec2 p, float t) {
    float ht = floor(t * 12.0 + 0.0001) / 12.0;
    float dep = clamp((TK_WL - p.y) / TK_WL, 0.0, 1.0);
    vec3 c = tkWaterBase(p, t);
    float rip = (cVn(vec2(p.y * 90.0, ht * 12.0)) - 0.5) * 2.0 * (1.5 / 1280.0);
    vec2 rp = vec2(p.x + rip, 2.0 * TK_WL - p.y);
    float gain = 0.45 * mix(1.0, 0.35, dep);
    vec4 sh = tkGateRGBA(rp, t);
    c = mix(c, sh.rgb, sh.a * gain);
    return mix(c, tkPillarCol(tkPillarE(rp), c), min(1.0, gain * 2.0));
  }
  vec3 tkGatePlate(vec2 p, float t) {
    float isW = 1.0 - cAA(p.y, TK_WL);
    vec3 c = mix(tkMalevolentSky(p, t), tkGateWater(p, t), isW);
    c = tkPillarCol(tkPillarE(p) * (1.0 - isW), c);
    vec4 s = tkGateRGBA(p, t);
    return mix(c, s.rgb, s.a);
  }`,
    "tkGatePlate(tkPic(p), t)",
  ),
  deps: [...KD, "tkMalevolentSky", "tkTealPillars", "tkShrineFront", "tkJawBite"],
  suits: ["pr-triton-kernels-22"],
  draws: "a red two-tier horned pagoda with a dark gate holding nine teeth above and nine below, skulls on the eaves, amber eave glints, standing on black mirror water between two teal light columns under a red-veined black sky",
  use: "plate",
  params: "uTkVeinGrow, uTkPillarOn, uTkRise, uTkRim as the table plate; uTkOpen sets the jaws before the bite, the bite clock closes them from frame 163",
};

export default [tkGatePlate];
