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
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// The sound, hand-lettered: each letter a hard-cut polygon with sharp
// serifs and a counter, a crack of ink through it. Drawn in a 100 x 120 box.
const GLYPHS = {
  D: { body: "M0 6L64 2L90 26L97 62L86 98L58 118L0 114L12 104L14 18Z M32 26L56 30L67 60L58 92L32 94Z", crack: "M10 46L30 58L20 72L36 90" },
  O: { body: "M50 0L80 12L99 48L92 92L62 118L26 116L4 86L1 40L20 8Z M50 28L66 42L68 78L50 94L33 80L31 44Z", crack: "M76 18L60 36L72 52L64 70" },
  M: { body: "M0 116L10 106L13 14L1 3L36 3L50 52L64 3L99 3L87 14L90 106L100 116L60 116L67 106L66 50L50 98L34 50L33 106L40 116Z", crack: "M18 30L28 48L16 64L26 84" },
};

function Sfx({ text }) {
  const letters = [...text];
  const w = letters.length * 92 + 20;
  return (
    <div className="comic-sfx awake-sfx" aria-hidden="true">
      <svg viewBox={`-10 -14 ${w} 160`} className="awake-sfx-art">
        {["shadow", "misreg", "face"].map((layer) => (
          <g key={layer} className={`awake-sfx-${layer}`}>
            {letters.map((ch, i) => {
              const g = GLYPHS[ch];
              const grow = ch === "O" ? 0.9 + 0.08 * i : 1; // the O's swell as the sound rolls out
              return (
                <g key={i} transform={`translate(${i * 92} ${(1 - grow) * 60 + (i % 2 ? 6 : -4)}) rotate(${(i % 2 ? 4 : -5)} 50 60) scale(${grow})`}>
                  <path d={g.body} fillRule="evenodd" />
                  {layer === "face" ? <path className="awake-sfx-crack" d={g.crack} /> : null}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

// The kit's tail stops short of its speaker; the pup is far above the
// bubble in flight, so this one is redrawn to reach just shy of its mouth.
function aimTail(el, mx, my) {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const r = { left: parseFloat(el.style.left), top: innerHeight - parseFloat(el.style.bottom) - h }; // as place() laid it out, before the pop's scale
  const rx = w / 2;
  const ry = h / 2;
  const bx = clamp(mx - r.left, w * 0.25, w * 0.75);
  const by = ry - ry * Math.sqrt(1 - ((bx - rx) / rx) ** 2) + 14;
  const tx = mx - r.left;
  const ty = my - r.top;
  const len = Math.hypot(tx - bx, ty - by) || 1;
  const ux = (tx - bx) / len;
  const uy = (ty - by) / len;
  const L = Math.max(40, len - 34);
  const px = bx + ux * L;
  const py = by + uy * L;
  const half = Math.min(22, w * 0.045);
  const bow = (ux > 0 ? -1 : 1) * 0.12 * L;
  const cx = (bx + px) / 2 - uy * bow;
  const cy = (by + py) / 2 + ux * bow;
  const d = `M${bx - half} ${by} Q${cx - half * 0.3} ${cy} ${px} ${py} Q${cx + half * 0.5} ${cy} ${bx + half} ${by}Z`;
  for (const p of el.querySelectorAll(".bubble-tail")) p.setAttribute("d", d);
}

function Credit({ still }) {
  const c = useMemo(awakeCredit, []);
  return (
    <section className="awake-card" data-still={still || undefined} aria-label="The work this celebrates">
      <p className="awake-card-kicker">All of it, by Teerth Sharma</p>
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
    for (const el of wrap.current.querySelectorAll(".bubble")) {
      place(el, mx, my, "a", still);
      if (a.on) aimTail(el, mx, my);
    }
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
      {!still && beat === 3 ? <Sfx text={SFX} /> : null}
      {showLine ? <Bubble slot="a" who="seal" kind="oval" line={LINE.text} bold={LINE.bold} /> : null}
      {showCard ? <Credit still={still} /> : null}
    </div>
  );
}
