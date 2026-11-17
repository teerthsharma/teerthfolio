// THE ALLIANCE and the threads: 48 ink shinobi on the ridge (half with a blade), each with a pale headband, flinching back on the beats;
// 56 pale ribbons rising off the field into the red moon, turned flat to the lens. Hidden at the break.
import { BoxGeometry, Group, IcosahedronGeometry, Matrix4, Object3D, PlaneGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { flat, flatMaterial, hash, inst, put } from "../live/parts.js";
import { limb } from "../live/susanoo.js";
import { groundHeight, MOON_WIDE, threadMaterial } from "../live/war.js";
import { smooth, T } from "../clock.js";

const CROWD = 48, THREADS = 56;
const O = new Object3D(), M = new Matrix4(), V = new Vector3(), W = new Vector3(), Z = new Vector3(), X = new Vector3(), Y = new Vector3();

// one shinobi: legs, a coat, arms, a round head; half of them carry a blade (all ink)
function shinobi(blade) {
  const p = [];
  for (const s of [-1, 1]) {
    p.push(limb([s * 0.1, 0, 0], [s * 0.11, 0.85, 0], 0.07, 0.09));
    p.push(limb([s * 0.22, 1.42, 0], [s * 0.32, 0.85, 0.08], 0.06, 0.05));
  }
  p.push(limb([0, 0.8, 0], [0, 1.45, 0], 0.17, 0.22));
  p.push(limb([0, 0.62, 0], [0, 0.9, 0], 0.22, 0.17));
  p.push(new IcosahedronGeometry(0.13, 1).translate(0, 1.62, 0));
  if (blade) p.push(limb([0.32, 0.85, 0.1], [0.55, 1.75, 0.25], 0.025, 0.02, 4));
  return mergeGeometries(p.map(flat));
}

export function buildCrowd() {
  const group = new Group();
  const ink = flatMaterial("#1d1813");
  const crowdA = inst(shinobi(false), ink, CROWD / 2), crowdB = inst(shinobi(true), ink, CROWD / 2);
  const bandMat = flatMaterial("#d8ccb6");
  const bands = inst(flat(new BoxGeometry(0.3, 0.045, 0.3)), bandMat, CROWD);
  const crowd = Array.from({ length: CROWD }, (_, i) => {
    const x = -34 + (68 * (i + hash(i, 1) * 0.8)) / CROWD, z = -31.5 - 4 * hash(i, 2);
    return { x, z, y: groundHeight(x, z), yaw: (hash(i, 3) - 0.5) * 0.7, s: 0.95 + 0.3 * hash(i, 4), lag: hash(i, 5) * 0.25 };
  });
  const threads = inst(new PlaneGeometry(0.07, 1).translate(0, 0.5, 0), threadMaterial(), THREADS);
  const thread = Array.from({ length: THREADS }, (_, i) => {
    const base = new Vector3((hash(i, 1) - 0.5) * 80, 0, -12 - 75 * hash(i, 2));
    base.y = groundHeight(base.x, base.z);
    return { base, dir: new Vector3(), len: 4 + 9 * hash(i, 3), speed: 2 + 3 * hash(i, 4), phase: hash(i, 5) * 40 };
  });
  group.add(crowdA, crowdB, bands, threads);
  return {
    group,
    // tt scene seconds, t real seconds, brk scene seconds since the break, camLocal: the lens in the rig frame
    update(tt, brk, camLocal) {
      const hidden = brk >= 0;
      group.visible = !hidden;
      for (let i = 0; i < CROWD; i++) {
        const f = crowd[i];
        const jolt = (h) => { const d = tt - h - f.lag; return d > 0 && d < 1.2 ? Math.sin(Math.min(1, d / 0.25) * Math.PI * 0.5) * (1 - smooth(0.5, 1.2, d)) : 0; };
        const k = Math.max(jolt(T.rise[0] + 0.2) * 0.6, jolt(T.m1[1]), jolt(T.hit2));
        const lean = -0.32 * k + 0.02 * Math.sin(tt * 1.3 + i);
        O.position.set(f.x, f.y, f.z - 0.45 * k);
        O.rotation.set(lean, f.yaw, 0.02 * Math.sin(tt * 2 + i));
        O.scale.setScalar(f.s);
        O.updateMatrix();
        (i % 2 ? crowdB : crowdA).setMatrixAt(i >> 1, O.matrix);
        V.set(0, 1.66, 0).applyMatrix4(O.matrix);
        put(bands, i, V.x, V.y, V.z, f.s * 0.95, f.s, f.s, lean, f.yaw, 0);
      }
      crowdA.instanceMatrix.needsUpdate = crowdB.instanceMatrix.needsUpdate = bands.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < THREADS; i++) {
        const th = thread[i];
        th.dir.copy(MOON_WIDE).sub(th.base).normalize();
        const run = (th.phase + tt * th.speed) % 60;
        W.copy(th.base).addScaledVector(th.dir, run);
        Z.copy(camLocal).sub(W);
        X.crossVectors(th.dir, Z).normalize();
        Z.crossVectors(X, th.dir).normalize();
        const fade = Math.min(1, run / 6) * (1 - smooth(45, 60, run)) * smooth(1.6, 2.4, tt);
        M.makeBasis(X, Y.copy(th.dir).multiplyScalar(th.len * Math.max(fade, 0.001)), Z);
        M.setPosition(W);
        threads.setMatrixAt(i, M);
      }
      threads.instanceMatrix.needsUpdate = true;
    },
  };
}
