"use client";

// The land: the terrain (lib/world/terrain.js as one mesh), and every
// landform built on it from components/world/land/*. Mounted by Scene.jsx.

import Moat from "./land/Moat";
import Terrain from "./land/Terrain";

export default function Districts() {
  return (
    <>
      <Terrain />
      <Moat />
    </>
  );
}
