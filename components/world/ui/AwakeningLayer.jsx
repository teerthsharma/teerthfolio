"use client";

// THE AWAKENING, on the page (lib/world/awakening.js): the comic-print layer
// over the 3D scene. Three impact frames (ink and violet on the eruption and
// the take-off, the peak's inverted to cream and ink), the one hand-lettered sound in the loop's
// colour, the line in a cream bubble in the lower half with its tail on the
// flying pup, and the credit card for the whole body of work. Stepped, on
// twos, like the cutscene kit's layer (ui/Bubbles.jsx) it borrows its bubble from. ui.beat is the
// clock, so a skip removes all of it in one frame. With reduced motion the
// bubble and the card stand still for the whole moment; ?hud=off never
// shows it (awakeMode is null there).

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { LINE, SFX, awakeCredit, awakeMode } from "../../../lib/world/awakening";
import { LOOP } from "../../../lib/world/loop";
import { live, useUi } from "../../../lib/world/store";
import { Bubble, place } from "./Bubbles";

const V = new Vector3();

function Credit({ still }) {
  const c = useMemo(awakeCredit, []);
  return (
    <section className="awake-card" data-still={still || undefined} aria-label="The work this celebrates">
      <p className="awake-card-kicker">Every line of it, his</p>
      <dl className="awake-card-counts">
        <div>
          <dt>{c.upstream}</dt>
          <dd>upstream contributions landed</dd>
        </div>
        <div>
          <dt>{c.lab}</dt>
          <dd>lab projects</dd>
        </div>
        <div>
          <dt>{c.orgs}</dt>
          <dd>organisations</dd>
        </div>
      </dl>
      <ul className="awake-card-results">
        {c.results.map((r) => (
          <li key={r.id}>
            <code>{r.repo}</code>
            <span>{r.quote}</span>
          </li>
        ))}
      </ul>
      <p className="awake-card-sign">Teerth Sharma</p>
    </section>
  );
}

export default function AwakeningLayer() {
  const beat = useUi((s) => s.beat);
  const id = useUi((s) => s.cutscene);
  const mode = awakeMode(id);
  const still = mode === "still";
  const wrap = useRef(null);
  const ring = useRef(null);

  useEffect(() => {
    if (!mode) return undefined;
    const root = document.documentElement;
    root.dataset.cutscene = mode; // the minimap steps aside; a still bubble does not bounce in
    return () => {
      delete root.dataset.cutscene;
    };
  }, [mode]);

  // On twos: the tail follows the pup's mouth and the impact ring the pup.
  const draw = () => {
    const cam = window.__world?.camera;
    if (!cam || !wrap.current) return;
    const a = live.awake;
    const s = live.seal;
    if (a.on) V.set(a.x, a.y, a.z);
    else V.set(s.x, 1.0, s.z);
    V.project(cam);
    const mx = (V.x * 0.5 + 0.5) * innerWidth;
    const my = (0.5 - V.y * 0.5) * innerHeight;
    for (const el of wrap.current.querySelectorAll(".bubble")) place(el, mx, my, "a", still);
    if (ring.current) {
      ring.current.style.setProperty("--x", `${((V.x * 0.5 + 0.5) * 100).toFixed(1)}%`);
      ring.current.style.setProperty("--y", `${((0.5 - V.y * 0.5) * 100).toFixed(1)}%`);
    }
  };
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useLayoutEffect(() => drawRef.current(), [beat, mode]);
  useEffect(() => {
    if (!mode) return undefined;
    let raf = 0;
    let last = -1;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const step = Math.floor(now / 83.3);
      if (step === last) return;
      last = step;
      drawRef.current();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  if (!mode) return null;
  const impact = !still && (beat === 2 || beat === 5 || beat === 7);
  const showLine = still ? beat > 0 : beat === 9;
  const showCard = still ? beat > 0 : beat === 10;
  return (
    <div className="comic awake" ref={wrap} data-beat={beat} style={{ "--accent": LOOP.color }} aria-live="polite">
      {impact ? (
        <div className="comic-impact" data-invert={beat === 5 || undefined} ref={ring} key={beat} aria-hidden="true">
          <i />
        </div>
      ) : null}
      {!still && beat === 3 ? (
        <div className="comic-sfx awake-sfx" data-text={SFX} aria-hidden="true">
          {SFX}
        </div>
      ) : null}
      {showLine ? <Bubble slot="a" who="seal" kind="oval" line={LINE.text} bold={LINE.bold} /> : null}
      {showCard ? <Credit still={still} /> : null}
    </div>
  );
}
