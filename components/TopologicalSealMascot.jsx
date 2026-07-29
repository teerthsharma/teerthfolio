"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  SEAL_MANIFOLD_FORMULA,
  SEAL_MANIFOLD_INVARIANT,
  SEAL_MANIFOLD_MAPPING,
  createSealManifoldGeometry,
} from "../lib/seal-manifold";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world";
import { SEAL_GUIDE_STATES } from "../lib/seal-guide-state";
import { criticallyDampedStep } from "../lib/polar-world-cadence";
import { resolveSealPresentationScale } from "../lib/polar-camera-composition";
import {
  deepFreezeStationPersonality,
  resolveStationHaloPresentation,
} from "../lib/polar-station-personality";

export const MAX_TRANSLATION_SPEED = 4.2;
export const SEAL_MANIFOLD_DRAW_BUDGET = "one primary surface draw";
export const SEAL_MASCOT_ACCESSORY_DRAW_BUDGET =
  "three accessory draws: instanced eye-and-costume-gloss pool, instanced highlight-and-costume-beacon pool, one mesh halo";
export const SEAL_MANIFOLD_MOTION_PROFILE =
  "canonical acceleration-limited translation with permanent breathing, speed-gated face-to-tail glumph wave, critically damped lift, and no second position filter";
export const SEAL_MANIFOLD_TEXTURE_PROFILE =
  "seal-zone-xz pearl sage ivory asymmetric spots and indigo face markings";
export const SEAL_CROWN_HALO_PROFILE = Object.freeze({
  placement: "above and behind seal head",
  stationColor: "resolved from the active station halo palette",
  depthFrame: "rendered behind the seal head with depth testing",
});

const GUIDE_HEIGHT = 0.45;
const POSE_RESPONSE = 12;
const HEADING_RESPONSE = 9;
const MAX_FRAME_STEP = 1 / 20;
const MOVEMENT_LIFT_MAX = 0.145;
const MOVEMENT_LIFT_OMEGA = 12;
const SEAL_EYE_POSITIONS = Object.freeze([
  Object.freeze([1.01, 0.35, 0.105]),
  Object.freeze([1.01, 0.35, -0.105]),
]);
const SEAL_EYE_HIGHLIGHT_POSITIONS = Object.freeze([
  Object.freeze([1.03, 0.405, 0.105]),
  Object.freeze([1.03, 0.405, -0.105]),
]);
const HALO_MINIMUM_OPACITY = 0.58;
const HALO_STATE_OPACITY = Object.freeze({
  idle: HALO_MINIMUM_OPACITY,
  probing: 0.66,
  moving: 0.62,
  docking: 0.64,
  error: 0.7,
});

/**
 * Aggressive per-station dock wardrobe. Costume 0 is the pure plain seal
 * (observatory home / undocked travel); every other docked station dresses the
 * seal with unmistakable shader zones, accessory instances, aura rim glow, and
 * an arrival flourish. Costume identity swaps on every dock and reverts on
 * undock. All layouts and timings are deterministic constants.
 */
export const SEAL_COSTUME_PROFILE = Object.freeze({
  baseline: "plain seal at observatory home and while travelling",
  transition: "0.8s deterministic crossfade with arrival flash; instant under reduced motion",
  wardrobe: "seven station costumes: gold champion, eclipse acolyte, symbiote, visor, courier, archivist, engineer",
});
const COSTUME_TRANSITION_SECONDS = 0.8;
const SEAL_COSTUME_INDEX = Object.freeze({
  "observatory-plaque": 0,
  "s2-kernel-core": 1,
  "manifold-reactor": 2,
  "field-chamber-coils": 3,
  "qpu-ice-bridge": 4,
  "upstream-radio-mast": 5,
  "topology-archive-wall": 6,
  "assembly-tool-locker": 7,
});
const EYE_INSTANCE_COUNT = 2;
const GLOSS_ACCESSORY_SLOTS = 6;
const BRIGHT_ACCESSORY_SLOTS = 12;
const COSTUME_GOLD_HALO = Object.freeze({ base: "#FFD700", edge: "#FFF3C0" });
const RADIO_BEACON_BLINK_HZ = 1.6;

