import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [hud, world, radar, archive, styles] = await Promise.all([
  read("components/IglooHud.jsx"),
  read("components/IglooWorld.jsx"),
  read("components/LiveRadar.jsx"),
  read("components/EvidenceArchive.jsx"),
  read("app/globals.css"),
]);

const requires = (source, pattern, message) =>
  assert.match(source, pattern, message);

requires(hud, /igloo-route-sheet[\s\S]{0,100}is-portal-offer/, "archive consent must expand the edge route sheet instead of clipping inside evidence copy");
requires(hud, /className="igloo-artifact-list station-profile-rail"[\s\S]*ref=\{stationRailRef\}/, "station rail must have a scroll authority ref");
requires(hud, /button\.offsetLeft[\s\S]*rail\.clientWidth[\s\S]*rail\.scrollTo/, "active station must be centered without document scrolling");
requires(hud, /\[focusedStationId,\s*presentation\.phase,\s*reducedMotion\]/, "destination and arrival changes must both re-center the station rail");
requires(hud, /behavior:\s*reducedMotion\s*\?\s*"auto"\s*:\s*"smooth"/, "station centering must honor reduced motion");
requires(hud, /ArrowLeft[\s\S]*ArrowRight[\s\S]*Home[\s\S]*End/, "station route must support arrow, Home, and End keys");
requires(hud, /<fieldset className="igloo-controls"/, "graphics controls must use a labelled fieldset");
requires(hud, /<legend className="hud-sr-only">Graphics quality and contrast<\/legend>/, "graphics controls need an accessible legend");
requires(hud, /aria-controls="active-station-readout"/, "station chips must identify the readout they update");
requires(hud, /id="active-station-readout"/, "station readout must expose a stable accessible id");
assert.doesNotMatch(
  hud,
  /generated \$\{liveSummary\.generatedAt\}/,
  "volatile fetch timestamps must not render verbatim across the server/client hydration boundary",
);
requires(
  hud,
  /generated \$\{formatDate\(liveSummary\.generatedAt\)\}/,
  "source freshness must use the hydration-stable UTC date formatter",
);
requires(hud, /className="igloo-route-status/, "HUD must expose a route title distinct from docked evidence");
requires(hud, /EN ROUTE →/, "moving and docking phases must name the selected destination");
requires(hud, /data-route-phase=\{presentation\.phase\}/, "source radar must consume the canonical route phase");
requires(hud, /aria-current=\{[\s\S]{0,120}artifact\.id === presentation\.dockedStationId/, "rail location must follow earned docking");
requires(hud, /data-portal-offer="archive"/, "Topology arrival must expose an explicit archive offer");
requires(hud, /Enter the topology archive/, "archive offer must ask for explicit topology consent");
requires(hud, /Stay in the polar world/, "archive offer must preserve the polar-world branch");
requires(hud, /className="igloo-portal-fold"/, "archive offer must read as an intentional spatial fold");
requires(hud, /onConfirmArchivePortal/, "archive portal must have a distinct confirm action");
requires(hud, /onCancelArchivePortal/, "archive portal offer must be cancellable");
requires(styles, /\.igloo-route-sheet\.is-portal-offer[\s\S]{0,500}max-height:/, "archive consent sheet must reserve enough height for both actions");
requires(styles, /\.igloo-portal-offer-actions[\s\S]{0,500}min-height:\s*44px/, "archive consent actions must remain visible 44px targets");
requires(hud, /const showDockedEvidence = presentation\.isArrived/, "plaque evidence must be gated by earned arrival");
requires(hud, /showDockedEvidence \? \([\s\S]*activeArtifact\.description/, "docked metadata must not persist while routing");
assert.doesNotMatch(hud, /className="igloo-axis-meter/, "hero HUD must not carry a traverse-progress meter");
requires(hud, /const UPSTREAM_EVIDENCE_STATION_ID = "upstream-radio-mast";/, "live evidence strip must key off the upstream radio mast radar");
requires(hud, /data-signal-state=\{upstreamSignalReceived \? "received" : "hidden"\}/, "live evidence strip must stay hidden until upstream radar contact");
requires(hud, /aria-live="polite"[\s\S]{0,120}className="igloo-live-strip"/, "live evidence strip must announce as a polite received message");
requires(hud, /attributeFilter: \["data-docked-station", "data-proximity-station"\]/, "upstream radar contact must be read from the canonical world data attributes");
requires(styles, /\.igloo-live-strip\[data-signal-state="hidden"\]\s*\{\s*display:\s*none;/, "hidden evidence strip must leave layout and the accessibility tree");
requires(styles, /@keyframes igloo-live-strip-pop/, "evidence strip must pop in like a received message");
requires(styles, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.igloo-live-strip\[data-signal-state="received"\]\s*\{\s*animation:\s*none;/, "evidence strip pop must appear instantly under reduced motion");

requires(world, /deriveTraversalPresentation/, "world must derive one canonical presentation snapshot");
requires(world, /data-presentation-destination/, "destination semantics must remain browser-inspectable");
requires(world, /data-presentation-docked/, "earned docking semantics must remain browser-inspectable");
requires(world, /data-presentation-nearest/, "nearest-station semantics must remain browser-inspectable");
requires(world, /data-presentation-phase/, "phase semantics must remain browser-inspectable");
requires(world, /data-seal-halo-station/, "seal halo identity must be traceable to presentation intent");
requires(world, /earnedDockedStationIdRef/, "earned evidence docking must remain distinct from live contact");
requires(world, /selectedDestinationIdRef/, "selected destination must survive controller route completion");
requires(world, /activeArtifactId=\{intentArtifact\.id\}/, "camera and seal halo must use presentation intent");
requires(world, /activeArtifact=\{evidenceArtifact\}/, "HUD evidence must use the last earned presentation dock");
requires(world, /presentation=\{traversalPresentation\}/, "HUD must receive the canonical snapshot intact");
requires(world, /setArchivePortalOfferOpen\(true\)/, "Topology arrival may offer the archive portal");
requires(world, /confirmArchivePortal[\s\S]*setBlackHoleActive\(true\)/, "only explicit confirmation may open the portal");
requires(world, /selectArtifact[\s\S]*setBlackHoleActive\(false\)/, "normal station routing, including Tooling, must close the portal");
assert.doesNotMatch(world, /route \{percent\}%/, "center loading state must not print route progress over the hero object");
assert.doesNotMatch(
  world,
  /activeArtifactId\s*===\s*"topology-archive-wall"[\s\S]{0,240}setBlackHoleActive\(true\)/,
  "station proximity or active-artifact state must never auto-open the archive portal",
);
requires(world, /const SEAL_ROUTE_HINT_INTERVAL_MS = 15000;/, "seal route hints must remain sparse at a 15-second cadence");
requires(world, /const SEAL_ROUTE_HINT_VISIBLE_MS = 3800;/, "seal route hints must clear after the authored 3.8-second window");
requires(
  world,
  /!sdfRenderEnabled[\s\S]{0,240}!worldPresentationActive[\s\S]{0,240}!traversalPresentation\.isArrived[\s\S]{0,240}archivePortalOfferOpen/,
  "seal route hints must be suppressed while moving, portal-active, renderer-disabled, or offscreen",
);
requires(world, /setInterval\([\s\S]{0,120}showHint[\s\S]{0,120}SEAL_ROUTE_HINT_INTERVAL_MS/, "seal route hint cadence must use the named interval budget");
requires(world, /setTimeout\([\s\S]{0,120}setSealRouteHint\(""\)[\s\S]{0,120}SEAL_ROUTE_HINT_VISIBLE_MS/, "seal route hint cleanup must use the named visibility budget");
requires(world, /sealRouteHintDirectionRef\.current = direction \* -1;/, "seal route hints must alternate neighboring directions");
requires(world, /`Swim to \$\{nextArtifact/, "desktop route hints must stay heading-neutral under the chase camera");
requires(world, /\(pointer: coarse\)[\s\S]{0,180}`Tap the \$\{nextArtifact/, "coarse-pointer hints must use composed tap language");
requires(world, /className="seal-navigation-bubble" role="status" aria-live="polite"/, "seal route hints must be exposed as a polite status without stealing focus");

requires(archive, /^"use client";/, "evidence archive tabs need client-side progressive disclosure");
requires(archive, /role="tablist"/, "evidence archive must expose an accessible tablist");
requires(archive, /aria-selected=\{activePanel === panel\.id\}/, "evidence tab selection must be announced");
requires(archive, /role="tabpanel"/, "only the selected evidence panel must be rendered as a tabpanel");
requires(archive, /EVIDENCE_PANELS\[activePanel\]/, "archive must render one evidence panel at a time");
requires(archive, /className="domain-donut"[\s\S]{0,120}role="img"/, "the domain distribution chart must be exposed as a single labelled image");
requires(archive, /aria-label=\{`Domain distribution donut/, "the domain donut must summarise its distribution for screen readers");
requires(archive, /<ul className="domain-legend">/, "domain counts must stay readable text in a legend, not colour alone");

requires(radar, /data-source-mode=\{sourceMode\}/, "radar must publish its live or snapshot source mode");
requires(radar, /Public GitHub activity for/, "radar must state whose public API activity is shown");
requires(radar, /radar-empty/, "radar must have an honest empty state");

assert.doesNotMatch(styles, /\.igloo-atmosphere-canvas/, "removed atmosphere canvas must not retain CSS");
requires(styles, /HUD ACCESSIBILITY RESCUE/, "HUD accessibility rules must be intentionally scoped");
requires(styles, /\.station-profile-chip[\s\S]*min-height:\s*44px/, "station chips must meet the 44px target floor");
requires(styles, /\.igloo-controls button[\s\S]*min-height:\s*44px/, "quality controls must meet the 44px target floor");
requires(styles, /\.igloo-topnav a[\s\S]*min-height:\s*44px/, "world navigation must meet the 44px target floor");
requires(styles, /\.igloo-readout > p:not\(\.igloo-artifact-signal\)[\s\S]*font-size:\s*1rem/, "visible station body copy must be at least 16px");
requires(styles, /\.hud-technical[\s\S]*font-size:\s*0\.75rem/, "technical HUD metadata must be at least 12px");
requires(styles, /@media \(max-width:\s*720px\)[\s\S]*\.igloo-route-sheet[\s\S]*position:\s*absolute[\s\S]*bottom:/, "mobile station routing must become a bottom sheet");
requires(styles, /scroll-padding-inline:\s*calc\(50% - 56px\)/, "station rail must reserve centering room at every width");
requires(styles, /\.hud-focus-ring:focus-visible|\.igloo-hud :is\(a, button\):focus-visible/, "HUD focus must remain visibly keyboard traceable");
requires(styles, /\.seal-navigation-bubble[\s\S]{0,700}pointer-events:\s*none/, "seal route hints must remain non-modal and pointer transparent");
requires(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]{0,120}\.seal-navigation-bubble[\s\S]{0,80}animation:\s*none/, "seal route hint arrival animation must stop under reduced motion");

console.log("HUD accessibility contract passed.");
