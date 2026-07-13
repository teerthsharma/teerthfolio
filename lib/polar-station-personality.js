/**
 * Canonical identity authority for the eight dockable polar micro-worlds.
 *
 * Simulation modules may add numeric controls, but authored color, environment,
 * monument, particle, halo, and interaction identity starts here.
 */

export const STATION_PERSONALITY_ORDER = Object.freeze([
  "observatory-plaque",
  "s2-kernel-core",
  "manifold-reactor",
  "field-chamber-coils",
  "qpu-ice-bridge",
  "upstream-radio-mast",
  "topology-archive-wall",
  "assembly-tool-locker",
]);

export function deepFreezeStationPersonality(value) {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreezeStationPersonality(child);
  return Object.isFrozen(value) ? value : Object.freeze(value);
}

export const STATION_PERSONALITY_PROFILES = deepFreezeStationPersonality({
  "observatory-plaque": {
    palette: {
      surface: "#F4F8ED",
      secondary: "#D7EFE8",
      accent: "#65C1BC",
      glow: "#F2C98B",
      ink: "#33406E",
      signature: ["#F6F1E7", "#EDF6F9", "#D7EFE8", "#65C1BC", "#B9D8B1", "#F2C98B", "#33406E"],
      world: {
        colors: { base: "#F6F1E7", secondary: "#D7EFE8", accent: "#65C1BC", glow: "#F2C98B", fog: "#B8E2DF", ink: "#33406E" },
        shadow: "#A6D7E4",
      },
    },
    lighting: { key: "#F6F1E7", fill: "#A7E5DF", rim: "#8FD0E0", rig: "low-antarctic-dawn" },
    environment: {
      personality: "cyan-white Antarctic frost sanctuary",
      fieldFamily: "sastrugi-melt-ribbon",
      backgroundFamily: "antarctic-frost-snow-ice",
      backgroundColors: ["#F7FFFF", "#8FD0E0"],
      objectFamily: "sparse-snow",
      forbiddenClimate: "warm-wash",
    },
    monument: {
      family: "crystalline-articulated-observatory",
      materialFamily: "frosted-crystal-ivory-brass",
      motionFamily: "hinged-igloo-aperture",
    },
    particles: {
      family: "ice-crystal-snow",
      color: "#C5F2F0",
      semanticLanguage: "frost-memory motes settle onto the observatory shell",
    },
    halo: { form: "double-compass-crown", colors: ["#65C1BC", "#F2C98B"], motion: "polar-breath", tiltDegrees: 90, pulseHz: 0.28 },
    interaction: { family: "collision-wayfinder", response: "shell recoil reveals the observatory threshold" },
  },
  "s2-kernel-core": {
    palette: {
      surface: "#A6DFF4",
      secondary: "#E2F5FF",
      accent: "#3E5BC7",
      glow: "#B9F5FF",
      ink: "#33406E",
      signature: ["#E2F5FF", "#A6DFF4", "#8FD0E0", "#3E5BC7", "#B9F5FF", "#33406E"],
      world: {
        colors: { base: "#F0F5F4", secondary: "#D4E4E7", accent: "#3E5BC7", glow: "#B9F5FF", fog: "#D9E7E6", ink: "#33406E" },
        shadow: "#91BED4",
      },
    },
    lighting: { key: "#E2F5FF", fill: "#8FD0E0", rim: "#B9F5FF", rig: "cryogenic-diagnostic" },
    environment: {
      personality: "clean-room cryogenic science",
      fieldFamily: "voronoi-pressure-ridge-parhelion",
      backgroundFamily: "cern-cryogenic-clean-room",
      backgroundColors: ["#EAFBFF", "#3E5BC7"],
      objectFamily: "pressure-frost-plates",
    },
    monument: {
      family: "cern-penning-trap-containment",
      materialFamily: "cobalt-cryostat-superconductor",
      motionFamily: "precessing-state-lock",
    },
    particles: {
      family: "sterile-pressure-prisms",
      color: "#55B7FF",
      semanticLanguage: "interrupted state sparks close inward around the kernel",
    },
    halo: { form: "penning-orbit", colors: ["#3E5BC7", "#36D8FF"], motion: "state-lock-precession", tiltDegrees: 12, pulseHz: 0.16 },
    interaction: { family: "trap-acquisition", response: "approach energizes coils and dock aligns diagnostics" },
  },
  "manifold-reactor": {
    palette: {
      surface: "#0B2A56",
      secondary: "#07152F",
      accent: "#2D6FA3",
      glow: "#FFD05A",
      ink: "#FFF1B8",
      signature: ["#020711", "#07152F", "#0B2A56", "#2D6FA3", "#FFD05A", "#FFF1B8"],
      world: {
        colors: { base: "#07152F", secondary: "#0B2A56", accent: "#2D6FA3", glow: "#FFD05A", fog: "#102B4B", ink: "#FFF1B8" },
        shadow: "#020711",
      },
    },
    lighting: { key: "#FFD05A", fill: "#2D6FA3", rim: "#FFF1B8", rig: "abyssal-votive-rays" },
    environment: {
      personality: "abyss-blue and living-gold primordial chapel",
      fieldFamily: "ribbon-cavern-isocontours",
      backgroundFamily: "abyss-blue-living-gold-aether",
      backgroundColors: ["#07152F", "#FFD05A"],
      objectFamily: "ribbon-vapor",
    },
    monument: {
      family: "primordial-seed-sanctuary",
      materialFamily: "obsidian-graphite-living-gold",
      motionFamily: "shield-parting-seed-persistence",
    },
    particles: {
      family: "aether-votive-motes",
      color: "#FFD05A",
      semanticLanguage: "golden motes orbit the single living first-energy atom and return to its seed",
    },
    halo: { form: "votive-crown", colors: ["#FFD05A", "#0B2A56"], motion: "seed-orbit-breath", tiltDegrees: 74, pulseHz: 0.22 },
    interaction: { family: "primordial-filtration", response: "proximity parts shields and dock steadies the seed" },
  },
  "field-chamber-coils": {
    palette: {
      surface: "#FFE37A",
      secondary: "#FFF2B2",
      accent: "#F29C46",
      glow: "#F29C46",
      ink: "#5A4A48",
      signature: ["#FFF6CE", "#FFE37A", "#F4C84E", "#F29C46", "#A6D7E4", "#5A4A48"],
      world: {
        colors: { base: "#F7F3E8", secondary: "#E9E1CE", accent: "#F4C84E", glow: "#F29C46", fog: "#E6E3D9", ink: "#5A4A48" },
        shadow: "#AACDD5",
      },
    },
    lighting: { key: "#FFF2B2", fill: "#A6D7E4", rim: "#F29C46", rig: "thermal-forge-rim" },
    environment: {
      personality: "graphite thermal plasma forge",
      fieldFamily: "salt-pan-field-lines",
      backgroundFamily: "graphite-thermal-plasma-heat-haze",
      backgroundColors: ["#454851", "#F29C46"],
      objectFamily: "katabatic-salt-dust",
      forbiddenClimate: "ice",
    },
    monument: {
      family: "coaxial-field-cage",
      materialFamily: "graphite-amber-plasma",
      motionFamily: "opposed-coil-compression",
    },
    particles: {
      family: "thermal-plasma-refraction",
      color: "#FFD970",
      semanticLanguage: "flux dust compresses into the contained field chamber",
    },
    halo: { form: "plasma-flux-ring", colors: ["#F4C84E", "#F29C46"], motion: "resonant-heat-pulse", tiltDegrees: 90, pulseHz: 0.8 },
    interaction: { family: "signed-current-induction", response: "approach current compresses opposed helices" },
  },
  "qpu-ice-bridge": {
    palette: {
      surface: "#BFF4D9",
      secondary: "#E4FFF2",
      accent: "#4BC076",
      glow: "#36D8FF",
      ink: "#345C57",
      signature: ["#E4FFF2", "#BFF4D9", "#4BC076", "#36D8FF", "#8FD0E0", "#345C57"],
      world: {
        colors: { base: "#EFF7F2", secondary: "#D5E8DF", accent: "#4BC076", glow: "#36D8FF", fog: "#D9E8E4", ink: "#345C57" },
        shadow: "#96CFC7",
      },
    },
    lighting: { key: "#E4FFF2", fill: "#36D8FF", rim: "#BFF4D9", rig: "coherence-interference" },
    environment: {
      personality: "alien jade-cyan interference field",
      fieldFamily: "sea-ice-lead-interference",
      backgroundFamily: "alien-jade-cyan-interference",
      backgroundColors: ["#4BC076", "#36D8FF"],
      objectFamily: "lead-frazil",
    },
    monument: {
      family: "paired-coherence-sanctums",
      materialFamily: "deep-jade-cyan-ice",
      motionFamily: "quantized-span-verification",
    },
    particles: {
      family: "quantized-interference-motes",
      color: "#78F2C4",
      semanticLanguage: "coherence packets verify the bridge between paired sanctums",
    },
    halo: { form: "phase-split-loop", colors: ["#4BC076", "#36D8FF"], motion: "coherence-phase-slip", tiltDegrees: 61, pulseHz: 0.42 },
    interaction: { family: "qubit-span-traversal", response: "route progress raises a coherent bridge" },
  },
  "upstream-radio-mast": {
    palette: {
      surface: "#FFB0AF",
      secondary: "#FFE0D7",
      accent: "#4BC076",
      glow: "#4BC076",
      ink: "#594C61",
      signature: ["#FFE0D7", "#FFB0AF", "#F47D69", "#4BC076", "#A7E5DF", "#594C61"],
      world: {
        colors: { base: "#F6EFEC", secondary: "#E9D8D6", accent: "#F47D69", glow: "#4BC076", fog: "#DCE6E1", ink: "#594C61" },
        shadow: "#A9C8CF",
      },
    },
    lighting: { key: "#FFE0D7", fill: "#A7E5DF", rim: "#FFB0AF", rig: "radio-harbor-beacon" },
    environment: {
      personality: "coral radio-signal uplink",
      fieldFamily: "aurora-signal-ridge",
      backgroundFamily: "coral-radio-propagation",
      backgroundColors: ["#F47D69", "#A7E5DF"],
      objectFamily: "katabatic-radio-plumes",
    },
    monument: {
      family: "directional-signal-harbor",
      materialFamily: "coral-anodized-mint-emitter",
      motionFamily: "gimballed-bearing-scan",
    },
    particles: {
      family: "coral-signal-pulses",
      color: "#FF8E81",
      semanticLanguage: "source pulses leave the signal harbor on a directional bearing",
    },
    halo: { form: "broadcast-bearing-arc", colors: ["#F47D69", "#4BC076"], motion: "directional-scan", tiltDegrees: 24, pulseHz: 0.8 },
    interaction: { family: "live-signal-sweep", response: "bearing alignment opens the receive lane" },
  },
  "topology-archive-wall": {
    palette: {
      surface: "#F2D4E8",
      secondary: "#FFF0F7",
      accent: "#D8478F",
      glow: "#8D69D6",
      ink: "#61445F",
      signature: ["#FFF0F7", "#F2D4E8", "#D8478F", "#8D69D6", "#B8E2DF", "#61445F"],
      world: {
        colors: { base: "#F7F1F4", secondary: "#E4DADF", accent: "#D8478F", glow: "#8D69D6", fog: "#E6E1E4", ink: "#61445F" },
        shadow: "#B6AAC9",
      },
    },
    lighting: { key: "#FFF0F7", fill: "#B8E2DF", rim: "#D8478F", rig: "relational-canyon-trace" },
    environment: {
      personality: "magenta archive canyon",
      fieldFamily: "strata-barcode-cliff",
      backgroundFamily: "magenta-archive-canyon",
      backgroundColors: ["#D8478F", "#8D69D6"],
      objectFamily: "laminar-strata-drift",
    },
    monument: {
      family: "relational-archive-canyon",
      materialFamily: "magenta-slab-cyan-trace",
      motionFamily: "indexed-strata-aperture",
    },
    particles: {
      family: "laminar-archive-strata",
      color: "#EE8EDB",
      semanticLanguage: "relational trace points reconnect across the archive canyon",
    },
    halo: { form: "indexed-aperture", colors: ["#D8478F", "#8FCFC4"], motion: "strata-step-breath", tiltDegrees: 61, pulseHz: 0.12 },
    interaction: { family: "category-refile", response: "source traces lift strata and open the archive" },
  },
  "assembly-tool-locker": {
    palette: {
      surface: "#2A1B4A",
      secondary: "#151024",
      accent: "#6D4BE8",
      glow: "#F2C98B",
      ink: "#F2ECFF",
      signature: ["#080713", "#151024", "#2A1B4A", "#6D4BE8", "#A78BFA", "#F2C98B", "#F2ECFF"],
      world: {
        colors: { base: "#151024", secondary: "#2A1B4A", accent: "#6D4BE8", glow: "#F2C98B", fog: "#241B3F", ink: "#F2ECFF" },
        shadow: "#080713",
      },
    },
    lighting: { key: "#A78BFA", fill: "#6D4BE8", rim: "#F2C98B", rig: "archaeology-worklight" },
    environment: {
      personality: "purple-lit basalt computational archaeology",
      fieldFamily: "runway-knurl-yard",
      backgroundFamily: "egyptian-basalt-ochre-computational-archaeology",
      backgroundColors: ["#151024", "#6D4BE8"],
      objectFamily: "runway-spindrift",
    },
    monument: {
      family: "computational-archaeology-gantry",
      materialFamily: "purple-basalt-metallic-gold",
      motionFamily: "indexed-tool-assembly-proof",
    },
    particles: {
      family: "ochre-glyph-dust",
      color: "#FFC17A",
      semanticLanguage: "inspection fragments settle into proof and tool mass",
    },
    halo: { form: "etched-tool-sigil", colors: ["#6D4BE8", "#F2C98B"], motion: "assembly-proof-step", tiltDegrees: -9, pulseHz: 0.32 },
    interaction: { family: "tool-proof-assembly", response: "indexed parts assemble and hold a proof state" },
  },
});

export function resolveStationHaloPresentation(stationId) {
  const resolvedStationId = STATION_PERSONALITY_PROFILES[stationId]
    ? stationId
    : STATION_PERSONALITY_ORDER[0];
  const halo = STATION_PERSONALITY_PROFILES[resolvedStationId].halo;
  return {
    stationId: resolvedStationId,
    base: halo.colors[0],
    edge: halo.colors[1],
    mix: resolvedStationId === "observatory-plaque" ? 0.34 : 0.26,
    tiltRadians: (halo.tiltDegrees * Math.PI) / 180,
    pulseHz: halo.pulseHz,
  };
}
