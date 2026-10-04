"use client";

// THE COMIC FRAME: a thick black panel border, speed lines that judder on twos, and the title as a comic caption box
// (yellow rectangle, black outline) below the site nav. Plain DOM from an effect (the move lives in the R3F reconciler).
import { useEffect } from "react";

const CSS = `
.topo-banner { position: fixed; inset: 0; z-index: 30; pointer-events: none; }
.topo-lines { position: absolute; inset: 0; opacity: 0.5; background: repeating-conic-gradient(from 0deg at 50% 55%, #05020a 0deg 0.7deg, transparent 0.7deg 5deg); -webkit-mask-image: radial-gradient(ellipse at 50% 55%, transparent 38%, #000 82%); mask-image: radial-gradient(ellipse at 50% 55%, transparent 38%, #000 82%); animation: topo-judder 167ms steps(1, end) infinite; }
.topo-frame { position: absolute; inset: 0; box-shadow: inset 0 0 0 clamp(8px, 1.4vw, 16px) #05020a, inset 0 0 0 clamp(11px, 1.8vw, 20px) #f0b429, inset 0 0 90px 30px rgba(5, 2, 10, 0.75); }
.topo-dock { position: absolute; left: clamp(14px, 3vw, 36px); top: calc(var(--nav-h, 56px) + 56px); display: flex; flex-direction: column; gap: 2px; padding: 8px 14px 9px; background: #ffd23a; color: #05020a; border: 4px solid #05020a; box-shadow: 5px 5px 0 #05020a; opacity: 0; transform: rotate(-1.2deg); }
.topo-dock strong { font-family: Impact, "Arial Narrow Bold", "Arial Narrow", sans-serif; font-weight: 400; font-size: clamp(15px, 2.6vh, 26px); letter-spacing: 0.1em; text-transform: uppercase; }
.topo-dock span { font-family: var(--font-mono, ui-monospace, monospace); font-size: clamp(10px, 1.5vh, 13px); font-weight: 700; }
.topo-banner[data-dock="1"] .topo-dock { opacity: 1; }
.topo-banner[data-on="0"] .topo-lines, .topo-banner[data-on="0"] .topo-frame { opacity: 0; }
.topo-banner[data-off="1"] { display: none; }
@keyframes topo-judder { 0% { transform: rotate(0deg) scale(1.04); } 50% { transform: rotate(1.6deg) scale(1.06); } }
@media (prefers-reduced-motion: reduce) { .topo-lines { animation: none; } }
`;

export default function Banner({ still = false }) {
  useEffect(() => {
    const el = document.createElement("div");
    el.className = "topo-banner";
    el.id = "topo-banner";
    el.dataset.dock = still ? "1" : "0";
    el.dataset.on = still ? "1" : "0";
    el.setAttribute("aria-live", "polite");
    el.innerHTML = `<style>${CSS}</style><div class="topo-lines"></div><div class="topo-frame"></div><div class="topo-dock"><strong>The Throne Room of Nazarick</strong><span>dsx-ai-factory/topograph #432</span></div>`;
    document.body.appendChild(el);
    document.documentElement.dataset.topoBanner = "on";
    return () => {
      el.remove();
      delete document.documentElement.dataset.topoBanner;
    };
  }, [still]);
  return null;
}
