// DEBRIS for pr-mujoco-3396: the rubble the set throws at the stomp (real 10.09) and the shrink (real 14.54), the dust ring the stomp kicks up, and
// three slabs that leave the Wall's top at each of the first six footfalls. A pure function of the real clock on twos. One instanced mesh, one draw.
import { Group, InstancedBufferAttribute, InstancedMesh } from "three";
import { DOCK, FOOT, R } from "../clock.js";
import { charcoal } from "../live/charcoal.js";
import { put } from "../live/kit.js";
import { hash, rubbleGeometry, zF } from "../live/world.js";

const STOMP = { n: 56, t0: R.swell[1], life: 1.1 };
const DUST = { n: 20, t0: R.swell[1], life: 0.6 };
const SHRINK = { n: 24, t0: R.shrink[0], life: 0.9 };
const SLAB = { x: [-14, 3, 17], size: 0.6, life: 1.2, falls: 6, top: 20 };
const BASE = { dust: STOMP.n, shrink: STOMP.n + DUST.n, slab: STOMP.n + DUST.n + SHRINK.n };
const N = BASE.slab + SLAB.falls * SLAB.x.length;
const WINDOWS = [
  [R.swell[1], R.swell[1] + STOMP.life],
  [FOOT[0], FOOT[2] + SLAB.life],
  [FOOT[3], FOOT[5] + SLAB.life],
  [R.shrink[0], R.shrink[0] + SHRINK.life],
];
const onTwos = (t) => Math.floor(t * 12 + 1e-6) / 12;

// the same charcoal as the live rubble, plus a per-instance flag: flagged instances (the dust) take a pale cream under the ramp
function debrisMaterial() {
  const m = charcoal({ tone: 0.7, vertexColors: true });
  const V1 = "uniform float uStep, uBreak;", V2 = "vT = 1.0;";
  const F1 = "uniform float uTone, uWash, uKeepK, uRim, uEdge, uRib, uSkin, uOpacity, uHaze, uGlowK;";
  const F2 = "vec3 c = drawn(tone, wash, mix(uKeep, vC, vK), max(uKeepK, vK * 0.85));";
  if ([V1, V2].some((s) => m.vertexShader.split(s).length !== 2) || [F1, F2].some((s) => m.fragmentShader.split(s).length !== 2)) throw new Error("debris: charcoal shader changed");
  m.vertexShader = m.vertexShader.replace(V1, `${V1}\n      attribute float aKind;\n      varying float vD;`).replace(V2, `${V2}\n        vD = aKind;`);
  m.fragmentShader = m.fragmentShader.replace(F1, `${F1}\n      varying float vD;`).replace(F2, `${F2}\n      c = mix(c, vec3(0.93, 0.86, 0.72) * (0.85 + 0.15 * clamp(tone, 0.0, 1.0)), vD);`);
  m.needsUpdate = true;
  return m;
}

export function buildDebris(ctx) {
  const geo = rubbleGeometry(), mat = debrisMaterial();
  const kind = new Float32Array(N);
  for (let k = 0; k < DUST.n; k++) kind[BASE.dust + k] = 1;
  geo.setAttribute("aKind", new InstancedBufferAttribute(kind, 1));
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
      const tq = onTwos(t);
      mesh.visible = WINDOWS.some(([a, b]) => t >= a && t < b);
      if (!mesh.visible) return;
      const [fx, , fz] = rig("feet", 0), [hx, hy, hz] = rig("top", 1.2);
      for (let i = 0; i < STOMP.n; i++) {
        const th = hash(i, 1) * Math.PI * 2, age = tq - STOMP.t0;
        const y = 0.3 + (7 + 6 * hash(i, 2)) * age - 4.9 * age * age;
        if (age < 0 || age > STOMP.life || y < 0) { put(mesh, i, 0, -60, 0, 0.001); continue; }
        const r = 3.5 + 3 * hash(i, 3) * age, sz = 0.25 + 1.55 * hash(i, 4);
        put(mesh, i, fx + r * Math.cos(th), y, fz + r * Math.sin(th), sz, sz, sz, age * 6 * hash(i, 5), age * 5 * hash(i, 6), 0);
      }
      for (let k = 0; k < DUST.n; k++) {
        const i = BASE.dust + k, age = tq - DUST.t0;
        if (age < 0 || age > DUST.life) { put(mesh, i, 0, -60, 0, 0.001); continue; }
        const th = ((k + 0.3 * hash(i, 1)) / DUST.n) * Math.PI * 2, r = 1 + 8 * (age / DUST.life), f = Math.min(1, (DUST.life - age) / 0.15);
        put(mesh, i, fx + r * Math.cos(th), 0.25, fz + r * Math.sin(th), 1.6 * f, 0.5 * f, 1.6 * f, 0, -th, 0);
      }
      for (let k = 0; k < SHRINK.n; k++) {
        const i = BASE.shrink + k, th = hash(i, 1) * Math.PI * 2, age = tq - SHRINK.t0;
        const y = hy + (0.6 + 0.4 * hash(i, 8)) * 5 * age - 4.9 * age * age;
        if (age < 0 || age > SHRINK.life || y < 0) { put(mesh, i, 0, -60, 0, 0.001); continue; }
        const sz = 0.12 + 0.2 * hash(i, 4);
        put(mesh, i, hx + Math.cos(th) * 5 * age, y, hz + Math.sin(th) * 5 * age, sz, sz, sz, age * 6 * hash(i, 5), age * 5 * hash(i, 6), 0);
      }
      for (let f = 0; f < SLAB.falls; f++) for (let j = 0; j < SLAB.x.length; j++) {
        const i = BASE.slab + f * SLAB.x.length + j, age = tq - FOOT[f];
        if (age < 0 || age > SLAB.life) { put(mesh, i, 0, -60, 0, 0.001); continue; }
        const x = SLAB.x[j];
        put(mesh, i, x, SLAB.top - 4.9 * age * age, zF(x) + 3.2, SLAB.size, SLAB.size, SLAB.size, age * 6 * hash(i, 5), age * 5 * hash(i, 6), 0);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
