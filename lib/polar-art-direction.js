import {
  STATION_PERSONALITY_ORDER,
  STATION_PERSONALITY_PROFILES,
} from "./polar-station-personality.js";

export const POLAR_PALETTE = Object.freeze({
  polarIvory: "#F2D3A8",
  glacierWhite: "#D7E6F5",
  abetoTeal: "#57C7BE",
  dawnCyan: "#7FB9DE",
  skyMint: "#93DFD4",
  horizonBlue: "#6FB4C9",
  horizonIndigo: "#232E52",
  animeInk: "#1C2135",
  animeShadow: "#4C5C7E",
  emberAmber: "#F2B96B",
  evidenceMagenta: "#E25AA0",
  kelpChartreuse: "#BBD348",
  signalCobalt: "#5573E0",
  aetherViolet: "#8D69D6",
  fieldYellow: "#F5C044",
  qpuMint: "#55CE85",
  upstreamCoral: "#E8705E",
  fog: "#697CA6",
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
  frost: "#C6D9EE",
  cream: "#E7D9BE",
  teal: "#6FA9B5",
  sage: "#94B3A4",
  warm: "#EFB27C",
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

/**
 * DIRECTIONAL RELIEF, shared by all three station shader families.
 *
 * A building reads as a solid rather than as construction paper when its
 * horizontal faces do not agree with its vertical ones: a deck, roof cap, or
 * hull segment catches the sky, and the soffit under it is occluded by the mass
 * it hangs off. The failure this replaces is the same one the dome had — a
 * treatment applied with equal strength to every face is an OUTLINE, not relief,
 * and a fill keyed to `abs(n)` or to `max(0, n.y)` alone gives the top a lift
 * while leaving the underside indistinguishable from a wall. Thickness comes
 * from the ASYMMETRY, not from the magnitude.
 *
 * Two properties matter and both were learned by capture, not by reasoning:
 *
 * 1. World space, not view space. `normal` inside a three.js fragment shader is
 *    VIEW space (set by <normal_fragment_begin>), so a sky term written against
 *    `normal.y` is keyed to screen-up and rotates with the camera — a roof and
 *    the wall beneath it take the same fill the moment the camera tilts, which
 *    is precisely the "one flat value per building" read. `viewMatrix` is
 *    orthonormal, so left-multiplying the row vector inverts it: one mat-vec and
 *    a normalize, no extra varying, no extra program, no per-station branch.
 * 2. A confined ramp, not a linear one. `n.y` used raw airbrushes a soft
 *    gradient across every surface and every curve, which reads as haze. The
 *    smoothstep leaves genuine walls in the untouched middle so the result is a
 *    three-step ladder — soffit, wall, deck — and a ladder is what relief is.
 *    (The dome's first attempt used a wide ramp and lit the side edges too;
 *    every panel became a framed picture tile, a different wrong but no better.)
 *
 * The third term is azimuthal, and it is the half the soffit alone does not
 * reach. A hemispheric fill is identical on every vertical face, so a building's
 * long wall and its end wall render at one value and the corner between them
 * stops existing — which is why the first capture of this pass gained a lit roof
 * and still read as a flat box. `stationWallTurn` is one dot product against a
 * fill azimuth held ninety degrees off the key (the station key is
 * normalize(-0.42, 0.84, 0.34); its XZ heading rotated a quarter turn is
 * (0.629, 0.777)). Ninety degrees rather than opposite on purpose: an opposing
 * fill re-lights exactly the faces the key left dark and flattens the pair back
 * into one value, and it would also deepen nothing — while a fill AGREEING with
 * the key would crush the shaded side, and the station bases already measure p5
 * 0.008-0.013, i.e. the one percentile with no detail left to lose. Off-axis
 * gives three wall values (key, fill, shade) and adds light only where there
 * was none.
 *
 * Declares `stationDeckLight`, `stationSoffitShade` and `stationWallTurn` in
 * 0..1. Each family supplies its own lift, because each has a different amount
 * of ambient fill to lift against; the occlusion constant below is shared so one
 * soffit means one thing camp-wide.
 */
export const STATION_DIRECTIONAL_RELIEF_GLSL = `
vec3 stationReliefWorldNormal = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
float stationDeckLight = smoothstep(0.20, 0.64, stationReliefWorldNormal.y);
float stationSoffitShade = smoothstep(0.20, 0.64, -stationReliefWorldNormal.y);
float stationWallTurn = clamp(dot(stationReliefWorldNormal.xz, vec2(0.629, 0.777)), 0.0, 1.0);`;

/** One soffit value camp-wide. Multiplies indirect diffuse on downward faces. */
export const STATION_RELIEF_SOFFIT_OCCLUSION = 0.34;

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
    surface: "#CBDCD2",
    secondary: "#A9C9C4",
    accent: "#5CC9C2",
    ink: "#232E52",
    angle: 12,
    macroScale: 0.66,
    microScale: 8.8,
    stripeScale: 4.3,
    zoneBias: -0.08,
    displacement: 0.12,
    rimPower: 3.8,
    rimStrength: 0.28,
    toonSteps: 4,
    silhouette: "beveled-wayfinder-slab",
  }),
  "s2-kernel-core": Object.freeze({
    surface: "#7FB9DE",
    secondary: "#B7D6EC",
    accent: "#5573E0",
    ink: "#232E52",
    angle: 38,
    macroScale: 0.9,
    microScale: 11.2,
    stripeScale: 6.4,
    zoneBias: 0.08,
    displacement: 0.56,
    rimPower: 2.2,
    rimStrength: 0.48,
    toonSteps: 3,
    silhouette: "closed-s2-glacial-orb",
  }),
  "manifold-reactor": Object.freeze({
    surface: "#A78BE0",
    secondary: "#C9BCE8",
    accent: "#8D69D6",
    ink: "#362F5C",
    angle: -27,
    macroScale: 0.76,
    microScale: 12.6,
    stripeScale: 7.7,
    zoneBias: 0.14,
    displacement: 0.36,
    rimPower: 2.8,
    rimStrength: 0.42,
    toonSteps: 4,
    silhouette: "nested-nerve-torus",
  }),
  "field-chamber-coils": Object.freeze({
    surface: "#EFC15C",
    secondary: "#F0D68F",
    accent: "#EE9440",
    ink: "#40312F",
    angle: 74,
    macroScale: 1.05,
    microScale: 13.8,
    stripeScale: 9.2,
    zoneBias: 0.03,
    displacement: 0.24,
    rimPower: 4.2,
    rimStrength: 0.34,
    toonSteps: 3,
    silhouette: "coaxial-field-cage",
  }),
  "qpu-ice-bridge": Object.freeze({
    surface: "#8FCDB2",
    secondary: "#BCE4D4",
    accent: "#55CE85",
    ink: "#24443F",
    angle: -48,
    macroScale: 0.62,
    microScale: 9.7,
    stripeScale: 5.8,
    zoneBias: 0.12,
    displacement: 0.18,
    rimPower: 3.4,
    rimStrength: 0.38,
    toonSteps: 4,
    silhouette: "staggered-qubit-bridge",
  }),
  "upstream-radio-mast": Object.freeze({
    surface: "#E08A87",
    secondary: "#E5B9AC",
    accent: "#55CE85",
    ink: "#3F3547",
    angle: 19,
    macroScale: 0.86,
    microScale: 14.4,
    stripeScale: 8.4,
    zoneBias: -0.1,
    displacement: 0.3,
    rimPower: 2.5,
    rimStrength: 0.44,
    toonSteps: 3,
    silhouette: "asymmetric-signal-spire",
  }),
  "topology-archive-wall": Object.freeze({
    surface: "#C9A3BF",
    secondary: "#E3C6D6",
    accent: "#E25AA0",
    ink: "#453043",
    angle: 61,
    macroScale: 0.7,
    microScale: 15.2,
    stripeScale: 10.1,
    zoneBias: 0.05,
    displacement: 0.14,
    rimPower: 4.5,
    rimStrength: 0.33,
    toonSteps: 5,
    silhouette: "layered-barcode-wall",
  }),
  "assembly-tool-locker": Object.freeze({
    surface: "#AEBBC9",
    secondary: "#CBD6DF",
    accent: "#8695BC",
    ink: "#2B3245",
    angle: -9,
    macroScale: 0.96,
    microScale: 16.1,
    stripeScale: 11.4,
    zoneBias: -0.04,
    displacement: 0.1,
    rimPower: 3.1,
    rimStrength: 0.3,
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
  // SHADER LAW 3: low is a tier desktop visitors see, so it gets the same
  // whisper as medium. Its camera-space stylisation was authored on the premise
  // stated in LAW 1 below — that low was a fallback hiding a 0.82 render scale
  // on weak hardware, and that medium and high were what people actually got.
  // The measured quality ladder ended that: it steps down to low on any machine
  // that cannot hold 60fps at high, which is most of them. A heavier ink and a
  // 3x quantize made the world read as a cel-shaded diagram rather than a
  // photographed place, and it read that way to the majority.
  //
  // Only the ink and the quantize move, to medium's values. scale stays at 0.82
  // — that is the actual frame-rate lever and the reason low exists — and so do
  // the paper grade and shadow toe that compensate for it.
  // Measured paired, four matched frames per arm at the home dock, comparing the
  // same animation phase with the filter on and off — the only way this can be
  // measured, because the aurora and drift move mean gradient by more than the
  // filter does. Unpaired captures of the same build read 5.30 and 5.89, an 11%
  // swing that swamps the effect and once made it look like +13%.
  //
  //   medium   +3.2% mean gradient   deltas +0.14 +0.20 +0.18 +0.17
  //   low      +3.8% mean gradient   deltas +0.22 +0.23 +0.22 +0.22
  //
  // Clipping is clean: no highlight clipping at either tier, 0.042% shadow
  // clipping at low, both measured on the treatment frame alone and so not
  // subject to any pairing.
  //
  // Re-measured with the world's clock stopped (qa-freeze), which makes the
  // per-pixel comparison exact instead of an upper bound. The null control is
  // what licenses that reading: capturing the same build twice under the freeze
  // gives a paired delta of 0.000 with sd 0.000 and 0.00% overshoot at medium,
  // so anything non-zero afterwards belongs to the change.
  //
  //   medium   +5.7%   delta +0.301 on all four pairs   sd 0.000   ringing 0.07%
  //   low      +7.2%   delta +0.402 on all four pairs   sd 0.001   ringing 0.08%
  //
  // Neither tier clips highlights; low clips 0.047% of shadows. Low takes the
  // larger gain, which is the expected direction — it renders at the lowest
  // scale and so has the most to recover.
  //
  // The strengths were chosen from a sweep rather than guessed. Gain is close to
  // linear in strength and overshoot is not, so there is a knee: at medium,
  // 0.4 bought +3.6% at 0.00% ringing, 0.7 buys +6.6% at 0.04%, and 1.0 buys
  // +9.8% at 0.17%. 0.7 and 0.6 take roughly double the detail of the first
  // shipped values while overshoot stays under a tenth of a percent of edge
  // pixels. 1.0 looked clean in a live capture too, but that is one judgement
  // against a clear superlinear trend, so the conservative point was taken.
  //
  // The null control is what makes these readable: the same build captured
  // twice gives a delta of 0.000 with sd 0.000 on every pair, so the numbers
  // above belong to the filter and nothing else. Getting there took stopping
  // both the clock AND delta, since twelve frame callbacks ease on delta and
  // kept integrating under a clock-only freeze. Earlier figures on a live scene
  // — +13%, then +3.2%, then +3.9% — were measuring the aurora as much as the
  // filter.
  //
  // This is a small, safe recovery and not a transformation; it is here because
  // it is free, not because it is large.
  //
  // `sharpen` recovers what the render scale gives away. The scene is drawn into
  // a target at `scale` and the canvas itself sits below one device pixel per CSS
  // pixel on every tier below high, so what reaches the screen has been resampled
  // twice before a visitor sees it. A contrast-adaptive unsharp against the four
  // cardinal neighbours, applied inside the grade pass that is already sampling
  // this buffer, costs four texture fetches and no extra pass. High renders at
  // scale 1 and is not upscaled, so it is 0 there and pays nothing.
  low: Object.freeze({
    scale: 0.82,
    sharpen: 0.6,
    fisheye: 0,
    chroma: 0,
    ink: 0.05,
    scanline: 0,
    pixel: 1,
    quantize: 0.04,
    // The grade is `color *= (gradeBase + gradeCurve * color)`, so gradeBase sets how
    // much of a midtone survives and gradeCurve sets how fast it falls away. Low was
    // left at the authored 0.04/0.9 when medium and high were retuned to 0.56/0.4, and
    // nobody measured what that did to the mean: at a mid-grey of 0.5 low returned
    // 0.245 against medium's 0.38, crushing its midtones by a third.
    //
    // Measured with the post pass ablated (?qa-no-post), the low tier renders BRIGHTER
    // than medium before grading — 187.6 mean luma against 180.6 — and comes out darker
    // only because the grade removes 80.8 luma from it against medium's 58.4. That put
    // low under this project's own 108 floor, which exists so the mascot stays legible.
    //
    // Rebalanced rather than flattened: base + curve is held at 0.94, exactly where it
    // was, so white still maps to white and the highlight end is untouched. Only the
    // midtone pivot moves. Low keeps a visibly heavier paper grade than medium — which
    // is what hides its 0.82 render scale — it just no longer crushes the mean to
    // failure to do it.
    // 0.30 -> 0.33 (curve down to hold base+curve at 0.94): assembly-tool-locker
    // measured 107.4 at low against the 108 floor with every other station passing
    // 110.9-134.0. The station's own geometry fills its frame, so the sky-band
    // compensation cannot reach it; the midtone pivot is the lever that moves the
    // whole low tier by the ~1-2 luma the floor needs without re-splitting the
    // ladder (white still maps to 0.94*white).
    gradeBase: 0.33,
    gradeCurve: 0.61,
    shadowSeparation: 0.24,
  }),
  // SHADER LAW 1: medium/high are the tiers a desktop visitor actually sees, so
  // their camera-space stylisation is floored to a whisper — no scanline, a
  // trace of quantize/chroma/ink for edge cohesion only, and a fisheye an order
  // of magnitude below the old warp. Low keeps its heavier paper grade because
  // it is hiding a 0.82 render scale on weak hardware.
  // SHADER LAW 2: the camera-space layer no longer does anti-aliasing's job.
  // The render target carries 4x MSAA, so `pixel` drops to 1 (no quantisation
  // of the linear resolution the target now delivers) and `chroma` drops to a
  // trace. Stacking a 1.4px pixelate and a 0.15 chromatic smear on an aliased
  // frame is what made the top tier read soft AND jagged at the same time.
  medium: Object.freeze({
    scale: 0.94,
    sharpen: 0.7,
    fisheye: 0.001,
    chroma: 0.04,
    ink: 0.05,
    scanline: 0,
    pixel: 1,
    quantize: 0.04,
    gradeBase: 0.56,
    gradeCurve: 0.4,
    shadowSeparation: 0,
  }),
  high: Object.freeze({
    scale: 1,
    sharpen: 0,
    fisheye: 0.0015,
    chroma: 0.05,
    ink: 0.06,
    scanline: 0,
    pixel: 1,
    quantize: 0.05,
    gradeBase: 0.6,
    gradeCurve: 0.4,
    shadowSeparation: 0,
  }),
});
