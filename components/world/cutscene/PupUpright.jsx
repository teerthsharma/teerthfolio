"use client";

// THE PUP UPRIGHT: a move may roll or pitch the pup's groups; none of it may outlast the scene. On unmount the
// pup's root is levelled, and from the credit beat the body and head ease their roll/pitch to 0 over 0.4 s
// (after D.jsx has written them, priority 1), so the hand-back to Seal.jsx is never a snap.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { sceneT } from "../../../lib/world/cutscene/clock";
import { cutFor, smooth } from "../../../lib/world/cutscene/timeline";
import { live } from "../../../lib/world/store";
import { pupParts } from "./moves/p-caustic/parts";

export default function PupUpright({ id }) {
  const scene = useThree((s) => s.scene);
  const parts = useRef(null);
  useEffect(() => {
    parts.current = pupParts(scene);
    return () => {
      const p = scene.getObjectByName("seal");
      if (p) {
        p.rotation.x = 0;
        p.rotation.z = 0;
        p.scale.setScalar(1);
      }
      parts.current = null;
    };
  }, [scene, id]);
  useFrame((state) => {
    const a = live.arrival;
    const tl = a.id === id ? cutFor(id)?.tl : null;
    if (!tl || tl.credit == null || !parts.current) return;
    const t = sceneT(id, state.clock.elapsedTime - a.start);
    const k = 1 - smooth(tl.credit, tl.credit + 0.4, t);
    if (k >= 1) return;
    for (const g of [parts.current.root, parts.current.rear, parts.current.head]) {
      if (!g) continue;
      g.rotation.x *= k;
      g.rotation.z *= k;
    }
  }, 1);
  return null;
}
