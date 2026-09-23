// Which component draws which building. Keys are place ids from
// lib/world/places.js; Scene.jsx positions each one at its place.
import AetherReactor from "./AetherReactor";
import AssemblyWorkshop from "./AssemblyWorkshop";
import FieldCoils from "./FieldCoils";
import Home from "./Home";
import KernelVault from "./KernelVault";
import Lighthouse from "./Lighthouse";
import QuantumDerrick from "./QuantumDerrick";
import TopologyArchive from "./TopologyArchive";

export const BUILDINGS = {
  home: Home,
  upstream: Lighthouse,
  kernel: KernelVault,
  aether: AetherReactor,
  field: FieldCoils,
  qpu: QuantumDerrick,
  archive: TopologyArchive,
  workshop: AssemblyWorkshop,
};
