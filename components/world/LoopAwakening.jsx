"use client";

// PLACEHOLDER for the `loop-awakening` cutscene (lib/world/loop.js AWAKENING):
// the plain letterbox (Hud.jsx, from ui.cutscene) and the pup glowing. A
// separate piece of work replaces this with the full-screen awakening on the
// shared cutscene kit. The hook it plugs into: while
// live.arrival.id === "loop-awakening", seconds since live.arrival.start run
// 0..AWAKENING.duration (input held until AWAKENING.hold); Skip or any fresh
// key clears the arrival and this unmounts its glow the same frame.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, MeshBasicMaterial, SphereGeometry } from "three";
import { AWAKENING } from "../../lib/world/loop";
import { live } from "../../lib/world/store";

export default function LoopAwakening() {
  const glow = useRef();
  const geo = useMemo(() => new SphereGeometry(1, 24, 16), []);
  const mat = useMemo(() => new MeshBasicMaterial({ color: "#8fe9ff", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }), []);
  useFrame(({ clock }) => {
    const mesh = glow.current;
    if (!mesh) return;
    const on = live.arrival.id === AWAKENING.id;
    mesh.visible = on;
    if (!on) return;
    const u = Math.min(1, (clock.elapsedTime - live.arrival.start) / AWAKENING.duration);
    const k = Math.sin(Math.PI * u) ** 0.7; // in, hold, out
    mesh.position.set(live.seal.x, 0.9, live.seal.z);
    mesh.scale.setScalar(1.4 + 0.5 * k);
    mat.opacity = 0.45 * k;
  });
  return <mesh ref={glow} geometry={geo} material={mat} visible={false} renderOrder={5} />;
}
