// WORLD layer for spawn-seal (Tensura: the Sealed Cave, then the island). Everything environmental, painted and 3D. Written by the WORLD agent.
//
// SET (units m; seal on the plinth at scene.seal.at, +z forward, the arch at -z):
//   far plate (screen-space void / dusk sky)  -> mouth panorama card (burning battlefield seen through the arch, hard aperture)
//   cave: chiselled facet rock, inked creases, cross-hatch shadows, strata, stalactites, rubble   (layer 0)
//   pool: posterised water, caustic polygons, PLOP + morph + touch rings (layer 1)  | rim stones + plinth (layer 0)
//   7 crystal NODES (ignite gold, layer 1) + decor clusters (layer 0)
//   Veldora's barrier sphere with the gold eye (layer 1)  | Megiddo lenses and beam cones (layer 1)
//   topology lattice: edges, triangles, the loop, three territories, great circles (layer 1)
//   dust motes and indigo mist (layer 1)  | the home island: grass, plaza, trees, mountains (layer 0, shot 12 only)
//   the Predator's eating: a growing void sphere (uEat) inside every world shader, centred 7.4 m behind and above the seal; the seal's ground stays whole.
//
// CUES READ (each falls back to the bible's seconds when the direction layer defines no such beat): plop, veldora_eye, morph, lenses, beams, lattice,
// loop, territories, touch, cool, maw, home. The `home` LAW (or t >= 29.3 s on a 30 s cut) switches cave -> island.
// Every piece is built and updated inside its own try/catch, so one broken piece mutes itself and the rest of the world plays.
import { Vector3 } from "three";
import { CAVE_PLATE, MOUTH_CARD } from "./plates.js";
import { buildCave, buildRim, rockMaterial } from "./cave.js";
import { buildPool } from "./pool.js";
import { buildCrystals, crystalMaterial } from "./crystals.js";
import { buildSphere } from "./sphere.js";
import { buildMegiddo } from "./megiddo.js";
import { buildLattice } from "./lattice.js";
import { buildAtmos } from "./atmos.js";
import { buildIsland } from "./island.js";
import { makeShared, isHome, smooth, win, tAt, clamp } from "./common.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const S = makeShared(ctx);
  const U = S.U;
  const parts = [], warned = new Set();
  const safe = (name, fn) => { try { return fn(); } catch (e) { console.warn(`[spawn-seal/world] ${name} failed to build:`, e); return null; } };
  const mount = (obj, layer) => { if (!obj) return null; ctx.setLayer(obj, layer); group.add(obj); return obj; };

  // --- far plate and the mouth panorama (layer 0)
  const plateU = { uOut: { value: 0 }, uEat: { value: 0 } };
  safe("plate", () => group.add(ctx.bake.plateLayer(CAVE_PLATE, { uniforms: plateU })));
  const mouth = safe("mouth", () => { const c = ctx.bake.card(MOUTH_CARD, { w: 2048, h: 1024, size: [130, 65], id: 0.5 }); c.position.set(0, S.gy + 15.8, -62); parts.push(c.userData); return mount(c, 0); });

  // --- cave, rim stones, crystals, pool, plinth
  const rockMat = safe("rockMat", () => rockMaterial(U));
  const cave = rockMat && safe("cave", () => { const c = buildCave(ctx, S, rockMat); parts.push(c); mount(c.group, 0); return c; });
  if (rockMat) safe("rim", () => { const r = buildRim(ctx, S, rockMat); parts.push(r); mount(r.mesh, 0); });
  const crystalMat = safe("crystalMat", () => crystalMaterial(S));
  if (crystalMat) safe("crystals", () => { const c = buildCrystals(ctx, S, crystalMat); parts.push(c); mount(c.nodes, 1); mount(c.decor, 0); });
  const pool = safe("pool", () => { const p = buildPool(ctx, S); parts.push(p); mount(p.group, 1); ctx.setLayer(p.plinth, 0); return p; });

  // --- animated set pieces (layer 1)
  const sphere = safe("sphere", () => { const s = buildSphere(ctx, S); parts.push(s); mount(s.group, 1); return s; });
  const meg = safe("megiddo", () => { const m = buildMegiddo(ctx, S); parts.push(m); mount(m.group, 1); return m; });
  const lat = safe("lattice", () => { const l = buildLattice(ctx, S); parts.push(l); mount(l.group, 1); return l; });
  const air = safe("atmos", () => { const a = buildAtmos(ctx, S); parts.push(a); mount(a.group, 1); return a; });
  const isle = safe("island", () => { const i = buildIsland(ctx, S); parts.push(i); mount(i.group, 0); i.group.visible = false; return i; });

  const guard = (name, fn) => { try { fn(); } catch (e) { if (!warned.has(name)) { warned.add(name); console.warn(`[spawn-seal/world] ${name} update failed:`, e); } } };
  const maw = new Vector3();

  function update(t, dt, cue) {
    const ts = cue.ts, home = isHome(cue);
    S.home = home;
    const sg = ctx.seal?.group;
    if (sg) { S.sealPos.copy(sg.position); S.sealYaw = sg.rotation.y; } else { S.sealPos.set(S.at[0], S.gy, S.at[2]); S.sealYaw = 0; }
    U.uSealPos.value.copy(S.sealPos);
    U.uT.value = ts;

    // the Predator: 7.4 m behind and above the seal (seal frame (0, 5, -5.5) turned by yaw); opens over 10 f, then eats outward
    const c = Math.cos(S.sealYaw), s = Math.sin(S.sealYaw);
    maw.set(-5.5 * s, 5.0, -5.5 * c).add(S.sealPos);
    U.uMaw.value.copy(maw);
    const mk = home ? 0 : win(cue, "maw", 26.8, 29.3);
    U.uEat.value = mk <= 0 ? 0 : 0.04 + 0.96 * smooth(mk);
    plateU.uEat.value = U.uEat.value; plateU.uOut.value = home ? 1 : 0;

    // light: the pool is the key (flares at the PLOP and through the morph), dusk gold from the arch ignites with the beams
    const plop = tAt(cue, "plop", 1.0), morph = tAt(cue, "morph", 4.4), beamT = tAt(cue, "beams", 10.0);
    const flare = ts > plop ? 0.5 * Math.exp(-(ts - plop) / 0.4) : 0;
    const mph = ts > morph && ts < morph + 2.0 ? 0.3 : 0;
    U.uPool.value = (1 + flare + mph) * (1 - 0.5 * U.uEat.value);
    U.uGold.value = 0.3 + 0.7 * smooth((ts - beamT) / 0.4) * (1 - 0.6 * smooth((ts - beamT - 1.0) / 2.0));
    U.uCool.value = home ? 0 : clamp(smooth(win(cue, "cool", 19.0, 26.0)) * (1 - U.uEat.value), 0, 1);

    // visibility: the cave vs the home island
    if (cave) cave.group.visible = !home;
    if (mouth) mouth.visible = !home;
    if (isle) isle.group.visible = home;
    if (sphere) sphere.group.visible = !home;
    if (meg) meg.group.visible = !home;
    if (air) air.group.visible = !home;

    if (pool) guard("pool", () => pool.update(cue));
    if (sphere && !home) guard("sphere", () => sphere.update(cue, S));
    if (meg && !home) guard("megiddo", () => meg.update(cue));
    if (lat) guard("lattice", () => lat.update(cue, !home));
    if (S.igU) for (let i = 0; i < 7; i++) S.igU.value[i] = home ? 0.6 : S.ign[i];
  }

  return {
    group, update,
    dispose() { for (const p of parts) { try { p.dispose?.(); } catch (e) { void e; } } },
  };
}
