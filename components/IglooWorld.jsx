"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world";
import {
  MANUAL_MAX_SPEED,
  advanceTraversalFrame,
  createStationCollisionSet,
  createStationTraversalTarget,
  createTraversalState,
  deriveLiveTraversalPresentation,
  deriveTraversalPresentation,
  didPhysicalDockOwnershipChange,
  getTraversalRenderPose,
  routeTraversalToStation,
} from "../lib/polar-traversal";
import { deriveSealGuideState } from "../lib/seal-guide-state";
import BlackHoleTransition from "./BlackHoleTransition";
import IglooHud from "./IglooHud";
import { IGLOO_ARTIFACTS } from "../lib/igloo-artifacts";
import SdfSealSplash from "./SdfSealSplash";

// three.js is 703 KB raw / 178 KB gzip - 33.9% of a 2.07 MB first load that
// every visitor paid for, including the ones who never press "Enter the world"
// and the ones on mobile who cannot. Nothing on the gate path needs it:
// SdfSealSplash, AntarcticSplashShader, IglooHud and BlackHoleTransition all
// drive raw WebGL. Only this subtree pulls three, drei and three-stdlib, and it
// is already gated behind sdfRenderEnabled, so the import can wait for the
// click that mounts it. ssr:false because the scene touches WebGL on mount.
const IglooScene = dynamic(() => import("./IglooScene"), { ssr: false });

const WORLD_Z_VALUES = STATION_WORLD_SCHEMA.order.map(
  (id) => STATION_WORLD_SCHEMA.stations[id].dock.z,
);
const DEPTH_RANGE = { min: Math.min(...WORLD_Z_VALUES), max: Math.max(...WORLD_Z_VALUES) };
const RIGHT_KEYS = new Set(["d"]);
const LEFT_KEYS = new Set(["a"]);
const DEPTH_KEYS = {
  forward: new Set(["w"]),
  backward: new Set(["s"]),
};
const ARROW_KEYS = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright"]);
const WASD_KEYS = new Set(["w", "a", "s", "d"]);
const INPUT_HINT_COPY = "Use WASD to pilot the seal";
const INPUT_HINT_DURATION = 1700;
const GPU_PROBE_TIMEOUT_MS = 7000;
const MAX_DIAGNOSTIC_EVENTS = 8;
const SEAL_ROUTE_HINT_INTERVAL_MS = 15000;
const SEAL_ROUTE_HINT_VISIBLE_MS = 3800;
const FATAL_RENDER_EVENT_TYPES = new Set(["webgl-context-lost", "webgl-create-failed", "canvas-error"]);
const SAFE_RENDER_QUERY = "safe=1";
const QA_AUTO_PROBE_RENDER_QUERY = "qa-auto-probe";
const QA_DIAGNOSTICS_RENDER_QUERY = "qa-diagnostics";
const QA_LOW_RENDER_QUERY = "qa-low";
const SAFE_QA_AUTO_PROBE_DELAY_MS = 900;
const IDLE_WORLD_FRAME_MS = 1000 / 20;
const ACTIVE_WORLD_FRAME_MS = 1000 / 60;
const SEMANTIC_SNAPSHOT_FRAME_MS = 100;
const OFFSCREEN_GPU_RELEASE_DELAY_MS = 180;
const HOME_STATION_ID = "observatory-plaque";
const ARCHIVE_STATION_ID = "topology-archive-wall";
export const ABETO_REFERENCE_MOTION_PROFILE =
  "Abeto Messenger reference: hidden document scroll, fullscreen WebGL stage, damped canonical XZ travel, station focus transitions";
export const OPEN_WORLD_LOADING_PROFILE =
  "best-of-two loading: Abeto fullscreen in-place world stream plus Bruno horizontal evidence index fallback";
const OPEN_WORLD_LOADING_SETTLE_MS = 1800;

/**
 * Measured quality selection.
 *
 * The tier was chosen from navigator.deviceMemory, which reports system RAM and
 * says nothing whatever about a GPU: an 8GB laptop with integrated graphics and
 * an 8GB desktop with a discrete card both got the most expensive tier. The
 * tiers are not close — measured at 1440x900 on one desktop, high runs 30.6ms,
 * medium 24.3ms and low 17.2ms, so the gaps are 6ms and 7ms — which is far more
 * than anything tuning inside a tier can move, and makes the choice between
 * them the single largest lever on how smooth the world feels.
 *
 * Downgrade only. Stepping up as well would need hysteresis to avoid hunting,
 * and a world that visibly changes quality twice while you watch is worse than
 * one that settles a little low. A machine that can hold high keeps it.
 *
 * Sampling starts well past the shader warm-up, whose links are the only source
 * of hitches once the world is up (measured: after the warm-up completes, p95
 * sits 4.2ms over median and 2 frames in 557 exceed it by half). Sampling
 * during it would downgrade every visitor on load cost they only pay once.
 */
