// WORLD layer for pr-pyrefly-4180 (Naruto, the Nine-Tails chained; kiri-e paper theatre). Layer 0 = the baked night dome;
// the paper stage (floor, six flats, haze, lamp, pillar) is layer 1 because it rises, glows and sinks.
//
// Story of the set (bible shots 1-7):
//   0.0  the stage lies FLAT on the floor under the night sky (shot 1, the island recedes below it)
//   1.21-2.29 the lamp rises behind the paper (shot 2) and the flats rise like a pop-up book, near to far, 36 frames
//   ... the burning village glows on the far card; haze drifts between the cards; the lamp breathes 4 %
//   22.1-22.79 the end pillar rises through the floor; at 22.79 the plaque flips (Konoha leaf, 100, 208)
//   22.8-23.8 the lamp dies (24 frames); 25.2-27.4 the stage is lowered through the floor; 25.8-27.6 the island sky wipes in
//
// CUES read (all optional; the absolute bible times are the fallback): flats-rise, lamp-up, lamp-die, plaque-flip, flats-lower, island.
// A cue's own start time wins once it has started, so direction may retime the beats without touching this file.
import { Group, Vector3 } from "three";
import { sharedUniformSet } from "./uniforms.js";
import { bakeNightDome, islandVeil } from "./sky.js";
import { buildFlats } from "./flats.js";
import { buildFloor, buildIsland, buildLamp, buildHaze, buildPillar } from "./stage.js";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const sstep = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const outBack = (x) => { x = clamp01(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;

// bible fallback times (s)
const T = { rise0: 0.9, riseDur: 0.9, riseStep: 0.12, lampUp: [1.21, 2.29], pillar: [22.1, 22.79], plaque: 22.79, lampDie: [22.8, 23.8], sink: [25.2, 27.4], island: [25.8, 27.6] };

export default function build(ctx) {
  const { engine, scene } = ctx;
  const group = new Group();
  const U = sharedUniformSet();

  // ---- layer 0: the baked night dome (burning Konoha horizon, smoke, stars, skyline)
  const dome = bakeNightDome(ctx);
  group.add(dome);

  // ---- layer 1: the island ground and the island sky veil (the end)
  const island = buildIsland(U);
  const veil = islandVeil(U);
  island.mesh.userData.layer = 1;
  group.add(island.mesh, veil);

  // ---- layer 1: the paper stage, which sinks as one group
  const stage = new Group(); stage.userData.layer = 1;
  const floor = buildFloor(U); stage.add(floor.mesh);
  const flats = buildFlats(U); stage.add(flats.group);
  const haze = buildHaze(U); stage.add(haze.group);
  // the end pillar stands ahead of the seal's FINAL position, to its right, so it never sits between lens and seal
  const mv = scene.seal?.moves ?? [];
  const last = mv.length ? mv[mv.length - 1] : null;
  const fin = new Vector3(...((last && last.to) || scene.seal?.at || [0, 0, 0]));
  const yaw = (last && last.yaw != null ? last.yaw : scene.seal?.yaw) ?? 0;
  const pillar = buildPillar(U);
  pillar.group.position.set(fin.x + Math.sin(yaw) * 6 + Math.cos(yaw) * 1.7, -4, fin.z + Math.cos(yaw) * 6 - Math.sin(yaw) * 1.7);
  pillar.group.rotation.y = yaw + Math.PI; // the plaque faces back toward the seal
  stage.add(pillar.group);
  group.add(stage);

  // ---- layer 1: the lamp behind the paper and its halo
  const lamp = buildLamp(U);
  lamp.mesh.userData.layer = 1;
  group.add(lamp.mesh);
  const lampWorld = new Vector3(0, 0, -42);

  const start = (cue, name, fb) => { const s = cue.since ? cue.since(name) : Infinity; return Number.isFinite(s) ? cue.t - s : fb; };

  function update(t, dt, cue) {
    U.uT.value = t;
    // lamp: up in shot 2, breathes 4 %, dies over 24 frames in shot 7
    const up0 = start(cue, "lamp-up", T.lampUp[0]), up1 = up0 + (T.lampUp[1] - T.lampUp[0]);
    const dn0 = start(cue, "lamp-die", T.lampDie[0]), dn1 = dn0 + (T.lampDie[1] - T.lampDie[0]);
    const rise = sstep((t - up0) / (up1 - up0));
    const breathe = 1 + 0.04 * Math.sin(t * 2.4);
    const lampOn = rise * (1 - sstep((t - dn0) / (dn1 - dn0)));
    U.uLamp.value = lampOn * breathe;
    lampWorld.set(0, lerp(-2, 20, rise), -42);
    lamp.mesh.position.copy(lampWorld);
    U.uLampPos.value.copy(lampWorld);
    engine.sun = lampOn > 0.05 ? lampWorld : null; // light shafts from the lamp

    // flats: lying until their turn, then hinge up near to far with a small overshoot, then a puppet-card sway
    const f0 = start(cue, "flats-rise", T.rise0);
    for (const p of flats.panels) {
      const k = (t - (f0 + p.layer * T.riseStep)) / T.riseDur;
      const e = k <= 0 ? 0 : Math.min(1.04, outBack(k));
      const sway = k >= 1 ? 0.004 * Math.sin(t * 3 + p.layer * 1.7 + p.idx) : 0;
      p.hinge.rotation.x = -(Math.PI / 2) * (1 - e) + sway;
    }

    // the pillar rises through the floor, the plaque flips with a clack overshoot
    const pl0 = start(cue, "plaque-flip", T.plaque);
    const pr = sstep((t - (pl0 - (T.plaque - T.pillar[0]))) / (T.pillar[1] - T.pillar[0]));
    pillar.group.position.y = lerp(-4, 0, pr);
    const fl = clamp01((t - pl0) / 0.45);
    pillar.hinge.rotation.y = Math.PI * (1 - (fl <= 0 ? 0 : outBack(fl)));

    // the stage is lowered through the floor, the island sky wipes in behind it
    const s0 = start(cue, "flats-lower", T.sink[0]);
    stage.position.y = -4.5 * sstep((t - s0) / (T.sink[1] - T.sink[0]));
    const i0 = start(cue, "island", T.island[0]);
    U.uIsland.value = sstep((t - i0) / (T.island[1] - T.island[0]));
  }

  return {
    group, update,
    dispose() {
      engine.sun = null;
      dome.userData.target?.dispose(); dome.material.dispose(); dome.geometry.dispose();
      veil.material.dispose(); veil.geometry.dispose();
      island.dispose(); floor.dispose(); flats.dispose(); haze.dispose(); lamp.dispose(); pillar.dispose();
    },
  };
}
