// FX layer for p-epsilon-hollow (FX agent): "Domain Expansion, Graveyard of Efforts" (Naruto: Itachi's Tsukuyomi, Susanoo blade, the hideout).
// Layer 1. Everything is opaque cel (the character-layer composite keeps a pixel only where alpha > 0.5 and depth beats the plate), values above 1 bloom,
// the seal is never covered (screen quad sits just behind it; particles are culled round the chest) and never emissive.
//
// WHAT THIS LAYER DRAWS (bible section 6 and 7, by file)
//   screenfx.js  Tsukuyomi wires (FX 3), anamorphic flare on the photon ring, the slash that opens onto the snow island (FX 7, egg 3),
//                the wedge wipe home (FX 9)
//   particles.js motes (FX 8), shard embers, the teal pour, PR glyph sparks (3.7, shot 9), the 27.0 stone break-away debris
//   ripple.js    the gold crack front, 40 m/s, 14.6-23.0 (FX 4)
//   blade.js     the shard's pale-and-gold contour and the 2-frame swing smear with the one purple frame (FX 6, egg 3)
//   this file    cue windows, composite tweaks (bloom swell 0-3 s, 1.4 spike at the slash, vignette 0.18), the 27.0 sakuga fallbacks
//
// CUES (free names, read here and by the cast/world layers; a scene.js beat with the same name overrides the default window `[t, t+dur]`):
//   wires 0.5-1.9 | flare 1.4-1.9 | pour 6.4-9.0 | embers 6.4-27.0 | ripple 14.6-23.0 | sparks 23.0-27.0 | swing 26.8-27.25 |
//   slash 27.0 | debris 27.0-28.6 | wipe 28.5-28.8 | motes 0-29.3 | glow 0-3 (bloom swell)
// Reserved beats (impact, shock, speedlines, trauma): if scene.js carries none near 27.0 this layer fires them itself through ctx.sakuga.
// OPTIONAL scene.js data: scene.fx = { eye: [x, y, R] (frame-height units, the eye's centre and limb), planetR: 170 }.
import { buildScreen } from "./screenfx.js";
import { motes, energy, sparks, debris } from "./particles.js";
import { ripple } from "./ripple.js";
import { blade } from "./blade.js";

const DEFAULTS = {
  wires: [0.5, 1.9], flare: [1.4, 1.9], pour: [6.4, 9.0], embers: [6.4, 27.0], ripple: [14.6, 23.0], sparks: [23.0, 27.0],
  swing: [26.8, 27.25], slash: [27.0, 28.5], debris: [27.0, 28.6], wipe: [28.5, 28.8], motes: [0, 29.3], glow: [0, 3],
};
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default function build(ctx) {
  const { THREE } = ctx, group = new THREE.Group();
  const beats = ctx.scene.beats ?? [];
  const T = {};
  for (const [n, [a, b]] of Object.entries(DEFAULTS)) { const bt = beats.find((x) => x.name === n); T[n] = bt ? [bt.t, bt.t + (bt.dur ?? b - a)] : [a, b]; }

  // 27.0 sakuga fallbacks, only when the direction layer did not place its own (the beats are pure functions of the clock; no double fire)
  const near = (name) => beats.some((b) => b.name === name && Math.abs(b.t - 27.0) < 0.3);
  if (!near("impact")) ctx.sakuga.impact(27.0); // f648 inverted two-tone
  if (!near("shock")) ctx.sakuga.shock({ t: 27.04, dur: 0.5, at: [0.5, 0.5], amp: 0.04, r1: 0.9 });
  if (!near("speedlines")) ctx.sakuga.speedLines({ t: 27.0, dur: 0.35, kind: "radial", at: [0.5, 0.5], strength: 0.8, col: "#0d0714" });
  const needTrauma = !near("trauma");

  const screen = buildScreen(ctx, T), mo = motes(ctx), en = energy(ctx, T), sp = sparks(ctx, T), de = debris(ctx, T), rp = ripple(ctx, T), bl = blade(ctx, T);
  group.add(screen.mesh, mo.obj, en.obj, sp.obj, de.obj, rp.obj, bl.obj);

  // composite tweaks: the composer's uniforms are restored on dispose
  const cu = ctx.engine.composer?.u, base = { bloom: cu?.uBloom?.value ?? 1, vig: cu?.uVig?.value ?? 0 };
  let prev = -1;

  return {
    group,
    update(_t, _dt, cue) {
      const T0 = cue.t; // display clock: edges, fades, wipes
      const ts2 = Math.floor(T0 * 12 + 1e-6) / 12; // FX on twos
      const ts3 = Math.floor(T0 * 8 + 1e-6) / 8; // motes on threes
      screen.update(T0);
      mo.update(ts3);
      en.update(ts2, ts2);
      sp.update(ts2, ts2);
      de.update(ts2, ts2);
      rp.update(ts2, ts2);
      bl.update(ts2, T0);

      if (cu) {
        // bloom: swell over 0-3 s (the eye opens), then 1.4 for 0.2 s at the slash; vignette 0.18 in the grade
        let b = base.bloom * (0.75 + 0.35 * sstep(T.glow[0], T.glow[1], T0));
        if (T0 >= 27.0 && T0 < 27.2) b = Math.max(base.bloom, 1.4);
        if (cu.uBloom) cu.uBloom.value = b;
        if (cu.uVig) cu.uVig.value = Math.max(base.vig, 0.18);
      }
      if (needTrauma && prev >= 0 && prev < 27.0 && T0 >= 27.0 && T0 - prev < 0.5) ctx.sakuga.trauma(0.5); // 6 px for 4 frames
      prev = T0;
    },
    dispose() {
      if (cu) { if (cu.uBloom) cu.uBloom.value = base.bloom; if (cu.uVig) cu.uVig.value = base.vig; }
      for (const o of [screen.mesh, mo.obj, sp.obj, de.obj]) o.userData?.dispose?.();
      en.obj.children.forEach((c) => c.userData?.dispose?.());
      rp.dispose(); bl.dispose();
    },
  };
}
