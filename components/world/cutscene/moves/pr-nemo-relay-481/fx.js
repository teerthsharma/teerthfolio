// THE EFFECTS, as flat cel shapes: the Ultra Instinct aura (silver flames with a pale blue-white heart,
// three nested layers of one instanced cone, plus silver sparks and a ground ring), the ki orbs (a
// coloured shell with a white heart, an ink hull and a streak behind), and the silver afterimages.
// No gradients, no additive wash: every layer is a flat colour with a hard edge, redrawn on twos.
// Nothing allocates per frame (temps are module-level).

import { AdditiveBlending, Color, ConeGeometry, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, OctahedronGeometry, Quaternion, RingGeometry, Vector3 } from "three";
import { hullMaterial } from "./cel";
import { hash, hide, inst, put } from "./util";

const mb = (color, opacity = 1) => new MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, toneMapped: false, fog: false });
const UP = new Vector3(0, 1, 0);
const M = new Matrix4();
const P = new Vector3();
const S = new Vector3();
const Q = new Quaternion();
const DIR = new Vector3();
const col = new Color();

// ----- the aura -----
const FLAMES = 44;
const CROWN = 7; // the first seven rise over the head: Ultra Instinct's swept spikes, a fan with the middle tallest
export function buildAura() {
  const cone = new ConeGeometry(0.2, 1, 5).translate(0, 0.5, 0);
  const add = (c, o) => Object.assign(mb(c, o), { blending: AdditiveBlending, transparent: true, depthWrite: false });
  const layers = [inst(cone, add("#6a2fd0", 0.8), FLAMES), inst(cone, add("#a58cf0", 0.7), FLAMES), inst(cone, add("#e6ecff", 0.75), FLAMES)];
  layers[0].renderOrder = 4;
  layers[1].renderOrder = 5;
  layers[2].renderOrder = 6;
  const sparks = inst(new OctahedronGeometry(1, 0).scale(0.5, 1, 0.5), add("#d8e0ff", 0.9), 40);
  const ring = new Mesh(new RingGeometry(0.86, 1, 44).rotateX(-Math.PI / 2), mb("#cfe6ff", 0.9));
  ring.position.y = 0.05;
  ring.visible = false;
  ring.frustumCulled = false;
  const flame = Array.from({ length: FLAMES }, (_, i) => {
    if (i < CROWN) {
      const k = i - (CROWN - 1) / 2;
      return { x: k * 0.1, y: 1.0, z: -0.2, dx: k * 0.2, dy: 1, dz: -0.28, len: 1.95 - Math.abs(k) * 0.3, w: 0.9 };
    }
    const a = hash(i, 1) * Math.PI * 2;
    const r0 = 0.25 + 0.55 * hash(i, 2);
    const front = Math.sin(a) > 0.45; // toward the lens: kept low so the pup is never hidden
    return { x: Math.cos(a) * r0, y: 0.15 + 0.7 * hash(i, 3), z: Math.sin(a) * r0 * 0.8 - 0.3, dx: Math.cos(a) * 0.6, dy: 1, dz: Math.sin(a) * 0.35 - 0.25, len: (0.9 + 1.4 * hash(i, 4)) * (front ? 0.4 : 1), w: 0.8 + 0.5 * hash(i, 5) };
  });
  return {
    layers,
    sparks,
    ring,
    meshes: [...layers, sparks, ring],
    // k: 0..1 how far lit; the heart shrinks to nothing first when it gutters
    update(tt, k, pulse, ringAge) {
      const step = Math.floor(tt * 12);
      for (let i = 0; i < FLAMES; i++) {
        const f = flame[i];
        const fl = 0.72 + 0.55 * hash(i, 20 + (step % 17)) + 0.15 * pulse;
        const L = f.len * k * fl;
        DIR.set(f.dx, f.dy, f.dz).normalize();
        Q.setFromUnitVectors(UP, DIR);
        for (let l = 0; l < 3; l++) {
          const sc = [1, 0.68, 0.38][l];
          const lk = Math.max(0, k * 1.6 - 0.6 * (l === 0 ? 0 : l)); // the heart goes out first
          const len = Math.max(0.0001, L * [1, 0.8, 0.58][l] * Math.min(1, lk));
          P.set(f.x, f.y, f.z);
          S.set(f.w * sc * (0.7 + 0.5 * len), len, f.w * sc * (0.7 + 0.5 * len));
          M.compose(P, Q, S);
          layers[l].setMatrixAt(i, M);
        }
      }
      for (const l of layers) l.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 40; i++) {
        const life = (tt * (0.5 + 0.4 * hash(i, 2)) + hash(i, 3)) % 1;
        const a = hash(i, 1) * 6.28 + tt * 0.8 * (hash(i, 4) > 0.5 ? 1 : -1);
        const r = 0.5 + 1.1 * hash(i, 5);
        const s = 0.05 * (0.5 + hash(i, 6)) * k * Math.sin(life * Math.PI);
        put(sparks, i, Math.cos(a) * r, 0.1 + life * 3.2, Math.sin(a) * r * 0.8 - 0.3, Math.max(s, 0.0001), Math.max(s * 1.8, 0.0001), Math.max(s, 0.0001), 0, a, 0.4 * Math.sin(i));
      }
      sparks.instanceMatrix.needsUpdate = true;
      ring.visible = ringAge >= 0 && ringAge < 0.55;
      if (ring.visible) {
        ring.scale.setScalar(0.8 + 9 * (ringAge / 0.55) ** 0.6);
        ring.material.opacity = 0.9 * (1 - ringAge / 0.55);
      }
    },
    dispose() {
      for (const m of [...layers, sparks]) {
        m.geometry.dispose();
        m.material.dispose();
        m.dispose();
      }
      ring.geometry.dispose();
      ring.material.dispose();
    },
  };
}

