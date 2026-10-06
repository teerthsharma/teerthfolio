// p-monodromy WORLD: shared palette, timeline (every world state is a PURE FUNCTION of t, so scrubbing equals playing), the GLSL prelude
// every world material carries, and geometry helpers.
// Layout (metres): seal at the origin facing +z (the lens). Terrace quay 22 x 24 m centred on the origin, deck at y 0, sea at y -1.2.
// The palace stands on its cliff at z -96 (bible 3.3), the aqueduct runs along its foot, dhows sit out on the sea.
//
// WORLD STATES (uniform, shared by every material):
//   uStorm   0 day .. 1 storm       Sindria daylight -> monochrome cyan-blue (bible 2, COMPOSITING: storm half is nearly one hue).
//   uViolet  0..1                   the bruise-violet #2b2a6b band low at the strike sky (Focalor cue) and the crowd-duck violet.
//   uStrike  0..1                   Baararaq Saiqa light wash on the terrace: grow 0.2 s, hold 0.5, fade 0.4.
//   uFlash   0/1                    the six sky flashes, 4 frames each, additive #cfe6ff 22%.
//   uFoldA   0..1                   world-fold: the island folds like a book about the x=0 seam (shots 5-6) and unfolds (shot 7).
//   uReveal  0..1                   the 6-frame match dissolve from the dock into Sindria (shot 1).
//   uTw      stepped world time     freezes while the world is frozen (8.4 .. reassembly), advances on threes elsewhere.
//
// MATHS shared by every material:
//   toon:   v = N.L. Three flat bands: v > 0.30 lit (base * (1.07, 1.03, 0.95)), v > -0.05 mid (base), else shadow. The shadow hue rule
//           (bible 2): shadow = desaturate(base, -10%) * 0.65, pulled 28% toward blue-violet #5a3fa0; a deeper step below v < -0.55.
//   storm:  mono(l) = ramp4(l, #0b2a55, #1c6486, #3aa8c8, #cfe6ff) on the luma l; c = mix(c, mono, uStorm (1 - keep)). `keep` is 1 on
//           the warm accents (gold circlet/finials, red sash/pennant tassels) which the storm half keeps (bible 2, grade).
//   dissolve: f(P) = 0.6 fbm(P.xz 0.35) + 0.4 clamp(|P.xz| / 140) + 0.2 P.y/40; a fragment with f < 1.1 uReveal - 0.05 is discarded; the
//           next 0.04 of f is a hard gold edge #f2c14a.
//   fold:   theta = 1.25 uFoldA; a = |x|; a1 = min(a, 30) + 0.2 max(a - 30, 0); x' = sign(x) a1 cos(theta), y' = y + a1 sin(theta).
//           Both halves swing up about the x=0 seam like a closing book; beyond 30 m the world trails at 20% so nothing shoots away.
import { BufferAttribute, Color, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { V } from "../../../paint.js";
import { surface } from "../../../kit/surface.js";

export { V };
const H = (h) => new Color(h);

// bible hexes (section 2, STYLE LAW)
export const C = {
  seaA: "#0a7fb4", seaB: "#0b5f9a", foam: "#e8f6ff", seaStreak: "#bff4ff",
  cliff: "#b08560", stoneLit: "#e6b680", stoneMid: "#c4864f", stoneSh: "#8a5a4a", stoneDeep: "#5a3a48",
  marbleLit: "#fff4de", marbleMid: "#f0dfc0", marbleSh: "#b4a4c4", marbleDeep: "#7c6a9a", wallSh: "#b4a4c4",
  domeTeal: "#3aa8a0", domeTealSh: "#1f6e78", domeBlue: "#4a78c8", gold: "#e0a830", goldLit: "#f2c14a", goldHi: "#fff6c2", goldSh: "#a8741a",
  window: "#1e2a58", pennant: "#2aa05a",
  tileTeal: "#0f8f8a", tileCream: "#f6ead2", tileGold: "#e9b23a", tileCrimson: "#b8274c",
  terrLit: "#6fb04a", terrMid: "#7aa63c", terrDeep: "#4e7a2c",
  foliageLit: "#8fd04a", foliageMid: "#2c9a5b", foliageSh: "#14603c", foliageDeep: "#0a3a2a", trunk: "#6a4a2a",
  hull: "#6a3a2a", sailCream: "#fff3d6", sailViolet: "#b4aacb",
  lantern: "#ffb347", navy: "#0b2a55", deepNavy: "#0e1650", stormMid: "#1f2a78", stormHorizon: "#3a4aa8", rim: "#7fc8ff", bruise: "#2b2a6b",
  dayZenith: "#1b57c8", dayMid: "#3f8ee8", dayHorizon: "#bfe6ff", cumLit: "#ffffff", cumShade: "#8fb4e8",
  stormZenith: "#0a0f3a", flash: "#cfe6ff", violet: "#5a3fa0",
};
export const ROBES = ["#fff3d6", "#1fbdb4", "#e4566a", "#f2b52e", "#ffffff", "#7d4fc4"]; // dhow sail tints (bible 3.7)
export const SUN = new Vector3(-0.5, 0.72, 0.46).normalize(); // direction TO the sun: top-left, a little toward the lens
export const PALACE_Z = -96;

export const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ---- the timeline: beats by name from scene.beats, bible timings as defaults ------------------------------------------------------
// Cue names (bible 5): "dissolve" (dock -> Sindria), "storm" (sky ramps, default 1.9 s, 4.5 s), "violet" (bruise band 4.9, 1.5 s),
// "flash" (one beat per flash; defaults 3.35 3.95 4.9 5.35 5.8 6.1), "strike" (6.4), "freeze" (8.4: the world stops), "fold" (8.4),
// "reassemble" (land 9.7 = F+1.3, locked 10.5 = F+2.1).
export function timeline(scene) {
  const beats = scene.beats ?? [];
  const all = (n) => beats.filter((b) => b.name === n);
  const one = (n, t, d) => { const b = all(n)[0]; return [b?.t ?? t, b?.dur ?? d]; };
  const DIS = one("dissolve", 0, 0.25), STM = one("storm", 1.9, 4.5), VIO = one("violet", 4.9, 1.5), STR = one("strike", 6.4, 1.1);
  const FRZ = one("freeze", 8.4, 1.3), FLD = one("fold", 8.4, 1.0), REA = one("reassemble", 9.7, 0.8);
  const fl = all("flash").map((b) => b.t), FLASH = fl.length ? fl : [3.35, 3.95, 4.9, 5.35, 5.8, 6.1];
  return (t) => {
    const reaK = clamp01((t - REA[0]) / REA[1]);
    const storm = smooth((t - STM[0]) / STM[1]) * (1 - smooth(reaK));
    const violet = smooth((t - VIO[0]) / VIO[1]) * (1 - smooth((t - (STR[0] + 0.9)) / 0.6)) + smooth((t - (STR[0] + 0.9)) / 0.4) * (1 - smooth(reaK)) * 0.5;
    const s = t - STR[0];
    const strike = s < 0 ? 0 : smooth(s / 0.2) * (1 - smooth((s - 0.7) / 0.4));
    let flash = 0; for (const f of FLASH) if (t >= f && t < f + 4 / 24) flash = 1;
    const fold = smooth((t - FLD[0]) / FLD[1]) * (1 - smooth(reaK));
    // frozen from `freeze` until the island lands again: world time stands still (sea, flags, boats, steam)
    const tw = t < FRZ[0] ? t : t < REA[0] ? FRZ[0] : t;
    return { storm, violet: Math.min(1, violet), strike, flash, fold, reveal: smooth((t - DIS[0]) / DIS[1]), tw, frozen: t >= FRZ[0] && t < REA[0] + REA[1] * 0.2, folded: fold > 0.003,
      dynamic: t < DIS[0] + DIS[1] + 0.02 || (t > STM[0] - 0.05 && t < REA[0] + REA[1] + 0.1) };
  };
}

export function makeU() {
  return { uStorm: { value: 0 }, uViolet: { value: 0 }, uStrike: { value: 0 }, uFlash: { value: 0 }, uFoldA: { value: 0 }, uReveal: { value: 1 }, uTw: { value: 0 } };
}

// ---- GLSL prelude ----------------------------------------------------------------------------------------------------------------
export const PRE = /* glsl */ `
  uniform float uStorm; uniform float uViolet; uniform float uStrike; uniform float uFlash; uniform float uFoldA; uniform float uReveal; uniform float uTw;
  float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  vec3 keyDir() { return normalize(uLightDir); }
  // the 3-band cel with the shadow-hue rule (see header)
  vec3 toon(vec3 base, float v, float deepAt) {
    vec3 gry = vec3(lum(base));
    vec3 sh = mix(gry, base, 1.1) * 0.65; sh = mix(sh, ${V(C.violet)} * 0.55, 0.28);
    vec3 deep = sh * 0.62;
    vec3 lit = base * vec3(1.07, 1.03, 0.95);
    vec3 c = mix(sh, base, celStep(v, -0.05));
    c = mix(c, lit, celStep(v, 0.30));
    return mix(deep, c, celStep(v, deepAt));
  }
  // storm half: one hue (cyan-blue) with a white-hot top; keep = 1 leaves a warm accent alone
  vec3 stormMono(vec3 c, float keep) {
    float l = clamp(lum(c) * 1.2, 0.0, 1.0);
    vec3 m = ramp4(l, ${V(C.navy)}, ${V("#1c6486")}, ${V("#3aa8c8")}, ${V(C.flash)});
    return mix(c, m, uStorm * (1.0 - keep));
  }
  // the day->storm light: warm key lowers into a cool, the flash and strike washes are hard-edged additions
  vec3 finishW(vec3 c, vec3 P, float keep) {
    c = stormMono(c, keep);
    c += ${V(C.flash)} * 0.22 * uFlash;
    return c;
  }
  // the dock->Sindria match dissolve: discards, returns the gold edge amount
  float revealEdge(vec3 P) {
    if (uReveal >= 0.999) return 0.0;
    float f = 0.6 * fbm(P.xz * 0.35 + 3.0) + 0.4 * clamp(length(P.xz) / 140.0, 0.0, 1.0) + 0.2 * clamp(P.y / 40.0, 0.0, 1.0);
    float d = uReveal * 1.1 - 0.05;
    if (f < d) discard;
    return 1.0 - smoothstep(d, d + 0.04, f);
  }
  vec3 withEdge(vec3 c, float e) { return mix(c, ${V(C.goldLit)} * 1.6, e); }
`;

// vertex fold (see header) + per-vertex colour
export const FOLD_VERT = /* glsl */ `
  vC4 = aC;
  if (uFoldA > 0.0) {
    float th = 1.25 * uFoldA, a = abs(p.x), a1 = min(a, 30.0) + 0.2 * max(a - 30.0, 0.0);
    p = vec3(sign(p.x) * a1 * cos(th), p.y + a1 * sin(th), p.z);
  }`;

// a world material: `body` defines `vec3 shade(vec3 P, vec3 N, vec3 V)`. Uses vC4 (rgb linear colour, w = material class) from attribute aC.
export function mat(ctx, U, body, o = {}) {
  return surface(ctx.engine.shared, PRE + body, {
    tools: ["noise", "cel"], uniforms: { ...U, ...(o.uniforms ?? {}) }, id: o.id ?? 0.5, side: o.side,
    attrs: "uniform float uFoldA; attribute vec4 aC; varying vec4 vC4;", varyings: "varying vec4 vC4;", vert: FOLD_VERT + (o.vert ?? ""),
  });
}

// ---- geometry helpers ------------------------------------------------------------------------------------------------------------
// colour a geometry: per-vertex aC = (linear rgb, class k)
export function part(geo, hex, k = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute("uv", new BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  for (const n of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(n)) g.deleteAttribute(n);
  const c = H(hex), N = g.attributes.position.count, a = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { a[i * 4] = c.r; a[i * 4 + 1] = c.g; a[i * 4 + 2] = c.b; a[i * 4 + 3] = k; }
  g.setAttribute("aC", new BufferAttribute(a, 4));
  return g;
}
export const place = (g, x, y, z, ry = 0, sx = 1, sy = sx, sz = sx) => { g.rotateY(ry); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
export const joinParts = (gs) => mergeGeometries(gs, false);

// ---- material classes (vC4.w) shared by the architecture shader (palace.js / quay.js use them) -----------------------------------------
// 0 flat paint   1 turquoise tile (domes)   2 sandstone strata   3 white wall (violet shadow, stucco)   4 foliage poster   5 dark window
// 6 gold metal (4-point star glint)   7 pennant cloth (waves)   8 wood
export const ARCH = /* glsl */ `
  vec3 shade(vec3 P, vec3 N, vec3 V) {
    float edge = revealEdge(P);
    float k = vC4.w;
    vec3 base = vC4.rgb;
    float v = dot(N, keyDir());
    float keep = 0.0;
    float deepAt = -0.55;
    if (k > 0.5 && k < 1.5) {                       // tile: offset rows of 6 cm scales, a 1 px darker seam, one lit edge arc per scale
      vec2 q = vec2(P.x + P.z, P.y) * vec2(0.8, 1.6); q.x += 0.5 * mod(floor(q.y), 2.0);
      vec2 f = fract(q) - 0.5; float seam = smoothstep(0.42, 0.47, max(abs(f.x), abs(f.y)));
      base = mix(base, base * 0.72, seam * 0.7);
      v += 0.0;
    } else if (k > 1.5 && k < 2.5) {                // sandstone strata: horizontal bands, value cut not gradient
      float s = floor(P.y * 1.6 + 2.2 * fbm(vec2(P.x * 0.05 + P.z * 0.03, P.y * 0.15)));
      base *= 0.93 + 0.1 * fract(s * 0.618);
    } else if (k > 2.5 && k < 3.5) {                // white wall: shadow goes to violet #b4a4c4 (not grey)
      vec3 gry = ${V(C.wallSh)};
      vec3 sh2 = gry;
      float b = celStep(v, 0.0);
      vec3 c = mix(sh2, base, b);
      c = mix(${V(C.marbleDeep)}, c, celStep(v, -0.5));
      return withEdge(finishW(c, P, 0.0), edge);
    } else if (k > 3.5 && k < 4.5) {                // foliage poster: 3 tone, shadow side dark
      float n = fbm(P.xz * 0.9 + P.y * 0.6);
      base = mix(${V(C.foliageSh)}, base, celStep(n, 0.42));
      base = mix(base, ${V(C.foliageLit)}, celStep(n, 0.66) * celStep(v, 0.2));
    } else if (k > 4.5 && k < 5.5) {                // window: dark arched, a hard sill light slit
      return withEdge(finishW(base * (0.9 + 0.2 * step(0.55, fract(P.y * 0.5))), P, 0.0), edge);
    } else if (k > 5.5 && k < 6.5) {                // gold: a hard sliver highlight where the half vector faces up
      keep = 1.0;
      float h = dot(normalize(keyDir() + V), N);
      base = mix(base, ${V(C.goldHi)}, celStep(h, 0.93));
    } else if (k > 6.5 && k < 7.5) {                // pennant: waves on threes, flat green with a darker lower seam
      keep = 0.6;
      base = mix(base, base * 0.7, celStep(sin(P.y * 6.0 + P.x * 3.0 + uTw * 6.0), 0.35));
    }
    vec3 c = toon(base, v, deepAt);
    c = finishW(c, P, keep);
    return withEdge(c, edge);
  }`;
