// THE WITNESSES at the far doorway (Frodo, Aragorn, Legolas) and the colony pups on the stair: small dark
// plasticine miniatures, rim-lit by the ember and backlit by the doorway. Each figure is a still body
// plus an arms mesh posed about the shoulders on the stepped clock (S1); hair and hems whip in the
// updraft through the shader's sway weight (S2/S1 via the shared step).

import { Color, Group, InstancedMesh, Mesh, Object3D } from "three";
import { clay, hash, merge } from "./clay";
import { blob, slab, taper } from "./shapes";
import { FLOOR_Y } from "./set";

const SK = "#d9b894";

// swing weight for hair and hems: 0 at the root, 1 at the free end
const down = (top, bottom) => (x, y) => Math.min(1, Math.max(0, (top - y) / (top - bottom)));

function frodo() {
  const cloak = "#3a2c28";
  const body = merge([
    taper([-0.07, 0.0, 0], [-0.075, 0.36, 0], 0.06, 0.055, "#2a201c", { seg: 6, rows: 1 }),
    taper([0.07, 0.0, 0], [0.075, 0.36, 0], 0.06, 0.055, "#2a201c", { seg: 6, rows: 1 }),
    taper([0, 0.05, -0.02], [0, 0.6, -0.02], 0.2, 0.09, cloak, { seg: 9, rows: 3, sway: down(0.6, 0.05) }),
    blob([0, 0.68, 0.0], [0.095, 0.105, 0.1], SK, { w: 10, h: 8, lump: 0.006 }),
    blob([0, 0.66, -0.095], [0.115, 0.1, 0.07], cloak, { w: 8, h: 6, lump: 0.008 }), // the hood, thrown back
    blob([0, 0.755, -0.005], [0.105, 0.05, 0.105], "#4a3320", { w: 8, h: 6, lump: 0.01 }), // curls
  ]);
  const arms = merge([
    taper([-0.11, 0, 0], [-0.2, 0.2, 0.08], 0.04, 0.035, cloak, { seg: 6, rows: 1 }),
    taper([0.11, 0, 0], [0.2, 0.26, 0.1], 0.04, 0.035, cloak, { seg: 6, rows: 1 }),
    blob([0.2, 0.28, 0.1], [0.035, 0.035, 0.035], SK, { w: 6, h: 5, lump: 0.002 }),
  ]);
  const blade = slab([0.2, 0.3, 0.1], [0.24, 0.72, 0.12], 0.04, 0.015, "#9ad4ff");
  return { body, arms, blade, shoulder: [0, 0.55, 0], h: 0.8, bodyK: { rim: 1.1 } };
}

function aragorn() {
  const coat = "#2d2420";
  const body = merge([
    taper([-0.1, 0.0, 0], [-0.11, 0.95, 0], 0.09, 0.08, "#231b18", { seg: 6, rows: 2 }),
    taper([0.1, 0.0, 0], [0.11, 0.95, 0], 0.09, 0.08, "#231b18", { seg: 6, rows: 2 }),
    taper([0, 0.35, 0], [0, 1.45, 0], 0.34, 0.17, coat, { seg: 10, rows: 4, sway: down(1.45, 0.35) }),
    blob([0, 1.58, 0], [0.12, 0.14, 0.13], SK, { w: 10, h: 8, lump: 0.008 }),
    taper([-0.05, 1.7, -0.1], [-0.1, 1.05, -0.27], 0.07, 0.02, "#201815", { seg: 5, rows: 3, sway: down(1.7, 1.05) }), // the long hair
    taper([0.05, 1.7, -0.1], [0.12, 1.1, -0.25], 0.07, 0.02, "#201815", { seg: 5, rows: 3, sway: down(1.7, 1.1) }),
    taper([0, 1.72, -0.12], [0, 1.0, -0.3], 0.08, 0.02, "#201815", { seg: 5, rows: 3, sway: down(1.72, 1.0) }),
  ]);
  const arms = merge([
    taper([0.2, 0, 0], [0.62, 0.05, 0.12], 0.06, 0.05, coat, { seg: 6, rows: 2 }), // the arm out, to stop the others
    blob([0.64, 0.05, 0.12], [0.05, 0.05, 0.05], SK, { w: 6, h: 5, lump: 0.003 }),
    taper([-0.2, 0, 0], [-0.3, -0.35, 0.18], 0.06, 0.05, coat, { seg: 6, rows: 2 }),
    taper([-0.3, -0.45, 0.2], [-0.12, -0.15, 0.32], 0.016, 0.014, "#cfd2dc", { seg: 4, rows: 1 }), // the sword, half drawn
    taper([-0.3, -0.45, 0.2], [-0.42, -0.7, 0.16], 0.026, 0.022, "#3a2c24", { seg: 5, rows: 1 }),
  ]);
  return { body, arms, shoulder: [0, 1.45, 0], h: 1.9, bodyK: { rim: 1.0 } };
}

