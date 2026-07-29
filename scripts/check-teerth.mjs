import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const file = (target) => path.join(root, target);
const exists = (target) => existsSync(file(target));
const read = (target) => readFileSync(file(target), "utf8");
const readIfExists = (target) => (exists(target) ? read(target) : "");
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const expectFile = (target) => {
  expect(exists(target), `${target} must exist`);
  return readIfExists(target);
};
const expectIncludes = (target, source, needle, message) => {
  expect(source.includes(needle), `${target}: ${message}`);
};
const expectNoPattern = (target, source, pattern, message) => {
  expect(!pattern.test(source), `${target}: ${message}`);
};

const pkg = JSON.parse(read("package.json"));
const page = readIfExists("app/page.jsx");
const shell = readIfExists("components/PortfolioPage.jsx");
const iglooWorld = expectFile("components/IglooWorld.jsx");
const iglooScene = expectFile("components/IglooScene.jsx");
const iglooHud = expectFile("components/IglooHud.jsx");
const iglooArtifacts = expectFile("components/IglooArtifacts.jsx");
const polarObservatoryDome = expectFile("components/PolarObservatoryDome.jsx");
const polarBiomeWorld = expectFile("components/PolarBiomeWorld.jsx");
const polarBiomeFields = expectFile("lib/polar-biome-fields.js");
const iglooTouch = expectFile("components/IglooTouch.jsx");
const sealAvatar = expectFile("components/SealAvatar.jsx");
const sdfSealSplash = expectFile("components/SdfSealSplash.jsx");
const activeTheoryVeil = expectFile("components/ActiveTheoryVeil.jsx");
const blackHoleTransition = expectFile("components/BlackHoleTransition.jsx");
const topologyConstellation = expectFile("components/TopologyConstellation.jsx");
const liveRadar = expectFile("components/LiveRadar.jsx");
const projectIndex = expectFile("components/ProjectIndex.jsx");
const evidenceArchive = expectFile("components/EvidenceArchive.jsx");
const horizontalAxis = expectFile("components/HorizontalAxisController.jsx");
const css = readIfExists("app/globals.css");
const content = readIfExists("data/teerth-content.json");
const corpus = readIfExists("data/project-intelligence.json");
const github = readIfExists("lib/github-live.js");

for (const pbrAsset of [
  "public/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_normal-ogl.png",
]) {
  expect(exists(pbrAsset), `${pbrAsset} must exist`);
}

expect(pkg.scripts?.dev === "next dev", "dev script must use Next.js");
expect(pkg.scripts?.build?.includes("check:teerth"), "build must run Teerth contract before Next build");
expect(pkg.dependencies?.["@react-three/fiber"], "R3F must be installed");
expect(pkg.dependencies?.["@react-three/drei"], "Drei must be installed");
expect(pkg.dependencies?.three, "Three.js must be installed");

expectIncludes("app/page.jsx", page, "fetchLiveGitHubSummary", "must fetch live GitHub summary");
expectIncludes("app/page.jsx", page, "getWorldStations", "must load Teerth world stations");
expectIncludes("components/PortfolioPage.jsx", shell, "IglooWorld", "shell must mount IglooWorld");
expectIncludes("components/PortfolioPage.jsx", shell, "LiveRadar", "shell must mount LiveRadar");
expectIncludes("components/PortfolioPage.jsx", shell, "ProjectIndex", "shell must mount ProjectIndex");
expectIncludes("components/PortfolioPage.jsx", shell, "EvidenceArchive", "shell must mount EvidenceArchive");
expectIncludes("components/PortfolioPage.jsx", shell, "HorizontalAxisController", "shell must mount horizontal axis controller");
expectNoPattern("components/PortfolioPage.jsx", shell, /AntarcticaWorld|SealGuide|WorldStations|autoDock/i, "must not use the rejected old Antarctica controller path");

