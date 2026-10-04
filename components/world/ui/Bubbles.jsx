"use client";

// THE CUTSCENE, on the page (lib/world/cutscene/): the comic-print layer
// over the 3D world, for every place, from its card. Two flat impact frames
// (the stage's deep ink, halftone, a ring with its inks a little off
// register), the one hand-lettered onomatopoeia as the stage opens, and the
// two lines in comic bubbles in the lower half, each tail reaching up to
// whoever says it: the figure's mouth, the landform, or the pup. Bubbles
// are an oval, a burst or a whisper (dashed). Everything moves on twos.
// Nothing here covers the render for more than two drawings. ui.beat is the
// clock (the Controller clears it with the arrival, so a skip removes all of
// this in one frame). With reduced motion both bubbles stand still.

import { useEffect, useLayoutEffect, useRef } from "react";
import { Vector3 } from "three";
import { paletteFor } from "../../../lib/world/cutscene/look";
import { BEAT, anchorFor, cutFor, cutsceneMode } from "../../../lib/world/cutscene/timeline";
import { live, useUi } from "../../../lib/world/store";

const V = new Vector3();
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

function Lettering({ text, bold = [] }) {
  if (!bold.length) return text;
  const parts = text.split(new RegExp(`(${bold.join("|")})`));
  return parts.map((p, i) => (bold.includes(p) ? <b key={i}>{p}</b> : p));
}

// A burst outline round a w x h box: spikes on an ellipse.
function burst(w, h) {
  const n = 26;
  const cx = w / 2;
  const cy = h / 2;
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? 1.0 : 0.88 + 0.05 * Math.sin(i * 2.3);
    d += `${i ? "L" : "M"}${(cx + Math.cos(a) * cx * r * 1.04).toFixed(1)} ${(cy + Math.sin(a) * cy * r * 1.12).toFixed(1)}`;
  }
  return `${d}Z`;
}

