"use client";

// Synthesized sound, WebAudio only, no audio files, no dependency (howler
// sits in package.json unused). Mounted inside the Canvas by Scene.jsx.
//
// Everything is lazy: the AudioContext and the whole node graph are built on
// the first pointerdown/keydown/touchend, never before. From then on the
// engine reads live.seal / live.props / getUi() once a frame and schedules
// short-lived one-shot nodes for events; nothing is allocated in useFrame
// itself. See window.__sound for a headless probe hook.

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { JUMP_IN, SKIP_WINDOW, ZOOM_IN, ZOOM_OUT } from "../../lib/world/moments";
import { PLACES } from "../../lib/world/places";
import { getUi, live, useUi } from "../../lib/world/store";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Major pentatonic, one note per building, in PLACES order.
const NOTES = [392.0, 440.0, 523.25, 587.33, 659.26, 783.99, 880.0, 1046.5];
const NOTE = Object.fromEntries(PLACES.map((p, i) => [p.id, NOTES[i % NOTES.length]]));
const C6 = 1046.5;

const MAX_ONE_SHOTS = 10;

function makeNoiseBuffer(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// Everything below lives in one closure so no audio node is ever reachable
// from outside it. `frame()`/`unlock()`/`setSoundOn()`/`onVisibility()` are
// the only doors in.
function createEngine() {
  let ctx = null;
  let noiseBuf = null;
  let unlocked = false;
  let wantSound = true;
  let oneShots = 0;
  let lastParamT = -1;
  let duckUntil = 0; // tonal cues (pluck/chime/discovery) ducking the swish
  let suspendTimer;
  const bornAt = performance.now(); // for the JUMP_IN skip check below

  // graph nodes that later voices or the per-frame update need to reach
  let master, sparkleIn, swishFilter, swishGain, seaBaseGain;

  const counts = {
    thump: 0, pluck: 0, chime: 0, discovery: 0, squeak: 0, gulp: 0, knock: 0,
    stroke: 0, whoosh: 0, jumpin: 0, zoom: 0, tick: 0,
  };
  const openedOnce = new Set();
  const propHit = new WeakMap();
  const propKnockT = new WeakMap();
  const pendingTimers = new Set(); // setTimeout ids for the JUMP_IN landing thump
  let prevImpact = 0;
  let prevNear = null;
  let prevOpen = null;
  let prevSqueak = 0;
  let prevGulp = 0;
  let prevStroke = 0;
  let prevWhoosh = false;
  let prevStarted = false;

  // ---------- primitives ----------
  function noiseSrc(rate = 1) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    if (rate !== 1) src.playbackRate.value = rate;
    src.start(ctx.currentTime, Math.random() * 1.8); // different offsets so loops don't correlate
    return src;
  }

  function biquad(type, freq, Q) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (Q != null) f.Q.value = Q;
    return f;
  }

  function sendToSparkle(node, amount) {
    const send = ctx.createGain();
    send.gain.value = amount;
    node.connect(send);
    send.connect(sparkleIn);
    return send;
  }

  // One-shot bookkeeping: a voice reserves a slot for roughly its own
  // duration and is simply skipped once 10 are in flight.
  function beginVoice(duration) {
    if (oneShots >= MAX_ONE_SHOTS) return false;
    oneShots++;
    setTimeout(() => {
      oneShots = Math.max(0, oneShots - 1);
    }, duration * 1000 + 60);
    return true;
  }

  function disconnectOnEnded(source, extra = []) {
    source.addEventListener(
      "ended",
      () => {
        try {
          source.disconnect();
        } catch {
          /* already disconnected */
        }
        for (const n of extra) {
          try {
            n.disconnect();
          } catch {
            /* already disconnected */
          }
        }
      },
      { once: true },
    );
  }

  function toneBurst(t0, type, freq, duration, peak) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.008, duration / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
    disconnectOnEnded(osc, [g]);
  }

  function noiseBurst(t0, filterType, freq, Q, duration, peak) {
    const src = noiseSrc();
    const filt = biquad(filterType, freq, Q);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.006, duration / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.stop(t0 + duration + 0.03);
    disconnectOnEnded(src, [filt, g]);
  }

  // ---------- graph ----------
  function buildGraph() {
    master = ctx.createGain();
    master.gain.value = 0.32;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 12;
    compressor.ratio.value = 3.5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.2;
    master.connect(compressor);
    compressor.connect(ctx.destination);

    // sparkle: a short slapback delay with a dark feedback loop
    sparkleIn = ctx.createGain();
    sparkleIn.gain.value = 1;
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.19;
    const fbFilter = biquad("lowpass", 3500);
    const fbGain = ctx.createGain();
    fbGain.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    sparkleIn.connect(delay);
    delay.connect(fbFilter);
    fbFilter.connect(fbGain);
    fbGain.connect(delay);
    delay.connect(wet);
    wet.connect(master);

    // swish: the belly on snow
    const swishSrc = noiseSrc();
    swishFilter = biquad("bandpass", 500, 0.9);
    const swishLow = biquad("lowpass", 2400);
    swishGain = ctx.createGain();
    swishGain.gain.value = 0;
    swishSrc.connect(swishFilter);
    swishFilter.connect(swishLow);
    swishLow.connect(swishGain);
    swishGain.connect(master);

    // wind
    const windSrc = noiseSrc(0.5);
    const windFilter = biquad("lowpass", 380);
    const windGain = ctx.createGain();
    windGain.gain.value = 0.035;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    const windLfo = ctx.createOscillator();
    windLfo.type = "sine";
    windLfo.frequency.value = 0.07;
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 0.015;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windGain.gain);
    windLfo.start();

    // sea: swells louder near the shore
    const seaSrc = noiseSrc();
    const seaFilter = biquad("bandpass", 260, 0.6);
    seaBaseGain = ctx.createGain();
    seaBaseGain.gain.value = 0.02;
    const seaSwell = ctx.createGain();
    seaSwell.gain.value = 1;
    seaSrc.connect(seaFilter);
    seaFilter.connect(seaBaseGain);
    seaBaseGain.connect(seaSwell);
    seaSwell.connect(master);
    const seaLfo = ctx.createOscillator();
    seaLfo.type = "sine";
    seaLfo.frequency.value = 0.11;
    const seaLfoGain = ctx.createGain();
    seaLfoGain.gain.value = 0.5;
    seaLfo.connect(seaLfoGain);
    seaLfoGain.connect(seaSwell.gain);
    seaLfo.start();
  }

  // ---------- voices ----------
  function playThump(m) {
    if (!beginVoice(0.3)) return;
    counts.thump++;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, t0);
    osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.45 * m, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.3);
    disconnectOnEnded(osc, [g]);

    noiseBurst(t0, "lowpass", 700, null, 0.1, 0.25 * m); // the snow crunch
  }

  function pluckTone(note, delaySec = 0) {
    if (!beginVoice(0.42 + delaySec)) return;
    counts.pluck++;
    const t0 = ctx.currentTime + delaySec;
    duckUntil = Math.max(duckUntil, t0 + 0.35);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(note * 1.5, t0);
    osc.frequency.exponentialRampToValueAtTime(note, t0 + 0.025);
    const lp = biquad("lowpass", 3000);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
    osc.connect(lp);
    lp.connect(g);
    g.connect(master);
    const send = sendToSparkle(g, 0.3);
    osc.start(t0);
    osc.stop(t0 + 0.42);
    disconnectOnEnded(osc, [g, lp, send]);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = note * 2;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.linearRampToValueAtTime(0.16 / 3, t0 + 0.004);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
    osc2.connect(g2);
    g2.connect(master);
    const send2 = sendToSparkle(g2, 0.3);
    osc2.start(t0);
    osc2.stop(t0 + 0.42);
    disconnectOnEnded(osc2, [g2, send2]);
  }

  function playPluck(placeId) {
    const note = NOTE[placeId];
    if (note) pluckTone(note);
  }

  function playPartial(freq, peak, decay, delaySec) {
    const t0 = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
    osc.connect(g);
    g.connect(master);
    const send = sendToSparkle(g, 0.5);
    osc.start(t0);
    osc.stop(t0 + decay + 0.05);
    disconnectOnEnded(osc, [g, send]);
  }

  function bell(f, delaySec, peak) {
    playPartial(f, peak, 1.4, delaySec);
    playPartial(f * 2.76, peak * 0.3, 0.7, delaySec);
    playPartial(f * 5.4, peak * 0.1, 0.35, delaySec);
  }

  function playChime(placeId) {
    const f = NOTE[placeId];
    if (!f || !beginVoice(1.6)) return;
    counts.chime++;
    duckUntil = ctx.currentTime + 0.35;
    bell(f, 0, 0.18);
    bell(f * 1.5, 0.11, 0.18);
  }

  function playDiscovery(placeId) {
    const f = NOTE[placeId];
    if (!f || !beginVoice(1.7)) return;
    counts.discovery++;
    duckUntil = ctx.currentTime + 0.35;
    bell(f, 0, 0.14);
    bell(f * 1.26, 0.075, 0.14);
    bell(f * 1.5, 0.15, 0.14);
    bell(f * 2, 0.225, 0.14);
  }

  function fireSqueakChirp(delaySec, b) {
    const t0 = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(b, t0);
    osc.frequency.linearRampToValueAtTime(b * 1.6, t0 + 0.05);
    osc.frequency.linearRampToValueAtTime(b * 1.15, t0 + 0.14);
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 32;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.04 * b;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.09, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.19);
    lfo.start(t0);
    lfo.stop(t0 + 0.19);
    disconnectOnEnded(osc, [g]);
    disconnectOnEnded(lfo, [lfoGain]);
    return b;
  }

  function playSqueak() {
    if (!beginVoice(0.35)) return;
    counts.squeak++;
    const b = fireSqueakChirp(0, 1250 * (0.85 + Math.random() * 0.3));
    if (Math.random() < 0.35) fireSqueakChirp(0.12, b * 1.1);
  }

  function sweepTone(t0, f0, f1, duration, peak) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.linearRampToValueAtTime(f1, t0 + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.01, duration / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
    disconnectOnEnded(osc, [g]);
  }

  function playGulp() {
    if (!beginVoice(0.65)) return;
    counts.gulp++;
    const t0 = ctx.currentTime;
    sweepTone(t0, 320, 130, 0.11, 0.18);
    sweepTone(t0 + 0.1, 240, 110, 0.09, 0.14);
    pluckTone(C6, 0.22); // the reward
  }

  const KNOCKS = {
    snowball: (h) => noiseBurst(ctx.currentTime, "lowpass", 600, null, 0.07, 0.2 * h), // pmf
    crate: (h) => {
      const t0 = ctx.currentTime;
      toneBurst(t0, "triangle", 190, 0.09, 0.22 * h);
      toneBurst(t0, "triangle", 470, 0.05, 0.22 * h);
      noiseBurst(t0, "lowpass", 1500, null, 0.03, 0.22 * h);
    },
    beachball: (h) => {
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, t0);
      osc.frequency.linearRampToValueAtTime(300, t0 + 0.22);
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 9;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 12;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.2 * h, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.24);
      lfo.start(t0);
      lfo.stop(t0 + 0.24);
      disconnectOnEnded(osc, [g]);
      disconnectOnEnded(lfo, [lfoGain]);
    }, // boing
    ring: (h) => {
      const t0 = ctx.currentTime;
      toneBurst(t0, "sine", 150, 0.12, 0.16 * h);
      noiseBurst(t0, "lowpass", 1200, null, 0.04, 0.05 * h); // the rubber bop
    },
    fish: (h) => noiseBurst(ctx.currentTime, "bandpass", 900, 1.5, 0.06, 0.14 * h), // splat
  };

  function playKnock(kind, h) {
    const fn = KNOCKS[kind];
    if (!fn || !beginVoice(0.25)) return;
    counts.knock++;
    fn(h);
  }

  function playStroke(speed) {
    if (!beginVoice(0.08)) return;
    counts.stroke++;
    noiseBurst(ctx.currentTime, "bandpass", 1800, 0.7, 0.05, 0.035 * clamp(speed / 8.5, 0, 1));
  }

  function playWhoosh() {
    if (!beginVoice(0.5)) return;
    counts.whoosh++;
    const t0 = ctx.currentTime;
    const src = noiseSrc();
    const filt = biquad("bandpass", 500, 1.2);
    filt.frequency.setValueAtTime(500, t0);
    filt.frequency.linearRampToValueAtTime(2600, t0 + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.1, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.stop(t0 + 0.48);
    disconnectOnEnded(src, [filt, g]);
  }

  // The big rising whoosh + landing thump for JUMP_IN, timed off the shared
  // clock in lib/world/moments.js so it lands on the same beat as the
  // camera swoop and the seal's hop: swells to a peak at hopAt, the thump
  // (a softer version of the collision thump) fires at landAt.
  function playJumpInWhoosh() {
    const t0 = ctx.currentTime;
    const peakAt = t0 + JUMP_IN.hopAt;
    const endAt = t0 + JUMP_IN.landAt;
    duckUntil = Math.max(duckUntil, endAt);

    const src = noiseSrc();
    const filt = biquad("bandpass", 180, 1.0);
    filt.frequency.setValueAtTime(180, t0);
    filt.frequency.exponentialRampToValueAtTime(2800, peakAt);
    filt.frequency.exponentialRampToValueAtTime(1400, endAt);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.26, peakAt);
    g.gain.exponentialRampToValueAtTime(0.0001, endAt);
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.stop(endAt + 0.05);
    disconnectOnEnded(src, [filt, g]);

    const osc = ctx.createOscillator(); // sub-riser for weight
    osc.type = "sine";
    osc.frequency.setValueAtTime(55, t0);
    osc.frequency.exponentialRampToValueAtTime(180, peakAt);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(0.16, peakAt);
    og.gain.exponentialRampToValueAtTime(0.0001, endAt);
    osc.connect(og);
    og.connect(master);
    osc.start(t0);
    osc.stop(endAt + 0.05);
    disconnectOnEnded(osc, [og]);
  }

  function playJumpIn() {
    if (!beginVoice(JUMP_IN.duration)) return;
    counts.jumpin++;
    playJumpInWhoosh();
    const landDelayMs = (JUMP_IN.landAt - JUMP_IN.whooshAt) * 1000;
    const id = setTimeout(() => {
      pendingTimers.delete(id);
      if (ctx && ctx.state === "running") playThump(0.55); // softer than a collision
    }, landDelayMs);
    pendingTimers.add(id);
  }

  // ZOOM_IN/ZOOM_OUT: a soft whoosh when a panel opens, and the same sound
  // played with a reversed sweep and envelope when it closes.
  function playZoomWhoosh(dir, duration) {
    if (!beginVoice(duration)) return;
    counts.zoom++;
    const t0 = ctx.currentTime;
    const src = noiseSrc();
    const filt = biquad("bandpass", dir > 0 ? 400 : 2200, 1.1);
    if (dir > 0) {
      filt.frequency.setValueAtTime(400, t0);
      filt.frequency.exponentialRampToValueAtTime(2200, t0 + duration);
    } else {
      filt.frequency.setValueAtTime(2200, t0);
      filt.frequency.exponentialRampToValueAtTime(400, t0 + duration);
    }
    const g = ctx.createGain();
    const peakAt = t0 + duration * (dir > 0 ? 0.35 : 0.75); // reversed: slow build, fast cutoff
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.09, peakAt);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.stop(t0 + duration + 0.05);
    disconnectOnEnded(src, [filt, g]);
  }

  // A crisp tick for HUD buttons, fired from a capture-phase click listener
  // in the component below (Sound.jsx owns no HUD markup to hang this off).
  function playTick() {
    if (!ctx || ctx.state !== "running") return;
    if (!beginVoice(0.06)) return;
    counts.tick++;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(1800, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.05, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.05);
    disconnectOnEnded(osc, [g]);
  }

  // ---------- per-frame ----------
  function frame() {
    const audible = Boolean(ctx) && ctx.state === "running";
    const now = ctx ? ctx.currentTime : 0;
    const ui = getUi();
    const seal = live.seal;
    const throttle = seal.throttle ?? 0;
    const skid = seal.skid ?? 0;

    if (audible && now - lastParamT >= 0.05) {
      lastParamT = now;
      const glide = throttle === 0 ? 0.85 : 1;
      const duck = now < duckUntil ? 0.5 : 1;
      swishFilter.frequency.setTargetAtTime((500 + 90 * seal.speed + 900 * skid) * glide, now, 0.06);
      swishGain.gain.setTargetAtTime((0.14 * smoothstep(0.4, 9, seal.speed) + 0.12 * skid) * duck, now, 0.06);

      const dist = Math.hypot(seal.x, seal.z);
      seaBaseGain.gain.setTargetAtTime(0.02 + 0.06 * smoothstep(26, 38, dist), now, 0.06);
    }

    const impact = seal.impact ?? 0;
    if (audible && impact - prevImpact >= 0.12) playThump(impact);
    prevImpact = impact;

    // JUMP_IN plays only when started turns true from a real button press,
    // never from ?play/?spawn= snapping straight to the follow camera
    // within SKIP_WINDOW of this engine's own construction (moments.js).
    if (ui.started && !prevStarted) {
      const elapsed = (performance.now() - bornAt) / 1000;
      if (audible && elapsed > SKIP_WINDOW) playJumpIn();
    }
    prevStarted = ui.started;

    if (audible && ui.near && ui.near !== prevNear) playPluck(ui.near);
    prevNear = ui.near;

    if (ui.open !== prevOpen) {
      if (ui.open) {
        const firstTime = !openedOnce.has(ui.open);
        if (firstTime) openedOnce.add(ui.open);
        if (audible) {
          if (firstTime) playDiscovery(ui.open);
          else playChime(ui.open);
          playZoomWhoosh(1, ZOOM_IN.duration);
        }
      } else if (audible) {
        playZoomWhoosh(-1, ZOOM_OUT.duration);
      }
      prevOpen = ui.open;
    }

    const squeak = live.squeak ?? 0;
    if (audible && squeak !== prevSqueak) playSqueak();
    prevSqueak = squeak;

    const gulp = live.gulp ?? 0;
    if (audible && gulp !== prevGulp) playGulp();
    prevGulp = gulp;

    for (const p of live.props || []) {
      const hit = p.hit ?? 0;
      const last = propHit.get(p) ?? 0;
      propHit.set(p, hit);
      if (p.kind === "penguin") continue; // it squeaks instead
      if (audible && hit - last >= 0.1) {
        const lastT = propKnockT.get(p) ?? -Infinity;
        if (now - lastT >= 0.12) {
          playKnock(p.kind, hit);
          propKnockT.set(p, now);
        }
      }
    }

    const stroke = live.stroke ?? 0;
    if (audible && stroke !== prevStroke && seal.speed > 1) playStroke(seal.speed);
    prevStroke = stroke;

    const whooshActive = Boolean(live.boost) && Boolean(throttle) && seal.speed > 3;
    if (audible && whooshActive && !prevWhoosh) playWhoosh();
    prevWhoosh = whooshActive;
  }

  // ---------- lifecycle ----------
  function setMuted(muted) {
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    if (muted) {
      master.gain.linearRampToValueAtTime(0.0001, now + 0.15);
      clearTimeout(suspendTimer);
      suspendTimer = setTimeout(() => {
        if (!wantSound && ctx && ctx.state === "running") ctx.suspend();
      }, 160);
    } else {
      clearTimeout(suspendTimer);
      if (ctx.state === "suspended" && !document.hidden) ctx.resume();
      master.gain.linearRampToValueAtTime(0.32, now + 0.15);
    }
  }

  function unlock() {
    if (!unlocked) {
      unlocked = true;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx = new Ctx();
      noiseBuf = makeNoiseBuffer(ctx);
      buildGraph();
      if (!wantSound) {
        master.gain.value = 0.0001;
        ctx.suspend();
      }
    }
    if (wantSound && !document.hidden && ctx.state !== "running") return ctx.resume();
  }

  function dispose() {
    clearTimeout(suspendTimer);
    for (const id of pendingTimers) clearTimeout(id);
    pendingTimers.clear();
    ctx?.close();
    ctx = null;
    unlocked = false;
  }

  function setSoundOn(on) {
    wantSound = on;
    if (ctx) setMuted(!on);
  }

  function onVisibility() {
    if (!ctx) return;
    if (document.hidden) {
      if (ctx.state === "running") ctx.suspend();
    } else if (wantSound && ctx.state === "suspended") {
      ctx.resume();
    }
  }

  function state() {
    return ctx ? ctx.state : "locked";
  }

  return { unlock, dispose, setSoundOn, onVisibility, frame, state, counts, tick: playTick };
}

