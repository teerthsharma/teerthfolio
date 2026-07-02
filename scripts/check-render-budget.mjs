import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const files = {
  world: readFileSync(join(root, "components", "IglooWorld.jsx"), "utf8"),
  page: readFileSync(join(root, "app", "page.jsx"), "utf8"),
  portfolioPage: readFileSync(join(root, "components", "PortfolioPage.jsx"), "utf8"),
  scene: readFileSync(join(root, "components", "IglooScene.jsx"), "utf8"),
  dome: readFileSync(join(root, "components", "PolarObservatoryDome.jsx"), "utf8"),
  splash: readFileSync(join(root, "components", "SdfSealSplash.jsx"), "utf8"),
  nextConfig: readFileSync(join(root, "next.config.mjs"), "utf8"),
  terrain: readFileSync(join(root, "components", "IglooTerrain.jsx"), "utf8"),
  seal: readFileSync(join(root, "components", "SealAvatar.jsx"), "utf8"),
  snow: readFileSync(join(root, "components", "SnowAtmosphere.jsx"), "utf8"),
};

const checks = [
  {
    name: "safe mode boots before probing WebGL",
    file: files.world,
    pattern: /DIAGNOSTIC_BOOT_DELAY_MS[\s\S]*safe=1[\s\S]*gpu-probe-start|safe=1[\s\S]*DIAGNOSTIC_BOOT_DELAY_MS[\s\S]*gpu-probe-start/,
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
    pattern: /DiagnosticPanel[\s\S]*GpuErrorBoundary[\s\S]*diagnosticEvents[\s\S]*safeExitHref[\s\S]*href=/,
  },
  {
    name: "scene reports WebGL lifecycle into diagnostics",
    file: files.scene,
    pattern: /SceneDiagnostics[\s\S]*webgl-created[\s\S]*webglcontextlost[\s\S]*onGpuEvent/,
  },
  {
    name: "scene has visible asset suspense fallback",
    file: files.scene,
    pattern: /RendererFallback[\s\S]*asset-suspense[\s\S]*<Suspense fallback=\{<RendererFallback/,
  },
  {
    name: "splash gate renders a premium object poster",
    file: files.splash,
    pattern: /SPLASH_GATE_PROFILE[\s\S]*sdf-splash-art[\s\S]*sdf-dome-tile/,
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
    name: "terrain material stays in dark Antarctic range",
    file: files.terrain,
    pattern: /TERRAIN_MATERIAL_COLOR\s*=\s*"#5f787e"/,
  },
  {
    name: "terrain surface stays clean and subordinate",
    file: files.terrain,
    pattern: /CLEAN_POLAR_SURFACE_PROFILE[\s\S]*texture subordinate to observatory[\s\S]*texture\.repeat\.set\(7\.2, 5\.4\)[\s\S]*normalScale:\s*new THREE\.Vector2\(0\.01, 0\.01\)/,
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
    name: "smashables only render during active movement",
    file: files.scene,
    pattern: /renderEnabled && moving && !debugFlags\.noSmashables/,
  },
  {
    name: "polar dome rows remain finite",
    file: files.dome,
    pattern: /DOME_PANEL_ROWS\s*=\s*7/,
  },
  {
    name: "polar dome keeps bounded tile columns",
    file: files.dome,
    pattern: /DOME_TILE_COLUMNS_BY_ROW\s*=\s*\[4, 6, 8, 10, 12, 14, 16\]/,
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
    pattern: /SEAL_AVATAR_FORMULA/,
  },
  {
    name: "seal only mounts after explicit wake",
    file: files.scene,
    pattern: /renderEnabled && sealAwake && !debugFlags\.noSeal/,
  },
  {
    name: "scene has an explicit dark PBR light budget",
    file: files.scene,
    pattern: /SCENE_LIGHT_BUDGET\s*=\s*"dark-pbr-igloo"/,
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
