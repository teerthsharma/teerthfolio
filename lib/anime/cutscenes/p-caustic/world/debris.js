// THE RUBBLE, the debris and the dust: 150 rocks strewn on the plain (thickest round the craters), 120 pieces thrown by the two impacts in arcs,
// and 230 sepia motes in the air. Instanced; all hidden at the break.
import { Color, Group, IcosahedronGeometry, Object3D, OctahedronGeometry, Vector3 } from "three";
import { flatMaterial, hash, hide, inst, put } from "../live/parts.js";
import { CRATERS, groundHeight, HIT1, HIT2, rockGeometry, rockMaterial } from "../live/war.js";
import { T } from "../clock.js";

const RUBBLE = 150, DEBRIS = 120, ROUND = 160, DIAMOND = 70;
const tint = new Color(), D = new Object3D();

export function buildDebris() {
  const group = new Group(), rock = rockMaterial(), rockG = rockGeometry();
  const rubble = inst(rockG, rock, RUBBLE), debris = inst(rockG, rock, DEBRIS);
  for (let i = 0; i < RUBBLE; i++) {
    const cr = CRATERS[i % CRATERS.length], near = i % 3 === 0, a = hash(i, 1) * Math.PI * 2;
    const d = near ? cr[2] * (0.9 + 0.8 * hash(i, 2)) : 3.5 + 55 * hash(i, 2) ** 1.4;
    const x = near ? cr[0] + Math.cos(a) * d : (hash(i, 3) - 0.5) * 2 * d;
    const z = near ? cr[1] + Math.sin(a) * d : -2 - d * (0.3 + 0.7 * hash(i, 4));
    const s = (0.12 + 0.75 * hash(i, 5) ** 2) * (near ? 1.4 : 1);
    put(rubble, i, x, groundHeight(x, z) + s * 0.3, z, s * (0.8 + 0.5 * hash(i, 6)), s, s, hash(i, 7) * 3, hash(i, 8) * 3, 0);
    rubble.setColorAt(i, tint.setRGB(0.42 + 0.14 * hash(i, 9), 0.36 + 0.1 * hash(i, 9), 0.3 + 0.06 * hash(i, 10)));
  }
  for (let i = 0; i < DEBRIS; i++) { hide(debris, i); debris.setColorAt(i, tint.setRGB(0.4, 0.33, 0.27)); }
  const motes = [
    ...Array.from({ length: ROUND }, (_, i) => ({ i, geo: 0, cols: ["#b3a28c", "#6f6355", "#d6c8b2"] })),
    ...Array.from({ length: DIAMOND }, (_, i) => ({ i: i + ROUND, geo: 1, cols: ["#e9dcc6", "#a8977f", "#f4ead8"] })),
  ];
  const roundM = inst(new IcosahedronGeometry(0.05, 0), flatMaterial("#ffffff"), ROUND);
  const diamM = inst(new OctahedronGeometry(0.06, 0), flatMaterial("#ffffff"), DIAMOND);
  motes.forEach((m, k) => { const mesh = m.geo ? diamM : roundM, j = m.geo ? k - ROUND : k; mesh.setColorAt(j, tint.set(m.cols[Math.floor(hash(m.i, 11) * 3)])); });
  group.add(rubble, debris, roundM, diamM);
  const span = new Vector3(30, 9, 26), drift = new Vector3(0.35, 0.05, 0.1);
  const mote = (mesh, j, i, t) => {
    const u = (hash(i, 12) + drift.x * t / span.x) % 1, v = hash(i, 13), w = (hash(i, 14) + drift.z * t / span.z) % 1;
    put(mesh, j, (u - 0.5) * span.x, 0.5 + v * span.y, (w - 0.5) * span.z - 4, 0.6 + 0.8 * hash(i, 15), 0.6 + 0.8 * hash(i, 15), 0.6 + 0.8 * hash(i, 15));
  };
  return {
    group,
    update(tt, brk, t) {
      group.visible = brk < 0;
      for (let i = 0; i < DEBRIS; i++) {
        const second = i >= DEBRIS / 2, h = second ? T.hit2 : T.m1[1], at = second ? HIT2 : HIT1, d = tt - h;
        if (d < 0) { hide(debris, i); continue; }
        const a = hash(i, 1) * Math.PI * 2, sp = (second ? 14 : 9) * (0.4 + hash(i, 2)), up = (second ? 20 : 14) * (0.4 + hash(i, 3));
        const x = at[0] + Math.cos(a) * sp * d, z = at[1] + Math.sin(a) * sp * d * 0.6 + Math.abs(Math.sin(a)) * sp * d * 0.5;
        const y = Math.max(groundHeight(x, z), up * d - 9.8 * d * d), sz = (second ? 1.4 : 0.9) * (0.3 + hash(i, 4));
        put(debris, i, x, y, z, sz, sz, sz, d * 4 * hash(i, 5), d * 3, 0);
      }
      debris.instanceMatrix.needsUpdate = true;
      for (let j = 0; j < ROUND; j++) mote(roundM, j, j, t);
      for (let j = 0; j < DIAMOND; j++) mote(diamM, j, j + ROUND, t);
      roundM.instanceMatrix.needsUpdate = diamM.instanceMatrix.needsUpdate = true;
      rubble.instanceMatrix.needsUpdate = true;
    },
  };
}
