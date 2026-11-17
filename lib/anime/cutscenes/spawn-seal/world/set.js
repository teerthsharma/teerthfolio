// The Sealed Cave, the war plain and the cast of the world, built in the rig frame (the seal at the origin); the live builders are ../live.
import { Group, Mesh, Quaternion, Vector3 } from "three";
import { BREAK, env, HOLLOW_AT, MAW_AT, SEAL_AT, bump, smooth } from "../clock.js";
import { tone } from "../tone.js";
import { dust, veldora, vortex } from "../live/figures.js";
import { particles } from "../live/fx.js";
import { hollowSphere, fistMesh, maw, makeRim, ripple } from "../live/slime.js";
import { battlefield, caveWorld, crystalGeo, crystalMat } from "../live/world.js";

const FORE = [
  [-2.3, 0, 1.7, 1.4],
  [2.0, 0, 2.6, 0.9],
];
const MOTES = { n: 70, at: [0, 0.3, 0], r: 2.6, t0: 1.1, spread: 8.3, speed: 0.5, up: 0.4, vy: 1, life: 4.5, g: -0.15, size: 0.06, colors: ["#9fe6ff", "#ff7ae0", "#ffffff"], seed: 7 };
const BURST = { n: 60, at: [0, 0.2, -3], r: 5, t0: 13.5, spread: 0.3, speed: 4.5, up: 1.4, vy: 1.2, life: 1.2, g: 6, size: 0.2, colors: ["#ffd37a", "#ffffff", "#ff9a3a"], seed: 8 };
const SPARKS = [
  { n: 50, at: [0, 0.2, 0], r: 2, t0: 0.8, spread: 2.2, speed: 2.5, up: 1.6, vy: 1.4, life: 1.6, g: 3, size: 0.14, colors: ["#3fdcff", "#ffffff", "#9fe6ff", "#ff7ae0"], seed: 1 },
  { n: 60, at: SEAL_AT, r: 1.4, t0: 4.0, spread: 3.0, speed: 3, up: 1.2, vy: 1.2, life: 1.4, g: 2, size: 0.16, colors: ["#ffd23a", "#3aa6ff", "#ffffff"], seed: 2 },
  { n: 70, at: [0, 0.3, 0], r: 2.5, t0: 8.9, spread: 1.6, speed: 4, up: 2.2, vy: 1.8, life: 1.4, g: 2, size: 0.18, colors: ["#8a5bff", "#ffffff", "#ffd23a", "#3fdcff"], seed: 3 },
  { n: 60, at: [0, 0.3, -2], r: 6, t0: 10.6, spread: 5.5, speed: 3, up: 1.4, vy: 1.2, life: 1.5, g: 8, size: 0.2, colors: ["#ffd37a", "#ffffff", "#ff9a3a"], seed: 4 },
  { n: 60, at: [0, 0.3, 0], r: 4, t0: 24.4, spread: 1.0, speed: 5, up: 2.0, vy: 1.6, life: 1.2, g: 3, size: 0.16, colors: ["#3fdcff", "#ffffff", "#ff5ad8"], seed: 5 },
  { n: 90, at: [0, 0.3, -6], r: 28, t0: 9.6, spread: 4.5, speed: 1.2, up: 1.6, vy: 1.6, life: 2.6, g: -0.8, size: 0.12, colors: ["#ff9a3a", "#ffd37a", "#ff5a1a"], seed: 6 },
];

const V = new Vector3();
const QG = new Quaternion();
const Q = new Quaternion();