export default function Sound() {
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = createEngine();
  const sound = useUi((s) => s.sound);

  useEffect(() => {
    const engine = engineRef.current;
    const opts = { capture: true, passive: true };
    function removeListeners() {
      window.removeEventListener("pointerdown", onGesture, opts);
      window.removeEventListener("keydown", onGesture, opts);
      window.removeEventListener("touchend", onGesture, opts);
    }
    function onGesture() {
      // A touch pointerdown doesn't count as a user gesture, so resume()
      // stays pending until the touchend that follows resolves it. Keep
      // listening across that gap instead of unlocking once and going deaf.
      engine.unlock()?.then(() => {
        if (engine.state() === "running") removeListeners();
      });
    }
    window.addEventListener("pointerdown", onGesture, opts);
    window.addEventListener("keydown", onGesture, opts);
    window.addEventListener("touchend", onGesture, opts);

    // A crisp tick on every HUD button, capture-phase so it always fires at
    // full volume even when the same click also mutes sound.
    function onHudClick(e) {
      if (e.target.closest?.(".hud button")) engine.tick();
    }
    window.addEventListener("click", onHudClick, opts);

    function onVisibility() {
      engine.onVisibility();
    }
    document.addEventListener("visibilitychange", onVisibility);

    window.__sound = { state: engine.state, counts: engine.counts };

    return () => {
      removeListeners();
      window.removeEventListener("click", onHudClick, opts);
      document.removeEventListener("visibilitychange", onVisibility);
      engine.dispose();
      delete window.__sound;
    };
  }, []);

  useEffect(() => {
    engineRef.current.setSoundOn(sound);
  }, [sound]);

  useFrame(() => {
    engineRef.current.frame();
  });

  return null;
}
