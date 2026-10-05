// epsilon-hollow: TENSURA (That Time I Got Reincarnated as a Slime). The pup stays a seal. It is reincarnated at a glowing cave
// pool in the crystal Sealed Cave; the Great Sage (a floating blue holographic panel) announces "Unique Skill: Predator acquired"
// as Veldora, the black-and-gold Storm Dragon, hangs sealed in his glowing sphere. The pup becomes Demon Lord Rimuru: a towering
// black-haired, golden-eyed silhouette over it, and MEGIDDO rains sunbeams from floating water lenses. Then he eats reality:
// a black void maw spirals the sky, the ground, the lenses and Veldora's seal into itself. That is the explained return
// ("Return to the island: route calculated."): reality is eaten and the island is what remains. Everything is built at mount
// (and prewarmed on approach); nothing is allocated per frame. Card: lib/world/cutscene/cards/p-epsilon-hollow.js.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { PLACE_BY_ID } from "../../../../lib/world/places";
import { sceneT } from "../../../../lib/world/cutscene/clock";
import { live } from "../../../../lib/world/store";
import { registerWarm, takeWarm } from "../prewarm";
import { Stage, smooth, useCutFrame } from "../kit";
import { flashQuad, holdFlash, islandList } from "./p-caustic/parts";
import { hash } from "./spawn-seal/slime";
import { particles } from "./spawn-seal/fx";
import { hollowSphere, makeRim, maw, ripple, sagePanel, fistMesh } from "./spawn-seal/slime";
import { dust, human, veldora, vortex } from "./spawn-seal/figures";
import { battlefield, caveWorld } from "./spawn-seal/world";

const SEAL_AT = [3.1, 2.4, -1.5]; // Veldora's seal, beside the pup
const RIMURU_AT = [-1.8, 0, -2.4]; // the Demon Lord rises from the vortex here, beside and behind the pup, so both are in frame
const MAW_AT = [0, 3.6, -9];
const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);
const V = new Vector3();
const EYE = new Vector3();
const LOOK = new Vector3();
const LOOK1 = new Vector3();

function* build() {
  const mat = makeRim();
  yield;
  const cave = caveWorld();
  yield;
  const war = battlefield(mat);
  yield;
  const vor = vortex();
  yield;
  const reform = dust(mat, 14.6);
  yield;
  const pool = ripple("#1fb8ff", "#7ff8ff", false);
  yield;
  const portal = ripple("#8a3fff", "#ff5ad8", true);
  yield;
  const vel = veldora(mat);
  yield;
  const man = human(mat);
  yield;
  const mw = maw();
  yield;
  const hs = hollowSphere();
  yield;
  const fist = fistMesh(mat);
  yield;
  const notice1 = sagePanel("《Notice》 Skill: Epsilon Hollow.");
  yield;
  const notice2 = sagePanel("《Notice》 Return to the island: route calculated.");
  yield;
  const spark = particles(mat, [
    { n: 50, at: [0, 0.2, 0], r: 2, t0: 0.8, spread: 2.2, speed: 2.5, up: 1.6, vy: 1.4, life: 1.6, g: 3, size: 0.14, colors: ["#3fdcff", "#ffffff", "#9fe6ff", "#ff7ae0"], seed: 1 },
    { n: 60, at: SEAL_AT, r: 1.4, t0: 4.0, spread: 3.0, speed: 3, up: 1.2, vy: 1.2, life: 1.4, g: 2, size: 0.16, colors: ["#ffd23a", "#3aa6ff", "#ffffff"], seed: 2 },
    { n: 70, at: [0, 0.3, 0], r: 2.5, t0: 8.9, spread: 1.6, speed: 4, up: 2.2, vy: 1.8, life: 1.4, g: 2, size: 0.18, colors: ["#8a5bff", "#ffffff", "#ffd23a", "#3fdcff"], seed: 3 },
    { n: 60, at: [0, 0.3, -2], r: 6, t0: 10.6, spread: 5.5, speed: 3, up: 1.4, vy: 1.2, life: 1.5, g: 8, size: 0.2, colors: ["#ffd37a", "#ffffff", "#ff9a3a"], seed: 4 },
    { n: 60, at: [0, 0.3, 0], r: 4, t0: 24.4, spread: 1.0, speed: 5, up: 2.0, vy: 1.6, life: 1.2, g: 3, size: 0.16, colors: ["#3fdcff", "#ffffff", "#ff5ad8"], seed: 5 },
    { n: 90, at: [0, 0.3, -6], r: 28, t0: 9.6, spread: 4.5, speed: 1.2, up: 1.6, vy: 1.6, life: 2.6, g: -0.8, size: 0.12, colors: ["#ff9a3a", "#ffd37a", "#ff5a1a"], seed: 6 },
  ]);
  yield;
  const flash = flashQuad("#cfe6ff");
  yield;
  return { mat, cave, war, vor, reform, pool, portal, vel, man, mw, hs, fist, notice1, notice2, spark, flash };
}

