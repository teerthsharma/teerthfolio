"use client";

/**
 * The aurora, inside the world, on a sky shell with real depth.
 *
 * WHAT THIS REPLACES, AND WHY
 *
 * The curtain used to hang in its own WebGL context, composited over the world's
 * canvas by CSS mix-blend-mode: screen. That arrangement cannot depth-test
 * against anything, so the curtain passed over the mountains -- and an aurora
 * drawn over a ridge is not sky, it is a screen effect pasted on a photograph.
 * The previous pass mitigated it with a long lower feather, which cleaned the
 * dome but left the distant geography faintly washed.
 *
 * A feather cannot fix this because it is not an art problem. It is a
 * compositing problem, and the only place it can be solved is inside the depth
 * buffer that already knows where the mountains are. So the curtain moves into
 * the world's own scene:
 *
 *   - a sky shell, radius just inside the biome's own dome, following the camera
 *     so it never parallaxes on translation. Sky does not slide past you.
 *   - transparent, so it draws AFTER every opaque pass. The terrain, the
 *     buildings, the dome and the mascot have all written depth by then.
 *   - depthTest on, depthWrite off. Every fragment the world already covered is
 *     rejected before it is ever shaded -- which on a fill-bound machine makes
 *     this cheaper than the old fullscreen quad, not more expensive.
 *
 * The world's opaque sky dome writes no depth (it is drawn after the terrain as
 * an early-z fill guard), so it cannot occlude the curtain. That is correct: the
 * dome paints a horizon gradient, not a silhouette. The things that occlude are
 * the things with geometry, and those are exactly the things that should.
 *
 * WHAT THE GEOMETRY IS
 *
 * A band of a sphere, cut to the elevations the curtain actually occupies. The
 * fragment shader in lib/aurora-field.js reads vUv.x as the arc coordinate --
 * `fract(vUv.x + uDrift)`, periodic, because the auroral oval is a circle -- and
 * vUv.y as altitude within uNorthBand. A sphere's own uv is already that:
 * azimuth around, elevation up. So the shell needs no new maths, only the band
 * remap in the vertex shader below, and the shader that was written for a screen
 * becomes a shader written for a sky without a character changing in it.
 *
 * Two consequences worth stating rather than discovering:
 *
 *   The southern hem never draws. uSouthBand is vUv.y in [0, 0.16] and the band
 *   remap starts at 0.54, so the conjugate curtain is off the bottom of the
 *   shell. It was a screen-space conceit; a world with a horizon has no room
 *   for the other hemisphere, and claiming one would be a lie about the view.
 *
 *   The arc has ends. The shader feathers vUv.x to zero over the outer 10% at
 *   each side, which on a screen was chrome protection and on a sphere is an
 *   arc that occupies a bearing instead of ringing the whole compass. SHELL_YAW
 *   points those soft ends away from the observatory approach, so the curtain
 *   reads as a direction you could walk toward.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  AURORA_ARC_REPEATS,
  AURORA_FRAGMENT_SHADER,
  AURORA_SHELL_ELEVATION,
} from "../lib/aurora-field";
import { useAuroraCurtain } from "./AuroraCurtainDriver";

/**
 * Calibration, not physics. The field does not know how tall this world's
 * mountains are or where its camera looks.
 */
/** Just inside PolarBiomeWorld's SKY_RADIUS of 44, and well inside the 94 far
 *  plane, so the whole band is in frustum from any camera pose. */
const SHELL_RADIUS = 42;
/**
 * The elevations the curtain spans, in degrees above the horizon.
 *
 * The bottom is deliberately BELOW zero. The curtain's own lower feather takes
 * it to nothing at the band edge, so a base pinned at the horizon would fade out
 * exactly where the ridges are and there would be nothing left for them to
 * occlude. Starting under the horizon puts a lit part of the curtain behind the
 * skyline, which is the entire point of this file.
 *
 * The top is low on purpose too. The observatory dome is the focal object and it
 * owns the upper frame; an aurora at the zenith would be the first thing the eye
 * finds, and that is a failed pass however good the curtain looks.
 */
/**
 * The elevations the curtain spans, and how much sky this world's camera shows,
 * both live in lib/aurora-field.js beside the assertion that pins them.
 *
 * The bottom is deliberately BELOW zero. The curtain's own lower feather takes
 * it to nothing at the band edge, so a base pinned at the horizon would fade out
 * exactly where the ridges are and there would be nothing left for them to
 * occlude. Starting under the horizon puts a lit part of the curtain behind the
 * skyline, which is the entire point of this file.
 *
 * The top is low on purpose too, and far lower than it first was. The camera
 * looks down at its station, so the sky it shows is a shallow strip along the
 * top edge -- measured at 3.7 degrees, see AURORA_CAMERA_SKY. A band reaching
 * 31 degrees put the whole curtain above the frame and left its dim skirt in
 * shot, which is what a stain is. A25 asserts the band lands in the sky the
 * camera actually has.
 *
 * ONE band, EIGHT cameras. The shell follows the eye, so its elevations are the
 * same from every station -- which is the only honest arrangement, because the
 * sky is shared and an aurora that slid up and down as the visitor walked
 * between stations would be a sky that slides. What is not shared is the
 * framing: the eight cameras pitch down between 5.5 and 15 degrees behind 36 to
 * 43 degrees of vertical field, so the strip of sky runs from 95px at the
 * observatory to 335px at the ice bridge and the same band arrives at a
 * different size in each. A26 sweeps all eight; section 11 of the maths
 * document carries the measured table and the ablation that validated it.
 */
