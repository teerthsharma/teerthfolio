// NeMo Relay: Dragon Ball Super, the Tournament of Power and Goku's Ultra Instinct, as its OWN dimension:
// 90s Toei TV-anime cel (flat colour, one hard shadow tone, a bold ink outline, speed lines, glowing aura).
// The island is replaced by a vast shattered stone arena floating in a pale void sky (cel-banded
// royal blue to lilac, a colourful nebula, stars, speed lines radiating from behind the pup), floating
// rock chunks, and a ledge where two ink cutouts watch: BEERUS (cat ears, tail, hands behind his back)
// and WHIS (tall, a staff, a ringed halo). The pup calms, ignites the SILVER-WHITE Ultra Instinct aura
// (silver flames, a pale blue-white heart, silver sparks, its fur shifting to silver) and dodges coloured
// ki orbs with its eyes shut while silver afterimages flicker. Then the form runs out: the aura gutters,
// the silver drains, the sky pales and its speed lines stop, Whis taps his staff, and the arena breaks up
// outside-in and falls away, the sky dissolving in chunky blocks, to the real island that was beneath it
// all along. The flex line comes before; the credit card is read over the falling stage.
// Cost by construction: ~28 draw calls, no post pass, no textures but one lettering plane, everything
// instanced or merged, disposed on exit. Card: lib/world/cutscene/cards/pr-nemo-relay-481.js.
// Parts: ./pr-nemo-relay-481/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, smooth, useCutFrame } from "../kit";
import { bakePup } from "./_g1";
import { flashQuad, holdFlash, islandList, lettering, pupParts } from "./p-caustic/parts";
import { LEDGE, TOP, buildArena } from "./pr-nemo-relay-481/arena";
import { INK, hullMaterial, pupCel, setHull } from "./pr-nemo-relay-481/cel";
import { ORB, buildAura, buildOrbs, passAt, passPoint, passSide, silverGhost } from "./pr-nemo-relay-481/fx";
import { beerus, whis } from "./pr-nemo-relay-481/gods";
import { buildHair } from "./pr-nemo-relay-481/hair";
import { skyShell } from "./pr-nemo-relay-481/sky";
import { registerWarm, takeWarm } from "../prewarm";

const CORE_Y = 0.9;
// the clock (s from the arrival). The card puts line A at 2.3, B at 6.4, C at 8.8, the credit at 11.2
const T = { calm: 1.9, ignite: [2.7, 3.15], silver: [2.85, 3.5], eyes: [3.45, 9.6], gut: [9.2, 10.0], spent: [9.8, 10.3], tap: 9.45, crack: 10.3, drain: [9.5, 10.9], reveal: 11.0, out: [11.2, 12.2] };
// the owner's pacing: every bubble up 5 s+, the credit 4 s+, the break in slow motion. Real seconds -> the
// content clock the arena, orbs and pup were authored in (identity to 3.5 s, slowed through the dodges, 2x at the break)
const warp = (r) => (r < 3.5 ? r : r < 18.6 ? 3.5 + (r - 3.5) * (5.7 / 15.1) : r < 25 ? 9.2 + (r - 18.6) * 0.5 : 12.4 + (r - 25));
const V = new Vector3();
const Q = new Quaternion();
const DODGE = { x: 0, y: 0, z: 0, lean: 0, duck: 0, kick: 0 };
const GHOST = { x: 0, y: 0, z: 0, lean: 0, duck: 0, kick: 0 };

// the pup's sidestep for every orb: out of its path just before the pass, back after; a function of time only
function dodgeAt(tt, out) {
  out.x = out.y = out.z = out.lean = out.duck = out.kick = 0;
  for (let i = 0; i < ORB.n; i++) {
    const tp = passAt(i);
    const d = smooth(tp - 0.22, tp - 0.07, tt) * (1 - smooth(tp + 0.1, tp + 0.34, tt));
    if (d <= 0) continue;
    passPoint(i, V);
    const side = passSide(i);
    out.x += side * 0.6 * d;
    out.z += (V.z > 0 ? -0.55 : 0.5) * d;
    out.y += (V.y < 0.5 ? 0.32 : 0) * d;
    out.lean += -side * 0.35 * d;
    out.duck += (V.y > 0.7 ? 0.7 : 0) * d;
    out.kick += d;
  }
  return out;
}

