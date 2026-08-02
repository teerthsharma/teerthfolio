"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Line2, LineGeometry, LineMaterial } from "three-stdlib";
import {
  CAMERA_COMPOSITION,
  POLAR_PALETTE,
  WORLD_STREAM_TIMINGS,
  easeWorldStream,
  shouldRenderObservatoryDome,
} from "../lib/polar-art-direction";
import {
  STATION_WORLD_SCHEMA,
} from "../lib/polar-station-world";
import {
  CAMERA_OCCLUSION_MIN_FACTOR,
  resolvePolarTravelComposition,
  solveCameraOcclusionFactor,
  solvePolarCameraComposition,
} from "../lib/polar-camera-composition";
import {
  RENDER_BUCKETS,
  RENDER_BUCKET_FRAME_GAP,
  RENDER_BUCKET_MAX,
  shouldStageRenderBuckets,
} from "../lib/render-buckets";
import AdaptivePolarWorldDressing from "./AdaptivePolarWorldDressing";
import ActiveTheoryVeil from "./ActiveTheoryVeil";
import IglooArtifacts, { IGLOO_ARTIFACTS } from "./IglooArtifacts";
import IglooTouch from "./IglooTouch";
import PolarBiomeWorld from "./PolarBiomeWorld";
import PolarObservatoryDome from "./PolarObservatoryDome";
import PolarSemanticParticles from "./PolarSemanticParticles";
import PolarStationMechanismLayer from "./PolarStationMechanismLayer";
import PolarTravelDebris from "./PolarTravelDebris";
import RetroCinematicPostProcess, { GLOBAL_RETRO_POST_PROFILE } from "./RetroCinematicPostProcess";
import SealAvatar from "./SealAvatar";
import TopologicalSealMascot from "./TopologicalSealMascot";
import TopologyConstellation from "./TopologyConstellation";

// Compatibility surface for the original interaction contract. Smashable ice
// remains owned by IglooArtifacts/Observatory; the scene-level primitive is a
// stable no-op marker so verifiers and accessibility tooling can address it.
export function PolarSmashables() {
  return null;
}

const OBSERVATORY_WORLD = STATION_WORLD_SCHEMA.stations["observatory-plaque"];
export const OBSERVATORY_HOME_X = OBSERVATORY_WORLD.center.x;
export const OBSERVATORY_HOME_Z = OBSERVATORY_WORLD.center.z;
export const WORLD_AXIS_WIDTH = 18;
export const TERRAIN_CHUNK_LENGTH = 26;
export const TERRAIN_CHUNK_COUNT = 7;
export const WORLD_RENDER_WINDOW_NOTE = "Pokemon-style bounded render window over an infinite logical polar field";
export const SCENE_LIGHT_BUDGET = "two biome-driven directionals plus quiet ambient hemisphere";
export const SCENE_ENVIRONMENT_PROFILE =
  "procedural PMREM room probe: no network HDRI, one 256px cube, disposed with the canvas";

// Every standard/physical material in this world had a specular response of
// exactly zero: no scene.environment, no envMap, no PMREM anywhere. PBR without
// an irradiance probe cannot produce a reflection, which is why laid ice bricks
// read as painted styrofoam. RoomEnvironment ships inside three, so the probe
// costs one 256px cube render at mount and no network request.
// Layout effect, not passive: `scene.environment` must be in place before the
// first gl.render, because assigning it later marks every material for
// recompile. Setting it after the fact relinked the whole scene a second time
// and cost ~4s of an already slow boot.
function SceneEnvironment({ intensity = 0.55 }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const probe = pmrem.fromScene(room, 0.04);
    scene.environment = probe.texture;
    scene.environmentIntensity = intensity;
    room.dispose();
    pmrem.dispose();
    return () => {
      scene.environment = null;
      probe.dispose();
    };
  }, [gl, intensity, scene]);

  return null;
}
export const SCENE_POST_PROFILE = GLOBAL_RETRO_POST_PROFILE;
export const CAMERA_DAMPING_PROFILE = "Abeto-style frame-rate independent camera damping with smoothed look target";

const EMPTY_PROJECTS = Object.freeze([]);

// Background shader warm-up. The world presents as soon as it can render;
// program linking then continues one object at a time across idle callbacks so
// compiles land before the traveller reaches a station instead of before they
// see anything. This replaces a blocking renderer.compileAsync pre-pass: three's
// compileAsync is only asynchronous in its readiness poll, the actual
// compile+link of every program is one synchronous call, which measured as a
// ~25-40s frozen main thread between webgl-created and webgl-scene-ready.
//
// compileAsync was tried again after gl.debug.checkShaderErrors was turned off,
// on the theory that the freeze above was getShaderInfoLog blocking rather than
// the extension failing. KHR_parallel_shader_compile is present on this machine
// and the freeze does go away — total main-thread blocking measured 9,046ms
// before and 3,028ms after, with the worst single stall 3,633ms down to 390ms.
// The promise then never resolves. Holding the authored ground back until it
// did meant the ground never appeared at all, and the whole apparent win was
// that its two programs were never linked. Any future attempt needs a deadline
// after which the mesh is revealed regardless — and has to account for the fact
// that revealing it is what forces the link, so the deadline reintroduces the
// stall it was avoiding.
const WARM_START_FRAME_DELAY = 12;
const WARM_SLICE_BUDGET_MS = 4;
const WARM_IDLE_TIMEOUT_MS = 240;
const SCENE_CAMERA_FAR = 94;
// Shared fat-line materials for the route lead. Module singletons are never
// disposed, so the LineMaterial programs compile once during the warm pre-pass
// and survive every dock/undock remount of PolarRouteNetwork. The previous
// drei <Line> disposed its material on every points change, relinking the
// fat-line program ~10x/s during travel (the measured travel hitch source).
const ROUTE_LINE_MATERIALS = {
  accent: new LineMaterial({ opacity: 0.46, transparent: true }),
  base: new LineMaterial({ color: "#dffdf7", opacity: 0.28, transparent: true }),
};
const ROUTE_LEAD_POINT_COUNT = 3;
const WARMUP_LINE_POINTS = Object.freeze([
  [0, 0, 0],
  [0, 0.5, 0],
  [0, 1, 0],
]);
// Shared dock-ring geometries. Station "promise" membership flickers during
// travel; per-mount <ringGeometry> children made every flicker create and
// dispose five GPU buffers (the measured route-side remount churn). Module
// singletons upload once and survive every mount.
const DOCK_GEOMETRIES = {
  beacon: new THREE.OctahedronGeometry(1, 0),
  flag: new THREE.ConeGeometry(1, 1, 3),
  halo: new THREE.RingGeometry(0.62, 0.626, 72),
  mast: new THREE.CylinderGeometry(1, 1, 1, 8),
  ring: new THREE.RingGeometry(0.44, 0.47, 68),
};
// Route lead points live outside React: PolarRouteNetwork's frame loop writes
// them from the 60Hz traversal pose and bumps `version` only when an endpoint
// actually moved, so the two lead lines rewrite their fat-line buffers at most
// once per moved frame and never re-render through React while traveling.
const ROUTE_LEAD_STATE = {
  points: [
    [0, 0.035, 0],
    [0, 0.085, 0],
    [0, 0.035, 0],
  ],
  version: 0,
};
const ROUTE_LEAD_EPSILON = 0.002;

function writeRouteLeadSegments(line, points) {
  // Rewrite the segment pairs in place. Rebuilding the geometry (or the
  // material) per travel frame is what forced the fat-line shader to relink
  // continuously while the seal moved.
  const segments = line.geometry.attributes.instanceStart.data;
  const array = segments.array;
  for (let index = 0; index < ROUTE_LEAD_POINT_COUNT - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const offset = index * 6;
    array[offset] = start[0];
    array[offset + 1] = start[1];
    array[offset + 2] = start[2];
    array[offset + 3] = end[0];
    array[offset + 4] = end[1];
    array[offset + 5] = end[2];
  }
  segments.needsUpdate = true;
}

