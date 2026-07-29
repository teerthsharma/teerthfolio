import { useEffect, useRef, useState } from "react";

export const QUIET_BRIGHT_HUD_PROFILE =
  "quiet bright paper glass with identity, archive access, station evidence, and graphics controls";

const UPSTREAM_EVIDENCE_STATION_ID = "upstream-radio-mast";

function formatDate(value) {
  if (!value) return "time unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

export default function IglooHud({
  activeArtifact,
  artifacts,
  content,
  highContrast,
  liveSummary,
  onCancelArchivePortal,
  onConfirmArchivePortal,
  onSelectArtifact,
  portalOfferOpen,
  presentation,
  quality,
  reducedMotion,
  renderEnabled,
  sealAwake,
  setHighContrast,
  setQuality,
}) {
  const stationButtonsRef = useRef(new Map());
  const stationRailRef = useRef(null);
  const hudRef = useRef(null);
  const [radioContact, setRadioContact] = useState({
    docked: "none",
    proximity: "none",
  });
  const latest = liveSummary?.latest?.[0];
  const moving = ["moving", "docking"].includes(presentation.phase);
  const worldActive = renderEnabled && sealAwake;
  const destinationArtifact =
    artifacts.find((artifact) => artifact.id === presentation.destinationId) ||
    artifacts.find((artifact) => artifact.id === presentation.nearestStationId) ||
    activeArtifact;
  const focusedStationId =
    presentation.dockedStationId ||
    presentation.destinationId ||
    presentation.nearestStationId ||
    activeArtifact.id;
  const routeStatus = presentation.isArrived
    ? `ARRIVED • ${activeArtifact.shortLabel}`
    : presentation.destinationId
      ? `EN ROUTE → ${destinationArtifact.shortLabel}`
      : `EXPLORING → ${destinationArtifact.shortLabel}`;
  const showDockedEvidence = presentation.isArrived;
  const readoutArtifact = showDockedEvidence ? activeArtifact : destinationArtifact;

  useEffect(() => {
    const world =
      hudRef.current?.closest("section.igloo-world") ||
      document.getElementById("world");
    if (!world) return undefined;
    const readRadioContact = () => {
      setRadioContact((current) => {
        const next = {
          docked: world.getAttribute("data-docked-station") || "none",
          proximity: world.getAttribute("data-proximity-station") || "none",
        };
        return current.docked === next.docked &&
          current.proximity === next.proximity
          ? current
          : next;
      });
    };
    readRadioContact();
    const observer = new MutationObserver(readRadioContact);
    observer.observe(world, {
      attributeFilter: ["data-docked-station", "data-proximity-station"],
      attributes: true,
    });
    return () => observer.disconnect();
  }, []);

  const upstreamSignalReceived =
    radioContact.proximity === UPSTREAM_EVIDENCE_STATION_ID ||
    radioContact.docked === UPSTREAM_EVIDENCE_STATION_ID ||
    presentation.dockedStationId === UPSTREAM_EVIDENCE_STATION_ID;

  useEffect(() => {
    const rail = stationRailRef.current;
    const button = stationButtonsRef.current.get(focusedStationId);
    if (!rail || !button) return;
    const left = button.offsetLeft - (rail.clientWidth - button.offsetWidth) / 2;
    rail.scrollTo({
      left: Math.max(0, left),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [focusedStationId, presentation.phase, reducedMotion]);

  const handleStationKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const currentId = event.target?.dataset?.stationId || focusedStationId;
    const currentIndex = Math.max(
      0,
      artifacts.findIndex((artifact) => artifact.id === currentId),
    );
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? artifacts.length - 1
          : event.key === "ArrowLeft"
            ? (currentIndex - 1 + artifacts.length) % artifacts.length
            : (currentIndex + 1) % artifacts.length;
    const nextArtifact = artifacts[nextIndex];
    if (!nextArtifact) return;
    event.preventDefault();
    stationButtonsRef.current.get(nextArtifact.id)?.focus();
    onSelectArtifact?.(nextArtifact.id);
  };

  return (
    <div className="igloo-hud" ref={hudRef}>
      <div className="igloo-brand">
        <span className="hud-technical">bright polar field / source-backed research stations</span>
        <strong>{"Seal's Topology Land"}</strong>
        <p>
          {worldActive
            ? "Drive the seal with WASD between glowing station docks; tap a dock to open source evidence."
            : "Press Start exploring, then drive the seal between station docks across the topology plane."}
        </p>
      </div>

      <div className="igloo-manifesto">
        <span className="hud-technical">////// Manifesto</span>
        <p>
          {content.profile?.manifesto ||
            "Topology is the operating system: kernels, ML fields, QPU proof, and upstream code compiled into one polar machine."}
        </p>
      </div>

      <nav className="igloo-topnav" aria-label="Igloo world navigation">
        <a href="#projects">Work</a>
        <a href="#archive">Archive</a>
        <a href={content.profile.github}>Contact</a>
      </nav>

      <div className="igloo-controls-hint">
        <span className="hud-technical">
          {moving ? "WASD pilot active" : "Use WASD to move the seal"}
        </span>
        <small className="hud-technical">Dock at glowing stations</small>
      </div>

      <section
        className={`igloo-route-sheet${portalOfferOpen ? " is-portal-offer" : ""}`}
        aria-label="Antarctic station route"
      >
        <aside
          aria-atomic="true"
          aria-label={
            showDockedEvidence
              ? `${activeArtifact.label}. ${activeArtifact.signal}. ${activeArtifact.description}`
              : `${routeStatus}. Destination ${readoutArtifact.label}.`
          }
          aria-live="polite"
          className="igloo-readout igloo-artifact-readout"
          data-station-id={readoutArtifact.id}
          id="active-station-readout"
          key={`${readoutArtifact.id}-${presentation.phase}`}
        >
          <span
            className="igloo-route-status hud-technical"
            data-route-phase={presentation.phase}
          >
            {routeStatus}
          </span>
          <span className="hud-technical">
            {readoutArtifact.stationProfile?.index || `PORTFOLIO_CO_${String(
              artifacts.findIndex((item) => item.id === readoutArtifact.id) + 1,
            ).padStart(2, "0")}`} {" "}
            / {readoutArtifact.handle}
          </span>
          <h2>{readoutArtifact.label}</h2>
          {portalOfferOpen ? (
            <div
              aria-labelledby="archive-portal-offer-title"
              aria-live="polite"
              className="igloo-portal-offer"
              data-portal-offer="archive"
              role="dialog"
            >
              <span className="hud-technical">
                seal guide / topology threshold
              </span>
              <span aria-hidden="true" className="igloo-portal-fold" />
              <strong id="archive-portal-offer-title">
                Enter the topology archive
              </strong>
              <p>
                The seal has docked at Topology. Cross the spatial fold, or
                stay with the research stations.
              </p>
              <div className="igloo-portal-offer-actions">
                <button
                  onClick={onConfirmArchivePortal}
                  type="button"
                >
                  Enter the topology archive
                </button>
                <button
                  onClick={onCancelArchivePortal}
                  type="button"
                >
                  Stay in the polar world
                </button>
              </div>
            </div>
          ) : showDockedEvidence ? (
            <>
              <p className="igloo-artifact-signal hud-technical">
                {activeArtifact.signal}
              </p>
              <p>{activeArtifact.description}</p>
              <small className="igloo-artifact-meta hud-technical">
                {activeArtifact.topology} / {activeArtifact.betti} / {activeArtifact.homology}
              </small>
            </>
          ) : (
            <p className="igloo-artifact-signal hud-technical">
              Destination selected. Dock the seal to reveal its source-backed evidence.
            </p>
          )}
        </aside>

        <nav
          aria-label="Choose a station destination"
          className="igloo-artifact-list station-profile-rail"
          onKeyDown={handleStationKeyDown}
          ref={stationRailRef}
        >
          {artifacts.map((artifact) => (
            <button
              aria-controls="active-station-readout"
              aria-current={
                artifact.id === presentation.dockedStationId
                  ? "location"
                  : undefined
              }
              aria-label={`${artifact.shortLabel}: ${artifact.signal}`}
              aria-pressed={artifact.id === focusedStationId}
              className="igloo-artifact station-profile-chip"
              data-active={
                artifact.id === presentation.dockedStationId ? "true" : "false"
              }
              data-destination={
                artifact.id === presentation.destinationId ? "true" : "false"
              }
              data-station-id={artifact.id}
              data-topology={artifact.topology}
              key={artifact.id}
              onClick={() => onSelectArtifact?.(artifact.id)}
              ref={(node) => {
                if (node) stationButtonsRef.current.set(artifact.id, node);
                else stationButtonsRef.current.delete(artifact.id);
              }}
              style={{ "--station-accent": artifact.accent }}
              type="button"
            >
              <span>{artifact.stationProfile?.index || artifact.handle}</span>
              <strong>{artifact.shortLabel}</strong>
              <small>{artifact.betti}</small>
            </button>
          ))}
        </nav>
      </section>

      <a
        aria-label={`Public source ${latest ? `evidence from ${latest.repo}` : "profile"}`}
        aria-live="polite"
        aria-atomic="true"
        className="igloo-live-strip"
        data-evidence-signal={liveSummary?.sourceMode || "research-snapshot"}
        data-signal-state={upstreamSignalReceived ? "received" : "hidden"}
        href={latest?.url || content.profile.github}
        target="_blank"
        rel="noreferrer"
      >
        <span className="hud-technical">
          {liveSummary?.sourceMode === "live-github" ? "live GitHub API" : "research snapshot"}
        </span>
        <strong>{latest?.repo || `@${liveSummary?.profile?.login || "teerthsharma"}`}</strong>
        <small className="hud-technical">
          {latest ? `${latest.label} / ${formatDate(latest.createdAt)}` : "public profile"} / {presentation.phase}
        </small>
        <span className="hud-technical" data-route-phase={presentation.phase}>
          {routeStatus}
        </span>
        <p>{latest?.title || "Open the public GitHub source."}</p>
      </a>

      <div className="igloo-source hud-technical">
        <span>source mode</span>
        <strong>{liveSummary?.sourceMode || "research-snapshot"}</strong>
        <small>
          {liveSummary?.generatedAt
            ? `generated ${formatDate(liveSummary.generatedAt)}`
            : "live radar pending"}
        </small>
      </div>

      <fieldset className="igloo-controls">
        <legend className="hud-sr-only">Graphics quality and contrast</legend>
        {["low", "medium", "high"].map((mode) => (
          <button
            aria-label={`Use ${mode} graphics quality`}
            aria-pressed={quality === mode}
            key={mode}
            onClick={() => setQuality(mode)}
            type="button"
          >
            {mode}
          </button>
        ))}
        <button
          aria-pressed={highContrast}
          className="igloo-contrast-toggle"
          onClick={() => setHighContrast?.((value) => !value)}
          type="button"
        >
          contrast
        </button>
      </fieldset>
    </div>
  );
}