// the world, built by the shared prewarm (../prewarm.js) while the seal walks up, or here at the cut if it did not
function buildWorld() {
  const sky = skyShell();
  const arena = buildArena(T);
  const aura = buildAura();
  const orbs = buildOrbs();
  const hair = buildHair();
  const wb = beerus();
  const wh = whis();
  const ink = new MeshBasicMaterial({ color: INK, toneMapped: false, fog: false });
  const hullG = hullMaterial({ color: "#d6e6ff" });
  const mb = (color) => new MeshBasicMaterial({ color, toneMapped: false, fog: false });
  const matB = wb.parts.map(([, c]) => mb(c));
  const matW = wh.parts.map(([, c]) => mb(c));
  const accW = mb("#7fe3ff");
  const haloF = new MeshBasicMaterial({ color: "#c9f8ff", toneMapped: false, fog: false });
  const ghostM = [0, 1, 2, 3].map(() => silverGhost());
  const crack = lettering("KRRRK!", "#e5363a", -0.1);
  const flash = flashQuad("#dbe7ff");
  return { sky, hair, arena, aura, orbs, wb, wh, ink, hullG, matB, matW, accW, haloF, ghostM, crack, flash };
}
registerWarm("pr-nemo-relay-481", buildWorld);

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const rig = useRef();
  const shellRef = useRef();
  const world = useRef();
  const auraGrp = useRef();
  const staff = useRef();
  const halo = useRef();
  const beerusG = useRef();
  const whisG = useRef();
  const ghosts = useRef([]);
  const pup = useRef(null);
  const cel = useRef(null);
  const baked = useRef(null);
  const island = useRef([]);
  const hid = useRef(false);
  const off = useRef({ x: 0, y: 0, z: 0, lean: 0 });

  const m = useMemo(() => takeWarm("pr-nemo-relay-481", buildWorld), []);

  useEffect(() => {
    island.current = islandList(scene);
    const p = pupParts(scene);
    pup.current = p;
    cel.current = p?.root ? pupCel(p.root) : null;
    p?.head?.add(m.hair.group);
    gl.compile(scene, camera); // prewarm hair, aura and gods so the first frame does not stall
    return () => {
      m.hair.dispose();
      cel.current?.dispose();
      cel.current = null;
      if (pup.current?.root) pup.current.root.rotation.z = 0;
      pup.current = null;
      for (const g of [m.sky.g, m.wb.ink, m.wb.hull, ...m.wb.parts.map((x) => x[0]), m.wh.ink, m.wh.hull, ...m.wh.parts.map((x) => x[0]), m.wh.staffOrb, m.wh.halo, m.crack.geometry, m.flash.geometry, baked.current]) g?.dispose();
      for (const x of [m.sky.m, m.ink, m.hullG, ...m.matB, ...m.matW, m.accW, m.haloF, m.crack.material, m.flash.material, ...m.ghostM]) x.dispose();
      m.crack.material.map?.dispose();
      m.arena.dispose();
      m.aura.dispose();
      m.orbs.dispose();
    };
  }, [scene, gl, camera, m]);

  // the sidestep moves the pup itself, after Seal.jsx places it; a skip clears the arrival and nothing draws a frame past it
  useFrame(() => {
    const p = pup.current;
    if (!live.arrival.id) {
      rig.current.visible = false;
      if (hid.current) for (const x of island.current) x.visible = true;
      hid.current = false;
      cel.current?.set(false);
      m.hair.group.visible = false;
      if (p?.root) p.root.rotation.z = 0;
      return;
    }
    if (p?.root && mode === "full") {
      const o = off.current;
      p.root.position.x += o.x;
      p.root.position.y += o.y;
      p.root.position.z += o.z;
      p.root.rotation.z = o.lean; // Seal never sets roll, so this is absolute and cleared on exit
    }
  }, -0.5);

  useCutFrame((t, state) => {
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flash.visible = false;
    const o = off.current;
    if (!full) {
      cel.current?.set(false);
      m.hair.group.visible = false;
      o.x = o.y = o.z = o.lean = 0;
      return;
    }
    const tt = warp(onTwos(t));
    const cam = state.camera;
    g.position.set(s.x, 0, s.z);
    setHull(state.size.width, state.size.height, state.gl.getPixelRatio());

    // THE WORLD swells out of the pup with the stage, then holds as the backdrop until it dissolves
    const r = Math.max(tl.radius, 26) * smooth(tl.bloom[0], tl.bloom[1], t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
    V.set(s.x, CORE_Y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    const sh = m.sky.m.uniforms;
    const out = smooth(T.out[0], T.out[1], tt);
    shellRef.current.visible = r > 0.02 && out < 1;
    shellRef.current.scale.setScalar(inside ? 140 : Math.max(r, 0.02));
    world.current.visible = inside && tt < T.out[1];
    // the kit's own island hide keys on a 16 m stage; the tall view sits past that, so hide the island here
    const hideIsland = inside && tt < T.reveal;
    if (hideIsland) for (const x of island.current) x.visible = false;
    else if (hid.current) for (const x of island.current) x.visible = true;
    hid.current = hideIsland;
    const ign = smooth(T.ignite[0], T.ignite[1], tt);
    const drain = smooth(T.drain[0], T.drain[1], tt);
    sh.uTime.value = t;
    sh.uCell.value = 6 * state.gl.getPixelRatio();
    sh.uOut.value = out;
    sh.uDrain.value = drain;
    // speed lines: calm, a surge at the ignition, thick through the dodges, still at the return
    const surge = Math.max(0, 1 - Math.abs(tt - 3.0) / 0.6);
    const dodging = smooth(ORB.launch, ORB.launch + 0.3, tt) * (1 - smooth(passAt(ORB.n - 1) + 0.2, passAt(ORB.n - 1) + 0.6, tt));
    sh.uSpeed.value = 0.15 + 0.85 * surge + 0.5 * dodging + 0.2 * ign;

    // THE PUP: a sign, a calm low stance, the ignition, the dodges with its eyes shut, spent, then itself again
    const lit = 1 - smooth(T.gut[0], T.gut[1], tt);
    const aura = ign * lit;
    const silver = smooth(T.silver[0], T.silver[1], tt) * (1 - smooth(9.5, 10.3, tt));
    const celOn = (inside || tt > tl.bloom[1]) && tt < T.reveal;
    cel.current?.set(celOn, silver, aura > 0.3 ? 1 : 0);
    m.hair.group.visible = celOn && silver > 0.05;
    m.hair.group.rotation.set(0.05 * Math.sin(t * 7), 0, 0.04 * Math.sin(t * 5));
    m.hair.group.scale.setScalar(1 + 0.03 * Math.sin(t * 9));
    const d = dodgeAt(tt, DODGE);
    const k = celOn ? 1 : 0;
    o.x = d.x * k;
    o.y = d.y * k;
    o.z = d.z * k;
    o.lean = d.lean * k;
    live.pose.sign = smooth(tl.sign[0], tl.sign[1], tt) * (1 - smooth(1.5, 1.9, tt));
    live.pose.crouch = (0.4 * smooth(T.calm, T.calm + 0.4, tt) * (1 - smooth(T.ignite[0], T.ignite[0] + 0.25, tt)) + 0.55 * Math.min(1, d.duck) * ign + 0.85 * smooth(T.spent[0], T.spent[1], tt) * (1 - smooth(T.reveal, T.reveal + 0.4, tt))) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
    live.pose.raise = (0.3 * ign + 0.45 * Math.min(1, d.kick)) * lit;
    live.pose.ring = smooth(T.ignite[0], T.ignite[0] + 0.2, tt) * (1 - smooth(T.eyes[0] - 0.05, T.eyes[0] + 0.05, tt));
    live.pose.blink = smooth(T.eyes[0], T.eyes[0] + 0.1, tt) * (1 - smooth(T.eyes[1], T.eyes[1] + 0.15, tt));

    // THE AURA follows the pup's sidestep; the ground ring leaves at the ignition
    auraGrp.current.position.set(o.x, TOP, o.z);
    const stutter = tt > T.gut[0] && tt < T.gut[1] ? (Math.floor(tt * 12) % 3 === 0 ? 1 : 0.5) : 1;
    m.aura.update(tt, aura * stutter, 0.5 + 0.5 * Math.sin(t * 9), tt - (T.ignite[0] + 0.05));

    // THE AFTERIMAGES: two silver copies flicker through where the pup was, for every orb
    if (!baked.current && pup.current?.root && t > 0.3) {
      baked.current = bakePup(pup.current.root);
      ghosts.current.forEach((mesh) => mesh && (mesh.geometry = baked.current));
    }
    ghosts.current.forEach((mesh) => mesh && (mesh.visible = false));
    if (baked.current && celOn) {
      for (let i = 0; i < ORB.n; i++) {
        const tp = passAt(i);
        for (let j = 0; j < 2; j++) {
          const age = tt - (tp - 0.22 + 0.1 * j);
          if (age < 0 || age > 0.4) continue;
          const slot = (2 * i + j) % 4;
          const mesh = ghosts.current[slot];
          if (!mesh) continue;
          const at = dodgeAt(tp - 0.26 + 0.12 * j, GHOST);
          mesh.visible = true;
          mesh.position.set(at.x, at.y, at.z);
          if (pup.current?.root) mesh.quaternion.copy(pup.current.root.quaternion);
          m.ghostM[slot].opacity = 0.6 * (1 - age / 0.4);
        }
      }
    }

    // THE KI ORBS
    m.orbs.update(tt, celOn ? 1 : 0);

    // THE ARENA: rubble rises with the aura (and the stage trembles before it breaks), then the stage falls
    m.arena.update(tt, aura, tt > T.crack - 0.9 && tt < T.crack ? 1 : 0);
    m.arena.stone.uniforms.uDrain.value = drain;

    // THE WATCHERS: Whis' halo turns, his staff taps on the spend, Beerus sways
    halo.current.rotation.z = tt * 0.5;
    const tap = Math.max(0, 1 - Math.abs(tt - T.tap) / 0.2);
    staff.current.position.y = -0.16 * tap;
    halo.current.scale.setScalar(1 + 0.35 * tap);
    beerusG.current.rotation.y = -0.55 + 0.05 * Math.sin(tt * 0.9);
    whisG.current.position.y = LEDGE.y + 0.06 * Math.sin(tt * 1.1);

    // THE CRACK: lettering on the first break, flat to the lens
    const bl = tt - T.crack;
    m.crack.visible = bl > 0 && bl < 0.8;
    if (m.crack.visible) {
      const pop = Math.min(1, bl / 0.08) * (1 + 0.2 * Math.max(0, 1 - bl / 0.2));
      const wide = state.size.width / state.size.height >= 1;
      const w = (wide ? 4.2 : 2.6) * pop;
      m.crack.position.set((wide ? 2.4 : 1.4) + 0.04 * (Math.floor(t * 12) % 2 ? 1 : -1), wide ? 3.1 : 3.5, 0.4);
      m.crack.scale.set(w, w, 1);
      g.updateWorldMatrix(true, false);
      m.crack.quaternion.copy(Q.setFromRotationMatrix(g.matrixWorld).invert().multiply(cam.quaternion));
    }

    // the flash: pale silver at the ignition, a little at the crack (tinted, never a white-out)
    holdFlash(m.flash, cam, Math.max(0, 1 - Math.abs(tt - 2.95) / 0.12) * 0.3 + Math.max(0, 1 - Math.abs(tt - T.crack) / 0.1) * 0.18);

    // REALITY: the island the stage hid shows under the falling stage
  });

  return (
    <>
      <Stage {...cut} bare />
      <primitive object={m.flash} />
      <group ref={rig} visible={false}>
        <mesh ref={shellRef} geometry={m.sky.g} material={m.sky.m} position={[0, CORE_Y, 0]} renderOrder={-3} frustumCulled={false} />
        <group ref={world}>
          {m.arena.groups.flatMap((set, i) => [<primitive key={`f${i}`} object={set.fill} />, <primitive key={`h${i}`} object={set.hull} />])}
          <group ref={auraGrp}>
            {m.aura.meshes.map((x, i) => (
              <primitive key={i} object={x} />
            ))}
          </group>
          {m.orbs.meshes.map((x, i) => (
            <primitive key={`o${i}`} object={x} />
          ))}
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} ref={(x) => x && (ghosts.current[k] = x)} material={m.ghostM[k]} visible={false} frustumCulled={false} renderOrder={3} />
          ))}
          <group ref={whisG} position={[LEDGE.x - 1.5, LEDGE.y, LEDGE.z + 0.2]} rotation={[0, -0.42, 0]} scale={2.3}>
            {m.wh.parts.map(([g], i) => (
              <mesh key={i} geometry={g} material={m.matW[i]} frustumCulled={false} />
            ))}
            <mesh geometry={m.wh.hull} material={m.hullG} frustumCulled={false} />
            <group ref={staff}>
              <mesh geometry={m.wh.staffOrb} material={m.accW} frustumCulled={false} />
            </group>
            <group ref={halo} position={[0, 2.45, -0.34]}>
              <mesh geometry={m.wh.halo} material={m.haloF} position={[0, -2.45, 0.34]} frustumCulled={false} />
            </group>
          </group>
          <group ref={beerusG} position={[LEDGE.x + 1.6, LEDGE.y, LEDGE.z + 0.6]} rotation={[0, -0.55, 0]} scale={2.35}>
            {m.wb.parts.map(([g], i) => (
              <mesh key={i} geometry={g} material={m.matB[i]} frustumCulled={false} />
            ))}
            <mesh geometry={m.wb.hull} material={m.hullG} frustumCulled={false} />
          </group>
        </group>
        <primitive object={m.crack} />
      </group>
    </>
  );
}
