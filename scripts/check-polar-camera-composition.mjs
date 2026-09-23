import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import {
  POLAR_CAMERA_COMPOSITION_CONTRACT,
  clearPolarCameraCompositionCache,
  resolvePolarTravelComposition,
  resolveSealPresentationScale,
  solvePolarCameraComposition,
} from "../lib/polar-camera-composition.js";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world.js";
import { motionWarpFromVelocity } from "../lib/polar-world-cadence.js";

const DESKTOP = Object.freeze({ height: 1000, width: 1600 });
const PORTRAIT = Object.freeze({ height: 915, width: 412 });

// The floating crown halo is retired; the seal silhouette itself (body plus
// hairstyle) is what framing has to keep whole, so there is no separate halo
// headroom term left to assert here.
assert.equal(
  POLAR_CAMERA_COMPOSITION_CONTRACT.includesHalo,
  undefined,
  "seal framing must not claim halo headroom after the crown halo was removed",
);
assert.equal(
  POLAR_CAMERA_COMPOSITION_CONTRACT.plaqueEntranceVisibilityDot,
  0.34,
  "Plaque must use the clearly entrance-facing hemisphere, not a grazing rear view",
);
assert.equal(
  POLAR_CAMERA_COMPOSITION_CONTRACT.plaquePortraitEntranceVisibilityDot,
  0.58,
  "portrait must use its own frontal airlock projection contract",
);
assert.equal(
  POLAR_CAMERA_COMPOSITION_CONTRACT.plaquePortraitSealCentroidRatio,
  0.695,
  "portrait must stack the seal low enough to use the vertical frame",
);
assert.equal(
  POLAR_CAMERA_COMPOSITION_CONTRACT.minimumPlaquePortraitSubjectSpanRatio,
  0.35,
  "portrait dome plus seal must occupy at least 35% of the vertical field",
);
assert.equal(
  POLAR_CAMERA_COMPOSITION_CONTRACT.maximumHeroSpanRatio,
  0.56,
  "#34: docked heroes must leave breathing room — ground, horizon, and place context",
);

function insideAzimuthRanges(value, ranges) {
  const normalized = ((value % 360) + 360) % 360;
  return ranges.some(([minimum, maximum]) => {
    if (minimum <= maximum) return normalized >= minimum && normalized <= maximum;
    return normalized >= minimum || normalized <= maximum;
  });
}

function overlapArea(first, second) {
  const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
  const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
  return width * height;
}

function assertBoundsInside(bounds, viewport, minimumInset, label) {
  assert.ok(bounds.left >= minimumInset - 0.5, `${label} left inset ${bounds.left}`);
  assert.ok(bounds.right <= viewport.width - minimumInset + 0.5, `${label} right inset ${bounds.right}`);
  assert.ok(bounds.top >= minimumInset - 0.5, `${label} top inset ${bounds.top}`);
  assert.ok(bounds.bottom <= viewport.height - minimumInset + 0.5, `${label} bottom inset ${bounds.bottom}`);
}

