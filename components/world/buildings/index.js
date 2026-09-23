// Which component draws which place. Keys are place ids from
// lib/world/places.js; Scene.jsx positions each one at its place.
// Buildings (tier "building", 4-9 m) first, then landmarks (2-5 m).
import AetherReactor from "./AetherReactor";
import AssemblyWorkshop from "./AssemblyWorkshop";
import CausticLamps from "./CausticLamps";
import FieldCoils from "./FieldCoils";
import Home from "./Home";
import KernelVault from "./KernelVault";
import MonodromySpiral from "./MonodromySpiral";
import NerveKnot from "./NerveKnot";
import PulseRing from "./PulseRing";
import QuantumDerrick from "./QuantumDerrick";
import RadioMast from "./RadioMast";
import SeparatrixScales from "./SeparatrixScales";
import SigmoidDrum from "./SigmoidDrum";
import TanglePost from "./TanglePost";
import TopologyArchive from "./TopologyArchive";

export const BUILDINGS = {
  home: Home, // observatory igloo
  upstream: RadioMast, // radio mast, eleven lamps
  kernel: KernelVault, // Epsilon-Hollow: server hut on stilts, globe on the roof
  aether: AetherReactor, // Aether-Lang: generator hall, gold seed in a cage
  field: FieldCoils, // faraday: coil skid under a gantry
  qpu: QuantumDerrick, // resolvent: derrick, borehole, shack
  archive: TopologyArchive, // topological-ml-toolkit: cold store, barcode rack
  workshop: AssemblyWorkshop, // planimeter: quonset shop, tracing table

  emfield: PulseRing,
  nerve: NerveKnot,
  separatrix: SeparatrixScales,
  sigmoid: SigmoidDrum,
  caustic: CausticLamps,
  tangle: TanglePost,
  monodromy: MonodromySpiral,
};
