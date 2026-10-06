// WORLD palette and clock for pr-mujoco-3396 (Renaissance fresco, Attack on Titan Rumbling).
// Every hex is from the production bible (scripts/pr-mujoco-3396.md E01-E16). Shadows go to ultramarine-violet, never grey.
import { Color } from "three";

export const C = {
  // sky (E01)
  lapis: "#2f4f8f", skyUp: "#5c4f6f", skyMid: "#8a788f", rose: "#c9857f", peach: "#eeb79c", gold: "#e9a252", sun: "#fff0c8",
  cloudLit: "#f3d7a0", cloudShade: "#7a5f86", cloudDeep: "#3b2f52", sepia: "#5a3b22", haze: "#c77744", ripple: "#b9a0b8",
  // sea (E02)
  seaHor: "#b25a3c", seaMid: "#6a4a63", seaNear: "#2f3a66", glint: "#f3d7a0", blueNear: "#2f4f8f", blueFar: "#7f9cc4",
  quayLit: "#8c7a62", quayShade: "#4b3621", crane: "#3a2a1e",
  // district (E03)
  roofLit: "#c0623a", roofMid: "#a0522d", roofShade: "#5b2e22", roofDeep: "#2d1a14",
  stoneLit: "#d2b48a", stoneMid: "#a98a62", stoneShade: "#6b5640", stoneDeep: "#3a2a1e", joint: "#4b3621",
  violetShade: "#5b4a66", ember: "#ff9a3c", emberCore: "#fff0c8", wood: "#6b4a2e",
  // wall (E04)
  plateLit: "#e8d6b0", plateMid: "#c9b17e", plateShade: "#6e5a44", plateDeep: "#3b2f22", crack: "#e96a2d", wallFlesh: "#8a3a2a", underside: "#e4b887",
  muscle: "#995837", muscleShade: "#6a3726", fissure: "#24100c",
  // rank (E06)
  rankCore: "#3a1f16", rankRim: "#e9a252", steamShade: "#b5a8b1", steamCore: "#dfd8cd",
  // ground (E16)
  groundMean: "#8a7048", groundLit: "#d4c4b0", crater: "#3a3228",
  founderGreen: "#7fe0a0", bone: "#dfd8cd",
};

// the clock the bible states (seconds). 24 fps, 480 frames: f79 = 3.3 s, f98 = 4.1 s, f162 = 6.75 s.
export const T = {
  crack: [3.3, 4.3],       // f79-103 the ground crack races from the square to the Wall
  tremble: [3.4, 4.0],     // f82-96 the faces and plates tremble
  skin: 4.1,               // f98 the skin starts to fall from the crowned face outward
  rise: [4.0, 6.0],        // the Rumbling rank rises over the crest
  dark: [6.4, 6.75],       // shot 5: the sky goes dark
  strike: [6.75, 7.05],    // f162-169 the bolt
  gap: [10.35, 11.5],      // the sea opens blue
  gulls: 10.9,
  craze: 13.75,            // f330 the plaster starts to craze
  foot0: 4.6, footDt: 0.9, footEnd: 15.6,   // footfalls
  godOn: 6.4, godOff: 10.3,                 // the God silhouette (egg 6): f154-247
};

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const col = (h) => new Color(h);
export const mix = (a, b, k) => new Color(a).lerp(new Color(b), k);

// Window progress and footfalls. A beat the DIRECTION layer defined (scene.beats) drives the window; otherwise the
// bible's clock does, so the world still plays on its own.
export function timing(ctx) {
  const beats = new Map((ctx.scene.beats ?? []).map((b) => [b.name, b]));
  return {
    has: (n) => beats.has(n),
    prog(name, a, b, t, cue) {
      const be = beats.get(name);
      if (be && cue) { const s = cue.since(name); return Number.isFinite(s) ? clamp01(s / (be.dur ?? (b - a))) : 0; }
      return clamp01((t - a) / (b - a));
    },
    // n: index of the last footfall (-1 before the first); s: seconds since it
    foot(t, cue) {
      const n = t < T.foot0 ? -1 : Math.min(Math.floor((t - T.foot0) / T.footDt), Math.round((T.footEnd - T.foot0) / T.footDt));
      let s = n < 0 ? Infinity : t - (T.foot0 + n * T.footDt);
      if (beats.has("footfall") && cue) { const c = cue.since("footfall"); if (Number.isFinite(c)) s = c; }
      return { n, s };
    },
  };
}

// a shared hex -> GLSL const vec3 (linear)
export const glslConsts = (V, map) => Object.entries(map).map(([k, h]) => `const vec3 ${k} = ${V(h)};`).join("\n  ");

// merge helper: a clean, painted geometry (every part carries the same attribute set so mergeGeometries accepts it)
export function cleanGeo(g) {
  g = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(g.attributes)) if (!["position", "normal"].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

// custom blend that ADDS colour but keeps the id channel (alpha) of what is underneath
export function additive(m) {
  return Object.assign(m, { transparent: true, depthWrite: false, blending: 5, blendSrc: 201, blendDst: 201, blendSrcAlpha: 200, blendDstAlpha: 201 });
}