function assertComposition(result, viewport, station, label) {
  assert.ok(
    insideAzimuthRanges(result.camera.azimuthDegrees, station.camera.azimuthRanges),
    `${label} azimuth ${result.camera.azimuthDegrees} escaped authored cone`,
  );
  assert.ok(
    result.camera.elevationDegrees >= station.camera.elevationRange[0] &&
      result.camera.elevationDegrees <= station.camera.elevationRange[1],
    `${label} elevation escaped authored cone`,
  );
  // #34: landscape must fit the whole rendered facility inside the inset;
  // portrait fits the mechanism core horizontally (wide outbuildings may crop
  // at phone edges by design) while the full build height stays inset-safe.
  const portraitViewport = viewport.width < 900;
  const heroFitBounds = portraitViewport
    ? {
        ...result.metrics.heroCoreBounds,
        bottom: result.metrics.heroBounds.bottom,
        top: result.metrics.heroBounds.top,
      }
    : result.metrics.heroBounds;
  assertBoundsInside(
    heroFitBounds,
    viewport,
    POLAR_CAMERA_COMPOSITION_CONTRACT.heroInsetPixels,
    `${label} hero`,
  );
  const heroWidthRatio =
    (result.metrics.heroBounds.right - result.metrics.heroBounds.left) / viewport.width;
  const heroHeightRatio =
    (result.metrics.heroBounds.bottom - result.metrics.heroBounds.top) / viewport.height;
  const heroOccupancy = portraitViewport
    ? heroHeightRatio
    : Math.max(heroWidthRatio, heroHeightRatio);
  assert.ok(
    heroOccupancy <= POLAR_CAMERA_COMPOSITION_CONTRACT.maximumHeroSpanRatio + 0.001,
    `${label} hero fills the frame (${heroOccupancy.toFixed(3)}) — no breathing room`,
  );
  assertBoundsInside(
    result.metrics.sealBounds,
    viewport,
    POLAR_CAMERA_COMPOSITION_CONTRACT.sealInsetPixels,
    `${label} seal`,
  );
  const sealWidth = result.metrics.sealBounds.right - result.metrics.sealBounds.left;
  const sealHeight = result.metrics.sealBounds.bottom - result.metrics.sealBounds.top;
  assert.ok(
    sealWidth <= viewport.width * POLAR_CAMERA_COMPOSITION_CONTRACT.maximumSealWidthRatio + 0.5,
    `${label} seal width ${(sealWidth / viewport.width).toFixed(3)}`,
  );
  assert.ok(
    sealHeight <= viewport.height * POLAR_CAMERA_COMPOSITION_CONTRACT.maximumSealHeightRatio + 0.5,
    `${label} seal height ${(sealHeight / viewport.height).toFixed(3)}`,
  );
  assert.ok(
    result.metrics.sealCentroidY >= viewport.height * POLAR_CAMERA_COMPOSITION_CONTRACT.sealCentroidRange[0] - 0.5 &&
      result.metrics.sealCentroidY <= viewport.height * POLAR_CAMERA_COMPOSITION_CONTRACT.sealCentroidRange[1] + 0.5,
    `${label} seal centroid ${(result.metrics.sealCentroidY / viewport.height).toFixed(3)}`,
  );
  assert.equal(
    overlapArea(result.metrics.sealBodyBounds, result.metrics.primaryMechanismBounds),
    0,
    `${label} seal overlaps primary mechanism`,
  );
  assert.equal(
    overlapArea(result.metrics.sealBodyBounds, result.metrics.contactBaseBounds),
    0,
    `${label} seal overlaps contact base`,
  );
  const minimumFacingDot = station.id === "observatory-plaque" ? 0.78 : 0.94;
  assert.ok(
    result.seal.facingCameraDot >= minimumFacingDot,
    `${label} face is not camera-readable`,
  );
  assert.equal(result.motionFisheye, 0, `${label} dock fisheye must resolve to zero`);

  const heroWidth = result.metrics.heroBounds.right - result.metrics.heroBounds.left;
  const heroHeight = result.metrics.heroBounds.bottom - result.metrics.heroBounds.top;
  assert.ok(
    Math.max(heroWidth / viewport.width, heroHeight / viewport.height) >=
      POLAR_CAMERA_COMPOSITION_CONTRACT.minimumHeroSpanRatio,
    `${label} hero under-fills the object-world frame`,
  );
  if (viewport.width < 900 && station.id === "observatory-plaque") {
    const subjectTop = Math.min(result.metrics.heroBounds.top, result.metrics.sealBounds.top);
    const subjectBottom = Math.max(
      result.metrics.heroBounds.bottom,
      result.metrics.sealBounds.bottom,
    );
    assert.ok(
      (subjectBottom - subjectTop) / viewport.height >=
        POLAR_CAMERA_COMPOSITION_CONTRACT.minimumPlaquePortraitSubjectSpanRatio,
      `${label} wastes the portrait vertical field`,
    );
  }
}