const SEAL_COSTUME_WARDROBE = deepFreezeStationPersonality({
  1: {
    stationId: "s2-kernel-core",
    bright: [
      { position: [0.86, 0.6, 0], scale: [2.0, 5.6, 2.0], color: "#FFD700" },
      { position: [0.82, 0.57, 0.15], scale: [1.8, 4.6, 1.8], color: "#FFF3C0" },
      { position: [0.74, 0.55, 0.21], scale: [1.8, 4.2, 1.8], color: "#FFD700" },
      { position: [0.66, 0.57, 0.15], scale: [1.8, 4.6, 1.8], color: "#FFF3C0" },
      { position: [0.62, 0.6, 0], scale: [2.0, 5.2, 2.0], color: "#FFD700" },
      { position: [0.66, 0.57, -0.15], scale: [1.8, 4.6, 1.8], color: "#FFF3C0" },
      { position: [0.74, 0.55, -0.21], scale: [1.8, 4.2, 1.8], color: "#FFD700" },
      { position: [0.82, 0.57, -0.15], scale: [1.8, 4.6, 1.8], color: "#FFF3C0" },
      { position: [0.1, 0.44, 0.2], scale: [1.6, 1.6, 1.6], color: "#FFD700" },
      { position: [-0.2, 0.42, -0.18], scale: [1.6, 1.6, 1.6], color: "#FFD700" },
    ],
    gloss: [
      { position: [0.83, 0.5, 0.1], scale: [1.1, 0.55, 1.1], color: "#C9A227" },
      { position: [0.65, 0.5, 0.1], scale: [1.1, 0.55, 1.1], color: "#C9A227" },
      { position: [0.65, 0.5, -0.1], scale: [1.1, 0.55, 1.1], color: "#C9A227" },
      { position: [0.83, 0.5, -0.1], scale: [1.1, 0.55, 1.1], color: "#C9A227" },
    ],
  },
  2: {
    stationId: "manifold-reactor",
    bright: [
      { position: [0.56, 0.06, 0], scale: [2.2, 2.2, 2.2], color: "#8D69D6" },
      { position: [0.5, -0.02, 0.17], scale: [1.9, 1.9, 1.9], color: "#8D69D6" },
      { position: [0.5, -0.02, -0.17], scale: [1.9, 1.9, 1.9], color: "#8D69D6" },
      { position: [-0.14, 0.47, 0.13], scale: [1.5, 2.8, 1.5], color: "#B9A0F2" },
      { position: [-0.32, 0.43, -0.11], scale: [1.5, 2.6, 1.5], color: "#B9A0F2" },
    ],
    gloss: [
      { position: [0.32, 0.44, 0], scale: [0.95, 0.7, 0.95], color: "#241A4F" },
      { position: [0.02, 0.47, 0], scale: [0.95, 0.7, 0.95], color: "#241A4F" },
      { position: [-0.28, 0.44, 0], scale: [0.95, 0.7, 0.95], color: "#241A4F" },
    ],
  },
  3: {
    stationId: "field-chamber-coils",
    bright: [
      { position: [0.32, 0.36, 0.15], scale: [1.7, 1.7, 1.7], color: "#FFD970" },
      { position: [0.05, 0.38, -0.18], scale: [1.5, 1.5, 1.5], color: "#EE9440" },
      { position: [-0.28, 0.34, 0.2], scale: [1.7, 1.7, 1.7], color: "#FFD970" },
      { position: [-0.5, 0.28, -0.22], scale: [1.4, 1.4, 1.4], color: "#EE9440" },
      { position: [0.1, 0.2, 0.42], scale: [1.5, 1.5, 1.5], color: "#FFD970" },
      { position: [-0.15, 0.15, -0.44], scale: [1.4, 1.4, 1.4], color: "#EE9440" },
    ],
    gloss: [],
  },
  4: {
    stationId: "qpu-ice-bridge",
    bright: [
      { position: [1.05, 0.36, -0.24], scale: [0.9, 5.2, 3.2], color: "#36D8FF" },
      { position: [1.07, 0.36, -0.12], scale: [0.9, 5.8, 3.4], color: "#55CE85" },
      { position: [1.08, 0.36, 0], scale: [1.0, 6.4, 3.6], color: "#36D8FF" },
      { position: [1.07, 0.36, 0.12], scale: [0.9, 5.8, 3.4], color: "#55CE85" },
      { position: [1.05, 0.36, 0.24], scale: [0.9, 5.2, 3.2], color: "#36D8FF" },
      { position: [-0.05, 0.46, 0.14], scale: [1.4, 3.6, 1.4], color: "#55CE85" },
      { position: [-0.3, 0.42, -0.16], scale: [1.3, 3.2, 1.3], color: "#36D8FF" },
      { position: [0.2, 0.48, -0.1], scale: [1.3, 3.4, 1.3], color: "#55CE85" },
      { position: [-0.5, 0.34, 0.1], scale: [1.2, 2.8, 1.2], color: "#36D8FF" },
    ],
    gloss: [
      { position: [0.9, 0.48, 0.24], scale: [0.8, 0.8, 0.8], color: "#134D42" },
      { position: [0.9, 0.48, -0.24], scale: [0.8, 0.8, 0.8], color: "#134D42" },
    ],
  },
  5: {
    stationId: "upstream-radio-mast",
    bright: [
      { position: [0.45, 0.55, 0], scale: [2.8, 2.8, 2.8], color: "#55CE85" },
      { position: [0.5, 0.28, 0.3], scale: [1.4, 1.4, 1.4], color: "#55CE85" },
      { position: [0.3, 0.05, 0.42], scale: [1.4, 1.4, 1.4], color: "#55CE85" },
      { position: [0.12, -0.15, 0.44], scale: [1.4, 1.4, 1.4], color: "#55CE85" },
      { position: [-0.1, 0.4, 0.3], scale: [1.2, 2.4, 0.8], color: "#E8705E" },
      { position: [-0.1, 0.4, -0.3], scale: [1.2, 2.4, 0.8], color: "#E8705E" },
    ],
    gloss: [
      { position: [0.45, 0.2, 0.34], scale: [1.0, 0.7, 0.7], color: "#7A3A30" },
      { position: [0.45, 0.2, -0.34], scale: [1.0, 0.7, 0.7], color: "#7A3A30" },
    ],
  },
  6: {
    stationId: "topology-archive-wall",
    bright: [
      { position: [0.45, 0.46, 0], scale: [1.0, 2.6, 0.55], color: "#E25AA0" },
      { position: [0.25, 0.49, 0], scale: [1.0, 2.6, 0.55], color: "#E3C6D6" },
      { position: [0.05, 0.5, 0], scale: [1.0, 2.6, 0.55], color: "#E25AA0" },
      { position: [-0.15, 0.49, 0], scale: [1.0, 2.6, 0.55], color: "#E3C6D6" },
      { position: [-0.35, 0.46, 0], scale: [1.0, 2.6, 0.55], color: "#E25AA0" },
      { position: [-0.55, 0.4, 0], scale: [1.0, 2.4, 0.55], color: "#E3C6D6" },
    ],
    gloss: [],
  },
  7: {
    stationId: "assembly-tool-locker",
    bright: [
      { position: [-0.12, 0.42, 0], scale: [1.6, 1.6, 1.6], color: "#F2B96B" },
      { position: [-0.12, 0.3, 0.36], scale: [1.5, 1.5, 1.5], color: "#F2B96B" },
      { position: [-0.12, 0.3, -0.36], scale: [1.5, 1.5, 1.5], color: "#F2B96B" },
      { position: [-0.12, 0.05, 0.46], scale: [1.5, 1.5, 1.5], color: "#F2B96B" },
      { position: [-0.12, 0.05, -0.46], scale: [1.5, 1.5, 1.5], color: "#F2B96B" },
    ],
    gloss: [
      { position: [0.3, 0.4, 0.24], scale: [1.3, 0.9, 0.9], color: "#6D4BE8" },
      { position: [0.3, 0.4, -0.24], scale: [1.3, 0.9, 0.9], color: "#6D4BE8" },
    ],
  },
});

function easeOutBack(value) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const shifted = value - 1;
  return 1 + c3 * shifted * shifted * shifted + c1 * shifted * shifted;
}