const CURTAIN_ELEVATION_LOW = AURORA_SHELL_ELEVATION.low;
const CURTAIN_ELEVATION_HIGH = AURORA_SHELL_ELEVATION.high;
/** Bearing of the arc's centre. Points the feathered ends off the approach. */
const SHELL_YAW = Math.PI * 0.5;
/**
 * Segments around and up. The band carries no high-frequency geometry -- every
 * detail in it is per-pixel -- so this only has to be fine enough that the
 * linear-in-elevation uv does not visibly kink. 64x8 is two chords per degree of
 * arc at the widest point.
 */
const SHELL_SEGMENTS = [64, 8];

const toTheta = (elevationDegrees) => Math.PI / 2 - (elevationDegrees * Math.PI) / 180;

/**
 * Standard projection, and one line of band remap.
 *
 * uv.y runs 0 at the bottom rim of the band to 1 at the top, and uNorthBand is
 * the slice of altitude the fragment shader draws in. Mapping the rims onto the
 * band edges rather than onto 0..1 is what keeps the curtain fading to exactly
 * zero at both rims -- anything else leaves a hard horizontal cut at the edge of
 * the geometry, which reads as a wipe.
 */
const SHELL_VERTEX_SHADER = `
  uniform vec2 uNorthBand;
  varying vec2 vUv;
  void main() {
    vUv = vec2(uv.x, mix(uNorthBand.x, uNorthBand.y, uv.y));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export default function AuroraSkyShell({ quality = "medium", reducedMotion = false }) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const shellRef = useRef(null);
  // The arc goes round the whole compass here and the camera sees 58 degrees of
  // it, so one circuit of the box put every scale six times too coarse to
  // resolve -- the defect that made this render as a stain rather than as a
  // curtain with rays in it. AURORA_ARC_REPEATS carries the derivation; A24
  // pins the pitch it lands at.
  const { advance, uniforms } = useAuroraCurtain({
    // A ring has no ends. The shader's default feather is the veil's chrome
    // protection at the edges of a frame, and on a compass it was a dead zone
    // 36 degrees wide sitting inside the shot.
    arcFeather: 0,
    arcRepeats: AURORA_ARC_REPEATS,
    reducedMotion,
    tier: quality,
  });

  const geometry = useMemo(
    () =>
      new THREE.SphereGeometry(
        SHELL_RADIUS,
        SHELL_SEGMENTS[0],
        SHELL_SEGMENTS[1],
        SHELL_YAW,
        Math.PI * 2,
        toTheta(CURTAIN_ELEVATION_HIGH),
        toTheta(CURTAIN_ELEVATION_LOW) - toTheta(CURTAIN_ELEVATION_HIGH),
      ),
    [],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        // Emission adds light and never removes it -- the same claim the CSS
        // screen blend was making, made where the depth buffer can hear it.
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        fragmentShader: AURORA_FRAGMENT_SHADER,
        // The curtain is at the top of the atmosphere. Fogging it would be
        // fogging the sky, and the world's fog is for distance on the ground.
        fog: false,
        // The shader writes premultiplied rgb, so AdditiveBlending resolves to
        // ONE / ONE rather than SRC_ALPHA / ONE. The body term is identical
        // either way -- the shader does the multiply that the blend used to --
        // and the difference is that the additive core term is then outside the
        // alpha ceiling, which is the entire point of it. See the end of
        // AURORA_FRAGMENT_SHADER.
        premultipliedAlpha: true,
        side: THREE.BackSide,
        transparent: true,
        uniforms,
        vertexShader: SHELL_VERTEX_SHADER,
      }),
    [uniforms],
  );

  // Every render target, geometry and material this file allocates, released on
  // unmount. scripts/check-gpu-lifecycle.mjs is run against this.
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    // The shell is the sky: centred on the eye every frame so it never slides
    // past the viewer, exactly as PolarBiomeWorld pins its own dome. Translation
    // parallax on a thing 100km up is a thing 100km up moving, and it isn't.
    if (shellRef.current) shellRef.current.position.copy(camera.position);
    const state = advance(delta);
    // Reduced motion still has to compose its pose, and the world's canvas may
    // be on demand while it does. Ask for the frames -- but only until the pose
    // is built, and never by stopping the world's animation loop, which is not
    // this component's to stop.
    if (state === "posing") invalidate();
  });

  return (
    <mesh
      frustumCulled={false}
      geometry={geometry}
      material={material}
      name="AuroraSkyShell"
      ref={shellRef}
      renderOrder={-10}
    />
  );
}
