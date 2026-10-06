// pr-highway-3244 WORLD: shared palette, the travel profile and small helpers (this folder only).
// Palette = bible section 2 (ufotable sunset speedway). Every colour is a hex; V() turns one into a linear GLSL vec3.
//
// THE TREADMILL. The chariot stays at the world origin (the seal rides it); the speedway slides under it.
//   v(t) = 0                                               t < launch
//        = VMAX smooth((t - launch) / 0.9)                 the car reaches 44 m/s in 0.9 s
//        = v * SLOW  (0.3 s ease in)                        slow-mo window [slowmo, cross]  (the last pass)
//        = v_cross * (1 - (t - cross)/(stop - cross))^1.5   braking from the line to the stop
//   D(t) = integral of v dt, tabulated once at 1/120 s (a pure function of t, so scrubbing equals playing).
// The track, stands, flags, tyres, rocks, cacti and the finish line ride a `rail` group at z = -D(t); the desert shader
// scrolls its noise by D(t); the far mesas slide at 0.1 x D (parallax). Travel is local +z (the seal's forward).
import { Color } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paint, painted } from "../../../sdf.js";

export const PAL = {
  // sky
  skyHorizon: "#ff9e1f", skyRose: "#ff478f", skyViolet: "#9e4de6", skyZenith: "#291480",
  sunDisc: "#fff7db", sunCore: "#fffbe8", sunHalo: "#ffd890", sunStreak: "#ffe0a0", sunGlow1: "#ffb352", sunGlow2: "#ffdc8c",
  cloudBelly: "#ff8085", cloudBody: "#ffdbb8", cloudCrown: "#ffd073",
  sea: "#5a3aa0", seaDeep: "#2c1c70",
  // ground and stone
  groundLit: "#f2ad66", groundHollow: "#e07f47", groundCrest: "#ffd18c", groundInk: "#b8503c",
  mesaLit: "#c95a44", mesaShadow: "#6a2a44", mesaRim: "#ffb878", haze: "#fa9480",
  // track
  asphalt: "#3a3440", asphaltShadow: "#241e2e", kerbRed: "#e23a2e", cream: "#fbf5ea", chequerDark: "#1a1420", ink: "#241a2a",
  // stands, crowd
  concrete: "#d8c8b8", concreteShadow: "#9a8aa0", rail: "#8a7a9a",
  // dressing
  tyre: "#241e2e", tyreShadow: "#15101c", rock: "#c06a4a", rockShadow: "#6a2a44", cactus: "#6aa84a", cactusShadow: "#254a44",
  pylon: "#2f6fe0", beam: "#e23a2e", railGold: "#ffc820", gold: "#ffc926", crimson: "#e0102c", crimsonShadow: "#7a0a30",
  confetti: ["#ffc820", "#e23a2e", "#2f8cff", "#ff8ab0"],
  skin: ["#f2b88a", "#d9976a", "#b87350"],
  teaRed: "#b0122a", teaCream: "#f0e0c0", wood: "#7a4a2a",
};
export const V = (h) => { const c = new Color(h); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };
export const F = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));

// the sun, behind-left of the king (bible E1: 5 deg above the horizon). Local frame, +z = travel, +x = the king's left.
export const SUN = (() => { const v = [0.78, 0.09, -0.62], l = Math.hypot(...v); return v.map((c) => c / l); })();

export const sm01 = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// time of a named beat in scene.beats, else the bible default (card clock = the clock of this cutscene)
export function beatTime(scene, name, def) {
  const b = (scene?.beats ?? []).find((x) => x.name === name);
  return b && Number.isFinite(b.t) ? b.t : def;
}
// bible beat defaults (24 fps frames / 24): launch f198, last-pass glint f266, line crossed f329, stop = line B f367
export const EV = { launch: 8.25, slowmo: 11.0, kachow: 11.1, cross: 13.7, stop: 15.3 };

export function makeTravel(scene) {
  const T = Object.fromEntries(Object.keys(EV).map((k) => [k, beatTime(scene, k, EV[k])]));
  const VMAX = 44, SLOW = 0.38, dt = 1 / 120;
  const end = Math.max(scene?.duration ?? 26, 26) + 1;
  const speed = (t) => {
    if (t < T.launch) return 0;
    let v = VMAX * sm01((t - T.launch) / 0.9);
    if (t >= T.cross) {
      const vc = VMAX * SLOW;
      const k = Math.min(1, (t - T.cross) / Math.max(0.1, T.stop - T.cross));
      return vc * Math.pow(1 - k, 1.5);
    }
    v *= 1 - (1 - SLOW) * sm01((t - T.slowmo) / 0.3);
    return v;
  };
  const N = Math.ceil(end / dt), tab = new Float32Array(N + 1);
  for (let i = 1; i <= N; i++) tab[i] = tab[i - 1] + 0.5 * (speed((i - 1) * dt) + speed(i * dt)) * dt;
  const D = (t) => { const x = Math.min(Math.max(t, 0) / dt, N - 1e-6), i = Math.floor(x); return tab[i] + (tab[i + 1] - tab[i]) * (x - i); };
  return { D, speed, T, zFin: D(T.cross) };
}

// paint one geometry for the one anime program (colour, shadow colour, ink line weight). indexed/uv stripped so parts merge.
export function paintGeo(geo, col, shade, o = {}) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  if (geo.attributes.uv) geo.deleteAttribute("uv");
  geo.computeVertexNormals();
  return painted(geo, paint(col, shade ?? col, { line: o.line ?? 1, id: o.id ?? 0, bias: o.bias ?? 0.5 }));
}
export function mergeParts(parts, name) {
  const g = mergeGeometries(parts);
  if (!g) throw new Error(`pr-highway-3244 world: merge failed (${name})`);
  return g;
}
// a custom (non-anime) set material writes alpha 0.5 so the set-line pass treats it like any prop
export const SET_ID = "0.5";
