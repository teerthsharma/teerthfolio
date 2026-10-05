// pr-polychrom-79: Gilgamesh, King of Heroes (Fate), in shape and colour only.
// The pup grows slicked-back gold hair on its round head (no ears), a gold collar and pauldrons, red eyes. The Gate of
// Babylon opens behind it: 42 gold portals ripple open in a dome and a small dark silhouette pokes out of each
// (Excalibur, Gae Bolg, Rho Aias, Saber's helm, Archer's bow and swords, the Holy Grail, Enkidu's chains). The pup
// holds up the Key of the Heavens; it turns, red circuit lines spread over the larger vault gate (Bab-ilu) and it opens.
// Then it draws Ea (a black drill-sword, three red segments turning) and cries "Enuma Elish!": the red spiral wind
// tears space, space shatters into gold and red shards, and the pup drops back on the island at the fountain.
// Every mesh is built at mount (portals and silhouettes are instanced); no post pass. Card: lib/world/cutscene/cards/pr-polychrom-79.js.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, SphereGeometry, TetrahedronGeometry, Vector3 } from "three";
import { radiusAt, turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { Motes } from "./_g1";
import { flashQuad, hash, holdFlash, inst, islandList, lettering, mat, pupParts, put } from "./p-caustic/parts";
import { SIL_KINDS, armourGeometry, eaParts, gateMaterial, glowMaterial, goldMaterial, hairGeometry, keyGeometry, portalMaterial, runeMaterial, silhouetteGeometries, skyMaterial, windGeometry, windMaterial } from "./pr-polychrom-79/world";
import { registerWarm, takeWarm } from "../prewarm";

const CORE_Y = 0.9;
// the clock (real s from the arrival; the card puts line A at 2.3, B at 8.3, the flex line at 14.0, the credit at 23.0)
const T = { hair: [0.55, 1.15], eyes: [2.3, 3.0], open: 0.9, step: 0.05, key: [7.0, 8.2], spread: [8.8, 13.0], gate: [1.6, 3.2], opens: [12.6, 14.2], keyAway: [13.6, 14.4], draw: [14.4, 16.4], aim: [18.0, 19.2], blast: [19.4, 19.9], word: [19.6, 21.6], shatter: 20.3, ret: 21.2, windEnd: [21.4, 22.2], shardEnd: 22.8 };
const NP = 42;
const NS = 240;
const KEY_AT = [0.55, 1.35, 0.6];
const EA_AT = [1.05, 0.35, 0.3];
const GATE_AT = [0, 4.8, -12];
const COL = new Color();
const V = new Vector3();
const RX = new Vector3();
const UY = new Vector3();
const FZ = new Vector3();

// the world, built by the shared prewarm (../prewarm.js) while the seal walks up, or here at the cut if it did not
function buildWorld() {
  const gold = goldMaterial();
  const sky = { g: new SphereGeometry(1, 32, 16), m: skyMaterial() };
  const portalM = portalMaterial();
  const plane = new PlaneGeometry(1, 1);
  const portals = inst(plane, portalM, NP);
  // the dome of portals behind the pup: three arcs, each opens a beat after the last
  const lay = [];
  for (let i = 0; i < NP; i++) {
    const layer = i < 10 ? 0 : i < 24 ? 1 : 2;
    const n = layer === 0 ? 10 : layer === 1 ? 14 : 18;
    const k = i - (layer === 0 ? 0 : layer === 1 ? 10 : 24);
    const a = -0.25 * Math.PI + ((k + 0.5 + 0.3 * (hash(i, 1) - 0.5)) / n) * 1.5 * Math.PI;
    const r = [2.2, 3.6, 5.0][layer] + 0.4 * (hash(i, 2) - 0.5);
    lay.push({ x: Math.cos(a) * r * 1.3, y: Math.max(0.8, 2.4 + Math.sin(a) * r * 0.9), z: -5.5 - layer * 0.7 - hash(i, 3), a: a + (hash(i, 4) - 0.5) * 0.35, size: 0.8 + 0.4 * hash(i, 5) + layer * 0.1, kind: i % SIL_KINDS, len: 1.1 + 0.5 * hash(i, 6) });
  }
  const silG = silhouetteGeometries();
  const silM = new MeshBasicMaterial({ color: "#1c0618", side: DoubleSide, toneMapped: false, fog: false });
  const rimM = new MeshBasicMaterial({ color: "#f2c94c", side: DoubleSide, toneMapped: false, fog: false });
  const sil = silG.map((g) => inst(g, silM, NP / SIL_KINDS));
  const silRim = silG.map((g) => inst(g, rimM, NP / SIL_KINDS));
  const cnt = new Array(SIL_KINDS).fill(0);
  for (const p of lay) p.slot = cnt[p.kind]++;
  const ea = eaParts();
  // shards of space
  const shards = inst(new TetrahedronGeometry(1, 0), mat({ color: "#ffffff", side: DoubleSide }), NS);
  const pal = ["#ffd54a", "#ff2a3a", "#fff2c0", "#ffb020", "#d3122e"];
  const sh = [];
  for (let i = 0; i < NS; i++) {
    shards.setColorAt(i, COL.set(pal[i % pal.length]));
    sh.push({ u: (hash(i, 11) - 0.5) * 2.3, v: (hash(i, 12) - 0.5) * 2.3, d: 6 + 5 * hash(i, 13), s: 0.35 + 0.8 * hash(i, 14), r: hash(i, 15) * 6, w: 2 + 5 * hash(i, 16), fall: 0.3 + hash(i, 17) });
  }
  return {
    gold, sky, portalM, plane, portals, lay, silG, silM, rimM, sil, silRim, runeM: runeMaterial(), ea, shards, sh,
    hairG: hairGeometry(),
    armG: armourGeometry(),
    keyGm: keyGeometry(),
    gateM: gateMaterial(),
    gateG: new PlaneGeometry(18, 18),
    eaDark: mat({ color: "#0b0508" }),
    eaRed: mat({ color: "#ff1f33" }),
    eaGlow: mat({ color: "#ff2a3a", transparent: true, opacity: 0.45, depthWrite: false, side: DoubleSide }),
    windM: windMaterial(),
    windG: windGeometry(),
    glowM: glowMaterial("#ffc34a"),
    glowM2: glowMaterial("#ff2a3a"),
    quad: new PlaneGeometry(1, 1),
    flash: flashQuad("#ffd77a"),
    word: lettering("Enuma Elish!", "#d3122e", -0.05),
  };
}
registerWarm("pr-polychrom-79", buildWorld);

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const rig = useRef();
  const skyRef = useRef();
  const world = useRef();
  const keyG = useRef();
  const eaG = useRef();
  const gateRef = useRef();
  const segs = useRef([]);
  const wind = useRef();
  const island = useRef([]);
  const worn = useRef([]);
  const glows = useRef({});
  const pupRef = useRef(null);

  const m = useMemo(() => takeWarm("pr-polychrom-79", buildWorld), []);

  useEffect(() => {
    // the gate, portal and wind shaders compile now, not on the beat that first shows them (the 370 ms freeze)
    try {
      gl.compile(scene, camera);
    } catch {
      // a failed precompile only costs the old first-use hitch
    }
    island.current = islandList(scene);
    const p = pupParts(scene);
    pupRef.current = p;
    const add = (mesh) => {
      mesh.visible = false;
      p.head.add(mesh);
      worn.current.push(mesh);
      return mesh;
    };
    if (p?.head) {
      add(new Mesh(m.hairG, m.gold));
      add(new Mesh(m.armG, m.gold));
    }
    return () => {
      worn.current.forEach((o) => o.removeFromParent());
      worn.current = [];
      const geos = [m.sky.g, m.plane, ...m.silG, m.hairG, m.armG, m.keyGm, m.gateG, m.ea.core, m.ea.guard, m.ea.seg, m.ea.glow, m.windG, m.quad, m.shards.geometry, m.flash.geometry, m.word.geometry];
      const mats = [m.gold, m.sky.m, m.portalM, m.silM, m.rimM, m.runeM, m.gateM, m.eaDark, m.eaRed, m.eaGlow, m.windM, m.glowM, m.glowM2, m.shards.material, m.flash.material, m.word.material];
      geos.forEach((g) => g.dispose());
      mats.forEach((x) => x.dispose());
      m.word.material.map?.dispose();
      for (const x of [m.portals, m.shards, ...m.sil, ...m.silRim]) x.dispose();
    };
  }, [scene, m, gl, camera]);

  // a skip clears the arrival: nothing of the world draws for the frame before this unmounts
  useFrame(() => {
    if (!live.arrival.id) {
      if (rig.current) rig.current.visible = false;
      m.shards.visible = false;
      m.word.visible = false;
      worn.current.forEach((o) => (o.visible = false));
    }
  }, -0.5);

  // THE RETURN: a wide island shot, and the pup drops back from 3 m over 0.6 s onto the fountain
  const EYE_R2 = useMemo(() => new Vector3(), []);
  const LOOK_R2 = useMemo(() => new Vector3(), []);
  useFrame((state) => {
    const a = live.arrival;
    const p = pupRef.current;
    if (!a.id || mode !== "full") return;
    const t = state.clock.elapsedTime - a.start;
    const k = smooth(T.ret, T.ret + 0.5, t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
    if (k <= 0.001) return;
    const at = card.landAt;
    EYE_R2.set(at.x + 1.2, at.y + 1.8, at.z + 5.2); // inside the doorway, the basin ahead, plateau light behind
    LOOK_R2.set(at.x, at.y + 1.3, at.z - 1);
    const cm = state.camera;
    cm.getWorldDirection(V).multiplyScalar(cm.position.distanceTo(LOOK_R2)).add(cm.position);
    V.lerp(LOOK_R2, k);
    cm.position.lerp(EYE_R2, k);
    cm.lookAt(V);
    if (p?.root) p.root.position.y += 3 * (1 - smooth(T.ret, T.ret + 0.6, t));
  }, -0.4);

  // a flat quad that always faces the lens, at a rig-local spot
  const bill = (mesh, x, y, z, size, cam) => {
    rig.current.localToWorld(mesh.position.set(x, y, z));
    mesh.quaternion.copy(cam.quaternion);
    mesh.scale.setScalar(size);
  };

  useCutFrame((t, state) => {
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flash.visible = false;
    m.word.visible = false;
    m.shards.visible = false;
    glows.current.back.visible = glows.current.key.visible = false;
    if (!full) {
      worn.current.forEach((o) => (o.visible = false));
      return;
    }
    const tt = onTwos(t);
    const cam = state.camera;
    g.position.set(s.x, s.climb || 0, s.z); // the summit: the stage stands where the pup does
    g.rotation.y = turnFor(card, place, s.x, s.z);
    g.updateMatrixWorld(true);
    for (const u of [m.gold, m.portalM, m.windM, m.gateM, m.sky.m, m.runeM]) u.uniforms.uTime.value = t;

    // THE WORLD swells out of the pup with the stage, then holds; the dimension's break (T.ret) takes it away for the island
    const r = radiusAt(tl, t);
    const sky = skyRef.current;
    const dx = cam.position.x - s.x;
    const dy = cam.position.y - CORE_Y;
    const dz = cam.position.z - s.z;
    const inside = r > Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.3;
    const gone = tt >= T.ret;
    const early = tt < 0.4; // the stage colour never shows a blank frame: the sky is already up at t=0
    sky.visible = (r > 0.02 || early) && !gone;
    sky.scale.setScalar(inside || early ? 140 : Math.max(r, 0.02));
    world.current.visible = (inside || early) && !gone;
    const fade = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);

    // GILGAMESH on the pup: gold hair, collar, pauldrons and red eyes, gone with the stage
    const k = smooth(T.hair[0], T.hair[1], tt) * fade;
    worn.current.forEach((o) => {
      o.visible = k > 0.01;
      o.scale.setScalar(Math.max(k * (1 + 0.08 * Math.sin(Math.PI * Math.min(1, Math.max(0, tt - T.hair[0]) / 0.7))), 0.01));
    });

    // THE GATE OF BABYLON: portals ripple open one after another, a silhouette pokes out of each
    for (let i = 0; i < NP; i++) {
      const p = m.lay[i];
      const o = smooth(T.open + i * T.step, T.open + i * T.step + 0.5, tt);
      const sz = p.size * 1.3 * o * (1 + 0.06 * Math.sin(t * 3 + i));
      put(m.portals, i, p.x, p.y, p.z, sz, sz, 1);
      const len = p.len * smooth(T.open + i * T.step + 0.3, T.open + i * T.step + 1.0, tt);
      const ra = p.a - Math.PI / 2 + 0.05 * Math.sin(t * 1.7 + i);
      put(m.silRim[p.kind], p.slot, p.x, p.y, p.z + 0.09, len * 1.22, len * 1.035, 1, 0, 0, ra);
      put(m.sil[p.kind], p.slot, p.x, p.y, p.z + 0.1, len, len, 1, 0, 0, ra);
    }
    m.portals.instanceMatrix.needsUpdate = true;
    for (const x of m.sil) x.instanceMatrix.needsUpdate = true;
    for (const x of m.silRim) x.instanceMatrix.needsUpdate = true;

    // THE KEY OF THE HEAVENS: rises into the pup's raised flipper and turns; red circuits spread over the vault gate and it opens
    const kin = smooth(T.key[0], T.key[1], tt) * (1 - smooth(T.keyAway[0], T.keyAway[1], tt));
    const key = keyG.current;
    key.visible = kin > 0.01;
    key.position.set(KEY_AT[0], KEY_AT[1] + (1 - kin) * 0.6 + 0.05 * Math.sin(tt * 2.4), KEY_AT[2]);
    key.scale.setScalar(Math.max(kin, 0.01) * 2.2);
    key.rotation.set(0.1, tt * 2.6, 0.08 * Math.sin(tt * 1.5));
    const gate = gateRef.current;
    gate.visible = tt > T.gate[0] && !gone;
    gate.scale.setScalar(Math.max(smooth(T.gate[0], T.gate[1], tt), 0.01));
    m.gateM.uniforms.uSpread.value = smooth(T.spread[0], T.spread[1], tt);
    m.gateM.uniforms.uOpen.value = smooth(T.opens[0], T.opens[1], tt);

    // EA: drawn, held up with the segments turning faster and faster, then levelled at the vault
    const draw = smooth(T.draw[0], T.draw[1], tt);
    const aim = smooth(T.aim[0], T.aim[1], tt);
    const ea = eaG.current;
    ea.visible = draw > 0.01 && !gone;
    ea.scale.setScalar(Math.max(draw, 0.01) * 1.0);
    ea.position.set(EA_AT[0], EA_AT[1] + 0.05 * Math.sin(tt * 2.0), EA_AT[2]);
    ea.rotation.set(-0.1, 0, -0.62 + 0.3 * aim);
    segs.current.forEach((sg, i) => (sg.rotation.y = tt * (6 + 3 * i) * (i % 2 ? -1 : 1)));
    const blast = smooth(T.blast[0], T.blast[1], tt) * (1 - smooth(T.windEnd[0], T.windEnd[1], tt));
    const w = wind.current;
    w.visible = tt >= T.aim[0] && tt < T.windEnd[1] && !gone;
    w.scale.set(0.3 + blast, 0.2 + 0.8 * blast, 0.3 + blast);
    m.windM.uniforms.uK.value = Math.max(blast * 2.6, 0.9 * smooth(T.aim[0], T.aim[1], tt));

    // THE RETURN: the blast shatters space into shards; the world goes and the island is there
    const age = tt - T.shatter;
    m.shards.visible = age > 0 && tt < T.shardEnd;
    if (m.shards.visible) {
      cam.matrixWorld.extractBasis(RX, UY, FZ);
      const half = Math.tan((cam.fov * Math.PI) / 360);
      const sc = smooth(0, 0.12, age) * (1 - smooth(T.ret + 0.4, T.shardEnd, tt));
      for (let i = 0; i < NS; i++) {
        const h = m.sh[i];
        const dd = Math.max(h.d - age * 2.5, 1.5);
        const spread = 1 + age * 0.5;
        V.copy(cam.position).addScaledVector(FZ, -dd).addScaledVector(RX, h.u * half * cam.aspect * dd * spread).addScaledVector(UY, (h.v * half * dd - age * age * h.fall * 0.6) * spread);
        const z = h.s * sc * dd * half * 0.16;
        put(m.shards, i, V.x, V.y, V.z, z, z, z, h.r + age * h.w, h.r * 0.5 + age * h.w * 0.6, 0);
      }
      m.shards.instanceMatrix.needsUpdate = true;
      m.shards.instanceColor.needsUpdate = true;
    }
    if (gone && tt < tl.collapse[1]) for (const o of island.current) o.visible = true;

    // gold light behind the pup (its rim) and a halo on the key
    const gb = glows.current.back;
    gb.visible = !gone;
    bill(gb, 0, 1.1, -1.6, 4.2 + 0.2 * Math.sin(t * 2), cam);
    m.glowM.uniforms.uK.value = 0.55 * smooth(2.3, 3.4, tt);
    const gk = glows.current.key;
    gk.visible = kin > 0.01;
    bill(gk, KEY_AT[0], KEY_AT[1] + 0.4, KEY_AT[2], 2.2 * 1.6 * kin, cam);

    // the flashes: gold at the blast and at the swap, never a white-out
    holdFlash(m.flash, cam, Math.max(0, 1 - Math.abs(tt - 19.8) / 0.25) * 0.4 + Math.max(0, 1 - Math.abs(tt - T.ret) / 0.3) * 0.5);
    // the word, upper third of the frame: subtitles keep the lower half
    const word = tt >= T.word[0] && tt < T.word[1];
    m.word.visible = word;
    if (word) {
      const fw = 2 * Math.tan((cam.fov * Math.PI) / 360) * 2.2 * cam.aspect;
      cam.getWorldDirection(m.word.position).multiplyScalar(2.2).add(cam.position);
      m.word.position.addScaledVector(UY.setFromMatrixColumn(cam.matrixWorld, 1), (0.22 * fw) / cam.aspect);
      m.word.quaternion.copy(cam.quaternion);
      m.word.scale.set(fw * 0.7, fw * 0.7, 1);
    }

    // pose: the opening sign, the key held up, a fist on the blast; nothing here rotates the pup, so it is never left tilted
    const done = 1 - smooth(T.windEnd[0], T.windEnd[1], tt);
    const fist = smooth(T.aim[0], T.aim[1], tt) * done;
    live.pose.sign = signAt(tl, t) * (1 - smooth(1.5, 1.8, tt));
    live.pose.raise = smooth(T.key[0] - 0.3, T.key[0] + 0.4, tt) * (1 - fist) * done * fade;
    live.pose.fist = fist * fade;
    live.pose.demon = 0;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <Motes mode={mode} tl={tl} n={110} span={[22, 9, 16]} center={[0, 3, -4]} dir={[0.05, 0.3, 0]} size={0.07} color={["#ffd54a", "#fff2c0", "#ff2a3a", "#ffb020"]} sway={0.5} shape="diamond" />
      <primitive object={m.flash} />
      <primitive object={m.word} />
      <primitive object={m.shards} />
      <mesh ref={(o) => o && (glows.current.back = o)} geometry={m.quad} material={m.glowM} renderOrder={-1} frustumCulled={false} visible={false} />
      <mesh ref={(o) => o && (glows.current.key = o)} geometry={m.quad} material={m.glowM2} renderOrder={5} frustumCulled={false} visible={false} />
      <group ref={rig} visible={false}>
        <mesh ref={skyRef} geometry={m.sky.g} material={m.sky.m} position={[0, CORE_Y, 0]} renderOrder={-3} frustumCulled={false} />
        <group ref={world}>
          <mesh ref={gateRef} geometry={m.gateG} material={m.gateM} position={GATE_AT} renderOrder={-2} frustumCulled={false} visible={false} />
          <primitive object={m.portals} />
          {m.silRim.map((x, i) => (
            <primitive key={"r" + i} object={x} />
          ))}
          {m.sil.map((x, i) => (
            <primitive key={i} object={x} />
          ))}
        </group>
        <group ref={keyG} visible={false}>
          <mesh geometry={m.keyGm} material={m.gold} frustumCulled={false} position={[0, -0.4, 0]} />
        </group>
        <group ref={eaG} visible={false}>
          <mesh geometry={m.ea.core} material={m.eaDark} frustumCulled={false} />
          <mesh geometry={m.ea.guard} material={m.gold} frustumCulled={false} />
          {[0.34, 0.68, 1.02].map((y, i) => (
            <group key={i} position={[0, y, 0]} ref={(o) => o && (segs.current[i] = o)}>
              <mesh geometry={m.ea.seg} material={m.runeM} frustumCulled={false} />
              <mesh geometry={m.ea.glow} material={m.eaGlow} frustumCulled={false} />
            </group>
          ))}
          <mesh ref={wind} geometry={m.windG} material={m.windM} position={[0, 1.64, 0]} frustumCulled={false} visible={false} />
        </group>
      </group>
    </>
  );
}
