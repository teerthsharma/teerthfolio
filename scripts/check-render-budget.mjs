import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import {
  OBSERVATORY_DOME_DEPARTURE_DISTANCE,
  shouldRenderObservatoryDome,
} from "../lib/polar-art-direction.js";
import { STATION_PERSONALITY_PROFILES } from "../lib/polar-station-personality.js";

const root = process.cwd();

function hexLuminance(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 0xff;
  const green = (value >> 8) & 0xff;
  const blue = value & 0xff;
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

const manifoldWorldColors = STATION_PERSONALITY_PROFILES["manifold-reactor"].palette.world.colors;
assert.ok(
  hexLuminance(manifoldWorldColors.base) >= 72
    && hexLuminance(manifoldWorldColors.secondary) >= 88,
  "Low-tier Manifold terrain must retain a readable blue floor after the bounded shadow toe",
);

assert.equal(
  shouldRenderObservatoryDome({
    destinationStationId: "s2-kernel-core",
    distanceFromHome: OBSERVATORY_DOME_DEPARTURE_DISTANCE + 0.01,
  }),
  false,
  "Observatory must unmount once an outbound route crosses its bounded departure distance",
);
assert.equal(
  shouldRenderObservatoryDome({
    destinationStationId: "observatory-plaque",
    distanceFromHome: OBSERVATORY_DOME_DEPARTURE_DISTANCE + 20,
  }),
  true,
  "Observatory must remain available throughout its selected approach route",
);
assert.equal(
  shouldRenderObservatoryDome({
    destinationStationId: "s2-kernel-core",
    distanceFromHome: OBSERVATORY_DOME_DEPARTURE_DISTANCE - 0.01,
  }),
  true,
  "Observatory must remain visible while an outbound traveler is still inside its home field",
);

const files = {
  world: readFileSync(join(root, "components", "IglooWorld.jsx"), "utf8"),
  page: readFileSync(join(root, "app", "page.jsx"), "utf8"),
  portfolioPage: readFileSync(join(root, "components", "PortfolioPage.jsx"), "utf8"),
  scene: readFileSync(join(root, "components", "IglooScene.jsx"), "utf8"),
  biome: readFileSync(join(root, "components", "PolarBiomeWorld.jsx"), "utf8"),
  biomeFields: readFileSync(join(root, "lib", "polar-biome-fields.js"), "utf8"),
  artifacts: readFileSync(join(root, "components", "IglooArtifacts.jsx"), "utf8"),
  dome: readFileSync(join(root, "components", "PolarObservatoryDome.jsx"), "utf8"),
  splash: readFileSync(join(root, "components", "SdfSealSplash.jsx"), "utf8"),
  nextConfig: readFileSync(join(root, "next.config.mjs"), "utf8"),
  terrain: readFileSync(join(root, "components", "IglooTerrain.jsx"), "utf8"),
  seal: readFileSync(join(root, "components", "SealAvatar.jsx"), "utf8"),
  snow: readFileSync(join(root, "components", "SnowAtmosphere.jsx"), "utf8"),
  splashShader: readFileSync(join(root, "components", "AntarcticSplashShader.jsx"), "utf8"),
  post: readFileSync(join(root, "components", "RetroCinematicPostProcess.jsx"), "utf8"),
  polarArtDirection: readFileSync(join(root, "lib", "polar-art-direction.js"), "utf8"),
  traversal: readFileSync(join(root, "lib", "polar-traversal.js"), "utf8"),
  cinematicVerifier: readFileSync(join(root, "scripts", "verify-cinematic-render.mjs"), "utf8"),
};

const checks = [
  {
    name: "plain safe mode waits for explicit user probe",
    file: files.world,
    pattern: /safe=1[\s\S]*wait for an explicit user probe[\s\S]*safe-boot[\s\S]*GPU probe waiting for Start exploring[\s\S]*gpu-probe-manual-start/,
  },
  {
    name: "only explicit safe QA auto-probe URLs start a diagnostic GPU probe",
    file: files.world,
    pattern: /QA_AUTO_PROBE_RENDER_QUERY[\s\S]*query\.has\(QA_AUTO_PROBE_RENDER_QUERY\)[\s\S]*gpu-probe-qa-auto-start[\s\S]*setSdfRenderEnabled\(true\)[\s\S]*SAFE_QA_AUTO_PROBE_DELAY_MS/,
  },
  {
    name: "generic qa cachebusters do not auto-start safe WebGL",
    file: `${files.world}\n${readFileSync(join(root, "scripts", "verify-cinematic-render.mjs"), "utf8")}`,
    pattern: /const QA_AUTO_PROBE_RENDER_QUERY = "qa-auto-probe";(?![\s\S]*const QA_RENDER_QUERY)[\s\S]*safe=1&qa=cachebuster/,
  },
  {
    name: "safe query has a single render-mode source of truth",
    file: files.world,
    pattern: /function isSafeRenderQuery[\s\S]*effectiveSafeMode/,
  },
  {
    name: "server passes initial query state into the world",
    file: `${files.page}\n${files.portfolioPage}\n${files.world}`,
    pattern: /initialWorldQuery[\s\S]*initialQuery[\s\S]*initialSafeMode/,
  },
  {
    name: "safe gate can start a visible GPU diagnostic probe",
    file: `${files.world}\n${files.splash}`,
    pattern: /DiagnosticPanel[\s\S]*GpuErrorBoundary[\s\S]*diagnosticEvents[\s\S]*requestRenderAccess[\s\S]*requestFullscreen[\s\S]*wakeLock[\s\S]*probeWebglCapability[\s\S]*onClick=\{requestRenderAccess\}/,
  },
  {
    name: "safe probe keeps WebGL readback visible",
    file: files.scene,
    pattern: /preserveDrawingBuffer[\s\S]*safe=1/,
  },
  {
    name: "generic browser errors do not demote the WebGL renderer",
    file: files.world,
    pattern: /FATAL_RENDER_EVENT_TYPES[\s\S]*webgl-context-lost[\s\S]*severity === "error" && FATAL_RENDER_EVENT_TYPES\.has\(diagnostic\.type\)/,
  },
  {
    name: "scene reports WebGL lifecycle and first rendered frame into diagnostics",
    file: files.scene,
    pattern: /SceneDiagnostics[\s\S]*webglcontextlost[\s\S]*onGpuEvent[\s\S]*webgl-scene-ready[\s\S]*onCanvasCreated[\s\S]*igloo-scene-canvas[\s\S]*webgl-created[\s\S]*onCreated=\{onCanvasCreated\}/,
  },
  {
    name: "cinematic verifier fails every result family on fatal browser diagnostics",
    file: files.cinematicVerifier,
    pattern: /function fatalBrowserLog[\s\S]*ReadPixels[\s\S]*return false[\s\S]*pageerror[\s\S]*window-error[\s\S]*function fatalLogFailures[\s\S]*result\.failures = \[\.\.\.assertSafeGate\(result\), \.\.\.fatalLogFailures\(result\)\][\s\S]*result\.failures = \[\.\.\.assertViewport\(result\), \.\.\.fatalLogFailures\(result\)\][\s\S]*result\.failures = \[\.\.\.assertSection\(result\), \.\.\.fatalLogFailures\(result\)\]/,
  },
  {
    name: "mobile cinematic rail proof checks route initiation and completed S2 focus",
    file: files.cinematicVerifier,
    pattern: /async function verifyRailTap[\s\S]*presentationPhase === "moving"[\s\S]*data-docked-station="s2-kernel-core"[\s\S]*arrivalActive[\s\S]*arrivalCurrent[\s\S]*arrivalFocused[\s\S]*arrivalReadout[\s\S]*arrivedDocked[\s\S]*pendingDestination[\s\S]*routeMoving/,
  },
  {
    name: "observatory dataset updates are isolated from stable WebGL lifecycle listeners",
    file: files.scene,
    pattern: /function syncSceneDiagnosticsDataset[\s\S]*observatoryDomeDistance[\s\S]*observatoryDomeVisible[\s\S]*function SceneDiagnostics[\s\S]*syncSceneDiagnosticsDataset[\s\S]*\[gl, observatoryDistance, observatoryDomeVisible, quality, reducedMotion\][\s\S]*addEventListener\("webglcontextlost"[\s\S]*removeEventListener\("webglcontextlost"[\s\S]*\[gl, onGpuEvent\]/,
  },
  {
    name: "public render-enabled state waits for the first rendered WebGL frame",
    file: files.world,
    pattern: /sceneReady[\s\S]*publicRenderEnabled[\s\S]*webgl-scene-ready[\s\S]*setSceneReady\(true\)[\s\S]*data-render-enabled=\{publicRenderEnabled/,
  },
  {
    name: "live scene suspense never projects a world-space fallback silhouette",
    file: files.scene,
    pattern: /<Suspense fallback=\{null\}>/,
  },
  {
    name: "splash gate renders the authored radial-wave threshold without a mascot layer",
    file: files.splash,
    pattern: /^(?![\s\S]*sdf-gate-seal)[\s\S]*SPLASH_GATE_PROFILE[\s\S]*AntarcticSplashShader[\s\S]*sdf-render-button/,
  },
  {
    name: "splash gate uses a bounded WebGL Antarctica shader separate from the heavy scene",
    file: `${files.splash}\n${files.splashShader}\n${readFileSync(join(root, "scripts", "verify-cinematic-render.mjs"), "utf8")}`,
    pattern: /AntarcticSplashShader[\s\S]*SPLASH_SHADER_PROFILE[\s\S]*sdf-splash-shader-canvas[\s\S]*classList\.contains\("sdf-splash-shader-canvas"\)/,
  },
  {
    name: "splash copy is viewport bounded",
    file: readFileSync(join(root, "app", "globals.css"), "utf8"),
    pattern: /max-width:\s*min\(58ch,\s*100%\)/,
  },
  {
    name: "local dev chrome does not inject visual noise",
    file: files.nextConfig,
    pattern: /devIndicators:\s*false/,
  },
  {
    name: "WASD activates renderer without arrow activation",
    file: files.world,
    pattern: /WASD_KEYS\s*=\s*new Set\(\["w", "a", "s", "d"\]\)/,
  },
  {
    name: "renderer has explicit start function",
    file: files.world,
    pattern: /startExplorationRender/,
  },
  {
    name: "world exposes a real high contrast render state",
    file: `${files.world}\n${readFileSync(join(root, "components", "IglooHud.jsx"), "utf8")}\n${readFileSync(join(root, "app", "globals.css"), "utf8")}\n${readFileSync(join(root, "scripts", "verify-cinematic-render.mjs"), "utf8")}`,
    pattern: /data-high-contrast[\s\S]*aria-pressed=\{highContrast\}[\s\S]*igloo-contrast-toggle[\s\S]*data-high-contrast="true"[\s\S]*verify-contrast/,
  },
  {
    name: "legacy CPU atmosphere is removed in favor of singular GPU biome weather",
    file: `${files.world}\n${files.biome}\n${files.biomeFields}`,
    pattern: /IglooWorld(?![\s\S]*useAtmosphereCanvas)(?![\s\S]*igloo-atmosphere-canvas)[\s\S]*resolveNearestWeather[\s\S]*weatherOwners:\s*1/,
  },
  {
    name: "idle world loop is capped",
    file: files.world,
    pattern: /IDLE_WORLD_FRAME_MS/,
  },
  {
    name: "debug flags can isolate every currently mounted expensive subsystem",
    file: files.world,
    pattern: /qa-no-dome[\s\S]*qa-no-veil[\s\S]*qa-no-terrain[\s\S]*qa-no-signals[\s\S]*qa-no-smashables[\s\S]*qa-no-dressing[\s\S]*noDressing[\s\S]*qa-no-mechanisms[\s\S]*noMechanisms/,
  },
  {
    name: "world uses bounded render-window note",
    file: files.scene,
    pattern: /WORLD_RENDER_WINDOW_NOTE/,
  },
  {
    name: "terrain chunk count remains bounded",
    file: files.terrain,
    pattern: /TERRAIN_CHUNK_COUNT\s*=\s*7/,
  },
  {
    name: "terrain active chunk count degrades by quality",
    file: files.terrain,
    pattern: /activeChunkCount\s*=\s*quality === "low" \? 3 : quality === "medium" \? 5 : TERRAIN_CHUNK_COUNT/,
  },
  {
    name: "terrain material stays in uplifting polar range",
    file: files.terrain,
    pattern: /TERRAIN_MATERIAL_COLOR\s*=\s*POLAR_PALETTE\.polarIvory/,
  },
  {
    name: "terrain surface stays clean and subordinate",
    file: files.terrain,
    pattern: /CLEAN_POLAR_SURFACE_PROFILE[\s\S]*texture subordinate to stations[\s\S]*ANIME_TERRAIN_SHADER_PROFILE[\s\S]*texture\.repeat\.set\(7\.2, 5\.4\)[\s\S]*new THREE\.MeshToonMaterial[\s\S]*normalScale:\s*new THREE\.Vector2\(0\.0025, 0\.0025\)/,
  },
  {
    name: "terrain uses recycled material tile label",
    file: files.terrain,
    pattern: /recursive Antarctic floor material tile/,
  },
  {
    name: "snow particle count is quality bounded",
    file: files.snow,
    pattern: /quality === "low" \? 90 : quality === "medium" \? 150 : 230/,
  },
  {
    name: "snow resources are disposed on unmount",
    file: files.snow,
    pattern: /geometry\.dispose\(\)[\s\S]*material\.dispose\(\)/,
  },
  {
    name: "ground fog stays uplifting and translucent",
    file: files.snow,
    pattern: /POLAR_GROUND_FOG_PROFILE[\s\S]*uplifting translucent[\s\S]*0\.034[\s\S]*color="#bdefff"/,
  },
  {
    name: "smashables only render during active movement",
    file: files.scene,
    pattern: /renderEnabled && moving && !debugFlags\.noSmashables/,
  },
  {
    name: "polar dome rows remain finite",
    file: files.dome,
    pattern: /DOME_PANEL_ROWS\s*=\s*POLAR_DOME_LATTICE_TIERS\.medium\.ringCount/,
  },
  {
    name: "polar dome keeps bounded tile columns",
    file: files.dome,
    pattern: /DOME_TILE_COLUMNS_BY_ROW\s*=\s*POLAR_DOME_LATTICE_COUNTS\.medium\.ringColumns/,
  },
  {
    name: "polar dome remains intact until deliberate impact",
    file: files.dome,
    pattern: /DOME_COLLISION_MODE[\s\S]*intact by default[\s\S]*DOME_WEIGHTED_CONTACT_PROFILE[\s\S]*angularLimitRadians:\s*0\.012[\s\S]*displacementLimit:\s*POLAR_DOME_INTERACTION_PROFILE\.maxDisplacement[\s\S]*Math\.abs\(axisVelocity\) - 0\.72/,
  },
  {
    name: "polar dome is one continuous premium shader-course shell",
    file: files.dome,
    pattern: /DOME_INTACT_SHELL_PROFILE[\s\S]*one continuous inner weather shell[\s\S]*ContinuousDomeTopology[\s\S]*sphereGeometry[\s\S]*ContinuousDomeIceMaterial/,
  },
  {
    name: "polar dome calculates staggered courses and anti-aliased recessed joints",
    file: files.dome,
    pattern: /DOME_BRICK_SHADER_PROFILE[\s\S]*domeCourse[\s\S]*domeColumn[\s\S]*fwidth\(domeJointDistance\)[\s\S]*domeMortar[\s\S]*domeBevelBand/,
  },
  {
    name: "polar dome full tier uses bounded low-pass crystal math",
    file: files.dome,
    pattern: /DOME_CRYSTAL_GROWTH_PROFILE[\s\S]*amplitude \*= 0\.35[\s\S]*customProgramCacheKey[\s\S]*DOME_FULL_QUALITY/,
  },
  {
    name: "polar dome forbids texture assets",
    file: files.dome,
    pattern: /DOME_TEXTURE_POLICY[\s\S]*zero image textures/,
  },
  {
    name: "polar dome publishes a bounded instanced construction contract",
    file: files.dome,
    pattern: /DOME_CONTINUOUS_DRAW_CALL_PROFILE[\s\S]*continuousShellCalls:\s*1[\s\S]*shellBlockInstanceCalls:\s*1[\s\S]*airlockBlockInstanceCalls:\s*1[\s\S]*maxFullFrameCalls:\s*8/,
  },
  {
    name: "polar dome uses real curved instanced blocks at full density",
    file: files.dome,
    pattern: /DOME_INSTANCED_CONSTRUCTION_PROFILE[\s\S]*shellBlocksByQuality:[\s\S]*POLAR_DOME_LATTICE_COUNTS\.high\.visibleCells[\s\S]*POLAR_DOME_LATTICE_COUNTS\.medium\.visibleCells[\s\S]*RoundedBoxGeometry[\s\S]*setMatrixAt[\s\S]*InstancedDomeBlocks/,
  },
  {
    name: "polar dome merges a tier-bounded meridian network",
    file: files.dome,
    pattern: /createLatticeSkeletonGeometry[\s\S]*lattice\.ribs[\s\S]*lattice\.ringSeams[\s\S]*lattice\.baseRing\.segments[\s\S]*TubeGeometry[\s\S]*mergeGeometries/,
  },
  {
    name: "scene mounts the premium polar observatory dome",
    file: files.scene,
    pattern: /PolarObservatoryDome[\s\S]*homePosition[\s\S]*OBSERVATORY_WORLD\.center/,
  },
  {
    name: "seal remains a math-labeled avatar",
    file: files.seal,
    pattern: /SEAL_AVATAR_FORMULA[\s\S]*SEAL_NORMAL_FIELD_PROFILE[\s\S]*SealNormalField/,
  },
  {
    name: "seal carries a premium guide faceplate and pointer",
    file: files.seal,
    pattern: /SEAL_GUIDE_FACEPLATE_PROFILE[\s\S]*seal-guide-faceplate[\s\S]*seal-guide-pointer/,
  },
  {
    name: "seal has a premium SDF silhouette rim",
    file: files.seal,
    pattern: /SEAL_PREMIUM_SILHOUETTE_PROFILE[\s\S]*inked SDF silhouette rim[\s\S]*rimMaterial[\s\S]*SealBody \$/ ,
  },
  {
    name: "seal bearing ray points at active station",
    file: files.seal,
    pattern: /SEAL_STATION_BEARING_PROFILE[\s\S]*STATION_WORLD_SCHEMA[\s\S]*stationWorld\?\.center\.x[\s\S]*bearingAngle[\s\S]*bearingRayRef\.current\.scale\.y/,
  },
  {
    name: "seal exposes an active station guide beacon",
    file: files.seal,
    pattern: /SEAL_GUIDE_BEACON_PROFILE[\s\S]*beaconRef[\s\S]*seal-guide-beacon[\s\S]*activeArtifact\?\.shortLabel/,
  },
  {
    name: "seal only mounts after explicit wake",
    file: files.scene,
    pattern: /renderEnabled && sealAwake && !debugFlags\.noSeal/,
  },
  {
    name: "scene uses one explicit biome-driven light and fog authority",
    file: `${files.scene}\n${files.biome}`,
    pattern: /SCENE_LIGHT_BUDGET\s*=\s*"two biome-driven directionals plus quiet ambient hemisphere"[\s\S]*PolarBiomeWorld[\s\S]*keyLightRef[\s\S]*fillLightRef[\s\S]*scene\.fog/,
  },
  {
    name: "biome compositor owns bounded terrain sky geography and singular weather",
    file: `${files.biomeFields}\n${files.biome}`,
    pattern: /POLAR_BIOME_SHADER_POLICY[\s\S]*textures:\s*0[\s\S]*maxCompiledPrograms:\s*2[\s\S]*maxDrawCalls:\s*3[\s\S]*weatherOwners:\s*1[\s\S]*new THREE\.InstancedMesh/,
  },
  {
    name: "scene removes redundant opaque world and weather owners",
    file: files.scene,
    pattern: /PolarBiomeWorld(?![\s\S]*<PolarGradientSky)(?![\s\S]*<IglooTerrain)(?![\s\S]*<SnowAtmosphere)(?![\s\S]*<PolarAtmosphereField)(?![\s\S]*<HorizontalParallaxSignalField)/,
  },
  {
    name: "scene has a single bounded global anime depth post shader pass",
    file: `${files.scene}\n${files.post}`,
    pattern: /RetroCinematicPostProcess[\s\S]*GLOBAL_ANIME_POST_PROFILE[\s\S]*anime-soft depth pixel fog[\s\S]*gaussianEdgeConfidence[\s\S]*depthEdgeConfidence[\s\S]*chromaticEdgeAA[\s\S]*toonQuantize[\s\S]*DepthTexture[\s\S]*useFrame/,
  },
  {
    name: "anime post quality tiers retain exact bounded effect caps",
    file: `${files.post}\n${files.polarArtDirection}`,
    pattern: /POST_PROCESS_BUDGET[\s\S]*low:[\s\S]*scale:\s*0\.82[\s\S]*fisheye:\s*0[\s\S]*chroma:\s*0[\s\S]*ink:\s*0\.08[\s\S]*scanline:\s*0[\s\S]*pixel:\s*1[\s\S]*quantize:\s*0\.12[\s\S]*gradeBase:\s*0\.04[\s\S]*gradeCurve:\s*0\.9[\s\S]*medium:[\s\S]*scale:\s*0\.94[\s\S]*fisheye:\s*0\.003[\s\S]*chroma:\s*0\.55[\s\S]*ink:\s*0\.14[\s\S]*scanline:\s*0\.004[\s\S]*pixel:\s*1\.7[\s\S]*quantize:\s*0\.18[\s\S]*gradeBase:\s*0\.49[\s\S]*gradeCurve:\s*0\.4[\s\S]*high:[\s\S]*scale:\s*1[\s\S]*fisheye:\s*0\.005[\s\S]*chroma:\s*0\.8[\s\S]*ink:\s*0\.18[\s\S]*scanline:\s*0\.007[\s\S]*pixel:\s*2\.2[\s\S]*quantize:\s*0\.24[\s\S]*gradeBase:\s*0\.52[\s\S]*gradeCurve:\s*0\.4/,
  },
  {
    name: "low-tier paper grade restores a bounded luminance toe without dimming highlights",
    file: `${files.post}\n${files.polarArtDirection}`,
    pattern: /uShadowSeparation[\s\S]*paperShadowSeparation[\s\S]*smoothstep\(0\.18, 0\.46[\s\S]*highlightMask[\s\S]*low:[\s\S]*shadowSeparation:\s*0\.24[\s\S]*medium:[\s\S]*shadowSeparation:\s*0[\s\S]*high:[\s\S]*shadowSeparation:\s*0/,
  },
  {
    name: "non-igloo stations expose active playable object behaviors",
    file: files.artifacts,
    pattern: /STATION_INTERACTION_PROFILE[\s\S]*s2-kernel-core interactive gyroscope[\s\S]*manifold-reactor phase beads[\s\S]*field-chamber-coils charge gates[\s\S]*qpu-ice-bridge qubit stepping stones[\s\S]*upstream-radio-mast live signal sweep[\s\S]*StationInteractionRig/,
  },
  {
    name: "featured stations use uplifting colors and elevated grid pedestals",
    file: files.artifacts,
    pattern: /UPLIFTING_STATION_COLOR_PROFILE[\s\S]*S2 blue[\s\S]*Aether violet[\s\S]*Field amber[\s\S]*QPU mint[\s\S]*Upstream coral-green[\s\S]*STATION_GRID_ELEVATION_PROFILE[\s\S]*FEATURED_STATION_IDS[\s\S]*floating-grid-pedestal[\s\S]*subjectLift/,
  },
  {
    name: "world adopts deterministic bounded traversal with damped camera and offscreen suspension",
    file: `${files.traversal}\n${files.world}\n${files.scene}`,
    pattern: /FIXED_STEP_SECONDS = 1 \/ 120[\s\S]*MAX_SUBSTEPS = 8[\s\S]*routeTraversalToStation[\s\S]*advanceTraversalFrame[\s\S]*OFFSCREEN_GPU_RELEASE_DELAY_MS = (?:1\d{2}|2[0-5]\d)[\s\S]*traversalPoseRef[\s\S]*IntersectionObserver[\s\S]*CAMERA_DAMPING_PROFILE[\s\S]*Math\.exp\(-delta[\s\S]*frameloop=\{worldActive[\s\S]*"never"/,
  },
  {
    name: "world loading combines Abeto fullscreen stream with Bruno evidence axis",
    file: `${files.world}\n${files.splash}\n${readFileSync(join(root, "app", "globals.css"), "utf8")}`,
    pattern: /OPEN_WORLD_LOADING_PROFILE[\s\S]*Abeto fullscreen in-place world stream plus Bruno horizontal evidence index fallback[\s\S]*OpenWorldLoadingBridge[\s\S]*data-loading-model="abeto-fullscreen-world bruno-horizontal-index"[\s\S]*data-scroll-model="webgl-open-xz-world horizontal-evidence-axis"[\s\S]*OPEN_WORLD_GATE_PROFILE[\s\S]*fullscreen world stream first, horizontal evidence index remains reachable[\s\S]*open-world-loading-bridge/,
  },
];

let failed = false;

for (const check of checks) {
  if (!check.pattern.test(check.file)) {
    failed = true;
    console.error(`render-budget check failed: ${check.name}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`render-budget contract passed: ${checks.length} checks`);
