// MujoRush: Attack on Titan, the Rumbling. The carved titan faces speak line A;
// yellow lightning strikes the pup, steam boils off it, it swells to titan
// scale and walks the wall of fish (the quadratic copies) down from the middle
// out until one tiny blue cube is left. Shape, colour, pose: no face, hair,
// wings or logo. The pup's scale is set on its own root group and put back
// the moment the scene ends or is skipped.
// Cost by construction: fish, bolt, steam and cube are four draw calls.
// Card: lib/world/cutscene/cards/pr-mujoco-3396.js.

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Speaker, Stage, onTwos, smooth, useCutFrame } from "../kit";

const D = new Object3D();
const mat = (o = {}) => new MeshBasicMaterial({ toneMapped: false, fog: false, ...o });
const put = (m, i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => {
  D.position.set(x, y, z);
  D.rotation.set(rx, ry, rz);
  D.scale.set(sx, sy, sz);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
};
const hash = (i) => (((Math.sin(i * 127.1) * 43758.5453) % 1) + 1) % 1;
const COLS = 26;
const ROWS = 7;
const FISH = COLS * ROWS;
const BOLT = 14;
const STEAM = 26;
const SWELL = 2.3; // the pup at titan scale (the camera is capped: more leaves the frame)

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const g = useRef();
  const scene = useThree((s) => s.scene);
  const f = useMemo(() => {
    const body = new OctahedronGeometry(1, 0).scale(0.55, 0.24, 0.16).toNonIndexed();
    const tail = new OctahedronGeometry(1, 0).scale(0.22, 0.2, 0.05).rotateZ(Math.PI / 4).translate(-0.62, 0, 0).toNonIndexed();
    for (const x of [body, tail]) {
      x.deleteAttribute("uv");
      x.deleteAttribute("normal");
    }
    const fish = new InstancedMesh(mergeGeometries([body, tail]), mat(), FISH);
    const cols = ["#f4c9b8", "#cfe0ea", "#f6e3b4", "#bcd0e6"].map((c) => new Color(c));
    for (let i = 0; i < FISH; i++) fish.setColorAt(i, cols[Math.floor(hash(i + 3) * 4)]);
    const bolt = new InstancedMesh(new OctahedronGeometry(1, 0).scale(0.16, 1, 0.16), mat(), BOLT * 2);
    for (let i = 0; i < BOLT * 2; i++) bolt.setColorAt(i, new Color(i < BOLT ? "#ffd23a" : "#fffbe6"));
    const steam = new InstancedMesh(new IcosahedronGeometry(1, 1), mat({ transparent: true, opacity: 0.6, depthWrite: false }), STEAM);
    for (let i = 0; i < STEAM; i++) steam.setColorAt(i, new Color("#f4f6f8"));
    const cube = new InstancedMesh(new BoxGeometry(1, 1, 1), mat(), 1);
    cube.setColorAt(0, new Color("#58a8ff"));
    for (const m of [fish, bolt, steam, cube]) m.frustumCulled = false;
    return { fish, bolt, steam, cube };
  }, []);

  useEffect(() => () => scene.getObjectByName("seal")?.scale.setScalar(1), [scene]);

  useCutFrame((t) => {
    const s = live.seal;
    const seal = scene.getObjectByName("seal");
    g.current.position.set(s.x, 0, s.z);
    g.current.rotation.y = turnFor(card, place, s.x, s.z);
    const full = mode === "full";
    const tt = full ? onTwos(t) : tl.lineB + 0.4;
    const strike = tl.move[0] - 1.5; // the bolt lands
    const hit = smooth(strike, strike + 0.2, tt) * (1 - smooth(strike + 0.7, strike + 0.9, tt));
    const swell = smooth(tl.move[0] - 0.7, tl.move[1] + 0.2, tt) * (1 - smooth(tl.collapse[0], tl.collapse[1], tt));
    const march = smooth(tl.move[1] - 0.2, tl.collapse[0] - 0.3, tt);
    const fade = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    if (full) {
      live.pose.raise = swell * 0.8;
      live.pose.crouch = hit * 0.7;
      seal?.scale.setScalar(1 + (SWELL - 1) * swell);
    }

    // yellow lightning, redrawn every drawing: a thick stroke and a cream core on one path
    const seed = Math.floor(tt * 12);
    let px = 0.1;
    let py = 9;
    const w = hit > 0.01 ? 1 : 0;
    for (let i = 0; i < BOLT; i++) {
      const nx = i === BOLT - 1 ? 0 : (hash(seed * 31 + i) - 0.5) * 1.3;
      const ny = 9 - ((i + 1) / BOLT) * 8;
      const dx = nx - px;
      const dy = ny - py;
      const len = Math.hypot(dx, dy) / 2;
      const rz = -Math.atan2(dx, dy);
      put(f.bolt, i, (px + nx) / 2 + 0.2, (py + ny) / 2, 0.3, 0.6 * w, len * w, 0.6 * w, 0, 0, rz);
      put(f.bolt, BOLT + i, (px + nx) / 2 + 0.2, (py + ny) / 2, 0.32, 0.22 * w, len * w, 0.22 * w, 0, 0, rz);
      px = nx;
      py = ny;
    }
    f.bolt.instanceMatrix.needsUpdate = true;

    // steam boils up off the pup from the strike on and thins out
    const boil = smooth(strike, strike + 0.3, tt) * (1 - smooth(tl.move[1], tl.move[1] + 1.4, tt));
    for (let i = 0; i < STEAM; i++) {
      const life = (tt * 0.45 + hash(i)) % 1;
      const a = hash(i + 9) * Math.PI * 2;
      const rr = (0.3 + 0.7 * hash(i + 4)) * (0.5 + 0.9 * swell + 0.6 * life);
      const k = boil * Math.sin(life * Math.PI) * (0.18 + 0.2 * hash(i + 2)) * (1 + swell);
      put(f.steam, i, Math.cos(a) * rr, 0.3 + life * (1.8 + 1.6 * swell), Math.sin(a) * rr * 0.7, k);
    }
    f.steam.instanceMatrix.needsUpdate = true;

    // the wall of fish stands horizon-wide behind the pup; the swollen pup wades it down,
    // each fish popping away when the stride reaches it, the middle first
    for (let i = 0; i < FISH; i++) {
      const u = ((i % COLS) / (COLS - 1) - 0.5) * 2;
      const row = Math.floor(i / COLS);
      const x = -5.5 + u * 11 - row * 0.3 + (hash(i) - 0.5) * 0.5; // the wall fills the left of the frame, away from the landform
      const z = -3.2 - row * 1.1 + (hash(i + 5) - 0.5) * 0.4;
      const y = 0.5 + row * 0.42 + 0.12 * Math.sin(tt * 2 + i);
      const reach = Math.abs(u) * 0.8 + row * 0.1;
      const gone = smooth(reach * 0.9, reach * 0.9 + 0.12, march);
      const k = (0.5 + 0.12 * hash(i + 1)) * (1 - gone) * smooth(tl.move[0] - 1.2, tl.move[0] - 0.4, tt) * fade;
      put(f.fish, i, x, y + 0.6 * gone, z, k, k, k, 0, hash(i) < 0.5 ? 0 : Math.PI, 0.1 * Math.sin(tt * 3 + i));
    }
    f.fish.instanceMatrix.needsUpdate = true;

    // one tiny blue cube remains at the titan's foot
    const q = smooth(tl.collapse[0] - 1.0, tl.collapse[0] - 0.4, tt) * fade;
    put(f.cube, 0, -2.5, 0.3 + 0.04 * Math.sin(tt * 3), 1.6, 0.42 * q, 0.42 * q, 0.42 * q, 0, tt * 0.6, 0);
    f.cube.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <group ref={g}>
        <primitive object={f.fish} />
        <primitive object={f.bolt} />
        <primitive object={f.steam} />
        <primitive object={f.cube} />
      </group>
    </>
  );
}
