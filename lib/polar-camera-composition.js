const DEG_TO_RAD = Math.PI / 180;

export const POLAR_CAMERA_COMPOSITION_CONTRACT = Object.freeze({
  heroInsetPixels: 48,
  includesHalo: true,
  maximumSealHeightRatio: 0.24,
  maximumSealWidthRatio: 0.32,
  minimumHeroSpanRatio: 0.2,
  minimumPlaquePortraitSubjectSpanRatio: 0.35,
  plaqueEntranceVisibilityDot: 0.34,
  plaquePortraitEntranceVisibilityDot: 0.58,
  plaquePortraitSealCentroidRatio: 0.695,
  sealCentroidRange: Object.freeze([0.58, 0.7]),
  sealInsetPixels: 32,
});

/**
 * These are measured world-space envelopes of the procedural station mechanisms.
 * Horizontal radii always come from the canonical collision footprint below; only
 * the mechanism's vertical build height is authored here because an XZ collider
 * cannot encode a mast, bridge, or dome height.
 */
const MECHANISM_VERTICAL_ENVELOPES = Object.freeze({
  "observatory-plaque": Object.freeze({
    footprintScale: Object.freeze({ x: 0.55, z: 0.465 }),
    height: 1.72,
    primaryFloor: 0.28,
  }),
  "s2-kernel-core": Object.freeze({ height: 3.1, primaryFloor: 0.5 }),
  "manifold-reactor": Object.freeze({ height: 2.22, primaryFloor: 0.42 }),
  "field-chamber-coils": Object.freeze({ height: 2.04, primaryFloor: 0.38 }),
  "qpu-ice-bridge": Object.freeze({ height: 2.2, primaryFloor: 0.32 }),
  "upstream-radio-mast": Object.freeze({ height: 3.18, primaryFloor: 0.54 }),
  "topology-archive-wall": Object.freeze({ height: 2.08, primaryFloor: 0.38 }),
  "assembly-tool-locker": Object.freeze({ height: 2.18, primaryFloor: 0.4 }),
});

const QUALITY_DISTANCE_BIAS = Object.freeze({ high: 0, low: 0.55, medium: 0.28 });
const STATION_FOOTPRINT_SCALE = 0.68;
const PRIMARY_FOOTPRINT_SCALE = 0.34;
const CONTACT_FOOTPRINT_SCALE = 0.36;
const SEAL_WORLD_Y = 0.57;
const SEAL_VERTICAL_RADIUS = 0.35;
const SEAL_AXIAL_RADIUS = 1.04;
const SEAL_LATERAL_RADIUS = 0.49;
const SEAL_HALO_RADIUS = 0.676;
const SEAL_HALO_Y = 0.02;
const CAMERA_SOLVE_CACHE = new Map();
const ENVELOPE_SEGMENTS = 16;

