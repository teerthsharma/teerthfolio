import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");
const biome = read("components", "PolarBiomeWorld.jsx");
const biomeFields = read("lib", "polar-biome-fields.js");
const scene = read("components", "IglooScene.jsx");
const post = read("components", "RetroCinematicPostProcess.jsx");
const attribution = read("docs", "research", "igloo-reference-effects-attribution.md");

const checks = [
  ["scene mounts the canonical textureless biome atmosphere", scene, /PolarBiomeWorld[\s\S]*travelerRef=\{traversalPoseRef\}[\s\S]*visible=\{worldActive\}/],
  ["scene removes the redundant global mist and snow owners", scene, /PolarBiomeWorld(?![\s\S]*<PolarAtmosphereField)(?![\s\S]*<SnowAtmosphere)/],
  ["terrain and geography share an instanced solid program with no texture dependency", biome, /THREE\.ShaderMaterial[\s\S]*new THREE\.InstancedMesh[\s\S]*new THREE\.InstancedMesh/],
  // Medium was 24 and is now 32, matching high. That was deliberate and the reason is
  // recorded next to the values: "Medium carries high's content. The world is fill-bound,
  // so geometry and shader detail are close to free while resolution is not." This
  // assertion was left behind because this script is an orphan — not in `npm run build`
  // and with no npm alias — so nothing ran it and nobody saw it go stale. It was
  // reporting a deliberate, documented improvement as a failure.
  ["quality budget preserves authored medium and high geography", biomeFields, /low:[\s\S]*geographyInstances:\s*0[\s\S]*medium:[\s\S]*geographyInstances:\s*32[\s\S]*high:[\s\S]*geographyInstances:\s*32/],
  ["only nearest biome owns GPU-uniform weather", `${biome}\n${biomeFields}`, /resolveNearestWeather[\s\S]*uWeatherFieldKind[\s\S]*uWeatherStrength[\s\S]*weatherOwners:\s*1/],
  ["post process keeps no pointer spotlight or lens", post, /export const POINTER_VISUAL_EFFECTS = "none"/],
  ["technique attribution names only the supplied sources", attribution, /codesandbox\.io[\s\S]*github\.com\/pmndrs\/drei[\s\S]*awwwards\.com\/igloo-inc-case-study/],
];

let failed = false;
for (const [name, source, pattern] of checks) {
  if (!pattern.test(source)) {
    failed = true;
    console.error(`igloo-reference-effects check failed: ${name}`);
  }
}

for (const forbidden of [
  /POLAR_POINTER_FIELD/,
  /uPointer/,
  /pointerBrightPass/,
  /addEventListener\("pointermove"/,
  /pointer-distance displacement/,
]) {
  assert.doesNotMatch(post, forbidden, `pointer visual effect must be absent: ${forbidden}`);
}

if (failed) process.exit(1);
console.log(`igloo-reference-effects contract passed: ${checks.length} checks`);