for (const stationId of STATION_WORLD_SCHEMA.order) {
  const station = STATION_WORLD_SCHEMA.stations[stationId];
  const desktop = solvePolarCameraComposition({
    height: DESKTOP.height,
    quality: "high",
    sealPosition: { x: station.dock.x, z: station.dock.z },
    station,
    velocity: { x: 0, z: 0 },
    width: DESKTOP.width,
  });
  const portrait = solvePolarCameraComposition({
    height: PORTRAIT.height,
    quality: "high",
    sealPosition: { x: station.dock.x, z: station.dock.z },
    station,
    velocity: { x: 0, z: 0 },
    width: PORTRAIT.width,
  });

  assertComposition(desktop, DESKTOP, station, `${stationId} desktop`);
  assertComposition(portrait, PORTRAIT, station, `${stationId} portrait`);
  assert.equal(
    portrait.camera.verticalFovDegrees,
    station.camera.verticalFovDegrees + 7,
    `${stationId} portrait must use the authored +7 degree rule`,
  );
  // #34 deliberate supersession: the old "portrait >= desktop + 1.2" distance
  // proxy assumed both orientations framed the same envelope. Desktop is now
  // pushed back by the honest facility width (maximumHeroSpanRatio), which
  // portrait cannot and need not match — its anti-clipping guarantee is the
  // vertical occupancy cap plus the explicit 9.75 portrait distance floor.
  assert.ok(
    portrait.camera.distance >= 9.75,
    `${stationId} portrait must respect the portrait distance floor`,
  );
  if (stationId === "observatory-plaque") {
    assert.ok(
      portrait.metrics.sealCentroidX < portrait.metrics.heroCentroidX,
      "portrait Plaque must put the seal opposite the doorway so the arch remains readable",
    );
    assert.ok(
      Math.cos((portrait.camera.azimuthDegrees * Math.PI) / 180) >=
        POLAR_CAMERA_COMPOSITION_CONTRACT.plaquePortraitEntranceVisibilityDot,
      "portrait Plaque must show the open airlock face, not its side wall",
    );
    assert.ok(
      Math.abs(
        portrait.metrics.sealCentroidY / PORTRAIT.height -
          POLAR_CAMERA_COMPOSITION_CONTRACT.plaquePortraitSealCentroidRatio,
      ) <= 0.005,
      "portrait Plaque must use the authored low seal stack",
    );
  }
}

const plaque = STATION_WORLD_SCHEMA.stations["observatory-plaque"];
const plaqueFrame = solvePolarCameraComposition({
  ...DESKTOP,
  quality: "high",
  sealPosition: { x: plaque.dock.x, z: plaque.dock.z },
  station: plaque,
  velocity: { x: 0, z: 0 },
});
assert.ok(
  plaqueFrame.metrics.sealCentroidX > plaqueFrame.metrics.heroCentroidX,
  "Plaque must compose the entrance/igloo left and seal face right",
);
assert.ok(
  Math.cos((plaqueFrame.camera.azimuthDegrees * Math.PI) / 180) >=
    POLAR_CAMERA_COMPOSITION_CONTRACT.plaqueEntranceVisibilityDot,
  "Plaque camera must stay on the airlock-facing side of the authored cone",
);
const s2 = STATION_WORLD_SCHEMA.stations["s2-kernel-core"];
const travel = resolvePolarTravelComposition({
  height: DESKTOP.height,
  quality: "high",
  reducedMotion: false,
  // Mid-route probe: outside the departed S2 far radius in the camp layout.
  sealPosition: { x: 10, z: -3 },
  station: s2,
  velocity: { x: 3.4, z: -1.2 },
  width: DESKTOP.width,
});
assert.ok(travel.stationInfluence < 0.08, "travel camera must release the departed monument");
assert.ok(
  Math.hypot(travel.look.x - 10, travel.look.z - -3) <= 1.25,
  "travel camera must follow the seal instead of showing an empty oversized world",
);
assert.ok(travel.motionFisheye > 0, "travel must retain bounded motion fisheye");
assert.equal(
  resolvePolarTravelComposition({ ...travel, reducedMotion: true, station: s2 }).motionFisheye,
  0,
  "reduced motion must remove travel fisheye",
);
assert.ok(
  resolveSealPresentationScale(PORTRAIT) < resolveSealPresentationScale(DESKTOP),
  "portrait must author a smaller mascot presentation scale",
);

