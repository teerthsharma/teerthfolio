// Shaders for pr-triton-kernels-22: JJK Malevolent Shrine (MAPPA). Picture uv (x 0..1, y up) unless a module says full frame.
import { defineCut } from "../kit.glsl.js";

const F = "pr-triton-kernels-22";
const SUIT = ["pr-triton-kernels-22"];
const T = (name, doc, glsl, call, meta, demo) => ({ ...defineCut(name, F, doc, glsl, call), suits: SUIT, ...meta, ...(demo ? { demo } : {}) });
const PIC = (fn) => `vec3 demo(vec2 p, float t){ vec2 f = vec2(p.x / uAspect, p.y); return cCap(tkBars(${fn}(tkPic(f), t), f)); }`;
const FULL = (fn) => `vec3 demo(vec2 p, float t){ return ${fn}(vec2(p.x / uAspect, p.y), t); }`;
const KD = ["cutKit", "tkKit"];

export const tkKit = T("tkKit", "shared constants, frame clock and SDF helpers for the Malevolent Shrine dock",
  `uniform float uTkSeed;
  uniform float uTkBar;
  const vec3 TK_INK = vec3(0.0549, 0.0431, 0.0510);
  const vec3 TK_SKY = vec3(0.0275, 0.0196, 0.0235);
  const vec3 TK_CORE = vec3(0.9373, 0.9137, 0.8471);
  const float TK_AR = 2.39;
  const float TK_WL = 0.38;
  const float TK_HZ = 0.39;
  const vec2 TK_SEAL = vec2(0.0, 0.42);
  float tkFrame(float t) { return floor(t * 12.0 + 0.0001); }
  float tkBiteK(float t) { return floor(t * 24.0 + 0.0001) - 326.0; }
  vec2 tkM(vec2 p) { return vec2((p.x - 0.5) * TK_AR, p.y); }
  vec2 tkPic(vec2 f) { return vec2(f.x, (f.y - uTkBar) / (1.0 - 2.0 * uTkBar)); }
  float tkRnd(float n, float k) { return cH21(vec2(n * 1.731 + uTkSeed, k * 3.17 + 0.5)); }
  float tkSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
  float tkBox(vec2 p, vec2 b, float r) { vec2 d = abs(p) - b + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }
  vec3 tkBars(vec3 c, vec2 f) { float inside = step(uTkBar, f.y) * step(f.y, 1.0 - uTkBar); return mix(TK_INK, c, inside); }`,
  "TK_INK",
  { deps: ["cutKit"], uniforms: () => ({ uTkSeed: { value: 0 }, uTkBar: { value: 0.165 } }), draws: "nothing alone: the ink, sky and core colours, the 12 fps and 24 fps bite clocks, and the box and segment helpers the dock shaders share", use: "noise", params: "uTkSeed picks the random draw; uTkBar is the letterbox bar height as a fraction of frame height (0.165 at 1280x800)" });

export const tkMalevolentSky = T("tkMalevolentSky", "near-black sky laced with ridged red veins in two hard bands, thick at the edges and thin behind the shrine",
  `uniform float uTkVeinGrow;
  float tkVeinField(vec2 m, float ht) {
    vec2 d = vec2(ht * 0.005 * TK_AR, 0.0);
    float r1 = 1.0 - abs(clamp((cFbm(m * vec2(1.6, 2.4) + d + 3.7) - 0.5) * 3.0, -1.0, 1.0));
    float r2 = 1.0 - abs(clamp((cFbm(m * vec2(3.4, 5.0) - d + 9.1) - 0.5) * 3.0, -1.0, 1.0));
    return pow(r1, 22.0) * 0.65 + pow(r2, 22.0) * 0.35;
  }
  vec3 tkMalevolentSky(vec2 p, float t) {
    vec2 m = tkM(p);
    float ht = floor(t * 12.0 + 0.0001) / 12.0;
    float edge = smoothstep(0.10, 0.50, abs(p.x - 0.5));
    float v = tkVeinField(m, ht) * mix(0.7, 1.8, edge) * uTkVeinGrow * smoothstep(TK_HZ, TK_HZ + 0.06, p.y);
    vec3 c = TK_SKY;
    c = mix(c, vec3(0.45, 0.05, 0.10), cAA(v, 0.10));
    return mix(c, vec3(0.784, 0.031, 0.110), cAA(v, 0.34));
  }`,
  "tkMalevolentSky(tkPic(p), t)",
  { deps: KD, uniforms: () => ({ uTkVeinGrow: { value: 1 } }), draws: "a near-black sky crossed by thin crimson veins in two flat bands, heavier at the left and right edges, drifting a little on twos", use: "plate", params: "uTkVeinGrow 0..1 opens the veins (0 at frame 22, 1 at frame 54)" },
  PIC("tkMalevolentSky"));

