"use client";

// The island's fresh water: the river, the lake behind the ice dam and the
// NVIDIA moat, one sheet sitting in the terrain's basins (sea/build.js), with
// a crisp foam line lapping at every bank, and the current drawn as white
// streaks that ride lib/world/river.js's flow field: quick and tight in the
// channel and the spill, lazy in the lake, round and round the moat, and
// tumbling down the rapids where the river meets the sea.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry } from "three";
import { riverAt } from "../../../lib/world/river";
import { coastRadius } from "../../../lib/world/terrain";
import { buildWaterSurface, streakSpawn, surfaceY } from "./build";

const STREAKS = 130;
const DRIFT = 0.8; // streaks travel at this share of the current (they read as the surface, not the fastest thread)

function waterMaterial(time) {
  const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.16, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aDepth;\nvarying float vDepth;\nvarying vec2 vXZ;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDepth = aDepth;\nvXZ = position.xz;");
    // Two foam lines, crisp: the white lip where the water meets the bank,
    // lapping in and out, and a thinner line just offshore that breathes.
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nvarying float vDepth;\nvarying vec2 vXZ;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float wob = sin(uTime * 1.5 + vXZ.x * 0.63 + vXZ.y * 0.81) * 0.5 + sin(uTime * 0.9 - vXZ.x * 1.37 + vXZ.y * 0.52) * 0.5;
        float lip = 0.15 + 0.045 * wob;
        float aa = fwidth(vDepth) * 0.75 + 1e-4;
        float foam = 1.0 - smoothstep(lip - aa, lip + aa, vDepth);
        float ring = 0.34 + 0.07 * sin(uTime * 1.1 + vXZ.x * 0.21 - vXZ.y * 0.17);
        foam = max(foam, 0.75 * (1.0 - smoothstep(0.022 - aa, 0.022 + aa, abs(vDepth - ring))));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.97, 0.99, 1.0), foam);`,
      );
  };
  return m;
}

export default function River() {
  const geometry = useMemo(buildWaterSurface, []);
  const time = useMemo(() => ({ value: 0 }), []);
  const material = useMemo(() => waterMaterial(time), [time]);

  // the streaks: flat dashes riding the flow, each growing in and shrinking
  // out over its short life
  const streakGeo = useMemo(() => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  const streakMat = useMemo(() => new MeshBasicMaterial({ color: "#effcff" }), []);
  const state = useMemo(() => {
    const s = { x: new Float32Array(STREAKS), z: new Float32Array(STREAKS), age: new Float32Array(STREAKS), life: new Float32Array(STREAKS), len: new Float32Array(STREAKS) };
    const p = {};
    for (let i = 0; i < STREAKS; i++) {
      streakSpawn(p);
      s.x[i] = p.x;
      s.z[i] = p.z;
      s.life[i] = 1.6 + Math.random() * 2.2;
      s.age[i] = Math.random() * s.life[i];
      s.len[i] = 1.2 + Math.random() * 1.6;
    }
    return s;
  }, []);
  const streaks = useRef();
  const dummy = useMemo(() => new Object3D(), []);
  const here = useMemo(() => ({}), []);
  const spawnAt = useMemo(() => ({}), []);

  useFrame(({ clock }, delta) => {
    time.value = clock.elapsedTime;
    const mesh = streaks.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < STREAKS; i++) {
      riverAt(state.x[i], state.z[i], here);
      state.age[i] += dt;
      const r = Math.hypot(state.x[i], state.z[i]);
      if (state.age[i] > state.life[i] || here.depth < 0.08 || r > coastRadius(Math.atan2(state.z[i], state.x[i])) + 0.5) {
        streakSpawn(spawnAt);
        state.x[i] = spawnAt.x;
        state.z[i] = spawnAt.z;
        state.age[i] = 0;
        state.life[i] = 1.6 + Math.random() * 2.2;
        riverAt(state.x[i], state.z[i], here);
      }
      state.x[i] += here.flowX * DRIFT * dt;
      state.z[i] += here.flowZ * DRIFT * dt;
      const speed = Math.hypot(here.flowX, here.flowZ);
      const grow = Math.sin((state.age[i] / state.life[i]) * Math.PI);
      // longer where the water is quick, a short fleck where it idles
      const len = state.len[i] * (0.45 + Math.min(1, speed / 10)) * grow;
      dummy.position.set(state.x[i], surfaceY(state.x[i], state.z[i]) + 0.018, state.z[i]);
      dummy.rotation.set(0, Math.atan2(-here.flowZ, here.flowX), 0);
      dummy.scale.set(Math.max(0.001, len), 1, 0.2 * (0.4 + 0.6 * grow));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <mesh geometry={geometry} material={material} receiveShadow />
      <instancedMesh ref={streaks} args={[streakGeo, streakMat, STREAKS]} frustumCulled={false} />
    </>
  );
}
