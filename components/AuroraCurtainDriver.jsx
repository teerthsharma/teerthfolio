"use client";

/**
 * The aurora field's driver, with no opinion about where the curtain is drawn.
 *
 * There are two places it can be drawn, and they are not interchangeable:
 *
 *   components/AuroraSkyShell.jsx      inside the world's own R3F scene, on a
 *                                      sky shell with real depth, so the
 *                                      terrain occludes it.
 *   components/AuroraFieldCurtain.jsx  its own context over routes that have no
 *                                      3D world to be occluded by.
 *
 * Everything above the geometry is identical between them -- the split-step, the
 * half-float pack, the reduced-motion pose, the uniform block -- so it lives
 * here once. This module deliberately mounts no Canvas and no mesh; it is the
 * part that would be duplicated otherwise.
 *
 * The physics, the GLSL and the derivation stay in lib/aurora-field.js.
 */

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  AURORA_CARRIER_NORM,
  AURORA_CARRIER_UV,
  AURORA_CARRIER_UV_B,
  AURORA_CARRIER_UV_C,
  AURORA_LAYOUT,
  AURORA_PHYSICS,
  AURORA_RENDER,
  AURORA_TIERS,
  createAuroraField,
} from "../lib/aurora-field";

/**
 * Steps from the seed to the pose reduced-motion freezes on. Modulational
 * instability needs about ln(1/0.06) / (|g_eff| n dt) steps to take the seeded
 * 6% modulation to saturation; past that the filaments are developed and the
 * remaining motion is the slow trap slosh, which is what freezing removes.
 *
 * Deterministic: the seed is fixed and there is no Math.random anywhere in the
 * field, so every reduced-motion visitor sees the SAME composed curtain rather
 * than whichever pose their machine happened to reach before it stopped.
 */
export const REDUCED_MOTION_POSE_STEPS = 300;
const POSE_STEPS_PER_FRAME = 24;

/** Carrier phase and arc drift, in field-time units per wall second. */
const CARRIER_RATE = AURORA_PHYSICS.dt * AURORA_TIERS.high.tickHz;
const ARC_DRIFT_PER_SECOND = 0.0022;

const OMEGA_ZERO = 0.5 * (AURORA_PHYSICS.k0[0] ** 2 + AURORA_PHYSICS.k0[1] ** 2);
// The second harmonic's own dispersion. It has to be computed from its own k,
// not shared: equal omegas would lock the two combs together and the beat that
// bundles the rays would stand still instead of travelling.
const OMEGA_ZERO_B = 0.5 * (AURORA_PHYSICS.k0b[0] ** 2 + AURORA_PHYSICS.k0b[1] ** 2);
// And the third's, for the same reason: shared omegas lock combs together.
const OMEGA_ZERO_C = 0.5 * (AURORA_PHYSICS.k0c[0] ** 2 + AURORA_PHYSICS.k0c[1] ** 2);

export function resolveTier() {
  if (typeof document === "undefined") return "medium";
  // The world publishes its measured tier on its own canvas. Reading it keeps
  // the veil on the same quality ladder without wiring a prop through a tree it
  // does not live in -- and on routes with no world at all (/admin) the veil
  // still has to pick something, so medium is the floor it falls back to.
  const quality = document.querySelector("canvas.igloo-scene-canvas")?.dataset.quality;
  return quality && AURORA_TIERS[quality] ? quality : "medium";
}

/**
 * One evolving field, its texture, and its uniform block.
 *
 * `advance(delta)` runs whatever the frame owes and reports what it did, so the
 * host can decide what that means. It returns:
 *
 *   "live"     the field ticked; keep asking for frames.
 *   "posing"   reduced motion, still composing the frozen pose.
 *   "settled"  reduced motion, pose complete on THIS call.
 *   "held"     reduced motion, pose complete on an earlier call. Nothing to do.
 *
 * The distinction matters because a standalone canvas answers "settled" by
 * stopping its animation loop outright, and a curtain living inside the world's
 * canvas must not -- that loop belongs to the world.
 */
/**
 * `arcRepeats` is how many circuits of the periodic box the host wraps around
 * its own arc, and it is the one thing the two hosts genuinely disagree about.
 * The veil lays the arc across the frame, so one box is one frame and the
 * default is right. The shell lays it around the whole compass, of which a
 * camera sees 58 degrees -- see AURORA_ARC_REPEATS for what one circuit did
 * there.
 */