export const tkTealPillars = T("tkTealPillars", "two tall teal light columns at 0.22 W and 0.78 W with a hard core, bright at the horizon, in three flat bands",
  `uniform float uTkPillarOn;
  float tkPillarE(vec2 p) {
    float sig = 0.0120;
    float e = 0.0;
    for (int i = 0; i < 2; i++) {
      float x0 = i == 0 ? 0.22 : 0.78;
      float dx = p.x - x0;
      e += step(abs(dx), 0.008) + 0.75 * exp(-dx * dx / (2.0 * sig * sig));
    }
    float v = p.y >= TK_HZ ? 1.0 - smoothstep(0.80, 0.83, p.y) : mix(1.0, 0.35, clamp((TK_HZ - p.y) / TK_HZ, 0.0, 1.0));
    return e * v * uTkPillarOn;
  }
  vec3 tkPillarCol(float e, vec3 under) {
    vec3 c = mix(under, vec3(0.098, 0.510, 0.545) * 0.55, cAA(e, 0.10));
    c = mix(c, vec3(0.098, 0.510, 0.545), cAA(e, 0.45));
    return mix(c, vec3(0.416, 0.812, 0.875), cAA(e, 0.95));
  }
  float tkPillarEmit(vec2 p) { return step(0.95, tkPillarE(p)); }
  vec3 tkTealPillars(vec2 p, float t) { return tkPillarCol(tkPillarE(p), TK_SKY); }`,
  "tkTealPillars(tkPic(p), t)",
  { deps: KD, uniforms: () => ({ uTkPillarOn: { value: 1 } }), draws: "two vertical teal light columns standing at the left and right of the frame, each with a pale core, fading up into the sky and down into the water", use: "plate", params: "uTkPillarOn 0..1 switches the columns on (ramp over 3 frames at frame 43); tkPillarEmit gives the core mask for bloom" },
  PIC("tkTealPillars"));

