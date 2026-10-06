// WORLD / pr-xnnpack-10801 shared pieces: palette, cue timing, the shared uniform block, and the two GLSL chunks every
// dimension material uses (the dune height field, and the GLASS pass that wipes the dimension in, cracks it, and drops it).
//
// THE LOOK (bible 2, PROTECTED Aizen): near-monochrome. Paper #f4f4f0, ink #080a0f, grey #aab1bf, ONE cold blue #3d7fc4 /
// #5fb6ff / #d8ecff. Hard two-band shading, shadow edges hard, no gradients, no fog, no lifted blacks. The far field is black:
// the pocket owns its fog and background (index.js nulls the island fog and sets a black background).
//
// THE GLASS PASS (glassPass in GLASS below). The dimension is a picture, so it behaves like glass in picture space:
//   cells   c = voronoi(sp * 6.5), sp = gl_FragCoord.xy / uRes.y   (frame height units, y up)  -> shards 5-18 % of the frame
//   build   keep a fragment only when |wp - seal| < uBuild         (an expanding black sphere: the wipe from the pup)
//   hole    open if id < 0.30 and 0.8 * |sp - strike| < 0.6 uHole   (crack 1: a few cells open, then mend)
//   break   gone if 0.6 id + 0.4 |sp - blade| < 1.4 uBreak         (crack 2: the whole picture falls like glass)
//   cracks  radial spokes + the cell borders inside a jagged radius; a line is #d8ecff on dark, #3d7fc4 on white
// An open cell DISCARDS, so what shows through is the island (plate layer 0): the real world behind the picture.
import { Color, Uniform, Vector2, Vector3, Vector4 } from "three";
import { V } from "../../../paint.js";

export const PAL = {
  ink: "#080a0f", paper: "#f4f4f0", grey: "#aab1bf", shade: "#b0b4c0", hatch: "#c8ccd6", far: "#d8d8e0", fold: "#6a6a72",
  blue: "#3d7fc4", blueHi: "#5fb6ff", pale: "#d8ecff", hogyoku: "#8a7bff",
  snow: "#f4f4f0", snowShade: "#aab1bf",
};
export { V };

export const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const clamp01 = (x) => Math.min(1, Math.max(0, x));

// seconds since beat `name` started; before it the bible time `fb` stands in (negative before). A beat of that name wins.
export function since(cue, name, fb) {
  const s = cue.since ? cue.since(name) : Infinity;
  return Number.isFinite(s) ? s : cue.ts - fb;
}

// the bible times (s) used when scene.js has no beat of that name
export const EV = {
  dimension: 2.4,   // the black wipe from the pup: the dimension builds, expanding sphere
  eyes: 3.9,        // easter egg 2: ten white moon-shaped ovals in the glass
  crack: 5.42,      // crack 1 from Ichigo's slash end (frames 130-134), holes, mend over 24 frames
  hat: 5.52,        // easter egg 4: Urahara's hat-and-clogs in a hole
  hogyoku: 6.4,     // easter egg 1: one violet-blue dot at the throne top for 1 frame
  gap: 8.4,         // the 32 MiB gap lights cold blue along the dais foot
  snap: 9.58,       // Kyoka Suigetsu snaps (frame 230): the crack runs out from the blade, the palace wobbles
  break: 9.7,       // the dimension falls like glass (shards fall frames 233-262)
};

// ONE uniform block shared by every dimension material (same Uniform objects, so one write updates all of them)
export function makeU(ctx) {
  return {
    uRes: ctx.engine.shared.uRes,
    uSeal: new Uniform(new Vector3()),
    uBuild: new Uniform(0),
    uHole: new Uniform(0), uBreak: new Uniform(0), uEyes: new Uniform(0), uHat: new Uniform(0), uGlassOn: new Uniform(0),
    uC1: new Uniform(new Vector4(0.6, 0.5, 0, 0)),   // crack 1: xy strike (u,v of frame), z radius, w alpha
    uC2: new Uniform(new Vector4(0.5, 0.55, 0, 0)),  // crack 2: the blade
    uGap: new Uniform(0), uGround: new Uniform(0), uT: new Uniform(0), uWob: new Uniform(0), uCenter: new Uniform(new Vector2()),
  };
}
export const UNIFORM_DECL = `uniform vec2 uRes; uniform vec3 uSeal; uniform float uBuild; uniform float uHole; uniform float uBreak;
  uniform float uEyes; uniform float uHat; uniform float uGlassOn; uniform vec4 uC1; uniform vec4 uC2; uniform float uGap;
  uniform float uGround; uniform float uT; uniform float uWob; uniform vec2 uCenter;`;

// vertex-safe value noise (tools/noise.js uses fwidth in aaf(), which a vertex shader cannot compile)
export const VNOISE = /* glsl */ `
  float vh(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnz(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(vh(i), vh(i + vec2(1.0, 0.0)), f.x), mix(vh(i + vec2(0.0, 1.0)), vh(i + vec2(1.0, 1.0)), f.x), f.y); }
  float rdg(vec2 p) { float a = 0.5, s = 0.0; mat2 R = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) { s += a * (1.0 - abs(2.0 * vnz(p) - 1.0)); p = R * p; a *= 0.5; } return s; }`;

