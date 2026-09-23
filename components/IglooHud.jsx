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
  // Phone layout is a different information contract, not a narrower desktop:
  // the seal is the interaction, and every panel that covers it is a bug. Both
  // panels below therefore start expanded (the desktop truth, and the one the
  // server renders) and collapse only once a compact viewport is measured.
  const [compact, setCompact] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(true);
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
    const compactQuery = window.matchMedia("(max-width: 720px)");
    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const sync = () => {
      setCompact(compactQuery.matches);
      setCoarsePointer(coarseQuery.matches);
      setEvidenceOpen(!compactQuery.matches);
      setControlsOpen(!compactQuery.matches);
    };
    sync();
    compactQuery.addEventListener("change", sync);
    coarseQuery.addEventListener("change", sync);
    return () => {
      compactQuery.removeEventListener("change", sync);
      coarseQuery.removeEventListener("change", sync);
    };
  }, []);

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

      {/* A phone has no WASD. Touch traversal is dispatch, not piloting: tapping
          a station beacon or a route chip sends the seal there, so the coarse
          copy names the gesture that actually exists. */}
      <div className="igloo-controls-hint" data-input={coarsePointer ? "touch" : "keys"}>
        <span className="hud-technical">
          {coarsePointer
            ? moving
              ? "Seal en route"
              : "Tap a station to send the seal"
            : moving
              ? "WASD pilot active"
              : "Use WASD to move the seal"}
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
          data-evidence-open={evidenceOpen || portalOfferOpen ? "true" : "false"}
          data-station-id={readoutArtifact.id}
          id="active-station-readout"
          key={`${readoutArtifact.id}-${presentation.phase}`}
          /* Same per-station accent the route chips already carry. The readout
             named its station in text but wore no colour from it, so the card
             was the one part of the HUD with no identity at all. */
          style={{ "--station-accent": readoutArtifact.accent }}
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
          {/* The signal line is the strongest single sentence of evidence a
              station has, so it stays in the peek the collapsed phone sheet
              shows rather than hiding behind the disclosure with the prose. */}
          {!portalOfferOpen && (
            <>
            <p className="igloo-artifact-signal hud-technical">
              {showDockedEvidence
                ? activeArtifact.signal
                : "Destination selected. Dock the seal to reveal its evidence."}
            </p>
            {/* The evidence, made reachable. Gated on showDockedEvidence for the same
                reason the signal line is: a station's sources belong to a docked visit,
                not to a destination they merely selected. rel carries noopener because
                these open a new context; noreferrer matches the live strip's pattern. */}
            {showDockedEvidence && activeArtifact.repos?.length ? (
              <ul className="igloo-artifact-repos">
                {activeArtifact.repos.map((repo) => (
                  <li key={repo.url}>
                    <a
                      className="igloo-repo-link"
                      href={repo.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {repo.name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            </>
          )}
          {compact && !portalOfferOpen && (
            <button
              aria-controls="active-station-readout"
              aria-expanded={evidenceOpen}
              className="igloo-evidence-toggle"
              onClick={() => setEvidenceOpen((value) => !value)}
              type="button"
            >
              {evidenceOpen ? "Hide station evidence" : "Show station evidence"}
            </button>
          )}
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
              <p>{activeArtifact.description}</p>
              <small className="igloo-artifact-meta hud-technical">
                {activeArtifact.topology} / {activeArtifact.betti} / {activeArtifact.homology}
              </small>
            </>
          ) : null}
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

      {/* Renderer tier is a QA affordance that had reflowed onto the most
          valuable band of a phone screen. It stays a first-class control, but
          on a compact viewport it costs one 44px chip at rest instead of a
          four-button strip across the top of the world. */}
      {compact && (
        <button
          aria-controls="igloo-graphics-controls"
          aria-expanded={controlsOpen}
          aria-label="Graphics quality and contrast settings"
          className="igloo-controls-toggle"
          onClick={() => setControlsOpen((value) => !value)}
          type="button"
        >
          display
        </button>
      )}
      <fieldset className="igloo-controls"
        data-open={controlsOpen ? "true" : "false"}
        id="igloo-graphics-controls"
      >
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