export const tkShrineFront = T("tkShrineFront", "frontal two-tier horned shrine in red cel: lit roof tops, hatched shade, skulls on the eaves, a toothless gate, teal rim from the pillars",
  `uniform float uTkRise;
  uniform float uTkRim;
  float tkTier(vec2 m, float yb, float yt, float hwb, float hwt) {
    float s = clamp((m.y - yb) / (yt - yb), 0.0, 1.0);
    float hw = mix(hwb, hwt, s);
    float ybx = yb + 0.035 * pow(clamp(abs(m.x) / hwb, 0.0, 1.3), 3.0);
    return max(abs(m.x) - hw, max(ybx - m.y, m.y - yt));
  }
  float tkHorn(vec2 m, float x0, float h) {
    float sg = x0 < 0.0 ? -1.0 : 1.0;
    vec2 a = vec2(x0, 0.74), b = vec2(x0 + sg * 0.03, 0.74 + h);
    vec2 pa = m - a, ba = b - a;
    float k = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * k) - mix(0.014, 0.001, k);
  }
  float tkShrineD(vec2 m, out float id) {
    float d = tkBox(m - vec2(0.0, 0.44), vec2(0.28, 0.06), 0.0);
    id = 0.0;
    float d1 = tkTier(m, 0.50, 0.62, 0.3095, 0.22);
    if (d1 < d) { d = d1; id = 1.0; }
    float d2 = tkTier(m, 0.62, 0.74, 0.22, 0.12);
    if (d2 < d) { d = d2; id = 2.0; }
    float dH = 1e3;
    for (int i = 0; i < 6; i++) {
      int j = i < 3 ? i : i - 3;
      float sg = i < 3 ? -1.0 : 1.0;
      dH = min(dH, tkHorn(m, sg * (0.05 + 0.06 * float(j)), 0.13 - 0.025 * float(j)));
    }
    if (dH < d) { d = dH; id = 3.0; }
    return d;
  }
  float tkSkullD(vec2 m, out float eye) {
    float d = 1e3;
    eye = 1e3;
    for (int s = 0; s < 2; s++) {
      float sg = s == 0 ? -1.0 : 1.0;
      for (int k = 0; k < 4; k++) {
        vec2 c = k == 0 ? vec2(0.285, 0.538) : (k == 1 ? vec2(0.205, 0.514) : (k == 2 ? vec2(0.20, 0.658) : vec2(0.115, 0.633)));
        c.x *= sg;
        vec2 l = m - c;
        d = min(d, length(l) - 0.014);
        eye = min(eye, min(length(l - vec2(-0.005, 0.002)), length(l - vec2(0.005, 0.002))) - 0.0035);
      }
    }
    return d;
  }
  vec4 tkShrineRGBA(vec2 p, float t) {
    vec2 m = tkM(p);
    vec2 q = vec2(m.x, m.y + (1.0 - uTkRise) * 0.492);
    float id;
    float d = tkShrineD(q, id);
    float dG = tkBox(q - vec2(0.0, 0.435), vec2(0.203, 0.055), 0.045);
    float dry = step(TK_WL, p.y);
    float a = cFill(d) * dry;
    vec3 cB = vec3(0.314, 0.055, 0.071), cD = vec3(0.231, 0.043, 0.067), cL = vec3(0.773, 0.302, 0.255);
    float sT = id < 1.5 ? (q.y - 0.50) / 0.12 : (q.y - 0.62) / 0.12;
    float roofLit = cAA(sT, 0.55);
    vec3 roof = mix(cD, cL, roofLit);
    roof = mix(roof, TK_INK, cHatch(gl_FragCoord.xy, 6.0) * (1.0 - roofLit) * 0.45);
    float ybx = id < 1.5 ? 0.50 + 0.035 * pow(clamp(abs(q.x) / 0.3095, 0.0, 1.3), 3.0) : 0.62 + 0.035 * pow(clamp(abs(q.x) / 0.22, 0.0, 1.3), 3.0);
    roof = mix(roof, vec3(1.0, 0.604, 0.165), 1.0 - cAA(q.y - ybx, 0.006));
    float rx = abs(q.x) * (1.0 + 0.6 * (q.y - 0.38));
    float rb = cLine(abs(fract(rx / 0.04 + 0.5) - 0.5) * 0.04, 1.5);
    vec3 base = mix(cB, TK_INK, rb * 0.8);
    vec3 horn = mix(cD, cL, cAA(q.y, 0.80));
    vec3 col = id < 0.5 ? base : (id < 2.5 ? roof : horn);
    col = mix(col, TK_INK, cFill(dG));
    col = mix(col, vec3(0.353, 0.039, 0.039), cFill(dG) * cAA(q.y, 0.476));
    float rim = 1.0 - cAA(-d, 0.012);
    col = mix(col, vec3(0.098, 0.510, 0.545), rim * step(0.10, abs(q.x)) * uTkRim * 0.9);
    float eye;
    float ds = tkSkullD(q, eye);
    col = mix(col, vec3(0.690, 0.715, 0.752), cFill(ds));
    col = mix(col, TK_INK, cFill(eye));
    a = max(a, cFill(ds) * dry);
    float ink = cLine(d, 3.5) * dry;
    col = mix(col, TK_INK, ink);
    return vec4(col, max(a, ink));
  }
  vec3 tkShrineFront(vec2 p, float t) { vec4 s = tkShrineRGBA(p, t); return mix(TK_SKY, s.rgb, s.a); }`,
  "tkShrineFront(tkPic(p), t)",
  { deps: KD, uniforms: () => ({ uTkRise: { value: 1 }, uTkRim: { value: 1 } }), draws: "a symmetric red two-tier temple with upturned eaves and a six-horn crown, orange eave undersides, eight skulls, a dark gate in the base and ink outline, standing on the waterline", use: "plate", params: "uTkRise 0..1 lifts it out of the water (frames 33 to 44); uTkRim 0..1 turns the teal rim light on once the pillars are lit" },
  PIC("tkShrineFront"));

