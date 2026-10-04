"use client";

// THE COMIC LAYER FOR THIS DOCK: the RAILGUN banner and the four lines. The kit's bubble layer carries three
// lines (a, b, c) and this scene has four speakers' worth (Touma, the pup, Kuroko, the pup's flex), so this
// dock draws its own, with the kit's own Bubble and place (ui/Bubbles.jsx) so they look exactly like the
// others: cream comic bubbles in the lower half, Shantell Sans, key words bold, the tail to the speaker.
// It is its own React root on the page (the move lives inside the Canvas), mounted for the length of the scene.
// The banner is the island's own area banner (.hud-banner): it slams in on the arrival, and shrinks up into
// the top cinema bar on the stage bloom. The kit's own bubbles and place title are hidden while it stands.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Vector3 } from "three";
import { live } from "../../../../../lib/world/store";
import { Bubble, place } from "../../../ui/Bubbles";
import { DECK_Y } from "./scenery";
import { KUROKO, PHI, TOUMA } from "./world";

export const LINES = [
  { id: "fa", t: [1.8, 6.8], who: "touma", kind: "oval", text: "Electric and magnetic? You're just assuming they couple." },
  { id: "fb", t: [6.8, 11.8], who: "seal", kind: "burst", text: "Not assumed. Found." },
  { id: "fk", t: [12.6, 17.6], who: "kuroko", kind: "oval", text: "Onee-sama… I mean, Seal-sama!!" },
  { id: "fc", t: [17.6, 25.3], who: "seal", kind: "burst", text: "The field coupling, found rather than assumed. Computational Faraday tensor, topology-fixed-point projection." },
];
export const BOLD = ["assuming", "Found.", "Onee-sama", "Seal-sama!!", "The field coupling, found rather than assumed."];
export const DOCK_AT = 1.6;

const V = new Vector3();
const cos = Math.cos(PHI);
const sin = Math.sin(PHI);
// bridge-local to world offset from the pup (the rig's frame): the mouths the tails aim at
const MOUTH = {
  touma: [TOUMA.x * cos + TOUMA.z * sin, DECK_Y + 2.2, -TOUMA.x * sin + TOUMA.z * cos],
  kuroko: [KUROKO.x * cos + KUROKO.z * sin, KUROKO.y + 0.93, -KUROKO.x * sin + KUROKO.z * cos],
  seal: [0, 1.0, 0],
};

const css = /* css */ `
  html[data-cutscene="full"] .comic:not(.fb-lines) .bubble,
  html[data-fb] .cut-title,
  html[data-fb] .comic-sfx { visibility: hidden !important; }
  .fb-banner { position: fixed; left: 0; right: 0; top: 0; z-index: 24; pointer-events: none; }
  .fb-big { position: absolute; left: 0; right: 0; top: 16vh; margin-inline: auto; width: min(760px, calc(100vw - 32px)); text-align: center;
    text-shadow: 0 2px 24px rgba(28, 27, 25, 0.2); color: #1c1b19; transform-origin: 50% 0;
    transition: transform 520ms cubic-bezier(0.3, 0, 0.2, 1), opacity 420ms ease-in; }
  .fb-big::before { content: ""; position: absolute; inset: -28px -48px; z-index: -1; border-radius: 28px;
    background: radial-gradient(ellipse at center, rgba(251, 250, 247, 0.94) 0%, rgba(251, 250, 247, 0.8) 55%, rgba(251, 250, 247, 0) 100%); }
  .fb-big[data-slam="true"] { animation: fb-slam 360ms steps(1, end) both; }
  .fb-big[data-dock="true"] { transform: translateY(-15vh) scale(0.3); opacity: 0; }
  .fb-spark { position: absolute; left: 50%; top: 50%; width: 120%; aspect-ratio: 2.6; translate: -50% -50%; z-index: -1;
    background: conic-gradient(from 0deg, #ffa927 0 8deg, transparent 8deg 30deg, #ffa927 30deg 36deg, transparent 36deg 60deg, #ffa927 60deg 64deg, transparent 64deg 90deg, #ffa927 90deg 96deg, transparent 96deg 120deg, #ffa927 120deg 124deg, transparent 124deg 150deg, #ffa927 150deg 156deg, transparent 156deg 180deg, #ffa927 180deg 186deg, transparent 186deg 210deg, #ffa927 210deg 214deg, transparent 214deg 240deg, #ffa927 240deg 246deg, transparent 246deg 270deg, #ffa927 270deg 276deg, transparent 276deg 300deg, #ffa927 300deg 304deg, transparent 304deg 330deg, #ffa927 330deg 336deg, transparent 336deg);
    -webkit-mask: radial-gradient(ellipse at center, #000 0 14%, transparent 60%); mask: radial-gradient(ellipse at center, #000 0 14%, transparent 60%);
    animation: fb-spark 420ms steps(1, end) both; }
  .fb-big .hud-banner-name { margin: 0; font-size: clamp(40px, 7vw, 88px); line-height: 1; font-weight: 800; letter-spacing: -0.02em; text-transform: uppercase; }
  .fb-big .hud-banner-band { display: block; width: 64px; height: 6px; margin: 0 auto 16px; border-radius: 3px; background: #ffa927; }
  .fb-lab { margin: 14px 0 0; font-size: clamp(16px, 2.2vw, 22px); font-weight: 700; letter-spacing: 0.02em; }
  .fb-tag { margin: 8px 0 0; font-size: clamp(14px, 1.8vw, 19px); opacity: 0.8; }
  .fb-bar { position: absolute; left: 0; right: 0; top: 1.2vh; display: flex; flex-direction: column; align-items: center; gap: 2px; color: #fbfaf7;
    text-align: center; opacity: 0; transition: opacity 360ms ease-out 240ms; padding: 0 340px 0 170px; }
  .fb-bar[data-on="true"] { opacity: 1; }
  .fb-bar strong { font-size: clamp(15px, 3.4vh, 30px); letter-spacing: 0.14em; text-transform: uppercase; }
  .fb-bar span { font-family: var(--font-mono, ui-monospace, monospace); font-size: clamp(10px, 1.5vh, 13px); opacity: 0.8; }
  @media (max-width: 640px) { .fb-bar { padding: 0 12px; } }
  @keyframes fb-slam { 0% { transform: scale(1.05); } 34% { transform: scale(1.05); } 67% { transform: scale(0.99); } 100% { transform: scale(1); } }
  @keyframes fb-spark { 0% { scale: 0.35; opacity: 1; } 34% { scale: 1.15; opacity: 1; } 67% { scale: 1.3; opacity: 0.7; } 100% { scale: 1.4; opacity: 0; } }
  .fb-lines { position: fixed; z-index: 23; }
`;

