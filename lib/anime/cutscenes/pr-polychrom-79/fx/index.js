// FX layer for pr-polychrom-79 (THE GATE OF BABYLON, Fate/Zero, ufotable crimson and gold). Layer 1.
// Modules (each isolated: one that throws is muted and the others keep playing), all in the seal-local frame G:
//   portals.js  90 near + 200 far swirl-disc portals, staggered arcs 2.3-5.3 s, glints at emergence, close 14.8-17 s
//   volley.js   weapon trails (launch on ones), impact sparks, glints; Gae Bolg red spear 5.0 s
//   gate.js     Key of the Heavens halo and glints, Bab-ilu vault gate with red circuits and the opening (6.6-10.4 s)
//   enuma.js    Ea segment sleeves (3 -> 12 turns/s), red spiral wind (48 frames at 21.17 s), space-crack dome
//   easter.js   Holy Grail, Enkidu chains, 16 hilts 16 -> 0, DNA ring pair on the hem, god-ray sun anchor
//   finale.js   shatter shards (22.8 s), gold embers and motes
// Cue names: this layer is a pure function of the clock and uses the bible's seconds directly, so it works with or without scene.js beats.
// Reserved beats scene.js should fire (not built here): impact@21.17 (Enuma), speedlines@8.3 (volley), shock@21.17.
// Not here: impact frames and speed lines (scene.js beats), SFX lettering incl. the 'Hah' laugh (scene.sfx), the crimson grade and light-wrap (scene.look / post),
//   the weapons that slide out of portals, Key and Ea models, victims (cast), the sky and plateau (world).
import { shared, flareSet } from "./common.js";
import buildPortals from "./portals.js";
import buildVolley from "./volley.js";
import buildGate from "./gate.js";
import buildEnuma from "./enuma.js";
import buildEaster from "./easter.js";
import buildFinale from "./finale.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const G = new THREE.Group(); // seal-local frame, synced to the seal each update
  group.add(G);
  const U = shared();
  const S = { THREE, U, G, flares: flareSet(THREE, U), portals: [] };
  const mods = [];
  for (const [name, fn] of [["portals", buildPortals], ["volley", buildVolley], ["gate", buildGate], ["enuma", buildEnuma], ["easter", buildEaster], ["finale", buildFinale]]) {
    try { const m = fn(ctx, S); m.name = name; G.add(m.group); mods.push(m); } catch (e) { console.warn("[pr-polychrom-79 fx] " + name + " failed to build", e); }
  }
  let flareHandle = null;
  try { flareHandle = S.flares.finish(); G.add(flareHandle.mesh); } catch (e) { console.warn("[pr-polychrom-79 fx] flares failed to build", e); }
  const dead = new Set();
  const comp = (a, i) => (Array.isArray(a) ? a[i] : a["xyz"[i]]) || 0;

  return {
    group,
    update(t, dt, cue) {
      U.uT.value = cue.t; U.uTs.value = t; U.uAspect.value = cue.aspect || (ctx.aspect && ctx.aspect()) || 1.78;
      const s = ctx.seal || {};
      const a = s.at || (ctx.scene && ctx.scene.seal && ctx.scene.seal.at) || [0, 0, 0];
      G.position.set(comp(a, 0), comp(a, 1), comp(a, 2));
      G.rotation.y = s.yaw || 0;
      G.scale.setScalar(s.scale || 1);
      for (const m of mods) {
        if (dead.has(m)) continue;
        try { m.update(t, dt, cue); } catch (e) { dead.add(m); m.group.visible = false; console.warn("[pr-polychrom-79 fx] " + m.name + " muted", e); }
      }
    },
    dispose() {
      for (const m of mods) { try { m.dispose(); } catch { /* ignore */ } }
      if (flareHandle) { try { flareHandle.dispose(); } catch { /* ignore */ } }
    },
  };
}