export const tkBlackWater = T("tkBlackWater", "black mirror water with flat teal bands, reflecting the shrine and pillars at gain 0.45 fading with depth, rippling on twos",
  `vec3 tkBlackWater(vec2 p, float t) {
    float ht = floor(t * 12.0 + 0.0001) / 12.0;
    float dep = clamp((TK_WL - p.y) / TK_WL, 0.0, 1.0);
    vec3 c = vec3(0.047, 0.118, 0.122);
    float bands = cVn(vec2(p.x * 3.0, p.y * 70.0) + ht * 0.3);
    c = mix(c, vec3(0.067, 0.290, 0.298), cAA(bands, 0.78) * (1.0 - dep * 0.6));
    float rip = (cVn(vec2(p.y * 90.0, ht * 12.0)) - 0.5) * 2.0 * (1.5 / 1280.0);
    vec2 rp = vec2(p.x + rip, 2.0 * TK_WL - p.y);
    float gain = 0.45 * mix(1.0, 0.35, dep);
    vec4 sh = tkShrineRGBA(rp, t);
    c = mix(c, sh.rgb, sh.a * gain);
    return mix(c, tkPillarCol(tkPillarE(rp), c), min(1.0, gain * 2.0));
  }`,
  "tkBlackWater(tkPic(p), t)",
  { deps: [...KD, "tkShrineFront", "tkTealPillars"], draws: "a flat dark teal-black pool with horizontal teal ripple bands and a dimmer upside-down copy of the temple and pillars that jitters sideways on twos", use: "surface", params: "none beyond tkKit; depth fades the reflection from gain 0.45 toward 0.16" },
  PIC("tkBlackWater"));

export const tkMalevolentPlate = T("tkMalevolentPlate", "the whole Malevolent Shrine frame in one plate: veined sky, pillars, temple and mirror water",
  `vec3 tkMalevolentPlate(vec2 p, float t) {
    float isW = 1.0 - cAA(p.y, TK_WL);
    vec3 c = mix(tkMalevolentSky(p, t), tkBlackWater(p, t), isW);
    c = tkPillarCol(tkPillarE(p) * (1.0 - isW), c);
    vec4 s = tkShrineRGBA(p, t);
    return mix(c, s.rgb, s.a);
  }`,
  "tkMalevolentPlate(tkPic(p), t)",
  { deps: [...KD, "tkMalevolentSky", "tkTealPillars", "tkShrineFront", "tkBlackWater"], draws: "a red-veined black sky over black mirror water, a symmetric red horned temple at the waterline with a teal light column on each side and its reflection below", use: "plate", params: "driven by the uniforms of its parts: uTkVeinGrow, uTkPillarOn, uTkRise, uTkRim" },
  PIC("tkMalevolentPlate"));

export const tkIceBlocks = T("tkIceBlocks", "the 55-block causal triangle of ice cubes on the water, scheduled ones edged in domain red, the rest sliding apart and sinking",
  `uniform float uTkSched;
  uniform float uTkSplit;
  uniform float uTkSink;
  vec4 tkIceRGBA(vec2 p, float t) {
    vec2 m = tkM(p);
    vec4 o = vec4(0.0);
    float pitch = 0.0225;
    for (int qi = 9; qi >= 0; qi--) {
      float q = float(qi);
      float yc = 0.215 + q * 0.009;
      float cc = floor(m.x / pitch + q * 0.5 + 0.5);
      if (cc < 0.0 || cc > q) continue;
      float sched = (cc == q || cc == 0.0 || (q >= 4.0 && cc == floor(q * 0.5))) ? 1.0 : 0.0;
      vec2 l = vec2(m.x - (cc - q * 0.5) * pitch, m.y - yc);
      float un = 1.0 - sched;
      float sg = dot(vec2(m.x, yc - 0.26), vec2(-0.7071, 0.7071)) < 0.0 ? -1.0 : 1.0;
      l -= vec2(0.7071, 0.7071) * (0.35 * 0.020 * uTkSplit * sg * un);
      l.y += uTkSink * 0.016 * un;
      float d = tkBox(l - vec2(0.0, -0.002), vec2(0.010, 0.010), 0.0);
      float al = 1.0 - smoothstep(0.7, 1.0, uTkSink * un);
      vec3 ice = mix(vec3(0.416, 0.541, 0.596), vec3(0.859, 0.894, 0.941), cAA(l.y, 0.0));
      vec3 edge = mix(TK_INK, vec3(0.784, 0.031, 0.110), sched * uTkSched);
      vec3 col = mix(ice, edge, cLine(d, 2.0));
      float f = max(cFill(d), cLine(d, 2.0)) * al;
      o.rgb = mix(o.rgb, col, f);
      o.a = max(o.a, f);
    }
    return o;
  }
  vec3 tkIceBlocks(vec2 p, float t) { vec4 s = tkIceRGBA(p, t); return mix(tkMalevolentPlate(p, t), s.rgb, s.a); }`,
  "tkIceBlocks(tkPic(p), t)",
  { deps: [...KD, "tkMalevolentPlate"], uniforms: () => ({ uTkSched: { value: 0 }, uTkSplit: { value: 0 }, uTkSink: { value: 0 } }), draws: "ten rows of small ice cubes in a triangle on the water in front of the temple, pale tops and blue-grey fronts with ink edges", use: "surface", params: "uTkSched 0..1 lights the 25 scheduled cubes' edges red; uTkSplit 0..1 slides the other 30 along one diagonal; uTkSink 0..1 drops and fades them" },
  PIC("tkIceBlocks"));