// the dune height field (metres). Dunes 2-6 m, spacing 30-80 m; flat (h = 0) around the throne so the dais sits level,
// and faded out past 220 m so the apron beyond the plane is flat and seamless.
//   fl(r) = smoothstep(16, 46, r) (1 - smoothstep(220, 295, r)),  r = |p - c|
//   h = fl ( 4.2 r1^2 + 1.3 r2 ),  r1 = rdg(0.02 p + 0.3 vnz(0.06 p)),  r2 = rdg(0.047 p + 9)
export const HEIGHT = /* glsl */ `
  ${VNOISE}
  float duneH(vec2 p, vec2 c) {
    float r = length(p - c);
    float fl = smoothstep(16.0, 46.0, r) * (1.0 - smoothstep(220.0, 295.0, r));
    vec2 q = p * 0.02;
    float r1 = rdg(q + 0.3 * vec2(vnz(q * 3.0), vnz(q * 3.0 + 5.0)));
    float r2 = rdg(p * 0.047 + 9.0);
    return fl * (4.2 * r1 * r1 + 1.3 * r2);
  }`;

const f4 = (x) => x.toFixed(4);
export const GLASS = /* glsl */ `
  ${UNIFORM_DECL}
  const vec3 GX_INK = ${V(PAL.ink)}; const vec3 GX_PAPER = ${V(PAL.paper)};
  const vec3 GX_PALE = ${V(PAL.pale)}; const vec3 GX_BLUE = ${V(PAL.blue)};
  float gxh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float gxn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(gxh(i), gxh(i + vec2(1.0, 0.0)), f.x), mix(gxh(i + vec2(0.0, 1.0)), gxh(i + vec2(1.0, 1.0)), f.x), f.y); }
  // (F1, F2 - F1, id of the nearest cell): F2 - F1 ~ 0 on the borders = the crack network
  vec3 gxcell(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0, id = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(gxh(i + g), gxh(i + g + 17.3)); float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; id = gxh(i + g + 5.1); } else if (d < d2) d2 = d; }
    return vec3(d1, d2 - d1, id); }
  float gxline(float f12) { return 1.0 - smoothstep(0.0, 1.5 * fwidth(f12) + 1e-4, f12); }   // 1.5 px
  // crack web from a strike: spokes (a = angle * 11 / tau, jittered by the radius) and the cell borders, inside a jagged radius
  float gxcrack(vec2 sp, vec4 C, vec3 cell, float asp) {
    if (C.w <= 0.001) return 0.0;
    vec2 d = sp - vec2(C.x * asp, C.y); float r = length(d), ang = atan(d.y, d.x);
    float reach = C.z * (0.75 + 0.5 * gxn(vec2(ang * 2.0, 3.0)));
    float within = 1.0 - smoothstep(reach - 0.03, reach, r);
    float a = ang / 6.28318 * 11.0, ai = floor(a);
    float qa = fract(a + 0.25 * gxn(vec2(r * 6.0, ai))), dq = min(qa, 1.0 - qa);
    float spoke = (1.0 - smoothstep(0.0, 1.5 * fwidth(dq) + 1e-4, dq)) * step(0.35, gxh(vec2(ai, 4.0)))
                * (1.0 - smoothstep(reach * (0.4 + 0.5 * gxh(vec2(ai, 9.0))), reach, r));
    return within * max(gxline(cell.y) * 0.9, spoke) * C.w;
  }
  // easter egg 4: Urahara's striped bucket hat and geta, black, seen in a hole
  bool gxhat(vec2 sp, vec2 pc) {
    vec2 q = sp - pc;
    bool brim = (q.x * q.x) / (0.075 * 0.075) + (q.y * q.y) / (0.014 * 0.014) < 1.0;
    bool crown = q.y > 0.0 && q.y < 0.055 && abs(q.x) < 0.04 - 0.25 * q.y;
    bool geta = q.y < -0.07 && q.y > -0.095 && (abs(abs(q.x) - 0.03) < 0.016);
    return brim || crown || geta;
  }
  // easter egg 2: ten white moon-shaped ovals (the TYBW opening frame): 5 x 2, each with a crescent bite
  bool gxeyes(vec2 sp, float asp, float k) {
    float sx = 0.13 * min(1.0, asp / 1.5);
    for (int i = 0; i < 10; i++) {
      float cx = float(i - 5 * (i / 5)), ry = float(i / 5);
      vec2 c = vec2(asp * 0.5 + (cx - 2.0) * sx, 0.84 - ry * 0.16), q = sp - c;
      float lid = 0.05 * k;
      bool oval = (q.x * q.x) / (0.03 * 0.03) + (q.y * q.y) / (lid * lid + 1e-6) < 1.0;
      vec2 b = q - vec2(0.012, 0.01);
      bool bite = (b.x * b.x) / (0.026 * 0.026) + (b.y * b.y) / (lid * lid * 0.7 + 1e-6) < 1.0;
      if (oval && !bite) return true;
    }
    return false;
  }
  // the pass: wipe in, eyes, holes (the island shows through), cracks, fall. wp = the fragment's world position.
  vec3 glassPass(vec3 col, vec3 wp) {
    float dB = length(wp - uSeal);
    if (dB > uBuild) discard;
    col = mix(col, GX_INK, 1.0 - smoothstep(0.0, 1.4 + 0.012 * uBuild, uBuild - dB));   // the frontier is an ink ring
    if (uGlassOn < 0.5) return col;
    float asp = uRes.x / uRes.y; vec2 sp = gl_FragCoord.xy / uRes.y;
    vec3 c = gxcell(sp * 6.5);
    if (uEyes > 0.001 && gxeyes(sp, asp, uEyes)) return GX_PAPER;
    vec2 s1 = vec2(uC1.x * asp, uC1.y);
    bool open = c.z < 0.30 && 0.8 * length(sp - s1) < 0.6 * uHole && uHole > 0.001;
    if (uHat > 0.5) {
      vec2 pc = s1 + vec2(0.06, 0.03);
      vec3 hc = gxcell(pc * 6.5);
      if (abs(c.z - hc.z) < 1e-5) { if (gxhat(sp, pc)) return GX_INK; discard; }   // that cell is forced open
    }
    vec2 s2 = vec2(uC2.x * asp, uC2.y);
    bool gone = uBreak > 0.001 && (0.6 * c.z + 0.4 * length(sp - s2)) < uBreak * 1.4;
    if (open || gone) discard;
    float lm = max(gxcrack(sp, uC1, c, asp), gxcrack(sp, uC2, c, asp));
    float tone = dot(col, vec3(0.3, 0.6, 0.1));
    col = mix(col, tone > 0.4 ? GX_BLUE : GX_PALE, lm);
    return col;
  }`;