export function clearPolarCameraCompositionCache() {
  CAMERA_SOLVE_CACHE.clear();
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function lerp(first, second, alpha) {
  return first + (second - first) * alpha;
}

function smoothstep(edge0, edge1, value) {
  if (edge1 <= edge0) return value >= edge1 ? 1 : 0;
  const progress = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function normalizeXZ(vector, fallback = { x: 1, z: 0 }) {
  const length = Math.hypot(vector?.x || 0, vector?.z || 0);
  if (length <= 1e-6) return { ...fallback };
  return { x: vector.x / length, z: vector.z / length };
}

function angleInRanges(angle, ranges) {
  const normalized = ((angle % 360) + 360) % 360;
  return ranges.some(([minimum, maximum]) => {
    if (minimum <= maximum) return normalized >= minimum && normalized <= maximum;
    return normalized >= minimum || normalized <= maximum;
  });
}

function azimuthCandidates(ranges) {
  const values = new Set();
  for (const [rawStart, rawEnd] of ranges) {
    const start = rawStart;
    const end = rawEnd < rawStart ? rawEnd + 360 : rawEnd;
    for (let value = start; value <= end + 1e-6; value += 3) {
      values.add(Number((((value % 360) + 360) % 360).toFixed(4)));
    }
    values.add(Number((((end % 360) + 360) % 360).toFixed(4)));
  }
  return [...values].filter((value) => angleInRanges(value, ranges));
}

function elevationCandidates(cameraProfile) {
  const [minimum, maximum] = cameraProfile.elevationRange;
  return [...new Set([
    maximum,
    clamp(cameraProfile.elevationDegrees, minimum, maximum),
    clamp(minimum + 0.5, minimum, maximum),
  ])];
}

function makeCamera(station, azimuthDegrees, elevationDegrees, distance, lookY) {
  const azimuth = azimuthDegrees * DEG_TO_RAD;
  const elevation = elevationDegrees * DEG_TO_RAD;
  const horizontalDistance = Math.cos(elevation) * distance;
  const look = { x: station.center.x, y: lookY, z: station.center.z };
  const position = {
    x: look.x + Math.sin(azimuth) * horizontalDistance,
    y: look.y + Math.sin(elevation) * distance,
    z: look.z + Math.cos(azimuth) * horizontalDistance,
  };
  return { look, position };
}

function makeViewBasis(camera) {
  const forwardRaw = {
    x: camera.look.x - camera.position.x,
    y: camera.look.y - camera.position.y,
    z: camera.look.z - camera.position.z,
  };
  const forwardLength =
    Math.hypot(forwardRaw.x, forwardRaw.y, forwardRaw.z) || 1;
  const forward = {
    x: forwardRaw.x / forwardLength,
    y: forwardRaw.y / forwardLength,
    z: forwardRaw.z / forwardLength,
  };
  const rightRaw = { x: -forward.z, y: 0, z: forward.x };
  const rightLength = Math.hypot(rightRaw.x, rightRaw.z) || 1;
  const right = {
    x: rightRaw.x / rightLength,
    y: 0,
    z: rightRaw.z / rightLength,
  };
  const up = {
    x: right.y * forward.z - right.z * forward.y,
    y: right.z * forward.x - right.x * forward.z,
    z: right.x * forward.y - right.y * forward.x,
  };
  return { forward, right, up };
}

function projectPoint(point, camera, basis, width, height, verticalFovDegrees) {
  const relative = {
    x: point.x - camera.position.x,
    y: point.y - camera.position.y,
    z: point.z - camera.position.z,
  };
  const depth =
    relative.x * basis.forward.x +
    relative.y * basis.forward.y +
    relative.z * basis.forward.z;
  const safeDepth = Math.max(0.05, depth);
  const viewX = relative.x * basis.right.x + relative.z * basis.right.z;
  const viewY =
    relative.x * basis.up.x +
    relative.y * basis.up.y +
    relative.z * basis.up.z;
  const tanHalfFov = Math.tan((verticalFovDegrees * DEG_TO_RAD) / 2);
  const aspect = width / height;
  const ndcX = viewX / (safeDepth * tanHalfFov * aspect);
  const ndcY = viewY / (safeDepth * tanHalfFov);
  return {
    depth,
    x: ((ndcX + 1) * width) / 2,
    y: ((1 - ndcY) * height) / 2,
  };
}

function boundsFromPoints(points, camera, width, height, verticalFovDegrees) {
  const basis = makeViewBasis(camera);
  const projected = points.map((point) =>
    projectPoint(point, camera, basis, width, height, verticalFovDegrees),
  );
  return projected.reduce(
    (bounds, point) => ({
      bottom: Math.max(bounds.bottom, point.y),
      left: Math.min(bounds.left, point.x),
      right: Math.max(bounds.right, point.x),
      top: Math.min(bounds.top, point.y),
    }),
    {
      bottom: Number.NEGATIVE_INFINITY,
      left: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      top: Number.POSITIVE_INFINITY,
    },
  );
}

function ellipseEnvelopePoints(station, radiusScale, minimumY, maximumY) {
  const rotation = station.collider.rotationDegrees * DEG_TO_RAD;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const radiusX =
    station.collider.radiusX *
    (typeof radiusScale === "object" ? radiusScale.x : radiusScale);
  const radiusZ =
    station.collider.radiusZ *
    (typeof radiusScale === "object" ? radiusScale.z : radiusScale);
  const points = [];
  for (let index = 0; index < ENVELOPE_SEGMENTS; index += 1) {
    const angle = (index / ENVELOPE_SEGMENTS) * Math.PI * 2;
    const localX = Math.cos(angle) * radiusX;
    const localZ = Math.sin(angle) * radiusZ;
    const x = station.center.x + localX * cosine - localZ * sine;
    const z = station.center.z + localX * sine + localZ * cosine;
    points.push({ x, y: minimumY, z }, { x, y: maximumY, z });
  }
  points.push(
    { x: station.center.x, y: minimumY, z: station.center.z },
    { x: station.center.x, y: maximumY, z: station.center.z },
  );
  return points;
}

function sealBodyEnvelopePoints(sealPosition, presentationScale, facing) {
  const forward = normalizeXZ(facing);
  const lateral = { x: -forward.z, z: forward.x };
  const axial = SEAL_AXIAL_RADIUS * presentationScale;
  const radial = SEAL_LATERAL_RADIUS * presentationScale;
  const vertical = SEAL_VERTICAL_RADIUS * presentationScale;
  const points = [];
  for (let index = 0; index < ENVELOPE_SEGMENTS; index += 1) {
    const angle = (index / ENVELOPE_SEGMENTS) * Math.PI * 2;
    const along = Math.cos(angle) * axial;
    const across = Math.sin(angle) * radial;
    const x = sealPosition.x + forward.x * along + lateral.x * across;
    const z = sealPosition.z + forward.z * along + lateral.z * across;
    points.push(
      { x, y: SEAL_WORLD_Y - vertical, z },
      { x, y: SEAL_WORLD_Y + vertical, z },
    );
  }
  return points;
}

function sealHaloEnvelopePoints(sealPosition) {
  const points = [];
  for (let index = 0; index < ENVELOPE_SEGMENTS; index += 1) {
    const angle = (index / ENVELOPE_SEGMENTS) * Math.PI * 2;
    points.push(
      {
        x: sealPosition.x + Math.cos(angle) * SEAL_HALO_RADIUS,
        y: SEAL_HALO_Y,
        z: sealPosition.z + Math.sin(angle) * SEAL_HALO_RADIUS,
      },
      {
        x: sealPosition.x + Math.cos(angle) * SEAL_HALO_RADIUS,
        y: SEAL_HALO_Y + 0.035,
        z: sealPosition.z + Math.sin(angle) * SEAL_HALO_RADIUS,
      },
    );
  }
  return points;
}

function overlapArea(first, second) {
  const width = Math.max(
    0,
    Math.min(first.right, second.right) - Math.max(first.left, second.left),
  );
  const height = Math.max(
    0,
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
  );
  return width * height;
}

function solveLookY({
  azimuthDegrees,
  distance,
  elevationDegrees,
  height,
  sealPosition,
  station,
  targetRatio,
  verticalFovDegrees,
  width,
}) {
  let lower = -1.2;
  let upper = 4.2;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const lookY = (lower + upper) / 2;
    const camera = makeCamera(
      station,
      azimuthDegrees,
      elevationDegrees,
      distance,
      lookY,
    );
    const basis = makeViewBasis(camera);
    const projected = projectPoint(
      { x: sealPosition.x, y: SEAL_WORLD_Y, z: sealPosition.z },
      camera,
      basis,
      width,
      height,
      verticalFovDegrees,
    );
    if (projected.y < height * targetRatio) lower = lookY;
    else upper = lookY;
  }
  return (lower + upper) / 2;
}

function resolveFacing(camera, station, sealPosition) {
  const toCamera = normalizeXZ({
    x: camera.position.x - sealPosition.x,
    z: camera.position.z - sealPosition.z,
  });
  const toStation = normalizeXZ({
    x: station.center.x - sealPosition.x,
    z: station.center.z - sealPosition.z,
  });
  const plaque = station.id === "observatory-plaque";
  const cameraWeight = plaque ? 0.65 : 0.94;
  const stationWeight = 1 - cameraWeight;
  const facing = normalizeXZ({
    x: toCamera.x * cameraWeight + toStation.x * stationWeight,
    z: toCamera.z * cameraWeight + toStation.z * stationWeight,
  }, toCamera);
  return {
    facing,
    facingCameraDot: facing.x * toCamera.x + facing.z * toCamera.z,
    facingStationDot: facing.x * toStation.x + facing.z * toStation.z,
  };
}

function buildCandidate({
  azimuthDegrees,
  distance,
  elevationDegrees,
  height,
  presentationScale,
  sealPosition,
  station,
  verticalFovDegrees,
  width,
}) {
  const targetRatio =
    width < 900 && station.id === "observatory-plaque"
      ? POLAR_CAMERA_COMPOSITION_CONTRACT.plaquePortraitSealCentroidRatio
      : width < 900
        ? 0.65
        : 0.64;
  const lookY = solveLookY({
    azimuthDegrees,
    distance,
    elevationDegrees,
    height,
    sealPosition,
    station,
    targetRatio,
    verticalFovDegrees,
    width,
  });
  const camera = makeCamera(
    station,
    azimuthDegrees,
    elevationDegrees,
    distance,
    lookY,
  );
  const facing = resolveFacing(camera, station, sealPosition);
  const envelope =
    MECHANISM_VERTICAL_ENVELOPES[station.id] ||
    MECHANISM_VERTICAL_ENVELOPES["assembly-tool-locker"];
  const heroBounds = boundsFromPoints(
    ellipseEnvelopePoints(
      station,
      envelope.footprintScale || STATION_FOOTPRINT_SCALE,
      0.025,
      envelope.height,
    ),
    camera,
    width,
    height,
    verticalFovDegrees,
  );
  const primaryMechanismBounds = boundsFromPoints(
    ellipseEnvelopePoints(
      station,
      PRIMARY_FOOTPRINT_SCALE,
      envelope.primaryFloor,
      envelope.height * 0.96,
    ),
    camera,
    width,
    height,
    verticalFovDegrees,
  );
  const contactBaseBounds = boundsFromPoints(
    ellipseEnvelopePoints(station, CONTACT_FOOTPRINT_SCALE, 0.015, 0.17),
    camera,
    width,
    height,
    verticalFovDegrees,
  );
  const sealBodyPoints = sealBodyEnvelopePoints(
    sealPosition,
    presentationScale,
    facing.facing,
  );
  const sealBodyBounds = boundsFromPoints(
    sealBodyPoints,
    camera,
    width,
    height,
    verticalFovDegrees,
  );
  const sealBounds = boundsFromPoints(
    [...sealBodyPoints, ...sealHaloEnvelopePoints(sealPosition)],
    camera,
    width,
    height,
    verticalFovDegrees,
  );
  const basis = makeViewBasis(camera);
  const sealCenter = projectPoint(
    { x: sealPosition.x, y: SEAL_WORLD_Y, z: sealPosition.z },
    camera,
    basis,
    width,
    height,
    verticalFovDegrees,
  );
  const heroCentroidX = (heroBounds.left + heroBounds.right) / 2;
  const sealWidth = sealBounds.right - sealBounds.left;
  const sealHeight = sealBounds.bottom - sealBounds.top;
  const heroWidth = heroBounds.right - heroBounds.left;
  const heroHeight = heroBounds.bottom - heroBounds.top;
  const inset = POLAR_CAMERA_COMPOSITION_CONTRACT.heroInsetPixels;
  const safeHero =
    heroBounds.left >= inset &&
    heroBounds.right <= width - inset &&
    heroBounds.top >= inset &&
    heroBounds.bottom <= height - inset;
  const sealInset = POLAR_CAMERA_COMPOSITION_CONTRACT.sealInsetPixels;
  const safeSeal =
    sealBounds.left >= sealInset &&
    sealBounds.right <= width - sealInset &&
    sealBounds.top >= sealInset &&
    sealBounds.bottom <= height - sealInset;
  const sealSized =
    sealWidth <= width * POLAR_CAMERA_COMPOSITION_CONTRACT.maximumSealWidthRatio &&
    sealHeight <= height * POLAR_CAMERA_COMPOSITION_CONTRACT.maximumSealHeightRatio;
  const centroidRatio = sealCenter.y / height;
  const centroidSafe =
    centroidRatio >= POLAR_CAMERA_COMPOSITION_CONTRACT.sealCentroidRange[0] &&
    centroidRatio <= POLAR_CAMERA_COMPOSITION_CONTRACT.sealCentroidRange[1];
  const mechanismOverlap = overlapArea(sealBodyBounds, primaryMechanismBounds);
  const contactOverlap = overlapArea(sealBodyBounds, contactBaseBounds);
  const heroSpan = Math.max(heroWidth / width, heroHeight / height);
  const heroLarge = heroSpan >= POLAR_CAMERA_COMPOSITION_CONTRACT.minimumHeroSpanRatio;
  const subjectVerticalSpan =
    (Math.max(heroBounds.bottom, sealBounds.bottom) -
      Math.min(heroBounds.top, sealBounds.top)) /
    height;
  const portraitFieldUsed =
    width >= 900 ||
    station.id !== "observatory-plaque" ||
    subjectVerticalSpan >=
      POLAR_CAMERA_COMPOSITION_CONTRACT.minimumPlaquePortraitSubjectSpanRatio;
  const portraitPlaque = width < 900 && station.id === "observatory-plaque";
  const sealOnAuthoredSide = portraitPlaque
    ? sealCenter.x < heroCentroidX
    : sealCenter.x > heroCentroidX;
  const facingMinimum = station.id === "observatory-plaque" ? 0.78 : 0.94;
  const valid =
    safeHero &&
    safeSeal &&
    sealSized &&
    centroidSafe &&
    mechanismOverlap <= 1e-6 &&
    contactOverlap <= 1e-6 &&
    heroLarge &&
    portraitFieldUsed &&
    sealOnAuthoredSide &&
    facing.facingCameraDot >= facingMinimum;
  const insetPenalty =
    Math.max(0, inset - heroBounds.left) +
    Math.max(0, heroBounds.right - (width - inset)) +
    Math.max(0, inset - heroBounds.top) +
    Math.max(0, heroBounds.bottom - (height - inset));
  const sealInsetPenalty =
    Math.max(0, sealInset - sealBounds.left) +
    Math.max(0, sealBounds.right - (width - sealInset)) +
    Math.max(0, sealInset - sealBounds.top) +
    Math.max(0, sealBounds.bottom - (height - sealInset));
  const penalty =
    insetPenalty * 10 +
    sealInsetPenalty * 12 +
    mechanismOverlap * 0.08 +
    contactOverlap * 0.1 +
    Math.max(0, sealWidth - width * 0.32) * 5 +
    Math.max(0, sealHeight - height * 0.24) * 5 +
    Math.max(0, POLAR_CAMERA_COMPOSITION_CONTRACT.minimumHeroSpanRatio - heroSpan) * 3000 +
    Math.max(
      0,
      POLAR_CAMERA_COMPOSITION_CONTRACT.minimumPlaquePortraitSubjectSpanRatio -
        subjectVerticalSpan,
    ) *
      (width < 900 && station.id === "observatory-plaque" ? 3000 : 0) +
    Math.max(
      0,
      portraitPlaque
        ? sealCenter.x - heroCentroidX
        : heroCentroidX - sealCenter.x,
    ) * 4;

  return {
    camera: {
      ...camera,
      azimuthDegrees,
      distance,
      elevationDegrees,
      verticalFovDegrees,
    },
    metrics: {
      contactBaseBounds,
      contractSatisfied: valid,
      heroBounds,
      heroCentroidX,
      primaryMechanismBounds,
      sealBodyBounds,
      sealBounds,
      sealCentroidX: sealCenter.x,
      sealCentroidY: sealCenter.y,
    },
    penalty,
    seal: {
      facing: facing.facing,
      facingCameraDot: facing.facingCameraDot,
      facingStationDot: facing.facingStationDot,
      presentationScale,
    },
    valid,
  };
}

export function resolveSealPresentationScale({ height = 1000, width = 1600 } = {}) {
  const portrait = width < 900;
  const compact = width < 520;
  if (compact) return 0.58;
  if (portrait) return 0.61;
  return height / width > 0.78 ? 0.65 : 0.68;
}

export function solvePolarCameraComposition({
  height = 1000,
  quality = "high",
  sealPosition,
  station,
  velocity = { x: 0, z: 0 },
  width = 1600,
} = {}) {
  if (!station?.camera || !station?.collider || !station?.center || !station?.dock) {
    throw new TypeError("solvePolarCameraComposition requires one canonical station");
  }
  const resolvedSeal = {
    x: finite(sealPosition?.x, station.dock.x),
    z: finite(sealPosition?.z, station.dock.z),
  };
  const portrait = width < 900;
  const verticalFovDegrees = station.camera.verticalFovDegrees + (portrait ? 7 : 0);
  const presentationScale = resolveSealPresentationScale({ height, width });
  const qualityBias = QUALITY_DISTANCE_BIAS[quality] ?? QUALITY_DISTANCE_BIAS.medium;
  const minimumDistance = (portrait ? 9.75 : 6.15) + qualityBias;
  const maximumDistance = portrait ? 19 : 15.5;
  const velocityX = finite(velocity?.x);
  const velocityZ = finite(velocity?.z);
  const cacheKey = [
    station.id,
    width,
    height,
    quality,
    resolvedSeal.x.toFixed(3),
    resolvedSeal.z.toFixed(3),
    velocityX.toFixed(3),
    velocityZ.toFixed(3),
  ].join("|");
  const cached = CAMERA_SOLVE_CACHE.get(cacheKey);
  if (cached) return cached;
  let best = null;
  let bestFallback = null;

  for (const elevationDegrees of elevationCandidates(station.camera)) {
    for (const azimuthDegrees of azimuthCandidates(station.camera.azimuthRanges)) {
      const azimuth = azimuthDegrees * DEG_TO_RAD;
      const portraitPlaque = portrait && station.id === "observatory-plaque";
      const entranceVisibilityMinimum = portraitPlaque
        ? POLAR_CAMERA_COMPOSITION_CONTRACT.plaquePortraitEntranceVisibilityDot
        : POLAR_CAMERA_COMPOSITION_CONTRACT.plaqueEntranceVisibilityDot;
      if (
        station.id === "observatory-plaque" &&
        Math.cos(azimuth) < entranceVisibilityMinimum
      ) {
        continue;
      }
      const dockDeltaX = resolvedSeal.x - station.center.x;
      const dockDeltaZ = resolvedSeal.z - station.center.z;
      const screenRightSeparation =
        dockDeltaX * Math.cos(azimuth) - dockDeltaZ * Math.sin(azimuth);
      const authoredSideSeparation = portraitPlaque
        ? -screenRightSeparation
        : screenRightSeparation;
      if (authoredSideSeparation <= 0.04) continue;

      for (
        let distance = minimumDistance;
        distance <= maximumDistance + 1e-6;
        distance += 0.2
      ) {
        const candidate = buildCandidate({
          azimuthDegrees,
          distance: Number(distance.toFixed(4)),
          elevationDegrees,
          height,
          presentationScale,
          sealPosition: resolvedSeal,
          station,
          verticalFovDegrees,
          width,
        });
        const fallbackScore = candidate.penalty + distance;
        if (!bestFallback || fallbackScore < bestFallback.score) {
          bestFallback = { candidate, score: fallbackScore };
        }
        if (!candidate.valid) continue;
        const score = distance - authoredSideSeparation * 0.03;
        if (!best || score < best.score) best = { candidate, score };
        break;
      }
    }
  }

  const result = best?.candidate || bestFallback?.candidate;
  if (!result) throw new Error(`no camera composition candidates for ${station.id}`);
  const speed = Math.hypot(velocityX, velocityZ);
  const fisheyeCap = quality === "high" ? 0.008 : quality === "low" ? 0.003 : 0.006;
  const solved = {
    ...result,
    motionFisheye: fisheyeCap * clamp(speed / 4, 0, 1),
  };
  if (CAMERA_SOLVE_CACHE.size >= 64) CAMERA_SOLVE_CACHE.clear();
  CAMERA_SOLVE_CACHE.set(cacheKey, solved);
  return solved;
}

export function resolvePolarTravelComposition({
  quality = "high",
  reducedMotion = false,
  sealPosition,
  station,
  target = null,
  velocity = { x: 0, z: 0 },
  width = 1600,
} = {}) {
  if (!station?.center || !station?.proximity) {
    throw new TypeError("resolvePolarTravelComposition requires one canonical station");
  }
  const output = target || {};
  const resolvedSeal = output.sealPosition || (output.sealPosition = {});
  resolvedSeal.x = finite(sealPosition?.x, station.dock?.x ?? station.center.x);
  resolvedSeal.z = finite(sealPosition?.z, station.dock?.z ?? station.center.z);
  const resolvedVelocity = output.velocity || (output.velocity = {});
  resolvedVelocity.x = finite(velocity?.x);
  resolvedVelocity.z = finite(velocity?.z);
  const speed = Math.hypot(resolvedVelocity.x, resolvedVelocity.z);
  const direction = normalizeXZ(resolvedVelocity, { x: 0, z: 0 });
  const lead = speed <= 1e-5 ? 0 : Math.min(1.1, 0.24 + speed * 0.16);
  const distanceFromStation = Math.hypot(
    resolvedSeal.x - station.center.x,
    resolvedSeal.z - station.center.z,
  );
  const stationInfluence =
    1 -
    smoothstep(
      station.proximity.approach * 0.78,
      station.proximity.far * 0.96,
      distanceFromStation,
    );
  const travelerFocus = {
    x: resolvedSeal.x + direction.x * lead,
    z: resolvedSeal.z + direction.z * lead,
  };
  const look = output.look || (output.look = {});
  look.x = lerp(travelerFocus.x, station.center.x, stationInfluence);
  look.y = width < 900 ? 0.88 : 0.82;
  look.z = lerp(travelerFocus.z, station.center.z, stationInfluence);
  const fisheyeCap = quality === "high" ? 0.008 : quality === "low" ? 0.003 : 0.006;
  output.cameraDistance =
    (width < 900 ? 9.6 : 7.1) +
    (QUALITY_DISTANCE_BIAS[quality] ?? QUALITY_DISTANCE_BIAS.medium);
  output.motionFisheye = reducedMotion ? 0 : fisheyeCap * clamp(speed / 4, 0, 1);
  output.reducedMotion = reducedMotion;
  output.stationInfluence = stationInfluence;
  return output;
}
