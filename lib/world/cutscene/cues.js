// THE VILLAINS' SOUND: WebAudio synthesis for the Sukuna (Triton) and Aizen (XNNPACK) cutscenes. No files.
// A card declares `cues: [[sceneS, name, dur?], ...]`, sorted, in scene seconds (the same clock as its beats;
// clock.js sceneT). Sound.jsx feeds step() every frame with the live arrival, the scene clock and whether the
// engine is audible (unmuted, running); the cues play into the engine's master (so mute and master gain are
// respected) through one bus per cue that stop() ramps to silence: a skip, an exit or a mute leaves nothing
// running and no click. Pure of the DOM and three, so scripts/check-world.mjs can import CUE_NAMES.

export const CUE_NAMES = ["drone", "tritone", "bell", "slash", "choir", "heartbeat", "reverse", "impact"];

const FADE = 0.12; // s: the ramp that ends every voice, so nothing clicks
const LEVEL = 0.5; // the whole villain mix, under the engine's master (0.32) and compressor

// each voice builds into `out` (a gain), starts at t0, lasts about `dur`; it returns the sources to stop
const VOICES = {
  // a sub-bass drone: two detuned saws through a low-pass, rising a fifth over its length
  drone(c, out, t0, dur) {
    const lp = c.biquad("lowpass", 150, 0.7);
    lp.frequency.setValueAtTime(90, t0);
    lp.frequency.exponentialRampToValueAtTime(260, t0 + dur);
    const src = [];
    for (const [f, d] of [[41.2, 0], [41.2, 0.9], [82.4, -0.6]]) {
      const o = c.osc("sawtooth", f, t0, d);
      o.frequency.exponentialRampToValueAtTime(f * 1.5, t0 + dur);
      o.connect(lp);
      src.push(o);
    }
    const lfo = c.osc("sine", 0.35, t0);
    const lg = c.ctx.createGain();
    lg.gain.value = 0.18;
    lfo.connect(lg);
    lg.connect(out.gain);
    src.push(lfo);
    lp.connect(out);
    c.swell(out, t0, dur, 0.55, dur);
    return src;
  },
  // a dissonant tritone swell: root and the flat fifth, sawtooth, a filter that opens as it grows
  tritone(c, out, t0, dur) {
    const lp = c.biquad("lowpass", 300, 1.2);
    lp.frequency.setValueAtTime(300, t0);
    lp.frequency.exponentialRampToValueAtTime(2200, t0 + dur * 0.9);
    const src = [];
    for (const f of [110, 155.56, 220.5, 311]) {
      const o = c.osc("sawtooth", f, t0, f > 200 ? 7 : -5);
      o.connect(lp);
      src.push(o);
    }
    lp.connect(out);
    c.swell(out, t0, dur, 0.3, dur * 0.85);
    return src;
  },
  // a cathedral bell, low: inharmonic partials with long tails, and a sub thump under the strike
  bell(c, out, t0) {
    const src = [];
    for (const [r, a, d] of [[1, 0.5, 4.6], [2.0, 0.28, 3.6], [2.4, 0.22, 3.0], [3.0, 0.14, 2.4], [4.1, 0.1, 1.6], [5.4, 0.06, 1.0]]) {
      const o = c.osc("sine", 98 * r, t0);
      const g = c.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(a, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g);
      g.connect(out);
      src.push(o);
    }
    src.push(c.thud(out, t0, 52, 0.5, 1.2));
    return src;
  },
  // a metallic slash: a high noise band swept down, two inharmonic ringing tones, a hard tail
  slash(c, out, t0) {
    const n = c.noise(t0);
    const bp = c.biquad("bandpass", 7000, 1.4);
    bp.frequency.setValueAtTime(8200, t0);
    bp.frequency.exponentialRampToValueAtTime(1800, t0 + 0.2);
    const g = c.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.5, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
    n.connect(bp);
    bp.connect(g);
    g.connect(out);
    const src = [n];
    for (const [f, a] of [[1860, 0.16], [2710, 0.1]]) {
      const o = c.osc("square", f, t0);
      const og = c.ctx.createGain();
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.linearRampToValueAtTime(a, t0 + 0.003);
      og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      o.connect(og);
      og.connect(out);
      src.push(o);
    }
    return src;
  },
  // a low choir: saws through three vowel formants ("ah"), a slow tremble, a swell in and out
  choir(c, out, t0, dur) {
    const src = [];
    const sum = c.ctx.createGain();
    sum.gain.value = 0.5;
    for (const f of [73.4, 110, 146.8, 155.56, 220]) {
      const o = c.osc("sawtooth", f, t0, f * 0.004);
      o.connect(sum);
      src.push(o);
    }
    for (const [f, q, a] of [[650, 9, 1], [1080, 10, 0.5], [2650, 12, 0.18]]) {
      const bp = c.biquad("bandpass", f, q);
      const g = c.ctx.createGain();
      g.gain.value = a;
      sum.connect(bp);
      bp.connect(g);
      g.connect(out);
    }
    const lfo = c.osc("sine", 5.2, t0);
    const lg = c.ctx.createGain();
    lg.gain.value = 0.05;
    lfo.connect(lg);
    lg.connect(out.gain);
    src.push(lfo);
    c.swell(out, t0, dur, 0.7, dur * 0.4, dur * 0.35);
    return src;
  },
  // a heartbeat: lub-dub thuds at about 66 bpm for the whole duration
  heartbeat(c, out, t0, dur) {
    const src = [];
    for (let t = 0; t < dur - 0.4; t += 0.9) {
      src.push(c.thud(out, t0 + t, 62, 0.8, 0.32));
      src.push(c.thud(out, t0 + t + 0.26, 54, 0.55, 0.28));
    }
    return src;
  },
  // a reverse swell: bright noise and cold high partials rising, then cut dead at the end
  reverse(c, out, t0, dur) {
    const n = c.noise(t0);
    const bp = c.biquad("bandpass", 400, 2.5);
    bp.frequency.setValueAtTime(400, t0);
    bp.frequency.exponentialRampToValueAtTime(5200, t0 + dur);
    n.connect(bp);
    bp.connect(out);
    const src = [n];
    for (const f of [1318.5, 1864.7]) { // an E and its tritone, thin and cold
      const o = c.osc("sine", f, t0);
      o.frequency.exponentialRampToValueAtTime(f * 1.04, t0 + dur);
      const g = c.ctx.createGain();
      g.gain.value = 0.12;
      o.connect(g);
      g.connect(out);
      src.push(o);
    }
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(0.9, t0 + dur * 0.97);
    out.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.04);
    return src;
  },
  // a deep impact: a sub drop, a low noise crack, a short low ring
  impact(c, out, t0) {
    const src = [c.thud(out, t0, 44, 1, 1.8)];
    const n = c.noise(t0);
    const lp = c.biquad("lowpass", 700, 0.8);
    const g = c.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.55, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    n.connect(lp);
    lp.connect(g);
    g.connect(out);
    src.push(n);
    const o = c.osc("sine", 98, t0);
    const og = c.ctx.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.linearRampToValueAtTime(0.2, t0 + 0.01);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
    o.connect(og);
    og.connect(out);
    src.push(o);
    return src;
  },
};

