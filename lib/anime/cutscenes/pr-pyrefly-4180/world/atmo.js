// Extra air for pr-pyrefly-4180: cut-paper leaves and ember curls at tier 2 and up (added to the live 90 and 60 that play/ ports), far
// embers climbing the haze behind the village, and flat paper shards thrown off the pin at the two hits. Pure functions of the real clock on twos.
import { DynamicDrawUsage, Group, InstancedMesh, Object3D, Color } from "three";
import { HIT, REAL, onTwos, smooth } from "../clock.js";
import { FLOOR } from "../live/world.js";
import { card, hash, merge } from "../live/paper.js";

const EXTRA = { leaves: [0, 0, 110, 230], embers: [0, 0, 80, 160], far: [0, 0, 120, 160] };
const LEAF = ["#7a2b1c", "#a2461f", "#5b2318", "#3c1d2a"];
const EMBER = ["#ff8a3a", "#ffc060"];
const PIN0 = [-2.6, 1.25, -1.15];
const LIFE = 0.9;
const KINDS = [
  { color: "#ff6b57", n: 16, shards: Array.from({ length: 16 }, (_, j) => ({ t0: HIT.burst, seed: 500 + j })) },
  { color: "#e9dcc0", n: 26, shards: [...Array.from({ length: 8 }, (_, j) => ({ t0: HIT.burst, seed: 520 + j })), ...Array.from({ length: 18 }, (_, j) => ({ t0: HIT.pin, seed: 540 + j }))] },
  { color: "#c9962e", n: 10, shards: Array.from({ length: 10 }, (_, j) => ({ t0: HIT.pin, seed: 560 + j })) },
  { color: "#f0c860", n: 12, hoop: true, shards: Array.from({ length: 12 }, (_, j) => ({ t0: HIT.hoop, seed: 580 + j })) },
  { color: "#c98c1c", n: 8, hoop: true, shards: Array.from({ length: 8 }, (_, j) => ({ t0: HIT.bolt, seed: 600 + j })) },
];

const O = new Object3D();
const C = new Color();
function put(m, i, x, y, z, rx, ry, rz, s) {
  O.position.set(x, y, z);
  O.rotation.set(rx, ry, rz);
  O.scale.setScalar(Math.max(s, 1e-4));
  O.updateMatrix();
  m.setMatrixAt(i, O.matrix);
}
function inst(geo, mat, n, colorOf) {
  const m = new InstancedMesh(geo, mat, n);
  m.instanceMatrix.setUsage(DynamicDrawUsage);
  m.frustumCulled = false;
  for (let i = 0; i < n; i++) m.setColorAt(i, C.set(colorOf(i)));
  m.count = 0;
  m.visible = false;
  return m;
}
const show = (m, n) => {
  m.count = n;
  m.visible = n > 0;
};
const leafGeo = () => merge([card([[-0.14, 0], [0, 0.07], [0.16, 0], [0, -0.07]], { color: "#ffffff", depth: 0.012 }), card([[-0.02, 0], [0.18, 0.005], [0.18, -0.005]], { color: "#ffffff", depth: 0.014, z: 0.01 })]);
const emberGeo = () => card([[0, -0.05], [0.12, 0], [0.2, 0.08], [0.1, 0.14], [0, 0.08], [0.06, 0.02]], { color: "#ffffff", depth: 0.01 });
const diamondGeo = () => card([[0, -0.03], [0.06, 0], [0, 0.03], [-0.06, 0]], { color: "#ffffff", depth: 0.01 });
const chipGeo = () => card([[-0.5, -0.3], [0.1, -0.5], [0.5, -0.1], [0.3, 0.45], [-0.4, 0.4]], { color: "#ffffff", depth: 0.05 });
const emberColor = (i) => EMBER[i % 3 ? 0 : 1];

