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
  SEAL_FUR_TIER_COUNT,
  SEAL_MANIFOLD_FORMULA,
  SEAL_MANIFOLD_INVARIANT,
  SEAL_MANIFOLD_MAPPING,
  createSealFurPlacements,
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
  "four accessory draws: instanced eye-and-costume-gloss pool, instanced highlight-and-costume-beacon pool, instanced deterministic anime hairstyle pool, one mesh halo";
export const SEAL_FUR_COAT_PROFILE = Object.freeze({
  sampling: "deterministic hash-seeded crown-zone anchor sampling; no Math.random",
  tierCounts: SEAL_FUR_TIER_COUNT,
  strand:
    "few large shaped strands: open 5x4-segment tapered cones styled per docked station; body stays sleek",
  motion:
    "per-style gust sway and curl with speed flatten; grows in with the costume crossfade; static under reduced motion",
});
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
// Chase-feel body yaw: damped, frame-rate independent 1-exp(-dt*k) toward the
// smoothed traversal velocity heading while swimming; holds at rest.
const HEADING_RESPONSE = 4.2;
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
  wardrobe:
    "seven station costumes: gold champion, eclipse acolyte, symbiote, hero-green suit, night avenger, demon archivist, vampire",
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
// Demonic archive halo: dark violet-magenta, tilted far steeper than any
// station personality halo so the possession read is unmistakable.
export const COSTUME_DEMON_HALO = Object.freeze({
  base: "#5B0E86",
  edge: "#C11884",
  tiltRadians: 2.4,
  // Yaw swings the ring normal off the seal's view axis so the steep demonic
  // tilt reads as a slanted ring instead of an edge-on sliver from the front.
  yawRadians: 0.9,
});
// Costume-driven eye recolors written into the existing eye instance slots.
const COSTUME_EYE_STYLE = Object.freeze({
  default: Object.freeze({ iris: "#171A2D", glint: "#FFFFFF" }),
  5: Object.freeze({ iris: "#3A0B12", glint: "#FF3B47" }),
  6: Object.freeze({ iris: "#6D28D9", glint: "#E9D5FF" }),
});
/**
 * Per-station anime-inspired hairstyle table. Motifs and silhouettes only —
 * never named characters. Costume 0 (observatory home and undocked travel)
 * has no entry: the seal stays sleek and bald. Every style is a small set of
 * large shaped strands anchored to the deterministic crown pool; counts clamp
 * to the tier anchor pool, so the silhouette reads from few big strands.
 * rake = [nose-forward x, upsweep y]; curl = [toward-tail bend, downward droop]
 * applied at strand tips in object space; flat thins strands laterally.
 * Base radii are sized so strand roots overlap into one continuous hair mass:
 * no bald scalp shows between strands on any style. flame styles route
 * through the crown-apex centrality branch (tall vertical core, short fat
 * raked under-layer); tipColor/tipBias drive the root-to-tip shader gradient.
 */
