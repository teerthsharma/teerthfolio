// BUILD for pr-mujoco-3396 (DIRECTION). Composes world, cast and fx, then drives the shared timeline state.
// What this file adds on top of composeLayers:
//   1. SEAL SWELL: the player places the seal from scene.seal each step with a constant scale; scene.sealScale keys the x6 swell and the
//      shrink, applied right after placement so the director, the overlay box and every layer read one live scale.
//   2. cue.x: the derived curves every layer shares (so the layers never disagree about the maths):
//        scale  seal scale now
//        dark   sky value drop 0..0.2 (from 6.4 s, held under the bolt, recovers over 1 s after the stomp)
//        sea    uSea 0..1, the sea turns blue as the gap opens, 10.35 -> 11.5 s, smoothstep
//        flake  plaster wipe progress 0..1 from the gap, 16.25 -> 19.25 s
//        craze  plaster craquelure growth 0..1 at the corners, 13.75 -> 16 s
//        foot   seconds since the last footfall (sun pulse +12% while < 0.25; roofs jump 0.07 m while < 0.17; bell = 0.45 exp(-1.4 s))
//        footN  index of the last footfall; ring = index of the newest ripple ring
//   3. the sun: engine.sun = 12 deg right of the Wall's centre, 6 deg elevation (the shafts and the rim light).
// Imports only the three layer entry points and the framework (CONTRACT rule 2).
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// seal scale at t from scene.sealScale: [[t0, t1, from, to, overshoot]]; holds `to` after t1, `base` before t0.
// s = from + (to-from) * (smooth(u) + o sin(pi u) u): the sine bump makes the overshoot and is zero at both ends.
export function sealScaleAt(keys, t, base = 1) {
  let s = base;
  for (const [t0, t1, a, b, o = 0] of keys ?? []) {
    if (t < t0) break;
    const u = Math.min(1, (t - t0) / (t1 - t0));
    s = a + (b - a) * (smooth(u) + o * Math.sin(Math.PI * u) * u);
  }
  return s;
}

export default function build(ctx) {
  const sc = ctx.scene, THREE = ctx.THREE;
  const layers = composeLayers(ctx, { world, cast, fx });

  // 1. swell hook: wrap the player's placement once (guarded so a rebuild never stacks wrappers)
  const P = ctx.player;
  let restore = null;
  if (P && typeof P.placeSealAt === "function" && !P.__swellHook) {
    const orig = P.placeSealAt;
    P.placeSealAt = function (t) { orig.call(this, t); this.seal.scale = sealScaleAt(sc.sealScale, t, this.seal.scale); };
    P.__swellHook = true;
    restore = () => { P.placeSealAt = orig; P.__swellHook = false; };
  }

  // 3. the sun, 12 deg right of the Wall's centre, 6 deg up, far behind the Wall (-z)
  try {
    const az = 12 * Math.PI / 180, el = 6 * Math.PI / 180;
    ctx.engine.sun = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).multiplyScalar(1000);
  } catch { /* the sun is cosmetic; the shafts fall back to the style default */ }

  const FOOT0 = 4.6, FOOT = 0.9, RING0 = 4.9;
  return {
    group: layers.group,
    errors: layers.errors,
    update(t, dt, cue) {
      // 2. derived curves on cue.x (pure functions of the clock: scrubbing equals playing)
      const T = cue.t;
      const k = (a, b) => smooth((T - a) / (b - a));
      cue.x = {
        scale: ctx.seal.scale,
        dark: k(6.4, 6.58) * 0.2 * (1 - k(7.1, 8.1)),
        sea: k(10.35, 11.5),
        flake: k(16.25, 19.25),
        craze: k(13.75, 16.0),
        foot: T < FOOT0 ? Infinity : (T - FOOT0) % FOOT,
        footN: T < FOOT0 ? -1 : Math.floor((T - FOOT0) / FOOT),
        ring: T < RING0 ? -1 : Math.floor((T - RING0) / (22 / 24)),
      };
      layers.update(t, dt, cue);
    },
    dispose() { try { restore?.(); } finally { layers.dispose(); } },
  };
}