// Lay a bubble out (left, bottom in px) and draw its tail toward the speaker
// (mx, my in px). Its body is the ellipse inscribed in its box.
export function place(el, mx, my, slot, still, fixed) {
  const W = innerWidth;
  const H = innerHeight;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const floor = 0.12 * H; // clear of the lower cinema bar
  let left;
  let bottom = floor;
  if (still && W >= 900) {
    left = slot === "a" ? 0.04 * W : W - 0.04 * W - w;
    if (slot === "c") bottom = floor + el.previousElementSibling.offsetHeight + 0.02 * H; // stacked over line B
  } else {
    left = fixed != null ? fixed * W : mx - w * (slot === "a" ? 0.3 : 0.4); // a card may set a bubble beside the speaker, not under it
    if (still && slot === "a") bottom = floor + el.nextElementSibling.offsetHeight + 0.02 * H;
    if (still && slot === "c") bottom = floor + el.previousElementSibling.offsetHeight + el.previousElementSibling.previousElementSibling.offsetHeight + 0.04 * H;
  }
  left = clamp(left, 0.03 * W, W - 0.03 * W - w);
  bottom = Math.min(bottom, H * 0.5 - h); // the lower half, always
  el.style.left = `${left}px`;
  el.style.bottom = `${bottom}px`;
  const top = H - bottom - h;
  // the tail: from the body's upper edge toward the speaker, stopping short
  const rx = w / 2;
  const ry = h / 2;
  const bx = clamp(mx - left, w * 0.25, w * 0.75);
  const by = ry - ry * Math.sqrt(1 - ((bx - rx) / rx) ** 2) + 14;
  const tx = mx - left;
  const ty = my - top;
  // a short, curved comic tail aimed at the mouth (comic convention: it
  // points, it does not reach)
  const len = Math.hypot(tx - bx, ty - by) || 1;
  const ux = (tx - bx) / len;
  const uy = (ty - by) / len;
  const L = clamp(0.1 * H, 56, 104) + 14;
  const px = bx + ux * L;
  const py = by + uy * L;
  const half = Math.min(24, w * 0.05);
  const bow = (ux > 0 ? -1 : 1) * 0.28 * L; // it curls away from the way it leans
  const cx = (bx + px) / 2 - uy * bow;
  const cy = (by + py) / 2 + ux * bow;
  const d = `M${bx - half} ${by} Q${cx - half * 0.3} ${cy} ${px} ${py} Q${cx + half * 0.5} ${cy} ${bx + half} ${by}Z`;
  for (const p of el.querySelectorAll(".bubble-tail")) p.setAttribute("d", d);
  const svg = el.querySelector("svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const body = el.querySelectorAll(".bubble-body");
  if (el.dataset.kind === "burst") for (const b of body) b.setAttribute("d", burst(w, h));
  else for (const b of body) b.setAttribute("d", `M0 ${ry}A${rx} ${ry} 0 1 0 ${w} ${ry}A${rx} ${ry} 0 1 0 0 ${ry}Z`);
}

export function Bubble({ slot, who, kind, line, bold, sub }) {
  return (
    <div className="bubble" data-slot={slot} data-who={who} data-kind={kind}>
      <svg className="bubble-art" aria-hidden="true">
        <defs>
          <pattern id={`ht-${slot}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx="3.5" cy="3.5" r="1.7" />
          </pattern>
          <linearGradient id={`fade-${slot}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <mask id={`m-${slot}`}>
            <rect width="100%" height="100%" fill={`url(#fade-${slot})`} />
          </mask>
        </defs>
        <path className="bubble-tail bubble-ink" />
        <path className="bubble-body bubble-ink" />
        <path className="bubble-tail bubble-fill" />
        {kind === "burst" ? <path className="bubble-body bubble-dots" fill={`url(#ht-${slot})`} mask={`url(#m-${slot})`} /> : null}
      </svg>
      <p className="bubble-text">
        <Lettering text={line} bold={bold} />
        {sub ? <small>{sub}</small> : null}
      </p>
    </div>
  );
}

export default function Bubbles() {
  const beat = useUi((s) => s.beat);
  const id = useUi((s) => s.cutscene);
  const mode = cutsceneMode(id);
  const cut = mode ? cutFor(id) : null;
  const wrap = useRef(null);
  const ring = useRef(null);
  const still = mode === "still";

  useEffect(() => {
    const root = document.documentElement;
    if (mode) root.dataset.cutscene = mode;
    else delete root.dataset.cutscene;
    return () => {
      delete root.dataset.cutscene;
    };
  }, [mode]);

  // On twos: the tails and the impact ring follow the speakers and the pup
  // twelve times a second; a new beat lays out at once, before its first paint.
  const draw = () => {
    const cam = window.__world?.camera;
    if (!cam || !wrap.current || !cut) return;
    const s = live.seal;
    for (const el of wrap.current.querySelectorAll(".bubble")) {
      anchorFor(el.dataset.who, cut.card, cut.place, s.x, s.z, V, el.dataset.slot, live.pupAt).project(cam);
      const at = cut.card.bubbleAt?.[el.dataset.slot];
      place(el, (V.x * 0.5 + 0.5) * innerWidth, (0.5 - V.y * 0.5) * innerHeight, el.dataset.slot, still, at ? at[innerWidth < innerHeight ? 1 : 0] : null);
    }
    if (ring.current) {
      V.set(s.x, 0.8, s.z).project(cam);
      ring.current.style.setProperty("--x", `${((V.x * 0.5 + 0.5) * 100).toFixed(1)}%`);
      ring.current.style.setProperty("--y", `${((0.5 - V.y * 0.5) * 100).toFixed(1)}%`);
    }
  };
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useLayoutEffect(() => drawRef.current(), [beat]);
  const card = cut?.card ?? null;
  useEffect(() => {
    if (!card) return undefined;
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
  }, [card]);

  if (!cut) return null;
  const ink = paletteFor(card);
  const showA = still ? beat > 0 && beat < BEAT.out : beat === BEAT.lineA || beat === BEAT.move;
  const showB = still ? beat > 0 && beat < BEAT.out : beat === BEAT.lineB;
  const showC = Boolean(card.c) && (still ? beat > 0 && beat < BEAT.out : beat === BEAT.lineC);
  const showCredit = Boolean(card.credit) && (still ? beat > 0 && beat < BEAT.out : beat === BEAT.credit);
  const impact = !still && (beat === BEAT.impact || beat === BEAT.collapse);
  const sfx = card.stage?.sfx;
  const line = (slot, l, fallback) => <Bubble slot={slot} who={l.who} kind={l.kind ?? fallback} line={l.text} bold={card.bold} sub={slot === "b" ? card.sub : null} />;
  return (
    <div className="comic" ref={wrap} data-beat={beat} style={{ "--accent": ink.accent, "--deep": ink.deep, "--paper-dots": ink.paperDots }} aria-live="polite">
      {impact ? (
        <div className="comic-impact" ref={ring} key={beat} aria-hidden="true">
          <i />
        </div>
      ) : null}
      {!still && beat === BEAT.bloom && sfx ? (
        <div className="comic-sfx" data-text={sfx} aria-hidden="true">
          {sfx}
        </div>
      ) : null}
      {showA ? line("a", card.a, "oval") : null}
      {showB ? line("b", card.b, "burst") : null}
      {showC ? line("c", card.c, "burst") : null}
      {showCredit ? (
        <div className="comic-credit" data-still={still ? "" : undefined}>
          <strong>{card.credit.title}</strong>
          {card.credit.sub ? <span>{card.credit.sub}</span> : null}
          {card.credit.ret ? <em>{card.credit.ret}</em> : null}
        </div>
      ) : null}
    </div>
  );
}
