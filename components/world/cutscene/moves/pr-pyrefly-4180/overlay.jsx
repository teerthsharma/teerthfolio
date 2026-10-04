"use client";

// THE SITE'S OWN HUD for this dock, built inside the dock folder (the kit has no banner and one line too few):
//  - THE BANNER: the island's area banner reused (.hud-banner-band, .hud-banner-name from app/globals.css): the cream
//    plate, the accent band, the name at clamp(40px, 7vw, 88px) weight 800, then the facebook logo and the repo line.
//    UPPER third (16vh), never the lower half. It slams in at 0 s with a gold chain-link flash, a scale-in from 0.96
//    and a small hit-stop, holds through the sign and the first impact, and on the stage bloom shrinks up into the
//    top cinema bar, where it stays (title and repo line) until the collapse. Static under reduced motion.
//  - KUSHINA'S LINE: a cream bubble (the HUD's own Bubble) with its tail to her, stacked above the others.
// It is a separate React root mounted by the move and unmounted with it, so a skip removes all of it at once.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bubble, place } from "../../../ui/Bubbles";
import { live } from "../../../../../lib/world/store";

const CSS = `
.pyre-hud{position:fixed;inset:0;z-index:25;pointer-events:none;overflow:hidden}
.pyre-hud .comic{position:absolute;inset:0;--accent:#e0452a;--deep:#1d1240;--paper-dots:#cebaff}
.cut-title{opacity:0 !important}
.pyre-banner{position:absolute;left:0;right:0;top:16vh;margin-inline:auto;width:min(1180px,calc(100vw - 2 * var(--gutter,16px)));text-align:center;color:#120e08;opacity:0;transform:scale(.96);transform-origin:50% 0}
.pyre-banner::before{content:"";position:absolute;inset:-26px -44px;z-index:-1;border-radius:26px;background:linear-gradient(180deg,rgba(232,211,164,.98),rgba(214,186,128,.98));box-shadow:0 0 0 3px rgba(29,18,64,.85),0 12px 44px rgba(10,5,24,.6)}
.pyre-banner .hud-banner-band{background:#e0a82e}
.pyre-banner .hud-banner-name{color:#120e08;text-shadow:none;text-wrap:balance}
.pyre-banner .pyre-repo{display:flex;align-items:center;justify-content:center;gap:10px;margin:16px 0 0}
.pyre-banner .pyre-repo img{width:28px;height:28px;object-fit:contain}
.pyre-banner .pyre-repo span{font-family:var(--mono);font-size:15px;color:#2b2233}
.pyre-banner[data-ph="live"]{animation:pyre-life 2.3s linear forwards}
.pyre-banner[data-ph="still"]{opacity:1;transform:none}
@keyframes pyre-life{0%{opacity:0;transform:scale(.96)}6%{opacity:1;transform:scale(1.035);animation-timing-function:step-end}14%{opacity:1;transform:scale(1.035)}17%{opacity:1;transform:scale(1)}68%{opacity:1;transform:translateY(0) scale(1);animation-timing-function:cubic-bezier(.5,0,.8,.3)}86%{opacity:.9;transform:translateY(-6vh) scale(.62)}100%{opacity:0;transform:translateY(-13vh) scale(.28)}}
.pyre-flash{position:absolute;left:50%;top:calc(16vh + 5vw);width:0;height:0;pointer-events:none}
.pyre-flash i{position:absolute;left:-90px;top:-44px;width:120px;height:88px;border:10px solid #e8b53c;border-radius:44px;box-shadow:0 0 36px #ffd36a,inset 0 0 18px #ffd36a;opacity:0}
.pyre-flash i+i{left:-30px;transform:rotate(0deg)}
.pyre-flash i{animation:pyre-link 520ms ease-out forwards}
.pyre-flash i+i{animation-delay:60ms}
@keyframes pyre-link{0%{opacity:1;transform:scale(.5)}60%{opacity:.9}100%{opacity:0;transform:scale(2.6)}}
.pyre-dock{position:absolute;left:0;right:0;top:1.2vh;display:flex;flex-direction:column;align-items:center;gap:2px;color:#fbfaf7;text-align:center;opacity:0}
.pyre-dock[data-live="1"]{animation:pyre-dock 420ms ease-out 1.75s forwards}
@keyframes pyre-dock{from{opacity:0}to{opacity:1}}
.pyre-dock strong{font-size:clamp(15px,2.6vh,28px);letter-spacing:.14em;text-transform:uppercase}
.pyre-dock span{font-family:var(--font-mono,ui-monospace,monospace);font-size:clamp(10px,1.5vh,13px);opacity:.78}
@media (max-width:1000px){.pyre-dock{padding:0 12px}}
`;