clearPolarCameraCompositionCache();
const coldStart = performance.now();
for (const stationId of STATION_WORLD_SCHEMA.order) {
  const station = STATION_WORLD_SCHEMA.stations[stationId];
  solvePolarCameraComposition({
    ...DESKTOP,
    quality: "medium",
    sealPosition: station.dock,
    station,
  });
}
const coldSolveMilliseconds = performance.now() - coldStart;
// Pathological-regression tripwire, NOT a perf budget. This runs inside the
// build chain, and CI containers are routinely 2-3x slower than a dev box
// (Vercel measured 239.5ms where local measures ~90ms), so a tight absolute
// ceiling fails on machine speed rather than on code. The ceiling is sized to
// catch an order-of-magnitude blowup while surviving slow shared hardware.
assert.ok(
  coldSolveMilliseconds < 900,
  `all eight cold camera solves must fit a smooth transition budget; got ${coldSolveMilliseconds.toFixed(1)}ms`,
);

assert.equal(motionWarpFromVelocity(0, 0, { quality: "high" }).fisheye, 0);

const [mascotSource, sceneSource, topologySource] = await Promise.all([
  readFile(new URL("../components/TopologicalSealMascot.jsx", import.meta.url), "utf8"),
  readFile(new URL("../components/IglooScene.jsx", import.meta.url), "utf8"),
  readFile(new URL("../components/TopologyConstellation.jsx", import.meta.url), "utf8"),
]);
assert.equal(
  mascotSource.split("seal-crown-halo").length - 1,
  0,
  "the guide must render no crown halo: station identity is the hairstyle and costume",
);
assert.match(
  mascotSource,
  /SEAL_STATION_IDENTITY_PROFILE[\s\S]*carriedBy: "per-station anime hairstyle plus costume wardrobe"[\s\S]*accentSurface[\s\S]*no floating ring geometry/,
  "the guide must declare hairstyle-and-costume station identity in place of the crown halo",
);
assert.ok(
  mascotSource.includes("Math.sin(clock.elapsedTime * 2.6) * 0.014"),
  "the approved permanent breath expression must remain byte-for-byte",
);
assert.ok(
  mascotSource.includes("const MOVEMENT_LIFT_MAX = 0.145;"),
  "movement must lift the seal enough to read during travel",
);
const domeInvocation = sceneSource
  .slice(sceneSource.indexOf("<PolarObservatoryDome"))
  .split("/>", 1)[0];
assert.match(
  domeInvocation,
  /reducedMotion=\{reducedMotion\}/,
  "the dome must receive the scene's reduced-motion policy before camera freeze",
);

const routeNetworkStart = sceneSource.indexOf("function PolarRouteNetwork");
const routeNetworkEnd = sceneSource.indexOf("export default function IglooScene", routeNetworkStart);
const routeNetworkSource = sceneSource.slice(routeNetworkStart, routeNetworkEnd);
for (const token of [
  "Math.min(7.5, distance)",
  "return [nearest, promise].filter(Boolean)",
  "local-route-lead max-two-station-promises",
]) {
  assert.ok(
    routeNetworkSource.includes(token),
    `Bruno local route composition is missing ${JSON.stringify(token)}`,
  );
}
assert.ok(
  !routeNetworkSource.includes("STATION_WORLD_SCHEMA.edges.map"),
  "settled route rendering must not draw the full C8 world circuit",
);
assert.ok(
  topologySource.includes("return ranked.slice(0, 2)"),
  "topology constellation must cap local station promises at two",
);
assert.ok(
  topologySource.includes(
    "links.filter((link) => visibleIds.has(link.from) && visibleIds.has(link.to))",
  ),
  "topology constellation must render only the connecting edge between visible local promises",
);
assert.match(
  topologySource,
  /if \(reducedMotion\) \{[\s\S]*root\.current\.rotation\.y = 0;[\s\S]*root\.current\.position\.z = 0;/,
  "reduced motion must freeze the bounded local topology overlay",
);
assert.ok(
  !topologySource.includes("{links.map((link)"),
  "settled topology rendering must never map the full C8 edge list",
);
assert.ok(
  !topologySource.includes("{artifacts.map((artifact)"),
  "settled topology rendering must never map all eight world nodes",
);

console.log(
  "polar camera composition contract passed for 8 stations × desktop/portrait with capped Bruno local-world route and topology promises",
);
