import {
  STATION_PERSONALITY_ORDER,
  STATION_PERSONALITY_PROFILES,
} from "./polar-station-personality.js";

export const POLAR_PALETTE = Object.freeze({
  polarIvory: "#F6F1E7",
  glacierWhite: "#EDF6F9",
  abetoTeal: "#65C1BC",
  dawnCyan: "#8FD0E0",
  skyMint: "#A7E5DF",
  horizonBlue: "#78C9D2",
  horizonIndigo: "#33406E",
  animeInk: "#34384F",
  animeShadow: "#71839B",
  emberAmber: "#E2B86A",
  evidenceMagenta: "#D8478F",
  kelpChartreuse: "#C4D64B",
  signalCobalt: "#3E5BC7",
  aetherViolet: "#8D69D6",
  fieldYellow: "#F4C84E",
  qpuMint: "#4BC076",
  upstreamCoral: "#F47D69",
  fog: "#B8E2DF",
});

export const OBSERVATORY_DOME_DEPARTURE_DISTANCE = 7.2;

export function shouldRenderObservatoryDome({
  destinationStationId,
  distanceFromHome,
}) {
  return (
    destinationStationId === "observatory-plaque" ||
    (Number.isFinite(distanceFromHome) &&
      distanceFromHome <= OBSERVATORY_DOME_DEPARTURE_DISTANCE)
  );
}

/** Continuous world-space dome fields; kept separate from station identity colors. */
export const DOME_XZ_COLOR_ZONES = Object.freeze({
  frost: "#EDF6F9",
  cream: "#F6F1E7",
  teal: "#65C1BC",
  sage: "#B9D8B1",
  warm: "#F2C98B",
});

/** Shared value-noise primitive for world-XZ material fields. Keep fragment use to the policy budget. */
export const POLAR_XZ_NOISE_GLSL = `
float polarXZHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float polarXZNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = polarXZHash(i);
  float b = polarXZHash(i + vec2(1.0, 0.0));
  float c = polarXZHash(i + vec2(0.0, 1.0));
  float d = polarXZHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}`;

const POLAR_XZ_QUALITY = Object.freeze({
  low: Object.freeze({ derivativeNormals: false, fragmentNoiseSamples: 0, vertexDisplacement: 0 }),
  medium: Object.freeze({ derivativeNormals: true, fragmentNoiseSamples: 2, vertexDisplacement: 0.012 }),
  high: Object.freeze({ derivativeNormals: true, fragmentNoiseSamples: 2, vertexDisplacement: 0.02 }),
});

/**
 * Reusable contract for domes, stations, pillars, and terrain props.
 * Consumers supply their own palette values and lobe centers while sharing the GPU budget.
 */
export const POLAR_XZ_SHADER_POLICY = Object.freeze({
  coordinateSpace: "world-xz",
  derivativeNormals: true,
  fragmentNoiseSamples: 2,
  macroGain: 0.35,
  macroLacunarity: 2,
  macroOctaves: 4,
  paletteUniforms: Object.freeze({
    frost: "uZoneFrostColor",
    cream: "uZoneCreamColor",
    teal: "uZoneTealColor",
    sage: "uZoneSageColor",
    warm: "uZoneWarmColor",
  }),
  quality: POLAR_XZ_QUALITY,
});

/**
 * Eight authored identities feeding one branch-free station shader. Angles are degrees in world XZ;
 * silhouette names document the physical form that the corresponding uniform response reinforces.
 */