function legolas() {
  const coat = "#26231f";
  const body = merge([
    taper([-0.08, 0.0, 0], [-0.09, 0.9, 0], 0.075, 0.07, "#1f1b18", { seg: 6, rows: 2 }),
    taper([0.08, 0.0, 0], [0.09, 0.9, 0], 0.075, 0.07, "#1f1b18", { seg: 6, rows: 2 }),
    taper([0, 0.4, 0], [0, 1.4, 0], 0.26, 0.15, coat, { seg: 10, rows: 4, sway: down(1.4, 0.4) }),
    blob([0, 1.52, 0], [0.105, 0.135, 0.115], SK, { w: 10, h: 8, lump: 0.006 }),
    taper([-0.04, 1.66, -0.08], [-0.06, 0.85, -0.3], 0.06, 0.012, "#c8b27a", { seg: 5, rows: 4, sway: down(1.66, 0.85) }), // long straight hair
    taper([0.04, 1.66, -0.08], [0.06, 0.88, -0.28], 0.06, 0.012, "#c8b27a", { seg: 5, rows: 4, sway: down(1.66, 0.88) }),
    taper([0, 1.68, -0.1], [0, 0.8, -0.32], 0.07, 0.012, "#c8b27a", { seg: 5, rows: 4, sway: down(1.68, 0.8) }),
  ]);
  // the drawn bow: an arc held out at the left, the string pulled back to the cheek
  const bow = [];
  const arc = (k) => [-0.55 + 0.04 * Math.cos(k * Math.PI), 0.0 + (k - 0.5) * 1.3, 0.2 * Math.sin(k * Math.PI) + 0.1];
  for (let i = 0; i < 8; i++) bow.push(taper(arc(i / 8), arc((i + 1) / 8), 0.02, 0.02, "#4a3322", { seg: 4, rows: 1 }));
  const arms = merge([
    taper([-0.18, 0, 0], [-0.5, 0.0, 0.14], 0.05, 0.045, coat, { seg: 6, rows: 2 }),
    taper([0.18, 0, 0], [0.02, -0.02, 0.3], 0.05, 0.045, coat, { seg: 6, rows: 2 }),
    ...bow,
    taper(arc(0), [0.02, 0.0, 0.3], 0.005, 0.005, "#d9d0b8", { seg: 3, rows: 1 }),
    taper(arc(1), [0.02, 0.0, 0.3], 0.005, 0.005, "#d9d0b8", { seg: 3, rows: 1 }),
    taper([-0.5, 0.0, 0.14], [0.02, 0.0, 0.3], 0.012, 0.01, "#b0a48a", { seg: 4, rows: 1 }), // the arrow
  ]);
  return { body, arms, shoulder: [0, 1.4, 0], h: 1.8, bodyK: { rim: 1.0 } };
}

// a stand spot: x, floor top y, z, facing yaw
export const SPOTS = {
  frodo: [-4.1, FLOOR_Y, -0.35, 0.9],
  aragorn: [-5.05, -0.52, -1.1, 0.7],
  legolas: [-5.75, -0.24, -1.7, 0.55],
};

export function buildWitnesses() {
  const mats = [];
  const make = (spec, name, hairWave) => {
    const bm = clay({ boil: 0.008, rim: spec.bodyK.rim, edge: 0.55, bump: 0.5, tex: 3, sway: true, wave: hairWave });
    const am = clay({ boil: 0.006, rim: spec.bodyK.rim, edge: 0.55, bump: 0.5, tex: 3 });
    mats.push(bm, am);
    const g = new Group();
    const body = new Mesh(spec.body, bm);
    const arms = new Group();
    const armsMesh = new Mesh(spec.arms, am);
    arms.add(armsMesh);
    arms.position.set(...spec.shoulder);
    g.add(body, arms);
    for (const o of [body, armsMesh]) o.frustumCulled = false;
    const [x, y, z, yaw] = SPOTS[name];
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    const parts = { g, arms, spec, bm, am, geos: [spec.body, spec.arms] };
    if (spec.blade) {
      const bmat = clay({ boil: 0.004, emit: 1.9, edge: 0, bump: 0, tex: 3 });
      mats.push(bmat);
      const blade = new Mesh(spec.blade, bmat);
      blade.frustumCulled = false;
      arms.add(blade);
      parts.blade = blade;
      parts.geos.push(spec.blade);
    }
    return parts;
  };
  const f = { frodo: make(frodo(), "frodo", 0.04), aragorn: make(aragorn(), "aragorn", 0.07), legolas: make(legolas(), "legolas", 0.09) };
  return {
    ...f,
    dispose() {
      for (const p of Object.values(f)) {
        p.g.removeFromParent();
        for (const g of p.geos) g.dispose();
      }
      for (const m of mats) m.dispose();
    },
  };
}

