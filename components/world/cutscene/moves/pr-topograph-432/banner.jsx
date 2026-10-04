"use client";

// THE BANNER: the island's own area banner (cream plate, accent band, the name at clamp(40px, 7vw, 88px),
// weight 800) announcing the scene before any landscape: THE THRONE ROOM OF NAZARICK, the topograph logo,
// dsx-ai-factory/topograph #432. It slams in at 0 s on a mint flash with a two-pose hit-stop, holds through
// the sign and the first impact, and on the stage bloom shrinks up into the top cinema bar (title and repo
// line) where it stays until the collapse. Reduced motion shows the plate, static. Smooth and unstepped:
// it is the site's own HUD, outside the dimension's style.

import { useEffect } from "react";

const CSS = `
.topo-banner { position: fixed; inset: 0; z-index: 30; pointer-events: none; }
.topo-flash { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 30%, rgba(111, 240, 196, 0.5), rgba(111, 240, 196, 0) 62%); opacity: 0; animation: topo-flash 420ms steps(4, end) both; }
.topo-plate { position: absolute; left: 0; right: 0; top: 16vh; margin-inline: auto; width: min(760px, calc(100vw - 32px)); text-align: center; text-shadow: 0 2px 24px rgba(28, 27, 25, 0.2); color: #1c1b19; transform-origin: 50% 0; animation: topo-slam 560ms steps(1, end) both; transition: opacity 420ms cubic-bezier(0.4, 0, 1, 1), transform 480ms cubic-bezier(0.4, 0, 0.6, 1); }
.topo-plate::before { content: ""; position: absolute; inset: -28px -48px; z-index: -1; border-radius: 28px; background: radial-gradient(ellipse at center, rgba(251, 250, 247, 0.94) 0%, rgba(251, 250, 247, 0.82) 58%, rgba(251, 250, 247, 0) 100%); }
.topo-band { display: block; width: 64px; height: 6px; margin: 0 auto 16px; border-radius: 3px; background: #e0b040; }
.topo-name { margin: 0; font-size: clamp(40px, 7vw, 88px); line-height: 1; font-weight: 800; letter-spacing: -0.02em; text-transform: uppercase; }
.topo-logo { display: block; margin: 18px auto 0; height: clamp(34px, 5.4vh, 56px); width: auto; max-width: 70%; object-fit: contain; }
.topo-repo { margin: 12px 0 0; font-family: var(--font-mono, ui-monospace, monospace); font-size: clamp(14px, 2vh, 18px); font-weight: 600; letter-spacing: 0.02em; }
.topo-dock { position: absolute; left: 0; right: 0; top: 6px; display: flex; flex-direction: column; align-items: center; gap: 2px; color: #fbfaf7; text-align: center; opacity: 0; transition: opacity 420ms cubic-bezier(0, 0, 0.2, 1) 160ms; }
.topo-dock strong { font-size: clamp(16px, 3.2vh, 30px); letter-spacing: 0.12em; text-transform: uppercase; }
@media (max-width: 900px) { .topo-dock { top: 66px; gap: 0; } .topo-dock strong { font-size: 15px; letter-spacing: 0.1em; } .topo-dock span { font-size: 10px; } }
.topo-dock span { font-family: var(--font-mono, ui-monospace, monospace); font-size: clamp(10px, 1.5vh, 13px); opacity: 0.75; }
.topo-banner[data-dock="1"] .topo-plate { opacity: 0; transform: translateY(-15vh) scale(0.2); animation: none; }
.topo-banner[data-dock="1"] .topo-dock { opacity: 1; }
.topo-banner[data-off="1"] { display: none; }
html[data-topo-banner] .cut-title { opacity: 0 !important; }
@keyframes topo-flash { 0% { opacity: 1; } 34% { opacity: 0.8; } 67% { opacity: 0.4; } 100% { opacity: 0; } }
@keyframes topo-slam { 0% { transform: scale(1.1) translateY(-12px); opacity: 0; } 17% { transform: scale(1.04) translateY(-4px); opacity: 1; } 50% { transform: scale(1.04) translateY(-4px); } 67% { transform: scale(0.985); } 83% { transform: scale(1.01); } 100% { transform: scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .topo-flash { display: none; } .topo-plate, .topo-dock { animation: none; transition: none; } }
`;

const HTML = (still) => `<style>${CSS}</style>${still ? "" : '<div class="topo-flash" aria-hidden="true"></div>'}
<div class="topo-plate"><span class="topo-band" aria-hidden="true"></span><h2 class="topo-name">The Throne Room of Nazarick</h2><img class="topo-logo" src="/org/topograph.png" alt="topograph"><p class="topo-repo">dsx-ai-factory/topograph #432</p></div>
<div class="topo-dock"><strong>The Throne Room of Nazarick</strong><span>dsx-ai-factory/topograph #432</span></div>`;

// drawn as plain DOM from an effect: the move lives inside the R3F reconciler, where a react-dom portal of
// <style>/<div> is read as a three.js object and throws
export default function Banner({ still = false }) {
  useEffect(() => {
    const el = document.createElement("div");
    el.className = "topo-banner";
    el.id = "topo-banner";
    el.dataset.dock = "0";
    if (still) el.dataset.still = "1";
    el.setAttribute("aria-live", "polite");
    el.innerHTML = HTML(still);
    document.body.appendChild(el);
    document.documentElement.dataset.topoBanner = "on";
    return () => {
      el.remove();
      delete document.documentElement.dataset.topoBanner;
    };
  }, [still]);
  return null;
}
