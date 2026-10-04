"use client";

// nerve: DEATH NOTE, the bells on the rooftop, in the BAROQUE-TENEBRISM dimension (the Caravaggio dimension).
// The island is replaced by the Task Force tower's rooftop in the rain, at night, painted as a Baroque oil: darkness
// is the canvas and one hard floodlight (a solid additive shaft with the rain lit only inside it) lights a wet deck, a
// parapet with four rain gauges (the four hypotheses), the instrument mast, a stair hut with one lit doorway and a
// colony of pups under its eave, L at the roof's edge joined to the pup by a handcuff chain that crosses itself once
// (amber ringed: the topological witness), Ryuk crouched on the parapet (the control), a city of towers below with an
// expressway of lights and three giant broadcast screens (Misa on the nearest), a gothic bell tower with its one
// bronze bell, and a ceiling of cloud that parts once over Ryuk to show the Shinigami Realm, upside-down.
// THE TEST: the pup hands Ryuk an apple (the Creation of Adam); writes four lines (a blue bead drops into a gauge with
// each); Ryuk writes slowly, chewing the apple, and umber grains heap in all four gauges; where a heap buries its bead
// the bell tolls (DONG), the pup's line takes a coral strike and stays legible, the gauge a hollow coral ring: three
// tolls. The fourth bead sits high where no grain reaches: no toll, only rain. THE PUBLICATION: the pup pulls a
// chip bag from its pocket and tears it open (the chip-bag scheme, reversed), holds the torn page UP to the camera;
// all three screens cut to it. THE RETURN: the whole city is now lit by the page, and the dimension only exists in
// the dark, under one light: its varnish cracks along every edge, the pup eats a chip (CRUNCH) and the painting
// shatters and falls away, the real island under it. The pup says the flex line across the break; the credit card.
// Shape, colour and pose only. Card: lib/world/cutscene/cards/p-nerve.js. Parts: ./p-nerve/.
// Cost: well under 100 draws, no post pass.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { radiusAt } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, smooth, useCutFrame } from "../kit";
import { flashQuad, holdFlash, islandList } from "./p-caustic/parts";
import { banner, lettering } from "./p-nerve/banner";
import { buildChain } from "./p-nerve/chain";
import { buildCity } from "./p-nerve/city";
import { buildBeam, buildGrains, buildRain, buildSplashes } from "./p-nerve/fx";
import { RYUK, buildApples, buildColony, buildL, buildRyuk, figureMaterials } from "./p-nerve/figures";
import { U } from "./p-nerve/look";
import { buildPup } from "./p-nerve/pup";
import { buildRoof } from "./p-nerve/roof";
import { SKY_R, buildRealm, skyDome } from "./p-nerve/sky";
import { T, gaugesAt, tollPulse, unwarp } from "./p-nerve/timeline";
import { TOWER, buildTower } from "./p-nerve/tower";

