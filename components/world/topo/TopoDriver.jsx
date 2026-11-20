"use client";
// The topological shader's per-frame CPU loop (core.js) on the island canvas. Scene.jsx mounts it only when topoMode() is not "off",
// through a lazy import, so the default path never loads this file, builds a texture or links a program. It publishes the chunk and
// the T_h uniforms at window.__world.topo, which lib/anime/post.js reads when it draws a cutscene plate.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { live } from "../../../lib/world/store";
import { createTopo } from "./core";
import { topoMode } from "./topoFlag";

export default function TopoDriver() {
  const topo = useMemo(() => createTopo(topoMode()), []);
  useEffect(() => {
    topo.loadPlates(); // "on" only: fetches the baked route plates once; any failure leaves every cell LIVE
    window.__world = { ...(window.__world || {}), topo: topo.plug };
    return () => {
      if (window.__world?.topo === topo.plug) window.__world = { ...window.__world, topo: undefined };
      topo.tex.dispose();
    };
  }, [topo]);
  useFrame((state, delta) => topo.step(live.seal.x, live.seal.z, state.clock.elapsedTime, delta * 1000));
  return null;
}