export const tkJawBite = T("tkJawBite", "two rows of nine rounded ice teeth over a dark throat and maroon gum that open and snap shut",
  `uniform float uTkOpen;
  float tkJawO(float k) { return k < 0.0 ? uTkOpen : (k >= 8.0 ? 0.0 : 1.0 - pow(clamp(k / 7.0, 0.0, 1.0), 3.0)); }
  vec4 tkJawRGBA(vec2 p, float t) {
    vec2 m = tkM(p);
    vec2 ju = vec2((m.x) / 0.9 + 0.5, 0.5 - (m.y - 0.42) / 0.9);
    float o = tkJawO(tkBiteK(t));
    float gap = 0.05 + 0.18 * o;
    float dm = max(abs(ju.x - 0.5) - 0.38, abs(ju.y - 0.5) - gap - 0.12);
    vec3 col = TK_INK;
    float dt = 1e3, lx = 0.0;
    for (int r = 0; r < 2; r++) {
      float s = r == 0 ? -1.0 : 1.0;
      float yb = 0.5 + s * gap;
      float dg = max(abs(ju.x - 0.5) - 0.38, abs(ju.y - (yb + 0.145 * s)) - 0.025);
      col = mix(col, vec3(0.353, 0.039, 0.039), cFill(dg));
      for (int i = 0; i < 9; i++) {
        vec2 l = ju - vec2(0.16 + 0.085 * float(i), yb + 0.06 * s);
        float d = tkBox(l, vec2(0.028, 0.06), 0.012);
        if (d < dt) { dt = d; lx = l.x / 0.028; }
      }
    }
    vec3 tooth = mix(vec3(0.859, 0.894, 0.941), vec3(0.416, 0.541, 0.596), cAA(lx, 0.30));
    col = mix(col, tooth, cFill(dt));
    col = mix(col, TK_INK, cLine(dt, 2.0));
    return vec4(col, max(cFill(dm), cLine(dt, 2.0)));
  }
  vec3 tkJawBite(vec2 p, float t) { vec4 s = tkJawRGBA(p, t); return mix(tkMalevolentPlate(p, t), s.rgb, s.a); }`,
  "tkJawBite(tkPic(p), t)",
  { deps: [...KD, "tkMalevolentPlate"], uniforms: () => ({ uTkOpen: { value: 1 } }), draws: "a toothy maw across the middle of the frame: nine pale rounded teeth above and below a black throat edged in maroon gum, gap wide open or a thin slit when shut", use: "card", params: "uTkOpen 0..1 sets openness before the bite; from frame 163 the bite clock closes it cubic-in and holds it shut" },
  PIC("tkJawBite"));

