// WORLD layer for pr-polychrom-79 (Fate/Zero, the Gate of Babylon). Crimson sky, 90 instanced portals, the Fountain island under
// the open Gate. Files: sky.js (painted domes), portals.js (the portal field), stage.js (island, temple, gate, eggs).
//
// Three baked domes, swapped on the shot boundaries so the plate re-bakes cleanly:
//   crimson  (< ea)        shots 1-5   painted streaks, bright core, ~200 far portals
//   dark     (ea..shatter) shots 6-7   red-black for Ea and Enuma Elish
//   calm     (>= shatter)  shot 8      the island's pale snow sky
//
// CUES READ (names are free; each falls back to the bible's time when scene.beats does not carry it):
//   portals 2.29  the arcs start opening (portal 0 opens 0.9 s earlier: shot 2's first ripple)
//   key     7.21  Key of the Heavens turns: circuits spread over 0.7 s, the doors swing from +0.6 s, light spills
//   ea      14.0  red-black dome, portals dim
//   enuma   21.17 portals gone, red mono
//   shatter 23.0  home sky, snow and gold motes; portals, grail and chains removed
//   grail 2.3, chains 3.0, hilts 14.0 (easter eggs; the 16 hilts fade 0.28 s apart)
// Exposes ctx.worldData = { portals: [{ pos, normal, r, layer, delay (absolute s) }], T } so cast/fx can aim weapon emergence
// and lens flares at the real portals (a read-only convention; cast/fx must tolerate its absence).
import { buildPortals } from "./portals.js";
import { buildStage } from "./stage.js";
import { SKY_CALM, SKY_CRIMSON, SKY_DARK } from "./sky.js";

const FALLBACK = { portals: 2.29, key: 7.21, ea: 14.0, enuma: 21.17, shatter: 23.0, grail: 2.3, chains: 3.0, hilts: 14.0 };
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const beats = ctx.scene.beats ?? [];
  const T = {};
  for (const k of Object.keys(FALLBACK)) T[k] = beats.find((b) => b.name === k)?.t ?? FALLBACK[k];

  // the domes: az over the full circle, el from just under the horizon to near the zenith; the plate re-bakes on shot change
  const win = { az: [-Math.PI, Math.PI], el: [-0.45, 1.5] };
  const domeA = ctx.bake.sky(SKY_CRIMSON, { ...win, pxPerRad: 420 });
  const domeR = ctx.bake.sky(SKY_DARK, { ...win, pxPerRad: 300 });
  const domeB = ctx.bake.sky(SKY_CALM, { ...win, pxPerRad: 200 });
  group.add(domeA, domeR, domeB);

  const portals = buildPortals(ctx);
  group.add(portals.mesh);
  for (const d of portals.data) d.delay += T.portals;
  ctx.worldData = { portals: portals.data, T };

  const stage = buildStage(ctx, T, portals.data);
  group.add(stage.stat, stage.dyn);

  const apply = (t) => {
    const after = t >= T.shatter, dark = t >= T.ea && !after;
    domeA.visible = !after && !dark; domeR.visible = dark; domeB.visible = after;
    const ea = sm((t - T.ea) / Math.max(0.01, T.enuma - T.ea));
    const gone = sm((t - T.enuma) / 0.6);
    const gain = (1 - 0.6 * ea) * (1 - gone);
    portals.mesh.visible = !after && gain > 0.01;
    portals.uniforms.uClock.value = t - T.portals;
    portals.uniforms.uT.value = t;
    portals.uniforms.uGain.value = gain;
    stage.update(t, { key: T.key, portals: T.portals, chains: T.chains, hilts: T.hilts, grail: T.grail, after, dim: ea });
  };
  apply(0);

  return {
    group,
    update(t) { apply(t); },
    dispose() {
      portals.dispose(); stage.dispose();
      for (const d of [domeA, domeR, domeB]) { d.userData.target?.dispose(); d.material.dispose(); d.geometry.dispose(); }
    },
  };
}