function RouteLeadLine({ lineWidth, material, points, trackRouteLead = false }) {
  const size = useThree((state) => state.size);
  const writtenVersion = useRef(-1);
  const line = useMemo(() => {
    const geometry = new LineGeometry();
    geometry.setPositions(new Float32Array(ROUTE_LEAD_POINT_COUNT * 3));
    const routeLine = new Line2(geometry, material);
    // Three-point lead ribbon: skip bounding-volume upkeep entirely.
    routeLine.frustumCulled = false;
    return routeLine;
  }, [material]);

  useEffect(() => () => line.geometry.dispose(), [line]);

  useLayoutEffect(() => {
    if (!points) return;
    writeRouteLeadSegments(line, points);
  }, [line, points]);

  useFrame(() => {
    // Version-gated copy from the shared route lead state: no React re-render
    // and no buffer upload on frames where the lead has not actually moved.
    if (!trackRouteLead) return;
    if (writtenVersion.current === ROUTE_LEAD_STATE.version) return;
    writtenVersion.current = ROUTE_LEAD_STATE.version;
    writeRouteLeadSegments(line, ROUTE_LEAD_STATE.points);
  });

  useLayoutEffect(() => {
    material.linewidth = lineWidth;
    material.resolution.set(size.width, size.height);
  }, [lineWidth, material, size]);

  return <primitive object={line} />;
}

/**
 * Advances the scene-admission bucket one step per RENDER_BUCKET_FRAME_GAP
 * presented frames. Lives inside the Canvas because only useFrame knows a frame
 * actually reached the screen: a timer would happily queue the next bucket's
 * program links on top of the stall the previous bucket is still inside.
 */
function RenderBucketPump({ level, onAdvance }) {
  const framesRef = useRef(0);
  useFrame(() => {
    if (level >= RENDER_BUCKET_MAX) return;
    framesRef.current += 1;
    if (framesRef.current < RENDER_BUCKET_FRAME_GAP) return;
    framesRef.current = 0;
    onAdvance();
  });
  return null;
}

/**
 * Ablation only, behind qa-cheap-materials.
 *
 * The frame is fill-bound at roughly 13.9ms per megapixel, which is an enormous
 * per-pixel cost for a scene of ~54 draws and zero image textures, and no single
 * subsystem accounts for it — each ablates out at a few milliseconds or less.
 * The remaining explanation is that almost every surface is a standard or
 * physical material carrying a large custom injection, under an environment
 * probe and shadows, so each fragment runs hundreds of instructions.
 *
 * The reference this world is measured against solves that by not doing it:
 * flat-shaded low-poly with colour baked into vertices. This swaps every
 * material in the scene for the cheapest lit one three has, keeping every draw,
 * instance, triangle and light, so the difference is per-pixel shading cost and
 * nothing else. It is a measurement, not a proposal — the output is wrong on
 * purpose.
 */
/**
 * Ablation only, behind qa-overdraw. Counts how many times each pixel is
 * written, which is the last standing explanation for a frame that scales with
 * resolution while being indifferent to what shader runs at each pixel.
 *
 * A count, not a duration, so it is immune to the thermal drift that now bounds
 * every timing measurement here. Every surface contributes a fixed additive
 * increment with depth testing off; the red channel read back is the write
 * count. Three earlier attempts failed for three separate reasons, all fixed
 * here: the tone-mapping and sRGB transfer remapped the values before readback,
 * the world's clear colour floored them, and the material swap was being undone
 * between frames — IglooScene re-renders whenever station proximity changes,
 * which is most frames, so a timer-based re-apply always loses. The swap runs
 * in the frame loop.
 */
const OVERDRAW_STEP = 4 / 255;

function OverdrawProbe({ enabled, respectDepth = false }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(OVERDRAW_STEP, 0, 0),
        // Two modes. Without depth, the count is every fragment the scene
        // submits — an upper bound that ignores early-Z. With depth, the
        // material joins the opaque queue, which three sorts front-to-back, and
        // writes depth as it goes, so only fragments that survive rejection are
        // counted. The difference between the two is what render ordering is
        // already saving, and what changing it can still save.
        depthTest: respectDepth,
        depthWrite: respectDepth,
        fog: false,
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: !respectDepth,
      }),
    [respectDepth],
  );
  useEffect(() => {
    if (!enabled) return undefined;
    const previous = {
      background: scene.background,
      toneMapping: gl.toneMapping,
      outputColorSpace: gl.outputColorSpace,
    };
    // Imperative, so the world's own background colour and its no-pure-black
    // contract are untouched: the counter needs a zero floor and a linear path
    // to the framebuffer, and asserting either declaratively would change the
    // world rather than the measurement.
    scene.background = null;
    gl.setClearColor(0x000000, 1);
    gl.toneMapping = THREE.NoToneMapping;
    gl.outputColorSpace = THREE.LinearSRGBColorSpace;
    gl.domElement.dataset.overdrawActive = "true";
    return () => {
      scene.background = previous.background;
      gl.toneMapping = previous.toneMapping;
      gl.outputColorSpace = previous.outputColorSpace;
      delete gl.domElement.dataset.overdrawActive;
      material.dispose();
    };
  }, [enabled, gl, material, scene]);
  useFrame(() => {
    if (!enabled) return;
    scene.traverse((object) => {
      if (object.material && object.material !== material) object.material = material;
    });
  });
  return null;
}

// Pins the shared clock to a fixed time before any other frame callback runs.
// R3F advances state.clock and then invokes subscribers in ascending priority,
// so the lowest priority here overwrites the value everything downstream reads.
// The time is arbitrary but must be non-zero: several surfaces phase their
// motion off it and zero is a degenerate pose for some of them.
const FROZEN_CLOCK_SECONDS = 8;

function FrozenClock({ enabled }) {
  useFrame((state) => {
    if (!enabled) return;
    state.clock.elapsedTime = FROZEN_CLOCK_SECONDS;
  }, -1000);
  return null;
}

function CheapMaterialProbe({ enabled }) {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    if (!enabled) return undefined;
    const swapped = new Map();
    // Re-applied on an interval, not once. R3F assigns material declaratively,
    // so any re-render of the owning component restores the original — and the
    // measured quality downgrade is itself a re-render, which is what made the
    // first two runs of this probe report subsystems whose removal increased
    // the write count.
    const apply = () => {
      scene.traverse((object) => {
        if (!object.material || object.userData?.cheapProbeSkip) return;
        const original = object.material;
        const source = Array.isArray(original) ? original[0] : original;
        const cheap = new THREE.MeshLambertMaterial({
          color: source.color ? source.color.clone() : new THREE.Color("#cfd8e4"),
          side: source.side,
          transparent: source.transparent,
          opacity: source.opacity,
          depthWrite: source.depthWrite,
          vertexColors: Boolean(source.vertexColors),
        });
        if (original.userData?.probeSwapped) return;
        cheap.userData.probeSwapped = true;
        if (!swapped.has(object)) swapped.set(object, original);
        object.material = cheap;
      });
    };
    const start = window.setTimeout(apply, 7000);
    const repeat = window.setInterval(apply, 400);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(repeat);
      for (const [object, original] of swapped) {
        object.material = original;
      }
    };
  }, [enabled, scene]);
  return null;
}