export function useAuroraCurtain({ arcFeather = 0.1, arcRepeats = 1, reducedMotion, tier }) {
  const profile = AURORA_TIERS[tier] ?? AURORA_TIERS.medium;

  const { staging, texture, uniforms } = useMemo(() => {
    const data = new Uint16Array(profile.nx * profile.ny * 4);
    const map = new THREE.DataTexture(
      data,
      profile.nx,
      profile.ny,
      THREE.RGBAFormat,
      THREE.HalfFloatType,
    );
    // Repeat in x is not a convenience: the auroral oval is a circle, so
    // periodic along the arc is the physical boundary condition. Clamp in y
    // because altitude is not periodic; the trap keeps the field away from that
    // edge anyway (A14).
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    map.minFilter = THREE.LinearFilter;
    map.magFilter = THREE.LinearFilter;
    map.generateMipmaps = false;
    map.needsUpdate = true;
    return {
      staging: new Float32Array(profile.nx * profile.ny * 4),
      texture: map,
      uniforms: {
        uArcFeather: { value: arcFeather },
        uArcRepeats: { value: arcRepeats },
        uCarrier: { value: new THREE.Vector2(...AURORA_CARRIER_UV) },
        uCarrierB: { value: new THREE.Vector2(...AURORA_CARRIER_UV_B) },
        uCarrierC: { value: new THREE.Vector2(...AURORA_CARRIER_UV_C) },
        uCarrierMix: { value: AURORA_RENDER.carrierMix },
        uCarrierNorm: { value: AURORA_CARRIER_NORM },
        uCarrierPhase: { value: 0 },
        uCarrierPhaseB: { value: 0 },
        uCarrierPhaseC: { value: 0 },
        uCoreGain: { value: AURORA_RENDER.coreGain },
        uCoreKnee: { value: AURORA_RENDER.coreKnee },
        uDrift: { value: 0 },
        uField: { value: map },
        uAlphaCeiling: { value: AURORA_RENDER.alphaCeiling },
        uFilamentMix: { value: AURORA_RENDER.filamentMix },
        uHardness: { value: AURORA_RENDER.hardness },
        uIntensity: { value: AURORA_RENDER.intensity },
        uRayDepth: { value: AURORA_RENDER.rayDepth },
        uMesoHigh: { value: AURORA_RENDER.mesoHigh },
        uMesoLow: { value: AURORA_RENDER.mesoLow },
        uNorthBand: { value: new THREE.Vector2(...AURORA_LAYOUT.north) },
        uRodAchromatic: { value: AURORA_RENDER.rodAchromatic },
        uSouthBand: { value: new THREE.Vector2(...AURORA_LAYOUT.south) },
      },
    };
  }, [arcFeather, arcRepeats, profile.nx, profile.ny]);

  const driver = useRef(null);
  if (!driver.current || driver.current.nx !== profile.nx) {
    driver.current = {
      accumulator: 0,
      carrierTime: 0,
      drift: 0,
      field: createAuroraField({ nx: profile.nx, ny: profile.ny }),
      nx: profile.nx,
      posed: false,
      poseSteps: 0,
    };
  }

  useEffect(() => () => texture.dispose(), [texture]);

  const upload = () => {
    const state = driver.current;
    state.field.pack(staging);
    const data = texture.image.data;
    for (let i = 0; i < staging.length; i += 1) data[i] = THREE.DataUtils.toHalfFloat(staging[i]);
    texture.needsUpdate = true;
  };

  const advance = (delta) => {
    const state = driver.current;

    if (reducedMotion) {
      if (state.posed) return "held";
      // Build the frozen pose in bounded slices so no single frame carries the
      // whole 300-step run. Nothing is presented until it is composed, so this
      // is load cost, not animation.
      const target = Math.min(REDUCED_MOTION_POSE_STEPS, state.poseSteps + POSE_STEPS_PER_FRAME);
      while (state.poseSteps < target) {
        state.field.step(AURORA_PHYSICS.dt);
        state.poseSteps += 1;
      }
      upload();
      if (state.poseSteps < REDUCED_MOTION_POSE_STEPS) return "posing";
      state.posed = true;
      // A still, developed curtain, held. Not an absence of one.
      uniforms.uCarrierPhase.value = OMEGA_ZERO * (REDUCED_MOTION_POSE_STEPS * AURORA_PHYSICS.dt);
      uniforms.uCarrierPhaseB.value = OMEGA_ZERO_B * (REDUCED_MOTION_POSE_STEPS * AURORA_PHYSICS.dt);
      uniforms.uCarrierPhaseC.value = OMEGA_ZERO_C * (REDUCED_MOTION_POSE_STEPS * AURORA_PHYSICS.dt);
      uniforms.uDrift.value = 0;
      return "settled";
    }

    // Continuous, analytic, and the reason a 15 Hz field reads as smooth: this
    // is the fringe motion, and it never waits for a tick.
    state.carrierTime += delta * CARRIER_RATE;
    state.drift += delta * ARC_DRIFT_PER_SECOND;
    uniforms.uCarrierPhase.value = OMEGA_ZERO * state.carrierTime;
    uniforms.uCarrierPhaseB.value = OMEGA_ZERO_B * state.carrierTime;
    uniforms.uCarrierPhaseC.value = OMEGA_ZERO_C * state.carrierTime;
    uniforms.uDrift.value = state.drift;

    if (typeof document !== "undefined" && document.hidden) return "live";

    state.accumulator += Math.min(delta, 0.25);
    if (state.accumulator >= 1 / profile.tickHz) {
      // One tick per frame at most. Letting a stall bank ticks would repay the
      // debt as a burst of transforms in the frame after the stall, which is
      // the worst possible frame to put them in.
      state.accumulator = 0;
      state.field.step(AURORA_PHYSICS.dt);
      upload();
    }
    return "live";
  };

  return { advance, profile, texture, uniforms };
}
