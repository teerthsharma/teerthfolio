// pr-tensorflow-124410 CAST: shared timing, easing and the seal-local stage frame. Pure functions of the clock, so a scrubbed frame equals a played one.
// Event times are the bible's (scripts/pr-tensorflow-124410.md section 5). A beat the DIRECTION agent names in scene.js overrides the default:
// cue.since(name) is finite once the beat has started, so its start = cue.t - cue.since(name). Every event accepts aliases, first hit wins.
//   stand    3.00  The World rises out of the crest (shot 3)          approach 3.00  the Jotaro seal steps forward; DIO's line A
//   muda     5.00  the MUDA barrage, dur 1.2 s (shot 4)               timestop 6.21  ZA WARUDO: DIO seal and Stand move, all else freezes (shot 5)
//   resume   7.46  time resumes (shot 6)                              drown    7.60  the coral edge falls and drowns
//   flex     8.20  the JoJo pose / flex line                          tear     9.54  poster tear: the dam cast is gone, the island begins (shot 7)
//   credit  13.00  the credit; The World dissolves (shot 8)
export const DEFAULTS = { stand: 3.0, approach: 3.0, muda: 5.0, timestop: 6.21, resume: 7.46, drown: 7.6, flex: 8.2, tear: 9.54, credit: 13.0 };
const ALIASES = {
  stand: ["stand", "rise", "theworld"], approach: ["approach", "lineA", "linea"], muda: ["muda", "barrage"],
  timestop: ["timestop", "timeStop", "stop", "zawarudo"], resume: ["resume", "timeResume", "unstop"], drown: ["drown", "edgeFall", "fall"],
  flex: ["flex", "jojo", "jojoPose"], tear: ["tear", "posterTear", "island"], credit: ["credit"],
};
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const ramp = (t, a, d) => sm((t - a) / Math.max(1e-6, d));
// easeOutBack, c1 = 2.8 overshoots about 18 percent: f(x) = 1 + (c1 + 1)(x - 1)^3 + c1 (x - 1)^2
export const back = (x, c1 = 2.8) => { x = clamp01(x); const u = x - 1; return 1 + (c1 + 1) * u * u * u + c1 * u * u; };
// deterministic hash in 0..1 of an integer step (the MUDA fan re-randomises per step, never per call): h = frac(sin(i 127.1 + s 311.7) 43758.5453)
export const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
export function events(cue) {
  const E = {};
  for (const k of Object.keys(DEFAULTS)) {
    let v = DEFAULTS[k];
    for (const a of ALIASES[k]) { const s = cue?.since ? cue.since(a) : Infinity; if (Number.isFinite(s)) { v = cue.t - s; break; } }
    E[k] = v;
  }
  E.mudaDur = cue?.arg ? cue.arg("muda", "dur", 1.2) : 1.2;
  return E;
}
// the seal-local stage frame: x right, y up, z forward, in HERO-SEAL UNITS (1 unit = the seal's scale S). `live` follows the moving seal;
// otherwise the scene's own starting placement is used (the dam set pieces stay on the dam when the seal moves to the island).
export function stageFrame(ctx, live = false) {
  const src = live ? ctx.seal : ctx.scene.seal ?? ctx.seal;
  const at = () => (live ? ctx.seal.at : src.at ?? [0, 0, 0]);
  const S = () => (live ? ctx.seal.scale : src.scale) ?? 1;
  const yaw = () => (live ? ctx.seal.yaw : src.yaw) ?? 0;
  return {
    S, yaw,
    // world point of seal-local (x, y, z): at + right x S + up y S + fwd z S, right = (cos yaw, 0, -sin yaw), fwd = (sin yaw, 0, cos yaw)
    to(x, y, z, out) {
      const s = S(), a = yaw(), p = at(), c = Math.cos(a), n = Math.sin(a);
      const X = p[0] + (c * x + n * z) * s, Y = p[1] + y * s, Z = p[2] + (-n * x + c * z) * s;
      if (out) return out.set(X, Y, Z);
      return [X, Y, Z];
    },
  };
}