export function buildSet(ctx) {
  const group = new Group();
  const mat = makeRim();
  const cave = caveWorld();
  const war = battlefield(mat);
  const vor = vortex();
  const reform = dust(mat, 14.6);
  const pool = ripple("#1fb8ff", "#7ff8ff", false);
  const portal = ripple("#8a3fff", "#ff5ad8", true);
  const vel = veldora(mat);
  const mw = maw();
  const hs = hollowSphere();
  const fist = fistMesh(mat);
  const spark = particles(mat, SPARKS);
  const motes = particles(mat, [MOTES]);
  const burst = particles(mat, [BURST]);
  const foreGeo = crystalGeo([[0, 0, 7, true, 1]]).geo;
  const foreMat = crystalMat();
  const fore = FORE.map(([x, y, z, s]) => {
    const m = new Mesh(foreGeo, foreMat);
    m.position.set(x, y, z);
    m.scale.setScalar(s);
    m.frustumCulled = false;
    return m;
  });
  group.add(cave.root, war.root, vor.mesh, pool.mesh, portal.mesh, vel.root, mw.mesh, hs.root, fist.mesh, spark.mesh, motes.mesh, burst.mesh, reform.mesh, ...fore);

  const seen = new Set();
  group.traverse((o) => {
    for (const m of [].concat(o.material ?? [])) if (m?.isShaderMaterial && !seen.has(m)) (seen.add(m), tone(m));
  });

  const localQuat = (cam, out) => {
    group.getWorldQuaternion(QG).invert();
    return out.copy(QG).multiply(cam.quaternion);
  };
  const toLocal = (cam, v) => group.worldToLocal(v.copy(cam.position));

  return {
    group,
    update(t) {
      const e = env(t);
      const cam = ctx?.player?.camera;
      group.visible = t >= 1.0;
      group.updateWorldMatrix(true, false);
      mat.uniforms.uTime.value = t;
      mat.uniforms.uGlow.value = 0.5 + 0.5 * Math.sin(t * 9);

      cave.root.visible = t >= 1.0 && e.gone < 0.995;
      cave.update(t, e.war, e.gone, Math.min(1, e.eat * 1.05));
      war.update(t, e.war, smooth(10.3, 11.8, t), 1 - e.gone, bump(t, BREAK + 0.05, 0.2));
      cave.floor.material.uniforms.uK.value = 1 + 0.6 * bump(t, BREAK + 0.05, 0.3);
      foreMat.uniforms.uT.value = t;
      foreMat.uniforms.uDis.value = e.war;
      fore.forEach((m) => (m.visible = e.war <= 0.5));

      vor.mesh.visible = e.vortex > 0.01;
      vor.mat.uniforms.uT.value = t;
      vor.mat.uniforms.uK.value = e.vortex;
      vor.mesh.scale.set(1 + 0.25 * (1 - e.vortex), 1, 1 + 0.25 * (1 - e.vortex));

      pool.mesh.visible = portal.mesh.visible = e.pool > 0.01;
      pool.mesh.scale.setScalar(Math.max(0.001, 2.0 * e.pool));
      portal.mesh.scale.setScalar(Math.max(0.001, 3.4 * e.pool));
      pool.mat.uniforms.uT.value = t;
      portal.mat.uniforms.uT.value = t;

      hs.root.visible = e.hollow > 0.01;
      hs.root.position.set(HOLLOW_AT[0], HOLLOW_AT[1] + 0.1 * Math.sin(t * 1.5), HOLLOW_AT[2]);
      hs.root.scale.setScalar(Math.max(0.001, 0.95 * e.hollow));
      hs.root.rotation.set(t * 0.4, t * 0.7, 0);

      vel.root.visible = e.vel > 0.01 && e.pull < 0.995;
      vel.root.position.set(
        SEAL_AT[0] + (MAW_AT[0] - SEAL_AT[0]) * e.pull,
        SEAL_AT[1] + 0.12 * Math.sin(t * 1.4) + (MAW_AT[1] - SEAL_AT[1]) * e.pull,
        SEAL_AT[2] + (MAW_AT[2] - SEAL_AT[2]) * e.pull,
      );
      vel.root.scale.setScalar(Math.max(0.001, e.vel * (1 - e.pull * 0.98)));
      vel.root.rotation.z = e.pull * 9;
      vel.update(t, e.vel);

      mw.mesh.visible = e.maw > 0.01;
      mw.mat.uniforms.uT.value = t;
      mw.mesh.scale.setScalar(Math.max(0.001, 7.5 * e.maw));
      if (cam) {
        const c = toLocal(cam, V);
        const dx = -c.x, dz = -c.z, len = Math.hypot(dx, dz) || 1;
        mw.mesh.position.set((dx / len) * 7, MAW_AT[1], (dz / len) * 7);
        mw.mesh.quaternion.copy(localQuat(cam, Q));
      }

      fist.mesh.visible = e.fist > 0.01;
      fist.mesh.scale.setScalar(Math.max(0.001, 1.3 * e.fist));
      if (cam) {
        const hh = 5 * Math.tan((cam.fov * Math.PI) / 360);
        V.set(0, -hh * 0.1, -(9 - 6.8 * smooth(13.0, 13.45, t))).applyMatrix4(cam.matrixWorld);
        fist.mesh.position.copy(group.worldToLocal(V));
        fist.mesh.quaternion.copy(localQuat(cam, Q));
      }

      reform.update(t);
      reform.mesh.visible = t > 14.5;
      spark.update(t);
      motes.update(t);
      burst.update(t);
    },
    dispose() {
      cave.dispose();
      war.dispose();
      vor.dispose();
      reform.dispose();
      pool.dispose();
      portal.dispose();
      vel.dispose();
      mw.dispose();
      hs.dispose();
      fist.dispose();
      spark.dispose();
      motes.dispose();
      burst.dispose();
      foreGeo.dispose();
      foreMat.dispose();
      mat.dispose();
    },
  };
}
