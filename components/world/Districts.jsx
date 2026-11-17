"use client";

// The land: the terrain (lib/world/terrain.js as one mesh), and every
// landform built on it from components/world/land/*. Mounted by Scene.jsx.

import Atoll from "./land/Atoll";
import Basalt from "./land/Basalt";
import Bergs from "./land/Bergs";
import BlueIce from "./land/BlueIce";
import Cenotes from "./land/Cenotes";
import Covenant from "./land/Covenant";
import Crevasse from "./land/Crevasse";
import Delta from "./land/Delta";
import Dunes from "./land/Dunes";
import Floes from "./land/Floes";
import Fountain from "./land/Fountain";
import FountainRise from "./land/FountainRise";
import GoogleRange from "./land/GoogleRange";
import Highway from "./land/Highway";
import Hoodoos from "./land/Hoodoos";
import Hut from "./land/Hut";
import IceDam from "./land/IceDam";
import LabAnomalies from "./life/anomalies/LabAnomalies";
import MeltLake from "./land/MeltLake";
import Moat from "./land/Moat";
import MujoRush from "./land/MujoRush";
import Nunatak from "./land/Nunatak";
import OilRig from "./land/OilRig";
import RegionAir from "./land/Regions";
import Rookery from "./land/Rookery";
import SaltFlat from "./land/SaltFlat";
import Sastrugi from "./land/Sastrugi";
import SealColony from "./life/SealColony";
import SeaStacks from "./land/SeaStacks";
import Shelf from "./land/Shelf";
import Terrain from "./land/Terrain";
import Triton from "./land/Triton";

export default function Districts() {
  return (
    <>
      <Terrain />
      <RegionAir />
      <Moat />
      <Floes />
      <Fountain />
      <FountainRise />
      <GoogleRange />
      <Highway />
      <Triton />
      <IceDam />
      <MujoRush />
      <Covenant />
      <OilRig />
      <Shelf />
      <Crevasse />
      <BlueIce />
      <Nunatak />
      <Sastrugi />
      <Hut />
      <Rookery />
      <Delta />
      <MeltLake />
      <Bergs />
      <Dunes />
      <Hoodoos />
      <Cenotes />
      <SaltFlat />
      <Basalt />
      <SeaStacks />
      <Atoll />
      <LabAnomalies />
      <SealColony />
    </>
  );
}