function BackgroundShaderWarmup({ enabled }) {
  const { camera, gl, scene } = useThree();
  const startedRef = useRef(false);
  const frameRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => () => {
    // A queued slice must never touch a renderer that is tearing down.
    cancelledRef.current = true;
  }, []);

  useFrame(() => {
    // Self-armed off the render loop: no prop plumbing and no extra React
    // render just to learn the world became visible. A few presented frames of
    // slack keeps the world-stream reveal choreography clean before any
    // compile slice can steal a frame.
    if (!enabled || startedRef.current) return;
    frameRef.current += 1;
    if (frameRef.current < WARM_START_FRAME_DELAY) return;
    startedRef.current = true;

    // One object per step, budgeted per idle slice. A single program link can
    // overshoot the budget on a slow driver, so this is a floor on progress,
    // not a ceiling on any one compile: the alternative is that exact link
    // happening mid-travel instead of while the traveller is parked.
    const queue = [];
    scene.traverse((object) => {
      if (object.isMesh || object.isPoints || object.isLine || object.isSprite) {
        queue.push(object);
      }
    });
    let index = 0;
    const idle = window.requestIdleCallback || window.setTimeout;
    const pump = () => {
      if (cancelledRef.current) return;
      const sliceStart = performance.now();
      while (index < queue.length) {
        try {
          // targetScene = scene keeps the light/shadow context identical to the
          // real render, so these programs are the variants actually used.
          gl.compile(queue[index], camera, scene);
        } catch {
          // A disposed or mid-remount object is not worth failing the pass for.
        }
        index += 1;
        if (performance.now() - sliceStart >= WARM_SLICE_BUDGET_MS) break;
      }
      if (index < queue.length) {
        idle(pump, { timeout: WARM_IDLE_TIMEOUT_MS });
        return;
      }
      gl.domElement.dataset.shaderWarmComplete = "true";
    };
    gl.domElement.dataset.shaderWarmComplete = "false";
    idle(pump, { timeout: WARM_IDLE_TIMEOUT_MS });
  });

  return null;
}

// Local camera-rig idle life. These are rig-only breathing terms layered on top
// of the pinned CAMERA_COMPOSITION solve; all of them read zero under reduced
// motion so the frozen frame stays byte-stable.
const RIG_IDLE_YAW_DEGREES = 0.15;
const RIG_IDLE_YAW_HZ = 0.09;
const RIG_IDLE_HEIGHT = 0.012;
const RIG_IDLE_HEIGHT_HZ = 0.13;

// Bruno-style chase heading. During free travel the camera swings behind the
// seal's smoothed velocity heading; near a station the rig blends back into the
// authored dock composition on the existing stationInfluence arrival term.
const CHASE_HEADING_DAMPING = 3.2;
const CHASE_MIN_SPEED = 0.35;

function shortestArc(angle) {
  const tau = Math.PI * 2;
  return ((angle + Math.PI) % tau + tau) % tau - Math.PI;
}

function WorldStreamReveal({
  children,
  durationMs,
  fromScale = 0.78,
  name,
  progressRef,
  reducedMotion,
  rise = 0.18,
  startMs = 0,
  streamEpochMsRef,
}) {
  const group = useRef(null);
  const initialProgress = reducedMotion ? 1 : 0;
  const initialPosition = useMemo(
    () => [0, reducedMotion ? 0 : -rise * (1 - initialProgress), 0],
    [initialProgress, reducedMotion, rise],
  );
  const initialScale = useMemo(
    () => (reducedMotion ? [1, 1, 1] : [1, fromScale, 1]),
    [fromScale, reducedMotion],
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    if (reducedMotion) {
      if (progressRef) progressRef.current = 1;
      return;
    }
    const nowMs = clock.elapsedTime * 1000;
    if (streamEpochMsRef.current === null) streamEpochMsRef.current = nowMs;
    const elapsedMs = nowMs - streamEpochMsRef.current;
    const rawProgress = (elapsedMs - startMs) / Math.max(1, durationMs);
    const progress = easeWorldStream(rawProgress);
    if (progressRef) progressRef.current = progress;
    group.current.visible = elapsedMs >= startMs;
    group.current.position.y = -rise * (1 - progress);

    const scaleY = THREE.MathUtils.lerp(fromScale, 1, progress);
    group.current.scale.set(1, scaleY, 1);
  });

  return (
    <group
      name={`Abeto staged fullscreen world stream / ${name}`}
      position={initialPosition}
      ref={group}
      scale={initialScale}
      visible={reducedMotion || startMs === 0}
    >
      {children}
    </group>
  );
}

function ForegroundExpeditionKit() {
  return (
    <group
      name="ForegroundExpeditionKit human-scale-anchor"
      position={[OBSERVATORY_WORLD.center.x - 3, 0.08, OBSERVATORY_WORLD.center.z - 6]}
      scale={0.4}
    >
      <mesh position={[0.02, -0.2, 0.04]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.34, 0.64, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial
          color={POLAR_PALETTE.horizonIndigo}
          depthWrite={false}
          transparent
          opacity={0.18}
        />
      </mesh>
      <group position={[-0.24, 0.02, -0.04]} rotation={[0.03, 0.18, -0.04]}>
        <mesh castShadow receiveShadow scale={[0.74, 0.54, 0.58]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#9A765C" metalness={0} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.005, 0.296]} scale={[0.11, 0.5, 0.012]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={POLAR_PALETTE.animeInk} metalness={0} roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.276, 0]} scale={[0.11, 0.012, 0.54]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={POLAR_PALETTE.animeInk} metalness={0} roughness={0.88} />
        </mesh>
      </group>
      <group position={[0.62, -0.23, 0.02]} rotation={[0.02, -0.16, 0.05]}>
        <mesh castShadow receiveShadow position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.14, 0.125, 0.26, 22]} />
          <meshStandardMaterial color={POLAR_PALETTE.polarIvory} metalness={0.08} roughness={0.48} />
        </mesh>
        <mesh position={[0.145, 0.14, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.72, 0.72, 0.72]}>
          <torusGeometry args={[0.105, 0.024, 8, 24, Math.PI * 1.7]} />
          <meshStandardMaterial color={POLAR_PALETTE.animeInk} metalness={0.08} roughness={0.52} />
        </mesh>
        <mesh position={[0, 0.265, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.128, 0.012, 6, 24]} />
          <meshBasicMaterial color={POLAR_PALETTE.animeInk} />
        </mesh>
      </group>
      <mesh castShadow receiveShadow position={[0.02, -0.18, 0.56]} rotation={[-Math.PI / 2, 0, 0.16]}>
        <torusGeometry args={[0.34, 0.045, 9, 42]} />
        <meshStandardMaterial color="#B68B62" metalness={0} roughness={0.94} />
      </mesh>
    </group>
  );
}

