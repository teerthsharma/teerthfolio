"use client";

// Everything drawn in HTML over the world: the top bar, the intro card, the
// "you are at a building" prompt, the project panel, and the full list (which
// is also the no-WebGL fallback, so every project is reachable without the
// game).

import { PLACE_BY_ID, PLACES, PROFILE, dockPoint } from "../../lib/world/places";
import { live, setUi, useUi } from "../../lib/world/store";

function sendTo(place) {
  const dock = dockPoint(place);
  live.target = { x: dock.x, z: dock.z };
  live.pendingOpen = place.id;
  setUi({ list: false, open: null, started: true });
}

function TopBar() {
  return (
    <header className="hud-top">
      <a className="hud-mark" href={PROFILE.site}>
        <strong>{PROFILE.name}</strong>
        <span>{PROFILE.title}</span>
      </a>
      <nav className="hud-nav">
        <button type="button" onClick={() => setUi({ list: true, open: null })}>
          Projects
        </button>
        <button type="button" onClick={() => sendTo(PLACE_BY_ID.home)}>
          About
        </button>
        <a href={`mailto:${PROFILE.email}`}>Contact</a>
      </nav>
    </header>
  );
}

function Intro() {
  const started = useUi((s) => s.started);
  const ready = useUi((s) => s.ready);
  if (started) return null;
  return (
    <div className="hud-intro" role="dialog" aria-label="How to play">
      <p className="hud-intro-kicker">A seal, an island, eight buildings</p>
      <h1>Every building here is something Teerth built.</h1>
      <p>Slide the seal up to one and it opens.</p>
      <ul className="hud-keys">
        <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows to slide</li>
        <li>Click the snow or a building to go there</li>
        <li>On a phone, drag anywhere to steer</li>
      </ul>
      <div className="hud-intro-actions">
        <button type="button" className="btn-primary" onClick={() => setUi({ started: true })} disabled={!ready}>
          {ready ? "Start sliding" : "Loading the island"}
        </button>
        <button type="button" className="btn-quiet" onClick={() => setUi({ started: true, list: true })}>
          Just show me the list
        </button>
      </div>
    </div>
  );
}

function NearPrompt() {
  const near = useUi((s) => s.near);
  const open = useUi((s) => s.open);
  const list = useUi((s) => s.list);
  if (!near || open || list) return null;
  const place = PLACE_BY_ID[near];
  return (
    <button type="button" className="hud-near" style={{ "--accent": place.color }} onClick={() => setUi({ open: near })}>
      <span className="hud-near-kind">{place.kind}</span>
      <span className="hud-near-name">{place.name}</span>
      <span className="hud-near-hook">{place.hook}</span>
      <span className="hud-near-cta"><kbd>E</kbd> Open</span>
    </button>
  );
}

function Panel() {
  const open = useUi((s) => s.open);
  if (!open) return null;
  const place = PLACE_BY_ID[open];
  return (
    <aside className="hud-panel" style={{ "--accent": place.color }} aria-label={place.name}>
      <button type="button" className="hud-close" onClick={() => setUi({ open: null })} aria-label="Close">
        ×
      </button>
      <p className="hud-panel-kind">{place.kind}</p>
      <h2>{place.name}</h2>
      <p className="hud-panel-hook">{place.hook}</p>
      <dl className="hud-proof">
        {place.proof.map((p) => (
          <div key={p.label}>
            <dt>{p.value}</dt>
            <dd>{p.label}</dd>
          </div>
        ))}
      </dl>
      <p className="hud-panel-body">{place.body}</p>
      {place.contributions && (
        <ol className="hud-contribs">
          {place.contributions.map((c) => (
            <li key={`${c.repo}#${c.pr}`}>
              <a href={`https://github.com/${c.repo}/pull/${c.pr}`} target="_blank" rel="noreferrer">
                <span className="hud-contrib-repo">{c.repo} #{c.pr}</span>
                <span className="hud-contrib-what">{c.what}</span>
                <span className="hud-contrib-result">{c.result}</span>
              </a>
            </li>
          ))}
        </ol>
      )}
      <div className="hud-links">
        {place.links.map((l) => (
          <a key={l.url} href={l.url} target={l.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
            {l.label} ↗
          </a>
        ))}
      </div>
    </aside>
  );
}

function List() {
  const list = useUi((s) => s.list);
  const failed = useUi((s) => s.failed);
  if (!list) return null;
  return (
    <section className="hud-list" aria-label="All projects">
      <div className="hud-list-head">
        <h2>Everything on the island</h2>
        {!failed && (
          <button type="button" className="hud-close" onClick={() => setUi({ list: false })} aria-label="Close">
            ×
          </button>
        )}
      </div>
      {failed && <p className="hud-list-note">This browser could not start the 3D island, so here is everything in it.</p>}
      <ul>
        {PLACES.map((place) => (
          <li key={place.id} style={{ "--accent": place.color }}>
            <button type="button" onClick={() => (failed ? setUi({ open: place.id, list: false }) : sendTo(place))}>
              <span className="hud-list-kind">{place.kind}</span>
              <span className="hud-list-name">{place.name}</span>
              <span className="hud-list-hook">{place.hook}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Hud() {
  return (
    <div className="hud">
      <TopBar />
      <Intro />
      <NearPrompt />
      <Panel />
      <List />
    </div>
  );
}
