function formatDate(value) {
  if (!value) return "time unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

export default function IglooHud({
  activeArtifact,
  axisProgress,
  axisVelocity,
  artifacts,
  content,
  liveSummary,
  quality,
  setQuality,
}) {
  const latest = liveSummary?.latest?.[0];
  const movingLabel = axisVelocity > 0 ? "eastbound" : axisVelocity < 0 ? "westbound" : "docked";

  return (
    <div className="igloo-hud">
      <div className="igloo-brand">
        <span>quilted polar plane / source-backed research stations</span>
        <strong>Seal's Topology Land</strong>
        <p>
          Start exploring, then pilot the seal with WASD through Teerth's systems,
          topology work, and upstream evidence.
        </p>
      </div>

      <div className="igloo-manifesto">
        <span>////// Manifesto</span>
        <p>{content.profile?.manifesto || "Systems that compile research into working artifacts."}</p>
      </div>

      <nav className="igloo-topnav" aria-label="Igloo world navigation">
        <a href="#projects">Work</a>
        <a href="#archive">Archive</a>
        <a href={content.profile.github}>Contact</a>
      </nav>

      <div className="igloo-controls-hint">
        <span>{axisVelocity !== 0 ? "Exploring the ice world..." : "Use WASD to move the seal"}</span>
        <small>Mouse does not steer the seal</small>
      </div>

      <aside className="igloo-readout igloo-artifact-readout" aria-live="polite">
        <span>
          {activeArtifact.stationProfile?.index || `PORTFOLIO_CO_${String(
            artifacts.findIndex((item) => item.id === activeArtifact.id) + 1,
          ).padStart(2, "0")}`}{" "}
          / {activeArtifact.handle}
        </span>
        <h2>{activeArtifact.label}</h2>
        <p>{activeArtifact.description}</p>
        <small className="igloo-artifact-meta">
          {activeArtifact.topology} / {activeArtifact.betti} / {activeArtifact.homology}
        </small>
      </aside>

      {latest && (
        <a className="igloo-live-strip" href={latest.url || content.profile.github} target="_blank" rel="noreferrer">
          <span>{liveSummary?.sourceMode === "live-github" ? "live upstream radar" : "snapshot radar"}</span>
          <strong>{latest.repo}</strong>
          <small>
            {latest.label} / {formatDate(latest.createdAt)} / probe {movingLabel}
          </small>
          <p>{latest.title}</p>
        </a>
      )}

      <div className="igloo-artifact-list station-profile-rail" aria-label="Artifact selector">
        {artifacts.map((artifact) => (
          <div
            aria-current={artifact.id === activeArtifact.id ? "true" : undefined}
            className="igloo-artifact station-profile-chip"
            data-topology={artifact.topology}
            key={artifact.id}
            style={{ "--station-accent": artifact.accent }}
          >
            <span>{artifact.handle}</span>
            <strong>{artifact.shortLabel}</strong>
            <small>{artifact.betti}</small>
          </div>
        ))}
      </div>

      <div className="igloo-axis-meter" aria-label="Horizontal world axis">
        <span>axis_x</span>
        <div>
          <i style={{ transform: `scaleX(${axisProgress})` }} />
        </div>
        <strong>{String(Math.round(axisProgress * 100)).padStart(2, "0")}%</strong>
      </div>

      <div className="igloo-source">
        <span>source mode</span>
        <strong>{liveSummary.sourceMode}</strong>
        <small>{liveSummary.generatedAt ? `generated ${liveSummary.generatedAt}` : "live radar pending"}</small>
      </div>

      <div className="igloo-controls" aria-label="Graphics quality">
        {["low", "medium", "high"].map((mode) => (
          <button
            aria-pressed={quality === mode}
            key={mode}
            onClick={() => setQuality(mode)}
            type="button"
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}
