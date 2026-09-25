"use client";

// Everything drawn in HTML over the world: the top bar, the intro card, the
// "you are at a building" prompt, the minimap, a district toast, the project
// panel, and the full list (which is also the no-WebGL fallback, so every
// project is reachable without the game). Stacking order matters here and
// mirrors the DOM order below: the curtain sits under everything, the
// minimap under the sheets (so an open panel or list covers it), and the
// list sheet sits under the panel sheet so the panel wins when both show at
// once in fallback mode.
//
// Every word on a card comes from a place's own fields (lib/world/places.js,
// copied verbatim from data/showcase.json) — this file only supplies chrome
// copy ("How it was checked", "Result", nav labels), never a project claim,
// a name or a number.

import { useEffect, useRef, useState } from "react";
import showcase from "../../data/showcase.json" with { type: "json" };
import { PLACE_BY_ID, PLACES, PROFILE, districtAt, dockPoint } from "../../lib/world/places";
import { getUi, live, setUi, useUi } from "../../lib/world/store";
import Minimap from "./ui/Minimap";
import MoveCoach from "./ui/MoveCoach";
import Sheet from "./ui/Sheet";
import { IconArrow, IconCheck, IconChevron, IconSoundOff, IconSoundOn, IconTrefoil } from "./ui/icons";

const UPSTREAM = PLACES.filter((p) => p.section === "upstream");
const LAB = PLACES.filter((p) => p.section === "lab");
// One logo per org, in landing rank order (the order UPSTREAM already carries).
const UPSTREAM_LOGOS = [...new Set(UPSTREAM.map((p) => p.logo))].filter(Boolean);

// Every caller that wants the seal to travel to a building goes through this,
// so the no-WebGL fallback (no seal to send anywhere) only needs one guard.
function sendTo(place) {
  if (getUi().failed) return setUi({ open: place.id, list: true });
  const dock = dockPoint(place);
  live.target = { x: dock.x, z: dock.z };
  live.pendingOpen = place.id;
  setUi({ list: false, open: null, started: true });
}

// How often (ms) the banner samples the seal's real position against the
// district circles (lib/world/places.js districtAt): an area announcement is
// a once-in-a-while event, not a per-frame one, so a timer beats a render
// loop. Two consecutive polls must agree on the same district before it
// switches, so walking a boundary doesn't flicker it.
const BANNER_POLL = 300;
const BANNER_HOLD = 2800; // ms the banner stays up
const BANNER_COOLDOWN = 20000; // ms before the same district can announce again

function useDistrictBanner(active) {
  const [district, setDistrict] = useState(null);
  const pendingId = useRef(undefined);
  const shownId = useRef(null);
  const lastShown = useRef(new Map());
  const hideTimer = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => {
      if (getUi().open || getUi().list) return;
      const seal = live.seal;
      const d = districtAt(seal.x, seal.z);
      const nextId = d?.id ?? null;
      if (nextId !== pendingId.current) {
        pendingId.current = nextId;
        return; // wait for the next poll to confirm
      }
      if (nextId === shownId.current) return;
      shownId.current = nextId;
      clearTimeout(hideTimer.current);
      if (!nextId) {
        setDistrict(null);
        return;
      }
      const now = Date.now();
      const last = lastShown.current.get(nextId);
      if (last && now - last < BANNER_COOLDOWN) return;
      lastShown.current.set(nextId, now);
      setDistrict(d);
      hideTimer.current = setTimeout(() => setDistrict(null), BANNER_HOLD);
    }, BANNER_POLL);
    return () => {
      clearInterval(id);
      clearTimeout(hideTimer.current);
    };
  }, [active]);

  return district;
}

function Curtain({ ready }) {
  return <div className="hud-curtain" data-ready={ready} aria-hidden="true" />;
}

