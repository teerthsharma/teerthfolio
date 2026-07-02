"use client";

import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import BlackHoleTransition from "./BlackHoleTransition";
import IglooHud from "./IglooHud";
import IglooScene from "./IglooScene";
import { IGLOO_ARTIFACTS } from "./IglooArtifacts";
import SdfSealSplash from "./SdfSealSplash";

const AXIS_HOLD_SPEED = 5.8;
const DEPTH_HOLD_SPEED = 3.4;
const DEPTH_RANGE = { min: -4.8, max: 4.8 };
const WORLD_LOOP_LENGTH = 128;
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
const FATAL_RENDER_EVENT_TYPES = new Set(["webgl-context-lost", "webgl-create-failed", "canvas-error"]);
const SAFE_RENDER_QUERY = "safe=1";
const QA_AUTO_PROBE_RENDER_QUERY = "qa-auto-probe";
const QA_LOW_RENDER_QUERY = "qa-low";
const SAFE_QA_AUTO_PROBE_DELAY_MS = 900;
const ATMOSPHERE_FRAME_MS = 1000 / 30;
const IDLE_WORLD_FRAME_MS = 1000 / 20;
const ACTIVE_WORLD_FRAME_MS = 1000 / 60;
const SCENE_DEBUG_FLAG_QUERIES = [
  ["qa-no-dome", "noDome"],
  ["qa-no-veil", "noVeil"],
  ["qa-no-terrain", "noTerrain"],
  ["qa-no-signals", "noSignals"],
  ["qa-no-smashables", "noSmashables"],
  ["qa-no-snow", "noSnow"],
  ["qa-no-topology", "noTopology"],
  ["qa-no-seal", "noSeal"],
  ["qa-no-artifacts", "noArtifacts"],
];
const DEFAULT_SCENE_DEBUG_FLAGS = Object.freeze(
  SCENE_DEBUG_FLAG_QUERIES.reduce((flags, [, flag]) => ({ ...flags, [flag]: false }), {}),
);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function wrapAxis(value, min, length) {
  return ((((value - min) % length) + length) % length) + min;
}

function circularDistance(a, b, length) {
  const diff = Math.abs(a - b) % length;
  return Math.min(diff, length - diff);
}

function nearestArtifact(artifacts, axisX, loopLength) {
  const loopedAxisX = wrapAxis(axisX, 0, loopLength);
  return artifacts.reduce((nearest, artifact) => {
    const nearestDistance = circularDistance(nearest.position[0], loopedAxisX, loopLength);
    const artifactDistance = circularDistance(artifact.position[0], loopedAxisX, loopLength);
    return artifactDistance < nearestDistance ? artifact : nearest;
  }, artifacts[0]);
}

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

function DiagnosticPanel({ events, rendererMode }) {
  const visibleEvents =
    rendererMode === "safe" || rendererMode === "probe"
      ? events
      : events.filter((event) => event.severity === "error" || event.severity === "warn");

  if (!visibleEvents.length && rendererMode !== "safe" && rendererMode !== "probe") return null;

  return (
    <div className="igloo-diagnostics" role="status" aria-live="polite">
      <span>renderer diagnostics / {rendererMode}</span>
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

function useAtmosphereCanvas(canvasRef, activeArtifact, quality, reduced) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return undefined;

    let raf = 0;
    let lastFrame = 0;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const maxDpr = quality === "high" ? 1.25 : 1;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      canvas.width = Math.max(1, Math.floor((rect?.width || window.innerWidth) * dpr));
      canvas.height = Math.max(1, Math.floor((rect?.height || window.innerHeight) * dpr));
      canvas.style.width = `${rect?.width || window.innerWidth}px`;
      canvas.style.height = `${rect?.height || window.innerHeight}px`;
    };

    const draw = (time = 0) => {
      if (!reduced) raf = window.requestAnimationFrame(draw);
      if (!reduced && time - lastFrame < ATMOSPHERE_FRAME_MS) {
        return;
      }
      lastFrame = time;
      const w = canvas.width;
      const h = canvas.height;
      const t = reduced ? 0 : time * 0.001;
      const accent = activeArtifact?.accent || "#5ff8e7";
      const gradient = context.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, "#010304");
      gradient.addColorStop(0.44, "#071216");
      gradient.addColorStop(1, "#000102");
      context.fillStyle = gradient;
      context.fillRect(0, 0, w, h);

      const glow = context.createRadialGradient(w * 0.52, h * 0.52, 0, w * 0.52, h * 0.52, Math.min(w, h) * 0.56);
      glow.addColorStop(0, `${accent}2b`);
      glow.addColorStop(0.42, "rgba(70, 95, 105, 0.12)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, w, h);

      context.save();
      context.translate(w * 0.5, h * 0.65);
      context.rotate(-0.04);
      context.strokeStyle = "rgba(223, 253, 247, 0.09)";
      context.lineWidth = Math.max(1, w / 1600);
      for (let i = 0; i < 24; i += 1) {
        context.beginPath();
        context.ellipse(0, 0, w * (0.12 + i * 0.018), h * (0.018 + i * 0.005), 0, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();

      context.save();
      context.globalCompositeOperation = "screen";
      context.strokeStyle = "rgba(223, 253, 247, 0.06)";
      for (let y = 0; y < h; y += Math.max(4, h / 150)) {
        context.beginPath();
        context.moveTo(0, y + Math.sin(t + y * 0.02) * 2);
        context.lineTo(w, y + Math.cos(t + y * 0.015) * 2);
        context.stroke();
      }
      context.fillStyle = "rgba(223, 253, 247, 0.18)";
      const particles = quality === "low" ? 40 : quality === "medium" ? 76 : 118;
      for (let i = 0; i < particles; i += 1) {
        const x = (Math.sin(i * 91.7 + t * 0.23) * 0.5 + 0.5) * w;
        const y = (Math.cos(i * 41.3 + t * 0.19) * 0.5 + 0.5) * h;
        const r = ((i % 5) + 1) * 0.38;
        context.globalAlpha = 0.12 + (i % 4) * 0.04;
        context.beginPath();
        context.arc(x, y, r, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();

    };

    resize();
    draw();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement || canvas);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
    };
  }, [activeArtifact, canvasRef, quality, reduced]);
}

