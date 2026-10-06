// spawn-seal WORLD: shared state, shared uniforms, shared GLSL, timing helpers. Imported only by this folder.
// Units: metres. The island is centred on the origin (pool, crystal ring, lattice); the seal stands on the plinth at
// scene.seal.at. Seal frame: +z forward, so the cave mouth (the arch) is at -z, behind the plinth.
//
// CUE NAMES (free cues, read with the bible's times as the fallback when the direction layer names no beat):
//   plop(1.0s) veldora_pulse(2.8) veldora_eye(2.8..3.1) morph(4.4..6.4) lenses(9.4..10.6) beams(10.0..10.9)
//   lattice(13.8..18.5) loop territories touch(18.5) cool(18.5..26.8) maw(26.8..29.3) home(29.3)
import { Color, Vector3 } from "three";
import { V } from "../../../paint.js";

export { V };
export const FR = (f) => f / 24; // bible frames (24 fps) to seconds
export const CEIL = 12, WALL_R = 38, POOL_R = 5.2, RING_R = 6.5, MOUTH_W = 14, MOUTH_H = 9;
export const NODE_COL = "#3fdcff", GOLD = "#ffd23a";
export const C = {
  void: "#05030b", ink: "#050a1c", crack: "#0a1030", fog: "#1a1f5e",
  ceil: "#0b1034", wallMid: "#1a2257", shardLit: "#2a3472", edge: "#4a5fa6", under: "#2a4a9a", top: "#0a0f33", abyss: "#070826",
  poolBody: "#1fb8ff", poolDeep: "#0d6ac0", poolHi: "#e8ffff", poolCaus: "#7ff8ff", poolEdge: "#3fdcff",
  stoneLit: "#7f8ab8", stoneMid: "#5a669a", stoneSh: "#3e4a7a",
  gold: "#ffd23a", goldOuter: "#ffb35a", goldHot: "#fff3b0", goldLine: "#7a4a0a",
  lens: "#7fd0ff", lensRim: "#e8ffff", lensCore: "#1fb8ff",
  pearl: "#cfe0ff", pearlSh: "#8aa0e0", veldora: "#fff1a8", shell: "#ffd25a",
  cyan: "#3fdcff", terrGold: "#ffc83a", pink: "#ff4fa0", violet: "#8a3fff",
  decor: ["#37e8ff", "#c050ff", "#7a6bff", "#ff5ad8", "#46ffd0", "#4aa0ff"],
};

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOut = (x) => 1 - (1 - clamp(x)) ** 3;
export const backOut = (x, c = 1.3) => { x = clamp(x); return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

// 0..1 across a window: the named beat if the direction layer defined one, else the bible's seconds [a, b]
export function win(cue, name, a, b) {
  if (cue.on(name)) return cue.k(name);
  if (cue.done(name)) return 1;
  return clamp((cue.t - a) / Math.max(1e-6, b - a));
}
// start time of a named beat, else the bible's default
export function tAt(cue, name, def) { const s = cue.since(name); return Number.isFinite(s) ? cue.t - s : def; }
// the island is "home" (open ground, spawn statue) on the home law or after 29.3 s
export const isHome = (cue) => cue.law === "home" || cue.on("home") || cue.done("home") === 1 || (cue.duration > 29 && cue.t >= 29.3);

export function nodePositions(gy) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const a = ((i * 360) / 7 + 25.7) * Math.PI / 180; // bible: 0, 51, 103 ... deg; offset so none sits on the +z wide camera
    out.push({ i, a, x: Math.sin(a) * RING_R, z: Math.cos(a) * RING_R, base: gy, tip: gy + 1.7 });
  }
  return out;
}

export function makeShared(ctx) {
  const at = ctx.scene.seal?.at ?? [0, 0, 0];
  const gy = at[1] ?? 0;
  const U = {
    uT: { value: 0 }, uEat: { value: 0 }, uMaw: { value: new Vector3(0, gy + 5, -5.5) }, uSealPos: { value: new Vector3(at[0], gy, at[2]) },
    uCool: { value: 0 }, uPoolPos: { value: new Vector3(0, gy + 0.9, 0) }, uPool: { value: 1 }, uGold: { value: 0.3 },
    uMouth: { value: new Vector3(0, 6, -40) },
  };
  return { U, gy, at, nodes: nodePositions(gy), home: false, ign: new Float32Array(7), sealPos: new Vector3(), sealYaw: 0 };
}

// GLSL appended to every custom world material. Needs `cameraPosition` (ShaderMaterial builtin).
//   fog:  indigo #1a1f5e, near 40, far 180 (never white).  cool: the credit hold pulls the cave edges toward violet.
//   eaten: inside the maw's growing sphere (R = uEat * 80 m around uMaw) the world becomes the void #05030b; a guard
//   sphere of 1.8-2.6 m around the seal keeps the seal's ground whole.
export const SHARED_GLSL = /* glsl */ `
  uniform float uT; uniform float uEat; uniform vec3 uMaw; uniform vec3 uSealPos; uniform float uCool;
  uniform vec3 uPoolPos; uniform float uPool; uniform float uGold; uniform vec3 uMouth;
  vec3 worldFinish(vec3 col, vec3 P) {
    float e = smoothstep(12.0, 36.0, length(P.xz));
    col = mix(col, col * vec3(0.78, 0.62, 1.0) + vec3(0.10, 0.03, 0.26) * e, uCool * e);
    float f = smoothstep(40.0, 180.0, distance(cameraPosition, P));
    col = mix(col, ${V(C.fog)}, f * 0.85);
    float inside = step(distance(P, uMaw), uEat * 80.0) * smoothstep(1.8, 2.6, distance(P, uSealPos));
    return mix(col, ${V(C.void)}, inside);
  }`;

export const colorOf = (h) => new Color(h);