const AUTO_QUALITY_POLICY = Object.freeze({
  settleMs: 5200,
  sampleFrames: 90,
  // The window is bounded in wall-clock as well as frames, because a window
  // counted only in frames takes 90/fps seconds to close and so gets longer
  // exactly as the machine gets worse: 1.5s at 60fps, 7.5s at 12fps, 10s at
  // 9fps. Measured under 20x CPU throttling, that put the second step 30s after
  // entry — half a minute of stutter on the machines the ladder exists for.
  // 2600ms yields 23 samples at 9fps, which is ample to tell a 111ms median from
  // a 19ms ceiling; the floor keeps a slower machine from deciding on too few.
  sampleWindowMs: 2600,
  minSampleFrames: 16,
  // A step down is permanent — the sampler runs once per tier and never revisits
  // it — so a decision taken during a passing stall follows the visitor for the
  // whole session. Background load alone moves this frame about 5ms: the same
  // configuration has measured 14.5ms and 19.5ms on this machine, and the
  // eight-station sweep 13.5-15.0ms and 15.8-17.7ms with GPU time unchanged.
  // A reading just over the ceiling is therefore not evidence of a slow machine.
  //
  // So the band above each ceiling asks for a second opinion. Over the ceiling
  // but inside the band, sample again and step only if both windows agree; past
  // the band, step at once, because nothing that far over is noise — under 20x
  // CPU throttling the median lands near 111ms against a 19ms ceiling.
  confirmBandMs: 5,
  confirmDelayMs: 1400,
  // The ladder keeps watching instead of deciding once. Sampling a tier a single
  // time assumes the machine a visitor arrives with is the machine they keep,
  // and it is not: a laptop drops to battery, a phone warms up, another tab
  // starts decoding video. Without this the only rescue is a reload, which a
  // visitor has no reason to think would help.
  //
  // Re-checking cannot oscillate, because the ladder only ever steps down. The
  // cost is one 2.6s sampling window every 24s, and the window is rAF timing
  // with no allocation and no draw of its own.
  recheckMs: 24000,
  // Stepping back up. A visitor whose machine was busy for one window at load
  // otherwise spends the session a tier below what their hardware can hold, and
  // the tier carries content, not just resolution.
  //
  // The danger is ping-pong, which reads worse than either tier, so restoring is
  // deliberately hard. The tier above cannot be measured without entering it, so
  // its cost is predicted from this one: measured on integrated graphics, high
  // runs about twice medium — 28.9ms against 14.6ms — and that ratio is what the
  // estimate below uses. A restore needs the prediction to clear the upper
  // tier's own ceiling with 2ms to spare, two consecutive healthy windows to
  // agree, and it may happen once. One wasted up-and-down cycle is the worst
  // case, after which the ladder settles for good.
  //
  // On the machine this was written on, medium measures 14.6ms and the estimate
  // is 29.2ms against a 19ms ceiling, so it correctly never fires.
  tierCostRatio: 2,
  restoreMarginMs: 2,
  restoreAfterHealthyWindows: 2,
  maxRestores: 1,
  // Both ceilings target 60fps rather than "not broken". The itemised frame
  // budget is why: measured on a cool machine, no single subsystem is worth
  // more than 3ms — observatory 2.97, all material cost 2.63, ground sheet
  // 2.26, grade chain 1.86, sky 1.23 — against a ~15ms GPU frame that also
  // carries ~3ms of JavaScript and ~2.9ms of compositor blur. There is no one
  // thing to fix; the tier ladder is the only lever that cuts across all of
  // them at once, and it only reaches 60fps if it is allowed to keep stepping.
  //
  // 19ms is about 53fps, which leaves headroom for the frame to vary without
  // the world sitting just under the bar. The medium floor used to be 30ms —
  // about 33fps — so a machine holding 41fps stopped there and never reached
  // the target it was supposed to be chasing.
  // Measured 2026-08-02 on Intel UHD integrated graphics at 1440x900: the tiers
  // floor at 28.9ms (high), 22.9ms (medium) and 17.1ms (low). Medium is the
  // interesting one, because it is NOT fill-bound the way the ladder as a whole
  // is: dropping its buffer from 0.9 to 0.75 device pixels took it 22.9ms ->
  // 18.9ms, but 0.75 -> 0.72 took it only 18.9ms -> 18.7ms. An 8% pixel cut
  // bought 0.2ms, so what medium costs is its content — 64 terrain segments, 24
  // geography instances, dynamic weather — not its resolution.
  //
  // That puts medium's floor at 18.7-19.5ms across runs. A ceiling inside a
  // tier's own variance makes the outcome a coin flip — three settle runs at
  // 19ms landed medium, medium, low — and lowering the resolution further cannot
  // fix what resolution does not cost.
  //
  // So the two ceilings are not the same number. High steps at 19ms, because the
  // tier below it is worth reaching. Medium steps at 21ms, which is below it,
  // deliberately: 21ms is about 48fps, and holding medium at 51-53fps keeps the
  // distant geography, the tunnel arch, the drift detail and three times the
  // dome's masonry that the low tier sheds. Stable pacing at the richer tier
  // beats a coin flip between 59fps sparse and 51fps rich.
  stepFromHighAboveMs: 19,
  stepFromMediumAboveMs: 21,
  order: Object.freeze(["high", "medium", "low"]),
});

const STATION_COLLIDERS = Object.freeze(
  createStationCollisionSet().map((collider) => Object.freeze(collider)),
);
const STATION_TARGETS = Object.freeze(
  STATION_WORLD_SCHEMA.order.map((id) =>
    Object.freeze(createStationTraversalTarget(id)),
  ),
);
const HOME_TARGET = Object.freeze(createStationTraversalTarget(HOME_STATION_ID));
const SCENE_DEBUG_FLAG_QUERIES = [
  ["qa-no-dome", "noDome"],
  ["qa-no-veil", "noVeil"],
  ["qa-no-terrain", "noTerrain"],
  ["qa-no-signals", "noSignals"],
  ["qa-no-smashables", "noSmashables"],
  ["qa-no-dressing", "noDressing"],
  ["qa-no-mechanisms", "noMechanisms"],
  ["qa-no-topology", "noTopology"],
  ["qa-no-seal", "noSeal"],
  ["qa-no-artifacts", "noArtifacts"],
  // Stops the world's clock so two builds render the same frame. Every animated
  // surface here reads clock.elapsedTime as a property rather than calling
  // getElapsedTime(), so pinning it once before the frame's other callbacks
  // freezes the aurora, the drift, the particles and the mascot together.
  //
  // This exists for measurement. probe:frame-detail can difference a global
  // statistic across a moving scene, because the motion cancels inside a pair,
  // but it cannot compare individual pixels: two browser sessions cannot be
  // phase-locked, so a moving aurora reads as ringing and the overshoot figure
  // is an upper bound rather than a measurement. With the clock stopped the
  // comparison becomes exact.
  ["qa-freeze", "freezeClock"],
  // Ablation switch for the fullscreen grade. The frame is fragment-bound, and
  // separating the post chain's share from the world's share is not inferable
  // from draw counts, so it needs a real toggle to measure against.
  ["qa-no-post", "noPost"],
  // Ablation switch for the shadow pass. It re-renders every caster into a
  // depth map at a resolution the canvas ratio does not touch, so it is the one
  // candidate a device-pixel-ratio sweep cannot rule in or out.
  ["qa-no-shadows", "noShadows"],
  // Ablation switch for the sky dome alone. It shares its authored shader and
  // its component with the ground sheet, so without this the two cannot be
  // told apart in a frame budget.
  ["qa-no-sky", "noSky"],
  // Hides the ground mesh while the component, and therefore the scene light
  // rig, stays mounted. qa-no-terrain unmounts both together.
  ["qa-no-ground", "noGround"],
  // Two candidate levers on the light rig, which paired measurement puts at
  // roughly 7ms of the frame. Flags rather than edits so each can be measured
  // against its own baseline in the same browser.
  ["qa-hard-shadows", "hardShadows"],
  ["qa-no-env", "noEnv"],
  // Swaps every material for MeshLambert. Diagnostic only; the output is wrong
  // on purpose, and what it measures is per-pixel shading cost.
  ["qa-cheap-materials", "cheapMaterials"],
  // Renders a per-pixel write count instead of the world.
  ["qa-overdraw", "overdraw"],
  // Same counter, but only counting fragments that survive depth rejection.
  ["qa-overdraw-depth", "overdrawDepth"],
  // Removes the three point lights. Their count is a shader define, so even at
  // intensity zero they are three more light evaluations on every lit fragment.
  ["qa-no-point-lights", "noPointLights"],
];
const DEFAULT_SCENE_DEBUG_FLAGS = Object.freeze(
  SCENE_DEBUG_FLAG_QUERIES.reduce((flags, [, flag]) => ({ ...flags, [flag]: false }), {}),
);

