// THE SLIME CAVE'S SPARKS: one pooled, state-free particle mesh; each slot is a pure function of the clock. Nothing allocates per frame.
import { Color, InstancedMesh, Object3D, OctahedronGeometry } from "three";
import { KIND, layer } from "./paper";
import { hash } from "./slime";

const D = new Object3D();

// each slot belongs to an emitter and is a pure function of the clock
export function particles(mat, emitters) {
  const slots = [];
  for (const e of emitters)
    for (let k = 0; k < e.n; k++) {
      const h = (j) => hash(slots.length * 7 + k, j + e.seed);
      const a = h(1) * Math.PI * 2;
      const up = e.up ?? 0.5;
      const sp = e.speed * (0.4 + 0.8 * h(2));
      slots.push({
        t0: e.t0 + (e.spread ?? 0) * h(3),
        at: e.at,
        v: [Math.cos(a) * sp * (e.flat ?? 1), (up + h(4) * (e.upVar ?? 0.8)) * sp * (e.vy ?? 1), Math.sin(a) * sp * (e.flat ?? 1)],
        life: e.life * (0.6 + 0.6 * h(5)),
        g: e.g ?? 9,
        size: e.size * (0.5 + h(6)),
        color: e.colors[Math.floor(h(7) * e.colors.length)],
        spin: 4 + 8 * h(8),
        r: e.r ?? 0,
        ra: h(9) * Math.PI * 2,
      });
    }
  const L = layer();
  L.add(new OctahedronGeometry(1, 0).scale(0.5, 1, 0.5), "#ffffff", { kind: KIND.glow, noEdge: true });
  const geo = L.build();
  const mesh = new InstancedMesh(geo, mat, slots.length);
  mesh.frustumCulled = false;
  const c = new Color();
  slots.forEach((s, i) => mesh.setColorAt(i, c.set(s.color)));
  mesh.instanceColor.needsUpdate = true;
  return {
    mesh,
    count: slots.length,
    update(t) {
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const d = t - s.t0;
        if (d < 0 || d > s.life) {
          D.position.set(0, -50, 0);
          D.scale.setScalar(0.0001);
        } else {
          const k = d / s.life;
          D.position.set(s.at[0] + Math.cos(s.ra) * s.r + s.v[0] * d, Math.max(0.05, s.at[1] + s.v[1] * d - 0.5 * s.g * d * d), s.at[2] + Math.sin(s.ra) * s.r + s.v[2] * d);
          D.rotation.set(d * s.spin, d * s.spin * 0.7, d * s.spin * 0.4);
          D.scale.setScalar(s.size * (1 - k * k));
        }
        D.updateMatrix();
        mesh.setMatrixAt(i, D.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mesh.dispose();
    },
  };
}