export const tkSlashField = T("tkSlashField", "eighteen thin cream cut lines that draw on over two frames, hold four and vanish, never touching the seal",
  `vec4 tkSlashRGBA(vec2 p, float t) {
    vec2 m = tkM(p);
    float fr = tkFrame(t);
    vec4 o = vec4(0.0);
    for (int i = 0; i < 18; i++) {
      float fi = float(i);
      float g = floor(fi / 3.0);
      float r3 = mod(fi, 3.0);
      float lf = fr - (97.0 + 11.0 * g + (r3 < 0.5 ? 0.0 : (r3 < 1.5 ? 4.0 : 7.0)));
      if (lf < 0.0 || lf >= 6.0) continue;
      vec2 c = vec2((tkRnd(fi, 1.0) - 0.5) * 1.2, 0.2 + tkRnd(fi, 2.0) * 0.6);
      float len = 0.25 + tkRnd(fi, 3.0) * 0.65;
      float ang = radians(20.0 + 50.0 * tkRnd(fi, 4.0)) * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0);
      vec2 dir = vec2(cos(ang), sin(ang));
      vec2 a = c - dir * len * 0.5, b = c + dir * len * 0.5;
      if (tkSeg(TK_SEAL, a, b) < 0.06) continue;
      float d = tkSeg(m, a, a + (b - a) * clamp((lf + 1.0) / 2.0, 0.0, 1.0));
      float edge = cFill(d - 0.006);
      o.rgb = mix(o.rgb, TK_INK, edge);
      o.rgb = mix(o.rgb, TK_CORE, cFill(d - 0.004));
      o.a = max(o.a, edge);
    }
    return o;
  }
  vec3 tkSlashField(vec2 p, float t) { vec4 s = tkSlashRGBA(p, t); return mix(tkMalevolentPlate(p, t), s.rgb, s.a); }`,
  "tkSlashField(tkPic(p), t)",
  { deps: [...KD, "tkMalevolentPlate"], draws: "straight ruled cream lines with a thin ink edge flash across the picture at alternating 20 to 70 degree angles, three per group, each gone after six frames", use: "line", params: "driven by t only: slash i of group g starts at frame 97 + 11 g + 0, 4 or 7; uTkSeed re-rolls placement" },
  PIC("tkSlashField"));

export const tkCleaveLattice = T("tkCleaveLattice", "two families of straight cream cuts at plus and minus 55 degrees forming a diamond grid over the frame for the bite, cut away around the seal",
  `vec4 tkLatticeRGBA(vec2 p, float t) {
    float k = tkBiteK(t);
    float amp = (k < 0.0 || k > 11.0) ? 0.0 : (k <= 5.0 ? 1.0 : 1.0 - (k - 5.0) / 6.0);
    vec2 m = tkM(p);
    float sp = 0.07 * TK_AR;
    float d1 = abs(fract(dot(m, vec2(-0.8192, 0.5736)) / sp + 0.5) - 0.5) * sp;
    float d2 = abs(fract(dot(m, vec2(0.8192, 0.5736)) / sp + 0.5) - 0.5) * sp;
    float d = min(d1, d2) - 0.003 * amp;
    float keep = cAA(length((m - TK_SEAL) / vec2(0.05, 0.045)) - 1.0, 0.0) * step(0.001, amp);
    float edge = cFill(d - 0.0035) * keep;
    vec3 col = mix(TK_INK, TK_CORE, cFill(d));
    return vec4(col, edge);
  }
  vec3 tkCleaveLattice(vec2 p, float t) { vec4 s = tkLatticeRGBA(p, t); return mix(tkMalevolentPlate(p, t), s.rgb, s.a); }`,
  "tkCleaveLattice(tkPic(p), t)",
  { deps: [...KD, "tkMalevolentPlate"], draws: "a diamond grid of thin cream cuts with ink edges laid over the whole frame, full for six drawings then thinning away, with a clear oval left around the seal", use: "line", params: "driven by t only: on from the bite frame k0 to k5, decays k6 to k11 at 24 fps; line width 1.6 px at full" },
  PIC("tkCleaveLattice"));

export const tkBloodFrame = T("tkBloodFrame", "one flat full-bleed blood-red frame, bars included, with the seal left unpainted inside an ink contour; the plate with bars otherwise",
  `vec3 tkBloodFrame(vec2 f, float t) {
    vec2 u = tkPic(f);
    vec3 base = tkMalevolentPlate(u, t);
    if (abs(tkBiteK(t) - 8.0) > 0.5) return tkBars(base, f);
    float d = length((tkM(u) - TK_SEAL) / vec2(0.05, 0.045)) - 1.0;
    vec3 c = mix(vec3(0.898, 0.078, 0.180), base, cFill(d));
    return mix(c, TK_INK, cLine(d, 2.0));
  }`,
  "tkBloodFrame(p, t)",
  { deps: [...KD, "tkMalevolentPlate"], draws: "the temple plate with ink bars, except on one drawing of the bite where everything including the bars turns saturated crimson around an unpainted seal", use: "screen", params: "full frame uv, not picture uv; driven by t only: red on bite frame k8 (drawing 334 at 24 fps)" },
  FULL("tkBloodFrame"));