function writeAccessoryColors(mesh, offset, slots, entries) {
  if (!mesh) return;
  const color = new THREE.Color();
  for (let slot = 0; slot < slots; slot += 1) {
    color.set(entries?.[slot]?.color || "#FFFFFF");
    mesh.setColorAt(offset + slot, color);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function writeAccessoryMatrices(mesh, transform, offset, slots, entries, progress, reducedMotion, pulseScale) {
  if (!mesh) return;
  for (let slot = 0; slot < slots; slot += 1) {
    const entry = entries?.[slot];
    if (!entry) {
      transform.position.set(0, 0, 0);
      transform.scale.setScalar(0);
    } else {
      const stagger = reducedMotion
        ? 1
        : Math.min(1, Math.max(0, (progress * 1.35 - slot * 0.05) / 0.62));
      const pop = reducedMotion ? 1 : Math.max(0, easeOutBack(stagger));
      transform.position.set(entry.position[0], entry.position[1], entry.position[2]);
      transform.scale.set(
        entry.scale[0] * pop * pulseScale,
        entry.scale[1] * pop * pulseScale,
        entry.scale[2] * pop * pulseScale,
      );
    }
    transform.updateMatrix();
    mesh.setMatrixAt(offset + slot, transform.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

export const SEAL_STATE_POSES = Object.freeze({
  idle: Object.freeze({ tilt: 0, nod: 0, lift: 0, scale: 1 }),
  probing: Object.freeze({ tilt: -0.12, nod: -0.07, lift: 0.035, scale: 1.018 }),
  moving: Object.freeze({ tilt: 0, nod: -0.035, lift: 0.018, scale: 1.01 }),
  docking: Object.freeze({ tilt: 0.055, nod: -0.13, lift: 0.028, scale: 1.025 }),
  error: Object.freeze({ tilt: 0.22, nod: 0.05, lift: -0.045, scale: 0.985 }),
});

const STATE_VALUE = Object.freeze({ idle: 0, probing: 1, moving: 2, docking: 3, error: 4 });
function createToonResources(accent) {
  const gradientMap = new THREE.DataTexture(
    new Uint8Array([
      0x6e, 0x80, 0x9e, 0xff,
      0xa2, 0xb2, 0xc2, 0xff,
      0xd4, 0xdd, 0xe4, 0xff,
      0xff, 0xee, 0xd8, 0xff,
    ]),
    4,
    1,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  gradientMap.name = "TopologicalSealFourBandRamp";
  gradientMap.colorSpace = THREE.SRGBColorSpace;
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.generateMipmaps = false;
  gradientMap.needsUpdate = true;

  const runtime = {
    uTime: { value: 0 },
    uState: { value: 0 },
    uMotion: { value: 1 },
    uSpeed: { value: 0 },
    uAccent: { value: new THREE.Color(accent) },
    uCostumeA: { value: 0 },
    uCostumeB: { value: 0 },
    uCostumeBlend: { value: 0 },
    uCostumeFlash: { value: 0 },
  };

  const material = new THREE.MeshToonMaterial({
    color: "#FFFFFF",
    gradientMap,
  });
  material.name = `TopologicalSealAnimeSkin ${SEAL_MANIFOLD_TEXTURE_PROFILE}`;
  material.userData = {
    invariant: SEAL_MANIFOLD_INVARIANT,
    mapping: SEAL_MANIFOLD_MAPPING,
    textureSource: "authored procedural object-space X/Z zones; no external asset",
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, runtime);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec3 canonical;
uniform float uMotion;
uniform float uSpeed;
uniform float uState;
uniform float uTime;
varying vec3 vSealCanonical;
varying vec3 vSealObjectPosition;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float sealFrontToBack = (1.0 - canonical.x) * 4.8;
float sealBreathWave = sin(uTime * 2.6 - sealFrontToBack * 0.34) * 0.006 * uMotion;
float sealMovingState = 1.0 - step(0.51, abs(uState - 2.0));
float sealSpeed = smoothstep(0.16, 4.0, uSpeed) * sealMovingState * uMotion;
float sealGlumphWave = sin(sealFrontToBack - uTime * 9.2) * sealSpeed;
float sealGlumphEnvelope = smoothstep(-1.0, -0.5, canonical.x)
  * (1.0 - smoothstep(0.84, 1.04, canonical.x));
float sealSurfacePulse = sealBreathWave + sealGlumphWave * sealGlumphEnvelope * 0.026;
transformed += objectNormal * sealSurfacePulse;
transformed.y += max(sealGlumphWave, 0.0) * sealGlumphEnvelope * sealSpeed * 0.018;
transformed.x += sealGlumphWave * sealGlumphEnvelope * sealSpeed * 0.008;
vSealCanonical = canonical;
vSealObjectPosition = transformed;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uTime;
uniform float uState;
uniform float uMotion;
uniform vec3 uAccent;
uniform float uCostumeA;
uniform float uCostumeB;
uniform float uCostumeBlend;
uniform float uCostumeFlash;
varying vec3 vSealCanonical;
varying vec3 vSealObjectPosition;

float sealBlob(vec3 point, vec3 center, vec3 radius) {
  vec3 q = (point - center) / radius;
  return 1.0 - smoothstep(0.52, 1.0, dot(q, q));
}

float sealSoftBand(float value, float center, float width) {
  return 1.0 - smoothstep(width * 0.48, width, abs(value - center));
}

// Per-station dock costume albedo. Costume 0 is the pure plain seal.
// All masks are deterministic sinusoid/blob stacks over canonical coordinates.
vec3 sealCostumeAlbedo(float id, vec3 albedo, vec3 c, float t) {
  if (id < 0.5) return albedo;
  if (id < 1.5) {
    // s2-kernel-core: golden champion cape, collar, and chest sigil.
    vec3 gold = vec3(1.0, 0.843, 0.0);
    vec3 goldLight = vec3(1.0, 0.953, 0.753);
    vec3 goldDeep = vec3(0.62, 0.45, 0.05);
    float cape = smoothstep(0.02, 0.2, c.y) * (1.0 - smoothstep(0.42, 0.66, c.x));
    float collar = sealSoftBand(c.x, 0.5, 0.14);
    vec3 dressed = mix(albedo, gold, cape * 0.92);
    float filigree = sealSoftBand(fract(c.x * 3.0 + c.z * 1.4), 0.5, 0.24) * cape;
    dressed = mix(dressed, goldDeep, filigree * 0.55);
    dressed = mix(dressed, goldLight, collar * 0.9);
    float sigil = sealBlob(c, vec3(0.5, -0.35, 0.0), vec3(0.3, 0.34, 0.34));
    return mix(dressed, gold, sigil * 0.8);
  }
  if (id < 2.5) {
    // manifold-reactor: eclipse acolyte indigo cloak with violet hem.
    vec3 indigo = vec3(0.078, 0.055, 0.22);
    vec3 violet = vec3(0.553, 0.412, 0.839);
    vec3 duskLilac = vec3(0.73, 0.64, 0.92);
    float cloak = smoothstep(-0.12, 0.08, c.y) * (1.0 - smoothstep(0.6, 0.78, c.x));
    float hood = sealBlob(c, vec3(0.62, 0.55, 0.0), vec3(0.42, 0.38, 0.6));
    float shroud = clamp(cloak + hood, 0.0, 1.0);
    vec3 dressed = mix(albedo, indigo, shroud * 0.94);
    float hem = sealSoftBand(c.y, -0.1, 0.12) * (1.0 - smoothstep(0.6, 0.78, c.x));
    dressed = mix(dressed, violet, hem * 0.85);
    float crescent = clamp(
      sealBlob(c, vec3(-0.2, 0.62, 0.16), vec3(0.34, 0.3, 0.3))
        - sealBlob(c, vec3(-0.28, 0.58, 0.3), vec3(0.3, 0.28, 0.3)),
      0.0, 1.0);
    return mix(dressed, duskLilac, crescent * 0.9 * shroud);
  }
  if (id < 3.5) {
    // field-chamber-coils: symbiote-touched molten amber vein network.
    vec3 charcoal = vec3(0.13, 0.10, 0.10);
    vec3 amber = vec3(0.933, 0.58, 0.25);
    vec3 molten = vec3(1.0, 0.85, 0.44);
    float host = 0.5 + 0.5 * sin(c.x * 2.1 + c.y * 1.4 + 1.7);
    vec3 dressed = mix(albedo, charcoal, 0.52 + host * 0.22);
    float veinField = sin(
      c.x * 7.0
        + sin(c.y * 9.0 + c.z * 6.0) * 1.35
        + sin(c.z * 11.0 + c.x * 3.0) * 0.85
        + t * 0.5
    );
    float vein = 1.0 - smoothstep(0.0, 0.34, abs(veinField));
    float veinCore = 1.0 - smoothstep(0.0, 0.12, abs(veinField));
    dressed = mix(dressed, amber, vein * 0.95);
    return mix(dressed, molten, veinCore);
  }
  if (id < 4.5) {
    // qpu-ice-bridge: crystalline mint-cyan interference visor.
    vec3 mintTone = vec3(0.333, 0.808, 0.522);
    vec3 cyanTone = vec3(0.212, 0.847, 1.0);
    vec3 frost = vec3(0.85, 0.97, 0.95);
    float visor = sealSoftBand(c.y, 0.33, 0.5) * smoothstep(0.58, 0.72, c.x);
    float interference = 0.5 + 0.5 * sin((c.y + c.z) * 30.0 - t * 1.4);
    vec3 dressed = mix(albedo, mix(mintTone, cyanTone, interference), visor * 0.9);
    float lattice = (1.0 - smoothstep(0.0, 0.2, abs(sin((c.x - c.z) * 9.0))))
      * (1.0 - smoothstep(0.4, 0.62, c.x));
    return mix(dressed, mix(cyanTone, frost, 0.4), lattice * 0.5);
  }
  if (id < 5.5) {
    // upstream-radio-mast: coral courier sash with mint piping and beacon.
    vec3 coral = vec3(0.910, 0.439, 0.369);
    vec3 coralDeep = vec3(0.70, 0.26, 0.20);
    vec3 mintTone = vec3(0.333, 0.808, 0.522);
    float sashCoord = c.x * 0.6 + c.y * 1.05 + c.z * 0.3;
    float chevron = step(0.0, sin(c.z * 16.0 + c.x * 4.0));
    float uniformBody = (1.0 - smoothstep(0.72, 0.9, c.x)) * 0.9;
    vec3 dressed = mix(albedo, mix(coral, coralDeep, chevron * 0.4), uniformBody);
    float sashMint = sealSoftBand(sashCoord, 0.1, 0.3);
    dressed = mix(dressed, mintTone, sashMint * 0.95);
    float piping = sealSoftBand(c.x, 0.82, 0.1);
    dressed = mix(dressed, mintTone, piping * 0.85);
    float blink = step(0.5, fract(t * 0.8));
    float beacon = sealBlob(c, vec3(0.42, 0.58, 0.0), vec3(0.22, 0.2, 0.24));
    return mix(dressed, mintTone, beacon * (0.35 + 0.6 * blink));
  }
  if (id < 6.5) {
    // topology-archive-wall: archivist magenta scan stripes over plum.
    vec3 magenta = vec3(0.886, 0.353, 0.627);
    vec3 plum = vec3(0.271, 0.188, 0.263);
    vec3 pale = vec3(0.890, 0.776, 0.839);
    float faceGuard = 1.0 - smoothstep(0.68, 0.84, c.x);
    float scan = sin(c.x * 15.0 - t * 0.6);
    float stripe = smoothstep(0.15, 0.5, scan);
    float thin = 1.0 - smoothstep(0.0, 0.16, abs(sin(c.x * 30.0)));
    vec3 dressed = mix(albedo, plum, 0.45 * faceGuard);
    dressed = mix(dressed, magenta, stripe * 0.9 * faceGuard);
    return mix(dressed, pale, thin * 0.5 * faceGuard);
  }
  // assembly-tool-locker: engineer violet rig band with gold stud dashes.
  vec3 violet = vec3(0.427, 0.294, 0.910);
  vec3 violetDeep = vec3(0.165, 0.106, 0.290);
  vec3 gold = vec3(0.949, 0.725, 0.420);
  float belt = sealSoftBand(c.x, -0.12, 0.3);
  vec3 dressed = mix(albedo, violet, belt * 0.94);
  float dash = 1.0 - smoothstep(0.0, 0.3, abs(sin((c.y - c.z) * 9.0)));
  dressed = mix(dressed, gold, dash * belt * 0.85);
  float harness = sealSoftBand(c.x, 0.34, 0.12);
  dressed = mix(dressed, violetDeep, harness * 0.8);
  float plate = sealBlob(c, vec3(-0.55, 0.4, 0.0), vec3(0.35, 0.3, 0.5));
  return mix(dressed, gold, plate * 0.5);
}

// Costume aura rim color * strength; drives the fresnel emissive glow.
vec3 sealCostumeAura(float id, float t) {
  if (id < 0.5) return vec3(0.0);
  if (id < 1.5) return vec3(1.0, 0.84, 0.25) * 0.85;
  if (id < 2.5) return vec3(0.553, 0.412, 0.839) * 0.55;
  if (id < 3.5) return vec3(0.933, 0.58, 0.25) * (0.5 + 0.18 * sin(t * 7.0));
  if (id < 4.5) {
    return mix(vec3(0.333, 0.808, 0.522), vec3(0.212, 0.847, 1.0), 0.5 + 0.5 * sin(t * 2.6)) * 0.5;
  }
  if (id < 5.5) return vec3(0.333, 0.808, 0.522) * (0.34 + 0.3 * step(0.5, fract(t * 0.8)));
  if (id < 6.5) return vec3(0.886, 0.353, 0.627) * 0.5;
  return mix(vec3(0.427, 0.294, 0.910), vec3(0.949, 0.725, 0.42), 0.35) * 0.5;
}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
vec3 pearlGray = vec3(0.80, 0.87, 0.94);
vec3 coolSage = vec3(0.60, 0.70, 0.80);
vec3 warmIvory = vec3(0.95, 0.89, 0.78);
vec3 blueGray = vec3(0.34, 0.44, 0.56);
vec3 indigoInk = vec3(0.10, 0.13, 0.24);

// Authored texture zones are functions of X and Z together, never Y-only bands.
float zoneXZ = 0.5 + 0.5 * sin(
  vSealObjectPosition.x * 5.1 +
  vSealObjectPosition.z * 3.7 +
  sin(vSealObjectPosition.z * 8.3) * 0.42
);
vec3 sealAlbedo = mix(pearlGray, coolSage, zoneXZ * 0.17);

float chest = sealBlob(vSealCanonical, vec3(0.30, -0.83, 0.0), vec3(0.66, 0.39, 0.72));
float muzzleNear = sealBlob(vSealCanonical, vec3(0.965, 0.015, 0.15), vec3(0.15, 0.25, 0.18));
float muzzleFar = sealBlob(vSealCanonical, vec3(0.965, 0.015, -0.15), vec3(0.15, 0.25, 0.18));
sealAlbedo = mix(sealAlbedo, warmIvory, clamp(chest * 0.78 + max(muzzleNear, muzzleFar), 0.0, 1.0));

float spotA = sealBlob(vSealCanonical, vec3(-0.34, 0.47, 0.79), vec3(0.43, 0.34, 0.30));
float spotB = sealBlob(vSealCanonical, vec3(0.08, 0.69, -0.69), vec3(0.36, 0.28, 0.34));
float spotC = sealBlob(vSealCanonical, vec3(-0.58, -0.34, -0.71), vec3(0.31, 0.30, 0.36));
sealAlbedo = mix(sealAlbedo, blueGray, clamp(spotA * 0.60 + spotB * 0.52 + spotC * 0.44, 0.0, 0.72));

float eyeNear = sealBlob(vSealCanonical, vec3(0.915, 0.345, 0.19), vec3(0.105, 0.115, 0.09));
float eyeFar = sealBlob(vSealCanonical, vec3(0.915, 0.345, -0.19), vec3(0.105, 0.115, 0.09));
float eyeHaloNear = sealBlob(vSealCanonical, vec3(0.88, 0.33, 0.19), vec3(0.18, 0.18, 0.15));
float eyeHaloFar = sealBlob(vSealCanonical, vec3(0.88, 0.33, -0.19), vec3(0.18, 0.18, 0.15));
float nose = sealBlob(vSealCanonical, vec3(0.997, 0.015, 0.0), vec3(0.06, 0.13, 0.14));
sealAlbedo = mix(sealAlbedo, blueGray, max(eyeHaloNear, eyeHaloFar) * 0.34);
sealAlbedo = mix(sealAlbedo, indigoInk, clamp(max(eyeNear, eyeFar) + nose, 0.0, 1.0));

float guideBand = sealSoftBand(vSealCanonical.x, 0.32, 0.085);
float movingTrace = 0.5 + 0.5 * sin(
  (vSealCanonical.x + vSealCanonical.z) * 13.0 - uTime * 3.2 * uMotion
);
float stateEnergy = step(0.5, uState) * (0.07 + movingTrace * 0.035 * uMotion);
vec3 stateColor = mix(uAccent, vec3(0.89, 0.64, 0.31), step(3.5, uState));
sealAlbedo = mix(sealAlbedo, stateColor, guideBand * stateEnergy);

vec3 sealCostumeFrom = sealCostumeAlbedo(uCostumeA, sealAlbedo, vSealCanonical, uTime);
vec3 sealCostumeTo = sealCostumeAlbedo(uCostumeB, sealAlbedo, vSealCanonical, uTime);
sealAlbedo = mix(sealCostumeFrom, sealCostumeTo, clamp(uCostumeBlend, 0.0, 1.0));

diffuseColor.rgb = sealAlbedo;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
{
  vec3 sealViewDir = normalize(vViewPosition);
  float sealFresnel = pow(1.0 - clamp(dot(normal, sealViewDir), 0.0, 1.0), 2.3);
  vec3 sealAuraFrom = sealCostumeAura(uCostumeA, uTime);
  vec3 sealAuraTo = sealCostumeAura(uCostumeB, uTime);
  vec3 sealAura = mix(sealAuraFrom, sealAuraTo, clamp(uCostumeBlend, 0.0, 1.0));
  totalEmissiveRadiance += sealAura * sealFresnel * (1.0 + uCostumeFlash * 2.6);
  totalEmissiveRadiance += sealAura * uCostumeFlash * 0.22;
}`,
      )
      .replace(
        "return vec3( texture2D( gradientMap, coord ).r );",
        "return texture2D( gradientMap, coord ).rgb;",
      );
    material.userData.shader = shader;
  };
  material.customProgramCacheKey = () => "topological-seal-anime-xz-glumph-costume-v3";

  return { gradientMap, material, runtime };
}

const TopologicalSealMascot = forwardRef(function TopologicalSealMascot(
  {
    accent = "#5CC9C2",
    activeArtifact,
    axisVelocity = 0,
    axisX = 0,
    depthVelocity = 0,
    depthZ = 0,
    guideState = "idle",
    moving = false,
    quality = "high",
    reducedMotion = false,
    traversalPoseRef,
  },
  forwardedRef,
) {
  const root = useRef(null);
  const poseRef = useRef(null);
  const eyes = useRef(null);
  const eyeHighlights = useRef(null);
  const haloMaterial = useRef(null);
  const haloMesh = useRef(null);
  const haloInitialized = useRef(false);
  const guideLight = useRef(null);
  const costumeTransition = useRef({ from: 0, to: 0, start: -1 });
  const accessoryState = useRef({ costume: 0, settled: true });
  const velocity = useRef(new THREE.Vector3());
  const movementLift = useRef({ position: 0, velocity: 0 });
  const accessoryTransform = useMemo(() => new THREE.Object3D(), []);
  const costumeGoldHalo = useMemo(
    () =>
      new THREE.Color(COSTUME_GOLD_HALO.base).lerp(
        new THREE.Color(COSTUME_GOLD_HALO.edge),
        0.28,
      ),
    [],
  );
  const errorLightColor = useMemo(() => new THREE.Color("#F2B96B"), []);
  const size = useThree((state) => state.size);
  const presentationScale = resolveSealPresentationScale(size);
  const geometry = useMemo(() => createSealManifoldGeometry({ quality }), [quality]);
  const resources = useMemo(() => createToonResources(accent), [accent]);
  const haloPresentation = useMemo(
    () => resolveStationHaloPresentation(activeArtifact?.id),
    [activeArtifact?.id],
  );
  const haloAccent = useMemo(() => {
    return new THREE.Color(haloPresentation.base).lerp(
      new THREE.Color(haloPresentation.edge),
      haloPresentation.mix,
    );
  }, [haloPresentation]);
  const haloColors = useMemo(() => {
    const base = haloAccent.clone();
    const tint = (color, amount) => base.clone().lerp(new THREE.Color(color), amount);
    return {
      idle: tint("#F2D3A8", 0.08),
      probing: tint("#A8F0E8", 0.24),
      moving: base.clone(),
      docking: tint("#93DFD4", 0.16),
      error: tint("#F2B96B", 0.56),
    };
  }, [haloAccent]);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);

  useImperativeHandle(forwardedRef, () => root.current, []);

  useLayoutEffect(() => {
    const transform = new THREE.Object3D();
    const eyeColor = new THREE.Color("#171A2D");
    const highlightColor = new THREE.Color("#FFFFFF");
    for (let index = 0; index < SEAL_EYE_POSITIONS.length; index += 1) {
      transform.position.set(...SEAL_EYE_POSITIONS[index]);
      transform.scale.setScalar(1);
      transform.updateMatrix();
      eyes.current?.setMatrixAt(index, transform.matrix);
      eyes.current?.setColorAt(index, eyeColor);
      transform.position.set(...SEAL_EYE_HIGHLIGHT_POSITIONS[index]);
      transform.updateMatrix();
      eyeHighlights.current?.setMatrixAt(index, transform.matrix);
      eyeHighlights.current?.setColorAt(index, highlightColor);
    }
    transform.position.set(0, 0, 0);
    transform.scale.setScalar(0);
    transform.updateMatrix();
    for (let slot = 0; slot < GLOSS_ACCESSORY_SLOTS; slot += 1) {
      eyes.current?.setMatrixAt(EYE_INSTANCE_COUNT + slot, transform.matrix);
      eyes.current?.setColorAt(EYE_INSTANCE_COUNT + slot, highlightColor);
    }
    for (let slot = 0; slot < BRIGHT_ACCESSORY_SLOTS; slot += 1) {
      eyeHighlights.current?.setMatrixAt(EYE_INSTANCE_COUNT + slot, transform.matrix);
      eyeHighlights.current?.setColorAt(EYE_INSTANCE_COUNT + slot, highlightColor);
    }
    if (eyes.current) {
      eyes.current.instanceMatrix.needsUpdate = true;
      if (eyes.current.instanceColor) eyes.current.instanceColor.needsUpdate = true;
      eyes.current.computeBoundingSphere();
    }
    if (eyeHighlights.current) {
      eyeHighlights.current.instanceMatrix.needsUpdate = true;
      if (eyeHighlights.current.instanceColor) eyeHighlights.current.instanceColor.needsUpdate = true;
      eyeHighlights.current.computeBoundingSphere();
    }
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  useEffect(
    () => () => {
      resources.material.dispose();
      resources.gradientMap.dispose();
    },
    [resources],
  );

  useFrame(({ camera, clock }, delta) => {
    if (!root.current || !poseRef.current) return;

    const state = SEAL_GUIDE_STATES.includes(guideState) ? guideState : "idle";
    const pose = SEAL_STATE_POSES[state];
    const frameStep = Math.min(delta, MAX_FRAME_STEP);
    const traversalPose = traversalPoseRef?.current;

    // Dock wardrobe: resolve the target costume from the semantic dock and
    // drive a deterministic crossfade with an arrival flash flourish.
    const dockedId = traversalPose?.dockedId || null;
    const costumeTarget = dockedId ? (SEAL_COSTUME_INDEX[dockedId] ?? 0) : 0;
    const transition = costumeTransition.current;
    if (transition.to !== costumeTarget) {
      const priorProgress =
        transition.start < 0
          ? 1
          : Math.min(1, (clock.elapsedTime - transition.start) / COSTUME_TRANSITION_SECONDS);
      transition.from = priorProgress >= 0.5 ? transition.to : transition.from;
      transition.to = costumeTarget;
      transition.start = clock.elapsedTime;
      accessoryState.current.settled = false;
    }
    const costumeProgress =
      reducedMotion || transition.start < 0
        ? 1
        : Math.min(1, (clock.elapsedTime - transition.start) / COSTUME_TRANSITION_SECONDS);
    const costumeBlend = costumeProgress * costumeProgress * (3 - 2 * costumeProgress);
    const costumeFlash =
      !reducedMotion && transition.to !== 0 && costumeProgress < 1
        ? Math.sin(costumeProgress * Math.PI)
        : 0;
    const radioBlinkOn =
      !reducedMotion &&
      transition.to === 5 &&
      Math.floor(clock.elapsedTime * RADIO_BEACON_BLINK_HZ) % 2 === 0;

    const wardrobe = SEAL_COSTUME_WARDROBE[transition.to];
    if (accessoryState.current.costume !== transition.to) {
      accessoryState.current.costume = transition.to;
      accessoryState.current.settled = false;
      writeAccessoryColors(eyes.current, EYE_INSTANCE_COUNT, GLOSS_ACCESSORY_SLOTS, wardrobe?.gloss);
      writeAccessoryColors(
        eyeHighlights.current,
        EYE_INSTANCE_COUNT,
        BRIGHT_ACCESSORY_SLOTS,
        wardrobe?.bright,
      );
    }
    const accessoriesAnimating = costumeProgress < 1 || (transition.to === 5 && !reducedMotion);
    if (!accessoryState.current.settled || accessoriesAnimating) {
      const beaconPulse = transition.to === 5 && !reducedMotion ? (radioBlinkOn ? 1.16 : 0.78) : 1;
      writeAccessoryMatrices(
        eyes.current,
        accessoryTransform,
        EYE_INSTANCE_COUNT,
        GLOSS_ACCESSORY_SLOTS,
        wardrobe?.gloss,
        costumeProgress,
        reducedMotion,
        1,
      );
      writeAccessoryMatrices(
        eyeHighlights.current,
        accessoryTransform,
        EYE_INSTANCE_COUNT,
        BRIGHT_ACCESSORY_SLOTS,
        wardrobe?.bright,
        costumeProgress,
        reducedMotion,
        beaconPulse,
      );
      if (!accessoriesAnimating) accessoryState.current.settled = true;
    }

    if (haloMaterial.current) {
      const costumeHaloActive = transition.to === 1 && costumeBlend > 0.4;
      const haloTarget = costumeHaloActive
        ? costumeGoldHalo
        : haloColors[state] || haloColors.idle;
      const haloBreath = reducedMotion
        ? 0
        : (0.5 + 0.5 * Math.sin(clock.elapsedTime * Math.PI * 2 * haloPresentation.pulseHz)) * 0.08;
      const haloBlink = radioBlinkOn && costumeProgress >= 1 ? 0.12 : 0;
      const haloOpacity = Math.min(0.78, HALO_STATE_OPACITY[state] + haloBreath + haloBlink);
      if (!haloInitialized.current || reducedMotion) {
        haloMaterial.current.color.copy(haloTarget);
        haloMaterial.current.opacity = haloOpacity;
        haloInitialized.current = true;
      } else {
        const haloBlend = 1 - Math.exp(-6.5 * frameStep);
        haloMaterial.current.color.lerp(haloTarget, haloBlend);
        haloMaterial.current.opacity = THREE.MathUtils.lerp(
          haloMaterial.current.opacity,
          haloOpacity,
          haloBlend,
        );
      }
    }
    if (haloMesh.current) {
      const haloAxis = haloPresentation.tiltRadians;
      haloMesh.current.rotation.x = reducedMotion
        ? haloAxis
        : THREE.MathUtils.lerp(
            haloMesh.current.rotation.x,
            haloAxis,
            1 - Math.exp(-6.5 * frameStep),
          );
      haloMesh.current.rotation.z = reducedMotion
        ? 0
        : clock.elapsedTime * haloPresentation.pulseHz * 0.16;
      haloMesh.current.scale.setScalar(reducedMotion ? 1 : 1 + costumeFlash * 0.38);
    }
    if (guideLight.current) {
      const baseIntensity = moving ? 0.72 : 0.36;
      guideLight.current.intensity =
        baseIntensity + costumeFlash * 1.5 + (transition.to === 1 ? 0.5 * costumeBlend : 0);
      guideLight.current.color.copy(
        transition.to === 1 && costumeBlend > 0.4
          ? costumeGoldHalo
          : guideState === "error"
            ? errorLightColor
            : haloAccent,
      );
    }
    const resolvedAxisX = traversalPose?.x ?? axisX;
    const resolvedDepthZ = traversalPose?.z ?? depthZ;
    targetPosition.set(resolvedAxisX, GUIDE_HEIGHT, resolvedDepthZ);
    root.current.position.copy(targetPosition);
    velocity.current.set(
      traversalPose?.vx ?? axisVelocity * MAX_TRANSLATION_SPEED,
      0,
      traversalPose?.vz ?? depthVelocity * MAX_TRANSLATION_SPEED,
    );
    const speedRatio = THREE.MathUtils.smoothstep(velocity.current.length(), 0.16, 4);
    if (reducedMotion) {
      movementLift.current = { position: 0, velocity: 0 };
    } else {
      movementLift.current = criticallyDampedStep(
        movementLift.current,
        MOVEMENT_LIFT_MAX * speedRatio,
        MOVEMENT_LIFT_OMEGA,
        frameStep,
      );
    }

    let headingX = velocity.current.x || axisVelocity;
    let headingZ = velocity.current.z || depthVelocity;
    const stationWorld = activeArtifact
      ? STATION_WORLD_SCHEMA.stations[activeArtifact.id]
      : null;
    const speed = velocity.current.length();
    if (speed <= 0.14 && stationWorld) {
      const cameraHeadingX = camera.position.x - root.current.position.x;
      const cameraHeadingZ = camera.position.z - root.current.position.z;
      const cameraHeadingLength = Math.max(
        0.001,
        Math.hypot(cameraHeadingX, cameraHeadingZ),
      );
      const stationHeadingX = stationWorld.center.x - root.current.position.x;
      const stationHeadingZ = stationWorld.center.z - root.current.position.z;
      const stationHeadingLength = Math.max(
        0.001,
        Math.hypot(stationHeadingX, stationHeadingZ),
      );
      const cameraWeight = stationWorld.id === "observatory-plaque" ? 0.65 : 0.94;
      headingX =
        (cameraHeadingX / cameraHeadingLength) * cameraWeight +
        (stationHeadingX / stationHeadingLength) * (1 - cameraWeight);
      headingZ =
        (cameraHeadingZ / cameraHeadingLength) * cameraWeight +
        (stationHeadingZ / stationHeadingLength) * (1 - cameraWeight);
    }
    if (Math.hypot(headingX, headingZ) > 0.002) {
      const targetHeading = -Math.atan2(headingZ, headingX);
      const headingAlpha = reducedMotion ? 1 : 1 - Math.exp(-HEADING_RESPONSE * frameStep);
      const headingDelta = Math.atan2(
        Math.sin(targetHeading - root.current.rotation.y),
        Math.cos(targetHeading - root.current.rotation.y),
      );
      root.current.rotation.y += headingDelta * headingAlpha;
    }

    const poseAlpha = reducedMotion ? 1 : 1 - Math.exp(-POSE_RESPONSE * frameStep);
    const movingWaddle =
      !reducedMotion && state === "moving" ? Math.sin(clock.elapsedTime * 10.4) * 0.085 : 0;
    // The 2.6Hz term is the user-approved permanent breath and stays exact.
    // Liveliness is added as separate terms layered on top of it: a deeper
    // breath swell, a slow body rock, and a ~6s flipper/tail micro-cycle.
    const continuousBreath =
      !reducedMotion ? 1 + Math.sin(clock.elapsedTime * 2.6) * 0.014 : 1;
    const breathSwell = reducedMotion
      ? 0
      : Math.sin(clock.elapsedTime * 2.6) * 0.0056;
    const bodyRock = reducedMotion
      ? 0
      : Math.sin(clock.elapsedTime * 0.9) * 0.026;
    const microCycle = reducedMotion ? 0 : (clock.elapsedTime * Math.PI * 2) / 6;
    const flipperMicro = reducedMotion ? 0 : Math.sin(microCycle) * 0.02;
    const tailMicro = reducedMotion ? 0 : Math.sin(microCycle * 1.5 + 1.1) * 0.014;
    const dockingNod =
      !reducedMotion && state === "docking" ? Math.sin(clock.elapsedTime * 4.8) * 0.055 : 0;
    poseRef.current.rotation.z = THREE.MathUtils.lerp(
      poseRef.current.rotation.z,
      pose.tilt + movingWaddle + bodyRock,
      poseAlpha,
    );
    poseRef.current.rotation.x = THREE.MathUtils.lerp(
      poseRef.current.rotation.x,
      pose.nod + dockingNod + tailMicro,
      poseAlpha,
    );
    poseRef.current.rotation.y = THREE.MathUtils.lerp(
      poseRef.current.rotation.y,
      flipperMicro,
      poseAlpha,
    );
    poseRef.current.position.y = THREE.MathUtils.lerp(
      poseRef.current.position.y,
      pose.lift +
        movementLift.current.position +
        flipperMicro * 0.35 +
        (reducedMotion ? 0 : traversalPose?.dockSettleOffset || 0),
      poseAlpha,
    );
    const poseScale = THREE.MathUtils.lerp(
      poseRef.current.scale.x,
      pose.scale * (continuousBreath + breathSwell) * presentationScale,
      poseAlpha,
    );
    poseRef.current.scale.setScalar(poseScale);

    resources.runtime.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    resources.runtime.uState.value = STATE_VALUE[state];
    resources.runtime.uMotion.value = reducedMotion ? 0 : 1;
    resources.runtime.uSpeed.value = reducedMotion ? 0 : velocity.current.length();
    resources.runtime.uCostumeA.value = transition.from;
    resources.runtime.uCostumeB.value = transition.to;
    resources.runtime.uCostumeBlend.value = costumeBlend;
    resources.runtime.uCostumeFlash.value = costumeFlash;
    root.current.userData.guideState = state;
    root.current.userData.actualSpeed = velocity.current.length();
    root.current.userData.costumeStationId = wardrobe?.stationId || "plain-seal";

  });

  return (
    <group
      ref={root}
      name={`TopologicalSealMascot ${SEAL_MANIFOLD_FORMULA}`}
      position={[axisX, GUIDE_HEIGHT, depthZ]}
      renderOrder={9}
      userData={{
        className: "seal-avatar topological-seal",
        drawBudget: SEAL_MANIFOLD_DRAW_BUDGET,
        guideState,
        motionProfile: SEAL_MANIFOLD_MOTION_PROFILE,
        topology: SEAL_MANIFOLD_INVARIANT,
      }}
    >
      <group ref={poseRef} scale={presentationScale}>
        <mesh
          castShadow
          receiveShadow
          geometry={geometry}
          material={resources.material}
          name="seal-zone-xz topological-seal-primary-surface"
        />
        <instancedMesh
          args={[null, null, EYE_INSTANCE_COUNT + GLOSS_ACCESSORY_SLOTS]}
          name="seal-anime-eye-pair seal-costume-gloss-pool"
          ref={eyes}
          renderOrder={12}
        >
          <sphereGeometry args={[0.052, 18, 12]} />
          <meshPhysicalMaterial
            clearcoat={1}
            clearcoatRoughness={0.06}
            color="#FFFFFF"
            emissive="#202944"
            emissiveIntensity={0.06}
            metalness={0}
            roughness={0.09}
          />
        </instancedMesh>
        <instancedMesh
          args={[null, null, EYE_INSTANCE_COUNT + BRIGHT_ACCESSORY_SLOTS]}
          name="seal-anime-eye-highlights seal-costume-beacon-pool"
          ref={eyeHighlights}
          renderOrder={13}
        >
          <sphereGeometry args={[0.017, 8, 6]} />
          <meshBasicMaterial color="#F9FFFF" toneMapped={false} />
        </instancedMesh>
      </group>
      <mesh
        name="seal-crown-halo seal-accent-guide-halo"
        position={[0.58, 1.02, -0.16]}
        ref={haloMesh}
        rotation={[Math.PI / 2, 0, 0]}
        renderOrder={8}
        userData={{
          className: "seal-crown-halo",
          profile: SEAL_CROWN_HALO_PROFILE,
        }}
      >
        <torusGeometry args={[0.38, 0.026, 8, 64]} />
        <meshBasicMaterial
          color="#5CC9C2"
          depthTest
          depthWrite={false}
          opacity={HALO_STATE_OPACITY.idle}
          ref={haloMaterial}
          toneMapped={false}
          transparent
        />
      </mesh>
      <pointLight
        color={guideState === "error" ? "#F2B96B" : haloAccent}
        distance={3.4}
        intensity={moving ? 0.72 : 0.36}
        position={[0.2, 0.42, 0]}
        ref={guideLight}
      />
    </group>
  );
});

export default TopologicalSealMascot;