// ----- the ki orbs -----
export const ORB = { n: 9, launch: 3.55, gap: 0.3, fly: 0.55, colors: ["#ff3b3b", "#ffd23a", "#3aa0ff", "#ff4fc8", "#ff8a1f", "#39e08a"] };
export const passAt = (i) => ORB.launch + i * ORB.gap + ORB.fly;
// where orb i crosses the pup's plane: behind it (higher) or in front (low), never over the face
const PASSZ = [-0.95, 1.4, -1.1, 1.6, -0.8, 1.35, -1.0, 1.5, -0.9];
const PASSY = [1.0, 0.28, 1.35, 0.25, 0.8, 0.3, 1.2, 0.26, 0.95];
export const passPoint = (i, out) => out.set(0, PASSY[i % 9], PASSZ[i % 9]);
export const passSide = (i) => (i % 2 ? 1 : -1); // 1: it flies right to left
const startAt = (i, out) => out.set(passSide(i) * 17, PASSY[i % 9] + 1.4 * hash(i, 2), PASSZ[i % 9] + (hash(i, 3) - 0.5) * 7);

export function buildOrbs() {
  const geo = new IcosahedronGeometry(1, 1);
  const shell = inst(geo, mb("#ffffff"), ORB.n);
  const hull = inst(geo, hullMaterial({ radial: true }), ORB.n);
  hull.instanceMatrix = shell.instanceMatrix;
  const core = inst(geo, mb("#ffffff"), ORB.n);
  const tail = inst(new ConeGeometry(1, 1, 6).translate(0, 0.5, 0), mb("#ffffff"), ORB.n);
  for (let i = 0; i < ORB.n; i++) {
    shell.setColorAt(i, col.set(ORB.colors[i % ORB.colors.length]));
    tail.setColorAt(i, col.set(ORB.colors[i % ORB.colors.length]));
    core.setColorAt(i, col.set("#fffff2"));
  }
  const A = new Vector3();
  const B = new Vector3();
  return {
    meshes: [tail, hull, shell, core],
    update(tt, k) {
      for (let i = 0; i < ORB.n; i++) {
        const s = (tt - (ORB.launch + i * ORB.gap)) / ORB.fly; // 0 at the launch, 1 at the pass
        if (s < 0 || s > 2.2 || k <= 0) {
          hide(shell, i);
          hide(core, i);
          hide(tail, i);
          continue;
        }
        startAt(i, A);
        passPoint(i, B);
        P.copy(A).lerp(B, s);
        const pop = Math.min(1, s / 0.1) * k;
        const r = 0.24 * pop * (1 + 0.1 * Math.sin(tt * 40 + i));
        put(shell, i, P.x, P.y, P.z, r);
        put(core, i, P.x, P.y, P.z, r * 0.52);
        DIR.copy(B).sub(A).normalize();
        Q.setFromUnitVectors(UP, DIR.negate());
        S.set(r * 0.9, 2.2 * pop * Math.min(1, s * 2), r * 0.9);
        M.compose(P, Q, S);
        tail.setMatrixAt(i, M);
      }
      for (const m of [shell, core, tail]) m.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const m of [shell, core, tail, hull]) {
        if (m !== hull) m.geometry.dispose();
        m.material.dispose();
        m.dispose();
      }
    },
  };
}

// ----- the afterimages -----
export function silverGhost() {
  return mb("#cfe2ff", 0.6);
}
