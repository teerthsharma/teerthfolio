"use client";

// THE DOMAIN, on the page (lib/world/domain.js): the comic-print layer over
// the 3D world. Two flat impact frames (deep violet, halftone, a ring with
// its inks a little off register), the hand-lettered "VOID" as the domain
// opens, and the silhouette's two lines in comic bubbles in the lower half,
// tails reaching up to it. Bubbles and lettering move on twos. Nothing here
// covers the render for more than two drawings. ui.beat is the clock (the
// Controller clears it with the arrival, so a skip removes all of this in
// one frame). Hidden with ?hud=off (domainMode is null there); with reduced
// motion both bubbles stand still beside the standing silhouette.

import { useEffect, useLayoutEffect, useRef } from "react";
import { Vector3 } from "three";
import { FIGURE_AT, FIGURE_SCALE, domainMode } from "../../../lib/world/domain";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { punchFor } from "../../../lib/world/punch";
import { live, useUi } from "../../../lib/world/store";

const V = new Vector3();
const MOUTH_Y = 1.78; // m above the silhouette's feet, before its scale: just under the band
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

function Lettering({ text, bold = [] }) {
  if (!bold.length) return text;
  const parts = text.split(new RegExp(`(${bold.join("|")})`));
  return parts.map((p, i) => (bold.includes(p) ? <b key={i}>{p}</b> : p));
}

// A burst outline round a w x h box (line B): spikes on an ellipse.
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

// Lay a bubble out (left, bottom in px) and draw its tail toward the mouth
// (mx, my in px). Its body is the ellipse inscribed in its box.
function place(el, mx, my, slot, still) {
  const W = innerWidth;
  const H = innerHeight;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const floor = 0.12 * H; // clear of the lower cinema bar
  let left;
  let bottom = floor;
  if (still && W >= 900) left = slot === "a" ? 0.04 * W : W - 0.04 * W - w;
  else {
    left = mx - w * (slot === "a" ? 0.3 : 0.4);
    if (still && slot === "a") bottom = floor + el.nextElementSibling.offsetHeight + 0.02 * H;
  }
  left = clamp(left, 0.03 * W, W - 0.03 * W - w);
  bottom = Math.min(bottom, H * 0.5 - h); // the lower half, always
  el.style.left = `${left}px`;
  el.style.bottom = `${bottom}px`;
  const top = H - bottom - h;
  // the tail: from the body's upper edge toward the mouth, stopping short
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

function Bubble({ slot, kind, line, bold }) {
  return (
    <div className="bubble" data-slot={slot} data-kind={kind}>
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
      </p>
    </div>
  );
}

export default function DomainBubbles() {
  const beat = useUi((s) => s.beat);
  const id = useUi((s) => s.cutscene);
  const mode = domainMode(id);
  const card = mode ? punchFor(id) : null;
  const wrap = useRef(null);
  const ring = useRef(null);
  const still = mode === "still";
  const accent = id ? PLACE_BY_ID[id]?.radiation ?? "#e94bff" : "#e94bff";

  useEffect(() => {
    const root = document.documentElement;
    if (mode) root.dataset.domain = mode;
    else delete root.dataset.domain;
    return () => {
      delete root.dataset.domain;
    };
  }, [mode]);

  // On twos: the tails and the impact ring follow the silhouette and the pup
  // twelve times a second; a new beat lays out at once, before its first paint.
  const draw = () => {
    const cam = window.__world?.camera;
    if (!cam || !wrap.current) return;
    const s = live.seal;
    V.set(s.x + FIGURE_AT[0], FIGURE_AT[1] + MOUTH_Y * FIGURE_SCALE, s.z + FIGURE_AT[2]).project(cam);
    const mx = (V.x * 0.5 + 0.5) * innerWidth;
    const my = (0.5 - V.y * 0.5) * innerHeight;
    for (const el of wrap.current.querySelectorAll(".bubble")) place(el, mx, my, el.dataset.slot, still);
    if (ring.current) {
      V.set(s.x, 0.8, s.z).project(cam);
      ring.current.style.setProperty("--x", `${((V.x * 0.5 + 0.5) * 100).toFixed(1)}%`);
      ring.current.style.setProperty("--y", `${((0.5 - V.y * 0.5) * 100).toFixed(1)}%`);
    }
  };
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useLayoutEffect(() => drawRef.current(), [beat]);
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

  if (!card) return null;
  const showA = still ? beat > 0 && beat < 8 : beat === 5;
  const showB = still ? beat > 0 && beat < 8 : beat === 6;
  const impact = !still && (beat === 2 || beat === 7);
  return (
    <div className="domain" ref={wrap} data-beat={beat} style={{ "--accent": accent }} aria-live="polite">
      {impact ? (
        <div className="domain-impact" ref={ring} key={beat} aria-hidden="true">
          <i />
        </div>
      ) : null}
      {!still && beat === 3 ? (
        <div className="domain-sfx" data-text="VOID" aria-hidden="true">
          VOID
        </div>
      ) : null}
      {showA ? <Bubble slot="a" kind="oval" line={card.a.text} bold={card.bold} /> : null}
      {showB ? <Bubble slot="b" kind="burst" line={card.b.text} bold={card.bold} /> : null}
    </div>
  );
}