// A district's arrival, announced big: its name, then every upstream
// contribution inside it (logo, verbatim repo #PR, verbatim headline) — or,
// for a lab building's own radioactive area, its tagline and a trefoil.
// Never explanatory text: the world shows what the trefoil means, this
// doesn't spell it out. Suppressed while a sheet is open.
function DistrictBanner({ district: current, open, list }) {
  const show = Boolean(current) && !open && !list;
  // Keep the last district after the hook clears it, so its words fade out
  // with the plate instead of vanishing and leaving a blank smear.
  const [district, setDistrict] = useState(current);
  if (current && current !== district) setDistrict(current);
  const labPlace = district && PLACE_BY_ID[district.id]?.section === "lab" ? PLACE_BY_ID[district.id] : null;
  // Rows come from the district, not from `show`, so the words stay on screen
  // while the banner fades out together with its plate.
  const rows =
    district && !labPlace ? PLACES.filter((p) => p.section === "upstream" && p.district?.id === district.id) : null;
  // While the banner is up, the floating place labels step back so the two
  // never print over each other (the owner's screenshot: "the text overlaps").
  useEffect(() => {
    const root = document.documentElement;
    if (show) root.dataset.banner = "on";
    else delete root.dataset.banner;
    return () => {
      delete root.dataset.banner;
    };
  }, [show]);
  return (
    <div
      className="hud-banner"
      data-state={show ? "open" : "closed"}
      style={district ? { "--accent": district.radiation ?? district.color } : undefined}
      aria-live="polite"
    >
      {district && (
        <>
          <span className="hud-banner-band" aria-hidden="true" />
          <h2 className="hud-banner-name">{district.name}</h2>
          {labPlace ? (
            <p className="hud-banner-lab">
              <IconTrefoil className="hud-banner-trefoil" />
              {labPlace.tagline}
            </p>
          ) : (
            <ul className="hud-banner-rows">
              {rows.map((p) => (
                <li key={p.id}>
                  {p.logo && <img className="hud-banner-logo" src={p.logo} alt="" width="28" height="28" />}
                  <span className="hud-banner-repo">
                    {p.repo} #{p.pr}
                  </span>
                  <span className="hud-banner-headline">{p.headline}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function TopBar({ list, sound, failed }) {
  function toggleSound() {
    const next = !sound;
    setUi({ sound: next });
    try {
      localStorage.setItem("seal:sound", next ? "1" : "0");
    } catch {
      /* private mode, storage full, or disabled — sound still toggles for this visit */
    }
  }
  return (
    <header className="hud-top">
      <div className="hud-top-left">
        <a className="hud-mark chip" href={PROFILE.site} aria-label={PROFILE.name}>
          <span className="hud-mark-mono" aria-hidden="true">TS</span>
          <span className="hud-mark-full" aria-hidden="true">
            <strong>{PROFILE.name}</strong>
            <span className="hud-mark-sub">{PROFILE.title}</span>
          </span>
        </a>
      </div>
      <nav className="hud-nav">
        <button type="button" aria-expanded={list || failed} onClick={() => setUi({ list: true, open: null })}>
          Projects
        </button>
        <button type="button" onClick={() => sendTo(PLACE_BY_ID.home)}>
          About
        </button>
        <a href={`mailto:${PROFILE.email}`}>Contact</a>
        <span className="hud-nav-divider" aria-hidden="true" />
        <button
          type="button"
          className="hud-sound"
          aria-pressed={sound}
          aria-label="Sound"
          onClick={toggleSound}
        >
          {sound ? <IconSoundOn /> : <IconSoundOff />}
        </button>
      </nav>
    </header>
  );
}

function Intro({ started, ready, failed }) {
  const primaryRef = useRef(null);
  useEffect(() => {
    if (ready && !started && window.matchMedia?.("(pointer: fine)").matches) {
      primaryRef.current?.focus({ preventScroll: true });
    }
  }, [ready, started]);
  return (
    <section
      className="hud-intro card"
      aria-labelledby="intro-title"
      data-state={started || failed ? "closed" : "open"}
      inert={started || failed}
    >
      {!ready && (
        <div className="hud-intro-loading" aria-hidden="true">
          <span />
        </div>
      )}
      <h2 id="intro-title">{showcase.intro.heading}</h2>
      <p className="hud-intro-body">{showcase.intro.lead}</p>
      <div className="hud-intro-logos" aria-hidden="true">
        {UPSTREAM_LOGOS.map((src) => (
          <img key={src} src={src} alt="" width="36" height="36" />
        ))}
      </div>
      <p className="hud-intro-how">
        <span className="only-fine">
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> or arrows to slide · <kbd>Shift</kbd> to dash · click the snow to go there.
        </span>
        <span className="only-coarse">Drag anywhere to steer. Tap a building to go there.</span>
      </p>
      <div className="hud-intro-actions">
        <button
          type="button"
          ref={primaryRef}
          className="btn btn-primary"
          disabled={!ready}
          aria-busy={!ready}
          onClick={() => setUi({ started: true })}
        >
          {ready ? "Start sliding" : "Building the island"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setUi({ started: true, list: true })}>
          All projects
        </button>
      </div>
    </section>
  );
}

function NearPrompt({ near, open, list, failed }) {
  const [shownId, setShownId] = useState(near);
  if (near && near !== shownId) setShownId(near);
  const place = PLACE_BY_ID[shownId];
  const visible = Boolean(near) && !open && !list && !failed;
  return (
    <>
      <button
        type="button"
        className="hud-near card"
        data-state={visible ? "open" : "closed"}
        inert={!visible}
        style={place ? { "--accent": place.color } : undefined}
        onClick={() => place && setUi({ open: place.id })}
      >
        {place && (
          <>
            <span className="hud-near-dot" aria-hidden="true" />
            <span className="hud-near-body">
              <span className="hud-near-kind">{place.kind}</span>
              <span className="hud-near-name">{place.name}</span>
            </span>
            <span className="hud-near-cta">
              <span className="only-fine">
                <kbd>E</kbd> Open
              </span>
              <span className="only-coarse">Tap to open</span>
            </span>
          </>
        )}
      </button>
      <p className="sr-only" aria-live="polite">
        {near
          ? `${PLACE_BY_ID[near].name}. ${
              typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches
                ? "Tap to open."
                : "Press E or Enter to open."
            }`
          : ""}
      </p>
    </>
  );
}

// Shared by every panel variant: the PR link, or GitHub + docs, or email +
// resume + GitHub + the landing site — whichever place.links the data gives.
function Links({ items }) {
  return (
    <div className="panel-links">
      {items.map((l, i) => {
        const external = l.url.startsWith("http");
        return (
          <a
            key={l.url}
            className={i === 0 ? "btn btn-primary" : "btn btn-ghost"}
            href={l.url}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer" : undefined}
          >
            {l.label}
            {external && <IconArrow />}
          </a>
        );
      })}
    </div>
  );
}

function Tags({ items }) {
  return (
    <ul className="panel-tags">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

// Upstream: the org, "{verb} {repo} #{pr}", the title, the headline as the
// hero number, the body, the result line, the tags, every check, the PR.
function UpstreamPanel({ place, titleRef }) {
  return (
    <>
      <div className="panel-org">
        {place.logo && <img className="panel-logo" src={place.logo} alt="" width="28" height="28" />}
        <p className="panel-org-line">
          <span className="panel-verb">{place.verb}</span> <span className="panel-repo">{place.repo} #{place.pr}</span>
        </p>
      </div>
      <h2 id="panel-title" tabIndex={-1} ref={titleRef} className="panel-title">
        {place.title}
      </h2>
      <p className="panel-hero">{place.headline}</p>
      <p className="panel-body">{place.body}</p>
      <p className="panel-result">
        <span className="panel-result-label">Result</span>
        {place.result}
      </p>
      <Tags items={place.tags} />
      <div className="panel-checks">
        <h3 className="checks-head">How it was checked</h3>
        <ul className="checks-list">
          {place.checks.map((c, i) => (
            <li key={i}>
              <IconCheck />
              {c}
            </li>
          ))}
        </ul>
      </div>
      <Links items={place.links} />
    </>
  );
}

// Lab: the name, tagline, claim, specs (numeric ones as stats, text ones as
// badges), tags and links.
function LabPanel({ place, titleRef }) {
  return (
    <>
      <p className="panel-eyebrow">{place.tagline}</p>
      <h2 id="panel-title" tabIndex={-1} ref={titleRef} className="panel-title">
        {place.name}
      </h2>
      <div className="specs-grid">
        {place.specs.map((s, i) =>
          s.text ? (
            <span key={i} className="specs-chip">
              {s.text}
            </span>
          ) : (
            <div key={i} className="specs-stat">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ),
        )}
      </div>
      <p className="panel-body">{place.body}</p>
      <Tags items={place.tags} />
      <Links items={place.links} />
    </>
  );
}

// The igloo: the intro (heading, lead, upstream lead) and the links.
function HomePanel({ place, titleRef }) {
  return (
    <>
      <h2 id="panel-title" tabIndex={-1} ref={titleRef} className="panel-title">
        {place.kind}
      </h2>
      <dl className="proof">
        {place.proof.map((p, i) => (
          <div className="proof-row" key={i} style={{ "--i": i }}>
            <dt>{p.label}</dt>
            <dd>{p.value}</dd>
          </div>
        ))}
      </dl>
      <p className="panel-hook">{place.hook}</p>
      <Links items={place.links} />
    </>
  );
}

function Panel({ open, titleRef }) {
  const [shownId, setShownId] = useState(open);
  if (open && open !== shownId) setShownId(open);
  const place = PLACE_BY_ID[shownId];
  const Variant = place?.section === "upstream" ? UpstreamPanel : place?.section === "lab" ? LabPanel : HomePanel;
  return (
    <Sheet
      on={Boolean(open)}
      side="right"
      titleId="panel-title"
      titleRef={titleRef}
      accent={place?.color}
      onClose={() => setUi({ open: null })}
    >
      {place && <Variant place={place} titleRef={titleRef} />}
    </Sheet>
  );
}

function ListRow({ place }) {
  const upstream = place.section === "upstream";
  return (
    <li>
      <button type="button" style={{ "--accent": place.color }} onClick={() => sendTo(place)}>
        {upstream && place.logo ? (
          <img className="list-logo" src={place.logo} alt="" width="20" height="20" />
        ) : (
          <span className="list-dot" aria-hidden="true" />
        )}
        <span className="list-row-text">
          <span className="list-row-name">{upstream ? place.title : place.name}</span>
          <span className="list-row-kind">{upstream ? `${place.repo} #${place.pr}` : place.kind}</span>
          {upstream && <span className="list-row-headline">{place.headline}</span>}
        </span>
        <IconChevron />
      </button>
    </li>
  );
}

function FallbackCard({ place }) {
  const upstream = place.section === "upstream";
  const hero = upstream ? null : place.proof[0];
  return (
    <button type="button" className="fallback-card" style={{ "--accent": place.color }} onClick={() => sendTo(place)}>
      {upstream && place.logo && <img className="fallback-card-logo" src={place.logo} alt="" width="24" height="24" />}
      <span className="fallback-card-kind">{upstream ? `${place.repo} #${place.pr}` : place.kind}</span>
      <span className="fallback-card-name">{upstream ? place.title : place.name}</span>
      {upstream ? (
        <span className="fallback-card-figure">{place.headline}</span>
      ) : (
        <>
          <span className="fallback-card-figure">{hero.value}</span>
          <span className="fallback-card-label">{hero.label}</span>
        </>
      )}
    </button>
  );
}

function List({ list, failed, titleRef }) {
  return (
    <Sheet
      on={list || failed}
      side="left"
      titleId="list-title"
      titleRef={titleRef}
      failed={failed}
      onClose={() => setUi({ list: false })}
    >
      {failed ? (
        <>
          <h2 id="list-title" tabIndex={-1} ref={titleRef} className="fallback-title">
            {PROFILE.name}
          </h2>
          <p className="fallback-line">{PROFILE.line}</p>
          <p className="fallback-note">
            This browser could not start the 3D island. Here is everything on it.
          </p>
          <div className="fallback-grid">
            <FallbackCard place={PLACE_BY_ID.home} />
          </div>
          <h3 className="list-group-head">
            {showcase.intro.upstreamHeading} <span className="list-group-count">{UPSTREAM.length}</span>
          </h3>
          <p className="list-group-lead">{showcase.intro.upstreamLead}</p>
          <div className="fallback-grid">
            {UPSTREAM.map((place) => (
              <FallbackCard key={place.id} place={place} />
            ))}
          </div>
          <h3 className="list-group-head">
            In the lab <span className="list-group-count">{LAB.length}</span>
          </h3>
          <div className="fallback-grid">
            {LAB.map((place) => (
              <FallbackCard key={place.id} place={place} />
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 id="list-title" tabIndex={-1} ref={titleRef} className="list-title">
            Projects
          </h2>
          <p className="list-sub">Pick one and the seal slides there.</p>
          <button type="button" className="list-home-link" onClick={() => sendTo(PLACE_BY_ID.home)}>
            <span className="list-dot" style={{ "--accent": PLACE_BY_ID.home.color }} aria-hidden="true" />
            About — {PLACE_BY_ID.home.name}
          </button>
          <h3 className="list-group-head">
            {showcase.intro.upstreamHeading} <span className="list-group-count">{UPSTREAM.length}</span>
          </h3>
          <p className="list-group-lead">{showcase.intro.upstreamLead}</p>
          <ul className="list-rows">
            {UPSTREAM.map((place) => (
              <ListRow key={place.id} place={place} />
            ))}
          </ul>
          <h3 className="list-group-head">
            In the lab <span className="list-group-count">{LAB.length}</span>
          </h3>
          <ul className="list-rows">
            {LAB.map((place) => (
              <ListRow key={place.id} place={place} />
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}

export default function Hud() {
  const started = useUi((s) => s.started);
  const ready = useUi((s) => s.ready);
  const near = useUi((s) => s.near);
  const open = useUi((s) => s.open);
  const list = useUi((s) => s.list);
  const sound = useUi((s) => s.sound);
  const failed = useUi((s) => s.failed);
  const cutscene = useUi((s) => s.cutscene);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("seal:sound");
      if (stored !== null) setUi({ sound: stored === "1" });
    } catch {
      /* private mode, storage full, or disabled — default sound stands */
    }
    if (new URLSearchParams(window.location.search).has("fallback")) setUi({ failed: true });
  }, []);

  const district = useDistrictBanner(started && !failed);
  const panelTitleRef = useRef(null);
  const listTitleRef = useRef(null);

  // React's root listener fires before SealGame's window listener, so
  // stopping propagation here keeps two things from reaching that handler:
  // activating a focused HUD control (B1, e.g. Enter on "Projects" opening
  // the building panel instead), and, in the no-WebGL fallback, arrow keys
  // (which SealGame preventDefaults on) that should just scroll the page.
  function onHudKeyDown(e) {
    if ((e.code === "Enter" || e.code === "Space") && e.target.closest("a,button")) {
      e.stopPropagation();
    }
    if (getUi().failed && e.code !== "Escape") e.stopPropagation();
  }

  return (
    <div className="hud" data-cutscene={cutscene ? "on" : undefined} onKeyDown={onHudKeyDown}>
      <Curtain ready={ready} />
      <div className="hud-letterbox" data-on={!!cutscene} aria-hidden="true" />
      <TopBar list={list} sound={sound} failed={failed} />
      <DistrictBanner district={district} open={open} list={list} />
      <Intro started={started} ready={ready} failed={failed} />
      {!failed && <MoveCoach />}
      <NearPrompt near={near} open={open} list={list} failed={failed} />
      {started && !failed && <Minimap onSelect={sendTo} />}
      <List list={list} failed={failed} titleRef={listTitleRef} />
      <Panel open={open} titleRef={panelTitleRef} />
    </div>
  );
}
