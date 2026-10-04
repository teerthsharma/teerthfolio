// MujoRush: Attack on Titan, the Rumbling. The ground cracks in a line toward
// the cliff, plates fall off it and the three carved faces open their eyes and
// steam as they speak line A; a line of colossal silhouettes marches the
// horizon. The pup titan-swells (stomp, snow puffs), opens its mouth, and the
// coral block of exactly 1,282 fish-cubes standing between it and the cliff
// spirals into it top-down until nothing is left but one blue cube, balanced
// on its nose when the pup shrinks back; a flock of seabirds bursts off the
// cliff on the last word and the pup flips the cube on the flex line. Burnt
// orange haze, ash and halftone come from the move's own sky (a shader). The
// pup's scale is set on its own root group and put back the moment the scene
// ends, is skipped, or mounts without motion. Shape, colour, pose.
// Cost by construction: dome, ground, motes, block (1,282 cubes, one instanced
// mesh), steam, eyes, plates, crack, march, gulls, cube: about 14 draw calls.
// Card: lib/world/cutscene/cards/pr-mujoco-3396.js.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, BoxGeometry, Color, IcosahedronGeometry, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, OctahedronGeometry, SphereGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { EYES } from "../../land/parts/mujorush-build";
import { Speaker, Stage, onTwos, smooth, useCutFrame } from "../kit";
import { Dome, Motes } from "./_g1";

