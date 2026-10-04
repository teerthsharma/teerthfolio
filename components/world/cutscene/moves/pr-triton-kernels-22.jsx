// Triton kernels: the scouter. A broad ink figure with a flame crown and one
// scouter lens says "It's over 804!"; the pup cups its flippers and charges a
// FINAL FLASH, a gold beam that crosses the glacier; the causal-attention
// triangle of ice blocks goes dark, only the scheduled path stays lit; the
// scouter's lens cracks. Shape, colour, pose: no face, no logo.
// Cost by construction: blocks, beam, flare and crack are four draw calls.
// Card: lib/world/cutscene/cards/pr-triton-kernels-22.js.

import { useMemo, useRef } from "react";
import { AdditiveBlending, BoxGeometry, Color, CylinderGeometry, DoubleSide, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry } from "three";
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
const ROWS = 6; // the causal triangle: row r holds r + 1 blocks, a query seeing only its past
const IDX = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c <= r; c++) IDX.push([r, c]);
const BLOCKS = IDX.length;
// the scheduled path: one lit staircase, the rest goes dark
const onPath = ([, c]) => c === 0; // one staircase down the left edge
const ICE = new Color("#bfe6ff");
const DARK = new Color("#0b1824");
const GOLD = new Color("#ffd75a");
const LIT = new Color("#fff3c4");
const TMP = new Color();
const TRI_AT = [4.0, 0.2, -5.4]; // the triangle stands right of the figure, a little back
const LENS = [1.56, 2.08, -3.0]; // the scouter's lens on the figure (Speaker.jsx), offset from the pup
const FROM = [1.05, 0.62, 0.8]; // the cupped flippers, just past the snout
const BLOCK = 0.62;

export default function Move(cut) {
  const { tl, mode } = cut;
  const g = useRef();
  const f = useMemo(() => {
    const blocks = new InstancedMesh(new BoxGeometry(1, 1, 1), mat(), BLOCKS);
    for (let i = 0; i < BLOCKS; i++) blocks.setColorAt(i, ICE);
    const beam = new InstancedMesh(new CylinderGeometry(1, 1, 2, 10, 1, true).rotateX(Math.PI / 2), mat({ transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }), 2);
    [GOLD, LIT].forEach((c, i) => beam.setColorAt(i, c));
    // the crack: six shards in a star and three gold glints
    const flare = new InstancedMesh(new IcosahedronGeometry(1, 1), mat({ transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }), 1);
    flare.setColorAt(0, GOLD);
    const crack = new InstancedMesh(new OctahedronGeometry(1, 0).scale(0.12, 1, 0.12), mat({ side: DoubleSide }), 9);
    for (let i = 0; i < 9; i++) crack.setColorAt(i, new Color(i < 6 ? "#fff6d8" : "#ffd75a"));
    for (const m of [blocks, beam, flare, crack]) m.frustumCulled = false;
    return { blocks, beam, flare, crack };
  }, []);

  useCutFrame((t) => {
    const s = live.seal;
    g.current.position.set(s.x, 0, s.z);
    const full = mode === "full";
    const tt = full ? onTwos(t) : tl.lineB + 0.4;
    const charge = smooth(2.6, tl.move[0], tt);
    const fire = smooth(tl.move[0], tl.move[1], tt);
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    const dark = smooth(tl.move[1] - 0.1, tl.move[1] + 0.7, tt);
    const crackT = smooth(tl.lineB - 0.1, tl.lineB + 0.3, tt);
    if (full) live.pose.point = smooth(tl.move[0] - 0.8, tl.move[0], tt) * out * 0.8;

    // the causal triangle, ice-lit; it goes dark when the beam passes, the path stays lit
    const wob = full ? 0.012 * Math.sin(tt * 9) : 0;
    const appear = smooth(2.0, 2.9, tt) * out;
    for (let i = 0; i < BLOCKS; i++) {
      const [r, c] = IDX[i];
      const x = TRI_AT[0] + (c - r / 2) * (BLOCK + 0.06);
      const y = TRI_AT[1] + (ROWS - 1 - r) * (BLOCK + 0.06) * 0.9 + BLOCK / 2;
      const k = BLOCK * appear;
      put(f.blocks, i, x, y + wob, TRI_AT[2], k, k * 0.9, k * 0.5);
      f.blocks.setColorAt(i, onPath(IDX[i]) ? LIT : TMP.copy(ICE).lerp(DARK, dark * 0.93));
    }
    f.blocks.instanceMatrix.needsUpdate = true;
    f.blocks.instanceColor.needsUpdate = true;

    // FINAL FLASH: a glow gathers at the cupped flippers, then a gold beam crosses to the triangle
    const bx = TRI_AT[0] - FROM[0];
    const by = TRI_AT[1] + 1.4 - FROM[1];
    const bz = TRI_AT[2] - FROM[2];
    const L = Math.hypot(bx, by, bz);
    const yaw = Math.atan2(bx, bz);
    const pitch = -Math.asin(by / L);
    const pulse = 1 + 0.12 * Math.sin(tt * 40);
    const w = 0.17 * fire * (1 - 0.6 * smooth(tl.collapse[0] - 0.6, tl.collapse[0], tt)) * pulse * out;
    const mx = FROM[0] + bx * 0.5 * fire;
    const my = FROM[1] + by * 0.5 * fire;
    const mz = FROM[2] + bz * 0.5 * fire;
    D.rotation.order = "YXZ";
    put(f.beam, 0, mx, my, mz, w, w, (L * fire) / 2 + 0.001, pitch, yaw, 0);
    put(f.beam, 1, mx, my, mz, w * 0.42, w * 0.42, (L * fire) / 2 + 0.002, pitch, yaw, 0);
    D.rotation.order = "XYZ";
    put(f.flare, 0, FROM[0], FROM[1], FROM[2], full ? smooth(2.3, 3.0, tt) * (0.08 + 0.17 * charge * (1 - fire * 0.4)) * pulse * out : 0.001);
    f.flare.instanceMatrix.needsUpdate = true;
    f.beam.instanceMatrix.needsUpdate = true;

    // the scouter's lens: a star of cracks, then a few gold glints thrown off it
    const spray = crackT * (1 - smooth(tl.lineB + 0.3, tl.lineB + 1.2, tt));
    for (let i = 0; i < 9; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const len = (i < 6 ? 0.17 : 0.06) * crackT * out;
      const r = i < 6 ? 0.1 * len * 3 : 0.1 + 0.25 * spray;
      put(f.crack, i, LENS[0] + Math.cos(a) * r, LENS[1] + Math.sin(a) * r, LENS[2] + 0.12, 0.9, len, 0.9, 0, 0, a - Math.PI / 2);
    }
    f.crack.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <group ref={g}>
        <primitive object={f.blocks} />
        <primitive object={f.beam} />
        <primitive object={f.flare} />
        <primitive object={f.crack} />
      </group>
    </>
  );
}
