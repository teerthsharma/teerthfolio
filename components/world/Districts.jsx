"use client";

// The land: the terrain (lib/world/terrain.js as one mesh), and every
// landform built on it from components/world/land/*. Mounted by Scene.jsx.

import Bergs from "./land/Bergs";
import BlueIce from "./land/BlueIce";
import Covenant from "./land/Covenant";
import Crevasse from "./land/Crevasse";
import Delta from "./land/Delta";
import Floes from "./land/Floes";
import Fountain from "./land/Fountain";
import FountainRise from "./land/FountainRise";
import GoogleRange from "./land/GoogleRange";
import Highway from "./land/Highway";
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
import Sastrugi from "./land/Sastrugi";
import SealColony from "./life/SealColony";
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
      <LabAnomalies />
      <SealColony />
    </>
  );
}
