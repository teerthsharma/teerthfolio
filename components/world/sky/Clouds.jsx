"use client";

// Soft clouds in the strip of sky the camera can actually see. The camera's
// fixed follow framing (CameraRig.jsx: 42 degrees of elevation, 35.5 m out,
// 35 degree vertical fov, azimuth that never turns) only ever shows ground
// between 24.5 and 59.5 degrees below the horizon -- the same fixed band
// Atmosphere.jsx's own header describes. A puff hung at a fixed height in
// open world space drifts out of that band (too high, it vanishes off the
// top; too far out, the band's own downward slope puts "the sky" at or
// below ground height, so it is behind whatever terrain sits in front of
// it) -- that was the old bug: 9 puffs at a fixed radius and height round
// the camera happened to land outside the band, or behind the Google range,
// almost every frame. So each puff is placed by the angle it sits at in the
// view (comfortably inside that vertical band, spread a little either side
// of dead ahead) rather than by a world-space height: wherever the camera
// is, at whatever zoom, that angle is always inside the frustum, and the
// puff always clears any ground in front of it because it is by
// construction higher than the band's own floor at that distance. Drift is
// sideways only, the way wind moves cloud, and stays inside the same safe
// angle so a puff never drifts back out of frame. One instanced mesh; each
// puff is a small cluster of low-poly blobs merged once.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { IcosahedronGeometry, MeshStandardMaterial, Object3D, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "../life/spawn";

const COUNT = 9;
const DEG = Math.PI / 180;
// CameraRig.jsx's follow camera never turns in azimuth (OFFSET has no x):
// "ahead" is always world -z. Its vertical band is 24.5-59.5 degrees down;
// stay 8 degrees clear of each edge (a puff has its own ~10 degree radius,
// on top of a slow drift) so it can never poke out.
const V_DOWN = [30 * DEG, 42 * DEG]; // below horizontal, per puff: stays well overhead, not down at prop height
const H_BASE = 5 * DEG; // either side of dead ahead, before drift
const H_DRIFT = 2 * DEG; // amplitude of the sideways sway
const DIST = [14, 24]; // m from the camera along that angle
const PERIOD = [40, 70]; // s per sway cycle
const SCALE = [0.35, 0.55]; // a puff's own local extent (~2.5 m) times this: keep it a puff, not a wall

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
const pos = new Vector3();

export default function Clouds() {
  const ref = useRef();
  const geometry = useMemo(buildPuff, []);
  const material = useMemo(() => new MeshStandardMaterial({ color: "#fbfbff", flatShading: true, roughness: 0.95 }), []);
  const puffs = useMemo(() => {
    const rand = mulberry32(11);
    return Array.from({ length: COUNT }, (_, i) => ({
      side: i % 2 ? 1 : -1, // half sway left of ahead, half right
      hBase: (rand() * 2 - 1) * H_BASE,
      vDown: V_DOWN[0] + rand() * (V_DOWN[1] - V_DOWN[0]),
      dist: DIST[0] + rand() * (DIST[1] - DIST[0]),
      period: PERIOD[0] + rand() * (PERIOD[1] - PERIOD[0]),
      phase: rand() * 6.28,
      rot: rand() * 6.28,
      scale: SCALE[0] + rand() * (SCALE[1] - SCALE[0]),
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
    const t = clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      const p = puffs[i];
      const h = p.hBase + p.side * H_DRIFT * Math.sin((t / p.period) * 6.28 + p.phase);
      const cv = Math.cos(p.vDown);
      pos.set(Math.sin(h) * cv, -Math.sin(p.vDown), -Math.cos(h) * cv).multiplyScalar(p.dist).add(camera.position);
      dummy.position.copy(pos);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, COUNT]} frustumCulled={false} />;
}
