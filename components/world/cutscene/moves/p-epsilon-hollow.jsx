// epsilon-hollow: TENSURA (That Time I Got Reincarnated as a Slime). The pup stays a seal. It is reincarnated at a glowing cave
// pool in the crystal Sealed Cave; the Great Sage (a floating blue holographic panel) announces "Unique Skill: Predator acquired"
// as Veldora, the black-and-gold Storm Dragon, hangs sealed in his glowing sphere. The pup becomes Demon Lord Rimuru: a towering
// black-haired, golden-eyed silhouette over it, and MEGIDDO rains sunbeams from floating water lenses. Then he eats reality:
// a black void maw spirals the sky, the ground, the lenses and Veldora's seal into itself. That is the explained return
// ("Return to the island: route calculated."): reality is eaten and the island is what remains. Everything is built at mount
// (and prewarmed on approach); nothing is allocated per frame. Card: lib/world/cutscene/cards/p-epsilon-hollow.js.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Group, Vector3 } from "three";
import { PLACE_BY_ID } from "../../../../lib/world/places";
import { cutsceneMode } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, smooth, useCutFrame } from "../kit";
import { flashQuad, holdFlash, islandList } from "./p-caustic/parts";
import { particles } from "./p-epsilon-hollow/fx";
import { caveSky, floor, hollowSphere, human, makeRim, maw, megiddo, ripple, sagePanel, veldora } from "./p-epsilon-hollow/slime";

const SEAL_AT = [4.2, 2.7, -1.5]; // Veldora's seal, beside the pup
const MAW_AT = [0, 3.6, -9];
const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);
const V = new Vector3();

function build() {
  const mat = makeRim();
  const sky = caveSky();
  const ground = floor(mat);
  const pool = ripple("#1fb8ff", "#7ff8ff", false);
  const portal = ripple("#8a3fff", "#ff5ad8", true);
  const vel = veldora(mat);
  const man = human(mat);
  const meg = megiddo(mat);
  const mw = maw();
  const hs = hollowSphere();
  const notice1 = sagePanel("《Notice》 Unique Skill: Predator acquired.");
  const notice2 = sagePanel("《Notice》 Return to the island: route calculated.");
  const spark = particles(mat, [
    { n: 50, at: [0, 0.2, 0], r: 2, t0: 0.8, spread: 2.2, speed: 2.5, up: 1.6, vy: 1.4, life: 1.6, g: 3, size: 0.14, colors: ["#3fdcff", "#ffffff", "#9fe6ff", "#ff7ae0"], seed: 1 },
    { n: 60, at: SEAL_AT, r: 1.4, t0: 4.0, spread: 3.0, speed: 3, up: 1.2, vy: 1.2, life: 1.4, g: 2, size: 0.16, colors: ["#ffd23a", "#3aa6ff", "#ffffff"], seed: 2 },
    { n: 70, at: [0, 0.3, 0], r: 2.5, t0: 8.6, spread: 1.6, speed: 4, up: 2.2, vy: 1.8, life: 1.4, g: 2, size: 0.18, colors: ["#8a5bff", "#ffffff", "#ffd23a", "#3fdcff"], seed: 3 },
    { n: 60, at: [0, 0.3, -2], r: 6, t0: 11.0, spread: 5.5, speed: 3, up: 1.4, vy: 1.2, life: 1.5, g: 8, size: 0.2, colors: ["#ffd37a", "#ffffff", "#ff9a3a"], seed: 4 },
    { n: 60, at: [0, 0.3, 0], r: 4, t0: 24.4, spread: 1.0, speed: 5, up: 2.0, vy: 1.6, life: 1.2, g: 3, size: 0.16, colors: ["#3fdcff", "#ffffff", "#ff5ad8"], seed: 5 },
  ]);
  const flash = flashQuad("#cfe6ff");
  return { mat, sky, ground, pool, portal, vel, man, meg, mw, hs, notice1, notice2, spark, flash };
}

