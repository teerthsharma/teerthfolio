// NeMo Relay: JJK, the honoured one. The land speaks (23 file cards: "Throughout
// heaven and earth"); the pup keeps its flippers at its sides, six points of
// light wake on its halo, a red orb and a blue orb gather either side of it and
// merge into one violet sphere (HOLLOW PURPLE) that tears across the moat; the
// 23 cards it passes stack into one scaffold. No Gojo: shape, colour, pose.
// Cost by construction: dots, orbs, cores, tear and cards are five draw calls.
// Card: lib/world/cutscene/cards/pr-nemo-relay-481.js.

import { useMemo, useRef } from "react";
import { BoxGeometry, Color, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, AdditiveBlending } from "three";
import { turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Speaker, Stage, onTwos, smooth, useCutFrame } from "../kit";

const D = new Object3D();
const RED = new Color("#ff4a52");
const BLUE = new Color("#4d7dff");
const VIOLET = new Color("#b25cff");
const CREAM = new Color("#fbf6ec");
const CARDS = 23;
const TO = [3.4, 1.9, -3.4]; // where the sphere tears the moat
const SCAF = [3.2, 0, -3.2]; // where the cards lock into one scaffold
const mat = (o = {}) => new MeshBasicMaterial({ toneMapped: false, fog: false, ...o });
const put = (m, i, x, y, z, sx, sy = sx, sz = sx, ry = 0, rz = 0) => {
  D.position.set(x, y, z);
  D.rotation.set(0, ry, rz);
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

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const g = useRef();
  const f = useMemo(() => {
    const dots = inst(new OctahedronGeometry(1, 0).scale(0.45, 1, 0.45), mat(), 6, Array(6).fill(VIOLET));
    const shell = inst(new IcosahedronGeometry(1, 1), mat({ transparent: true, opacity: 0.55, depthWrite: false }), 3, [RED, BLUE, VIOLET]);
    const core = inst(new IcosahedronGeometry(1, 1), mat(), 3, Array(3).fill(CREAM));
    const tear = inst(new OctahedronGeometry(1, 0), mat({ transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false }), 2, [VIOLET, CREAM]);
    const cards = inst(new BoxGeometry(0.3, 0.4, 0.03), mat(), CARDS, Array.from({ length: CARDS }, (_, i) => new Color(i % 2 ? "#fbf6ec" : "#e6e0d2")));
    return { dots, shell, core, tear, cards };
  }, []);

  useCutFrame((t) => {
    const s = live.seal;
    g.current.position.set(s.x, 0, s.z);
    g.current.rotation.y = turnFor(card, place, s.x, s.z);
    const full = mode === "full";
    const tt = full ? onTwos(t) : tl.lineB + 0.4;
    // the beats: six dots wake, orbs gather, merge, tear, cards stack
    const wake = smooth(1.5, 2.2, tt) * (1 - smooth(tl.move[1], tl.move[1] + 0.4, tt));
    const gather = smooth(2.0, tl.move[0], tt);
    const merge = smooth(tl.move[0], tl.move[1], tt);
    const rip = smooth(tl.lineB - 0.1, tl.lineB + 1.1, tt);
    const fade = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    if (full) live.pose.raise = 0.7 * merge * fade; // both flippers out, never above the head

    // six points of light on the halo, circling over the crown
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + tt * 0.9;
      const k = wake * fade;
      put(f.dots, i, 0.55 * Math.cos(a), 1.3 + 0.08 * Math.sin(a * 2), 0.25 + 0.55 * Math.sin(a), 0.1 * k, 0.17 * k, 0.1 * k);
    }
    f.dots.instanceMatrix.needsUpdate = true;

    // red left, blue right, either side of the pup; they close on the merge into one violet sphere
    const y = 1.55 + 0.06 * Math.sin(tt * 3);
    const r = (0.1 + 0.26 * gather) * fade;
    const open = (1 - merge) * (0.8 + 0.1 * Math.sin(tt * 4));
    const k0 = r * (1 - merge);
    put(f.shell, 0, 0.1 - open, y, 0.6, k0);
    put(f.shell, 1, 0.1 + open, y, 0.6, k0);
    put(f.core, 0, 0.1 - open, y, 0.6, k0 * 0.45);
    put(f.core, 1, 0.1 + open, y, 0.6, k0 * 0.45);
    // the violet sphere leaves the pup along the line to the moat
    const px = 0.1 + (TO[0] - 0.1) * rip;
    const py = y + (TO[1] - y) * rip;
    const pz = 0.6 + (TO[2] - 0.6) * rip;
    const purple = (0.15 + 0.55 * merge) * (1 + 0.5 * rip) * fade * (merge > 0 ? 1 : 0);
    put(f.shell, 2, px, py, pz, purple);
    put(f.core, 2, px, py, pz, purple * 0.5);
    for (const m of [f.shell, f.core]) m.instanceMatrix.needsUpdate = true;

    // the tear it cuts behind it: a violet blade with a thin cream edge, from the pup to the sphere
    const th = 0.34 * rip * (1 - rip * 0.4) * fade;
    for (let i = 0; i < 2; i++) {
      D.position.set((0.1 + px) / 2, (y + py) / 2, (0.6 + pz) / 2);
      D.lookAt(px, py, pz);
      D.scale.set(th * (i ? 0.35 : 1), th * (i ? 0.35 : 1), Math.hypot(px - 0.1, py - y, pz - 0.6) / 2 + 0.001);
      D.updateMatrix();
      f.tear.setMatrixAt(i, D.matrix);
    }
    D.rotation.set(0, 0, 0);
    f.tear.instanceMatrix.needsUpdate = true;

    // 23 file cards drift round the pup facing the lens, then lock into one scaffold at the moat
    const stack = smooth(tl.lineB + 0.3, tl.lineB + 1.5, tt);
    for (let i = 0; i < CARDS; i++) {
      const h = (i / CARDS) * Math.PI * 2 + 0.25 * tt;
      const a = smooth(2.2 + 0.05 * i, 2.9 + 0.05 * i, tt) * fade;
      const ring = 2.4 + 0.5 * Math.sin(i * 1.7);
      const gx = SCAF[0] + ((i % 4) - 1.5) * 0.4;
      const gy = 0.3 + Math.floor(i / 4) * 0.5;
      put(f.cards, i, (1 - stack) * ring * Math.cos(h) + stack * gx, (1 - stack) * (0.6 + 1.6 * ((i * 0.37) % 1)) + stack * gy, (1 - stack) * (-1.1 - ring * 0.5 * (0.6 + 0.4 * Math.sin(h))) + stack * SCAF[2], a, a, a, (1 - stack) * 0.4 * Math.sin(i), (1 - stack) * 0.3 * Math.cos(i));
    }
    f.cards.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <group ref={g}>
        <primitive object={f.dots} />
        <primitive object={f.shell} />
        <primitive object={f.core} />
        <primitive object={f.tear} />
        <primitive object={f.cards} />
      </group>
    </>
  );
}