// the engine hands over its context, its master gain and its noise buffer (createVillains)
export function createVillains() {
  let ctx = null;
  let dest = null;
  let noiseBuf = null;
  let cur = null; // the card id the sequencer follows
  let next = 0; // the next cue to fire
  let live = []; // { out, src } per cue in flight
  const played = []; // names, in order, for a probe (window.__sound.cues)

  const c = {
    get ctx() { return ctx; },
    biquad(type, f, q) {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      return b;
    },
    // detune is in Hz here: a small beat between the unison saws
    osc(type, f, t0, detune = 0) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f + detune, t0);
      o.start(t0);
      return o;
    },
    noise(t0) {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      s.loop = true;
      s.start(t0, Math.random() * 1.8);
      return s;
    },
    // fade in over `up` (default the whole length), hold, fade out over the last `down`
    swell(out, t0, dur, peak, up, down = Math.min(0.8, dur * 0.25)) {
      out.gain.setValueAtTime(0.0001, t0);
      out.gain.linearRampToValueAtTime(peak, t0 + Math.max(0.05, up));
      out.gain.setValueAtTime(peak, t0 + Math.max(0.05, up));
      out.gain.linearRampToValueAtTime(0.0001, t0 + dur + down);
    },
    // a sine thud falling from f to f/2
    thud(out, t0, f, peak, len) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(f * 1.8, t0);
      o.frequency.exponentialRampToValueAtTime(f * 0.5, t0 + len * 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      o.connect(g);
      g.connect(out);
      o.start(t0);
      return o;
    },
  };

  function fire(name, dur = 2) {
    const t0 = ctx.currentTime + 0.02;
    const out = ctx.createGain();
    out.gain.value = 0; // a GainNode is 1 until its first automation event
    out.connect(dest);
    const length = name === "drone" || name === "choir" || name === "heartbeat" || name === "tritone" || name === "reverse" ? dur : 5;
    const src = VOICES[name](c, out, t0, dur);
    const end = t0 + length + 1.2;
    for (const s of src) s.stop(end);
    const rec = { out, src };
    live.push(rec);
    src[0].addEventListener("ended", () => {
      try { out.disconnect(); } catch { /* already gone */ }
      live = live.filter((r) => r !== rec);
    }, { once: true });
    played.push(name);
    if (process.env.NODE_ENV !== "production") console.debug("[cue]", name);
  }

  // ramp every bus to silence, stop the sources a beat after, free the graph
  function stop() {
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const { out, src } of live) {
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), now);
      out.gain.linearRampToValueAtTime(0.0001, now + FADE);
      for (const s of src) { try { s.stop(now + FADE + 0.02); } catch { /* not started */ } }
    }
    live = [];
  }

  return {
    played,
    attach(context, master, buffer) {
      ctx = context;
      noiseBuf = buffer;
      dest = ctx.createGain();
      dest.gain.value = LEVEL;
      dest.connect(master);
    },
    stop,
    // every frame: id of the playing arrival (or null), the scene clock, whether the engine is audible
    step(id, st, audible, cardOf) {
      if (!ctx) return;
      if (id !== cur) {
        stop();
        cur = id;
        next = 0;
      }
      const cues = id && cardOf(id)?.cues;
      if (!cues) return;
      while (next < cues.length && cues[next][0] <= st) {
        // muted or suspended: the cue is spent (no burst on unmute), a stalled frame (a first-use compile) must not drop a cue, so one from the last 2.5 s still plays, late
        if (audible && st - cues[next][0] < 2.5) fire(cues[next][1], cues[next][2]);
        next++;
      }
      if (!audible) stop();
    },
  };
}
