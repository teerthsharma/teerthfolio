/* global console, process */
// node lib/world/wild.check.mjs: the wild ring's laws (island plan section 2.11 and 6.1). Exit 0 when every law holds.
// A feature's rules run once its module exists; the report names which ran and which are not built yet.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CatmullRomCurve3, Vector3 } from "three";
import { DISTRICTS, ISLAND_RADIUS, NORTH_RIM, PLACES, dockPoint } from "./places.js";
import { FOUNTAIN_TRAVEL, FUTURE_Z, GEYSER, LAND_COLLIDERS, PATHS, onHighway } from "./land.js";
import { PEAK, PEAK_WORLD } from "./peak.js";
import { WHIRLPOOL, waterGap } from "./river.js";
import { HIDEOUT_WORLD, hideoutBlocked } from "./hideout.js";
import { heightAt } from "./terrain.js";
import { createSeal, stepSeal } from "./motion.js";
import { PHYSICS_COLLIDERS, WILD_COLLIDERS } from "./wild.js";
import { detail } from "./detail.js";
import { buildGroups } from "../../components/world/life/props-seed.js";
import { buildToys, solidProps } from "../../components/world/life/toys-seed.js";
import { buildFlock } from "../../components/world/life/penguins-seed.js";
import { COLONY } from "../../components/world/life/seals-seed.js";

const LAND_LITERAL = [
  [0, -92, 18, "triton"],
  [-18, -90, 14, "triton"],
  [20, -90, 14, "triton"],
  [-6, -80, 6, "triton"],
  [14, -77, 5, "triton"],
  [4, -79, 5, "triton"],
  [-48, -66, 11, "mujorush"],
  [-35, -67, 12, "mujorush"],
  [-22, -66, 11, "mujorush"],
  [-60, -58, 8, "mujorush"],
  [-56, -54.5, 4, "mujorush"],
  [-51, -54.5, 4, "mujorush"],
  [-46, -54.5, 4, "mujorush"],
  [-41, -54.5, 4, "mujorush"],
  [-36, -54.5, 4, "mujorush"],
  [-31, -54.5, 4, "mujorush"],
  [-26, -54.5, 4, "mujorush"],
  [-21, -54.5, 4, "mujorush"],
  [-16, -54.5, 4, "mujorush"],
  [27, -74, 8, "google-range"],
  [49, -74, 8, "google-range"],
  [60, -62, 8, "google-range"],
  [72, -58, 9, "google-range"],
  [-13, -70, 5, "dam"],
  [-13, -62, 5, "dam"],
  [-13, -54, 5, "dam"],
  [-13, -46, 5, "dam"],
  [-12, -38, 5, "dam"],
  [-5, -34, 4.5, "dam"],
  [2, -35, 3.5, "dam"],
  [46, -30, 7.2, "moat"],
  [39.75, -19.17, 1.8, "moat"],
  [52.25, -19.17, 1.8, "moat"],
  [36.02, 82.9, 2, "fountain-wall"],
  [38.11, 79.29, 2, "fountain-wall"],
  [41.3, 76.61, 2, "fountain-wall"],
  [45.22, 75.18, 2, "fountain-wall"],
  [49.38, 75.18, 2, "fountain-wall"],
  [53.3, 76.61, 2, "fountain-wall"],
  [56.49, 79.29, 2, "fountain-wall"],
  [58.58, 82.9, 2, "fountain-wall"],
  [59.3, 87, 2, "fountain-wall"],
  [58.58, 91.1, 2, "fountain-wall"],
  [56.49, 94.71, 2, "fountain-wall"],
  [53.3, 97.39, 2, "fountain-wall"],
  [49.38, 98.82, 2, "fountain-wall"],
  [45.22, 98.82, 2, "fountain-wall"],
  [41.3, 97.39, 2, "fountain-wall"],
  [38.11, 94.71, 2, "fountain-wall"],
  [36.02, 91.1, 2, "fountain-wall"],
];
const PATHS_LITERAL = [
  [[0,7.2],[-10,7],[-10.5,0.5],[0,-2.2]],
  [[0,7.2],[10,7],[10.5,0.5],[0,-2.2]],
  [[10.5,0.5],[8,-8],[6,-15],[4,-19.4]],
  [[4,-19.4],[9,-21],[10.5,-30],[12.5,-37],[13,-42],[13.5,-48],[14,-55],[14,-61.4]],
  [[13.5,-50],[24,-53.5],[32,-56],[38,-58.9],[46,-53],[52,-48.8],[56,-45.2],[60,-43.9]],
  [[60,-43.9],[63,-38],[64,-30.75],[66.5,-24.5],[70,-20.6],[74,-20.4]],
  [[-10.5,0.5],[-9,-8],[-10.5,-15],[-12,-19.4]],
  [[-12,-19.4],[-17.5,-21.5],[-20.5,-32],[-22.5,-40.5],[-24,-45.2],[-29.5,-46.5],[-35,-45.4],[-40.5,-46.5],[-46,-45.4]],
  [[-17.5,-21.5],[-23,-18.8],[-28,-18.8],[-36,-19],[-44,-19.4]],
  [[10,7],[20,9.6],[31.5,9.6],[38,8],[39,0],[40,-6.9],[46,-4.5],[52,-6.9],[60,-8],[67,-14],[71.5,-19],[74,-20.4]],
  [[-10,7],[-20,5],[-33,2.1],[-47,6],[-60,10],[-72,9.6]],
  [[-4,12],[-14,24],[-26,36],[-42,39.6],[-58,43],[-75,45.6]],
  [[0,11],[3,36],[9,58],[10,72],[5,79],[0,78.6],[-14,80],[-28,76],[-40.5,69.6]],
  [[21,57],[17,72],[25.3,87],[38.3,87],[38.8,87],[41.7,90],[41.7,93.4],[47.3,93.4],[47.3,91.2]],
  [[4,12],[12,28],[12,44],[15,54],[21,57],[30,62],[38,70],[48,71.5],[55.5,69.4],[62.75,69],[70,68.4],[76,66],[81,63.6]],
  [[20,9.6],[32,13],[43.6,14.8],[60,20],[78,24.6]],
  [[78,24.6],[90,26],[102,26.6]],
  [[60,-43.9],[70,-46.2],[80,-47.4],[88,-48.2],[99.5,-46.4]],
];
const DETAIL_CASES = [[14, 0, 6], [14, 4, 18], [107, 0, 43], [107, 4, 134], [44, 0, 18], [44, 4, 55], [8, 4, 10], [240, 0, 96], [240, 4, 300], [1, 0, 1]];
const GROUND_IDS = ["shelf", "crevasse", "blueice", "nunatak", "sastrugi", "rookery", "hut", "delta", "meltlake", "bergs"];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const built = (id) => fs.existsSync(path.join(HERE, `${id}.js`));
const SEEDED = JSON.parse(fs.readFileSync(path.join(HERE, "wild.layout.json"), "utf8"));
const PLACE_CIRCLES = PLACES.map(({ x, z, radius }) => ({ x, z, radius }));
const PATH_PTS = PATHS.flatMap((wp) => new CatmullRomCurve3(wp.map(([x, z]) => new Vector3(x, 0, z))).getPoints(63).map((p) => [p.x, p.z]));
const LANDINGS = [...GEYSER.landings, WHIRLPOOL.throwTo, ...FOUNTAIN_TRAVEL.nodes.map((n) => n.land)];
const WORLD = { colliders: [...PLACE_CIRCLES, ...PHYSICS_COLLIDERS], radius: ISLAND_RADIUS, northRim: NORTH_RIM, props: [], hideout: HIDEOUT_WORLD, peak: PEAK_WORLD, places: PLACES, time: 0 };
const same3 = (a, b) => Math.round(a * 1000) === Math.round(b * 1000);