export default function IglooWorld({ content, initialQuery = {}, liveSummary, projects, stations }) {
  const reduced = useReducedMotion();
  const atmosphere = useRef(null);
  const axisRef = useRef(IGLOO_ARTIFACTS[0].position[0]);
  const depthRef = useRef(0);
  const inputHintTimeoutRef = useRef(0);
  const pressedKeysRef = useRef(new Set());
  const worldRef = useRef(null);
  const blackHoleDismissedRef = useRef(false);
  const initialSafeMode = Boolean(initialQuery.initialSafeMode);
  const initialLowQuality = Boolean(initialQuery.initialQaLow || initialSafeMode);
  const [quality, setQuality] = useState(initialLowQuality ? "low" : "medium");
  const [highContrast, setHighContrast] = useState(false);
  const [activeArtifactId, setActiveArtifactId] = useState(IGLOO_ARTIFACTS[0].id);
  const [axisVelocity, setAxisVelocity] = useState(0);
  const [axisX, setAxisX] = useState(IGLOO_ARTIFACTS[0].position[0]);
  const [depthVelocity, setDepthVelocity] = useState(0);
  const [depthZ, setDepthZ] = useState(0);
  const [sdfRenderEnabled, setSdfRenderEnabled] = useState(false);
  const [safeMode, setSafeMode] = useState(initialSafeMode);
  const [sceneReady, setSceneReady] = useState(false);
  const [sealAwake, setSealAwake] = useState(false);
  const [iglooPulse, setIglooPulse] = useState(0);
  const [sceneDebugFlags, setSceneDebugFlags] = useState(DEFAULT_SCENE_DEBUG_FLAGS);
  const [gpuDiagnostics, setGpuDiagnostics] = useState([]);
  const [inputHint, setInputHint] = useState("");
  const [blackHoleActive, setBlackHoleActive] = useState(false);
  const [qaAutoProbe, setQaAutoProbe] = useState(false);
  const axisVelocityRef = useRef(0);
  const depthVelocityRef = useRef(0);
  const renderEnabledRef = useRef(false);
  const artifacts = useMemo(() => IGLOO_ARTIFACTS, []);
  const axisRange = useMemo(
    () => ({
      length: WORLD_LOOP_LENGTH,
      min: 0,
      max: WORLD_LOOP_LENGTH,
    }),
    [],
  );
  const activeArtifact =
    artifacts.find((artifact) => artifact.id === activeArtifactId) || artifacts[0];
  const axisProgress = wrapAxis(axisX, axisRange.min, axisRange.length) / Math.max(1, axisRange.length);
  const depthProgress =
    (depthZ - DEPTH_RANGE.min) / Math.max(0.1, DEPTH_RANGE.max - DEPTH_RANGE.min);
  const effectiveSafeMode = safeMode && !sdfRenderEnabled;
  const publicRenderEnabled = Boolean(sdfRenderEnabled && sceneReady && !effectiveSafeMode);
  const rendererMode = effectiveSafeMode ? "safe" : sdfRenderEnabled ? (sceneReady ? "webgl" : "probe") : "gated";

  useAtmosphereCanvas(atmosphere, activeArtifact, safeMode || reduced ? "low" : quality, reduced);

  useEffect(() => {
    renderEnabledRef.current = sdfRenderEnabled;
  }, [sdfRenderEnabled]);

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
      setGpuDiagnostics((events) => [diagnostic, ...events].slice(0, MAX_DIAGNOSTIC_EVENTS));

      if (diagnostic.type === "webgl-scene-ready") {
        setSceneReady(true);
        setSafeMode(false);
        setSealAwake(true);
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

  const setAxisVelocityState = useCallback((nextVelocity) => {
    if (axisVelocityRef.current === nextVelocity) return;
    axisVelocityRef.current = nextVelocity;
    setAxisVelocity(nextVelocity);
  }, []);

  const setDepthVelocityState = useCallback((nextVelocity) => {
    if (depthVelocityRef.current === nextVelocity) return;
    depthVelocityRef.current = nextVelocity;
    setDepthVelocity(nextVelocity);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    // safe=1 is the incident path: boot cheap first and wait for an explicit user probe.
    const nextSafeMode = isSafeRenderQuery(window.location.search);
    const nextSceneDebugFlags = SCENE_DEBUG_FLAG_QUERIES.reduce(
      (flags, [queryKey, flag]) => ({ ...flags, [flag]: query.has(queryKey) }),
      {},
    );
    const nextQaAutoProbe = query.has(QA_AUTO_PROBE_RENDER_QUERY);
    setQaAutoProbe(nextQaAutoProbe);
    if (query.has(QA_LOW_RENDER_QUERY)) {
      setQuality("low");
    } else {
      const memory = navigator.deviceMemory || 8;
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const smallViewport = window.innerWidth < 720;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setQuality(reducedMotion || smallViewport || memory <= 4 || coarsePointer ? "low" : "medium");
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

  useEffect(() => () => window.clearTimeout(inputHintTimeoutRef.current), []);

  const enableRenderer = useCallback(() => {
    if (safeMode) {
      setQuality("low");
      reportGpuEvent({
        severity: "info",
        type: "gpu-probe-manual-start",
        message: "User started the low-quality GPU probe from the safe gate.",
      });
    }
    setSceneReady(false);
    setSdfRenderEnabled(true);
  }, [reportGpuEvent, safeMode]);

  const startExplorationRender = useCallback(() => {
    if (safeMode) setQuality("low");
    if (!sdfRenderEnabled) setSceneReady(false);
    setSdfRenderEnabled(true);
    setSealAwake(true);
  }, [safeMode, sdfRenderEnabled]);

  const touchIgloo = useCallback(() => {
    setIglooPulse(1);
    window.setTimeout(() => setIglooPulse(0), 1200);
  }, []);

  const showInputHint = useCallback(() => {
    setInputHint(INPUT_HINT_COPY);
    window.clearTimeout(inputHintTimeoutRef.current);
    inputHintTimeoutRef.current = window.setTimeout(() => setInputHint(""), INPUT_HINT_DURATION);
  }, []);

  useEffect(() => {
    if (activeArtifactId === "topology-archive-wall" && sdfRenderEnabled && !blackHoleDismissedRef.current) {
      setBlackHoleActive(true);
      return;
    }

    if (activeArtifactId !== "topology-archive-wall") {
      blackHoleDismissedRef.current = false;
      setBlackHoleActive(false);
    }
  }, [activeArtifactId, sdfRenderEnabled]);

  const setAxisPosition = useCallback(
    (nextAxisX) => {
      const next = nextAxisX;
      const nearest = nearestArtifact(artifacts, next, axisRange.length);
      axisRef.current = next;
      setAxisX(next);
      setActiveArtifactId(nearest.id);
    },
    [artifacts, axisRange],
  );

  const setDepthPosition = useCallback((nextDepthZ) => {
    const next = clamp(nextDepthZ, DEPTH_RANGE.min, DEPTH_RANGE.max);
    depthRef.current = next;
    setDepthZ(next);
  }, []);

  const selectArtifact = useCallback(
    (artifactId) => {
      const artifact = artifacts.find((item) => item.id === artifactId);
      if (!artifact) return;
      const nearestCycle = Math.round((axisRef.current - artifact.position[0]) / axisRange.length);
      const nextAxisX = artifact.position[0] + nearestCycle * axisRange.length;
      setActiveArtifactId(artifact.id);
      axisRef.current = nextAxisX;
      setAxisX(nextAxisX);
    },
    [artifacts, axisRange.length],
  );

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const qaArtifact = query.get("qa-artifact");
    if (qaArtifact) selectArtifact(qaArtifact);
  }, [selectArtifact]);

  useEffect(() => {
    axisRef.current = axisX;
  }, [axisX]);

  useEffect(() => {
    depthRef.current = depthZ;
  }, [depthZ]);

  useEffect(() => {
    let raf = 0;
    let previous = performance.now();
    let lastFrame = previous;

    const tick = (now) => {
      const activeInput = pressedKeysRef.current.size > 0;
      const targetFrameMs = activeInput ? ACTIVE_WORLD_FRAME_MS : IDLE_WORLD_FRAME_MS;
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

      if (direction && isWorldVisible(worldRef.current)) {
        const normalized = Math.sign(direction);
        setAxisPosition(axisRef.current + normalized * AXIS_HOLD_SPEED * dt);
        setAxisVelocityState(normalized);
      } else {
        setAxisVelocityState(0);
      }

      if (depthDirection && isWorldVisible(worldRef.current)) {
        const normalizedDepth = Math.sign(depthDirection);
        setDepthPosition(depthRef.current + normalizedDepth * DEPTH_HOLD_SPEED * dt);
        setDepthVelocityState(normalizedDepth);
      } else {
        setDepthVelocityState(0);
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [setAxisPosition, setAxisVelocityState, setDepthPosition, setDepthVelocityState]);

  useEffect(() => {
    const onKeyDown = (event) => {
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
      setAxisVelocityState(0);
      setDepthVelocityState(0);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [setAxisVelocityState, setDepthVelocityState, showInputHint, startExplorationRender]);

  return (
    <section
      className={`igloo-world quality-${quality}`}
      data-axis="horizontal"
      data-moving={Math.abs(axisVelocity) + Math.abs(depthVelocity) > 0 ? "true" : "false"}
      data-project-count={projects?.length || 0}
      data-station-count={stations?.length || 0}
      id="world"
      ref={worldRef}
      data-render-enabled={publicRenderEnabled ? "true" : "false"}
      data-renderer-mode={rendererMode}
      data-seal-awake={sealAwake ? "true" : "false"}
      data-high-contrast={highContrast ? "true" : "false"}
      style={{ "--axis-progress": axisProgress, "--depth-progress": depthProgress }}
    >
      <div className="igloo-poster" aria-hidden="true" />
      <canvas ref={atmosphere} className="igloo-atmosphere-canvas active-theory-veil" aria-hidden="true" />
      {!effectiveSafeMode && sdfRenderEnabled && (
        <GpuErrorBoundary
          onGpuEvent={reportGpuEvent}
          resetKey={`${activeArtifactId}-${quality}-${safeMode ? "safe" : "live"}`}
        >
          <IglooScene
            activeArtifactId={activeArtifactId}
            axisVelocity={axisVelocity}
            axisX={axisX}
            depthVelocity={depthVelocity}
            depthZ={depthZ}
            artifacts={artifacts}
            iglooPulse={iglooPulse}
            moving={Math.abs(axisVelocity) + Math.abs(depthVelocity) > 0}
            onGpuEvent={reportGpuEvent}
            onTouchIgloo={touchIgloo}
            quality={safeMode || reduced ? "low" : quality}
            reducedMotion={reduced}
            renderEnabled={sdfRenderEnabled}
            sealAwake={sealAwake}
            debugFlags={sceneDebugFlags}
          />
        </GpuErrorBoundary>
      )}
      {inputHint && (
        <div className="igloo-input-hint" role="status" aria-live="polite">
          {inputHint}
        </div>
      )}
      <DiagnosticPanel events={gpuDiagnostics} rendererMode={rendererMode} />
      {!sdfRenderEnabled && (
        <SdfSealSplash
          activeArtifact={activeArtifact}
          diagnosticEvents={gpuDiagnostics}
          onEnable={enableRenderer}
          safeMode={safeMode}
        />
      )}
      <IglooHud
        activeArtifact={activeArtifact}
        axisProgress={axisProgress}
        axisVelocity={axisVelocity}
        depthVelocity={depthVelocity}
        artifacts={artifacts}
        content={content}
        liveSummary={liveSummary}
        onSelectArtifact={selectArtifact}
        quality={quality}
        highContrast={highContrast}
        renderEnabled={publicRenderEnabled}
        sealAwake={sealAwake}
        setQuality={setQuality}
        setHighContrast={setHighContrast}
      />
      <BlackHoleTransition
        active={blackHoleActive}
        onClose={() => {
          blackHoleDismissedRef.current = true;
          setBlackHoleActive(false);
        }}
      />
    </section>
  );
}