for (const worldPrimitive of [
  "IglooWorld",
  "IglooScene",
  "IglooHud",
  "SdfSealSplash",
  "BlackHoleTransition",
  "blackHoleActive",
  "topology-archive-wall",
  "sdfRenderEnabled",
  "qa-sdf",
  "safe=1",
  "qa-low",
  "qa-no-dome",
  "qa-no-dressing",
  "qa-no-mechanisms",
  "sceneDebugFlags",
  "data-renderer-mode",
  "!effectiveSafeMode && sdfRenderEnabled",
  "WASD_KEYS",
  "Use WASD",
  "axisVelocity",
  "depthVelocity",
  "axisX",
  "depthZ",
  "iglooPulse",
  "touchIgloo",
  "onTouchIgloo",
  "sealAwake",
]) {
  expectIncludes("components/IglooWorld.jsx", iglooWorld, worldPrimitive, `world must expose ${worldPrimitive}`);
}

for (const scenePrimitive of [
  "Canvas",
  "reducedMotion",
  "frameloop={worldActive ? (renderEnabled && !reducedMotion ? \"always\" : \"demand\") : \"never\"}",
  "failIfMajorPerformanceCaveat",
  "PolarObservatoryDome",
  "SealAvatar",
  "PolarBiomeWorld",
  "AdaptivePolarWorldDressing",
  "IglooTouch",
  "IglooArtifacts",
  "ActiveTheoryVeil",
  "TopologyConstellation",
  "PolarRouteNetwork",
  "PolarSmashables",
  "WORLD_RENDER_WINDOW_NOTE",
  "OBSERVATORY_HOME_X",
  "OBSERVATORY_HOME_Z",
  "STATION_WORLD_SCHEMA",
  "debugFlags",
  "!debugFlags.noDome",
  "travelerRef={traversalPoseRef}",
  "visible={worldActive}",
  "renderEnabled",
  "sealAwake",
  "axisX",
  "depthZ",
  "onTouchIgloo",
]) {
  expectIncludes("components/IglooScene.jsx", iglooScene, scenePrimitive, `scene must expose ${scenePrimitive}`);
}
expectNoPattern("components/IglooScene.jsx", iglooScene, /function ObservatoryDome|gridHelper/i, "scene must not mount the rejected helper-grid dome path");
expectNoPattern(
  "components/IglooScene.jsx",
  iglooScene,
  /<PolarGradientSky|<IglooTerrain|<SnowAtmosphere|<PolarAtmosphereField|<HorizontalParallaxSignalField/,
  "scene must not retain duplicate sky, floor, weather, or pylon-field owners",
);

for (const biomePrimitive of [
  "POLAR_BIOME_WORLD_PROFILE",
  "resolveTwoNearestBiomes",
  "resolveNearestWeather",
  "THREE.InstancedMesh",
  "scene.fog",
  "keyLightRef",
  "fillLightRef",
]) {
  expectIncludes("components/PolarBiomeWorld.jsx", polarBiomeWorld, biomePrimitive, `biome world must define ${biomePrimitive}`);
}
for (const fieldPrimitive of [
  "BIOME_WEIGHT_EXPONENT = 2.2",
  "POLAR_BIOME_PROFILES",
  "POLAR_BIOME_SHADER_POLICY",
  "plaqueField",
  "s2PressureField",
  "aetherRibbonField",
  "magneticSaltField",
  "qpuLeadField",
  "upstreamSignalField",
  "topologyStrataField",
  "assemblyRunwayField",
]) {
  expectIncludes("lib/polar-biome-fields.js", polarBiomeFields, fieldPrimitive, `biome fields must define ${fieldPrimitive}`);
}

