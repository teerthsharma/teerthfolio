"use client";

// Soft clouds drifting through the strip of sky the camera can actually see
// (the note atop Atmosphere.jsx: the view never looks above the horizon).
// Like Horizon.jsx, each puff orbits the camera itself, at a radius and
// height scaled to the camera's own height, so it rides in view at any zoom
// instead of drifting in and out of a fixed patch of world. One instanced
// mesh; each puff is a small cluster of low-poly blobs merged once.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { IcosahedronGeometry, MeshStandardMaterial, Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "../life/spawn";

// Same reference camera height Horizon.jsx rescales against: CameraRig.jsx's
// follow camera, 42 degrees of elevation, 35.5 m out.
const REF_CY = Math.sin((42 * Math.PI) / 180) * 35.5;

const COUNT = 9;
const RADIUS = [22, 33]; // m from the camera, at REF_CY -- among the Horizon peaks, not above them
const HEIGHT = [7, 13]; // m, at REF_CY
const DRIFT = 0.01; // rad/s: a slow circling, barely perceptible

function buildPuff() {
  const rand = mulberry32(4);
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const g = new IcosahedronGeometry(0.7 + rand() * 0.55, 0);
    g.scale(1, 0.6, 1);
    g.translate((rand() - 0.5) * 2.6, rand() * 0.3, (rand() - 0.5) * 1.5);
    parts.push(g);
  }
  const merged = mergeGeometries(parts);
  merged.computeVertexNormals();
  return merged;
}

const dummy = new Object3D();

export default function Clouds() {
  const ref = useRef();
  const geometry = useMemo(buildPuff, []);
  const material = useMemo(() => new MeshStandardMaterial({ color: "#fbfbff", flatShading: true, roughness: 0.95 }), []);
  const puffs = useMemo(() => {
    const rand = mulberry32(11);
    return Array.from({ length: COUNT }, () => ({
      angle: rand() * Math.PI * 2,
      radius: RADIUS[0] + rand() * (RADIUS[1] - RADIUS[0]),
      height: HEIGHT[0] + rand() * (HEIGHT[1] - HEIGHT[0]),
      spin: (rand() < 0.5 ? -1 : 1) * (0.5 + 0.5 * rand()) * DRIFT,
      rot: rand() * 6.28,
      scale: 2.2 + rand() * 2,
    }));
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = 0; i < COUNT; i++) mesh.setMatrixAt(i, dummy.matrix);
  }, []);

  useFrame(({ camera, clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const k = Math.max(0.001, camera.position.y) / REF_CY;
    const t = clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      const p = puffs[i];
      const a = p.angle + t * p.spin;
      dummy.position.set(
        camera.position.x + Math.sin(a) * p.radius * k,
        p.height * k,
        camera.position.z - Math.cos(a) * p.radius * k,
      );
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.setScalar(p.scale * k);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, COUNT]} frustumCulled={false} />;
}
