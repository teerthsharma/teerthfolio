import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const world = read("components/IglooWorld.jsx");
const splash = read("components/SdfSealSplash.jsx");
const splashShader = read("components/AntarcticSplashShader.jsx");
const blackHole = read("components/BlackHoleTransition.jsx");
const biome = read("components/PolarBiomeWorld.jsx");
const capabilityProbe = splash.slice(
  splash.indexOf("function probeWebglCapability"),
  splash.indexOf("export default function SdfSealSplash"),
);

const failures = [];

function contract(name, check) {
  try {
    check();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function expectMatch(source, pattern, message) {
  assert.ok(pattern.test(source), message);
}

contract("splash animation follows world visibility", () => {
  expectMatch(splash, /active\s*=\s*true/, "missing active prop");
  expectMatch(splash, /if\s*\(\s*!active\s*\)\s*return undefined/, "charge RAF ignores active=false");
  expectMatch(splash, /<AntarcticSplashShader\s+active=\{active\}\s*\/>/, "visibility does not reach splash shader");
});

contract("capability probe releases its one-shot WebGL context", () => {
  expectMatch(capabilityProbe, /WEBGL_lose_context/, "probe context is left live");
  expectMatch(capabilityProbe, /canvas\.width\s*=\s*0/, "probe canvas width is retained");
  expectMatch(capabilityProbe, /canvas\.height\s*=\s*0/, "probe canvas height is retained");
});

contract("splash shader releases its manual WebGL context", () => {
  expectMatch(splashShader, /active\s*=\s*true/, "missing active prop");
  expectMatch(splashShader, /WEBGL_lose_context/, "context is not explicitly lost");
  expectMatch(splashShader, /canvas\.width\s*=\s*0/, "width backing store is retained");
  expectMatch(splashShader, /canvas\.height\s*=\s*0/, "height backing store is retained");
  expectMatch(splashShader, /window\.cancelAnimationFrame\(raf\)/, "RAF is not cancelled");
});

contract("splash WebGL context is created only after React owns the canvas", () => {
  assert.doesNotMatch(splashShader, /INITIAL_SHADER_PRIMER|dangerouslySetInnerHTML/, "parser-time primer creates a context that is lost before hydration");
});

contract("splash context survives React Strict Mode effect replay", () => {
  expectMatch(splashShader, /contextReleaseTimerRef\s*=\s*useRef\(0\)/, "missing replay-safe release timer");
  expectMatch(splashShader, /window\.clearTimeout\(contextReleaseTimerRef\.current\)/, "active replay cannot cancel pending context loss");
  expectMatch(splashShader, /contextReleaseTimerRef\.current\s*=\s*window\.setTimeout/, "context loss is still synchronous in cleanup");
  expectMatch(splashShader, /canvas\.dataset\.webglLifecycleActive\s*=\s*"true"/, "active canvas is not marked across replay instances");
  expectMatch(splashShader, /canvas\.isConnected[\s\S]{0,120}webglLifecycleActive/, "pending cleanup cannot detect a live replayed canvas");
});

contract("black-hole renderer releases its manual WebGL context", () => {
  expectMatch(blackHole, /WEBGL_lose_context/, "context is not explicitly lost");
  expectMatch(blackHole, /canvas\.width\s*=\s*0/, "width backing store is retained");
  expectMatch(blackHole, /canvas\.height\s*=\s*0/, "height backing store is retained");
  expectMatch(blackHole, /window\.cancelAnimationFrame\(raf\)/, "RAF is not cancelled");
});

contract("black-hole context survives React Strict Mode effect replay", () => {
  expectMatch(blackHole, /contextReleaseTimerRef\s*=\s*useRef\(0\)/, "missing replay-safe release timer");
  expectMatch(blackHole, /window\.clearTimeout\(contextReleaseTimerRef\.current\)/, "active replay cannot cancel pending context loss");
  expectMatch(blackHole, /contextReleaseTimerRef\.current\s*=\s*window\.setTimeout/, "context loss is still synchronous in cleanup");
  expectMatch(blackHole, /canvas\.dataset\.webglLifecycleActive\s*=\s*"true"/, "active canvas is not marked across replay instances");
  expectMatch(blackHole, /canvas\.isConnected[\s\S]{0,120}webglLifecycleActive/, "pending cleanup cannot detect a live replayed canvas");
});

contract("world visibility gates every manually animated overlay", () => {
  expectMatch(world, /<SdfSealSplash[\s\S]*?active=\{worldInView\}/, "safe gate is not visibility-gated");
  expectMatch(world, /<BlackHoleTransition[\s\S]*?active=\{blackHoleActive\s*&&\s*worldInView\}/, "black hole is not visibility-gated");
});

contract("opaque archive portal pauses the main R3F renderer and traversal", () => {
  expectMatch(
    world,
    /const worldPresentationActive = worldInView && !blackHoleActive/,
    "world lacks one portal-aware presentation authority",
  );
  expectMatch(
    world,
    /worldActive=\{worldPresentationActive\}/,
    "archive portal does not switch the main R3F frameloop to never",
  );
  expectMatch(
    world,
    /useEffect\(\(\) => \{\s*if \(!worldPresentationActive\) return undefined;[\s\S]*?requestAnimationFrame\(tick\)/,
    "archive portal does not stop the traversal RAF",
  );
});

contract("offscreen biome unmount replaces the redundant manual atmosphere buffer", () => {
  assert.doesNotMatch(world, /useAtmosphereCanvas|igloo-atmosphere-canvas/, "manual atmosphere canvas still allocates a backing buffer");
  expectMatch(biome, /if \(!visible \|\| safeMode\) return null/, "biome GPU stage ignores visibility or safe mode");
  expectMatch(biome, /terrainGeometry\.dispose\(\)[\s\S]*skyGeometry\.dispose\(\)[\s\S]*solidMaterial\.dispose\(\)[\s\S]*skyMaterial\.dispose\(\)/, "biome resources are retained after unmount");
});

contract("R3F teardown begins early enough for Fiber's delayed context loss", () => {
  const match = world.match(/OFFSCREEN_GPU_RELEASE_DELAY_MS\s*=\s*(\d+)/);
  assert.ok(match, "missing OFFSCREEN_GPU_RELEASE_DELAY_MS");
  assert.ok(Number(match[1]) <= 250, `release begins after ${match[1]}ms; strict ceiling is 250ms`);
});

if (failures.length > 0) {
  console.error("GPU lifecycle contract failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("GPU lifecycle contract passed: offscreen RAFs, draws, backing buffers, and contexts are bounded.");