const D = new Object3D();
const PAL = {
  top: "#2b140a", mid: "#8a3f1a", hor: "#e98a3a", bot: "#4a2210", glow: "#ffc27a", dot: "#2a1208", glowK: 0.55, dotK: 0.85,
  groundIn: "#7a4a2c", groundOut: "#3a1c0e", groundDot: "#22100a",
};
const mat = (o = {}) => new MeshBasicMaterial({ toneMapped: false, fog: false, ...o });
const put = (m, i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => {
  D.position.set(x, y, z);
  D.rotation.set(rx, ry, rz);
  D.scale.set(sx, sy, sz);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
};
const inst = (g, m, n, colors) => {
  const mesh = new InstancedMesh(g, m, n);
  mesh.frustumCulled = false;
  if (colors) colors.forEach((c, i) => mesh.setColorAt(i, c));
  return mesh;
};
const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
const ease = (x) => x * x * (3 - 2 * x);

const FISH = 1282; // the figure's own count: units, 1,282 copies
const NX = 11;
const NY = 13;
const NZ = 9; // 11 x 13 x 9 = 1,287; the first 1,282 stand
const CUBE = 0.17;
const BLOCK_AT = [2.6, 0, -0.9]; // beside the pup, between it and the cliff (pup-local, turned toward the cliff)
const CORAL = ["#ff8f7a", "#f6a08a", "#ff7d6b", "#ffb199"].map((c) => new Color(c));
const SWELL = 1.8; // titan scale (the camera is capped: more leaves the frame)
const T = { swell: 3.0, drain: 3.5, drainEnd: 4.55, shrink: 4.8, gulls: 6.3, flip: 7.35 };
const MARCH = 12;
const STEAM = 42;
const PLATES = 30;
const CRACK = 16;
const GULLS = 8;
const CELLS = [];
for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) if (CELLS.length < FISH) CELLS.push([x, y, z]);

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const g = useRef();
  const w = useRef(); // the cliff's own overlays, world space
  const cube = useRef();
  const f = useMemo(() => {
    const block = inst(new BoxGeometry(1, 1, 1), mat(), FISH, CELLS.map((_, i) => CORAL[Math.floor(hash(i + 3) * 4)]));
    const steam = inst(new IcosahedronGeometry(1, 1), mat({ transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }), STEAM, Array(STEAM).fill(new Color("#ff9d5c")));
    const eyes = inst(new SphereGeometry(1, 10, 6), mat({ transparent: true, opacity: 0.95 }), EYES.length, Array(EYES.length).fill(new Color("#ffb04a")));
    const plates = inst(new BoxGeometry(1, 0.5, 0.8), mat(), PLATES, Array.from({ length: PLATES }, (_, i) => new Color(i % 2 ? "#7b6657" : "#5f4d41")));
    const crack = inst(new BoxGeometry(1, 0.02, 0.14), mat(), CRACK * 2, Array.from({ length: CRACK * 2 }, (_, i) => new Color(i < CRACK ? "#120806" : "#ff8a3a")));
    const march = inst(
      mergeGeometries([new SphereGeometry(0.5, 8, 6).scale(1, 0.85, 1.3).translate(0, 0.45, 0).toNonIndexed(), new SphereGeometry(0.34, 8, 6).translate(0, 1.0, 0.45).toNonIndexed()].map((x) => (x.deleteAttribute("uv"), x.deleteAttribute("normal"), x))),
      mat(),
      MARCH,
      Array(MARCH).fill(new Color("#1c0b05")),
    );
    const gulls = inst(new OctahedronGeometry(1, 0).scale(0.55, 0.03, 0.16), mat(), GULLS, Array(GULLS).fill(new Color("#fff6ea")));
    const dust = inst(new IcosahedronGeometry(1, 1), mat({ transparent: true, opacity: 0.4, depthWrite: false }), 10, Array(10).fill(new Color("#f4e7da")));
    return { block, steam, eyes, plates, crack, march, gulls, dust };
  }, []);
  const noseCube = useMemo(() => {
    const k = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: "#4a5bff", emissive: "#2a3acc", emissiveIntensity: 0.45, flatShading: true, roughness: 0.5 }));
    const rim = new Mesh(new BoxGeometry(1, 1, 1), mat({ color: "#fbf6ec", side: BackSide }));
    rim.scale.setScalar(1.22);
    k.add(rim);
    return k;
  }, []);

  // the pup always goes back to its own size, whatever ended the scene
  useFrame(() => {
    const seal = scene.getObjectByName("seal");
    if (seal && !live.arrival.id && seal.scale.x !== 1) seal.scale.setScalar(1);
  }, -1.1);
  useEffect(() => () => scene.getObjectByName("seal")?.scale.setScalar(1), [scene]);

  useCutFrame((t) => {
    const s = live.seal;
    const seal = scene.getObjectByName("seal");
    const full = mode === "full";
    g.current.visible = full;
    w.current.visible = full;
    if (!full) {
      seal?.scale.setScalar(1);
      return;
    }
    const a = turnFor(card, place, s.x, s.z);
    g.current.position.set(s.x, 0, s.z);
    g.current.rotation.y = a;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const tt = onTwos(t);
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);

    // THE PUP: plants its flippers (crouch), swells with an overshoot, stomps, opens its mouth, shrinks back to a crouch, flips the cube, raises it
    const up = smooth(T.swell, T.swell + 0.35, tt);
    const over = up * (1 + 0.14 * Math.sin(Math.PI * Math.min(1, (tt - T.swell) / 0.5)) * (tt > T.swell ? 1 : 0));
    const back = smooth(T.shrink, T.shrink + 0.4, tt);
    const size = 1 + (SWELL - 1) * Math.max(0, over - back) * out;
    seal?.scale.setScalar(size);
    const plant = smooth(0.4, 0.9, tt) * (1 - smooth(1.15, 1.4, tt));
    const stomp = tt > T.swell + 0.4 && tt < T.swell + 0.6 ? 1 : 0;
    live.pose.crouch = Math.min(1, 0.7 * plant + 0.9 * smooth(T.shrink, T.shrink + 0.3, tt) * (1 - smooth(T.flip - 0.2, T.flip, tt)) + 0.7 * stomp) * out;
    live.pose.raise = (0.7 * up * (1 - back) + 0.8 * smooth(T.flip, T.flip + 0.3, tt)) * out;
    const open = smooth(T.drain - 0.2, T.drain + 0.1, tt) * (1 - smooth(T.drainEnd + 0.1, T.drainEnd + 0.3, tt));
    live.pose.mouth = open * out;

    // THE BLOCK of 1,282 cubes, draining top-down into the mouth in a spiral
    const M = live.anchors.mouth;
    const mx = ca * (M.x - s.x) - sa * (M.z - s.z);
    const mz = sa * (M.x - s.x) + ca * (M.z - s.z);
    const my = M.y;
    const appear = smooth(1.2, 2.0, tt) * out;
    for (let i = 0; i < FISH; i++) {
      const [cx, cy, cz] = CELLS[i];
      const ox = BLOCK_AT[0] + (cx - (NX - 1) / 2) * CUBE;
      const oy = 0.1 + cy * CUBE + CUBE / 2;
      const oz = BLOCK_AT[2] + (cz - (NZ - 1) / 2) * CUBE;
      const d0 = T.drain + (1 - cy / (NY - 1)) * (T.drainEnd - T.drain - 0.7) + hash(i, 5) * 0.08; // top-down, a few at once
      const u = (tt - d0) / 0.7;
      if (u >= 1) {
        put(f.block, i, 0, -9, 0, 0.0001);
        continue;
      }
      if (u <= 0) {
        const k = CUBE * appear;
        put(f.block, i, ox, oy, oz, k, k, k, 0, hash(i) * 0.15, 0);
        continue;
      }
      const e = ease(u);
      const px = ox + (mx - ox) * e;
      const pz = oz + (mz - oz) * e;
      const dx = mx - ox;
      const dz = mz - oz;
      const len = Math.hypot(dx, dz) || 1;
      const th = u * Math.PI * 3 + hash(i, 6) * 6.28;
      const r = (1 - u) * (0.7 + 0.5 * hash(i, 7)); // the swirl tightens as it nears the mouth
      const py = oy + (my - oy) * e + Math.sin(th) * r;
      const k = CUBE * (1 - 0.7 * u);
      put(f.block, i, px + (-dz / len) * Math.cos(th) * r, py, pz + (dx / len) * Math.cos(th) * r, k, k, k, th, th * 0.7, 0);
    }
    f.block.instanceMatrix.needsUpdate = true;

    // the blue cube on the nose once the pup is pup-sized again, flipped and caught on the flex line
    const N = live.anchors.nose;
    const hop = tt > T.flip + 0.1 && tt < T.flip + 0.9 ? Math.sin(((tt - T.flip - 0.1) / 0.8) * Math.PI) : 0;
    const show = smooth(T.drainEnd, T.drainEnd + 0.2, tt) * out;
    cube.current.visible = show > 0.01 && tt > T.drainEnd;
    cube.current.position.set(ca * (N.x - s.x) - sa * (N.z - s.z), N.y + 0.36 * Math.max(size, 1) + 0.9 * hop, sa * (N.x - s.x) + ca * (N.z - s.z));
    cube.current.scale.setScalar(0.4 * show);
    cube.current.rotation.set(0.6 * hop * 6.28, tt * 0.5, 0.2 * Math.sin(tt * 2));

    // the ground cracks toward the cliff, orange light in it
    const dir = [0.9, -0.43]; // toward the block, then the cliff
    const grow = smooth(0.6, 1.5, tt) * out;
    for (let i = 0; i < CRACK; i++) {
      const u = (i + 0.5) / CRACK;
      const x = dir[0] * (0.8 + u * 5.2 * grow) + (hash(i, 8) - 0.5) * 0.35;
      const z = dir[1] * (0.8 + u * 5.2 * grow) + (hash(i, 9) - 0.5) * 0.35;
      const len = 0.5 * (1 - 0.4 * u) * (u < grow ? 1 : 0) * grow;
      const ang = Math.atan2(dir[0], dir[1]) + (hash(i, 10) - 0.5) * 1.1;
      put(f.crack, i, x, 0.03, z, len, 1, 1.6, 0, ang + Math.PI / 2, 0);
      put(f.crack, CRACK + i, x, 0.045, z, len * 0.9, 1, 0.6, 0, ang + Math.PI / 2, 0);
    }
    f.crack.instanceMatrix.needsUpdate = true;

    // the horizon march: colossal silhouettes in lockstep, bobbing on twos
    const walk = smooth(2.1, 2.8, tt) * out;
    for (let i = 0; i < MARCH; i++) {
      const x = -26 + i * 2.8 + (hash(i) - 0.5) * 1.2;
      const z = -24 - 6 * hash(i, 1);
      const sc = (7 + 3 * hash(i, 2)) * walk;
      put(f.march, i, x, Math.abs(Math.sin(tt * 2.4)) * 0.5 * sc * 0.08, z, sc, sc, sc, 0, 0.25, 0);
    }
    f.march.instanceMatrix.needsUpdate = true;

    // snow puffs at the stomp
    const sp = (tt - (T.swell + 0.4)) / 0.7;
    for (let i = 0; i < 10; i++) {
      const aa = (i / 10) * Math.PI * 2;
      const rr = sp > 0 && sp < 1 ? 0.8 + 2.4 * sp : 0;
      put(f.dust, i, Math.cos(aa) * rr, 0.2 + 0.5 * sp, Math.sin(aa) * rr, sp > 0 && sp < 1 ? 0.2 * (1 - sp) * Math.max(size, 1) : 0.0001);
    }
    f.dust.instanceMatrix.needsUpdate = true;

    // the gulls burst off the cliff, flapping on twos, and wheel away over the camera
    for (let i = 0; i < GULLS; i++) {
      const u = (tt - (T.gulls + i * 0.07)) / 2.2;
      if (u <= 0 || u >= 1) {
        put(f.gulls, i, 0, -9, 0, 0.0001);
        continue;
      }
      const ph = hash(i, 3) * 6.28;
      const x = 2.7 + (hash(i, 4) - 0.5) * 3 + (-7 - 2.7) * u + 2 * Math.sin(u * 5 + ph);
      const y = 6 + 8 * u + hash(i, 5) * 2;
      const z = -5.1 + 17 * u;
      put(f.gulls, i, x, y, z, 0.7, 1, 0.7, 0, 0.5, Math.sin(tt * 18 + ph) * 0.7);
    }
    f.gulls.instanceMatrix.needsUpdate = true;

    // the cliff, world space: eyes open (lids rise), steam boils off the faces, plates fall
    const open1 = smooth(2.0, 2.6, tt) * out;
    for (let i = 0; i < EYES.length; i++) {
      const e = EYES[i];
      put(f.eyes, i, e.x, e.y, e.z + e.sz * 0.9, e.sx * 0.8, Math.max(e.sy * 0.8 * open1, 0.0001), e.sz * 0.5);
    }
    f.eyes.instanceMatrix.needsUpdate = true;
    const boil = smooth(2.0, 2.5, tt) * out;
    for (let i = 0; i < STEAM; i++) {
      const face = i % 3;
      const fx = EYES[face * 2].x + 1.72; // between the face's two eyes
      const life = (tt * 0.4 + hash(i)) % 1;
      const k = boil * Math.sin(life * Math.PI) * (0.5 + 0.7 * hash(i, 2));
      put(f.steam, i, fx + (hash(i, 3) - 0.5) * 2.4, EYES[face * 2].y - 2.4 + life * 4.2, EYES[face * 2].z + 1.0 + hash(i, 4) * 0.8, k * 0.8);
    }
    f.steam.instanceMatrix.needsUpdate = true;
    const fall = tt - 1.15;
    for (let i = 0; i < PLATES; i++) {
      const face = i % 3;
      const x0 = EYES[face * 2].x + 0.86 + (hash(i, 1) - 0.5) * 5;
      const y0 = EYES[face * 2].y + 1 + hash(i, 2) * 4;
      const z0 = EYES[face * 2].z + 0.5;
      const delay = hash(i, 3) * 0.7;
      const tau = Math.max(0, fall - delay);
      const y = Math.max(0.2, y0 - 4.9 * tau * tau);
      const sz = (0.5 + 0.5 * hash(i, 4)) * (fall > 0 ? 1 : 0.0001) * out;
      put(f.plates, i, x0, y, z0 + 0.4 * tau * hash(i, 6), sz, sz, sz, y > 0.2 ? tau * 2 * hash(i) : 0.2, hash(i, 7), y > 0.2 ? tau * hash(i, 8) : 0.1);
    }
    f.plates.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <Stage {...cut} bare />
      <Dome tl={tl} mode={mode} pal={PAL} />
      <Motes mode={mode} tl={tl} n={130} span={[22, 9, 16]} center={[0, 0, -3]} dir={[0.25, -0.35, 0]} size={0.06} color={["#ffb36a", "#e87a30", "#f4d2b0"]} sway={0.4} />
      <Speaker {...cut} />
      <group ref={g} visible={false}>
        <primitive object={f.block} />
        <primitive object={f.crack} />
        <primitive object={f.march} />
        <primitive object={f.dust} />
        <primitive object={f.gulls} />
        <primitive ref={cube} object={noseCube} visible={false} />
      </group>
      <group ref={w} visible={false}>
        <primitive object={f.eyes} />
        <primitive object={f.steam} />
        <primitive object={f.plates} />
      </group>
    </>
  );
}