const BOLD = ["dattebane!"];

function Overlay({ mode, K, shared }) {
  const still = mode === "still";
  const [kOn, setKOn] = useState(still);
  const box = useRef(null);

  // Kushina's window: the render clock, seconds since the arrival (the banner needs none: it is all CSS from the mount)
  useEffect(() => {
    if (still) return undefined;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const a = live.arrival;
      const clock = window.__world?.clock;
      if (!a.id || !clock) return;
      const t = clock.elapsedTime - a.start;
      setKOn((p) => {
        const n = t >= K[0] && t < K[1];
        return n === p ? p : n;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [still, K]);

  // Kushina's bubble: laid out on twos like the others, its tail to her mouth, stacked clear of the other bubbles
  useLayoutEffect(() => {
    const el = box.current?.querySelector(".bubble");
    if (!el || !kOn) return undefined;
    let raf = 0;
    let last = -1;
    const lay = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const mx = still ? 0.12 * W : shared.x;
      const my = still ? 0.42 * H : shared.y;
      el.style.width = "min(92vw, 11.5em)";
      place(el, mx, my, "a", false);
      const left = parseFloat(el.style.left);
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const floor = 0.12 * H;
      let b = floor;
      for (const o of document.querySelectorAll(".comic .bubble")) {
        if (el.contains(o) || box.current?.contains(o)) continue;
        const l = o.offsetLeft;
        if (l < left + w + 8 && l + o.offsetWidth > left - 8) b = Math.max(b, parseFloat(o.style.bottom || "0") + o.offsetHeight + 0.02 * H);
      }
      if (b > floor && b + h <= 0.5 * H) {
        // re-aim the tail for the raised box
        place(el, mx, my - (b - floor), "a", false);
        el.style.bottom = `${b}px`;
      }
    };
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const step = Math.floor(now / 83.3);
      if (step === last) return;
      last = step;
      lay();
    };
    lay();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kOn, still, shared]);

  const ph = still ? "still" : "live";
  return (
    <div className="pyre-hud">
      <style>{CSS}</style>
      {still ? null : (
        <div className="pyre-flash" aria-hidden="true">
          <i />
          <i />
        </div>
      )}
      <div className="pyre-banner" data-ph={ph} aria-live="polite">
        <span className="hud-banner-band" aria-hidden="true" />
        <h2 className="hud-banner-name">The Night of the Nine Tails</h2>
        <p className="pyre-repo">
          <img src="/org/facebook.png" alt="" width="28" height="28" />
          <span>facebook/pyrefly #4180</span>
        </p>
      </div>
      <div className="pyre-dock" data-live={still ? "0" : "1"}>
        <strong>The Night of the Nine Tails</strong>
        <span>facebook/pyrefly #4180</span>
      </div>
      <div className="comic" ref={box}>
        {kOn ? <Bubble slot="a" who="sil" kind="burst" line="…dattebane!" bold={BOLD} /> : null}
      </div>
    </div>
  );
}

// mount into <body>; returns the unmount (a skip or the end of the scene)
export function mountOverlay(props) {
  const host = document.createElement("div");
  host.className = "pyre-host";
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(<Overlay {...props} />);
  return () => {
    root.unmount();
    host.remove();
  };
}
