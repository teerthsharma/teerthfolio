"use client";

// The ground's region shading and the air above it. regionShade patches the terrain's lit shader (gloss, mottle,
// sparkle and haze) from the aRegion attribute; RegionAir eases the haze toward the region under the pup.
import { useFrame } from "@react-three/fiber";
import { Color } from "three";
import { AIR, regionAt } from "../../../lib/world/regions";
import { getUi, live } from "../../../lib/world/store";

export const REGION_KEY = "snow-regions";

export const HAZE = {
  uHazeC: { value: new Color(AIR.snow[0]) },
  uHazeK: { value: 0 },
  uHazeNear: { value: 20 },
  uHazeFar: { value: 46 },
};

const TINT = Object.fromEntries(Object.entries(AIR).map(([id, [hex]]) => [id, new Color(hex)]));

const VERTEX = [
  ["#include <common>", "#include <common>\nattribute vec4 aRegion;\nvarying vec4 vRegion;"],
  ["#include <worldpos_vertex>", "#include <worldpos_vertex>\nvRegion = aRegion;"],
];

const FRAGMENT = [
  ["#include <common>", "#include <common>\nvarying vec4 vRegion;\nuniform vec3 uHazeC;\nuniform float uHazeK;\nuniform float uHazeNear;\nuniform float uHazeFar;"],
  ["#include <color_fragment>", "#include <color_fragment>\nfloat mcell = fract(sin(dot(floor(vSnowW.xz * 1.7), vec2(41.3, 289.1))) * 43758.5453);\ndiffuseColor.rgb *= 1.0 - 0.1 * vRegion.z * (mcell - 0.5);"],
  ["#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.16, vRegion.x);"],
  ["#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.2, vRegion.x);"],
  ["outgoingLight += vec3(0.9, 0.96, 1.0) * spark * 0.5;", "spark *= mix(1.0, vRegion.y * 2.0, vRegion.w);\n          outgoingLight += vec3(0.9, 0.96, 1.0) * spark * 0.5;"],
  ["#include <opaque_fragment>", "outgoingLight = mix(outgoingLight, uHazeC, uHazeK * smoothstep(uHazeNear, uHazeFar, length(vViewPosition)));\n#include <opaque_fragment>"],
];

function patch(src, from, to) {
  if (!src.includes(from)) throw new Error(`regionShade: the terrain shader has no "${from}"`);
  return src.replace(from, to);
}

export function regionShade(shader) {
  Object.assign(shader.uniforms, HAZE);
  shader.vertexShader = VERTEX.reduce((src, [from, to]) => patch(src, from, to), shader.vertexShader);
  shader.fragmentShader = FRAGMENT.reduce((src, [from, to]) => patch(src, from, to), shader.fragmentShader);
}

export default function RegionAir() {
  useFrame((_, dt) => {
    const ui = getUi();
    const id = ui.started && !ui.cutscene ? regionAt(live.seal.x, live.seal.z) : "snow";
    const k = 1 - Math.exp(-0.8 * dt);
    const target = AIR[id][1];
    const e = target - HAZE.uHazeK.value;
    HAZE.uHazeK.value = Math.abs(e) < 1e-3 ? target : HAZE.uHazeK.value + e * k;
    HAZE.uHazeC.value.lerp(TINT[id], k);
  });
  return null;
}