// pose the witnesses at stepped time tt: breath, the updraft, each one's moment
export function poseWitnesses(W, tt, T, odd) {
  const sm = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const shout = sm(T.shout, T.shout + 0.2, tt) * (1 - sm(T.shout + 2.4, T.shout + 2.8, tt));
  const brace = sm(T.slam, T.slam + 0.3, tt);
  const f = W.frodo;
  f.g.position.y = FLOOR_Y + 0.02 * Math.max(0, Math.sin(Math.floor(tt * 12) * 1.7)) * shout;
  f.g.rotation.z = -0.08 * shout + 0.03 * odd * shout;
  f.arms.rotation.set(0, 0, 0.1 - 0.55 * shout); // the arm lifts with the shout
  const a = W.aragorn;
  a.arms.rotation.set(0, 0, -0.1 * odd * (1 - brace) * 0.5 + 0.05 * Math.sin(tt * 2));
  a.g.rotation.z = 0.02 * Math.sin(tt * 1.6);
  const l = W.legolas;
  l.arms.rotation.set(0, 0, 0.03 * Math.sin(tt * 1.4));
  l.g.rotation.z = 0.02 * Math.sin(tt * 1.5 + 1);
  for (const p of [f, a, l]) {
    p.bm.uniforms.uWave.value = p.spec.h > 1 ? 0.07 : 0.04;
  }
}

// colony pups: tiny clay figures on the far stair
export const PUP_SPOTS = [
  [-8.6, -1.9], [-8.0, -2.3], [-7.4, -1.7], [-6.9, -2.2], [-8.3, -0.9], [-7.6, -0.6], [-6.8, -0.9], [-7.9, 0.4], [-6.9, 0.5], [-8.9, -1.2],
].map(([x, z]) => [x, FLOOR_Y, z]);

export function buildColony() {
  const body = merge([
    blob([0, 0.1, 0], [0.12, 0.09, 0.18], "#c9d3e6", { w: 10, h: 8, lump: 0.008 }),
    blob([0, 0.19, 0.15], [0.095, 0.09, 0.09], "#e6ecf5", { w: 10, h: 8, lump: 0.006 }),
    blob([-0.04, 0.215, 0.225], [0.016, 0.02, 0.014], "#1b1a22", { w: 6, h: 5, lump: 0 }),
    blob([0.04, 0.215, 0.225], [0.016, 0.02, 0.014], "#1b1a22", { w: 6, h: 5, lump: 0 }),
    blob([0, 0.18, 0.245], [0.014, 0.011, 0.012], "#2a2024", { w: 5, h: 4, lump: 0 }),
    blob([-0.12, 0.05, 0.06], [0.075, 0.02, 0.04], "#97a8c8", { w: 6, h: 5, lump: 0.004 }),
    blob([0.12, 0.05, 0.06], [0.075, 0.02, 0.04], "#97a8c8", { w: 6, h: 5, lump: 0.004 }),
  ]);
  const mat = clay({ boil: 0.004, tex: 5, edge: 0.4, bump: 0.3, wax: 0.3 });
  const mesh = new InstancedMesh(body, mat, PUP_SPOTS.length);
  mesh.frustumCulled = false;
  mesh.setColorAt(0, new Color(1, 1, 1));
  PUP_SPOTS.forEach((_, i) => mesh.setColorAt(i, new Color().setScalar(0.9 + 0.1 * hash(i, 2))));
  return {
    mesh,
    dispose() {
      body.dispose();
      mat.dispose();
      mesh.dispose();
      mesh.removeFromParent();
    },
  };
}

const D = new Object3D();
export function poseColony(C, tt, T) {
  const sm = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const duck = sm(T.slam - 0.05, T.slam + 0.2, tt) * (1 - sm(T.slam + 1.0, T.slam + 1.4, tt)); // down at the strike
  const cheer = sm(T.cheer, T.cheer + 0.15, tt) * (1 - sm(T.cheer + 2.6, T.cheer + 3.0, tt));
  PUP_SPOTS.forEach(([x, y, z], i) => {
    const hop = cheer * Math.max(0, Math.sin(tt * 9 + i * 1.9)) * 0.22;
    D.position.set(x, y + hop, z);
    D.rotation.set(0.3 * cheer * (hash(i, 7) - 0.5), 0.6 + hash(i, 3) * 0.8, 0);
    D.scale.set(2.4 * (1 + 0.12 * duck), 2.4 * (1 - 0.4 * duck), 2.4 * (1 + 0.12 * duck)); // big enough to read from the lens
    D.updateMatrix();
    C.mesh.setMatrixAt(i, D.matrix);
  });
  C.mesh.instanceMatrix.needsUpdate = true;
}