export const SEAL_COSTUME_HAIR = Object.freeze({
  1: Object.freeze({
    // s2-kernel-core: legendary golden flame crown — tall near-vertical core
    // spikes over a dense short under-layer, edges raked out-and-back, two
    // forward fringe spikes over the brow, deep-amber roots to bright tips.
    count: 40, length: [0.2, 0.6], radius: [0.075, 0.12],
    rake: [-0.1, 1.6], flat: 1, feature: "fringe", flame: true,
    curl: [0.08, 0], sway: 0.12, colors: ["#B5770F", "#D99A22"],
    tipColor: "#FFE96B", tipBias: 1,
  }),
  2: Object.freeze({
    // manifold-reactor: two tall forward antenna tufts over swept-back silver.
    count: 40, length: [0.2, 0.3], radius: [0.052, 0.075],
    rake: [-0.95, 0.2], normalWeight: 0.5, flat: 1, feature: "antenna",
    curl: [0.05, 0], sway: 0.15, colors: ["#C7CBD8", "#FFFFFF"],
  }),
  3: Object.freeze({
    // field-chamber-coils: amber shaggy swept-back mane of medium clumps.
    count: 40, length: [0.2, 0.34], radius: [0.06, 0.085],
    rake: [-0.75, 0.3], normalWeight: 0.55, flat: 1,
    curl: [0.12, 0.1], sway: 0.5, colors: ["#8A4A16", "#E8A24A"],
  }),
  4: Object.freeze({
    // qpu-ice-bridge: dark-green curly messy mop — short fat rounded clumps.
    count: 40, length: [0.13, 0.2], radius: [0.065, 0.09],
    rake: [0.15, 0.3], normalWeight: 0.95, flat: 1,
    curl: [0.18, 0.14], sway: 0.25, colors: ["#14532D", "#2E9E57"],
  }),
  5: Object.freeze({
    // upstream-radio-mast: raven back-swept spikes, two forward fringe strands.
    count: 40, length: [0.3, 0.44], radius: [0.055, 0.075],
    rake: [-1.15, 0.7], normalWeight: 0.45, flat: 1, feature: "fringe",
    curl: [0.06, 0], sway: 0.15, colors: ["#0A0E16", "#25304A"],
  }),
  6: Object.freeze({
    // topology-archive-wall: long flowing violet ribbons cascading wide so
    // they stay readable past the body silhouette from any camera side.
    count: 36, length: [0.7, 1.05], radius: [0.042, 0.06],
    rake: [-1.1, -0.05], normalWeight: 0.35, flat: 1, anchorBias: "back",
    spread: 1.0, curl: [0.15, 0.5], sway: 1, colors: ["#7C3AED", "#C084FC"],
  }),
  7: Object.freeze({
    // assembly-tool-locker: pale combed-back vampire crest — wide overlapping
    // strands sweep up-and-back tall enough to read over the head silhouette.
    count: 40, length: [0.3, 0.42], radius: [0.085, 0.11],
    rake: [-0.9, 0.75], normalWeight: 0.55, flat: 0.7,
    curl: [0.1, 0.25], sway: 0, colors: ["#CFC6BE", "#F0EAE4"],
  }),
});
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
      { position: [1.05, 0.36, -0.24], scale: [0.9, 5.2, 3.2], color: "#2FBF71" },
      { position: [1.07, 0.36, -0.12], scale: [0.9, 5.8, 3.4], color: "#7FE8B0" },
      { position: [1.08, 0.36, 0], scale: [1.0, 6.4, 3.6], color: "#2FBF71" },
      { position: [1.07, 0.36, 0.12], scale: [0.9, 5.8, 3.4], color: "#7FE8B0" },
      { position: [1.05, 0.36, 0.24], scale: [0.9, 5.2, 3.2], color: "#2FBF71" },
      { position: [-0.05, 0.46, 0.14], scale: [1.4, 3.6, 1.4], color: "#7FE8B0" },
      { position: [-0.3, 0.42, -0.16], scale: [1.3, 3.2, 1.3], color: "#2FBF71" },
      { position: [0.2, 0.48, -0.1], scale: [1.3, 3.4, 1.3], color: "#7FE8B0" },
      { position: [-0.5, 0.34, 0.1], scale: [1.2, 2.8, 1.2], color: "#2FBF71" },
    ],
    gloss: [
      { position: [0.9, 0.48, 0.24], scale: [0.8, 0.8, 0.8], color: "#8A5A3C" },
      { position: [0.9, 0.48, -0.24], scale: [0.8, 0.8, 0.8], color: "#8A5A3C" },
    ],
  },
  5: {
    stationId: "upstream-radio-mast",
    bright: [
      { position: [0.45, 0.55, 0], scale: [2.8, 2.8, 2.8], color: "#FF3B47" },
      { position: [0.5, 0.28, 0.3], scale: [1.4, 1.4, 1.4], color: "#1B2A4A" },
      { position: [0.3, 0.05, 0.42], scale: [1.4, 1.4, 1.4], color: "#1B2A4A" },
      { position: [0.12, -0.15, 0.44], scale: [1.4, 1.4, 1.4], color: "#1B2A4A" },
      { position: [-0.1, 0.4, 0.3], scale: [1.2, 2.4, 0.8], color: "#0D1322" },
      { position: [-0.1, 0.4, -0.3], scale: [1.2, 2.4, 0.8], color: "#0D1322" },
    ],
    gloss: [
      { position: [0.45, 0.2, 0.34], scale: [1.0, 0.7, 0.7], color: "#0A0E1A" },
      { position: [0.45, 0.2, -0.34], scale: [1.0, 0.7, 0.7], color: "#0A0E1A" },
    ],
  },
  6: {
    stationId: "topology-archive-wall",
    bright: [
      { position: [0.45, 0.46, 0], scale: [1.0, 2.6, 0.55], color: "#8B2FD6" },
      { position: [0.25, 0.49, 0], scale: [1.0, 2.6, 0.55], color: "#D633A8" },
      { position: [0.05, 0.5, 0], scale: [1.0, 2.6, 0.55], color: "#8B2FD6" },
      { position: [-0.15, 0.49, 0], scale: [1.0, 2.6, 0.55], color: "#D633A8" },
      { position: [-0.35, 0.46, 0], scale: [1.0, 2.6, 0.55], color: "#8B2FD6" },
      { position: [-0.55, 0.4, 0], scale: [1.0, 2.4, 0.55], color: "#D633A8" },
    ],
    gloss: [],
  },
  7: {
    stationId: "assembly-tool-locker",
    bright: [
      { position: [-0.12, 0.42, 0], scale: [1.6, 1.6, 1.6], color: "#C81E2E" },
      { position: [-0.12, 0.3, 0.36], scale: [1.5, 1.5, 1.5], color: "#C81E2E" },
      { position: [-0.12, 0.3, -0.36], scale: [1.5, 1.5, 1.5], color: "#C81E2E" },
      { position: [-0.12, 0.05, 0.46], scale: [1.5, 1.5, 1.5], color: "#C81E2E" },
      { position: [-0.12, 0.05, -0.46], scale: [1.5, 1.5, 1.5], color: "#C81E2E" },
    ],
    gloss: [
      { position: [0.3, 0.4, 0.24], scale: [1.3, 0.9, 0.9], color: "#15090C" },
      { position: [0.3, 0.4, -0.24], scale: [1.3, 0.9, 0.9], color: "#15090C" },
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

const HAIR_STRAND_UP = new THREE.Vector3(0, 1, 0);

/**
 * Bake one station hairstyle into the instanced strand pool. Runs once per
 * dock change, never per frame. A null style zeroes every strand (sleek bald
 * seal). Feature strands ("antenna", "fringe") claim the most forward crown
 * anchor on each side so the signature silhouette lands in a stable spot.
 * Fully deterministic: anchors and jitters come from the hashed crown pool.
 */
function writeHairStyle(mesh, placements, style) {
  if (!mesh) return;
  const transform = new THREE.Object3D();
  const direction = new THREE.Vector3();
  const color = new THREE.Color();
  const strands = [];
  if (style) {
    if (style.feature) {
      const bySide = [null, null];
      for (const anchor of placements) {
        const side = anchor.position[2] >= 0 ? 0 : 1;
        if (!bySide[side] || anchor.canonicalX > bySide[side].canonicalX) {
          bySide[side] = anchor;
        }
      }
      for (let side = 0; side < 2; side += 1) {
        if (bySide[side]) {
          strands.push({ anchor: bySide[side], feature: true, sideSign: side === 0 ? 1 : -1 });
        }
      }
    }
    const ordered =
      style.anchorBias === "back"
        ? [...placements].sort((a, b) => a.canonicalX - b.canonicalX)
        : placements;
    const total = Math.min(style.count, placements.length);
    for (const anchor of ordered) {
      if (strands.length >= total) break;
      if (style.feature && strands.some((strand) => strand.feature && strand.anchor === anchor)) {
        continue;
      }
      strands.push({ anchor });
    }
  }
  const colorRoot = new THREE.Color(style?.colors?.[0] || "#FFFFFF");
  const colorTip = new THREE.Color(style?.colors?.[1] || "#FFFFFF");
  for (let index = 0; index < placements.length; index += 1) {
    const strand = strands[index];
    if (!strand) {
      transform.position.set(0, 0, 0);
      transform.quaternion.identity();
      transform.scale.setScalar(0);
    } else {
      const anchor = strand.anchor;
      let length;
      let radius;
      if (strand.feature && style.feature === "antenna") {
        // The two proud forward v-tufts ARE the read: far taller and thicker
        // than the swept-back mass behind them.
        direction.set(0.6, 1, strand.sideSign * 0.15);
        length = style.length[1] * 3.2;
        radius = style.radius[1] * 1.25;
      } else if (strand.feature) {
        // Flame fringe flicks up over the brow; the raven fringe droops.
        direction.set(0.85, style.flame ? 0.35 : -0.1, strand.sideSign * 0.3);
        length = style.length[1] * (style.flame ? 0.62 : 1.15);
        radius = style.radius[0];
      } else if (style.flame) {
        // Flame crown: centrality is 1 at the crown apex and falls toward the
        // edges. Core spikes stand tall and near-vertical; surrounding spikes
        // get shorter, fatter, and progressively raked out-and-back, so the
        // pool reads as one flame mass with a dense under-layer, never a ring
        // of separated horns over bald scalp.
        const core =
          1 -
          Math.min(
            1,
            Math.hypot((anchor.canonicalX - 0.56) / 0.26, anchor.position[2] / 0.26),
          );
        direction.set(
          style.rake[0] - (1 - core) * 0.85 + (anchor.lean - 0.5) * 0.25,
          style.rake[1] * (0.6 + core * 0.4),
          anchor.normal[2] * (0.25 + (1 - core) * 0.45),
        );
        length =
          style.length[0] +
          (style.length[1] - style.length[0]) * (core * 0.72 + anchor.lengthJitter * 0.28);
        radius = style.radius[1] - core * (style.radius[1] - style.radius[0]);
      } else {
        direction.set(
          anchor.normal[0] * style.normalWeight + style.rake[0] + (anchor.lean - 0.5) * 0.5,
          anchor.normal[1] * style.normalWeight + style.rake[1],
          anchor.normal[2] * style.normalWeight + (anchor.shade - 0.5) * (style.spread ?? 0.4),
        );
        length = style.length[0] + anchor.lengthJitter * (style.length[1] - style.length[0]);
        radius = style.radius[0] + anchor.shade * (style.radius[1] - style.radius[0]);
      }
      direction.normalize();
      transform.position.set(anchor.position[0], anchor.position[1], anchor.position[2]);
      transform.quaternion.setFromUnitVectors(HAIR_STRAND_UP, direction);
      transform.scale.set(radius, length, radius * (style.flat ?? 1));
      color.copy(colorRoot).lerp(colorTip, strand.feature ? 1 : anchor.shade);
    }
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    mesh.setColorAt(index, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
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
    uDockFlick: { value: 0 },
    uHairGrow: { value: 0 },
    uHairSway: { value: 0 },
    uHairCurl: { value: new THREE.Vector2(0, 0) },
    uHairTipColor: { value: new THREE.Color("#FFFFFF") },
    uHairTipBias: { value: 0 },
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
uniform float uDockFlick;
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
// Tail bend zone: stacked incommensurate sines (~1.2 Hz idle) whose lateral
// amplitude scales with swim speed, plus a vertical dock-arrival flick.
float sealTailZone = smoothstep(0.35, 1.0, -canonical.x);
float sealTailSwing = sin(uTime * 7.54) * 0.7 + sin(uTime * 4.93 + 1.3) * 0.3;
float sealTailAmp = 0.03 + smoothstep(0.16, 4.0, uSpeed) * 0.085;
transformed.z += sealTailSwing * sealTailZone * sealTailZone * sealTailAmp * uMotion;
transformed.y += uDockFlick * sealTailZone * sealTailZone * 0.07 * uMotion;
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
    // qpu-ice-bridge: young-hero teal-green suit with cheek freckle dots.
    vec3 heroGreen = vec3(0.13, 0.62, 0.42);
    vec3 heroTeal = vec3(0.22, 0.78, 0.58);
    vec3 heroCream = vec3(0.95, 0.92, 0.80);
    float suit = 1.0 - smoothstep(0.55, 0.75, c.x);
    float weave = 0.5 + 0.5 * sin(c.y * 6.0 + c.x * 3.0);
    vec3 dressed = mix(albedo, mix(heroGreen, heroTeal, weave), suit * 0.92);
    float trim = sealSoftBand(c.x, 0.58, 0.1);
    dressed = mix(dressed, heroCream, trim * 0.8);
    float freckleField = step(0.6, sin(c.y * 34.0) * sin(c.z * 34.0));
    float cheeks = sealBlob(c, vec3(0.88, 0.12, 0.3), vec3(0.16, 0.16, 0.14))
      + sealBlob(c, vec3(0.88, 0.12, -0.3), vec3(0.16, 0.16, 0.14));
    return mix(dressed, vec3(0.55, 0.36, 0.24), freckleField * clamp(cheeks, 0.0, 1.0) * 0.85);
  }
  if (id < 5.5) {
    // upstream-radio-mast: navy-black night avenger with a high-collar read.
    vec3 navyInk = vec3(0.05, 0.07, 0.14);
    vec3 navyBlue = vec3(0.10, 0.16, 0.30);
    vec3 steel = vec3(0.42, 0.50, 0.64);
    float suit = 1.0 - smoothstep(0.72, 0.9, c.x);
    float panel = 0.5 + 0.5 * sin((c.x + c.y) * 5.0);
    vec3 dressed = mix(albedo, mix(navyInk, navyBlue, panel), suit * 0.96);
    float collar = sealSoftBand(c.x, 0.62, 0.16) * smoothstep(0.0, 0.4, c.y);
    dressed = mix(dressed, navyInk, collar);
    float edgeLine = sealSoftBand(c.x, 0.66, 0.05);
    dressed = mix(dressed, steel, edgeLine * 0.6);
    float crest = sealBlob(c, vec3(0.45, -0.4, 0.0), vec3(0.2, 0.24, 0.2));
    return mix(dressed, vec3(0.55, 0.08, 0.10), crest * 0.7);
  }
  if (id < 6.5) {
    // topology-archive-wall: possessed archivist in dark violet-magenta smoke.
    vec3 demonMagenta = vec3(0.69, 0.13, 0.55);
    vec3 voidViolet = vec3(0.10, 0.06, 0.15);
    vec3 ashViolet = vec3(0.58, 0.47, 0.66);
    float faceGuard = 1.0 - smoothstep(0.68, 0.84, c.x);
    float scan = sin(c.x * 15.0 - t * 0.6);
    float stripe = smoothstep(0.15, 0.5, scan);
    float smoke = 0.5 + 0.5 * sin(c.x * 3.0 + c.y * 5.0 + t * 0.4);
    vec3 dressed = mix(albedo, voidViolet, (0.55 + smoke * 0.2) * faceGuard);
    dressed = mix(dressed, demonMagenta, stripe * 0.85 * faceGuard);
    float thin = 1.0 - smoothstep(0.0, 0.16, abs(sin(c.x * 30.0)));
    return mix(dressed, ashViolet, thin * 0.4 * faceGuard);
  }
  // assembly-tool-locker: vampire — pale body, black-crimson cape collar.
  vec3 palePowder = vec3(0.86, 0.84, 0.82);
  vec3 capeBlack = vec3(0.06, 0.04, 0.07);
  vec3 crimson = vec3(0.55, 0.04, 0.10);
  float paleBody = 1.0 - smoothstep(0.85, 1.0, c.x);
  vec3 dressed = mix(albedo, palePowder, paleBody * 0.8);
  float cape = smoothstep(0.05, 0.3, c.y) * (1.0 - smoothstep(0.4, 0.6, c.x));
  dressed = mix(dressed, capeBlack, cape * 0.95);
  float capeLining = sealSoftBand(c.y, 0.1, 0.14) * (1.0 - smoothstep(0.4, 0.6, c.x));
  dressed = mix(dressed, crimson, capeLining * 0.7);
  float collar = sealSoftBand(c.x, 0.5, 0.12) * smoothstep(0.1, 0.5, c.y);
  dressed = mix(dressed, capeBlack, collar);
  float collarEdge = sealSoftBand(c.x, 0.56, 0.05) * smoothstep(0.05, 0.4, c.y);
  return mix(dressed, crimson, collarEdge * 0.8);
}

// Costume aura rim color * strength; drives the fresnel emissive glow.
vec3 sealCostumeAura(float id, float t) {
  if (id < 0.5) return vec3(0.0);
  if (id < 1.5) return vec3(1.0, 0.84, 0.25) * 0.85;
  if (id < 2.5) return vec3(0.553, 0.412, 0.839) * 0.55;
  if (id < 3.5) return vec3(0.933, 0.58, 0.25) * (0.5 + 0.18 * sin(t * 7.0));
  if (id < 4.5) {
    return mix(vec3(0.08, 0.62, 0.36), vec3(0.30, 0.85, 0.55), 0.5 + 0.5 * sin(t * 2.6)) * 0.5;
  }
  if (id < 5.5) {
    // night avenger: near-black navy rim with a pulsing red glint.
    return vec3(0.06, 0.10, 0.24) * 0.45
      + vec3(0.55, 0.06, 0.08) * (0.16 + 0.22 * step(0.5, fract(t * 0.8)));
  }
  if (id < 6.5) {
    // demon archivist: smoky violet-magenta aura with a slow seethe.
    return mix(vec3(0.30, 0.08, 0.38), vec3(0.65, 0.10, 0.50), 0.5 + 0.5 * sin(t * 1.3)) * 0.6;
  }
  // vampire: blood-red aura rim.
  return vec3(0.62, 0.04, 0.08) * (0.55 + 0.15 * sin(t * 2.0));
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

// Belly-to-back two-tone: cooler shaded back, warmer ivory underside.
float backShade = smoothstep(-0.1, 0.75, vSealCanonical.y);
sealAlbedo = mix(sealAlbedo, sealAlbedo * vec3(0.86, 0.91, 1.02), backShade * 0.4);
sealAlbedo = mix(sealAlbedo, warmIvory, smoothstep(-0.25, -0.85, vSealCanonical.y) * 0.3);

float chest = sealBlob(vSealCanonical, vec3(0.30, -0.83, 0.0), vec3(0.66, 0.39, 0.72));
float muzzleNear = sealBlob(vSealCanonical, vec3(0.965, 0.015, 0.15), vec3(0.15, 0.25, 0.18));
float muzzleFar = sealBlob(vSealCanonical, vec3(0.965, 0.015, -0.15), vec3(0.15, 0.25, 0.18));
sealAlbedo = mix(sealAlbedo, warmIvory, clamp(chest * 0.78 + max(muzzleNear, muzzleFar), 0.0, 1.0));

float spotA = sealBlob(vSealCanonical, vec3(-0.34, 0.47, 0.79), vec3(0.43, 0.34, 0.30));
float spotB = sealBlob(vSealCanonical, vec3(0.08, 0.69, -0.69), vec3(0.36, 0.28, 0.34));
float spotC = sealBlob(vSealCanonical, vec3(-0.58, -0.34, -0.71), vec3(0.31, 0.30, 0.36));
sealAlbedo = mix(sealAlbedo, blueGray, clamp(spotA * 0.60 + spotB * 0.52 + spotC * 0.44, 0.0, 0.72));

// Flipper edge definition: darkened rims at fore-flipper and tail-fork bounds.
float flipperZone = exp(-pow((vSealCanonical.x - 0.02) / 0.24, 2.0))
  * smoothstep(0.55, 0.9, abs(vSealCanonical.z));
float tailFlipperZone = smoothstep(0.5, 0.95, -vSealCanonical.x)
  * smoothstep(0.3, 0.8, abs(vSealCanonical.z));
float flipperEdge = clamp(flipperZone * (1.0 - flipperZone) * 4.0, 0.0, 1.0);
float tailEdge = clamp(tailFlipperZone * (1.0 - tailFlipperZone) * 4.0, 0.0, 1.0);
sealAlbedo = mix(sealAlbedo, blueGray, flipperEdge * 0.28 + tailEdge * 0.24);

float eyeNear = sealBlob(vSealCanonical, vec3(0.915, 0.345, 0.19), vec3(0.105, 0.115, 0.09));
float eyeFar = sealBlob(vSealCanonical, vec3(0.915, 0.345, -0.19), vec3(0.105, 0.115, 0.09));
float eyeHaloNear = sealBlob(vSealCanonical, vec3(0.88, 0.33, 0.19), vec3(0.18, 0.18, 0.15));
float eyeHaloFar = sealBlob(vSealCanonical, vec3(0.88, 0.33, -0.19), vec3(0.18, 0.18, 0.15));
float nose = sealBlob(vSealCanonical, vec3(0.997, 0.015, 0.0), vec3(0.06, 0.13, 0.14));
sealAlbedo = mix(sealAlbedo, blueGray, max(eyeHaloNear, eyeHaloFar) * 0.34);
sealAlbedo = mix(sealAlbedo, indigoInk, clamp(max(eyeNear, eyeFar) + nose, 0.0, 1.0));

// Face detailing: nostril darks, whisker dots on the muzzle, and a small
// secondary catchlight glint painted inside each eye.
float nostrilNear = sealBlob(vSealCanonical, vec3(0.998, 0.06, 0.045), vec3(0.028, 0.045, 0.035));
float nostrilFar = sealBlob(vSealCanonical, vec3(0.998, 0.06, -0.045), vec3(0.028, 0.045, 0.035));
sealAlbedo = mix(sealAlbedo, vec3(0.02, 0.03, 0.06), clamp(nostrilNear + nostrilFar, 0.0, 1.0));
float whiskerDots = step(0.72, sin(vSealCanonical.y * 52.0) * sin(vSealCanonical.z * 46.0));
sealAlbedo = mix(
  sealAlbedo,
  indigoInk,
  whiskerDots * clamp(muzzleNear + muzzleFar, 0.0, 1.0) * 0.55
);
float catchNear = sealBlob(vSealCanonical, vec3(0.93, 0.30, 0.155), vec3(0.032, 0.036, 0.03));
float catchFar = sealBlob(vSealCanonical, vec3(0.93, 0.30, -0.155), vec3(0.032, 0.036, 0.03));
sealAlbedo = mix(sealAlbedo, vec3(0.96, 0.98, 1.0), clamp(catchNear + catchFar, 0.0, 1.0) * 0.9);

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
  material.customProgramCacheKey = () => "topological-seal-anime-xz-glumph-costume-v5";

  // Instanced hairstyle material: shares the ramp and runtime uniforms so
  // strand sway, growth, and per-style curl stay phase-locked with the body.
  // Tail-bend inheritance was dropped: every strand roots on the crown
  // (canonical x >= 0.34), so the tail zone never receives hair.
  const furMaterial = new THREE.MeshToonMaterial({ color: "#FFFFFF", gradientMap });
  furMaterial.name = "TopologicalSealHairstyle deterministic instanced strand pool";
  furMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, runtime);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uTime;
uniform float uSpeed;
uniform float uMotion;
uniform float uHairGrow;
uniform float uHairSway;
uniform vec2 uHairCurl;
varying float vFurTip;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vFurTip = clamp(position.y, 0.0, 1.0);
float furPhase = dot(instanceMatrix[3].xyz, vec3(12.9898, 78.233, 37.719));
float furGust = sin(uTime * 2.3 + furPhase) * 0.6 + sin(uTime * 3.9 + furPhase * 1.7) * 0.4;
float furFlatten = smoothstep(0.16, 4.0, uSpeed);
float furBendWeight = vFurTip * vFurTip * uMotion * uHairSway;
transformed.x += furGust * furBendWeight * 0.14 * (1.0 - furFlatten * 0.55);
transformed.z += cos(uTime * 1.7 + furPhase * 1.3) * furBendWeight * 0.1 * (1.0 - furFlatten * 0.55);
// Costume crossfade growth: strands scale from their root with the dock.
transformed *= uHairGrow;`,
      )
      .replace(
        "#include <project_vertex>",
        `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
// Per-style tip curl in seal object space after instancing: +x is the nose,
// so uHairCurl.x bends tips toward the tail and uHairCurl.y droops them down.
float furCurlT = vFurTip * vFurTip * uHairGrow;
mvPosition.x -= uHairCurl.x * furCurlT;
mvPosition.y -= uHairCurl.y * furCurlT;
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform vec3 uHairTipColor;
uniform float uHairTipBias;
varying float vFurTip;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
// Root-to-tip gradient: darkened roots rise to a lightened tip. Styles with
// tipBias > 0 pull tips toward an authored tip color (flame-crown gold) so
// the strand mass never reads as one flat paint bucket.
vec3 furBase = diffuseColor.rgb;
vec3 furTipLift = min(furBase * 1.3 + 0.05, vec3(1.0));
vec3 furTipTarget = mix(furTipLift, uHairTipColor, uHairTipBias);
float furTipCurve = vFurTip * vFurTip * (3.0 - 2.0 * vFurTip);
diffuseColor.rgb = mix(furBase * 0.8, furTipTarget, furTipCurve);`,
      )
      .replace(
        "return vec3( texture2D( gradientMap, coord ).r );",
        "return texture2D( gradientMap, coord ).rgb;",
      );
  };
  furMaterial.customProgramCacheKey = () => "topological-seal-anime-hairstyle-v3";

  return { furMaterial, gradientMap, material, runtime };
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
  const furCoat = useRef(null);
  const hairBakedCostume = useRef(-1);
  const dockFlick = useRef({ lastDocked: null, start: -1 });
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
  const costumeDemonHalo = useMemo(
    () =>
      new THREE.Color(COSTUME_DEMON_HALO.base).lerp(
        new THREE.Color(COSTUME_DEMON_HALO.edge),
        0.35,
      ),
    [],
  );
  const errorLightColor = useMemo(() => new THREE.Color("#F2B96B"), []);
  const eyeStyles = useMemo(() => {
    const styles = {};
    for (const [key, entry] of Object.entries(COSTUME_EYE_STYLE)) {
      styles[key] = {
        iris: new THREE.Color(entry.iris),
        glint: new THREE.Color(entry.glint),
      };
    }
    return styles;
  }, []);
  const size = useThree((state) => state.size);
  const presentationScale = resolveSealPresentationScale(size);
  const geometry = useMemo(() => createSealManifoldGeometry({ quality }), [quality]);
  const furPlacements = useMemo(
    () => createSealFurPlacements(geometry, quality),
    [geometry, quality],
  );
  const furGeometry = useMemo(() => {
    // 5 radial x 4 height open segments = 40 triangles per strand, enough
    // resolution for the shader tip curl on few large shaped strands.
    const strand = new THREE.ConeGeometry(1, 1, 5, 4, true);
    strand.translate(0, 0.5, 0);
    strand.name = "TopologicalSealHairStrand";
    return strand;
  }, []);
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

  // Hairstyle pool baseline: start every anchor at zero scale (sleek bald
  // seal) and force a per-costume rebake whenever the anchor pool changes.
  // Style bakes run in the frame loop only when the docked costume changes.
  useLayoutEffect(() => {
    hairBakedCostume.current = -1;
    writeHairStyle(furCoat.current, furPlacements, null);
  }, [furPlacements]);

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  useEffect(
    () => () => {
      furGeometry.dispose();
    },
    [furGeometry],
  );
  useEffect(
    () => () => {
      resources.material.dispose();
      resources.furMaterial.dispose();
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

    // Tail dock-arrival flick: a short decaying vertical oscillation.
    if (dockedId !== dockFlick.current.lastDocked) {
      if (dockedId && !reducedMotion) dockFlick.current.start = clock.elapsedTime;
      dockFlick.current.lastDocked = dockedId;
    }
    const flickElapsed = clock.elapsedTime - dockFlick.current.start;
    resources.runtime.uDockFlick.value =
      !reducedMotion && dockFlick.current.start >= 0 && flickElapsed < 0.7
        ? Math.sin((flickElapsed / 0.7) * Math.PI) * Math.sin(flickElapsed * 26)
        : 0;

    // Station hairstyle: bake the strand pool once per dock change, then ride
    // the costume crossfade. Docking grows the incoming style from its roots;
    // undocking shrinks the outgoing style back to the sleek bald seal. Since
    // docks always pass through plain costume 0, only one style is ever baked.
    const toHair = SEAL_COSTUME_HAIR[transition.to] || null;
    const fromHair = SEAL_COSTUME_HAIR[transition.from] || null;
    const hairCostume = toHair ? transition.to : fromHair ? transition.from : 0;
    if (hairBakedCostume.current !== hairCostume) {
      hairBakedCostume.current = hairCostume;
      writeHairStyle(furCoat.current, furPlacements, SEAL_COSTUME_HAIR[hairCostume] || null);
    }
    const hairStyle = SEAL_COSTUME_HAIR[hairCostume] || null;
    resources.runtime.uHairGrow.value = !hairStyle ? 0 : toHair ? costumeBlend : 1 - costumeBlend;
    resources.runtime.uHairSway.value = hairStyle?.sway ?? 0;
    resources.runtime.uHairCurl.value.set(hairStyle?.curl?.[0] ?? 0, hairStyle?.curl?.[1] ?? 0);
    resources.runtime.uHairTipBias.value = hairStyle?.tipBias ?? 0;
    resources.runtime.uHairTipColor.value.set(hairStyle?.tipColor || "#FFFFFF");

    const wardrobe = SEAL_COSTUME_WARDROBE[transition.to];
    if (accessoryState.current.costume !== transition.to) {
      accessoryState.current.costume = transition.to;
      accessoryState.current.settled = false;
      // Costume eye recolor through the existing eye instance-color slots
      // (red-glint avenger, purple demon archivist, default everywhere else).
      const eyeStyle = eyeStyles[transition.to] || eyeStyles.default;
      for (let index = 0; index < EYE_INSTANCE_COUNT; index += 1) {
        eyes.current?.setColorAt(index, eyeStyle.iris);
        eyeHighlights.current?.setColorAt(index, eyeStyle.glint);
      }
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

    const demonHaloActive = transition.to === 6 && costumeBlend > 0.4;
    if (haloMaterial.current) {
      const costumeHaloActive =
        (transition.to === 1 || transition.to === 6) && costumeBlend > 0.4;
      const haloTarget = !costumeHaloActive
        ? haloColors[state] || haloColors.idle
        : demonHaloActive
          ? costumeDemonHalo
          : costumeGoldHalo;
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
      // The demonic archive halo tilts far steeper than the station default.
      const haloAxis = demonHaloActive
        ? COSTUME_DEMON_HALO.tiltRadians
        : haloPresentation.tiltRadians;
      haloMesh.current.rotation.x = reducedMotion
        ? haloAxis
        : THREE.MathUtils.lerp(
            haloMesh.current.rotation.x,
            haloAxis,
            1 - Math.exp(-6.5 * frameStep),
          );
      const demonYaw = demonHaloActive ? COSTUME_DEMON_HALO.yawRadians : 0;
      haloMesh.current.rotation.y = reducedMotion
        ? demonYaw
        : THREE.MathUtils.lerp(
            haloMesh.current.rotation.y,
            demonYaw,
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
          : demonHaloActive
            ? costumeDemonHalo
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
    // Camera-weight facing applies only while semantically docked (station or
    // observatory poses). At rest in open snow the last travel heading holds,
    // preserving the chase-camera read instead of spinning toward the lens.
    const stationWorld = dockedId ? STATION_WORLD_SCHEMA.stations[dockedId] : null;
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
          args={[null, null, furPlacements.length]}
          geometry={furGeometry}
          material={resources.furMaterial}
          name="seal-anime-hairstyle-pool deterministic-instanced-strands"
          ref={furCoat}
          renderOrder={10}
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