export const tkGradeFinal = T("tkGradeFinal", "final grade: luma cap 0.92, red-black shadows and teal-white highlights, ink-floor lift, weighted grain on twos, ink letterbox bars",
  `uniform float uTkSplitTone;
  vec3 tkGradeApply(vec3 c, vec2 f, float t) {
    c = cCap(c);
    float Y = cLuma(c);
    c = mix(c, vec3(Y) * vec3(1.15, 0.90, 0.90), (1.0 - smoothstep(0.04, 0.30, Y)) * 0.40 * uTkSplitTone);
    c = mix(c, vec3(Y) * vec3(0.247, 0.451, 0.471) / 0.409, smoothstep(0.45, 0.85, Y) * 0.45 * uTkSplitTone);
    c = cCap(c);
    Y = cLuma(c);
    c = mix(TK_INK, c, smoothstep(0.035, 0.08, Y));
    float g = cH21(floor(gl_FragCoord.xy) + floor(t * 12.0) * 61.0 + uTkSeed) - 0.5;
    c += 0.03 * g * (1.0 - Y) * smoothstep(0.06, 0.12, Y);
    return cCap(tkBars(c, f));
  }
  vec3 tkGradeFinal(vec2 f, float t) { return tkGradeApply(tkMalevolentPlate(tkPic(f), t), f, t); }`,
  "tkGradeFinal(p, t)",
  { deps: [...KD, "tkMalevolentPlate"], uniforms: () => ({ uTkSplitTone: { value: 1 } }), draws: "the plate pulled to a red-black and teal-white split tone with fine grain, no pure black and nothing above 0.92 luma, framed by two ink bars", use: "grade", params: "full frame uv; uTkSplitTone 0..1 (0 before frame 33, then 1); tkGradeApply(colour, uv, t) grades any colour" },
  FULL("tkGradeFinal"));

export const tkSukunaBody = T("tkSukunaBody", "seal body under the red key and teal rim: grey back, pale flank, cream belly, dark high-collar jacket with a gold button and ink wrist bands",
  `uniform float uTkCastRim;
  vec3 tkSukunaBody(vec2 p, float t) {
    vec2 c = cN(p);
    float lit = cAA(cNdL(p), 0.60);
    float db = length((c - vec2(0.0, -0.18)) / vec2(0.17, 0.20)) - 1.0;
    vec3 fur = mix(mix(vec3(0.188, 0.243, 0.278), vec3(0.561, 0.338, 0.357), lit), mix(vec3(0.30, 0.33, 0.36), vec3(0.827, 0.549, 0.586), lit), cAA(-db, -0.25));
    fur = mix(fur, mix(vec3(0.349, 0.341, 0.294), vec3(0.973, 0.579, 0.544), lit), cFill(db));
    float collar = step(abs(c.x), 0.20) * step(-0.07, c.y) * step(c.y, -0.01 + 0.07 * smoothstep(0.05, 0.20, abs(c.x)));
    float coat = max(step(c.y, -0.07), collar);
    vec3 jacket = mix(vec3(0.09, 0.085, 0.10), vec3(0.18, 0.145, 0.165), lit);
    jacket = mix(jacket, TK_INK, cLine(c.x, 1.5) * step(c.y, -0.07));
    jacket = mix(jacket, vec3(0.788, 0.635, 0.153), cFill(length(c - vec2(0.0, -0.14)) - 0.022));
    vec3 col = mix(fur, jacket, coat);
    for (int s = 0; s < 2; s++) {
      float sg = s == 0 ? -1.0 : 1.0;
      col = mix(col, TK_INK, cFill(length((c - vec2(sg * 0.17, -0.10)) / vec2(0.03, 0.015)) - 1.0));
    }
    col = mix(col, vec3(0.416, 0.812, 0.875), cAA(abs(c.x) / 0.4688, 0.86) * uTkCastRim * lit);
    float hull = length(c) - 0.4688;
    col = mix(col, TK_INK, cLine(hull, 2.5));
    return mix(vec3(0.047, 0.118, 0.122), col, cFill(hull + 0.003));
  }`,
  "tkSukunaBody(p, t)",
  { deps: KD, uniforms: () => ({ uTkCastRim: { value: 1 } }), draws: "a round seal in two-band cel: grey back, pale blue flank, cream belly lit pink from above, a dark collared jacket with one gold button, black wrist bands and an ink outline", use: "surface", params: "cast uv (hero disc centred 0.72, 0.50); uTkCastRim 0..1 adds the teal rim light from the pillars" });