for (const domePrimitive of [
  "DOME_PANEL_ROWS",
  "DOME_TILE_COLUMNS_BY_ROW",
  "PolarObservatoryDome",
  "DOME_TEXTURE_POLICY",
  "zero image textures",
  "DOME_CONTINUOUS_DRAW_CALL_PROFILE",
  "DOME_INSTANCED_CONSTRUCTION_PROFILE",
  "ContinuousDomeTopology",
  "InstancedDomeBlocks",
  "InstancedAirlockBlocks",
  "DOME_BRICK_SHADER_PROFILE",
  "fwidth(domeJointDistance)",
  "IntegratedAirlock",
  "NeutralContactPlinth",
  "DOME_PROXIMITY_RESPONSE_PROFILE",
  "DOME_RAM_KNOCK_PROFILE",
  "DOME_DEMOLITION_PROFILE",
  "OBSERVATORY_ENTRY_CACHE_PROFILE",
  "BuriedEntryCache",
  "knockBlocksNearContact",
  "collapseRemainingBlocks",
  "observatoryDomeDamage",
]) {
  expectIncludes("components/PolarObservatoryDome.jsx", polarObservatoryDome, domePrimitive, `polar observatory dome must define ${domePrimitive}`);
}

for (const sealPrimitive of [
  "SealAvatar",
  "SealBody",
  "seal-avatar",
  "capsuleGeometry",
  "SEAL_AVATAR_FORMULA",
  "SEAL_COLLISION_BRIDGE",
  "white-quilted-diamond_normal-ogl.png",
  "axisX",
  "depthZ",
  "onTouchIgloo",
]) {
  expectIncludes("components/SealAvatar.jsx", sealAvatar, sealPrimitive, `seal avatar must define ${sealPrimitive}`);
}

for (const touchPrimitive of ["IglooTouch", "Raycaster", "pointerdown", "ice-block", "igloo-dome"]) {
  expectIncludes("components/IglooTouch.jsx", iglooTouch, touchPrimitive, `igloo touch must define ${touchPrimitive}`);
}