function CameraRig({
  activeArtifact,
  axisX,
  cameraYawRef,
  depthZ,
  quality,
  reducedMotion,
  renderEnabled,
  sealPosition,
  traversalPoseRef,
}) {
  const { camera, gl, size } = useThree();
  const stationWorld =
    STATION_WORLD_SCHEMA.stations[activeArtifact?.id] || OBSERVATORY_WORLD;
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const desiredLook = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(0, 0.82, 0), []);
  const travelScratch = useRef({
    look: { x: 0, y: 0.82, z: 0 },
    sealPosition: { x: 0, z: 0 },
    velocity: { x: 0, z: 0 },
  });
  // Normalised cursor position (-1..1) and its damped follower. The rig alone
  // consumes this; the post pass stays pointer-free by contract.
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointerCurrent = useRef({ x: 0, y: 0 });
  // Smoothed travel heading in radians; null until the first frame seeds it
  // from the dock azimuth so the chase blend starts without a swing.
  const headingRef = useRef(null);
  // The very first rendered frame snaps to the solved dock pose instead of
  // lerping in from the Canvas seed position, so the world's first paint is
  // already composed rather than gliding into place.
  const snapPoseRef = useRef(true);
  // Damped chase-distance scale that keeps the seal in view when a facility
  // would otherwise come between it and the lens. 1 = the fully solved
  // distance; lower values pull the camera in along its own axis.
  const occlusionFactorRef = useRef(1);

  useEffect(() => {
    if (reducedMotion) {
      pointerTarget.current.x = 0;
      pointerTarget.current.y = 0;
      return undefined;
    }
    const canvas = gl.domElement;
    const onMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerTarget.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerTarget.current.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };
    canvas.addEventListener("pointermove", onMove, { passive: true });
    return () => canvas.removeEventListener("pointermove", onMove);
  }, [gl, reducedMotion]);
  const dockComposition = useMemo(
    () =>
      solvePolarCameraComposition({
        height: Math.max(1, size.height),
        quality,
        sealPosition: stationWorld.dock,
        station: stationWorld,
        velocity: { x: 0, z: 0 },
        width: Math.max(1, size.width),
      }),
    [quality, size.height, size.width, stationWorld],
  );
  const compositionDiagnostics = useMemo(() => {
    const encodeBounds = (bounds) =>
      [bounds.left, bounds.top, bounds.right, bounds.bottom]
        .map((value) => value.toFixed(1))
        .join(",");
    return {
      heroBounds: encodeBounds(dockComposition.metrics.heroBounds),
      sealBodyBounds: encodeBounds(dockComposition.metrics.sealBodyBounds),
      sealBounds: encodeBounds(dockComposition.metrics.sealBounds),
      sealCentroid: [
        dockComposition.metrics.sealCentroidX,
        dockComposition.metrics.sealCentroidY,
      ]
        .map((value) => value.toFixed(1))
        .join(","),
    };
  }, [dockComposition]);

  useEffect(() => {
    const nextFov = dockComposition.camera.verticalFovDegrees;
    if (camera.fov !== nextFov) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
  }, [camera, dockComposition.camera.verticalFovDegrees]);

  useFrame(({ clock }, delta) => {
    if (camera.far !== SCENE_CAMERA_FAR) {
      camera.far = SCENE_CAMERA_FAR;
      camera.updateProjectionMatrix();
    }
    const t = clock.elapsedTime;
    const seal = sealPosition.current;
    const traversalPose = traversalPoseRef?.current;
    const fallbackSealX = traversalPose?.x ?? axisX;
    const fallbackSealZ = traversalPose?.z ?? depthZ;
    const sealX = renderEnabled && seal ? seal.position.x : fallbackSealX;
    const sealZ = renderEnabled && seal ? seal.position.z : fallbackSealZ;
    const velocityX = traversalPose?.vx ?? 0;
    const velocityZ = traversalPose?.vz ?? 0;
    const speed = Math.hypot(velocityX, velocityZ);
    travelScratch.current.sealPosition.x = sealX;
    travelScratch.current.sealPosition.z = sealZ;
    travelScratch.current.velocity.x = velocityX;
    travelScratch.current.velocity.z = velocityZ;
    const travel = resolvePolarTravelComposition({
      height: Math.max(1, size.height),
      quality,
      reducedMotion,
      sealPosition: travelScratch.current.sealPosition,
      station: stationWorld,
      target: travelScratch.current,
      velocity: travelScratch.current.velocity,
      width: Math.max(1, size.width),
    });
    // Arrival strength drives the chase/dock blend. The traversal's damped
    // stationProximity (1 while docked, tight 6-unit falloff, pinned to routed
    // destinations) releases the dock composition much sooner than the wide
    // travel stationInfluence field, so free roaming reads as a chase camera.
    const arrivalStrength = THREE.MathUtils.clamp(
      traversalPose?.stationProximity ?? travel.stationInfluence,
      0,
      1,
    );
    const travelBlend = 1 - arrivalStrength;
    const focusY = THREE.MathUtils.lerp(
      dockComposition.camera.look.y,
      travel.look.y,
      travelBlend,
    );
    target.set(travel.look.x, focusY, travel.look.z);
    const distance = THREE.MathUtils.lerp(
      dockComposition.camera.distance,
      travel.cameraDistance,
      travelBlend,
    );
    // Travel mode is a third-person chase: the camera sits behind the seal's
    // smoothed velocity heading and looks ahead of it. The dock composition
    // keeps full authority as stationInfluence rises toward arrival.
    const dockAzimuth = THREE.MathUtils.degToRad(dockComposition.camera.azimuthDegrees);
    if (headingRef.current === null) headingRef.current = dockAzimuth - Math.PI;
    if (speed > CHASE_MIN_SPEED) {
      const targetHeading = Math.atan2(velocityX, velocityZ);
      const headingDamping = reducedMotion
        ? 1
        : 1 - Math.exp(-delta * CHASE_HEADING_DAMPING);
      headingRef.current = shortestArc(
        headingRef.current +
          shortestArc(targetHeading - headingRef.current) * headingDamping,
      );
    }
    const chaseAzimuth = headingRef.current + Math.PI;
    const azimuth = shortestArc(
      dockAzimuth + shortestArc(chaseAzimuth - dockAzimuth) * travelBlend,
    );
    if (cameraYawRef) cameraYawRef.current = azimuth;
    const cameraAzimuthDegrees = THREE.MathUtils.radToDeg(azimuth);
    const elevation = THREE.MathUtils.degToRad(dockComposition.camera.elevationDegrees);
    const horizontalDistance = Math.cos(elevation) * distance;
    const drift = reducedMotion ? 0 : THREE.MathUtils.smoothstep(speed, 0.08, 3.8);
    // Idle life: a sub-degree yaw sway and a small height breath keep a settled
    // frame from reading as a still image. Both collapse to zero when the user
    // asks for reduced motion.
    const idleYaw = reducedMotion
      ? 0
      : THREE.MathUtils.degToRad(RIG_IDLE_YAW_DEGREES) *
        Math.sin(t * Math.PI * 2 * RIG_IDLE_YAW_HZ);
    const idleHeight = reducedMotion
      ? 0
      : RIG_IDLE_HEIGHT * Math.sin(t * Math.PI * 2 * RIG_IDLE_HEIGHT_HZ);
    const swayedAzimuth = azimuth + idleYaw;
    desired.set(
      target.x + Math.sin(swayedAzimuth) * horizontalDistance + Math.sin(t * 0.1) * 0.045 * drift,
      target.y + Math.sin(elevation) * distance + idleHeight,
      target.z + Math.cos(swayedAzimuth) * horizontalDistance + Math.cos(t * 0.09) * 0.065 * drift,
    );
    // Occlusion pull-in. The solve above places the lens purely by azimuth,
    // elevation and distance around the seal, with no knowledge of world
    // geometry, so driving forward from the home dock walked the observatory
    // dome straight between the camera and the character being piloted.
    // Recompute the offset against the facility envelopes and shorten it until
    // the seal is visible again.
    const rawFactor = solveCameraOcclusionFactor({
      cameraX: desired.x,
      cameraY: desired.y,
      cameraZ: desired.z,
      targetX: target.x,
      targetY: target.y,
      targetZ: target.z,
    });
    // Snap in, ease out: hiding the subject is a defect that must be corrected
    // on the frame it happens, while returning to the full distance can afford
    // to be gentle. Both use the rig's frame-rate-independent damping form.
    const occlusionDamping =
      reducedMotion || rawFactor < occlusionFactorRef.current
        ? 1
        : 1 - Math.exp(-delta * 2.2);
    occlusionFactorRef.current +=
      (rawFactor - occlusionFactorRef.current) * occlusionDamping;
    const occlusionFactor = Math.max(
      CAMERA_OCCLUSION_MIN_FACTOR,
      Math.min(1, occlusionFactorRef.current),
    );
    if (occlusionFactor < 1) {
      desired.set(
        target.x + (desired.x - target.x) * occlusionFactor,
        target.y + (desired.y - target.y) * occlusionFactor,
        target.z + (desired.z - target.z) * occlusionFactor,
      );
    }
    desiredLook.copy(target);
    // Pointer reactivity lives on the look target only, capped below half a
    // degree so the authored composition never leaves its solved envelope.
    if (!reducedMotion) {
      const pointerDamping = 1 - Math.exp(-Math.min(delta, 0.05) * 4);
      pointerCurrent.current.x +=
        (pointerTarget.current.x - pointerCurrent.current.x) * pointerDamping;
      pointerCurrent.current.y +=
        (pointerTarget.current.y - pointerCurrent.current.y) * pointerDamping;
      const pointerReach = distance * Math.tan(THREE.MathUtils.degToRad(0.4));
      desiredLook.x += Math.cos(azimuth) * pointerCurrent.current.x * pointerReach;
      desiredLook.z += -Math.sin(azimuth) * pointerCurrent.current.x * pointerReach;
      desiredLook.y += -pointerCurrent.current.y * pointerReach;
    }
    const cameraDamping = reducedMotion
      ? 1
      : 1 - Math.exp(-delta * CAMERA_COMPOSITION.positionDamping);
    const lookDamping = reducedMotion
      ? 1
      : 1 - Math.exp(-delta * CAMERA_COMPOSITION.lookDamping);
    if (snapPoseRef.current) {
      snapPoseRef.current = false;
      camera.position.copy(desired);
      lookTarget.copy(desiredLook);
    } else {
      camera.position.lerp(desired, cameraDamping);
      lookTarget.lerp(desiredLook, lookDamping);
    }
    camera.lookAt(lookTarget);

    const rendererCanvas = gl.domElement;
    if (rendererCanvas) {
      rendererCanvas.dataset.cameraStation = stationWorld.id;
      rendererCanvas.dataset.cameraAzimuth = cameraAzimuthDegrees.toFixed(2);
      rendererCanvas.dataset.cameraDistance = distance.toFixed(2);
      rendererCanvas.dataset.cameraContract = dockComposition.metrics.contractSatisfied
        ? "two-subject-fit"
        : "envelope-fallback";
      rendererCanvas.dataset.cameraHeroBounds = compositionDiagnostics.heroBounds;
      rendererCanvas.dataset.cameraSealBodyBounds = compositionDiagnostics.sealBodyBounds;
      rendererCanvas.dataset.cameraSealBounds = compositionDiagnostics.sealBounds;
      rendererCanvas.dataset.cameraSealCentroid = compositionDiagnostics.sealCentroid;
    }
  });

  return null;
}

