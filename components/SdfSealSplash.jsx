"use client";

import { useCallback, useRef, useState } from "react";
import AntarcticSplashShader from "./AntarcticSplashShader";

export const SPLASH_GATE_PROFILE = "black stellar threshold with four phase-negating aurora wave families and one devil-lettuce action";
export const RENDER_PERMISSION_PROFILE = "Start exploring requests fullscreen, wake lock, and WebGL capability inside the user gesture";
export const SPLASH_SUPPORT_PROFILE = "Composite SDF. Opening gate is a pure shader threshold with no mascot layer; the seal enters only after renderer hand-off";
export const OPEN_WORLD_GATE_PROFILE = "best-of-two gate: fullscreen world stream first, horizontal evidence index remains reachable";

function probeWebglCapability() {
  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl2", { antialias: false, failIfMajorPerformanceCaveat: false }) ||
    canvas.getContext("webgl", { antialias: false, failIfMajorPerformanceCaveat: false });
  if (!gl) return "webgl unavailable";
  try {
    const renderer = gl.getParameter(gl.RENDERER) || "renderer hidden";
    const version = gl.getParameter(gl.VERSION) || "webgl";
    return `${version} / ${renderer}`;
  } finally {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.width = 0;
    canvas.height = 0;
  }
}

export default function SdfSealSplash({
  active = true,
  activeArtifact,
  diagnosticEvents = [],
  guideState = "idle",
  onEnable,
  safeMode = false,
}) {
  const [permissionState, setPermissionState] = useState("idle");
  const [permissionRows, setPermissionRows] = useState([]);
  const permissionLockRef = useRef(false);
  const stationName = activeArtifact?.label || "Polar topology station";
  const stationSignal =
    activeArtifact?.signal ||
    "Aether-Lang, QPU kernels, Triton, and source-backed topology systems";
  const visibleDiagnostics = diagnosticEvents.filter((event) => event.type !== "safe-boot").slice(0, 3);
  const statusMessage =
    permissionState === "requesting"
      ? "Requesting fullscreen, wake lock, and renderer access."
      : permissionState === "ready"
        ? "Access resolved. Opening the topology route."
        : safeMode
          ? "Safe route ready. Renderer access begins only on your command."
          : "Polar route ready. Renderer access begins only on your command.";
  const actionLabel =
    permissionState === "requesting"
      ? "Requesting renderer access"
      : permissionState === "ready"
        ? "Route open"
        : "START THE ADVENTURE INTO SEAL'S TOPOLOGICAL LAND";
  const requestRenderAccess = useCallback(async () => {
    if (permissionLockRef.current) return;
    permissionLockRef.current = true;
    setPermissionState("requesting");
    const results = [];

    try {
      if (document.fullscreenElement) {
        results.push("fullscreen already granted");
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
        results.push("fullscreen granted");
      } else {
        results.push("fullscreen unavailable");
      }
    } catch (error) {
      results.push(`fullscreen skipped: ${error?.name || "browser denied"}`);
    }

    try {
      if ("wakeLock" in navigator && navigator.wakeLock?.request) {
        window.__sealTopologyWakeLock = await navigator.wakeLock.request("screen");
        results.push("screen wake lock granted");
      } else {
        results.push("wake lock unavailable");
      }
    } catch (error) {
      results.push(`wake lock skipped: ${error?.name || "browser denied"}`);
    }

    try {
      results.push(probeWebglCapability());
    } catch (error) {
      results.push(`webgl probe failed: ${error?.name || "unknown"}`);
    }

    setPermissionRows(results);
    setPermissionState("ready");
    onEnable?.();
  }, [onEnable]);

  if (!active) return undefined;

  return (
    <div
      className="sdf-seal-splash"
      data-guide-state={guideState}
      data-permission-state={permissionState}
      data-safe-mode={safeMode ? "true" : "false"}
      role="dialog"
      aria-label="Enter Seal's Topology Land"
      aria-modal="true"
    >
      <AntarcticSplashShader active={active} />

      <header className="sdf-splash-copy">
        <span>{stationName} / dawn departure</span>
        <h2>Seal&apos;s Topology Land</h2>
        <p>Follow the seal through a six-axis topology gate into source-backed systems, kernels, and research.</p>
      </header>

      <div
        className="sdf-splash-status"
        id="sdf-renderer-status"
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        <span>{safeMode ? "Safe departure" : "Departure status"}</span>
        <strong>{statusMessage}</strong>
        <small>{stationSignal}</small>
        {(visibleDiagnostics.length > 0 || permissionRows.length > 0) && (
          <ul>
            {visibleDiagnostics.map((event) => (
              <li data-severity={event.severity} key={event.id}>
                <b>{event.type}</b>
                {event.message}
              </li>
            ))}
            {permissionRows.map((row) => (
              <li key={row}>
                <b>{permissionState}</b>
                {row}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sdf-route-action">
        <span aria-hidden="true">01 — topology threshold</span>
        <button
          className="sdf-render-button"
          type="button"
          onClick={requestRenderAccess}
          disabled={permissionState !== "idle"}
          aria-describedby="sdf-renderer-status"
        >
          <span>{actionLabel}</span>
          <i aria-hidden="true" />
        </button>
        <small>Scroll left if boring</small>
      </div>
    </div>
  );
}
