// THE IMPACT-FRAME AND SPEED-LINE TRIGGER API. Callable three ways:
//   1. from scene.js beats (the DIRECTION agent):   { t: 4.2, name: "impact", seq?: [[1,2],[2,1],[3,2]] }
//                                                   { t: 4.2, name: "speedlines", dur: 0.6, kind: "radial", at: [0.5,0.5], strength: 0.9, col: "#000" }
//                                                   { t: 4.2, name: "shock", dur: 0.5, at: [0.5,0.5], amp: 0.05, r1: 0.9 }
//                                                   { t: 4.2, name: "trauma", amount: 0.6 }
//   2. from a layer, through ctx.sakuga:            ctx.sakuga.impact(t), ctx.sakuga.speedLines({...}), ...
//   3. from a layer's update(t, dt, cue):           cue.fired includes the beat; the player has ALREADY applied it,
//                                                   so a layer only reads it to sync its own motion (a flash card, a smear).
// Everything here is a pure function of the clock t (windows, not events), so scrubbing the lab to any t
// (?cut=<dock>&t=<s>) shows the same frame as playing through. Only trauma is stateful (it decays).
//
// Maths:
//   impact frames   the engine's Impact: frame-locked sequences at 24 fps, [mode, frames]; mode 1 two-tone,
//                   2 inverted, 3 two-tone swapped. mode(t) = the entry covering floor((t - t0) 24).
//                   Default [[1,2],[2,1],[3,2]] = 2 frames two-tone, 1 inverted, 2 swapped (5 frames, 0.21 s).
//   speed lines     composer uniform uFocus = (u, v, strength, kind): kind 0 radial focus lines about (u, v),
//                   kind 1 horizontal speed lines. Strength follows a ramp: a = s * smoothstep(0, .06, age) *
//                   (1 - smoothstep(dur - .12, dur, age)). The lines are redrawn every step by the final pass (uSeed).
//   shockwave       uShock = (u, v, r, amp): a ring that warps the image: r(age) = r1 * (1 - (1 - age/dur)^2),
//                   amp(age) = amp * (1 - age/dur). The warp is exp(-((|d| - r) / 0.045)^2).
//   trauma          the engine's Trauma: shake = T^2 A noise(t f), T decays linearly (1.6 /s).
import { Color } from "three";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export class SakugaApi {
  constructor(engine) {
    this.engine = engine;
    this.impacts = []; // { t, seq }
    this.lines = []; // { t, dur, kind, at, strength, col }
    this.shocks = []; // { t, dur, at, amp, r1 }
    this.traumaFired = new Set();
    this._col = new Color();
  }
  clear() { this.impacts.length = 0; this.lines.length = 0; this.shocks.length = 0; this.traumaFired.clear(); }
  impact(t, seq = [[1, 2], [2, 1], [3, 2]]) { this.impacts.push({ t, seq }); }
  speedLines(o) { this.lines.push({ t: o.t ?? 0, dur: o.dur ?? 0.6, kind: o.kind === "speed" || o.kind === 1 ? 1 : 0, at: o.at ?? [0.5, 0.5], strength: o.strength ?? 0.85, col: o.col ?? "#000000" }); }
  shock(o) { this.shocks.push({ t: o.t ?? 0, dur: o.dur ?? 0.5, at: o.at ?? [0.5, 0.5], amp: o.amp ?? 0.05, r1: o.r1 ?? 0.9 }); }
  trauma(a) { this.engine.trauma.add(a); }
  // register a scene.js beat (the player calls this once at load for every reserved beat name)
  fromBeat(b) {
    if (b.name === "impact") this.impact(b.t, b.seq);
    else if (b.name === "speedlines") this.speedLines(b);
    else if (b.name === "shock") this.shock(b);
  }
  // a beat that must also fire a stateful effect when the clock crosses it (trauma)
  onFired(b) { if (b.name === "trauma") this.trauma(b.amount ?? 0.5); }
  // write all uniforms for clock t. Call once per frame, before engine.frame().
  apply(t) {
    const E = this.engine, u = E.composer.u;
    // impact: the latest sequence whose window holds t
    let mode = 0;
    for (const im of this.impacts) {
      const sig = im.seq.reduce((a, s) => a + s[1], 0) / 24;
      if (t >= im.t && t < im.t + sig) { E.impact.fire(im.t, im.seq); mode = 1; break; }
    }
    if (!mode) E.impact.fire(-1e9, []); // no window: the engine's own mode(t) returns 0
    // speed lines (the last window that holds t wins)
    u.uFocus.value.z = 0;
    for (const L of this.lines) {
      const age = t - L.t;
      if (age < 0 || age > L.dur) continue;
      const a = L.strength * sstep(0, 0.06, age) * (1 - sstep(L.dur - 0.12, L.dur, age));
      u.uFocus.value.set(L.at[0], 1 - L.at[1], a, L.kind);
      u.uFocusCol.value.set(this._col.set(L.col));
    }
    // shock ring
    u.uShock.value.w = 0;
    for (const S of this.shocks) {
      const age = (t - S.t) / S.dur;
      if (age < 0 || age > 1) continue;
      u.uShock.value.set(S.at[0], 1 - S.at[1], S.r1 * (1 - (1 - age) ** 2), S.amp * (1 - age));
    }
  }
}