for (const hudPrimitive of [
  "igloo-hud",
  "Seal's Topology Land",
  "igloo-manifesto",
  "igloo-controls-hint",
  "igloo-artifact-readout",
  "igloo-artifact-signal",
  "station-profile-rail",
  "station-profile-chip",
  "onSelectArtifact",
  "artifact.handle",
  "activeArtifact.signal",
  "artifact.betti",
  "igloo-live-strip",
  "latest.repo",
  "Work",
  "Archive",
  "Contact",
]) {
  expectIncludes("components/IglooHud.jsx", iglooHud, hudPrimitive, `HUD must expose ${hudPrimitive}`);
}
expectNoPattern("components/IglooHud.jsx", iglooHud, /content\.profile\.name/, "first game page must not render Teerth's name as the hero title");
expectNoPattern("components/IglooHud.jsx", iglooHud, /Teerth's systems/, "first game page hero copy should emphasize the seal world before the personal name");

for (const artifactId of [
  "observatory-plaque",
  "s2-kernel-core",
  "manifold-reactor",
  "field-chamber-coils",
  "qpu-ice-bridge",
  "upstream-radio-mast",
  "topology-archive-wall",
  "assembly-tool-locker",
]) {
  expectIncludes("components/IglooArtifacts.jsx", iglooArtifacts, artifactId, `must define ${artifactId}`);
}

for (const selector of [
  ".igloo-world",
  ".igloo-scene",
  ".igloo-hud",
  ".igloo-dome",
  ".ice-block",
  ".seal-avatar",
  ".igloo-manifesto",
  ".igloo-controls-hint",
  ".igloo-live-strip",
  ".station-profile-rail",
  ".station-profile-chip",
  ".active-theory-veil",
  ".black-hole-transition",
  ".sdf-seal-splash",
  ".sdf-render-button",
]) {
  expectIncludes("app/globals.css", css, selector, `CSS must define ${selector}`);
}
expectIncludes("app/globals.css", css, "scroll-snap-type: x mandatory", "CSS must keep the document as a horizontal axis");
expectIncludes("app/globals.css", css, "@media (prefers-reduced-motion: reduce)", "CSS must support reduced motion");
expectNoPattern("app/globals.css", css, /\.antarctica-|\.css-seal-|\.world-node|\.station-dock|shader restart/i, "CSS must not keep rejected old selectors");

for (const contentNeedle of [
  "Teerth Sharma",
  "A seal companion lives at the center of a snowy ice world",
  "Topology is the operating system",
  "ML fields",
  "QPU proof",
  "https://github.com/teerthsharma",
  "Seal OS",
]) {
  expectIncludes("data/teerth-content.json", content, contentNeedle, `content must include ${contentNeedle}`);
}

for (const supportPrimitive of [
  "Start exploring",
  "Composite SDF",
  "sdf-render-button",
]) {
  expectIncludes("components/SdfSealSplash.jsx", sdfSealSplash, supportPrimitive, `splash must expose ${supportPrimitive}`);
}

for (const blackHolePrimitive of [
  "BlackHoleTransition",
  "gravitational lensing",
  "Topology Hall of Fame",
  "Return to topology land",
]) {
  expectIncludes("components/BlackHoleTransition.jsx", blackHoleTransition, blackHolePrimitive, `black hole must expose ${blackHolePrimitive}`);
}

expectIncludes("components/HorizontalAxisController.jsx", horizontalAxis, "window.scrollBy({ left", "horizontal axis controller must convert movement to x-axis scrolling");
expectIncludes("components/ActiveTheoryVeil.jsx", activeTheoryVeil, "active-theory-veil", "cinematic veil must expose class name");
expectIncludes("components/TopologyConstellation.jsx", topologyConstellation, "persistent homology", "topology constellation must expose persistent homology language");
expectIncludes("components/TopologyConstellation.jsx", topologyConstellation, "AURORA_UNIFIER_PROFILE", "topology constellation must keep the aurora unifier sky glue");
expectIncludes("components/TopologyConstellation.jsx", topologyConstellation, "vec3(0.4353, 0.9059, 0.7843)", "aurora unifier must reuse the black-hole mint anchor");
expectIncludes("components/LiveRadar.jsx", liveRadar, "liveSummary", "LiveRadar must render server-provided live GitHub summary");
expectIncludes("components/LiveRadar.jsx", liveRadar, "summary?.profile?.login", "LiveRadar must render the API profile login");
expectIncludes("components/LiveRadar.jsx", liveRadar, "summary?.profile?.name", "LiveRadar must render the API profile name when available");
expectNoPattern("components/LiveRadar.jsx", liveRadar, /Live GitHub signal over the ice shelf|The radar checks Teerth Sharma/i, "LiveRadar must stay compact and must not invent profile prose");
expectIncludes("components/ProjectIndex.jsx", projectIndex, "Epsilon-Hollow", "ProjectIndex must expose Teerth flagship systems");
expectIncludes("components/EvidenceArchive.jsx", evidenceArchive, "triton-lang/triton", "EvidenceArchive must include upstream evidence");
expectIncludes("data/project-intelligence.json", corpus, "Epsilon-Hollow", "project intelligence corpus must be copied");
expectIncludes("lib/github-live.js", github, "research-snapshot", "GitHub fetcher must expose snapshot fallback");
expectIncludes("lib/github-live.js", github, 'GITHUB_HANDLE = "teerthsharma"', "GitHub fetcher must use the portfolio owner's handle");
expectIncludes("lib/github-live.js", github, "https://api.github.com/users/${GITHUB_HANDLE}", "GitHub fetcher must build public API URLs from the source handle");
expectIncludes("lib/github-live.js", github, "login: profile.login", "GitHub fetcher must return the API login");
expectIncludes("lib/github-live.js", github, "name: profile.name", "GitHub fetcher must return the API name");
expectNoPattern("lib/github-live.js", github, /name:\s*["']Teerth Sharma["']|public_repos:\s*75/, "GitHub fallback must not invent API profile fields");
expectIncludes("app/page.jsx", page, "fallbackEvents: content.upstream", "page must provide source-backed fallback evidence");

if (failures.length) {
  console.error("Teerth portfolio contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Teerth portfolio contract passed.");