function hasCurrentFatalRenderEvent(events, rendererMode) {
  // An explicit retry supersedes an earlier failure while preserving the diagnostic history.
  if (rendererMode === "probe") return false;
  const latestTerminalEvent = events.find(
    (event) =>
      event.type === "webgl-scene-ready" ||
      (event.severity === "error" && FATAL_RENDER_EVENT_TYPES.has(event.type)),
  );
  return Boolean(
    latestTerminalEvent &&
      latestTerminalEvent.type !== "webgl-scene-ready" &&
      latestTerminalEvent.severity === "error",
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function stationRouteProgress(stationId) {
  const index = STATION_WORLD_SCHEMA.order.indexOf(stationId);
  return index < 0 ? 0 : index / Math.max(1, STATION_WORLD_SCHEMA.order.length - 1);
}

function createWorldTraversalPresentation(
  traversal,
  selectedDestinationId,
  pose = getTraversalRenderPose(traversal),
) {
  return deriveLiveTraversalPresentation(traversal, {
    pose,
    progress: stationRouteProgress(
      selectedDestinationId || traversal.dockedId || HOME_STATION_ID,
    ),
    selectedDestinationId,
    stations: STATION_TARGETS,
  });
}

function sameTraversalPresentation(left, right) {
  return (
    left.destinationId === right.destinationId &&
    left.dockedStationId === right.dockedStationId &&
    left.nearestStationId === right.nearestStationId &&
    left.phase === right.phase &&
    left.progress === right.progress &&
    left.isArrived === right.isArrived
  );
}

const INITIAL_TRAVERSAL_PRESENTATION = Object.freeze(
  deriveTraversalPresentation(
    {
      destinationId: HOME_STATION_ID,
      dockedStationId: HOME_STATION_ID,
      positionXZ: HOME_TARGET,
      progress: stationRouteProgress(HOME_STATION_ID),
      routeActive: false,
      velocityXZ: { x: 0, z: 0 },
    },
    STATION_TARGETS,
  ),
);

function isSafeRenderQuery(search) {
  if (!search) return false;
  const query = new URLSearchParams(search);
  return query.get("safe") === "1" || query.has("safe-mode");
}

function describeError(error) {
  if (!error) return "Unknown renderer error";
  if (typeof error === "string") return error;
  return error.message || error.reason?.message || String(error);
}

function DiagnosticPanel({ events, forced, onReloadWorld, rendererMode }) {
  // "probe" is the ordinary state during a cold shader compile, which can run
  // 25-32s on a first visit. Treating it as a diagnostic condition meant a
  // stranger spent that half-minute reading "renderer diagnostics / probe" and
  // being offered a "reload world" button that restarts the compile from zero.
  // A real failure still surfaces unprompted; the slow-but-working path does
  // not, and ?qa-diagnostics brings the full strip back for debugging.
  const errorEvents = events.filter(
    (event) => event.severity === "error" || event.severity === "warn",
  );
  const verbose = forced || rendererMode === "safe";
  const visibleEvents = verbose ? events : errorEvents;

  if (!visibleEvents.length && !verbose) return null;

  return (
    <div className="igloo-diagnostics" role="status" aria-live="polite">
      <span>renderer diagnostics / {rendererMode}</span>
      {/* Probe recovery: a wedged probe (e.g. a killed R3F loop before
          scene-ready) never resolves on its own, so the strip offers a clean
          canvas remount instead of demanding a manual page reload. */}
      {verbose && rendererMode === "probe" && onReloadWorld && (
        <button
          className="igloo-diagnostics-reload"
          onClick={onReloadWorld}
          type="button"
        >
          reload world
        </button>
      )}
      <ol>
        {visibleEvents.map((event) => (
          <li data-severity={event.severity} key={event.id}>
            <strong>{event.type}</strong>
            {event.message}
          </li>
        ))}
      </ol>
    </div>
  );
}

function OpenWorldLoadingBridge({ active, activeArtifact, rendererMode }) {
  const loading = active || rendererMode === "probe";

  return (
    <div
      aria-hidden={loading ? "false" : "true"}
      aria-live="polite"
      className="open-world-loading-bridge"
      data-active={loading ? "true" : "false"}
      role="status"
    >
      <span>open world stream</span>
      <strong>{activeArtifact.shortLabel}</strong>
      <small>field renderer / station loop / evidence index</small>
      <i />
    </div>
  );
}

class GpuErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.props.onGpuEvent?.({
      severity: "error",
      type: "react-three-error",
      message: describeError(error),
      detail: info?.componentStack,
    });
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="igloo-no-webgl" role="alert">
          <strong>GPU scene failed to mount</strong>
          <p>{describeError(this.state.error)}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

function isWorldVisible(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return rect.left < window.innerWidth * 0.62 && rect.right > window.innerWidth * 0.38;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

export default function IglooWorld({ content, initialQuery = {}, liveSummary, projects }) {
  const reduced = useReducedMotion();
  const traversalRef = useRef(null);
  if (!traversalRef.current) {
    traversalRef.current = createTraversalState(HOME_TARGET);
  }
  const traversalPoseRef = useRef(getTraversalRenderPose(traversalRef.current));
  const selectedDestinationIdRef = useRef(HOME_STATION_ID);
  const earnedDockedStationIdRef = useRef(HOME_STATION_ID);
  const presentationRef = useRef(INITIAL_TRAVERSAL_PRESENTATION);
  const lastSemanticSnapshotRef = useRef(0);
  const lastImpactSequenceRef = useRef(0);
  const worldVisibilityRef = useRef(true);
  const inputHintTimeoutRef = useRef(0);
  const impactTimeoutRef = useRef(0);
  const offscreenReleaseTimeoutRef = useRef(0);
  const loadBridgeTimeoutRef = useRef(0);
  const sealRouteHintIntervalRef = useRef(0);
  const sealRouteHintTimeoutRef = useRef(0);
  const sealRouteHintDirectionRef = useRef(1);
  const pressedKeysRef = useRef(new Set());
  // Camera yaw in radians, written by the scene's CameraRig each frame so WASD
  // stays camera-relative under the chase camera: W is away-from-camera,
  // A/D strafe against the camera heading. Null until the rig runs.
  const cameraYawRef = useRef(null);
  // Input frame latch: the yaw captured at the first keydown of a hold. Keeping
  // the frame fixed while keys are held prevents the pursuit feedback loop
  // where a swinging chase camera re-rotates the very input that steers it.
  const inputYawRef = useRef(null);
  const worldRef = useRef(null);
  const archiveOfferDismissedArrivalRef = useRef(null);
  const initialSafeMode = Boolean(initialQuery.initialSafeMode);
  const initialSafetyQuality = Boolean(initialQuery.initialQaLow || initialSafeMode);
  const [quality, setQuality] = useState(initialSafetyQuality ? "low" : "high");
  // Set the moment the visitor picks a tier themselves. Their choice is final:
  // a world that overrides a deliberate selection two seconds later is broken,
  // however well-meant the measurement behind it.
  const qualityLockedRef = useRef(false);
  // Restores are capped for the session, not per tier, so the ladder cannot walk
  // up and down repeatedly by resetting its own counter on the way past.
  const restoresRef = useRef(0);
  const selectQuality = useCallback((next) => {
    qualityLockedRef.current = true;
    setQuality(next);
  }, []);
  const [highContrast, setHighContrast] = useState(false);
  const [traversalPresentation, setTraversalPresentation] = useState(
    INITIAL_TRAVERSAL_PRESENTATION,
  );
  const [axisVelocity, setAxisVelocity] = useState(0);
  const [axisX, setAxisX] = useState(HOME_TARGET.x);
  const [depthVelocity, setDepthVelocity] = useState(0);
  const [depthZ, setDepthZ] = useState(HOME_TARGET.z);
  const [sdfRenderEnabled, setSdfRenderEnabled] = useState(false);
  const [safeMode, setSafeMode] = useState(initialSafeMode);
  const [sceneReady, setSceneReady] = useState(false);
  const [sealAwake, setSealAwake] = useState(false);
  const [iglooPulse, setIglooPulse] = useState(0);
  const [sceneDebugFlags, setSceneDebugFlags] = useState(DEFAULT_SCENE_DEBUG_FLAGS);
  const [gpuDiagnostics, setGpuDiagnostics] = useState(() =>
    initialSafeMode
      ? [
          {
            detail: undefined,
            id: "initial-safe-boot",
            message: "Basic scene mounted; GPU probe waiting for Start exploring.",
            severity: "info",
            type: "safe-boot",
          },
        ]
      : [],
  );
  const [inputHint, setInputHint] = useState("");
  const [sealRouteHint, setSealRouteHint] = useState("");
  const [worldLoadBridgeActive, setWorldLoadBridgeActive] = useState(false);
  const [archivePortalOfferOpen, setArchivePortalOfferOpen] = useState(false);
  const [blackHoleActive, setBlackHoleActive] = useState(false);
  const [qaAutoProbe, setQaAutoProbe] = useState(false);
  const [qaDiagnostics, setQaDiagnostics] = useState(false);
  const [stationProximity, setStationProximity] = useState(0);
  const [worldInView, setWorldInView] = useState(true);
  const [gpuStageMounted, setGpuStageMounted] = useState(true);
  const [worldRunId, setWorldRunId] = useState(0);
  const renderEnabledRef = useRef(false);
  const artifacts = useMemo(() => IGLOO_ARTIFACTS, []);
  const evidenceArtifact =
    artifacts.find(
      (artifact) => artifact.id === traversalPresentation.dockedStationId,
    ) ||
    artifacts.find(
      (artifact) => artifact.id === earnedDockedStationIdRef.current,
    ) ||
    artifacts.find(
      (artifact) => artifact.id === traversalPresentation.nearestStationId,
    ) ||
    artifacts[0];
  const intentArtifact =
    artifacts.find(
      (artifact) => artifact.id === traversalPresentation.destinationId,
    ) ||
    artifacts.find(
      (artifact) => artifact.id === traversalPresentation.nearestStationId,
    ) ||
    evidenceArtifact;
  const exclusiveStationId = traversalPresentation.dockedStationId || null;
  const axisProgress = traversalPresentation.progress;
  const depthProgress = clamp(
    (depthZ - DEPTH_RANGE.min) / Math.max(0.1, DEPTH_RANGE.max - DEPTH_RANGE.min),
    0,
    1,
  );
  const effectiveSafeMode = safeMode && !sdfRenderEnabled;
  const worldPresentationActive = worldInView && !blackHoleActive;
  const publicRenderEnabled = Boolean(
    sdfRenderEnabled &&
      sceneReady &&
      !effectiveSafeMode &&
      gpuStageMounted &&
      worldPresentationActive,
  );
  const rendererMode = effectiveSafeMode ? "safe" : sdfRenderEnabled ? (sceneReady ? "webgl" : "probe") : "gated";
  const traversalState = traversalRef.current;
  const semanticTarget =
    traversalState.route || createStationTraversalTarget(intentArtifact.id);
  const stationAxisDelta = (semanticTarget?.x ?? traversalState.x) - traversalState.x;
  const stationDepthDelta = (semanticTarget?.z ?? traversalState.z) - traversalState.z;
  const stationDistance = Math.hypot(stationAxisDelta, stationDepthDelta);
  const approachingStation =
    stationAxisDelta * traversalState.vx + stationDepthDelta * traversalState.vz > 0.001;
  const hasRenderError =
    effectiveSafeMode ||
    hasCurrentFatalRenderEvent(gpuDiagnostics, rendererMode);
  const sealGuideState = deriveSealGuideState({
    approachingStation,
    bridgeActive: worldLoadBridgeActive,
    hasRenderError,
    moving: ["moving", "docking"].includes(traversalPresentation.phase),
    rendererMode,
    stationDistance,
  });

  useEffect(() => {
    const element = worldRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const wasVisible = worldVisibilityRef.current;
        const nextVisible = wasVisible
          ? entry.isIntersecting && entry.intersectionRatio > 0.01
          : entry.isIntersecting && entry.intersectionRatio >= 0.08;
        if (nextVisible === wasVisible) return;
        worldVisibilityRef.current = nextVisible;
        setWorldInView(nextVisible);
        window.clearTimeout(offscreenReleaseTimeoutRef.current);
        if (nextVisible) {
          setGpuStageMounted(true);
          return;
        }
        offscreenReleaseTimeoutRef.current = window.setTimeout(() => {
          if (!worldVisibilityRef.current) setGpuStageMounted(false);
        }, OFFSCREEN_GPU_RELEASE_DELAY_MS);
      },
      { threshold: [0, 0.01, 0.08, 0.16] },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.clearTimeout(offscreenReleaseTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    renderEnabledRef.current = sdfRenderEnabled;
  }, [sdfRenderEnabled]);

  useEffect(() => {
    window.clearInterval(sealRouteHintIntervalRef.current);
    window.clearTimeout(sealRouteHintTimeoutRef.current);
    setSealRouteHint("");
    if (
      !sdfRenderEnabled ||
      !worldPresentationActive ||
      !traversalPresentation.isArrived ||
      archivePortalOfferOpen
    ) {
      return undefined;
    }

    const showHint = () => {
      const currentId =
        traversalPresentation.dockedStationId ||
        traversalPresentation.nearestStationId ||
        HOME_STATION_ID;
      const currentIndex = STATION_WORLD_SCHEMA.order.indexOf(currentId);
      const direction = sealRouteHintDirectionRef.current;
      const nextIndex =
        (Math.max(0, currentIndex) + direction + STATION_WORLD_SCHEMA.order.length) %
        STATION_WORLD_SCHEMA.order.length;
      const nextId = STATION_WORLD_SCHEMA.order[nextIndex];
      const nextArtifact = artifacts.find((artifact) => artifact.id === nextId);
      // Heading-neutral copy: under the chase camera no fixed key maps to a
      // fixed world bearing, so the hint names the destination, not a key.
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      setSealRouteHint(
        coarsePointer
          ? `Tap the ${nextArtifact?.shortLabel || "next station"} beacon`
          : `Swim to ${nextArtifact?.shortLabel || "the next station"}`,
      );
      sealRouteHintDirectionRef.current = direction * -1;
      window.clearTimeout(sealRouteHintTimeoutRef.current);
      sealRouteHintTimeoutRef.current = window.setTimeout(
        () => setSealRouteHint(""),
        SEAL_ROUTE_HINT_VISIBLE_MS,
      );
    };

    sealRouteHintIntervalRef.current = window.setInterval(
      showHint,
      SEAL_ROUTE_HINT_INTERVAL_MS,
    );
    return () => {
      window.clearInterval(sealRouteHintIntervalRef.current);
      window.clearTimeout(sealRouteHintTimeoutRef.current);
    };
  }, [
    archivePortalOfferOpen,
    artifacts,
    sdfRenderEnabled,
    traversalPresentation,
    worldPresentationActive,
  ]);

  const reportGpuEvent = useCallback(
    (event) => {
      const diagnostic = {
        detail: event.detail,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message: event.message || "No renderer detail supplied",
        severity: event.severity || "info",
        type: event.type || "gpu-event",
      };
      const log = diagnostic.severity === "error" ? console.error : diagnostic.severity === "warn" ? console.warn : console.info;
      log("[seal-render]", diagnostic.type, diagnostic.message, diagnostic.detail || "");
      setGpuDiagnostics((events) => {
        const latest = events[0];
        if (latest?.type === diagnostic.type && latest?.message === diagnostic.message) return events;
        return [diagnostic, ...events].slice(0, MAX_DIAGNOSTIC_EVENTS);
      });

      if (diagnostic.type === "webgl-scene-ready") {
        setSceneReady(true);
        setSafeMode(false);
        setSealAwake(true);
        window.clearTimeout(loadBridgeTimeoutRef.current);
        loadBridgeTimeoutRef.current = window.setTimeout(
          () => setWorldLoadBridgeActive(false),
          OPEN_WORLD_LOADING_SETTLE_MS,
        );
        return;
      }

      if (diagnostic.severity === "error" && FATAL_RENDER_EVENT_TYPES.has(diagnostic.type)) {
        setSceneReady(false);
        setSafeMode(true);
        setSdfRenderEnabled(false);
        setSealAwake(false);
      }
    },
    [],
  );

  // Measured downgrade. See AUTO_QUALITY_POLICY.
  useEffect(() => {
    // A material probe replaces every material in the scene and a re-render
    // undoes it, so the downgrade must not fire underneath one.
    if (
      sceneDebugFlags.cheapMaterials ||
      sceneDebugFlags.overdraw ||
      sceneDebugFlags.overdrawDepth
    ) {
      return undefined;
    }
    if (!sceneReady || qualityLockedRef.current) return undefined;
    if (quality === "low") return undefined;
    let cancelled = false;
    let frameHandle = 0;
    let confirming = false;
    let confirmedFirst = 0;
    let confirm = 0;
    let restart = () => {};
    let arm = () => {};
    let timer = 0;
    let healthyWindows = 0;
    const buildSampler = () => {
      const intervals = [];
      let started = performance.now();
      let last = started;
      restart = () => {
        started = performance.now();
        last = started;
        frameHandle = window.requestAnimationFrame(sample);
      };
      const sample = () => {
        if (cancelled) return;
        const now = performance.now();
        intervals.push(now - last);
        last = now;
        const enough =
          intervals.length >= AUTO_QUALITY_POLICY.sampleFrames ||
          (now - started >= AUTO_QUALITY_POLICY.sampleWindowMs &&
            intervals.length >= AUTO_QUALITY_POLICY.minSampleFrames);
        if (!enough) {
          frameHandle = window.requestAnimationFrame(sample);
          return;
        }
        // Drop the first few: the sampler's own first frames land while the
        // timeout callback is still unwinding.
        const usable = intervals.slice(Math.min(8, intervals.length >> 1)).sort((a, b) => a - b);
        const median = usable[Math.floor(usable.length / 2)];
        const ceiling =
          quality === "high"
            ? AUTO_QUALITY_POLICY.stepFromHighAboveMs
            : AUTO_QUALITY_POLICY.stepFromMediumAboveMs;
        if (!Number.isFinite(median) || median <= ceiling) {
          // Healthy this window. Watch again later rather than concluding.
          confirming = false;
          healthyWindows += 1;
          const upIndex = AUTO_QUALITY_POLICY.order.indexOf(quality) - 1;
          const up = upIndex >= 0 ? AUTO_QUALITY_POLICY.order[upIndex] : null;
          const upCeiling =
            up === "high"
              ? AUTO_QUALITY_POLICY.stepFromHighAboveMs
              : AUTO_QUALITY_POLICY.stepFromMediumAboveMs;
          const predicted = median * AUTO_QUALITY_POLICY.tierCostRatio;
          if (
            up &&
            !qualityLockedRef.current &&
            restoresRef.current < AUTO_QUALITY_POLICY.maxRestores &&
            healthyWindows >= AUTO_QUALITY_POLICY.restoreAfterHealthyWindows &&
            predicted <= upCeiling - AUTO_QUALITY_POLICY.restoreMarginMs
          ) {
            restoresRef.current += 1;
            setQuality(up);
            reportGpuEvent({
              detail: `median frame ${median.toFixed(1)}ms predicts ${predicted.toFixed(1)}ms at ${up}, under its ${upCeiling}ms ceiling`,
              message: `Quality restored from ${quality} to ${up}; the frame had room.`,
              severity: "info",
              type: "auto-quality-restore",
            });
            return;
          }
          arm(AUTO_QUALITY_POLICY.recheckMs);
          return;
        }
        const index = AUTO_QUALITY_POLICY.order.indexOf(quality);
        const next = AUTO_QUALITY_POLICY.order[index + 1];
        if (!next || qualityLockedRef.current) return;
        // Marginal reading: take a second window before spending the tier.
        if (median <= ceiling + AUTO_QUALITY_POLICY.confirmBandMs && !confirming) {
          confirming = true;
          confirmedFirst = median;
          intervals.length = 0;
          window.clearTimeout(confirm);
          confirm = window.setTimeout(() => {
            if (cancelled) return;
            intervals.length = 0;
            restart();
          }, AUTO_QUALITY_POLICY.confirmDelayMs);
          return;
        }
        setQuality(next);
        reportGpuEvent({
          detail: confirming
            ? `median frame ${confirmedFirst.toFixed(1)}ms then ${median.toFixed(1)}ms, both over a ${ceiling}ms ceiling`
            : `median frame ${median.toFixed(1)}ms over a ${ceiling}ms ceiling`,
          message: `Quality stepped from ${quality} to ${next} to hold the frame.`,
          severity: "info",
          type: "auto-quality-step",
        });
      };
      frameHandle = window.requestAnimationFrame(sample);
    };
    arm = (delay) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        buildSampler();
      }, delay);
    };
    arm(AUTO_QUALITY_POLICY.settleMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(confirm);
      window.cancelAnimationFrame(frameHandle);
    };
  }, [quality, reportGpuEvent, sceneDebugFlags, sceneReady]);


  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    // safe=1 is the incident path: boot cheap first and wait for an explicit user probe.
    const nextSafeMode = isSafeRenderQuery(window.location.search);
    const nextSceneDebugFlags = SCENE_DEBUG_FLAG_QUERIES.reduce(
      (flags, [queryKey, flag]) => ({ ...flags, [flag]: query.has(queryKey) }),
      {},
    );
    const nextQaAutoProbe = query.has(QA_AUTO_PROBE_RENDER_QUERY);
    setQaDiagnostics(query.has(QA_DIAGNOSTICS_RENDER_QUERY));
    setQaAutoProbe(nextQaAutoProbe);
    if (query.has(QA_LOW_RENDER_QUERY)) {
      setQuality("low");
    } else {
      // Opening guess only; AUTO_QUALITY_POLICY measures and steps down from
      // here once the world is up. deviceMemory is kept as the one signal
      // available before a frame has been drawn.
      const memory = navigator.deviceMemory || 8;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setQuality(memory <= 4 ? "low" : reducedMotion ? "medium" : "high");
    }
    setSceneDebugFlags(nextSceneDebugFlags);
    setSafeMode(nextSafeMode);
    setSceneReady(false);
    if (nextSafeMode) {
      setSdfRenderEnabled(false);
      setSealAwake(false);
      setQuality("low");
      reportGpuEvent({
        severity: "info",
        type: "safe-boot",
        message: nextQaAutoProbe
          ? "Basic scene mounted; QA URL will auto-start a low-quality GPU probe."
          : "Basic scene mounted; GPU probe waiting for Start exploring.",
      });
      return undefined;
    }
    if (query.has("qa-sdf")) {
      setSceneReady(false);
      setSdfRenderEnabled(true);
      setSealAwake(true);
    }
    return undefined;
  }, [reportGpuEvent]);

  useEffect(() => {
    const onError = (event) => {
      reportGpuEvent({
        detail: `${event.filename || "unknown"}:${event.lineno || 0}:${event.colno || 0}`,
        message: event.message || describeError(event.error),
        severity: "error",
        type: "window-error",
      });
    };
    const onUnhandledRejection = (event) => {
      reportGpuEvent({
        message: describeError(event.reason),
        severity: "error",
        type: "unhandled-rejection",
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [reportGpuEvent]);

  useEffect(() => {
    if (!safeMode || !sdfRenderEnabled) return undefined;
    const timeout = window.setTimeout(() => {
      reportGpuEvent({
        severity: "warn",
        type: "gpu-probe-timeout",
        message: `No WebGL ready event after ${GPU_PROBE_TIMEOUT_MS}ms; renderer may still be compiling assets.`,
      });
    }, GPU_PROBE_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [reportGpuEvent, safeMode, sdfRenderEnabled]);

  useEffect(() => {
    if (!safeMode || sdfRenderEnabled || !qaAutoProbe) return undefined;
    const timeout = window.setTimeout(() => {
      reportGpuEvent({
        severity: "info",
        type: "gpu-probe-qa-auto-start",
        message: "QA safe URL auto-started the low-quality GPU probe.",
      });
      setQuality("low");
      setSceneReady(false);
      setSdfRenderEnabled(true);
    }, SAFE_QA_AUTO_PROBE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [qaAutoProbe, reportGpuEvent, safeMode, sdfRenderEnabled]);

  useEffect(
    () => () => {
      window.clearTimeout(inputHintTimeoutRef.current);
      window.clearTimeout(impactTimeoutRef.current);
      window.clearTimeout(offscreenReleaseTimeoutRef.current);
    },
    [],
  );
  useEffect(
    () => () => {
      window.clearTimeout(loadBridgeTimeoutRef.current);
    },
    [],
  );

  const enableRenderer = useCallback(() => {
    if (safeMode) {
      setQuality("low");
      reportGpuEvent({
        severity: "info",
        type: "gpu-probe-manual-start",
        message: "User started the low-quality GPU probe from the safe gate.",
      });
    }
    setWorldLoadBridgeActive(true);
    setSceneReady(false);
    setSdfRenderEnabled(true);
    setSealAwake(true);
  }, [reportGpuEvent, safeMode]);

  const reloadWorld = useCallback(() => {
    reportGpuEvent({
      severity: "info",
      type: "world-reload",
      message: "User remounted the world canvas from the diagnostics strip.",
    });
    setWorldRunId((id) => id + 1);
    setSceneReady(false);
    setWorldLoadBridgeActive(true);
    setSdfRenderEnabled(true);
    setSealAwake(true);
  }, [reportGpuEvent]);

  const startExplorationRender = useCallback(() => {
    if (safeMode) setQuality("low");
    if (!sdfRenderEnabled) setSceneReady(false);
    setWorldLoadBridgeActive(true);
    setSdfRenderEnabled(true);
    setSealAwake(true);
  }, [safeMode, sdfRenderEnabled]);

  const touchIgloo = useCallback((strength = 1) => {
    const boundedStrength = clamp(Number.isFinite(strength) ? strength : 1, 0.04, 1);
    setIglooPulse((current) => Math.max(current, boundedStrength));
    window.clearTimeout(impactTimeoutRef.current);
    impactTimeoutRef.current = window.setTimeout(() => setIglooPulse(0), 620);
  }, []);

  const showInputHint = useCallback(() => {
    setInputHint(INPUT_HINT_COPY);
    window.clearTimeout(inputHintTimeoutRef.current);
    inputHintTimeoutRef.current = window.setTimeout(() => setInputHint(""), INPUT_HINT_DURATION);
  }, []);

  const commitTraversalPresentation = useCallback((traversal, pose) => {
    const nextPresentation = createWorldTraversalPresentation(
      traversal,
      selectedDestinationIdRef.current,
      pose,
    );
    presentationRef.current = nextPresentation;
    setTraversalPresentation((current) =>
      sameTraversalPresentation(current, nextPresentation)
        ? current
        : nextPresentation,
    );
    return nextPresentation;
  }, []);

  useEffect(() => {
    const arrivedAtArchive =
      traversalPresentation.isArrived &&
      traversalPresentation.dockedStationId === ARCHIVE_STATION_ID;
    if (!arrivedAtArchive || !sdfRenderEnabled || blackHoleActive) {
      if (!arrivedAtArchive || blackHoleActive) {
        setArchivePortalOfferOpen(false);
      }
      if (traversalPresentation.dockedStationId !== ARCHIVE_STATION_ID) {
        archiveOfferDismissedArrivalRef.current = null;
      }
      return;
    }
    if (
      archiveOfferDismissedArrivalRef.current ===
      traversalRef.current.arrivalSequence
    ) {
      return;
    }
    setArchivePortalOfferOpen(true);
  }, [blackHoleActive, sdfRenderEnabled, traversalPresentation]);

  const confirmArchivePortal = useCallback(() => {
    const presentation = presentationRef.current;
    if (
      !presentation.isArrived ||
      presentation.dockedStationId !== ARCHIVE_STATION_ID
    ) {
      return;
    }
    setArchivePortalOfferOpen(false);
    setBlackHoleActive(true);
  }, []);

  const cancelArchivePortal = useCallback(() => {
    archiveOfferDismissedArrivalRef.current =
      traversalRef.current.arrivalSequence;
    setArchivePortalOfferOpen(false);
  }, []);

  const selectArtifact = useCallback(
    (artifactId) => {
      const artifact = artifacts.find((item) => item.id === artifactId);
      if (!artifact) return;
      const target = createStationTraversalTarget(artifact.id);
      if (!target) return;
      routeTraversalToStation(traversalRef.current, artifact.id);
      selectedDestinationIdRef.current = artifact.id;
      archiveOfferDismissedArrivalRef.current =
        traversalRef.current.arrivalSequence;
      setArchivePortalOfferOpen(false);
      setBlackHoleActive(false);
      commitTraversalPresentation(traversalRef.current);
    },
    [artifacts, commitTraversalPresentation],
  );

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const qaArtifact = query.get("qa-artifact");
    if (!qaArtifact) return;
    const artifact = artifacts.find((item) => item.id === qaArtifact);
    const target = createStationTraversalTarget(artifact?.id);
    if (!artifact || !target) return;
    const qaTraversal = createTraversalState(target);
    qaTraversal.dockedId = artifact.id;
    qaTraversal.nearbyId = artifact.id;
    qaTraversal.proximityStationId = artifact.id;
    qaTraversal.stationProximity = 1;
    traversalRef.current = qaTraversal;
    traversalPoseRef.current = {
      ...getTraversalRenderPose(qaTraversal),
      dockSettleOffset: 0,
      dockedId: artifact.id,
      nearbyId: artifact.id,
      proximityStationId: artifact.id,
      stationProximity: 1,
    };
    selectedDestinationIdRef.current = artifact.id;
    earnedDockedStationIdRef.current = artifact.id;
    archiveOfferDismissedArrivalRef.current = null;
    setArchivePortalOfferOpen(false);
    setBlackHoleActive(false);
    const qaPresentation = commitTraversalPresentation(
      qaTraversal,
      getTraversalRenderPose(qaTraversal),
    );
    traversalPoseRef.current = {
      ...traversalPoseRef.current,
      presentation: qaPresentation,
    };
    setAxisX(target.x);
    setDepthZ(target.z);
    setStationProximity(1);
  }, [artifacts, commitTraversalPresentation]);

  useEffect(() => {
    if (!worldPresentationActive) return undefined;
    let raf = 0;
    let previous = performance.now();
    let lastFrame = previous;

    const tick = (now) => {
      const traversal = traversalRef.current;
      const activeInput = pressedKeysRef.current.size > 0;
      const traversalActive =
        activeInput ||
        Boolean(traversal.destinationId) ||
        Math.hypot(traversal.vx, traversal.vz) > 0.025;
      const targetFrameMs = traversalActive ? ACTIVE_WORLD_FRAME_MS : IDLE_WORLD_FRAME_MS;
      if (now - lastFrame < targetFrameMs) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      lastFrame = now;
      const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000));
      previous = now;
      let direction = 0;
      let depthDirection = 0;
      for (const key of pressedKeysRef.current) {
        if (RIGHT_KEYS.has(key)) direction += 1;
        if (LEFT_KEYS.has(key)) direction -= 1;
        if (DEPTH_KEYS.forward.has(key)) depthDirection -= 1;
        if (DEPTH_KEYS.backward.has(key)) depthDirection += 1;
      }

      const visible = isWorldVisible(worldRef.current);
      const hasManualDirection =
        visible && (direction !== 0 || depthDirection !== 0);
      // Rotate the raw WASD vector by the camera yaw latched at the start of
      // this hold, so W reads as away-from-camera and A/D as camera strafes
      // without the swinging chase camera re-steering a held key mid-travel.
      // Identity until the rig has published a yaw.
      if (direction === 0 && depthDirection === 0) {
        inputYawRef.current = null;
      } else if (inputYawRef.current === null) {
        inputYawRef.current = cameraYawRef.current;
      }
      const yaw = inputYawRef.current;
      let inputX = direction;
      let inputZ = depthDirection;
      if (yaw !== null) {
        const cosYaw = Math.cos(yaw);
        const sinYaw = Math.sin(yaw);
        inputX = direction * cosYaw + depthDirection * sinYaw;
        inputZ = depthDirection * cosYaw - direction * sinYaw;
      }
      advanceTraversalFrame(traversal, {
        colliders: STATION_COLLIDERS,
        dt,
        input: visible ? { x: inputX, z: inputZ } : { x: 0, z: 0 },
        stations: STATION_TARGETS,
      });

      if (hasManualDirection && !traversal.destinationId) {
        selectedDestinationIdRef.current = null;
      }
      if (traversal.dockedId) {
        earnedDockedStationIdRef.current = traversal.dockedId;
        selectedDestinationIdRef.current = traversal.dockedId;
      }

      const pose = getTraversalRenderPose(traversal);
      let semanticPresentation = presentationRef.current;
      const dockOwnershipChanged = didPhysicalDockOwnershipChange(
        semanticPresentation,
        traversal,
      );

      if (
        dockOwnershipChanged ||
        now - lastSemanticSnapshotRef.current >= SEMANTIC_SNAPSHOT_FRAME_MS
      ) {
        lastSemanticSnapshotRef.current = now;
        semanticPresentation = commitTraversalPresentation(traversal, pose);
        const axisMotion = clamp(pose.vx / MANUAL_MAX_SPEED, -1, 1);
        const depthMotion = clamp(pose.vz / MANUAL_MAX_SPEED, -1, 1);
        setAxisX(pose.x);
        setDepthZ(pose.z);
        setAxisVelocity(Math.abs(axisMotion) > 0.025 ? Number(axisMotion.toFixed(2)) : 0);
        setDepthVelocity(Math.abs(depthMotion) > 0.025 ? Number(depthMotion.toFixed(2)) : 0);
        setStationProximity(Number(traversal.stationProximity.toFixed(4)));
      }

      traversalPoseRef.current = {
        ...pose,
        arrivalSequence: traversal.arrivalSequence,
        arrivalStationId: traversal.arrivalStationId,
        arrivalStrength: traversal.arrivalStrength,
        destinationId: semanticPresentation.destinationId,
        dockSettleOffset: traversal.dockSettleOffset,
        dockedId: traversal.dockedId,
        dockedStationId: semanticPresentation.dockedStationId,
        nearestStationId: semanticPresentation.nearestStationId,
        phase: semanticPresentation.phase,
        presentation: semanticPresentation,
        proximityStationId: traversal.proximityStationId,
        nearbyId: traversal.nearbyId,
        stationProximity: traversal.stationProximity,
      };

      if (traversal.impactSequence !== lastImpactSequenceRef.current) {
        lastImpactSequenceRef.current = traversal.impactSequence;
        if (traversal.collisionId === "observatory-plaque") {
          touchIgloo(traversal.lastImpactStrength);
        }
      }
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [commitTraversalPresentation, touchIgloo, worldPresentationActive]);

  useEffect(() => {
    if (blackHoleActive) pressedKeysRef.current.clear();
  }, [blackHoleActive]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (blackHoleActive) return;
      if (!isWorldVisible(worldRef.current)) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, button, a")) {
        return;
      }

      const key = event.key.toLowerCase();
      if (WASD_KEYS.has(key)) {
        pressedKeysRef.current.add(key);
        startExplorationRender();
        event.preventDefault();
      } else if (ARROW_KEYS.has(key)) {
        showInputHint();
        event.preventDefault();
      }
    };
    const onKeyUp = (event) => {
      pressedKeysRef.current.delete(event.key.toLowerCase());
    };
    const onBlur = () => {
      pressedKeysRef.current.clear();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [blackHoleActive, showInputHint, startExplorationRender]);

  return (
    <section
      className={`igloo-world quality-${quality}`}
      data-axis="world-xz"
      data-moving={
        ["moving", "docking"].includes(traversalPresentation.phase)
          ? "true"
          : "false"
      }
      data-project-count={projects?.length || 0}
      data-station-count={artifacts.length}
      id="world"
      ref={worldRef}
      data-render-enabled={publicRenderEnabled ? "true" : "false"}
      data-renderer-mode={rendererMode}
      data-world-suspended={worldPresentationActive ? "false" : "true"}
      data-world-portal-active={blackHoleActive ? "true" : "false"}
      data-world-portal-offer={archivePortalOfferOpen ? "archive" : "none"}
      data-gpu-stage-mounted={gpuStageMounted ? "true" : "false"}
      data-seal-guide-state={sealGuideState}
      data-seal-awake={sealAwake ? "true" : "false"}
      data-high-contrast={highContrast ? "true" : "false"}
      data-loading-model="abeto-fullscreen-world bruno-horizontal-index"
      data-scroll-model="webgl-open-xz-world horizontal-evidence-axis"
      data-docked-station={traversalRef.current.dockedId || "none"}
      data-presentation-arrived={traversalPresentation.isArrived ? "true" : "false"}
      data-presentation-destination={traversalPresentation.destinationId || "none"}
      data-presentation-docked={traversalPresentation.dockedStationId || "none"}
      data-presentation-nearest={traversalPresentation.nearestStationId || "none"}
      data-presentation-phase={traversalPresentation.phase}
      data-presentation-progress={traversalPresentation.progress.toFixed(3)}
      data-proximity-station={traversalRef.current.proximityStationId || "none"}
      data-route-queue-length={traversalRef.current.routeQueue.length}
      data-route-waypoint={traversalRef.current.route?.id || "none"}
      data-station-proximity={stationProximity.toFixed(3)}
      data-traversal-speed={Math.hypot(
        traversalRef.current.vx,
        traversalRef.current.vz,
      ).toFixed(3)}
      data-seal-halo-station={exclusiveStationId || intentArtifact.id}
      data-world-x={axisX.toFixed(3)}
      data-world-z={depthZ.toFixed(3)}
      style={{
        "--axis-progress": axisProgress,
        "--depth-progress": depthProgress,
        "--station-proximity": stationProximity,
      }}
    >
      <div className="igloo-poster" aria-hidden="true" />
      {!effectiveSafeMode && sdfRenderEnabled && gpuStageMounted && (
        <GpuErrorBoundary
          onGpuEvent={reportGpuEvent}
          resetKey={`${intentArtifact.id}-${quality}-${safeMode ? "safe" : "live"}-${worldRunId}`}
        >
          <IglooScene
            key={worldRunId}
            activeArtifactId={intentArtifact.id}
            axisVelocity={axisVelocity}
            axisX={axisX}
            cameraYawRef={cameraYawRef}
            depthVelocity={depthVelocity}
            depthZ={depthZ}
            dockedStationId={exclusiveStationId}
            artifacts={artifacts}
            iglooPulse={iglooPulse}
            guideState={sealGuideState}
            liveSummary={liveSummary}
            moving={["moving", "docking"].includes(traversalPresentation.phase)}
            onGpuEvent={reportGpuEvent}
            onSelectArtifact={selectArtifact}
            onTouchIgloo={touchIgloo}
            projects={projects}
            quality={safeMode ? "low" : quality}
            reducedMotion={reduced}
            renderEnabled={sdfRenderEnabled}
            sealAwake={sealAwake}
            stationProximity={stationProximity}
            traversalPoseRef={traversalPoseRef}
            worldActive={worldPresentationActive}
            debugFlags={sceneDebugFlags}
          />
        </GpuErrorBoundary>
      )}
      {inputHint && (
        <div className="igloo-input-hint" role="status" aria-live="polite">
          {inputHint}
        </div>
      )}
      {sealRouteHint && (
        <div className="seal-navigation-bubble" role="status" aria-live="polite">
          <span>seal guide</span>
          <strong>{sealRouteHint}</strong>
        </div>
      )}
      <DiagnosticPanel
        events={gpuDiagnostics}
        forced={qaDiagnostics}
        onReloadWorld={reloadWorld}
        rendererMode={rendererMode}
      />
      {!sdfRenderEnabled && (
        <SdfSealSplash
          active={worldInView}
          activeArtifact={evidenceArtifact}
          diagnosticEvents={gpuDiagnostics}
          guideState={sealGuideState}
          onEnable={enableRenderer}
          safeMode={safeMode}
        />
      )}
      <IglooHud
        activeArtifact={evidenceArtifact}
        artifacts={artifacts}
        content={content}
        liveSummary={liveSummary}
        onCancelArchivePortal={cancelArchivePortal}
        onConfirmArchivePortal={confirmArchivePortal}
        onSelectArtifact={selectArtifact}
        portalOfferOpen={archivePortalOfferOpen}
        presentation={traversalPresentation}
        quality={quality}
        highContrast={highContrast}
        reducedMotion={reduced}
        renderEnabled={publicRenderEnabled}
        sealAwake={sealAwake}
        setQuality={selectQuality}
        setHighContrast={setHighContrast}
      />
      <BlackHoleTransition
        active={blackHoleActive && worldInView}
        onClose={() => {
          cancelArchivePortal();
          setBlackHoleActive(false);
        }}
      />
      <OpenWorldLoadingBridge
        active={worldLoadBridgeActive && !effectiveSafeMode}
        activeArtifact={intentArtifact}
        rendererMode={rendererMode}
      />
    </section>
  );
}
