// BUILD for pr-mujoco-warp-1541 (DIRECTION). Assembles the three layers and drives the timeline's shared curves.
// Imports only the three layer entry points and the framework. The curves (scene.curves) are evaluated here, once
// per update, and written onto the cue so every layer reads one power(t); they are pure functions of t, so a scrubbed
// frame equals a played one. The hero's scale (1 -> 1.4) and its shell shudder are written onto scene.seal (the
// player re-reads them each frame), also as pure functions of t.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

const CRACK = 7.0; // f168
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
// piecewise smoothstep through [t, v] keys, held before the first and after the last
function curve(keys, t) {
  if (!keys?.length) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; return v0 + (v1 - v0) * sm((t - t0) / Math.max(1e-6, t1 - t0)); }
  }
  return keys[keys.length - 1][1];
}

export default function build(ctx) {
  const S = ctx.scene, C = S.curves, base = [...(S.seal.at ?? [0, 0, 0])];
  const composed = composeLayers(ctx, { world, cast, fx });
  const inner = composed.update;
  composed.update = (t, dt, cue) => {
    const ts = cue.ts ?? t;
    cue.power = curve(C.power, ts);
    cue.violet = curve(C.violet, ts);
    cue.sealScale = curve(C.sealScale, ts);
    cue.shell = ts < CRACK ? curve(C.shell, ts) : 0;
    cue.reading = curve(C.reading, ts);
    cue.gold = ts >= CRACK ? 1 : 0;
    cue.crack = ts - CRACK;
    // hero: scale 1 -> 1.4 with the power-up, and the x nudge shudder inside the shell (f96-f168, on twos)
    S.seal.scale = cue.sealScale;
    const shud = ts >= 4.0 && ts < CRACK ? Math.sin(Math.floor(ts * 12) * 70) * 0.035 * Math.min(1, cue.power) : 0;
    S.seal.at = [base[0] + shud, base[1], base[2]];
    inner(t, dt, cue);
  };
  const innerDispose = composed.dispose;
  composed.dispose = () => { S.seal.scale = 1; S.seal.at = base; innerDispose?.(); };
  return composed;
}