// How far (x, z) is inside the walkable rim (lib/world/motion.js collide): negative past it.
export function rimRoom(x, z) {
  const r = Math.hypot(x, z) || 1e-6;
  const north = Math.min(1, Math.max(0, (-z / r - 0.45) / 0.25));
  return ISLAND_RADIUS - north * (ISLAND_RADIUS - NORTH_RIM) - r;
}

// Every law of section 2.11 for one collider; returns the list of faults (empty when it is clear).
export function circleFaults(c) {
  const at = `${c.land} (${c.x}, ${c.z}) r${c.radius}`;
  const faults = [];
  const need = (ok, why) => {
    if (!ok) faults.push(`${at}: ${why}`);
  };
  const h = heightAt(c.x, c.z);
  need(rimRoom(c.x, c.z) - c.radius > 0.5, "not 0.5 m inside the walkable rim");
  need(c.z + c.radius < FUTURE_Z - 2, "reaches the cloud line");
  need(Math.abs(h) <= 0.3, `stands on ground ${h.toFixed(2)} m high`);
  for (const p of PLACES) {
    const d = Math.hypot(c.x - p.x, c.z - p.z);
    need(d >= p.radius + c.radius + 4, `${d.toFixed(1)} m from place ${p.id}`);
    const k = dockPoint(p);
    need(Math.hypot(c.x - k.x, c.z - k.z) >= 3 + c.radius, `on the dock of ${p.id}`);
  }
  for (const l of LAND_COLLIDERS) {
    const g = Math.hypot(c.x - l.x, c.z - l.z) - l.radius - c.radius;
    need(g >= 2.4, `${g.toFixed(1)} m from landform ${l.land} (${l.x}, ${l.z})`);
  }
  let pmin = Infinity;
  for (const [x, z] of PATH_PTS) pmin = Math.min(pmin, Math.hypot(c.x - x, c.z - z));
  need(pmin >= c.radius + 1.7, `${pmin.toFixed(1)} m from a path`);
  const wg = waterGap(c.x, c.z);
  need(wg >= 2 + c.radius, `water gap ${wg.toFixed(1)} m`);
  need(!onHighway(c.x, c.z), "on the highway");
  need(!hideoutBlocked(c.x, c.z), "in the Akatsuki hideout");
  for (const [x, z] of LANDINGS) need(Math.hypot(c.x - x, c.z - z) >= c.radius + 2, `within 2 m of landing (${x}, ${z})`);
  for (const i of SEEDED) {
    const d = Math.hypot(c.x - i.x, c.z - i.z);
    need(d >= c.radius + 1.5 + (i.t === "penguins" ? 3.5 : 0), `${d.toFixed(1)} m from seeded ${i.t} (${i.x}, ${i.z})`);
  }
  for (const d of DISTRICTS) need(Math.hypot(c.x - d.x, c.z - d.z) >= d.radius + c.radius, `inside district ${d.id}`);
  return faults;
}

