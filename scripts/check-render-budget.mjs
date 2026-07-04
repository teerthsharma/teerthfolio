import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const files = {
  world: readFileSync(join(root, "components", "IglooWorld.jsx"), "utf8"),
  page: readFileSync(join(root, "app", "page.jsx"), "utf8"),
  portfolioPage: readFileSync(join(root, "components", "PortfolioPage.jsx"), "utf8"),
  scene: readFileSync(join(root, "components", "IglooScene.jsx"), "utf8"),
  artifacts: readFileSync(join(root, "components", "IglooArtifacts.jsx"), "utf8"),
  dome: readFileSync(join(root, "components", "PolarObservatoryDome.jsx"), "utf8"),
  splash: readFileSync(join(root, "components", "SdfSealSplash.jsx"), "utf8"),
  nextConfig: readFileSync(join(root, "next.config.mjs"), "utf8"),
  terrain: readFileSync(join(root, "components", "IglooTerrain.jsx"), "utf8"),
  seal: readFileSync(join(root, "components", "SealAvatar.jsx"), "utf8"),
  snow: readFileSync(join(root, "components", "SnowAtmosphere.jsx"), "utf8"),
  splashShader: readFileSync(join(root, "components", "AntarcticSplashShader.jsx"), "utf8"),
  post: readFileSync(join(root, "components", "RetroCinematicPostProcess.jsx"), "utf8"),
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
    name: "public render-enabled state waits for the first rendered WebGL frame",
    file: files.world,
    pattern: /sceneReady[\s\S]*publicRenderEnabled[\s\S]*webgl-scene-ready[\s\S]*setSceneReady\(true\)[\s\S]*data-render-enabled=\{publicRenderEnabled/,
  },
  {
    name: "scene has visible asset suspense fallback",
    file: files.scene,
    pattern: /RendererFallback[\s\S]*asset-suspense[\s\S]*<Suspense fallback=\{<RendererFallback/,
  },
  {
    name: "splash gate renders a premium object poster",
    file: files.splash,
    pattern: /SPLASH_GATE_PROFILE[\s\S]*sdf-splash-art[\s\S]*sdf-dome-tile[\s\S]*F\(p\)[\s\S]*grad F -&gt; impulse/,
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
    name: "atmosphere loop is capped",
    file: files.world,
    pattern: /ATMOSPHERE_FRAME_MS/,
  },
  {
    name: "idle world loop is capped",
    file: files.world,
    pattern: /IDLE_WORLD_FRAME_MS/,
  },
  {
    name: "debug flags can remove expensive subsystems",
    file: files.world,
    pattern: /qa-no-dome[\s\S]*qa-no-veil[\s\S]*qa-no-terrain[\s\S]*qa-no-signals[\s\S]*qa-no-smashables[\s\S]*qa-no-snow/,
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
    pattern: /TERRAIN_MATERIAL_COLOR\s*=\s*"#d7f4f2"/,
  },
  {
    name: "terrain surface stays clean and subordinate",
    file: files.terrain,
    pattern: /CLEAN_POLAR_SURFACE_PROFILE[\s\S]*texture subordinate to stations[\s\S]*texture\.repeat\.set\(7\.2, 5\.4\)[\s\S]*normalScale:\s*new THREE\.Vector2\(0\.003, 0\.003\)/,
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
    pattern: /DOME_PANEL_ROWS\s*=\s*8/,
  },
  {
    name: "polar dome keeps bounded tile columns",
    file: files.dome,
    pattern: /DOME_TILE_COLUMNS_BY_ROW\s*=\s*\[6, 8, 10, 12, 14, 16, 18, 20\]/,
  },
  {
    name: "polar dome remains intact until deliberate impact",
    file: files.dome,
    pattern: /DOME_COLLISION_MODE[\s\S]*intact by default[\s\S]*Math\.abs\(axisVelocity\) - 0\.72/,
  },
  {
    name: "polar dome fills tile gaps with a continuous premium shell",
    file: files.dome,
    pattern: /DOME_INTACT_SHELL_PROFILE[\s\S]*continuous luminous ice shell[\s\S]*sphereGeometry args=\{\[1, 56, 18[\s\S]*opacity=\{0\.38\}/,
  },
  {
    name: "polar dome tiles use warped pillow geometry instead of flat rectangles",
    file: files.dome,
    pattern: /DOME_TILE_GEOMETRY_PROFILE[\s\S]*procedural crystal-growth ice brick[\s\S]*uSegments = 7[\s\S]*vSegments = 5[\s\S]*edgeFalloff[\s\S]*cornerTuck[\s\S]*crystalFacet/,
  },
  {
    name: "polar dome faces use a browser-native crystal ice shader",
    file: files.dome,
    pattern: /DOME_CRYSTAL_GROWTH_PROFILE[\s\S]*DOME_BRICK_SHADER_PROFILE[\s\S]*onBeforeCompile[\s\S]*domeIceHash[\s\S]*customProgramCacheKey/,
  },
  {
    name: "polar dome shares texture bundle generation",
    file: files.dome,
    pattern: /useDomeBrickTextureBundle/,
  },
  {
    name: "scene mounts the premium polar observatory dome",
    file: files.scene,
    pattern: /PolarObservatoryDome[\s\S]*OBSERVATORY_VISUAL_HOME_X/,
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
    pattern: /SEAL_STATION_BEARING_PROFILE[\s\S]*SEAL_WORLD_LOOP_LENGTH[\s\S]*activeArtifact\.position\[0\][\s\S]*bearingAngle[\s\S]*bearingRayRef\.current\.scale\.y/,
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
    name: "scene has an explicit uplifted polar PBR light budget",
    file: files.scene,
    pattern: /SCENE_LIGHT_BUDGET\s*=\s*"uplifted-polar-pbr"/,
  },
  {
    name: "scene has a single bounded global retro post shader pass",
    file: `${files.scene}\n${files.post}`,
    pattern: /RetroCinematicPostProcess[\s\S]*GLOBAL_RETRO_POST_PROFILE[\s\S]*toon quantization[\s\S]*chromatic AA[\s\S]*depth pixel fog[\s\S]*gaussian edge ink[\s\S]*scanline fisheye vignette[\s\S]*DepthTexture[\s\S]*useFrame/,
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
    name: "world adopts Abeto-style damped fullscreen motion architecture",
    file: `${files.world}\n${files.scene}`,
    pattern: /ABETO_REFERENCE_MOTION_PROFILE[\s\S]*hidden document scroll[\s\S]*damped axis\/depth targets[\s\S]*station focus transitions[\s\S]*axisTargetRef[\s\S]*depthTargetRef[\s\S]*smoothDamp[\s\S]*CAMERA_DAMPING_PROFILE[\s\S]*Math\.exp\(-delta/,
  },
  {
    name: "world loading combines Abeto fullscreen stream with Bruno evidence axis",
    file: `${files.world}\n${files.splash}\n${readFileSync(join(root, "app", "globals.css"), "utf8")}`,
    pattern: /OPEN_WORLD_LOADING_PROFILE[\s\S]*Abeto fullscreen in-place world stream plus Bruno horizontal evidence index fallback[\s\S]*OpenWorldLoadingBridge[\s\S]*data-loading-model="abeto-fullscreen-world bruno-horizontal-index"[\s\S]*data-scroll-model="webgl-infinite-axis horizontal-evidence-axis"[\s\S]*OPEN_WORLD_GATE_PROFILE[\s\S]*fullscreen world stream first, horizontal evidence index remains reachable[\s\S]*open-world-loading-bridge/,
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
