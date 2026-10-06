// BUILD for p-nerve (DIRECTION agent). Assembles world/cast/fx and derives the shared nerve state ONCE from scene.js,
// so every layer reads the same numbers: cue.nerve (and ctx.nerve for build-time reads).
// All values are pure functions of the clock t, so scrubbing equals playing.
//   tollEnv(t)   = sum_n exp(-5 d_n)             d_n = t - toll_n >= 0: the rim pulse and floodlight flicker
//   bellAngle(t) = A exp(-k d) cos(2 pi d / T)   d since the latest toll; A 0.42 rad, k 0.75, T 1.85 s (bible 3.4)
//   grains       = 32 + 48 + 64 by toll heap, plus 16 once the fourth bead flares
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  const S = ctx.scene, F = S.facts, B = F.bell;
  const times = (name) => S.beats.filter((b) => b.name === name).map((b) => b.t).sort((a, b) => a - b);
  const tolls = times("toll"), strokes = times("stroke"), beads = times("beadDrop"), bites = times("bite"), heapsAt = times("grainHeap");
  const k01 = (x) => Math.min(1, Math.max(0, x));
  const sm = (x) => { x = k01(x); return x * x * (3 - 2 * x); };
  const win = (name) => { const b = S.beats.find((e) => e.name === name); return b ? [b.t, b.t + (b.dur ?? 0)] : [Infinity, Infinity]; };
  const count = (arr, t) => arr.filter((x) => x <= t).length;
  const nerve = {
    tolls, strokes, beads, bites,
    state(t) {
      const last = tolls.filter((x) => x <= t).pop();
      const d = last === undefined ? 0 : t - last;
      const [r0, r1] = win("realmOpen"), [c0, c1] = win("crackWeb"), [s0, s1] = win("shardFall"), [i0, i1] = win("islandReveal"), [sc0, sc1] = win("screensCut"), [p0, p1] = win("pageToLens");
      const f0 = win("beadFlare")[0];
      return {
        tollEnv: tolls.reduce((a, x) => a + (t >= x ? Math.exp(-5 * (t - x)) : 0), 0),
        bellAngle: last === undefined ? 0 : B.amp * Math.exp(-B.decay * d) * Math.cos((2 * Math.PI * d) / B.period),
        nToll: count(tolls, t), nStroke: count(strokes, t), nBead: count(beads, t), nBite: count(bites, t),
        grains: F.heaps.slice(0, Math.min(3, count(heapsAt, t))).reduce((a, b) => a + b, 0) + (t >= f0 ? F.heaps[3] : 0),
        realm: k01((t - r0) / 0.6) * (1 - k01((t - (r1 - 0.6)) / 0.6)), // opens, then closes
        rainK: k01((t - win("rain")[0]) / 0.5),
        crack: k01((t - c0) / Math.max(1e-3, c1 - c0)),
        shardT: Math.max(0, t - s0), shardK: k01((t - s0) / Math.max(1e-3, s1 - s0)),
        island: k01((t - i0) / Math.max(1e-3, i1 - i0)),
        screens: t >= sc0 ? 1 : 0, screensOver: t >= sc1 ? 1 : 0,
        flare: k01((t - f0) / 0.5), // 12 f at 24 fps up, then hold
        tilt: 0.21 * sm((t - p0) / 0.3) * (1 - sm((t - (p1 - 0.3)) / 0.3)), // head tilt on z, page to lens
      };
    },
  };
  ctx.nerve = nerve;
  const parts = composeLayers(ctx, { world, cast, fx });
  const update = parts.update;
  parts.update = (t, dt, cue) => { cue.nerve = nerve.state(t); update(t, dt, cue); };
  return parts;
}