export function buildAtmo(mats) {
  const root = new Group();
  const leaves = inst(leafGeo(), mats.solid, EXTRA.leaves[3], (i) => LEAF[i % 4]);
  const embers = inst(emberGeo(), mats.glow, EXTRA.embers[3], emberColor);
  const far = inst(diamondGeo(), mats.glow, EXTRA.far[3], emberColor);
  const chips = KINDS.map((k) => inst(chipGeo(), mats.solid, k.n, () => k.color));
  root.add(leaves, embers, far, ...chips);
  chips.forEach((c, j) => show(c, KINDS[j].n));

  return {
    root,
    update(t, tier, st) {
      const k = Math.max(0, Math.min(3, tier | 0));
      const q = onTwos(t);
      const sw = smooth(REAL.rise[1] - 0.4, REAL.rise[1] + 0.4, t) * (1 - smooth(REAL.fold - 0.4, REAL.fold, t));
      const nl = EXTRA.leaves[k];
      const ne = EXTRA.embers[k];
      const nf = EXTRA.far[k];
      show(leaves, nl);
      show(embers, ne);
      show(far, nf);
      for (let i = 0; i < nl; i++) {
        const n = 90 + i;
        const a = hash(n, 1) * 6.28 + q * (0.5 + 0.7 * hash(n, 2));
        const rr = 3 + 16 * hash(n, 3);
        const y = (hash(n, 4) * 6 + q * (0.4 + hash(n, 5))) % 6;
        put(leaves, i, Math.cos(a) * rr * 0.9 - 1, 0.2 + y, -4 + Math.sin(a) * rr * 0.5 - 2, q * (2 + hash(n, 6)), q * 1.7 + n, q * 3 + n, sw * (0.9 + 0.8 * hash(n, 7)));
      }
      for (let i = 0; i < ne; i++) {
        const n = 60 + i;
        const y = (hash(n, 8) * 9 + q * (0.9 + hash(n, 9))) % 9;
        put(embers, i, -8 + 16 * hash(n, 10) + Math.sin(q * 1.3 + n) * 0.9, y, -3 - 10 * hash(n, 11), 0, 0, q * 4 + n, sw * (0.8 + 1.2 * hash(n, 12)) * (1 - y / 11));
      }
      for (let i = 0; i < nf; i++) {
        const n = 300 + i;
        const y = FLOOR + ((hash(n, 13) * 22 + q * (0.4 + 0.6 * hash(n, 14))) % 22);
        put(far, i, -140 + 280 * hash(n, 15) + Math.sin(q * 0.7 + n) * 1.2, y, -30 - 30 * hash(n, 16), 0, 0, q + n, sw);
      }
      leaves.instanceMatrix.needsUpdate = embers.instanceMatrix.needsUpdate = far.instanceMatrix.needsUpdate = true;

      const P = st?.pinAt ?? PIN0;
      const H = st?.hoopAt;
      const hp = H && (H[0] || H[1] || H[2]) ? H : PIN0;
      KINDS.forEach((kind, j) => {
        const m = chips[j], O3 = kind.hoop ? hp : P;
        kind.shards.forEach((sh, i) => {
          const s = q - sh.t0;
          if (s < 0 || s >= LIFE) return put(m, i, 0, 0, 0, 0, 0, 0, 0);
          const v = 2.5 + 2.5 * hash(sh.seed, 1);
          const a = 6.283 * hash(sh.seed, 2);
          const lift = 0.3 + 0.8 * hash(sh.seed, 3);
          const x = O3[0] + v * Math.cos(a) * s;
          const y = O3[1] + v * (Math.sin(a) + lift) * s - 3 * s * s;
          const z = O3[2] + 0.3 * v * (hash(sh.seed, 4) - 0.5) * s;
          put(m, i, x, y, z, 0, 0, (3 + 6 * hash(sh.seed, 5)) * s, 0.08 + 0.12 * hash(sh.seed, 6));
        });
        m.instanceMatrix.needsUpdate = true;
      });
    },
    dispose() {
      for (const m of [leaves, embers, far, ...chips]) {
        m.geometry.dispose();
        m.dispose?.();
      }
      root.clear();
    },
  };
}
