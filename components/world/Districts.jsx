"use client";

// The land: the terrain (lib/world/terrain.js as one mesh), and every
// landform built on it from components/world/land/*. Mounted by Scene.jsx.

import Floes from "./land/Floes";
import GoogleRange from "./land/GoogleRange";
import Highway from "./land/Highway";
import HeroMove from "./HeroMove";
import IceDam from "./land/IceDam";
import LabAnomalies from "./life/anomalies/LabAnomalies";
import Moat from "./land/Moat";
import MujoRush from "./land/MujoRush";
import SealColony from "./life/SealColony";
import Terrain from "./land/Terrain";
import Triton from "./land/Triton";

export default function Districts() {
  return (
    <>
      <Terrain />
      <Moat />
      <Floes />
      <GoogleRange />
      <Highway />
      <HeroMove />
      <Triton />
      <IceDam />
      <MujoRush />
      <LabAnomalies />
      <SealColony />
    </>
  );
}