// ---- PREWARM: the shared prewarm (../prewarm.js) builds the parts when the seal is near the dock and compileAsyncs every program (hidden parts included).
function* buildWarm() {
  const m = yield* build();
  m.roots = [m.cave.root, m.war.root, m.vor.mesh, m.reform.mesh, m.pool.mesh, m.portal.mesh, m.vel.root, m.man.root, m.mw.mesh, m.hs.root, m.fist.mesh, m.notice1.mesh, m.notice2.mesh, m.spark.mesh, m.flash];
  return m;
}
registerWarm("spawn-seal", buildWarm);
const takeParts = () => takeWarm("spawn-seal", buildWarm);

// a Great Sage panel floats in the upper third of the frame (screen space, in front of the camera)
function sage(p, cam, k, t) {
  p.mesh.visible = k > 0.01;
  if (!p.mesh.visible) return;
  const d = 6;
  const hh = d * Math.tan((cam.fov * Math.PI) / 360);
  const hw = hh * cam.aspect;
  const w = Math.min(hw * 0.62, hh * 2 * 1.2); // smaller, and parked under the site header (top edge ~14% down the frame)
  V.set(-hw * 0.94 + w / 2, hh * 0.72 - (w * 0.2545) / 2 + 0.03 * Math.sin(t * 2), -d).applyMatrix4(cam.matrixWorld);
  p.mesh.position.copy(V);
  p.mesh.quaternion.copy(cam.quaternion);
  p.mesh.scale.setScalar(w * (0.9 + 0.1 * k));
  p.mat.opacity = k * (0.9 + 0.1 * Math.sin(t * 40));
}

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const pg = useRef();
  const island = useRef([]);
  const cracks = useRef(null);
  const m = useMemo(takeParts, []);

  useEffect(() => {
    island.current = islandList(scene);
    return () => {
      m.cave.dispose();
      m.war.dispose();
      m.vor.dispose();
      m.reform.dispose();
      m.pool.dispose();
      m.portal.dispose();
      m.vel.dispose();
      m.man.dispose();
      m.mw.dispose();
      m.hs.dispose();
      m.fist.dispose();
      m.notice1.dispose();
      m.notice2.dispose();
      m.spark.dispose();
      m.flash.geometry.dispose();
      m.flash.material.dispose();
      m.mat.dispose();
    };
  }, [scene, m]);

  // the cracked lens: radial fractures over the screen (screen space, built once at mount, hidden until the punch)
  useEffect(() => {
    if (mode !== "full") return undefined;
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    let d = "";
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + (hash(i, 1) - 0.5) * 0.3;
      d += "M50 50";
      for (let k = 0; k < 6; k++) {
        const r = 6 + k * 8 + hash(i * 7 + k, 2) * 5;
        const j = (hash(i * 5 + k, 3) - 0.5) * 0.35;
        d += `L${(50 + Math.cos(a + j) * r * 1.4).toFixed(1)} ${(50 + Math.sin(a + j) * r).toFixed(1)}`;
      }
    }
    el.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%"><path d="${d}" fill="none" stroke="#06101c" stroke-width="1.6" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#e9fdff" stroke-width="0.7" stroke-linejoin="round"/></svg>`;
    el.style.cssText = "position:fixed;inset:0;z-index:44;pointer-events:none;opacity:0;transform-origin:50% 50%";
    document.body.appendChild(el);
    cracks.current = el;
    return () => {
      el.remove();
      cracks.current = null;
    };
  }, [mode]);

  // the pup stays on screen through the whole scene: Rimuru rises BESIDE it (RIMURU_AT) and the void eats the world
  // round it, never the pup
  const hid = useRef(null);
  const showPup = () => {
    if (hid.current) hid.current.visible = true;
    hid.current = null;
  };
  useEffect(() => showPup, []);
  // the camera closes on the Demon Lord while he stands (a low, close frame that he fills), then returns to the follow
  useFrame((state) => {
    const a = live.arrival;
    if (!a.id || mode !== "full") return;
    const t = sceneT(a.id, state.clock.elapsedTime - a.start);
    const cam = state.camera;
    const s = live.seal;
    const dk = smooth(9.3, 10.0, t) * (1 - smooth(13.6, 14.3, t));
    if (dk > 0.001) {
      const d = 1.5 / Math.tan((cam.fov * Math.PI) / 360);
      EYE.set(s.x + 0.15, 0.95, s.z + d);
      cam.position.lerp(EYE, dk);
      LOOK.set(s.x - 0.3, 1.5, s.z + 1.5).lerp(LOOK1.set(s.x, 1.2, s.z), dk);
      cam.lookAt(LOOK);
      cam.updateMatrixWorld();
    }
    // the return: the lens finds the statue and its plaque from the dock side
    const rb = smooth(26.9, 27.7, t);
    if (rb > 0.001) {
      const st = PLACE_BY_ID["spawn-seal"];
      EYE.set(st.x + 0.9, 1.9, st.z + 6.2);
      cam.position.lerp(EYE, rb);
      cam.lookAt(LOOK.set(st.x, 1.9, st.z));
      cam.updateMatrixWorld();
    }
    // the owner's rule: the seal is in every frame; the pup is never hidden (showPup stays as the unmount guard)
  }, 0.5);

  useFrame(() => {
    if (!live.arrival.id) {
      showPup();
      if (cracks.current) cracks.current.style.opacity = 0;
      rig.current.visible = false;
      pg.current.visible = false;
      m.notice1.mesh.visible = false;
      m.notice2.mesh.visible = false;
    }
  }, -0.5);

  useCutFrame((t, state) => {
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flash.visible = false;
    if (!full) return;
    const s = live.seal;
    const cam = state.camera;
    const c1 = tl.collapse[1];
    g.position.set(s.x, 0, s.z);
    m.mat.uniforms.uTime.value = t;
    m.mat.uniforms.uGlow.value = 0.5 + 0.5 * Math.sin(t * 9);
    const back = smooth(14.4, 14.8, t);
    const BREAK = 13.5; // the punch lands
    const war = smooth(9.2, 10.4, t); // the cave breaks open onto the battlefield
    const eat = smooth(13.6, 14.8, t);
    const gone = smooth(13.8, 14.6, t);
    m.cave.update(t, war, gone, Math.min(1, eat * 1.05));
    m.war.update(t, war, smooth(10.3, 11.8, t), 1 - gone);
    m.spark.update(t);
    m.reform.update(t);
    pg.current.position.set(s.x, s.y ?? 0, s.z);
    pg.current.visible = t > 14.5;
    g.visible = back < 0.5;

    // ---- the cast: a void ring spreads under the pup and Epsilon Hollow (memory, files, scheduler) turns beside it
    const rr = smooth(1.0, 1.6, t) * (1 - smooth(3.0, 3.8, t));
    m.portal.mesh.visible = rr > 0.01;
    m.portal.mesh.scale.setScalar(Math.max(0.001, 3.4 * rr));
    m.portal.mat.uniforms.uT.value = t;
    m.pool.mesh.visible = rr > 0.01;
    m.pool.mesh.scale.setScalar(Math.max(0.001, 2.0 * rr));
    m.pool.mat.uniforms.uT.value = t;
    const hk = smooth(1.4, 2.4, t) * (1 - smooth(9.0, 9.8, t));
    m.hs.root.visible = hk > 0.01;
    m.hs.root.position.set(-3.0, 2.4 + 0.1 * Math.sin(t * 1.5), 0.2);
    m.hs.root.scale.setScalar(Math.max(0.001, 0.95 * hk));
    m.hs.root.rotation.set(t * 0.4, t * 0.7, 0);

    // ---- Veldora in his seal (2.0), drawn into the maw at the end
    const vk = smooth(2.0, 3.0, t);
    const pull = smooth(13.7, 14.6, t);
    m.vel.root.visible = vk > 0.01 && pull < 0.995;
    m.vel.root.position.set(SEAL_AT[0] + (MAW_AT[0] - SEAL_AT[0]) * pull, SEAL_AT[1] + 0.12 * Math.sin(t * 1.4) + (MAW_AT[1] - SEAL_AT[1]) * pull, SEAL_AT[2] + (MAW_AT[2] - SEAL_AT[2]) * pull);
    m.vel.root.scale.setScalar(Math.max(0.001, vk * (1 - pull * 0.98)));
    m.vel.root.rotation.z = pull * 9;
    m.vel.update(t, vk);

    // ---- the Predator vortex engulfs the pup (8.8 -> 9.3), Demon Lord Rimuru rises from it where the pup stood (9.3 -> 10.1),
    // stands for 2.5 s (to 12.6), draws back a fist (12.6 -> 13.1) and strikes the lens (13.05 -> 13.4)
    const pk = smooth(8.8, 9.3, t) * (1 - smooth(10.1, 10.9, t));
    m.vor.mesh.visible = pk > 0.01;
    m.vor.mat.uniforms.uT.value = t;
    m.vor.mat.uniforms.uK.value = pk;
    m.vor.mesh.position.set(RIMURU_AT[0], 0, RIMURU_AT[2]);
    m.vor.mesh.scale.set(1 + 0.25 * (1 - pk), 1, 1 + 0.25 * (1 - pk));
    const mk = smooth(9.3, 10.1, t) * (1 - smooth(13.5, 13.8, t));
    m.man.root.visible = mk > 0.01;
    m.man.root.position.set(RIMURU_AT[0], 0, RIMURU_AT[2]);
    m.man.root.scale.set(0.5 + 0.5 * mk, Math.max(0.001, mk), 0.5 + 0.5 * mk);
    m.man.root.rotation.y = (1 - smooth(9.3, 10.2, t)) * 7;
    m.man.update(t, smooth(12.6, 13.1, t), smooth(13.05, 13.4, t));

    // ---- the punch: the fist flies at the lens, then the glass cracks and shatters
    const fk = smooth(13.0, 13.45, t) * (1 - smooth(13.5, 13.8, t));
    m.fist.mesh.visible = fk > 0.01;
    const hh = 5 * Math.tan((cam.fov * Math.PI) / 360);
    V.set(0.0, -hh * 0.1, -(9 - 6.8 * smooth(13.0, 13.45, t))).applyMatrix4(cam.matrixWorld);
    m.fist.mesh.position.copy(V);
    m.fist.mesh.quaternion.copy(cam.quaternion);
    m.fist.mesh.scale.setScalar(Math.max(0.001, 1.3 * fk));
    if (cracks.current) {
      const ck = smooth(BREAK, BREAK + 0.1, t) * (1 - smooth(14.2, 14.7, t));
      const sh = smooth(13.9, 14.7, t);
      cracks.current.style.opacity = ck.toFixed(2);
      cracks.current.style.transform = `scale(${(1 + sh * 0.5).toFixed(3)}) rotate(${(sh * 4).toFixed(2)}deg)`;
    }

    // ---- the void maw: opens behind the pup at the punch, swells, devours, and is gone with reality
    const wk = smooth(13.6, 14.3, t) * (1 - smooth(14.5, 14.9, t));
    m.mw.mesh.visible = wk > 0.01;
    // behind the pup as the lens sees it, whatever the composer did with the lens: the maw never covers the pup
    V.set(s.x - cam.position.x, 0, s.z - cam.position.z).normalize();
    m.mw.mesh.position.set(s.x + V.x * 7, MAW_AT[1], s.z + V.z * 7);
    m.mw.mesh.quaternion.copy(cam.quaternion);
    m.mw.mesh.scale.setScalar(Math.max(0.001, 7.5 * wk));
    m.mw.mat.uniforms.uT.value = t;

    // ---- Great Sage notices
    sage(m.notice1, cam, smooth(1.3, 1.8, t) * (1 - smooth(5.6, 6.0, t)), t);
    sage(m.notice2, cam, smooth(14.4, 14.9, t) * (1 - smooth(18.0, 18.5, t)), t);

    // ---- the pup: a seal, upright and unscaled, in its own poses
    live.pose.sign = smooth(0.3, 0.9, t) * (1 - smooth(3.0, 3.6, t));

    // ---- flashes: the cast, the punch, the devouring, the return of the island
    m.flash.material.color.set(t > 13 ? "#e6b8ff" : "#9fe6ff");
    holdFlash(m.flash, cam, bump(t, 1.6, 0.15) * 0.35 + bump(t, BREAK + 0.05, 0.12) * 0.9 + bump(t, 14.5, 0.25) * 0.7 + bump(t, 9.4, 0.2) * 0.4);

    // the island the stage hid comes back: reality is eaten and this is what remains
    if (back > 0.9 && t < c1 + 0.4) for (const o of island.current) o.visible = true;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={m.flash} />
      <primitive object={m.notice1.mesh} />
      <primitive object={m.notice2.mesh} />
      <group ref={pg} visible={false}>
        <primitive object={m.reform.mesh} />
      </group>
      <group ref={rig} visible={false}>
        <primitive object={m.cave.root} />
        <primitive object={m.war.root} />
        <primitive object={m.vor.mesh} />
        <primitive object={m.pool.mesh} />
        <primitive object={m.portal.mesh} />
        <primitive object={m.vel.root} />
        <primitive object={m.man.root} />
        <primitive object={m.hs.root} />
        <primitive object={m.mw.mesh} />
        <primitive object={m.fist.mesh} />
        <primitive object={m.spark.mesh} />
      </group>
    </>
  );
}
