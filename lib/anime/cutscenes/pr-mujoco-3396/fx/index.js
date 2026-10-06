// FX layer for pr-mujoco-3396 (THE WALLS WERE TITANS, in fresco). Layer 1.
// Modules (each returns {group, update(t,dt,cue), dispose}), isolated so one failure leaves the rest:
//   steam.js    E07 steam 3-tone cel puffs, sparks, crack dust, footfall dust
//   tendrils.js E09 path tendrils + pillar web, E16 crack glow
//   strike.js   E11 lightning + forks, dusk drop, ground flash and ring
//   sky.js      E13 ripple rings, sea wash, gulls
//   aura.js     aureole, cube spiral ribbons, blue cube trail
//   plaster.js  banner dust, craquelure, plaster flake wipe
// Cue names (windows fall back to the bible's seconds if scene.js does not fire them):
//   banner[0,1.25] crack[3.3,4.3] tendrils[4.08,4.92] dusk[6.4,6.8] strike[6.75,7.05] eat[7.7,10.3] gap[10.3,11.0]
//   cubeflight[10.33,10.83] gulls[10.92] craze[13.75,16.2] flake[16.25,19.25]
// Reserved beats (impact f28-31 / f162-165, speedlines, shock, trauma, pose) are fired by scene.js, not here.
// Not here (other layers / overlay): SFX lettering (scene.sfx), easter eggs 1-7 (cast and world), fresco post grade (scene.look).
import buildSteam from "./steam.js";
import buildTendrils from "./tendrils.js";
import buildStrike from "./strike.js";
import buildSky from "./sky.js";
import buildAura from "./aura.js";
import buildPlaster from "./plaster.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const sa = (ctx.scene && ctx.scene.seal && ctx.scene.seal.at) || [0, 0, 0];
  const O = [sa[0], sa[1], sa[2]];
  const mods = [];
  for (const [name, fn] of [["steam", buildSteam], ["tendrils", buildTendrils], ["strike", buildStrike], ["sky", buildSky], ["aura", buildAura], ["plaster", buildPlaster]]) {
    try { const m = fn(ctx, O); m.name = name; group.add(m.group); mods.push(m); } catch (e) { console.warn("[pr-mujoco-3396 fx] " + name + " failed to build", e); }
  }
  const dead = new Set();
  // god-rays: sun behind the titans, drifting 0.4 deg/s (E14 shafts)
  const sun = ctx.engine && ctx.engine.sun;
  return {
    group,
    update(t, dt, cue) {
      if (sun && sun.set) { const a = (0.4 * Math.PI / 180) * t; sun.set(O[0] + 120 * Math.sin(a), O[1] + 70, O[2] - 400); }
      for (const m of mods) {
        if (dead.has(m)) continue;
        try { m.update(t, dt, cue); } catch (e) { dead.add(m); m.group.visible = false; console.warn("[pr-mujoco-3396 fx] " + m.name + " muted", e); }
      }
    },
    dispose() { for (const m of mods) { try { m.dispose(); } catch { /* ignore */ } } },
  };
}
