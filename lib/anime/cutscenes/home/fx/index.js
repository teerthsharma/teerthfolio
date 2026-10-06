// FX layer for home (Vinland Saga, "You have no enemies"): a calm dock. No impact frames, no shake, no speed lines.
// One file per element; each is built and updated inside its own try/catch so one broken effect mutes itself, not the rest.
//   bleed.js   wet-wash bleed (open) + Thors's pigment bloom
//   water.js   wake arms, rings, rain ripples, the Vinland sun-glint, the orca tilt smear
//   flames.js  eleven beacons: tongues, glow, embers, cairn key light
//   rain.js    rain streaks
//   runoff.js  the return run-off (columns of pigment lifting to paper; the seal exempt)
//   smoke.js   longhouse smoke, igloo steam, motes
//   sun.js     sun disc (bloom source) + one faint lens ghost
//   grade.js   dawn grade (warm lights, cool shadows)
// Cue names read from scene.beats (falling back to the bible's seconds): bleed, thorsbloom, smear, bloop, vinland, beacon (x11), rain, runoff.
import bleed from "./bleed.js";
import water from "./water.js";
import flames from "./flames.js";
import rain from "./rain.js";
import runoff from "./runoff.js";
import smoke from "./smoke.js";
import sun from "./sun.js";
import grade from "./grade.js";

const PARTS = [["sun", sun], ["smoke", smoke], ["water", water], ["flames", flames], ["rain", rain], ["bleed", bleed], ["runoff", runoff], ["grade", grade]];

export default function build(ctx) {
  const group = new ctx.THREE.Group();
  const live = [];
  for (const [name, fn] of PARTS) {
    try {
      const p = fn(ctx);
      group.add(p.group);
      live.push({ name, p, ok: true });
    } catch (e) {
      console.warn(`[home/fx] ${name} failed to build and is muted:`, e);
      ctx.player?.errors?.push?.(`home/fx/${name}: ${e.message}`);
    }
  }
  return {
    group,
    update(t, dt, cue) {
      for (const l of live) {
        if (!l.ok) continue;
        try { l.p.update(t, dt, cue); } catch (e) { l.ok = false; l.p.group.visible = false; console.warn(`[home/fx] ${l.name} muted:`, e); }
      }
    },
    dispose() { for (const l of live) { try { l.p.dispose(); } catch (e) { /* already gone */ } } },
  };
}