function Overlay({ still }) {
  const [t, setT] = useState(-1);
  const wrap = useRef(null);
  // the clock, on twos (the page's comic layer does the same)
  useEffect(() => {
    if (still) return undefined;
    let raf = 0;
    let last = -1;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const step = Math.floor(now / 83.3);
      if (step === last) return;
      last = step;
      const w = window.__world;
      const a = live.arrival;
      if (!w?.clock || !a.id) return setT((v) => (v === -2 ? v : -2));
      setT(w.clock.elapsedTime - a.start);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [still]);

  const i = still ? -1 : LINES.findIndex((l) => t >= l.t[0] && t < l.t[1]);
  const line = i >= 0 ? LINES[i] : null;
  const draw = () => {
    const cam = window.__world?.camera;
    const el = wrap.current?.querySelector(".bubble");
    if (!cam || !el || el.offsetWidth < 2 || el.offsetHeight < 2) return;
    const s = live.seal;
    const who = el.dataset.who;
    const m = MOUTH[who] ?? MOUTH.seal;
    V.set(s.x + m[0], m[1], s.z + m[2]).project(cam);
    place(el, (V.x * 0.5 + 0.5) * innerWidth, (0.5 - V.y * 0.5) * innerHeight, el.dataset.slot, false);
  };
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useLayoutEffect(() => drawRef.current(), [line?.id, t]);

  const dock = still ? false : t >= DOCK_AT;
  const shown = still || t >= 0;
  return (
    <>
      <style>{css}</style>
      <div className="fb-banner" aria-live="polite">
        <div className="fb-big" data-slam={shown && !dock ? "true" : "false"} data-dock={dock} style={{ visibility: shown ? "visible" : "hidden" }}>
          {!still ? <span className="fb-spark" aria-hidden="true" /> : null}
          <span className="hud-banner-band" aria-hidden="true" />
          <h2 className="hud-banner-name">Railgun</h2>
          <p className="fb-lab">faraday · lab</p>
          <p className="fb-tag">The field coupling, found rather than assumed.</p>
        </div>
        <div className="fb-bar" data-on={dock && t >= 0}>
          <strong>Railgun</strong>
          <span>faraday · lab</span>
        </div>
      </div>
      <div className="comic fb-lines" ref={wrap} style={{ "--accent": "#ffa927", "--deep": "#07182e", "--paper-dots": "#8fe6ff" }}>
        {line ? <Bubble key={line.id} slot={line.id} who={line.who} kind={line.kind} line={line.text} bold={BOLD} /> : null}
        {still ? <StillKuroko /> : null}
      </div>
    </>
  );
}

// reduced motion: Kuroko's line stands still above the kit's bubbles, which carry the rest
function StillKuroko() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current?.querySelector(".bubble");
    if (!el) return;
    el.style.left = "4vw";
    el.style.bottom = `${Math.max(0.12 * innerHeight, 0.5 * innerHeight - el.offsetHeight)}px`;
    const svg = el.querySelector("svg");
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    for (const b of el.querySelectorAll(".bubble-body")) b.setAttribute("d", `M0 ${h / 2}A${w / 2} ${h / 2} 0 1 0 ${w} ${h / 2}A${w / 2} ${h / 2} 0 1 0 0 ${h / 2}Z`);
  }, []);
  return (
    <div ref={ref}>
      <Bubble slot="fk" who="kuroko" kind="oval" line={LINES[2].text} bold={BOLD} />
    </div>
  );
}

// mount the layer on the page; returns the unmount
export function mountOverlay(still) {
  const host = document.createElement("div");
  host.dataset.faraday = "";
  document.body.appendChild(host);
  document.documentElement.dataset.fb = "";
  const root = createRoot(host);
  root.render(<Overlay still={still} />);
  return () => {
    delete document.documentElement.dataset.fb;
    root.unmount();
    host.remove();
  };
}
