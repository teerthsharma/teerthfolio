import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  POLAR_BIOME_PROFILES,
  POLAR_BIOME_FRAGMENT_SHADER,
  POLAR_BIOME_VERTEX_SHADER,
} from "../lib/polar-biome-fields.js";

const captureDir = path.resolve(
  process.env.POLAR_COLOR_CAPTURE_DIR || path.join(".verification", "biome-live"),
);
const reportPath = path.resolve(
  process.env.POLAR_COLOR_REPORT_PATH ||
    path.join(".verification", "polar-color-continuity-report.json"),
);

const SATURATION_MIN = 0.18;
const SATURATION_MAX = 0.38;
const SNOW_ANCHOR_SATURATION_MAX = 0.28;
const SNOW_ANCHOR_LUMA_MIN = 100;
const SNOW_ANCHOR_RATIO_MIN = 0.35;
const LOCAL_ACCENT_SATURATION_MIN = 0.35;
const LOCAL_ACCENT_LUMA_MIN = 40;
const LOCAL_ACCENT_RATIO_MIN = 0.01;
const LOCAL_ACCENT_RATIO_MAX = 0.22;
const BLACK_LUMA_MAX = 16;
const BLACK_RATIO_MAX = 0.06;
const HIGHLIGHT_LUMA_MIN = 248;
const HIGHLIGHT_RATIO_MAX = 0.08;

const CAPTURES = Object.freeze([
  { accentHue: 180, hueTolerance: 45, id: "observatory-plaque" },
  { accentHue: 205, hueTolerance: 40, id: "s2-kernel-core" },
  { accentHue: 257, hueTolerance: 40, id: "manifold-reactor" },
  { accentHue: 45, hueTolerance: 35, id: "field-chamber-coils" },
  { accentHue: 160, hueTolerance: 35, id: "qpu-ice-bridge" },
  { accentHue: 7, hueTolerance: 35, id: "upstream-radio-mast" },
  { accentHue: 330, hueTolerance: 40, id: "topology-archive-wall" },
  { accentHue: 225, hueTolerance: 45, id: "assembly-tool-locker" },
]);

const biomeWorldSource = await readFile(
  path.resolve("components", "PolarBiomeWorld.jsx"),
  "utf8",
);

function rgbHueDegrees(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const chroma = maximum - minimum;
  if (chroma <= 1e-6) return 0;
  let hue;
  if (maximum === r) hue = ((g - b) / chroma) % 6;
  else if (maximum === g) hue = (b - r) / chroma + 2;
  else hue = (r - g) / chroma + 4;
  return (hue * 60 + 360) % 360;
}

function circularHueDistance(left, right) {
  const distance = Math.abs(left - right) % 360;
  return Math.min(distance, 360 - distance);
}

async function measureCapture(capture) {
  const imagePath = path.join(captureDir, `${capture.id}-world.png`);
  const { data, info } = await sharp(imagePath)
    .resize(160, 100, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  let saturationSum = 0;
  let luminanceSum = 0;
  let snowAnchorPixels = 0;
  let localAccentPixels = 0;
  let blackPixels = 0;
  let highlightPixels = 0;
  let accentHueX = 0;
  let accentHueY = 0;

  for (let index = 0; index < data.length; index += 3) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const saturation = maximum > 0 ? (maximum - minimum) / maximum : 0;
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    saturationSum += saturation;
    luminanceSum += luminance;
    if (luminance <= BLACK_LUMA_MAX) blackPixels += 1;
    if (luminance >= HIGHLIGHT_LUMA_MIN) highlightPixels += 1;
    if (
      saturation <= SNOW_ANCHOR_SATURATION_MAX &&
      luminance >= SNOW_ANCHOR_LUMA_MIN
    ) {
      snowAnchorPixels += 1;
    }
    if (
      saturation >= LOCAL_ACCENT_SATURATION_MIN &&
      luminance >= LOCAL_ACCENT_LUMA_MIN
    ) {
      const hueRadians = (rgbHueDegrees(red, green, blue) * Math.PI) / 180;
      accentHueX += Math.cos(hueRadians) * saturation;
      accentHueY += Math.sin(hueRadians) * saturation;
      localAccentPixels += 1;
    }
  }

  const accentHueDegrees =
    ((Math.atan2(accentHueY, accentHueX) * 180) / Math.PI + 360) % 360;
  return {
    accentHueDegrees,
    accentHueDistance: circularHueDistance(accentHueDegrees, capture.accentHue),
    averageLuminance: luminanceSum / pixelCount,
    averageSaturation: saturationSum / pixelCount,
    blackPixelRatio: blackPixels / pixelCount,
    expectedAccentHue: capture.accentHue,
    id: capture.id,
    imagePath,
    highlightPixelRatio: highlightPixels / pixelCount,
    localAccentRatio: localAccentPixels / pixelCount,
    snowAnchorRatio: snowAnchorPixels / pixelCount,
  };
}

assert.equal(Object.keys(POLAR_BIOME_PROFILES).length, 8, "all eight biome identities must remain");
assert.equal(
  new Set(Object.values(POLAR_BIOME_PROFILES).map((profile) => profile.colors.accent)).size,
  8,
  "station accents must remain distinct instead of collapsing into global gray",
);