export const STATION_SHADER_PROFILES = Object.freeze({
  "observatory-plaque": Object.freeze({
    surface: "#F4F8ED",
    secondary: "#D7EFE8",
    accent: "#65C1BC",
    ink: "#33406E",
    angle: 12,
    macroScale: 0.66,
    microScale: 8.8,
    stripeScale: 4.3,
    zoneBias: -0.08,
    displacement: 0.12,
    rimPower: 3.8,
    rimStrength: 0.18,
    toonSteps: 4,
    silhouette: "beveled-wayfinder-slab",
  }),
  "s2-kernel-core": Object.freeze({
    surface: "#A6DFF4",
    secondary: "#E2F5FF",
    accent: "#3E5BC7",
    ink: "#33406E",
    angle: 38,
    macroScale: 0.9,
    microScale: 11.2,
    stripeScale: 6.4,
    zoneBias: 0.08,
    displacement: 0.56,
    rimPower: 2.2,
    rimStrength: 0.38,
    toonSteps: 3,
    silhouette: "closed-s2-glacial-orb",
  }),
  "manifold-reactor": Object.freeze({
    surface: "#D9C2FF",
    secondary: "#F0E7FF",
    accent: "#8D69D6",
    ink: "#4B4574",
    angle: -27,
    macroScale: 0.76,
    microScale: 12.6,
    stripeScale: 7.7,
    zoneBias: 0.14,
    displacement: 0.36,
    rimPower: 2.8,
    rimStrength: 0.32,
    toonSteps: 4,
    silhouette: "nested-nerve-torus",
  }),
  "field-chamber-coils": Object.freeze({
    surface: "#FFE37A",
    secondary: "#FFF2B2",
    accent: "#F29C46",
    ink: "#5A4A48",
    angle: 74,
    macroScale: 1.05,
    microScale: 13.8,
    stripeScale: 9.2,
    zoneBias: 0.03,
    displacement: 0.24,
    rimPower: 4.2,
    rimStrength: 0.24,
    toonSteps: 3,
    silhouette: "coaxial-field-cage",
  }),
  "qpu-ice-bridge": Object.freeze({
    surface: "#BFF4D9",
    secondary: "#E4FFF2",
    accent: "#4BC076",
    ink: "#345C57",
    angle: -48,
    macroScale: 0.62,
    microScale: 9.7,
    stripeScale: 5.8,
    zoneBias: 0.12,
    displacement: 0.18,
    rimPower: 3.4,
    rimStrength: 0.28,
    toonSteps: 4,
    silhouette: "staggered-qubit-bridge",
  }),
  "upstream-radio-mast": Object.freeze({
    surface: "#FFB0AF",
    secondary: "#FFE0D7",
    accent: "#4BC076",
    ink: "#594C61",
    angle: 19,
    macroScale: 0.86,
    microScale: 14.4,
    stripeScale: 8.4,
    zoneBias: -0.1,
    displacement: 0.3,
    rimPower: 2.5,
    rimStrength: 0.34,
    toonSteps: 3,
    silhouette: "asymmetric-signal-spire",
  }),
  "topology-archive-wall": Object.freeze({
    surface: "#F2D4E8",
    secondary: "#FFF0F7",
    accent: "#D8478F",
    ink: "#61445F",
    angle: 61,
    macroScale: 0.7,
    microScale: 15.2,
    stripeScale: 10.1,
    zoneBias: 0.05,
    displacement: 0.14,
    rimPower: 4.5,
    rimStrength: 0.23,
    toonSteps: 5,
    silhouette: "layered-barcode-wall",
  }),
  "assembly-tool-locker": Object.freeze({
    surface: "#DDE4E9",
    secondary: "#F3F6F8",
    accent: "#73809E",
    ink: "#3F465C",
    angle: -9,
    macroScale: 0.96,
    microScale: 16.1,
    stripeScale: 11.4,
    zoneBias: -0.04,
    displacement: 0.1,
    rimPower: 3.1,
    rimStrength: 0.2,
    toonSteps: 4,
    silhouette: "vented-tool-monolith",
  }),
});