const CORE_Y = 0.9;
const TOWER_X = TOWER.x;
const V = new Vector3();
const W = new Vector3();
const A0 = new Vector3();
const TIP = new Vector3();
const sm = smooth;
const MOUTH0 = new Vector3(RYUK.x, RYUK.y + 2.0, RYUK.z + 0.78);
const APPLES = 9; // 0: the pup's apple, 1..8: the colony's tiny ones

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const domeRef = useRef();
  const world = useRef();
  const pup = useRef(null);
  const island = useRef([]);

  const m = useMemo(() => {
    const mats = figureMaterials();
    return {
      mats,
      dome: skyDome(),
      roof: buildRoof(),
      beam: buildBeam(),
      rain: buildRain(),
      splashes: buildSplashes(),
      grains: buildGrains(),
      city: buildCity(),
      tower: buildTower(),
      realm: buildRealm(),
      chain: buildChain(),
      ryuk: buildRyuk(mats),
      L: buildL(mats),
      colony: buildColony(mats),
      apples: buildApples(mats, APPLES),
      dong: lettering("DONG", "#8a1219"),
      crunch: lettering("CRUNCH", "#8a1219"),
      flash: flashQuad("#fff1d6"),
    };
  }, []);

  // the title banner: the instant the scene starts (static under reduced motion)
  useEffect(() => {
    const b = banner(mode !== "full");
    return () => b.dispose();
  }, [mode]);

  // the pup's costume and props ride the real pup; the island list is taken before the stage hides it
  useEffect(() => {
    island.current = islandList(scene);
    if (mode === "full") pup.current = buildPup(scene, rig.current);
    return () => {
      pup.current?.dispose();
      pup.current = null;
      m.dome.g.dispose();
      m.dome.m.dispose();
      for (const k of ["roof", "beam", "rain", "splashes", "grains", "city", "tower", "realm", "chain", "ryuk", "L", "colony", "apples"]) m[k].dispose();
      for (const x of Object.values(m.mats)) x.dispose();
      for (const x of [m.dong, m.crunch, m.flash]) {
        x.geometry.dispose();
        x.material.map?.dispose();
        x.material.dispose();
      }
    };
  }, [scene, m, mode]);

  // a skip clears the arrival: nothing of the dimension draws for the frame before this unmounts
  useFrame(() => {
    if (!live.arrival.id) {
      if (rig.current) rig.current.visible = false;
      pup.current?.set(false);
      pup.current?.showCostume(false);
      pup.current?.hideProps();
    }
  }, -0.5);

  useCutFrame((tReal, state) => {
    const tR = tReal;
    const t = unwarp(tR);
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flash.visible = false;
    if (!full) return;
    const s = live.seal;
    const cam = state.camera;
    const brk = t - T.crunch; // seconds since the picture broke
    const broken = brk > 0;
    g.position.set(s.x, 0, s.z);
    g.rotation.y = 0;

    // THE SHARED LIGHT: one hard key; the screens' glow; the cracks; the toll's flicker
    const flood = sm(T.screens, T.screens + 0.7, t);
    U.uOrigin.value.set(s.x, 0, s.z);
    U.uTime.value = t;
    U.uBreak.value = broken ? brk : -1;
    U.uKeyOn.value = 1 - 0.42 * flood;
    U.uScreenGlow.value = 1 + 3.2 * flood;
    U.uDoorK.value = 1 - 0.5 * flood;
    U.uCrack.value = sm(T.crack[0], T.crack[1], t) * 170;
    U.uToll.value = tollPulse(t);

    // THE DIMENSION swells out of the pup with the stage, then holds as the backdrop until it breaks
    const r = radiusAt(tl, tR);
    V.set(s.x, CORE_Y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    domeRef.current.visible = r > 0.02 && brk < 1.7;
    domeRef.current.scale.setScalar(inside || broken ? SKY_R : Math.max(r, 0.02));
    m.dome.m.uniforms.uInside.value = inside || broken ? 1 : 0;
    world.current.visible = (inside || broken) && brk < 1.7;

    const rainOn = sm(T.rain, T.rain + 0.9, t);
    m.rain.set(rainOn);
    m.splashes.tick(t, rainOn, U.uKeyOn.value);
    m.grains.tick(t);
    m.roof.tick(t, gaugesAt(t));
    m.tower.place(cam.aspect < 1 ? -4.8 : TOWER_X);
    m.tower.tick(t);
    m.realm.tick(t);
    m.city.tick(t, sm(T.screens, T.screens + 0.3, t), tollPulse(t));
    m.L.tick(t);
    m.colony.tick(t);

    // the sound effects, drawn over the scene: DONG over the bell on each toll, CRUNCH at the mouth
    let dong = 0;
    for (const w of T.toll) if (t >= w && t < w + 0.7) dong = Math.max(dong, t - w + 0.001);
    m.dong.visible = dong > 0 && !broken;
    if (m.dong.visible) {
      const pop = Math.min(1, dong / 0.08) * (1 + 0.3 * Math.max(0, 1 - dong / 0.2));
      const w = 3.6 * pop * (1 + 0.3 * dong);
      m.dong.position.set(m.tower.bellAt[0] - 0.4, m.tower.bellAt[1] + 2.9, m.tower.bellAt[2]);
      m.dong.scale.set(w, w, 1);
      m.dong.quaternion.copy(cam.quaternion);
    }
    const cr = t - T.crunch;
    m.crunch.visible = cr > 0 && cr < 0.8;
    if (m.crunch.visible) {
      const pop = Math.min(1, cr / 0.07) * (1 + 0.3 * Math.max(0, 1 - cr / 0.2));
      const w = 3.0 * pop;
      m.crunch.position.set(0.9, 2.3, 0.9);
      m.crunch.scale.set(w, w, 1);
      m.crunch.quaternion.copy(cam.quaternion);
    }
    // the flash: a little on the cut to the page, more on the crunch (tinted, never a white-out)
    holdFlash(m.flash, cam, Math.max(0, 1 - Math.abs(t - T.screens - 0.05) / 0.1) * 0.12 + Math.max(0, 1 - Math.abs(t - T.crunch - 0.05) / 0.12) * 0.4);

    // REALITY: the island the stage hid comes back under the falling shards
    if (t > T.reveal && tR < tl.collapse[0]) for (const o of island.current) o.visible = true;

    // the pup: its open mouth on the chip, blown low by the break (its flippers and look are driven after it poses, below)
    live.pose.mouth = pup.current?.mouthOpen ?? 0;
    live.pose.crouch = sm(T.crunch, T.crunch + 0.1, t) * (1 - sm(T.crunch + 0.35, T.crunch + 0.7, t)) * 0.6;
  });

  // after the pup has posed itself (D.jsx runs first): its flippers, props, look; then what hangs off its hands
  useFrame((state) => {
    const arrival = live.arrival;
    if (!arrival.id || mode !== "full" || !pup.current) return;
    const tR = state.clock.elapsedTime - arrival.start;
    const t = unwarp(tR);
    const cam = state.camera;
    const p = pup.current;
    const s = live.seal;
    const broken = t > T.crunch;
    const inside = radiusAt(tl, tR) > cam.position.distanceTo(V.set(s.x, CORE_Y, s.z)) + 0.3;
    const on = (inside || t > tl.bloom[1]) && !broken;
    p.set(on);
    p.showCostume(on);
    if (on) p.tick(t, cam, live.anchors?.mouth);
    else if (broken) p.afterBreak(t, cam);
    // Ryuk takes the apple, chews it, writes, tosses the core; L's wrist and the pup's cuff are the chain's ends
    TIP.copy(p.tipL).add(W.set(0.04, 0.09, 0));
    let bite = 0;
    for (const b of [T.take + 0.85, T.take + 1.6, T.take + 2.4]) if (t > b) bite = Math.max(bite, Math.exp(-(t - b) * 10));
    m.ryuk.tick(t, TIP, bite);
    m.chain.tick(t, p.cuffAt, m.L.wrist, cam, Math.sin(t * 2.2) * 0.4);

    // the apples: the pup's, handed to Ryuk's claw, to his mouth, then the core flung over the parapet; the colony's tiny ones
    const ap = m.apples;
    const held = sm(T.reach[0], T.reach[0] + 0.35, t);
    if (t < T.reach[0] || t > T.core + 4) ap.hide(0);
    else if (t < T.take) {
      ap.set(0, TIP.x, TIP.y, TIP.z, (0.4 + 0.6 * held) * (1 + 0.25 * Math.sin(Math.PI * Math.min(1, (t - T.reach[0]) / 0.4))));
    } else if (t < T.take + 0.85) {
      const k = (t - T.take - 0.2) / 0.65;
      A0.copy(m.ryuk.hand);
      if (k > 0) A0.lerp(m.ryuk.mouth, Math.min(1, k));
      ap.set(0, A0.x, A0.y, A0.z, 1, 0.2, 0.4);
    } else if (t < T.core + 0.25) {
      const sz = t < T.take + 1.6 ? 0.92 : t < T.take + 2.4 ? 0.8 : 0.66;
      ap.set(0, m.ryuk.mouth.x - 0.04, m.ryuk.mouth.y - 0.1, m.ryuk.mouth.z + 0.05, sz, 0.2, 0.4);
    } else {
      // the core, flung over the parapet into the city
      const d = t - T.core - 0.25;
      ap.set(0, MOUTH0.x - 0.8 * d, MOUTH0.y + 3.2 * d - 4.9 * d * d, MOUTH0.z - 4.6 * d, 0.5, d * 6, d * 4);
    }
    for (let i = 0; i < 8; i++) {
      if (t < tl.bloom[1] || broken) ap.hide(1 + i);
      else {
        m.colony.appleAt(i, t, V);
        ap.set(1 + i, V.x, V.y, V.z, 0.26);
      }
    }
    ap.flush();
  });

  return (
    <>
      <Stage {...cut} bare />
      <primitive object={m.flash} />
      <group ref={rig} visible={false}>
        <mesh ref={domeRef} geometry={m.dome.g} material={m.dome.m} renderOrder={-3} frustumCulled={false} position={[0, CORE_Y, 0]} />
        <group ref={world}>
          <primitive object={m.roof.group} />
          <primitive object={m.city.group} />
          <primitive object={m.tower.group} />
          <primitive object={m.realm.group} />
          <primitive object={m.beam.mesh} />
          <primitive object={m.rain.group} />
          <primitive object={m.splashes.mesh} />
          <primitive object={m.grains.mesh} />
          <primitive object={m.chain.group} />
          <primitive object={m.ryuk.group} />
          <primitive object={m.L.group} />
          <primitive object={m.colony.mesh} />
          <primitive object={m.apples.mesh} />
        </group>
        <primitive object={m.dong} />
        <primitive object={m.crunch} />
      </group>
    </>
  );
}
