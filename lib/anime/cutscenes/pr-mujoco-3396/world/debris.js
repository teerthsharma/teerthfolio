// DEBRIS for pr-mujoco-3396: the rubble the set throws at the stomp (real 10.09, 32 chunks off the feet) and at the shrink (real 14.54, 16 chunks off
// the head). A pure function of the real clock on twos: each chunk is placed from its launch, so a seek equals a play. One instanced mesh, one draw.
import { Group, InstancedMesh } from "three";
import { DOCK, R } from "../clock.js";
import { charcoal } from "../live/charcoal.js";
import { put } from "../live/kit.js";
import { hash, rubbleGeometry } from "../live/world.js";

const STOMP = { n: 32, t0: R.swell[1], life: 1.1 };
const SHRINK = { n: 16, t0: R.shrink[0], life: 0.9 };
const N = STOMP.n + SHRINK.n;
const WINDOWS = [[10.0, 11.3], [14.5, 15.5]];
const onTwos = (t) => Math.floor(t * 12 + 1e-6) / 12;

export function buildDebris(ctx) {
  const geo = rubbleGeometry(), mat = charcoal({ tone: 0.7, vertexColors: true });
  const mesh = new InstancedMesh(geo, mat, N);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1003;
  mesh.name = "debris";
  for (let i = 0; i < N; i++) put(mesh, i, 0, -60, 0, 0.001);
  const group = new Group();
  group.add(mesh);

  const rig = (p, i) => {
    const a = ctx.seal.named?.()?.[p];
    if (a) return [a.x - DOCK[0], a.y - DOCK[1], a.z - DOCK[2]];
    const at = ctx.seal.at;
    return [at[0] - DOCK[0], at[1] - DOCK[1] + (i ?? 1.2), at[2] - DOCK[2]];
  };

  return {
    group,
    tier: 1,
    update(t) {
      const tq = onTwos(t), live = WINDOWS.some(([a, b]) => t >= a && t < b);
      mesh.visible = live;
      if (!live) return;
      const [fx, , fz] = rig("feet", 0), [hx, hy, hz] = rig("top", 1.2);
      for (let i = 0; i < STOMP.n; i++) {
        const th = hash(i, 1) * Math.PI * 2, age = tq - STOMP.t0;
        const y = 0.3 + (7 + 6 * hash(i, 2)) * age - 4.9 * age * age;
        if (age < 0 || age > STOMP.life || y < 0) { put(mesh, i, 0, -60, 0, 0.001); continue; }
        const r = 3.5 + 3 * hash(i, 3) * age, sz = 0.25 + 0.5 * hash(i, 4);
        put(mesh, i, fx + r * Math.cos(th), y, fz + r * Math.sin(th), sz, sz, sz, age * 6 * hash(i, 5), age * 5 * hash(i, 6), 0);
      }
      for (let k = 0; k < SHRINK.n; k++) {
        const i = STOMP.n + k, th = hash(i, 1) * Math.PI * 2, age = tq - SHRINK.t0;
        const y = hy + (0.6 + 0.4 * hash(i, 8)) * 5 * age - 4.9 * age * age;
        if (age < 0 || age > SHRINK.life || y < 0) { put(mesh, i, 0, -60, 0, 0.001); continue; }
        const sz = 0.12 + 0.2 * hash(i, 4);
        put(mesh, i, hx + Math.cos(th) * 5 * age, y, hz + Math.sin(th) * 5 * age, sz, sz, sz, age * 6 * hash(i, 5), age * 5 * hash(i, 6), 0);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
