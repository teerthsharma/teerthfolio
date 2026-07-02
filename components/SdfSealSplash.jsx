"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AntarcticSplashShader from "./AntarcticSplashShader";

export const SPLASH_GATE_PROFILE = "premium object poster for the igloo render gate with WebGL Antarctic shader";
export const RENDER_PERMISSION_PROFILE = "Start exploring requests fullscreen, wake lock, and WebGL capability inside the user gesture";

function probeWebglCapability() {
  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl2", { antialias: false, failIfMajorPerformanceCaveat: false }) ||
    canvas.getContext("webgl", { antialias: false, failIfMajorPerformanceCaveat: false });
  if (!gl) return "webgl unavailable";
  const renderer = gl.getParameter(gl.RENDERER) || "renderer hidden";
  const version = gl.getParameter(gl.VERSION) || "webgl";
  return `${version} / ${renderer}`;
}

export default function SdfSealSplash({
  activeArtifact,
  diagnosticEvents = [],
  onEnable,
  safeMode = false,
}) {
  const [charge, setCharge] = useState(0);
  const [permissionRows, setPermissionRows] = useState([]);
  const [permissionState, setPermissionState] = useState("idle");
  const permissionLockRef = useRef(false);
  const stationName = activeArtifact?.label || "Observatory Plaque";
  const stationSignal = activeArtifact?.signal || "source-backed topology systems";
  const domeTiles = useMemo(() => {
    const rows = [
      { count: 4, y: 20, width: 8 },
      { count: 6, y: 33, width: 9 },
      { count: 7, y: 47, width: 10 },
      { count: 8, y: 61, width: 10 },
      { count: 7, y: 74, width: 11 },
    ];

    return rows.flatMap((row, rowIndex) =>
      Array.from({ length: row.count }, (_, col) => {
        const spread = row.count === 1 ? 0 : 58 / (row.count - 1);
        const rowOffset = rowIndex % 2 === 0 ? 0 : spread * 0.34;
        return {
          key: `${rowIndex}-${col}`,
          x: 21 + col * spread + rowOffset * 0.22,
          y: row.y,
          width: row.width,
          rotate: -5 + ((col + rowIndex) % 5) * 2.5,
        };
      }),
    );
  }, []);
  const rows = useMemo(
    () => [
      safeMode ? "safe boot mounted" : "Dome PBR shell staged",
      "Composite SDF mascot parked",
      "topology profile rail idle",
      safeMode ? "GPU probe waiting for Start exploring" : "WebGL renderer waiting",
    ],
    [safeMode],
  );
  const visibleDiagnostics = diagnosticEvents.slice(0, 3);

  useEffect(() => {
    let raf = 0;
    const startedAt = performance.now();

    const tick = (now) => {
      setCharge(Math.min(1, (now - startedAt) / 1400));
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

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

  return (
    <div className="sdf-seal-splash" role="dialog" aria-label="SDF seal renderer gate" aria-modal="true">
      <AntarcticSplashShader />
      <div className="sdf-splash-copy">
        <span>render gate / {stationName}</span>
        <h2>Seal's Topology Land</h2>
        <p>
          The ice home base is staged without the heavy renderer. Start exploring to allocate the
          field, then press WASD to release the seal across the horizontal topology plane.
        </p>
      </div>

      <div className="sdf-splash-art" aria-hidden="true">
        <em className="sdf-art-orbit sdf-art-orbit-a" />
        <em className="sdf-art-orbit sdf-art-orbit-b" />
        <em className="sdf-art-orbit sdf-art-orbit-c" />
        <div className="sdf-art-dome">
          <em className="sdf-dome-shell" />
          {domeTiles.map((tile) => (
            <b
              className="sdf-dome-tile"
              key={tile.key}
              style={{
                "--tile-x": `${tile.x}%`,
                "--tile-y": `${tile.y}%`,
                "--tile-w": `${tile.width}%`,
                "--tile-rot": `${tile.rotate}deg`,
              }}
            />
          ))}
          <em className="sdf-dome-meridian sdf-dome-meridian-a" />
          <em className="sdf-dome-meridian sdf-dome-meridian-b" />
          <em className="sdf-dome-meridian sdf-dome-meridian-c" />
        </div>
        <div className="sdf-art-threshold">
          <em />
          <em />
          <strong>field renderer idle</strong>
        </div>
        <div className="sdf-seal-proof">
          <span>composite sdf</span>
          <strong>F(p) &lt;= 0</strong>
          <p>Ellipsoid body, head sphere, and flipper fields blend into one navigable seal surface.</p>
        </div>
        <div className="sdf-collision-bridge">
          <span>collision bridge</span>
          <strong>grad F -&gt; impulse</strong>
          <p>Continuous topology yields normals for discrete ice blocks, crates, and station contact.</p>
        </div>
      </div>

      <div className="sdf-splash-console" aria-label="Renderer status">
        {rows.map((row, index) => (
          <p key={row}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {row}
          </p>
        ))}
        {visibleDiagnostics.map((event) => (
          <p data-severity={event.severity} key={event.id}>
            <span>{event.type}</span>
            {event.message}
          </p>
        ))}
        {permissionRows.map((row) => (
          <p key={row}>
            <span>{permissionState}</span>
            {row}
          </p>
        ))}
        <strong>{stationSignal}</strong>
      </div>

      {safeMode ? (
        <button className="sdf-render-button" type="button" onClick={requestRenderAccess}>
          <span>{permissionState === "requesting" ? "Requesting renderer access" : "Start exploring"}</span>
          <i style={{ transform: `scaleX(${Math.max(0.08, charge)})` }} />
        </button>
      ) : (
        <button className="sdf-render-button" type="button" onClick={requestRenderAccess}>
          <span>{permissionState === "requesting" ? "Requesting renderer access" : "Start exploring"}</span>
          <i style={{ transform: `scaleX(${Math.max(0.08, charge)})` }} />
        </button>
      )}
    </div>
  );
}
