// Shared helpers for the pr-mujoco-warp-1541 WORLD layer (local to this folder; Consolidate may promote instHull/makeTimeline).
// Frame -> seconds at the bible's 24 fps clock. Beat names are read when the direction layer defines them
// ("crack"/"impact", "slide", "forest"); otherwise the bible's own frame numbers are used (crack f168 = 7.0 s).
import { BackSide, Color, InstancedMesh, ShaderMaterial } from "three";
import { smoothNormals } from "../../../kit/inkline.js";
export { V } from "../../../paint.js";

export const F = 24;
export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const clamp01 = (x) => Math.min(1, Math.max(0, x));

// the key light, toward the sun: camera-right, ~25 degrees up, a little toward the lens so faces read lit (shadows fall left)
export const SUN = [0.75, 0.39, 0.35].map((v, _, a) => v / Math.hypot(...a));
export const SUN_XZ = (() => { const l = Math.hypot(SUN[0], SUN[2]); return [SUN[0] / l, SUN[2] / l]; })();

// FLOOR geometry (bible 3.4): 22 x 22 cells, 0.30 m pitch, centre (0.9, 0.03, -1.6); row i runs along z, column j along x
export const FLOOR = { n: 22, pitch: 0.3, cx: 0.9, cy: 0.03, cz: -1.6, half: 0.0955, h: 0.04 };
export const cellX = (j) => FLOOR.cx + (j - 10.5) * FLOOR.pitch;
export const cellZ = (i) => FLOOR.cz + (i - 10.5) * FLOOR.pitch;

// beat start times, latched the first time a named beat is seen so scrubbing back stays stable
export function makeTimeline() {
  const lat = {};
  const find = (cue, key, names, def) => {
    if (lat[key] != null) return lat[key];
    for (const n of names) { const s = cue.since(n); if (Number.isFinite(s)) { lat[key] = cue.t - s; return lat[key]; } }
    return def;
  };
  return (cue) => {
    const tc = find(cue, "tc", ["crack", "impact"], 168 / F);                    // f168 the crack
    const tS = find(cue, "tS", ["slide", "condense"], tc + 12 / F);             // f180 rows slide
    return { tc, tS, violetIn: tc - 72 / F, violetOut: tc + 48 / F, violetEnd: tc + 102 / F };
  };
}

// instanced constant-pixel ink hull (sharing the mesh's instanceMatrix); the geometry gets aSmooth
export function instHull(mesh, shared, o = {}) {
  smoothNormals(mesh.geometry);
  const mat = new ShaderMaterial({
    side: BackSide,
    uniforms: { uRes: shared.uRes, uPx: { value: o.px ?? 2 }, uCol: { value: new Color(o.col ?? "#000000") } },
    vertexShader: /* glsl */ `attribute vec3 aSmooth; uniform vec2 uRes; uniform float uPx;
      void main() {
        mat4 M = modelMatrix * instanceMatrix;
        vec4 c = projectionMatrix * viewMatrix * M * vec4(position, 1.0);
        vec3 n = mat3(viewMatrix * M) * aSmooth;
        vec2 d = (projectionMatrix * vec4(normalize(n), 0.0)).xy;
        c.xy += normalize(d + 1e-6) * uPx * (uRes.y / 820.0) * 2.0 / uRes * c.w;   // constant pixel width, 820 px reference
        gl_Position = c; }`,
    fragmentShader: `uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 0.5); }`,
  });
  const h = new InstancedMesh(mesh.geometry, mat, mesh.count);
  h.instanceMatrix = mesh.instanceMatrix; h.renderOrder = -1; h.frustumCulled = false;
  h.userData.mat = mat;
  return h;
}

// every position the seal stands at over the film: the start and each move target (for keep-clear zones)
export function sealSpots(ctx) {
  const s = ctx.scene?.seal ?? {};
  const spots = [s.at ?? [0, 0, 0]];
  for (const m of s.moves ?? []) if (m.to) spots.push(m.to);
  return spots;
}