/** Two compiled programs cover all stations; identity lives entirely in uniforms. */
export const STATION_SHADER_FAMILY_POLICY = Object.freeze({
  coordinateSpace: POLAR_XZ_SHADER_POLICY.coordinateSpace,
  compiledVariants: Object.freeze(["low", "full"]),
  maxCompiledVariants: 2,
  stationIdBranches: 0,
  additionalDrawCalls: 0,
  qualityMapping: Object.freeze({ low: "low", medium: "full", high: "full" }),
  low: Object.freeze({
    textures: 0,
    vertexNoiseSamples: 0,
    fragmentNoiseSamples: 0,
    vertexDisplacement: 0,
    derivativeNormals: false,
  }),
  full: Object.freeze({
    textures: 0,
    vertexNoiseSamples: 1,
    fragmentNoiseSamples: POLAR_XZ_SHADER_POLICY.fragmentNoiseSamples,
    derivativeNormals: POLAR_XZ_SHADER_POLICY.derivativeNormals,
  }),
});

export const STATION_PALETTE = Object.freeze(Object.fromEntries(
  STATION_PERSONALITY_ORDER.map((stationId) => {
    const { surface, accent } = STATION_PERSONALITY_PROFILES[stationId].palette;
    return [stationId, Object.freeze({ surface, accent })];
  }),
));

export const CAMERA_COMPOSITION = Object.freeze({
  desktopFov: 39,
  portraitFov: 46,
  restHeight: 1.48,
  positionDamping: 5.5,
  lookDamping: 7,
});

export const MOTION_TIMINGS = Object.freeze({
  worldRevealMs: 500,
  stationRevealMs: 200,
  stationStaggerMs: 120,
  probingPulseMs: 900,
  idleBreathMs: 2400,
  blinkMs: 120,
  dockingNodMs: 300,
  waddleHz: 2.2,
  waddleDegrees: 6,
});

export const WORLD_STREAM_TIMINGS = Object.freeze({
  silhouetteRevealMs: 180,
  terrainRevealMs: 300,
  domeRevealMs: MOTION_TIMINGS.worldRevealMs,
  stationStartMs: 200,
  stationRevealMs: MOTION_TIMINGS.stationRevealMs,
  stationStaggerMs: MOTION_TIMINGS.stationStaggerMs,
  easing: "cubic-bezier(0.33, 0, 0.2, 1)",
});

function cubicBezierCoordinate(t, firstControl, secondControl) {
  const inverse = 1 - t;
  return (
    3 * inverse * inverse * t * firstControl +
    3 * inverse * t * t * secondControl +
    t * t * t
  );
}

/** Resolve cubic-bezier(0.33, 0, 0.2, 1) without allocating during a render frame. */
export function easeWorldStream(progress) {
  const target = Math.min(1, Math.max(0, progress));
  if (target === 0 || target === 1) return target;
  let lower = 0;
  let upper = 1;
  let parameter = target;

  for (let iteration = 0; iteration < 7; iteration += 1) {
    const sampledX = cubicBezierCoordinate(parameter, 0.33, 0.2);
    if (sampledX < target) lower = parameter;
    else upper = parameter;
    parameter = (lower + upper) * 0.5;
  }

  return cubicBezierCoordinate(parameter, 0, 1);
}

export const POST_PROCESS_BUDGET = Object.freeze({
  low: Object.freeze({
    scale: 0.82,
    fisheye: 0,
    chroma: 0,
    ink: 0.08,
    scanline: 0,
    pixel: 1,
    quantize: 0.12,
    gradeBase: 0.04,
    gradeCurve: 0.9,
    shadowSeparation: 0.24,
  }),
  medium: Object.freeze({
    scale: 0.94,
    fisheye: 0.003,
    chroma: 0.55,
    ink: 0.14,
    scanline: 0.004,
    pixel: 1.7,
    quantize: 0.18,
    gradeBase: 0.49,
    gradeCurve: 0.4,
    shadowSeparation: 0,
  }),
  high: Object.freeze({
    scale: 1,
    fisheye: 0.005,
    chroma: 0.8,
    ink: 0.18,
    scanline: 0.007,
    pixel: 2.2,
    quantize: 0.24,
    gradeBase: 0.52,
    gradeCurve: 0.4,
    shadowSeparation: 0,
  }),
});