export const tkSukunaFace = T("tkSukunaFace", "the seal's face: two big red slit-pupil eyes with a teal catch-light, a second small pair of red points, cheek stripes and brow chevrons",
  `vec3 tkSukunaFace(vec2 p, float t) {
    vec3 col = tkSukunaBody(p, t);
    vec2 c = cN(p);
    float fr = tkFrame(t);
    float cat = smoothstep(54.0, 66.0, fr);
    float glint = step(60.0, fr) * step(fr, 61.0);
    for (int s = 0; s < 2; s++) {
      float sg = s == 0 ? -1.0 : 1.0;
      vec2 e = c - vec2(sg * 0.11, 0.10);
      col = mix(col, vec3(0.125, 0.137, 0.172), cFill(length(e / vec2(0.045, 0.058)) - 1.0));
      col = mix(col, vec3(0.878, 0.129, 0.122), cFill(length(e / vec2(0.030, 0.040)) - 1.0));
      col = mix(col, TK_INK, cFill(max(abs(e.x) - 0.006, abs(e.y) - 0.032)));
      float cl = cFill(length(e - vec2(-0.012, 0.015)) - 0.0035) * step(54.0, fr);
      col = mix(col, mix(vec3(0.90, 0.78, 0.76), vec3(0.416, 0.812, 0.875), cat), cl);
      col = mix(col, mix(vec3(0.878, 0.129, 0.122), vec3(1.0, 0.54, 0.48), glint), cFill(length(c - vec2(sg * 0.11, 0.025)) - 0.009));
      float marks = min(tkSeg(c, vec2(sg * 0.19, 0.045), vec2(sg * 0.15, 0.040)), tkSeg(c, vec2(sg * 0.19, 0.020), vec2(sg * 0.15, 0.016)));
      marks = min(marks, min(tkSeg(c, vec2(sg * 0.07, 0.185), vec2(sg * 0.115, 0.205)), tkSeg(c, vec2(sg * 0.115, 0.205), vec2(sg * 0.16, 0.185))));
      col = mix(col, TK_INK, cLine(marks, 2.5));
    }
    return col;
  }`,
  "tkSukunaFace(p, t)",
  { deps: [...KD, "tkSukunaBody"], draws: "a seal face with big dark eyes holding a red slit-pupil iris, a tiny teal glint that turns on at frame 54, two small red dots under each eye, two black cheek stripes and a brow chevron", use: "surface", params: "cast uv; driven by t only: catch-light from frame 54 (red-white to teal by 66), second pair glints on frames 60 and 61" });

export const tkSukunaHair = T("tkSukunaHair", "five spiky swept-back pink hair clumps over the seal's forehead, lit coral on the top side and maroon on the shade side, with ink outlines",
  `vec3 tkSukunaHair(vec2 p, float t) {
    vec3 col = tkSukunaFace(p, t);
    vec2 c = cN(p);
    for (int i = 0; i < 5; i++) {
      float a = radians(-50.0 + 25.0 * float(i));
      vec2 b = vec2(sin(a) * 0.33, 0.10 + cos(a) * 0.33);
      vec2 dir = normalize(vec2(sin(a) * 0.7 + 0.35, cos(a)));
      float len = 0.10 + 0.04 * tkRnd(float(i), 5.0);
      vec2 pa = c - b;
      float k = clamp(dot(pa, dir) / len, 0.0, 1.0);
      float d = length(pa - dir * len * k) - mix(0.035, 0.002, k);
      float side = dir.x * pa.y - dir.y * pa.x;
      vec3 hair = mix(vec3(0.298, 0.110, 0.122), vec3(0.831, 0.298, 0.365), cAA(side, 0.0));
      col = mix(col, hair, cFill(d));
      col = mix(col, TK_INK, cLine(d, 2.0));
    }
    return col;
  }`,
  "tkSukunaHair(p, t)",
  { deps: [...KD, "tkSukunaFace"], draws: "a crown of five pointed pink-coral hair spikes sweeping back from the top of the head, each split into a bright coral half and a dark maroon half with a thin ink line", use: "surface", params: "cast uv; uTkSeed varies the spike lengths" });

export const CUT_SHADERS = [
  tkKit, tkMalevolentSky, tkTealPillars, tkShrineFront, tkBlackWater, tkMalevolentPlate, tkIceBlocks, tkJawBite,
  tkSlashField, tkCleaveLattice, tkBloodFrame, tkGradeFinal, tkSukunaBody, tkSukunaFace, tkSukunaHair,
];
export const CUT_SHADER_COUNT = 15;
