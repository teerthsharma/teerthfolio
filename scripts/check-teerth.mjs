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
const iglooTerrain = expectFile("components/IglooTerrain.jsx");
const iglooTouch = expectFile("components/IglooTouch.jsx");
const sealAvatar = expectFile("components/SealAvatar.jsx");
const sdfSealMascot = expectFile("components/SdfSealMascot.jsx");
const sdfSealSplash = expectFile("components/SdfSealSplash.jsx");
const snowAtmosphere = expectFile("components/SnowAtmosphere.jsx");
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
  "public/assets/pbr/igloo/white-quilted-fabric-bl/white-quilted-fabric_albedo.png",
  "public/assets/pbr/igloo/white-quilted-fabric-bl/white-quilted-fabric_normal-ogl.png",
  "public/assets/pbr/igloo/white-quilted-fabric-bl/white-quilted-fabric_roughness.png",
  "public/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_albedo.png",
  "public/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_normal-ogl.png",
  "public/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_roughness.png",
  "public/assets/pbr/ground/cloudy-veined-quartz-light-bl/cloudy-veined-quartz-light_albedo.png",
  "public/assets/pbr/ground/cloudy-veined-quartz-light-bl/cloudy-veined-quartz-light_normal-ogl.png",
  "public/assets/pbr/ground/cloudy-veined-quartz-light-bl/cloudy-veined-quartz-light_roughness.png",
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
  "qa-no-snow",
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
  "frameloop={renderEnabled ? \"always\" : \"demand\"}",
  "failIfMajorPerformanceCaveat",
  "PolarObservatoryDome",
  "SealAvatar",
  "IglooTerrain",
  "SnowAtmosphere",
  "IglooTouch",
  "IglooArtifacts",
  "ActiveTheoryVeil",
  "TopologyConstellation",
  "HorizontalParallaxSignalField",
  "PolarSmashables",
  "WORLD_RENDER_WINDOW_NOTE",
  "OBSERVATORY_HOME_X",
  "OBSERVATORY_VISUAL_HOME_X",
  "debugFlags",
  "!debugFlags.noDome",
  "!debugFlags.noSnow",
  "renderEnabled",
  "sealAwake",
  "axisX",
  "depthZ",
  "onTouchIgloo",
]) {
  expectIncludes("components/IglooScene.jsx", iglooScene, scenePrimitive, `scene must expose ${scenePrimitive}`);
}
expectNoPattern("components/IglooScene.jsx", iglooScene, /function ObservatoryDome|gridHelper/i, "scene must not mount the rejected helper-grid dome path");

for (const domePrimitive of [
  "DOME_PANEL_ROWS",
  "DOME_TILE_COLUMNS_BY_ROW",
  "PolarObservatoryDome",
  "BLENDKIT_REFERENCE_ASSET_BASE_ID",
  "DataTexture",
  "Antarctic geodesic science radome",
  "white-quilted-fabric",
  "curved-thick-dome-brick",
  "DomeBrickFaceMaterial",
  "useDomeBrickTextureBundle",
]) {
  expectIncludes("components/PolarObservatoryDome.jsx", polarObservatoryDome, domePrimitive, `polar observatory dome must define ${domePrimitive}`);
}

for (const terrainPrimitive of [
  "IglooTerrain",
  "TERRAIN_CHUNK_COUNT",
  "TERRAIN_CHUNK_SIZE",
  "recursive Antarctic floor material tile",
  "cloudy-veined-quartz-light_normal-ogl.png",
  "RepeatWrapping",
  "MountainRidge",
]) {
  expectIncludes("components/IglooTerrain.jsx", iglooTerrain, terrainPrimitive, `terrain must define ${terrainPrimitive}`);
}

for (const snowPrimitive of [
  "SnowAtmosphere",
  "SNOW_ATMOSPHERE_MODE",
  "bounded falling snow",
  "PointsMaterial",
  "useFrame",
]) {
  expectIncludes("components/SnowAtmosphere.jsx", snowAtmosphere, snowPrimitive, `snow atmosphere must define ${snowPrimitive}`);
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

for (const sdfPrimitive of [
  "CompositeSdfSeal",
  "smin",
  "sdfSeal",
  "sealGradient",
  "normal-based edge",
  "SDF_COLLISION_PROBES",
  "rigidBodyBridge",
  "F(p)",
  "fragmentShader",
]) {
  expectIncludes("components/SdfSealMascot.jsx", sdfSealMascot, sdfPrimitive, `legacy mathematical SDF seal must retain ${sdfPrimitive}`);
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
  "station-profile-rail",
  "station-profile-chip",
  "artifact.handle",
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
expectIncludes("components/LiveRadar.jsx", liveRadar, "liveSummary", "LiveRadar must render server-provided live GitHub summary");
expectIncludes("components/ProjectIndex.jsx", projectIndex, "Epsilon-Hollow", "ProjectIndex must expose Teerth flagship systems");
expectIncludes("components/EvidenceArchive.jsx", evidenceArchive, "triton-lang/triton", "EvidenceArchive must include upstream evidence");
expectIncludes("data/project-intelligence.json", corpus, "Epsilon-Hollow", "project intelligence corpus must be copied");
expectIncludes("lib/github-live.js", github, "research-snapshot", "GitHub fetcher must expose snapshot fallback");
expectIncludes("lib/github-live.js", github, "https://api.github.com/users/teerthsharma", "GitHub fetcher must call Teerth public API");

if (failures.length) {
  console.error("Teerth portfolio contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Teerth portfolio contract passed.");
