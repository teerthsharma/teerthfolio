"use client";

// Soft clouds in the strip of sky the camera can actually see. The old
// version orbited the camera itself, 20-24 m out and 10-13 m up: close
// enough that the Google range, MujoRush and Triton (30-33 m tall nearby)
// stood taller than the cloud layer and hid it outright in every capture
// (db2feaf deleted it for exactly that). This one orbits the ground-focus
// point instead (the same point Snowfall.jsx and Upfall.jsx already track:
// where the camera is actually looking), well past the nearest landform's
// footprint and high enough to clear it, so the puffs sit in open sky next
// to the peaks instead of behind them. One instanced mesh; each puff is a
// small cluster of low-poly blobs merged once.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { IcosahedronGeometry, MeshStandardMaterial, Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "../life/spawn";
import { groundFocus } from "./focus";

const COUNT = 9;
const RADIUS = [46, 66]; // m from the ground-focus point, past the nearest landform's footprint
const HEIGHT = [16, 23]; // m absolute, clear of the range but under the frustum's top edge
const DRIFT = 0.008; // rad/s: a slow circling, barely perceptible

function buildPuff() {
  const rand = mulberry32(4);
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const g = new IcosahedronGeometry(0.9 + rand() * 0.7, 0);
    g.scale(1, 0.6, 1);
    g.translate((rand() - 0.5) * 3.2, rand() * 0.35, (rand() - 0.5) * 1.8);
    parts.push(g);
  }
  const merged = mergeGeometries(parts);
  merged.computeVertexNormals();
  return merged;
}

const dummy = new Object3D();
const focus = { x: 0, z: 0 };

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
      scale: 3 + rand() * 2.6,
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
    groundFocus(camera, focus);
    const t = clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      const p = puffs[i];
      const a = p.angle + t * p.spin;
      dummy.position.set(focus.x + Math.sin(a) * p.radius, p.height, focus.z - Math.cos(a) * p.radius);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, COUNT]} frustumCulled={false} />;
}