// per-frame driver: writes every cue-driven uniform from the clock (pure function of cue.ts, so scrub == play)
export function driveU(U, ctx, cue) {
  const ts = cue.ts;
  const s = ctx.seal;
  U.uSeal.value.set(s.at[0], s.at[1], s.at[2]);
  U.uT.value = ts;
  // build: R(s) = 520 (1 - (1 - s/0.9)^3), from the beat `dimension`; the wipe is the dimension arriving
  const sd = since(cue, "dimension", EV.dimension);
  U.uBuild.value = sd <= 0 ? 0 : 520 * (1 - Math.pow(1 - clamp01(sd / 0.9), 3));
  // crack 1: ones for 2 frames (hold 4 frames of growth), then twos; holes open 0.17 s, mend over 1 s (24 frames)
  const sc = since(cue, "crack", EV.crack);
  const at1 = cue.arg ? cue.arg("crack", "at", [0.62, 0.52]) : [0.62, 0.52];
  let hole = 0, ca = 0, cr = 0;
  if (sc >= 0) {
    hole = sc < 0.17 ? sc / 0.17 : sc < 0.25 ? 1 : Math.max(0, 1 - (sc - 0.25) / 1.0);
    cr = 1.6 * (1 - Math.pow(1 - clamp01(sc / 0.2), 3));
    ca = 1 - sm((sc - 1.1) / 0.4);
  }
  U.uHole.value = hole;
  U.uC1.value.set(at1[0], at1[1], cr, sc >= 0 ? ca : 0);
  // crack 2: from the blade at the snap; shards fall from the break
  const sn = since(cue, "snap", EV.snap);
  const at2 = cue.arg ? cue.arg("snap", "at", [0.5, 0.55]) : [0.5, 0.55];
  U.uC2.value.set(at2[0], at2[1], sn < 0 ? 0 : 2.4 * (1 - Math.pow(1 - clamp01(sn / 0.6), 3)), sn < 0 ? 0 : 1);
  const sb = since(cue, "break", EV.break);
  U.uBreak.value = sb <= 0 ? 0 : clamp01(sb / 1.25);
  U.uWob.value = sn < 0 ? 0 : Math.sin(clamp01(sn / 1.6) * Math.PI);   // heat-wave wobble, a bell over 1.6 s
  const she = since(cue, "eyes", EV.eyes), sh = since(cue, "hat", EV.hat);
  U.uEyes.value = she < 0 || she > 0.4 ? 0 : Math.sin(clamp01(she / 0.4) * Math.PI);
  U.uHat.value = sh >= 0 && sh < 0.3 ? 1 : 0;
  const sg = since(cue, "gap", EV.gap);
  U.uGap.value = sg < 0 || sb > 0.2 ? 0 : sm(sg / 0.8);
  U.uGlassOn.value = (U.uEyes.value > 0 || hole > 0 || ca > 0 || U.uC2.value.w > 0 || U.uBreak.value > 0 || U.uHat.value > 0) ? 1 : 0;
}

export const col3 = (hex) => new Color(hex);
export { f4 };