// The 94 seeded items (props, toys, penguins, colony seals), rebuilt from the seed modules in baseline order.
export function rebuildSeeded() {
  const out = [];
  for (const [kind, list] of Object.entries(buildGroups())) for (const o of list) out.push({ t: `prop:${kind}`, x: o.x, z: o.z });
  for (const o of solidProps(buildToys())) out.push({ t: `toy:${o.kind}`, x: o.x, z: o.z });
  for (const o of buildFlock()) out.push({ t: "penguins", x: o.x, z: o.z, r: o.radius });
  for (const o of COLONY) out.push({ t: "colony", x: o.x, z: o.z });
  return out;
}

// A seal pushed in a fixed direction for `secs` (lib/world/motion.js, the physics the game runs at 120 steps a second).
function drive(x, z, dx, dz, secs, line = null) {
  const seal = createSeal(x, z);
  let minZ = Infinity;
  let crossX = null;
  for (let i = 0; i < secs * 120; i++) {
    stepSeal(seal, { input: { x: dx, z: dz } }, 1 / 120, WORLD);
    minZ = Math.min(minZ, seal.z);
    if (line !== null && crossX === null && seal.z < line) crossX = seal.x;
  }
  return { seal, minZ, crossX };
}

async function main() {
  const faults = [];
  const need = (ok, why) => {
    if (!ok) faults.push(why);
  };
  const ran = [];
  const missing = new Set();
  const wired = (land) => WILD_COLLIDERS.some((c) => c.land === land);
  const gate = (id, ok) => {
    if (!built(id)) missing.add(id);
    else if (!ok) missing.add(`${id} (built, not in WILD_COLLIDERS)`);
    return built(id) && ok;
  };

  for (const c of WILD_COLLIDERS) faults.push(...circleFaults(c));
  const wallCount = PEAK.top >= 3 ? 0 : LAND_COLLIDERS.filter((c) => c.land === "fountain-wall").length;
  need(PHYSICS_COLLIDERS.length === LAND_COLLIDERS.length - wallCount + WILD_COLLIDERS.length, "PHYSICS_COLLIDERS is not LAND_COLLIDERS (less the fountain wall while the peak is a cliff) plus WILD_COLLIDERS");

  need(JSON.stringify(LAND_COLLIDERS.map((c) => [c.x, c.z, c.radius, c.land])) === JSON.stringify(LAND_LITERAL), "LAND_COLLIDERS changed (freeze law L2)");
  need(JSON.stringify(PATHS) === JSON.stringify(PATHS_LITERAL), "PATHS changed (freeze law L2)");

  need(SEEDED.length === 94, `wild.layout.json holds ${SEEDED.length} items, not 94`);
  const rebuilt = rebuildSeeded();
  need(rebuilt.length === SEEDED.length, `seeded items rebuilt ${rebuilt.length}, wild.layout.json ${SEEDED.length}`);
  rebuilt.forEach((o, i) => {
    const s = SEEDED[i];
    if (s && (o.t !== s.t || !same3(o.x, s.x) || !same3(o.z, s.z) || (s.r !== undefined && !same3(o.r, s.r)))) faults.push(`seeded item ${i} (${o.t}) moved from wild.layout.json`);
  });

  for (const [base, tier, want] of DETAIL_CASES) need(detail(base, tier) === want, `detail(${base}, ${tier}) is ${detail(base, tier)}, want ${want}`);
  need(detail(14, null) === 14, "a missing tier must count as the base");

  if (built("shelf")) {
    ran.push("shelf margin");
    const { FRONT } = await import("./shelf.js");
    for (const [x, z] of FRONT) need(rimRoom(x, z) <= -2.5, `shelf point (${x}, ${z}) is only ${(-rimRoom(x, z)).toFixed(1)} m past the walkable rim`);
  } else missing.add("shelf");

  if (gate("crevasse", wired("crevasse"))) {
    ran.push("crevasse funnel");
    const bridge = drive(-81.7, -46, 0, -1, 3);
    need(bridge.seal.z < -54, `the crevasse bridge is shut: a seal pushed north from (-81.7, -46) stops at z ${bridge.seal.z.toFixed(1)}`);
    const funnel = drive(-88, -46, 0, -1, 6, -52.8);
    need(funnel.crossX !== null && funnel.crossX >= -83 && funnel.crossX <= -79.4, `crevasse funnel: a seal from (-88, -46) crosses z -52.8 at x ${funnel.crossX?.toFixed(1)}, want -83.0 to -79.4`);
    const wall = drive(-75.5, -46, 0, -1, 6, -52.8);
    need(wall.minZ >= -52.8, `crevasse funnel: a seal from (-75.5, -46) reaches z ${wall.minZ.toFixed(1)}`);
  }

  if (gate("delta", wired("delta"))) {
    ran.push("delta opening");
    const breach = drive(1, 80, 0, 1, 3);
    need(breach.seal.z > 88, `the delta opening is shut: a seal pushed south from (1, 80) stops at z ${breach.seal.z.toFixed(1)}`);
  }

  for (const id of GROUND_IDS) {
    if (!built(id)) {
      missing.add(id);
      continue;
    }
    const m = await import(`./${id}.js`);
    if (!m.GROUND_VERTS) continue;
    ran.push(`${id} decals`);
    for (const [x, y, z] of m.GROUND_VERTS) {
      const d = y - heightAt(x, z);
      need(d >= 0.03 - 1e-9 && d <= 0.12 + 1e-9, `${id} decal at (${x}, ${z}) is ${d.toFixed(3)} m above the ground, want 0.03 to 0.12`);
    }
  }

  if (built("sastrugi")) {
    ran.push("sastrugi ridges");
    const m = await import("./sastrugi.js");
    need(Array.isArray(m.RIDGES), "sastrugi.js exports no RIDGES (the ridge centres the wild colliders keep 3 m from)");
    for (const c of WILD_COLLIDERS)
      for (const { x, z } of m.RIDGES ?? []) need(Math.hypot(c.x - x, c.z - z) - c.radius >= 3, `${c.land} (${c.x}, ${c.z}) is within 3 m of a sastrugi ridge at (${x}, ${z})`);
  }

  if (built("rise")) {
    ran.push("rill feet");
    const { RISE } = await import("./rise.js");
    const fountain = DISTRICTS.find((d) => d.id === "fountain");
    for (const az of [140, 215]) {
      const a = (az * Math.PI) / 180;
      const fx = RISE.x + Math.cos(a) * RISE.edge;
      const fz = RISE.z + Math.sin(a) * RISE.edge;
      for (const d of DISTRICTS)
        if (d !== fountain) need(Math.hypot(fx - d.x, fz - d.z) >= d.radius + 1.6, `rill foot at ${az} degrees (${fx.toFixed(1)}, ${fz.toFixed(1)}) is inside district ${d.id}`);
    }
  } else missing.add("rise");

  if (built("regions")) {
    ran.push("region flatness");
    const { regionWeights } = await import("./regions.js");
    const o = {};
    let bad = 0;
    for (let x = -120; x <= 120; x++)
      for (let z = -120; z <= 120; z++) {
        regionWeights(x, z, o);
        if (o.blue + o.bend + o.sast + o.delta + o.lake + o.guano + o.rock > 0 && Math.abs(heightAt(x, z)) > 0.3) bad++;
      }
    need(bad === 0, `${bad} region grid points stand more than 0.3 m from y = 0`);
  } else missing.add("regions");

  for (const f of faults) console.log("FAIL", f);
  console.log(`checked: ${ran.join(", ") || "none"}; not run yet: ${[...missing].join(", ") || "none"}`);
  console.log(faults.length ? `${faults.length} FAILS` : `ALL CLEAR: ${WILD_COLLIDERS.length} wild colliders, ${SEEDED.length} seeded items, ${PATHS.flat().length} path points`);
  process.exitCode = faults.length ? 1 : 0;
}

await main();