// ---- PREWARM: near the dock the parts are built and every program compiled, drawn at scale ~0 for four frames, then taken away.
let PRE = null;
const takeParts = () => {
  const p = PRE;
  PRE = null;
  return p?.m ?? build();
};
function warmUp(w) {
  const m = build();
  PRE = { m };
  const root = new Group();
  root.scale.setScalar(0.0001);
  root.position.set(live.seal.x, -400, live.seal.z);
  const mine = [m.sky.mesh, m.ground, m.pool.mesh, m.portal.mesh, m.vel.root, m.man.root, m.meg.root, m.mw.mesh, m.hs.root, m.notice1.mesh, m.notice2.mesh, m.spark.mesh, m.flash];
  const kept = [];
  for (const o of mine) {
    o.traverse((x) => kept.push([x, x.visible]));
    root.add(o);
  }
  for (const [x] of kept) x.visible = true;
  w.scene.add(root);
  let n = 0;
  const done = () => {
    if (++n < 4) return requestAnimationFrame(done);
    for (const o of mine) o.removeFromParent();
    for (const [x, v] of kept) x.visible = v;
    root.removeFromParent();
  };
  requestAnimationFrame(done);
}
if (typeof window !== "undefined" && cutsceneMode("p-epsilon-hollow") === "full") {
  const dock = PLACE_BY_ID["p-epsilon-hollow"];
  const poll = setInterval(() => {
    const w = window.__world;
    if (!w?.scene || !live.seal) return;
    if (Math.hypot(live.seal.x - dock.x, live.seal.z - dock.z) > 48) return;
    clearInterval(poll);
    warmUp(w);
  }, 400);
}

