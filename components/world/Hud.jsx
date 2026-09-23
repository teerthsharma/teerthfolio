"use client";

// Everything drawn in HTML over the world: the top bar, the intro card, the
// "you are at a building" prompt, the project panel, and the full list (which
// is also the no-WebGL fallback, so every project is reachable without the
// game). Stacking order matters here and mirrors the DOM order below: the
// curtain sits under everything, the list sheet sits under the panel sheet
// so the panel wins when both show at once in fallback mode.

import { useEffect, useRef, useState } from "react";
import { PLACE_BY_ID, PLACES, PROFILE, dockPoint } from "../../lib/world/places";
import { getUi, live, setUi, useUi } from "../../lib/world/store";
import Sheet from "./ui/Sheet";
import { IconArrow, IconChevron, IconSoundOff, IconSoundOn } from "./ui/icons";

// PLACES mixes buildings and landmarks, and its length has moved more than
// once — say the real count in words instead of a stale literal.
const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
];
const COUNT = NUMBER_WORDS[PLACES.length] ?? String(PLACES.length);

// Every caller that wants the seal to travel to a building goes through this,
// so the no-WebGL fallback (no seal to send anywhere) only needs one guard.
function sendTo(place) {
  if (getUi().failed) return setUi({ open: place.id, list: true });
  const dock = dockPoint(place);
  live.target = { x: dock.x, z: dock.z };
  live.pendingOpen = place.id;
  setUi({ list: false, open: null, started: true });
}

function Curtain({ ready }) {
  return <div className="hud-curtain" data-ready={ready} aria-hidden="true" />;
}

function TopBar({ started, list, sound, learned, failed }) {
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
        <div className={`hud-hint${started && !learned && !failed ? " is-visible" : ""}`} aria-hidden="true">
          <span>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> slide
          </span>
          <span>
            <kbd>Shift</kbd> dash
          </span>
          <span>
            <kbd>E</kbd> open
          </span>
        </div>
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
      <p className="hud-intro-eyebrow">A seal, an island, {COUNT} places</p>
      <h2 id="intro-title">Every building here is something Teerth built.</h2>
      <p className="hud-intro-body">
        Slide up to one to look inside: eleven contributions landed upstream, a bare-metal Rust OS,
        a runtime whose loops stop when their shape does, and maths proved in Lean.
      </p>
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
              <span className="hud-near-hook">{place.hook}</span>
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

function Panel({ open, titleRef }) {
  const [shownId, setShownId] = useState(open);
  if (open && open !== shownId) setShownId(open);
  const place = PLACE_BY_ID[shownId];
  return (
    <Sheet
      on={Boolean(open)}
      side="right"
      titleId="panel-title"
      titleRef={titleRef}
      accent={place?.color}
      onClose={() => setUi({ open: null })}
    >
      {place && (
        <>
          <p className="panel-eyebrow">{place.kind}</p>
          <h2 id="panel-title" tabIndex={-1} ref={titleRef} className="panel-title">
            {place.name}
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
          <p className="panel-body">{place.body}</p>
          {place.contributions && (
            <div className="panel-contribs">
              <h3 className="contribs-head">
                Landed upstream <span className="contribs-count">{place.contributions.length}</span>
              </h3>
              <ol className="contribs-list">
                {place.contributions.map((c) => (
                  <li key={`${c.repo}#${c.pr}`}>
                    <a href={c.url ?? `https://github.com/${c.repo}/pull/${c.pr}`} target="_blank" rel="noreferrer">
                      <span className="contrib-repo">
                        {c.repo} #{c.pr}
                      </span>
                      <span className="contrib-what">{c.what}</span>
                      <span className="contrib-result">{c.result}</span>
                      <IconArrow className="contrib-arrow" />
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="panel-links">
            {place.links.map((l, i) => {
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
        </>
      )}
    </Sheet>
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
            {PLACES.map((place) => (
              <button
                key={place.id}
                type="button"
                className="fallback-card"
                style={{ "--accent": place.color }}
                onClick={() => sendTo(place)}
              >
                <span className="fallback-card-kind">{place.kind}</span>
                <span className="fallback-card-name">{place.name}</span>
                <span className="fallback-card-hook">{place.hook}</span>
                <span className="fallback-card-figure">{place.proof[0].value}</span>
                <span className="fallback-card-label">{place.proof[0].label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 id="list-title" tabIndex={-1} ref={titleRef} className="list-title">
            {COUNT[0].toUpperCase() + COUNT.slice(1)} places
          </h2>
          <p className="list-sub">Pick one and the seal slides there.</p>
          <ul className="list-rows">
            {PLACES.map((place) => (
              <li key={place.id}>
                <button type="button" style={{ "--accent": place.color }} onClick={() => sendTo(place)}>
                  <span className="list-dot" aria-hidden="true" />
                  <span className="list-row-text">
                    <span className="list-row-name">{place.name}</span>
                    <span className="list-row-kind">{place.kind}</span>
                    <span className="list-row-hook">{place.hook}</span>
                  </span>
                  <IconChevron />
                </button>
              </li>
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

  const [learned, setLearned] = useState(false);
  useEffect(() => {
    if (open) setLearned(true);
  }, [open]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("seal:sound");
      if (stored !== null) setUi({ sound: stored === "1" });
    } catch {
      /* private mode, storage full, or disabled — default sound stands */
    }
    if (new URLSearchParams(window.location.search).has("fallback")) setUi({ failed: true });
  }, []);

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
    <div className="hud" onKeyDown={onHudKeyDown}>
      <Curtain ready={ready} />
      <TopBar started={started} list={list} sound={sound} learned={learned} failed={failed} />
      <Intro started={started} ready={ready} failed={failed} />
      <NearPrompt near={near} open={open} list={list} failed={failed} />
      <List list={list} failed={failed} titleRef={listTitleRef} />
      <Panel open={open} titleRef={panelTitleRef} />
    </div>
  );
}
