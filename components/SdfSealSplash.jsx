"use client";

import { useEffect, useMemo, useState } from "react";

export const SPLASH_GATE_PROFILE = "premium object poster for the igloo render gate";

export default function SdfSealSplash({
  activeArtifact,
  diagnosticEvents = [],
  onEnable,
  safeExitHref = "/?qa-sdf=1&qa-low=1#world",
  safeMode = false,
}) {
  const [charge, setCharge] = useState(0);
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
      safeMode ? "GPU probe scheduled" : "WebGL renderer waiting",
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

  return (
    <div className="sdf-seal-splash" role="dialog" aria-label="SDF seal renderer gate" aria-modal="true">
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
        <strong>{stationSignal}</strong>
      </div>

      {safeMode ? (
        <a
          className="sdf-render-button"
          href={safeExitHref}
          onClick={(event) => {
            event.preventDefault();
            onEnable();
          }}
        >
          <span>Start exploring</span>
          <i style={{ transform: `scaleX(${Math.max(0.08, charge)})` }} />
        </a>
      ) : (
        <button className="sdf-render-button" type="button" onClick={onEnable}>
          <span>Start exploring</span>
          <i style={{ transform: `scaleX(${Math.max(0.08, charge)})` }} />
        </button>
      )}
    </div>
  );
}
