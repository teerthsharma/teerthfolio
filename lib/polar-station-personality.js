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
      surface: "#CBDCD2",
      secondary: "#A9C9C4",
      accent: "#5CC9C2",
      glow: "#F2B96B",
      ink: "#232E52",
      signature: ["#F2D3A8", "#D7E6F5", "#A9C9C4", "#5CC9C2", "#93B4A6", "#F2B96B", "#232E52"],
      world: {
        colors: { base: "#C9D5D9", secondary: "#A9C9C4", accent: "#5CC9C2", glow: "#F2B96B", fog: "#3C5B60", ink: "#232E52" },
        shadow: "#33475E",
      },
    },
    lighting: { key: "#FFD9A3", fill: "#6FB0A9", rim: "#BFD8FF", rig: "low-antarctic-dawn" },
    environment: {
      personality: "cyan-white Antarctic frost sanctuary",
      fieldFamily: "sastrugi-melt-ribbon",
      backgroundFamily: "antarctic-frost-snow-ice",
      backgroundColors: ["#22354F", "#5A93A8"],
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
      color: "#9FE4E0",
      semanticLanguage: "frost-memory motes settle onto the observatory shell",
    },
    halo: { form: "double-compass-crown", colors: ["#5CC9C2", "#F2B96B"], motion: "polar-breath", tiltDegrees: 90, pulseHz: 0.36 },
    interaction: { family: "collision-wayfinder", response: "shell recoil reveals the observatory threshold" },
  },
  "s2-kernel-core": {
    palette: {
      surface: "#7FB9DE",
      secondary: "#B7D6EC",
      accent: "#5573E0",
      glow: "#A5E9FF",
      ink: "#232E52",
      signature: ["#B7D6EC", "#7FB9DE", "#6FA8C9", "#5573E0", "#A5E9FF", "#232E52"],
      world: {
        colors: { base: "#B4C7D4", secondary: "#8CA6BB", accent: "#5573E0", glow: "#A5E9FF", fog: "#364F5E", ink: "#232E52" },
        shadow: "#3A5570",
      },
    },
    lighting: { key: "#C9E2F8", fill: "#7FA0C8", rim: "#A5E9FF", rig: "cryogenic-diagnostic" },
    environment: {
      personality: "clean-room cryogenic science",
      fieldFamily: "voronoi-pressure-ridge-parhelion",
      backgroundFamily: "cern-cryogenic-clean-room",
      backgroundColors: ["#1E3252", "#5573E0"],
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
    halo: { form: "penning-orbit", colors: ["#5573E0", "#36D8FF"], motion: "state-lock-precession", tiltDegrees: 12, pulseHz: 0.30 },
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
        colors: { base: "#274F73", secondary: "#31658A", accent: "#4A82AE", glow: "#FFD05A", fog: "#2C4A61", ink: "#FFF1B8" },
        shadow: "#102743",
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
    halo: { form: "votive-crown", colors: ["#FFD05A", "#0B2A56"], motion: "seed-orbit-breath", tiltDegrees: 74, pulseHz: 0.32 },
    interaction: { family: "primordial-filtration", response: "proximity parts shields and dock steadies the seed" },
  },
  "field-chamber-coils": {
    palette: {
      surface: "#EFC15C",
      secondary: "#F0D68F",
      accent: "#EE9440",
      glow: "#EE9440",
      ink: "#40312F",
      signature: ["#F5E3B0", "#EFC15C", "#F5C044", "#EE9440", "#7FA8C0", "#40312F"],
      world: {
        colors: { base: "#C2B394", secondary: "#A6987C", accent: "#F5C044", glow: "#EE9440", fog: "#4E4A3E", ink: "#40312F" },
        shadow: "#4E6883",
      },
    },
    lighting: { key: "#FFD9A3", fill: "#7FA0C8", rim: "#F2A85C", rig: "thermal-forge-rim" },
    environment: {
      personality: "graphite thermal plasma forge",
      fieldFamily: "salt-pan-field-lines",
      backgroundFamily: "graphite-thermal-plasma-heat-haze",
      backgroundColors: ["#2B2E3C", "#EE9440"],
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
    halo: { form: "plasma-flux-ring", colors: ["#F5C044", "#EE9440"], motion: "resonant-heat-pulse", tiltDegrees: 90, pulseHz: 0.8 },
    interaction: { family: "signed-current-induction", response: "approach current compresses opposed helices" },
  },
  "qpu-ice-bridge": {
    palette: {
      surface: "#8FCDB2",
      secondary: "#BCE4D4",
      accent: "#55CE85",
      glow: "#36D8FF",
      ink: "#24443F",
      signature: ["#BCE4D4", "#8FCDB2", "#55CE85", "#36D8FF", "#6FA8C9", "#24443F"],
      world: {
        colors: { base: "#9FBFB0", secondary: "#84A797", accent: "#55CE85", glow: "#36D8FF", fog: "#33524C", ink: "#24443F" },
        shadow: "#35544E",
      },
    },
    lighting: { key: "#CFEBDD", fill: "#36D8FF", rim: "#A8EBCB", rig: "coherence-interference" },
    environment: {
      personality: "alien jade-cyan interference field",
      fieldFamily: "sea-ice-lead-interference",
      backgroundFamily: "alien-jade-cyan-interference",
      backgroundColors: ["#2A6B4C", "#36D8FF"],
      objectFamily: "lead-frazil",
    },
    monument: {
      family: "paired-coherence-sanctums",
      materialFamily: "deep-jade-cyan-ice",
      motionFamily: "quantized-span-verification",
    },
    particles: {
      family: "quantized-interference-motes",
      color: "#6FE7C8",
      semanticLanguage: "coherence packets verify the bridge between paired sanctums",
    },
    halo: { form: "phase-split-loop", colors: ["#55CE85", "#36D8FF"], motion: "coherence-phase-slip", tiltDegrees: 61, pulseHz: 0.42 },
    interaction: { family: "qubit-span-traversal", response: "route progress raises a coherent bridge" },
  },
  "upstream-radio-mast": {
    palette: {
      surface: "#E08A87",
      secondary: "#E5B9AC",
      accent: "#55CE85",
      glow: "#55CE85",
      ink: "#3F3547",
      signature: ["#E5B9AC", "#E08A87", "#E8705E", "#55CE85", "#6FB0A9", "#3F3547"],
      world: {
        colors: { base: "#B3A49E", secondary: "#9A8781", accent: "#E8705E", glow: "#55CE85", fog: "#3E4E49", ink: "#3F3547" },
        shadow: "#435C66",
      },
    },
    lighting: { key: "#FFCDB8", fill: "#6FB0A9", rim: "#F5A9A4", rig: "radio-harbor-beacon" },
    environment: {
      personality: "coral radio-signal uplink",
      fieldFamily: "aurora-signal-ridge",
      backgroundFamily: "coral-radio-propagation",
      backgroundColors: ["#8A4438", "#6FB0A9"],
      objectFamily: "katabatic-radio-plumes",
    },
    monument: {
      // CO_06 relays upstream signals, so its lamps carry a real keystream: a
      // 32-bit maximal-length LFSR (x^32 + x^22 + x^2 + x + 1, period 2^32-1)
      // seeded by SHA-256 of the upstream repository names it actually relays.
      family: "lfsr-keystream-signal-harbor",
      materialFamily: "coral-anodized-mint-lfsr-keystream-emitter",
      motionFamily: "gimballed-bearing-scan",
    },
    particles: {
      family: "coral-signal-pulses",
      color: "#FF8E81",
      semanticLanguage: "source pulses leave the signal harbor on a directional bearing",
    },
    halo: { form: "broadcast-bearing-arc", colors: ["#E8705E", "#55CE85"], motion: "directional-scan", tiltDegrees: 24, pulseHz: 0.8 },
    interaction: { family: "live-signal-sweep", response: "bearing alignment opens the receive lane" },
  },
  "topology-archive-wall": {
    palette: {
      surface: "#C9A3BF",
      secondary: "#E3C6D6",
      accent: "#E25AA0",
      glow: "#8D69D6",
      ink: "#453043",
      signature: ["#E3C6D6", "#C9A3BF", "#E25AA0", "#8D69D6", "#7FB3AF", "#453043"],
      world: {
        colors: { base: "#B0A2AB", secondary: "#948890", accent: "#E25AA0", glow: "#8D69D6", fog: "#474153", ink: "#453043" },
        shadow: "#453D5E",
      },
    },
    lighting: { key: "#F3D6E2", fill: "#7FB3AF", rim: "#E25AA0", rig: "relational-canyon-trace" },
    environment: {
      personality: "magenta archive canyon",
      fieldFamily: "strata-barcode-cliff",
      backgroundFamily: "magenta-archive-canyon",
      backgroundColors: ["#6E2A4E", "#8D69D6"],
      objectFamily: "laminar-strata-drift",
    },
    monument: {
      // CO_07 is the archive of the public corpus, so its masonry IS the
      // content address of what it stores: SHA-256 Merkle courses over the
      // archived corpus, one course per tree level, and the root capstone is
      // the archive address.
      family: "sha256-merkle-archive-courses",
      materialFamily: "magenta-slab-cyan-trace-over-sha256-merkle-courses",
      motionFamily: "indexed-strata-aperture",
    },
    particles: {
      family: "laminar-archive-strata",
      color: "#EE8EDB",
      semanticLanguage: "relational trace points reconnect across the archive canyon",
    },
    halo: { form: "indexed-aperture", colors: ["#E25AA0", "#7FC4B8"], motion: "strata-step-breath", tiltDegrees: 61, pulseHz: 0.28 },
    interaction: { family: "category-refile", response: "source traces lift strata and open the archive" },
  },
  "assembly-tool-locker": {
    palette: {
      surface: "#2A1B4A",
      secondary: "#151024",
      accent: "#6D4BE8",
      glow: "#F2B96B",
      ink: "#F2ECFF",
      signature: ["#080713", "#151024", "#2A1B4A", "#6D4BE8", "#A78BFA", "#F2B96B", "#F2ECFF"],
      world: {
        colors: { base: "#151024", secondary: "#2A1B4A", accent: "#6D4BE8", glow: "#F2B96B", fog: "#241B3F", ink: "#F2ECFF" },
        shadow: "#080713",
      },
    },
    // Fill was #6D4BE8, the identity violet — the same hue as the key. That left
    // the machine shop as the only station of the eight with no cool light
    // anywhere in key/fill/rim, so every surface in it was violet by
    // illumination no matter what its albedo said, and darkening the albedo only
    // raised the apparent saturation (measured 0.388 -> 0.506 over the body).
    // The four northeast stations that read correctly all carry one cool light
    // against a warm one; manifold-reactor does exactly this with a #2D6FA3
    // fill under a warm key. The identity violet keeps its real home in
    // palette.accent, which paints the seam and indicator lights.
    // Key was #A78BFA at saturation 0.93. This one hex does two jobs — it is the
    // shop's key light AND, as palette.highlight, the tint target its wall
    // cladding lerps toward — so its saturation lands on the body twice over.
    // With the value ladder restored the walls measured saturation 0.494 with
    // 77% of body pixels above 0.35, the most saturated building in the world,
    // against 0.415/63% for manifold-reactor which carries a strong blue and
    // reads correctly. Hue and luma are held (258 deg, luma 0.60 -> 0.63);
    // only saturation moves, to 0.32. Nothing here touches the northeast family:
    // its three claddings are deliberately locked to each other at equal
    // saturation and luma, and this file's change is scoped to this station.
    lighting: { key: "#A99AD0", fill: "#3E6FA8", rim: "#F2B96B", rig: "archaeology-worklight" },
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
    halo: { form: "etched-tool-sigil", colors: ["#6D4BE8", "#F2B96B"], motion: "assembly-proof-step", tiltDegrees: -9, pulseHz: 0.32 },
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