// a Great Sage panel floats in the upper third of the frame (screen space, in front of the camera)
function sage(p, cam, k, t) {
  p.mesh.visible = k > 0.01;
  if (!p.mesh.visible) return;
  const d = 6;
  const hh = d * Math.tan((cam.fov * Math.PI) / 360);
  const hw = hh * cam.aspect;
  const w = Math.min(hw * 1.2, hh * 2 * 1.9);
  V.set(-hw * 0.28, hh * 0.62 + 0.04 * Math.sin(t * 2), -d).applyMatrix4(cam.matrixWorld);
  p.mesh.position.copy(V);
  p.mesh.quaternion.copy(cam.quaternion);
  p.mesh.scale.setScalar(w * (0.9 + 0.1 * k));
  p.mat.opacity = k * (0.9 + 0.1 * Math.sin(t * 40));
}

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const island = useRef([]);
  const m = useMemo(takeParts, []);

  useEffect(() => {
    island.current = islandList(scene);
    return () => {
      m.sky.dispose();
      m.ground.geometry.dispose();
      m.pool.dispose();
      m.portal.dispose();
      m.vel.dispose();
      m.man.dispose();
      m.meg.dispose();
      m.mw.dispose();
      m.hs.dispose();
      m.notice1.dispose();
      m.notice2.dispose();
      m.spark.dispose();
      m.flash.geometry.dispose();
      m.flash.material.dispose();
      m.mat.dispose();
    };
  }, [scene, m]);

  useFrame(() => {
    if (!live.arrival.id) {
      rig.current.visible = false;
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
    const c0 = tl.collapse[0];
    const c1 = tl.collapse[1];
    g.position.set(s.x, 0, s.z);
    m.mat.uniforms.uTime.value = t;
    m.mat.uniforms.uGlow.value = 0.5 + 0.5 * Math.sin(t * 9);
    const back = smooth(c0 - 0.6, c0 + 0.5, t);

    // ---- reality, until it is eaten: the cave and its pool; all of it is gone on the return
    const eat = smooth(17.4, 23.6, t);
    const gone = smooth(18.4, 23.0, t);
    m.sky.mesh.material.uniforms.uEat.value = Math.min(1, eat * 1.05);
    m.sky.mesh.visible = back < 0.5;
    m.ground.visible = gone < 0.995 && back < 0.5;
    m.ground.scale.set(Math.max(0.001, 1 - gone), 1, Math.max(0.001, 1 - gone));
    m.ground.rotation.y = gone * 7;
    m.ground.position.y = -gone * 6;
    m.spark.update(t);

    // ---- the pool: the reincarnation, rings spreading under the pup
    const pk = smooth(0.4, 1.4, t) * (1 - smooth(5.0, 6.0, t));
    m.pool.mesh.visible = pk > 0.01;
    m.pool.mesh.scale.setScalar(Math.max(0.001, 2.6 * pk));
    m.pool.mat.uniforms.uT.value = t;
    m.pool.mat.uniforms.uK.value = 0.7 + 0.5 * bump(t, 1.4, 0.5);

    // ---- Veldora in his seal: fades in on the Predator notice, is drawn into the maw
    const vk = smooth(4.0, 5.0, t);
    const pull = smooth(19.0, 21.2, t);
    m.vel.root.visible = vk > 0.01 && pull < 0.995;
    m.vel.root.position.set(SEAL_AT[0] + (MAW_AT[0] - SEAL_AT[0]) * pull, SEAL_AT[1] + 0.12 * Math.sin(t * 1.4) + (MAW_AT[1] - SEAL_AT[1]) * pull, SEAL_AT[2] + (MAW_AT[2] - SEAL_AT[2]) * pull);
    m.vel.root.scale.setScalar(Math.max(0.001, vk * (1 - pull * 0.98)));
    m.vel.root.rotation.z = pull * 9;
    m.vel.update(t, vk);

    // ---- the hollow sphere (memory, files, scheduler): beside the pup on the owner's line, then eaten with the rest
    const hk = smooth(14.0, 15.0, t) * (1 - smooth(19.5, 21.0, t));
    m.hs.root.visible = hk > 0.01;
    m.hs.root.position.set(-3.0, 2.4 + 0.1 * Math.sin(t * 1.5), 0.2);
    m.hs.root.scale.setScalar(Math.max(0.001, 0.95 * hk));
    m.hs.root.rotation.set(t * 0.4, t * 0.7, 0);

    // ---- Demon Lord Rimuru rises behind the pup in a spiral (8.6 -> 10.2), towers, and dissolves once reality is eaten
    const mk = smooth(8.6, 10.2, t) * (1 - smooth(21.4, 22.6, t));
    m.man.root.visible = mk > 0.01;
    m.man.root.position.set(0, 0, -2.4);
    m.man.root.scale.setScalar(Math.max(0.001, 1.75 * mk));
    m.man.root.rotation.y = (1 - smooth(8.6, 10.4, t)) * 9;

    // ---- MEGIDDO: lenses gather (10.0), beams rain (10.8 -> 17.5), and the lenses are eaten with the sky
    const lk = smooth(10.0, 11.0, t) * (1 - smooth(18.0, 20.0, t));
    const rk = smooth(10.8, 12.4, t) * (1 - smooth(16.6, 18.0, t));
    m.meg.root.visible = lk > 0.01;
    m.meg.update(t, rk, lk);

    // ---- the void maw: opens behind the pup at 17.4, swells, devours, and closes on the return
    const wk = smooth(17.4, 20.0, t) * (1 - smooth(c0 + 0.2, c1, t));
    m.mw.mesh.visible = wk > 0.01;
    m.mw.mesh.position.set(MAW_AT[0] + s.x, MAW_AT[1], MAW_AT[2] + s.z);
    m.mw.mesh.quaternion.copy(cam.quaternion);
    m.mw.mesh.scale.setScalar(Math.max(0.001, 7.5 * wk));
    m.mw.mat.uniforms.uT.value = t;

    // ---- the slime portal ripple that carries the pup home
    const rr = smooth(c0 - 0.3, c0 + 0.5, t) * (1 - smooth(c1 - 0.2, c1 + 0.3, t));
    m.portal.mesh.visible = rr > 0.01;
    m.portal.mesh.scale.setScalar(Math.max(0.001, 4.5 * rr));
    m.portal.mat.uniforms.uT.value = t;

    // ---- Great Sage notices
    sage(m.notice1, cam, smooth(4.4, 4.9, t) * (1 - smooth(8.2, 8.6, t)), t);
    sage(m.notice2, cam, smooth(21.0, 21.5, t) * (1 - smooth(c0 + 0.1, c0 + 0.5, t)), t);

    // ---- the pup: a seal, upright and unscaled, in its own poses
    live.pose.sign = smooth(0.3, 0.9, t) * (1 - smooth(1.0, 1.2, t));
    live.pose.crouch = smooth(2.8, 3.3, t) * (1 - smooth(5.6, 6.4, t));

    // ---- flashes: the reincarnation, the power-up, the first bite, the return
    m.flash.material.color.set(t > 17 ? "#e6b8ff" : "#9fe6ff");
    holdFlash(m.flash, cam, bump(t, 1.4, 0.15) * 0.35 + bump(t, 8.8, 0.2) * 0.4 + bump(t, 17.6, 0.2) * 0.4 + bump(t, c1 - 0.2, 0.3) * 0.6);

    // the island the stage hid comes back: reality is eaten and this is what remains
    if (back > 0.9 && t < c1 + 0.4) for (const o of island.current) o.visible = true;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={m.flash} />
      <primitive object={m.notice1.mesh} />
      <primitive object={m.notice2.mesh} />
      <group ref={rig} visible={false}>
        <primitive object={m.sky.mesh} />
        <primitive object={m.ground} />
        <primitive object={m.pool.mesh} />
        <primitive object={m.portal.mesh} />
        <primitive object={m.vel.root} />
        <primitive object={m.man.root} />
        <primitive object={m.meg.root} />
        <primitive object={m.hs.root} />
        <primitive object={m.mw.mesh} />
        <primitive object={m.spark.mesh} />
      </group>
    </>
  );
}