const measurements = [];
const failures = [];
if (!POLAR_BIOME_VERTEX_SHADER.includes("vec4 field = vec4(0.0);")) {
  failures.push("biome field dispatch must initialize its ANGLE/HLSL return value");
}
if (/if \(fieldKind[^\n]+\) return/.test(POLAR_BIOME_VERTEX_SHADER)) {
  failures.push("biome field dispatch must not use ANGLE X4000-prone early returns");
}
for (const aetherGeographyContract of [
  "const aetherInstanceCount = Math.max(6, Math.round(instanceCount * 0.25))",
  "activeInstanceCount = aetherInstanceCount",
  "new THREE.TorusGeometry(0.42, 0.072, 5, 14, Math.PI * 1.38)",
  "localX = -5.4 + progress * 10.8",
  "scaleY = 0.16 + seedB * 0.38",
]) {
  if (!biomeWorldSource.includes(aetherGeographyContract)) {
    failures.push(`Aether geography is missing ${JSON.stringify(aetherGeographyContract)}`);
  }
}
for (const openWorldGeographyContract of [
  "const upstreamInstanceCount = instanceCount >= 32 ? 14 : 10",
  "const topologyInstanceCount = instanceCount >= 32 ? 14 : 10",
  "const assemblyInstanceCount = instanceCount >= 32 ? 12 : 9",
  "activeInstanceCount = upstreamInstanceCount",
  "activeInstanceCount = topologyInstanceCount",
  "activeInstanceCount = assemblyInstanceCount",
]) {
  if (!biomeWorldSource.includes(openWorldGeographyContract)) {
    failures.push(`open-world geography is missing ${JSON.stringify(openWorldGeographyContract)}`);
  }
}
for (const localizedFieldContract of [
  "topologySkyEnvelope",
  "biomeLocalInfluence",
  "biomeLocalColorEnvelope",
  "biomeLocalGeographyAccent",
  "assemblyGroundSignal",
  "topologyGroundSignal",
  "primaryLocalColorEnvelope",
  "secondaryLocalColorEnvelope",
  "neutralBlendWeight",
  "boundPolarHighlights",
]) {
  if (!POLAR_BIOME_FRAGMENT_SHADER.includes(localizedFieldContract)) {
    failures.push(`biome shader is missing localized field control ${localizedFieldContract}`);
  }
}
for (const capture of CAPTURES) {
  const measurement = await measureCapture(capture);
  measurements.push(measurement);
  if (
    measurement.averageSaturation < SATURATION_MIN ||
    measurement.averageSaturation > SATURATION_MAX
  ) {
    failures.push(
      `${capture.id} average saturation ${measurement.averageSaturation.toFixed(3)} is outside ${SATURATION_MIN.toFixed(2)}-${SATURATION_MAX.toFixed(2)}`,
    );
  }
  if (measurement.snowAnchorRatio < SNOW_ANCHOR_RATIO_MIN) {
    failures.push(
      `${capture.id} low-saturation snow/sky anchors ${(measurement.snowAnchorRatio * 100).toFixed(1)}% are below ${(SNOW_ANCHOR_RATIO_MIN * 100).toFixed(0)}%`,
    );
  }
  if (measurement.localAccentRatio < LOCAL_ACCENT_RATIO_MIN) {
    failures.push(
      `${capture.id} localized accent pixels ${(measurement.localAccentRatio * 100).toFixed(1)}% are below ${(LOCAL_ACCENT_RATIO_MIN * 100).toFixed(1)}%`,
    );
  }
  if (measurement.localAccentRatio > LOCAL_ACCENT_RATIO_MAX) {
    failures.push(
      `${capture.id} localized accent pixels ${(measurement.localAccentRatio * 100).toFixed(1)}% exceed the ${(LOCAL_ACCENT_RATIO_MAX * 100).toFixed(0)}% local-field cap`,
    );
  }
  if (measurement.blackPixelRatio > BLACK_RATIO_MAX) {
    failures.push(
      `${capture.id} black pixels ${(measurement.blackPixelRatio * 100).toFixed(1)}% exceed ${(BLACK_RATIO_MAX * 100).toFixed(0)}%`,
    );
  }
  if (measurement.highlightPixelRatio > HIGHLIGHT_RATIO_MAX) {
    failures.push(
      `${capture.id} clipped highlights ${(measurement.highlightPixelRatio * 100).toFixed(1)}% exceed ${(HIGHLIGHT_RATIO_MAX * 100).toFixed(0)}%`,
    );
  }
  if (measurement.accentHueDistance > capture.hueTolerance) {
    failures.push(
      `${capture.id} accent hue drifted ${measurement.accentHueDistance.toFixed(1)}deg from its authored family`,
    );
  }
}

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      captures: measurements,
      contract: {
        averageSaturation: [SATURATION_MIN, SATURATION_MAX],
        blackRatioMax: BLACK_RATIO_MAX,
        highlightRatioMax: HIGHLIGHT_RATIO_MAX,
        localAccentRatio: [LOCAL_ACCENT_RATIO_MIN, LOCAL_ACCENT_RATIO_MAX],
        snowAnchor: {
          luminanceMin: SNOW_ANCHOR_LUMA_MIN,
          ratioMin: SNOW_ANCHOR_RATIO_MIN,
          saturationMax: SNOW_ANCHOR_SATURATION_MAX,
        },
      },
      failures,
    },
    null,
    2,
  )}\n`,
);

assert.deepEqual(failures, [], `polar color continuity failed:\n${failures.join("\n")}`);
console.log(
  "Polar color continuity passed: neutral snow anchors, bounded black/highlight ratios, and 1-22% authored local accents.",
);