function ForceCanvasResize() {
  const { gl, setSize } = useThree();

  useEffect(() => {
    const parent = gl.domElement.parentElement;
    if (!parent) return undefined;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize(rect.width, rect.height);
        gl.setSize(rect.width, rect.height, false);
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [gl, setSize]);

  return null;
}

function syncSceneDiagnosticsDataset(
  canvas,
  { observatoryDistance, observatoryDomeVisible, quality, reducedMotion },
) {
  canvas.dataset.observatoryDomeDistance = observatoryDistance.toFixed(3);
  canvas.dataset.observatoryDomeVisible = observatoryDomeVisible ? "true" : "false";
  canvas.dataset.quality = quality;
  canvas.dataset.reducedMotion = reducedMotion ? "true" : "false";
}

function SceneDiagnostics({
  observatoryDistance,
  observatoryDomeVisible,
  onGpuEvent,
  quality,
  reducedMotion,
  streamEpochMsRef,
}) {
  const { gl } = useThree();
  const readyFrames = useRef(0);

  useEffect(() => {
    syncSceneDiagnosticsDataset(gl.domElement, {
      observatoryDistance,
      observatoryDomeVisible,
      quality,
      reducedMotion,
    });
  }, [gl, observatoryDistance, observatoryDomeVisible, quality, reducedMotion]);

  useEffect(() => {
    const canvas = gl.domElement;
    const context = gl.getContext();
    onGpuEvent?.({
      detail: `webgl2=${gl.capabilities.isWebGL2 ? "yes" : "no"} dpr=${gl.getPixelRatio().toFixed(2)}`,
      message: "WebGL context listeners armed.",
      severity: "info",
      type: "webgl-listeners-ready",
    });

    const onContextLost = (event) => {
      event.preventDefault();
      onGpuEvent?.({
        detail: context?.getError ? `glError=${context.getError()}` : "",
        message: "WebGL context lost; renderer returned to diagnostic gate.",
        severity: "error",
        type: "webgl-context-lost",
      });
    };
    const onContextRestored = () => {
      onGpuEvent?.({
        message: "WebGL context restored.",
        severity: "info",
        type: "webgl-context-restored",
      });
    };

    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }, [gl, onGpuEvent]);

  useFrame(({ clock }) => {
    // Program census for diagnostics/measurement: late links after the first
    // visible frame are the travel-hitch signature the background warm chases.
    const canvas = gl.domElement;
    const programCount = String(gl.info.programs?.length ?? 0);
    if (canvas.dataset.programCount !== programCount) {
      canvas.dataset.programCount = programCount;
    }
    if (readyFrames.current >= 2) return;
    readyFrames.current += 1;
    // Pin the world-stream reveal epoch to the scene-ready frame so the
    // materialize choreography (terrain, stations, dome courses) starts at real
    // visibility rather than partway through.
    if (streamEpochMsRef) streamEpochMsRef.current = clock.elapsedTime * 1000;
    if (readyFrames.current === 2) {
      onGpuEvent?.({
        detail: `canvas=${gl.domElement.width}x${gl.domElement.height} dpr=${gl.getPixelRatio().toFixed(2)}`,
        message: `WebGL scene rendered a stable frame at ${quality} quality.`,
        severity: "info",
        type: "webgl-scene-ready",
      });
    }
  });

  return null;
}

function PolarRouteNetwork({ activeArtifact, artifacts, axisX, depthZ, poseRef, quality }) {
  const activeId = activeArtifact?.id || artifacts[0]?.id;
  // The parent streams axisX/depthZ into this subtree at the 10Hz semantic
  // snapshot cadence. Station promise membership and dock-ring fades only need
  // whole-unit resolution (thresholds are 12-14 units, fades 0.008/unit), so
  // quantized coordinates keep every memo below (and the JSX they feed)
  // referentially stable between crossings instead of rebuilding and
  // reconciling the whole dock subtree on every snapshot. At full travel speed
  // (4 u/s) that is a ~250ms dock refresh cadence; the lead line itself tracks
  // the pose at 60Hz in the frame loop below.
  const coarseX = Math.round(axisX);
  const coarseZ = Math.round(depthZ);
  const latestRouteInput = useRef({ activeId, axisX, depthZ });
  latestRouteInput.current.activeId = activeId;
  latestRouteInput.current.axisX = axisX;
  latestRouteInput.current.depthZ = depthZ;

  useFrame(() => {
    // Route lead solve at 60Hz from the traversal pose (smoother than the old
    // 10Hz React-prop stepping), written into the shared module state. The
    // version only advances when an endpoint moved beyond epsilon, so parked
    // frames upload nothing.
    const input = latestRouteInput.current;
    const pose = poseRef?.current;
    const sealX = pose ? pose.x : input.axisX;
    const sealZ = pose ? pose.z : input.depthZ;
    const activeDock = STATION_WORLD_SCHEMA.stations[input.activeId]?.dock;
    const activeDistance = activeDock
      ? Math.hypot(activeDock.x - sealX, activeDock.z - sealZ)
      : 0;
    const activeIndex = STATION_WORLD_SCHEMA.order.indexOf(input.activeId);
    const nextId = STATION_WORLD_SCHEMA.order[
      (Math.max(0, activeIndex) + 1) % STATION_WORLD_SCHEMA.order.length
    ];
    const targetDock = activeDistance > 0.35
      ? activeDock
      : STATION_WORLD_SCHEMA.stations[nextId].dock;
    const deltaX = targetDock.x - sealX;
    const deltaZ = targetDock.z - sealZ;
    const distance = Math.max(0.001, Math.hypot(deltaX, deltaZ));
    const leadDistance = Math.min(7.5, distance);
    const endX = sealX + (deltaX / distance) * leadDistance;
    const endZ = sealZ + (deltaZ / distance) * leadDistance;
    const points = ROUTE_LEAD_STATE.points;
    if (
      Math.abs(points[0][0] - sealX) < ROUTE_LEAD_EPSILON &&
      Math.abs(points[0][2] - sealZ) < ROUTE_LEAD_EPSILON &&
      Math.abs(points[2][0] - endX) < ROUTE_LEAD_EPSILON &&
      Math.abs(points[2][2] - endZ) < ROUTE_LEAD_EPSILON
    ) {
      return;
    }
    points[0][0] = sealX;
    points[0][2] = sealZ;
    points[1][0] = (sealX + endX) * 0.5;
    points[1][2] = (sealZ + endZ) * 0.5;
    points[2][0] = endX;
    points[2][2] = endZ;
    ROUTE_LEAD_STATE.version += 1;
  }, -1);

  const visibleStations = useMemo(() => {
    const ranked = artifacts
      .map((artifact, index) => {
        const dock = STATION_WORLD_SCHEMA.stations[artifact.id].dock;
        return {
          artifact,
          distance: Math.hypot(dock.x - coarseX, dock.z - coarseZ),
          index,
          worldX: dock.x,
          worldZ: dock.z,
        };
      })
      .sort((left, right) => left.distance - right.distance);
    const nearest = ranked[0];
    const active = ranked.find((station) => station.artifact.id === activeId);
    const promise =
      active && nearest && active.artifact.id !== nearest.artifact.id && active.distance <= 14
        ? active
        : ranked[1]?.distance <= 12
          ? ranked[1]
          : null;
    return [nearest, promise].filter(Boolean);
  }, [activeId, artifacts, coarseX, coarseZ]);
  const accent = activeArtifact?.accent || "#5ff8e7";

  useLayoutEffect(() => {
    // Accent hue rides a uniform on the shared material; never a new program.
    ROUTE_LINE_MATERIALS.accent.color.set(accent);
  }, [accent]);

  // Stable element identities let React bail out of the dock subtree entirely
  // on snapshots where nothing crossed a half-unit boundary. The geometries are
  // module singletons (never disposed), so a membership flicker only allocates
  // five small materials instead of five GPU geometry uploads.
  const dockRings = useMemo(
    () =>
      visibleStations.map(({ artifact, distance, index, worldX, worldZ }) => {
        const active = artifact.id === activeId;
        const stationOpacity = active ? 0.86 : Math.max(0.16, 0.46 - distance * 0.008);
        return (
          <group
            key={`route-dock-${artifact.id}-${worldX}`}
            name={`station-dock ${artifact.id}`}
            position={[worldX, 0.045, worldZ]}
            userData={{ className: "station-dock", topology: artifact.topology }}
          >
            <mesh geometry={DOCK_GEOMETRIES.ring} rotation={[-Math.PI / 2, 0, 0]} scale={[1.0, 0.58, 1]}>
              <meshBasicMaterial color={artifact.accent} transparent opacity={stationOpacity} />
            </mesh>
            <mesh geometry={DOCK_GEOMETRIES.halo} rotation={[-Math.PI / 2, 0, 0]} scale={[active ? 1.46 : 1.12, active ? 0.86 : 0.66, 1]}>
              <meshBasicMaterial color="#dffdf7" transparent opacity={active ? 0.48 : 0.12} />
            </mesh>
            <mesh geometry={DOCK_GEOMETRIES.mast} position={[0, 0.26, 0]} scale={[0.026, active ? 0.58 : 0.34, 0.026]}>
              <meshBasicMaterial color={artifact.accent} transparent opacity={active ? 0.64 : 0.28} />
            </mesh>
            <mesh geometry={DOCK_GEOMETRIES.beacon} position={[0, active ? 0.62 : 0.42, 0]} scale={[active ? 0.07 : 0.045, active ? 0.07 : 0.045, active ? 0.07 : 0.045]}>
              <meshBasicMaterial color={active ? "#dffdf7" : artifact.accent} transparent opacity={active ? 0.9 : 0.46} />
            </mesh>
            {index % 2 === 0 && (
              <mesh geometry={DOCK_GEOMETRIES.flag} position={[0.72, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.08, 0.16, 0.08]}>
                <meshBasicMaterial color={artifact.accent} transparent opacity={0.32} />
              </mesh>
            )}
          </group>
        );
      }),
    [activeId, visibleStations],
  );

  return (
    <group name="BrunoOpenWorldNavigation local-route-lead max-two-station-promises">
      <RouteLeadLine
        lineWidth={quality === "high" ? 2.2 : 1.4}
        material={ROUTE_LINE_MATERIALS.base}
        trackRouteLead
      />
      <RouteLeadLine
        lineWidth={quality === "high" ? 1.2 : 0.82}
        material={ROUTE_LINE_MATERIALS.accent}
        trackRouteLead
      />
      {dockRings}
    </group>
  );
}

export default function IglooScene({
  activeArtifactId,
  axisVelocity = 0,
  axisX = 0,
  cameraYawRef = null,
  debugFlags = {},
  depthVelocity = 0,
  depthZ = 0,
  dockedStationId = null,
  artifacts = IGLOO_ARTIFACTS,
  guideState = "idle",
  iglooPulse = 0,
  liveSummary = null,
  moving = false,
  onSelectArtifact,
  onTouchIgloo,
  onGpuEvent,
  projects = EMPTY_PROJECTS,
  quality = "high",
  reducedMotion = false,
  renderEnabled = false,
  sealAwake = false,
  stationProximity = 0,
  traversalPoseRef,
  worldActive = true,
}) {
  const activeArtifact =
    artifacts.find((artifact) => artifact.id === dockedStationId) ||
    artifacts.find((artifact) => artifact.id === activeArtifactId) ||
    artifacts[0];
  const SealMascot = debugFlags.legacySeal ? SealAvatar : TopologicalSealMascot;
  const sealRef = useRef(null);
  const streamEpochMsRef = useRef(null);
  const domeRevealProgressRef = useRef(reducedMotion ? 1 : 0);
  const mechanismStateRef = useRef(null);
  const mechanismRitualStateRef = useRef(null);
  const mechanismEvidenceRef = useRef(null);
  // High is allowed past 1:1 now that the post target tracks the real ratio
  // instead of clamping to 1; below that ceiling the world was rendered at CSS
  // pixels and upscaled on every retina display.
  // Fixed per tier. A frame-time-driven ratio was built twice against two
  // different cost models and removed twice: GPU time is genuinely fill-bound
  // (2.9ms fixed plus 13.9ms per megapixel, measured by timer query at three
  // viewport sizes), but dropping the ratio to 0.75 moved the presented frame
  // from 30.4ms only to 29.3ms. Until the gap between GPU time and presented
  // time is explained, trading the world's sharpness buys nothing a visitor
  // can see.
  // Medium renders at low's device-pixel ceiling on purpose. It is content-bound
  // rather than fill-bound (see AUTO_QUALITY_POLICY), so 0.9 bought sharpness it
  // could not pay for: 22.9ms against a 21ms step-down ceiling meant integrated
  // graphics never held medium and lost its geography, tunnel and masonry to the
  // low tier. At 0.75 it floors at 18.7-19.5ms and holds. Low keeps its own
  // ladder position by shedding content, not pixels.
  const dpr = quality === "low" ? [0.55, 0.75] : quality === "medium" ? [0.65, 0.75] : [1, 1.5];
  const preserveDrawingBuffer =
    typeof window !== "undefined" &&
    (window.location.search.includes("qa=") ||
      window.location.search.includes("qa-sdf") ||
      window.location.search.includes("qa-low") ||
      window.location.search.includes("safe=1"));
  const observatoryDistance = Math.hypot(
    axisX - OBSERVATORY_WORLD.center.x,
    depthZ - OBSERVATORY_WORLD.center.z,
  );
  const observatoryDomeVisible = shouldRenderObservatoryDome({
    destinationStationId: activeArtifactId,
    distanceFromHome: observatoryDistance,
  });
  const onCanvasCreated = useCallback(
    ({ gl }) => {
      gl.domElement.classList.add("igloo-scene-canvas");
      gl.domElement.dataset.renderer = "webgl";
      gl.domElement.dataset.quality = quality;
      gl.domElement.dataset.reducedMotion = reducedMotion ? "true" : "false";
      // three's shader-error debug path calls getProgramInfoLog/getShaderInfoLog
      // on every program at first use, and those calls block the main thread
      // until ANGLE has finished the D3D compile. Leaving it on serialised every
      // boot program link into one synchronous stall (measured 16.5s of a ~19s
      // cold boot). Off, the driver links on its own worker threads.
      gl.debug.checkShaderErrors = false;
      gl.shadowMap.enabled = !debugFlags.noShadows;
      gl.shadowMap.type = debugFlags.hardShadows ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 0.94;
      onGpuEvent?.({
        detail: `webgl2=${gl.capabilities.isWebGL2 ? "yes" : "no"} dpr=${gl.getPixelRatio().toFixed(2)}`,
        message: `WebGL renderer ready at ${quality} quality.`,
        severity: "info",
        type: "webgl-created",
      });
    },
    [debugFlags.hardShadows, debugFlags.noShadows, onGpuEvent, quality, reducedMotion],
  );
  // Staged scene admission. See lib/render-buckets.js: mounting all 76 programs
  // in one commit put every driver link inside the first frame.
  const staged = shouldStageRenderBuckets({ reducedMotion, renderEnabled, worldActive });
  const [rawBucket, setRawBucket] = useState(RENDER_BUCKETS.hero);
  const bucket = staged ? rawBucket : RENDER_BUCKET_MAX;
  const advanceBucket = useCallback(() => {
    setRawBucket((current) => Math.min(RENDER_BUCKET_MAX, current + 1));
  }, []);
  const handleMechanismEvidenceReady = useCallback((stationId, state) => {
    if (state?.evidenceReady !== true) return;
    mechanismEvidenceRef.current = {
      evidenceReady: state?.evidenceReady === true,
      phase: state?.phase || null,
      proofSequence:
        state?.proofSequence ??
        state?.verificationSequence ??
        state?.visibleCycleCount ??
        null,
      stationId,
    };
  }, []);

  return (
    <Canvas
      className="igloo-scene"
      data-render-bucket={bucket}
      data-seal-awake={sealAwake ? "true" : "false"}
      data-station-proximity={stationProximity.toFixed(3)}
      dpr={dpr}
      frameloop={worldActive ? (renderEnabled && !reducedMotion ? "always" : "demand") : "never"}
      camera={{
        position: [OBSERVATORY_WORLD.dock.x - 4.8, 2.1, OBSERVATORY_WORLD.dock.z + 3.2],
        fov: OBSERVATORY_WORLD.camera.verticalFovDegrees,
        near: 0.1,
        far: SCENE_CAMERA_FAR,
      }}
      shadows
      gl={{
        antialias: false,
        alpha: true,
        failIfMajorPerformanceCaveat: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer,
      }}
      onCreated={onCanvasCreated}
    >
      <color attach="background" args={["#5A6E9C"]} />
      <fogExp2 attach="fog" args={[POLAR_PALETTE.fog, 0.0085]} />
      {/* Near-neutral ambient: a strongly blue ambient is the main hue-collapsing term,
          it clips the blue channel and every albedo converges on the light. Dusk mood
          comes from the sky dome and fog, not from dyeing every surface. */}
      {/* 0.42, and raising it does not fix what looks like a lighting problem.
          Measured across all eight stations at a pinned tier, every building
          reads 37 to 83 luma darker than the snow it stands on. Taking ambient
          to 0.72 — a 71% increase — moved that by 0.1 to 5 luma and flattened
          the shading it did reach. The buildings are dark because their albedos
          are dark, and light multiplies paint: near-black paint stays near-black
          however much of it there is. See scripts/probe-station-contrast.mjs. */}
      <ambientLight color="#C6C8CE" intensity={0.42} />
      {/* The ground half of the hemisphere is the bounce, and this world's ground
          is snow. It was #6E6154 — a warm dark brown, correct for earth and
          wrong for an ice sheet — so every downward-facing surface in the scene
          was lit from below by dirt. The terrain never showed it because the
          terrain is a custom ShaderMaterial that paints its own brightness and
          takes no part in the light rig; the mascot did, and read as a black
          silhouette everywhere the observatory's two point lights could not
          reach it. Snow bounces almost everything back up. */}
      <hemisphereLight color="#BCCADF" groundColor="#C6D2E0" intensity={1.02} />
      {!debugFlags.noEnv && <SceneEnvironment />}
      <Suspense fallback={null}>
        <SceneDiagnostics
          observatoryDistance={observatoryDistance}
          observatoryDomeVisible={observatoryDomeVisible}
          onGpuEvent={onGpuEvent}
          quality={quality}
          reducedMotion={reducedMotion}
          streamEpochMsRef={streamEpochMsRef}
        />
        <ForceCanvasResize />
        {staged && <RenderBucketPump level={rawBucket} onAdvance={advanceBucket} />}
        <FrozenClock enabled={Boolean(debugFlags.freezeClock)} />
        <CheapMaterialProbe enabled={Boolean(debugFlags.cheapMaterials)} />
        <OverdrawProbe
          enabled={Boolean(debugFlags.overdraw || debugFlags.overdrawDepth)}
          respectDepth={Boolean(debugFlags.overdrawDepth)}
        />
        <CameraRig
          activeArtifact={activeArtifact}
          axisX={axisX}
          cameraYawRef={cameraYawRef}
          depthZ={depthZ}
          quality={quality}
          reducedMotion={reducedMotion}
          renderEnabled={renderEnabled}
          sealPosition={sealRef}
          traversalPoseRef={traversalPoseRef}
        />
        {/* Cold-start stand-in for the authored ground. The two biome programs
            take ~6.6s of driver link on a first visit (measured; see
            lib/render-buckets.js), and the hero read does not need them: it
            needs a horizon and something for the igloo to sit on. This is one
            plane on a stock lit material — one program, tens of milliseconds —
            and it is gone the moment the real sheet is admitted. */}
        {!debugFlags.noTerrain && bucket < RENDER_BUCKETS.field && (
          <mesh
            name="cold-start-ground-stand-in"
            position={[axisX, -0.42, depthZ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[220, 220]} />
            <meshStandardMaterial color="#E4EAF2" roughness={0.94} metalness={0} />
          </mesh>
        )}
        {!debugFlags.noTerrain && bucket >= RENDER_BUCKETS.field && (
          <PolarBiomeWorld
            axisX={axisX}
            depthZ={depthZ}
            exclusiveStationId={dockedStationId}
            quality={quality}
            reducedMotion={reducedMotion}
            safeMode={!renderEnabled}
            simulationPaused={!worldActive || !renderEnabled}
            skyVisible={!debugFlags.noSky}
            terrainVisible={!debugFlags.noGround}
            travelerRef={traversalPoseRef}
            visible={worldActive}
          />
        )}
        <IglooTouch onTouchIgloo={onTouchIgloo} />
        {!reducedMotion && !debugFlags.noVeil && bucket >= RENDER_BUCKETS.systems && <ActiveTheoryVeil accent={activeArtifact?.accent} quality={quality} />}
        {!debugFlags.noTerrain && bucket >= RENDER_BUCKETS.field && (
          <WorldStreamReveal
            durationMs={WORLD_STREAM_TIMINGS.terrainRevealMs}
            fromScale={0.02}
            name="terrain / 300ms"
            reducedMotion={reducedMotion}
            rise={0.2}
            streamEpochMsRef={streamEpochMsRef}
          >
            {!debugFlags.noDressing && (
              <AdaptivePolarWorldDressing
                artifacts={artifacts}
                exclusiveStationId={dockedStationId}
                quality={quality}
                reducedMotion={reducedMotion}
                traversalPoseRef={traversalPoseRef}
              />
            )}
            {activeArtifact.id === "observatory-plaque" && <ForegroundExpeditionKit />}
          </WorldStreamReveal>
        )}
        {!debugFlags.noSignals && bucket >= RENDER_BUCKETS.field && (
          <WorldStreamReveal
            durationMs={WORLD_STREAM_TIMINGS.stationRevealMs}
            name="signal field / 200ms"
            reducedMotion={reducedMotion}
            rise={0.12}
            startMs={WORLD_STREAM_TIMINGS.stationStartMs}
            streamEpochMsRef={streamEpochMsRef}
          >
            {!dockedStationId ? (
              <PolarRouteNetwork
                activeArtifact={activeArtifact}
                artifacts={artifacts}
                axisX={axisX}
                depthZ={depthZ}
                poseRef={traversalPoseRef}
                quality={quality}
              />
            ) : null}
          </WorldStreamReveal>
        )}
        {renderEnabled && !debugFlags.noSmashables && bucket >= RENDER_BUCKETS.finish && (
          // Smashable debris stays mounted so its programs compile in the warm
          // pre-pass and survive travel stops; it only renders while moving.
          <group name="travel-debris-render-gate" visible={moving}>
            <PolarTravelDebris
              quality={quality}
              reducedMotion={reducedMotion}
              traversalPoseRef={traversalPoseRef}
            />
          </group>
        )}
        {!debugFlags.noTopology && bucket >= RENDER_BUCKETS.systems && (
          <WorldStreamReveal
            durationMs={WORLD_STREAM_TIMINGS.stationRevealMs}
            name="topology routes / 200ms"
            reducedMotion={reducedMotion}
            rise={0.1}
            startMs={WORLD_STREAM_TIMINGS.stationStartMs}
            streamEpochMsRef={streamEpochMsRef}
          >
            {/* The aurora shell stays mounted while docked so the sky does not
                die at stations; with a docked activeArtifact the junni guide
                threads keep leaning toward the owned station azimuth. */}
            <TopologyConstellation
              activeArtifact={activeArtifact}
              artifacts={artifacts}
              axisX={axisX}
              depthZ={depthZ}
              quality={quality}
              reducedMotion={reducedMotion}
              showLabels={renderEnabled}
            />
          </WorldStreamReveal>
        )}
        {renderEnabled && sealAwake && !debugFlags.noSeal && (
          <WorldStreamReveal
            durationMs={WORLD_STREAM_TIMINGS.silhouetteRevealMs}
            fromScale={0.72}
            name="seal silhouette / under 200ms"
            reducedMotion={reducedMotion}
            rise={0.08}
            streamEpochMsRef={streamEpochMsRef}
          >
            <SealMascot
              ref={sealRef}
              accent={activeArtifact?.accent}
              activeArtifact={activeArtifact}
              axisVelocity={axisVelocity}
              axisX={axisX}
              depthVelocity={depthVelocity}
              depthZ={depthZ}
              guideState={guideState}
              iglooPosition={[
                OBSERVATORY_WORLD.center.x,
                0,
                OBSERVATORY_WORLD.center.z,
              ]}
              moving={moving}
              quality={quality}
              reducedMotion={reducedMotion}
              traversalPoseRef={traversalPoseRef}
            />
          </WorldStreamReveal>
        )}
        {(debugFlags.noDome || !observatoryDomeVisible) && (
          // The dome carries the scene's three point lights. Point-light count
          // is a program define: without these intensity-zero placeholders the
          // dome unmount forced every lit material in the world to relink a new
          // variant mid-travel (the measured departure hitch storm).
          <group name="observatory-light-topology-stabilizer">
            {!debugFlags.noPointLights && (
              <>
                <pointLight intensity={0} />
                <pointLight intensity={0} />
                <pointLight intensity={0} />
              </>
            )}
          </group>
        )}
        {!debugFlags.noDome && observatoryDomeVisible && (
          <WorldStreamReveal
            durationMs={WORLD_STREAM_TIMINGS.domeRevealMs}
            fromScale={0.76}
            name="observatory dome / 500ms cubic-bezier(0.33, 0, 0.2, 1)"
            progressRef={domeRevealProgressRef}
            reducedMotion={reducedMotion}
            rise={0.26}
            streamEpochMsRef={streamEpochMsRef}
          >
            <PolarObservatoryDome
              activeArtifact={activeArtifact}
              axisVelocity={axisVelocity}
              axisX={axisX}
              depthZ={depthZ}
              homePosition={[
                OBSERVATORY_WORLD.center.x,
                OBSERVATORY_WORLD.center.z,
              ]}
              impactPulse={iglooPulse}
              initialStreamRevealProgress={reducedMotion ? 1 : 0}
              pointerInteractionEnabled={dockedStationId === "observatory-plaque" || observatoryDistance <= 4.6}
              quality={quality}
              reducedMotion={reducedMotion}
              streamRevealProgressRef={domeRevealProgressRef}
            />
          </WorldStreamReveal>
        )}
        {!debugFlags.noArtifacts && bucket >= RENDER_BUCKETS.field && (
          <IglooArtifacts
            activeArtifactId={activeArtifact.id}
            artifacts={artifacts}
            exclusiveStationId={dockedStationId}
            heroProtected={
              activeArtifact.id === "observatory-plaque" && stationProximity >= 0.82
            }
            onSelectArtifact={onSelectArtifact}
            quality={quality}
            reducedMotion={reducedMotion}
            streamEpochMsRef={streamEpochMsRef}
          />
        )}
        {!debugFlags.noMechanisms && bucket >= RENDER_BUCKETS.systems && (
          <PolarStationMechanismLayer
            traversalPoseRef={traversalPoseRef}
            activeArtifactId={activeArtifact.id}
            exclusiveStationId={dockedStationId}
            liveSummary={liveSummary}
            mechanismStateRef={mechanismStateRef}
            onEvidenceReady={handleMechanismEvidenceReady}
            projects={projects}
            quality={quality}
            reducedMotion={reducedMotion}
            ritualStateRef={mechanismRitualStateRef}
            safeMode={!renderEnabled}
            visible={worldActive}
          />
        )}
        {!debugFlags.noSignals && bucket >= RENDER_BUCKETS.systems && (
          <PolarSemanticParticles
            activeStationId={dockedStationId || activeArtifact.id}
            enabled={renderEnabled && worldActive}
            quality={quality}
            reducedMotion={reducedMotion}
            travelerRef={traversalPoseRef}
            visible={worldActive}
          />
        )}
        {!debugFlags.noPost && (
          <RetroCinematicPostProcess
            motionPoseRef={traversalPoseRef}
            quality={quality}
            reducedMotion={reducedMotion}
          />
        )}
        {/* Route lead lines are unmounted while docked at spawn; this hidden
            pair keeps their shared fat-line materials reachable by the
            background warm so the first undock never links a program. Never
            rendered, so it costs no draw calls. */}
        {bucket >= RENDER_BUCKETS.finish && (
        <group name="route-line-warm-compile-primer" visible={false}>
          <RouteLeadLine
            lineWidth={1}
            material={ROUTE_LINE_MATERIALS.base}
            points={WARMUP_LINE_POINTS}
          />
          <RouteLeadLine
            lineWidth={1}
            material={ROUTE_LINE_MATERIALS.accent}
            points={WARMUP_LINE_POINTS}
          />
        </group>
        )}
        <BackgroundShaderWarmup enabled={renderEnabled && worldActive && bucket >= RENDER_BUCKETS.finish} />
      </Suspense>
    </Canvas>
  );
}
