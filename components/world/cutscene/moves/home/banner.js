// THE BANNER: the first thing on screen, before any landscape. The island's
// own area banner (.hud-banner, app/globals.css) reused: THE IGLOO in big
// uppercase and under it Seal's Topology Land, no numbers, its plate edged as
// a watercolour wash bleeding into the paper. It fades and bleeds in at 0 s
// over about 0.6 s (no slam, no flash), and on the stage bloom drifts up into
// the top cinema bar and stays until the collapse. The HUD hides its own
// banner during a cutscene, so this one is built here, on the page (a plain
// DOM node, taken off again on exit or skip), and this file also lays the
// scene's calm over the shared comic layer (no impact frames, no lettering,
// no second title). Reduced motion: static, in place.

const CSS = `
.home-banner-layer { position: fixed; inset: 0; z-index: 40; pointer-events: none; overflow: hidden; }
.home-banner-layer .hud-banner { top: 16vh; transform-origin: 50% 0; will-change: transform, opacity, filter; transition: none !important; color: var(--ink, #2b3558); text-shadow: 0 1px 14px rgba(255, 244, 228, var(--halo, 0.9)); }
.home-banner-layer .hud-banner::before {
  inset: -34px -64px;
  border-radius: 46% 54% 50% 50% / 58% 48% 52% 42%;
  filter: url(#home-wash);
  opacity: var(--plate, 1);
  background:
    radial-gradient(ellipse at 38% 42%, rgba(255, 236, 214, 0.9) 0%, rgba(252, 243, 230, 0.95) 46%, rgba(231, 214, 220, 0.9) 74%, rgba(139, 166, 206, 0.6) 90%, rgba(139, 166, 206, 0) 100%);
}
.home-banner-layer .hud-banner-band { background: #7fc8f8; opacity: 0.85; }
.home-banner-layer .hud-banner-name { color: var(--ink, #2b3558); }
.home-banner-sub { margin: 14px 0 0; font-size: clamp(14px, 2.2vw, 24px); font-weight: 600; letter-spacing: 0.14em; color: var(--ink, #4a5680); }
html[data-cutscene] .comic-impact, html[data-cutscene] .comic-sfx, html[data-cutscene] .cut-title { display: none !important; }
`;

const WASH = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="home-wash" x="-20%" y="-30%" width="140%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.018 0.026" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Mount the banner and the calm styles; returns { set(t, still), dispose() }.
export function mountBanner() {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  const layer = document.createElement("div");
  layer.className = "home-banner-layer";
  layer.innerHTML = `${WASH}<div class="hud-banner" data-state="open" style="--accent:#7fc8f8"><span class="hud-banner-band" aria-hidden="true"></span><h2 class="hud-banner-name">The Igloo</h2><p class="home-banner-sub">Seal’s Topology Land</p></div>`;
  document.body.appendChild(layer);
  const el = layer.querySelector(".hud-banner");
  return {
    // t: s since the arrival; docks into the top cinema bar from the stage bloom (1.6 s)
    set(t, still) {
      if (still) {
        el.style.opacity = "1";
        el.style.transform = "none";
        el.style.filter = "none";
        el.style.setProperty("--plate", "1");
        return;
      }
      const inK = smooth(0, 0.6, t);
      const dock = smooth(1.6, 2.5, t);
      el.style.opacity = String(inK);
      el.style.filter = `blur(${((1 - inK) * 7).toFixed(1)}px)`;
      // up into the top bar (9 vh): from 16 vh down the page to about 1.2 vh, the name at a third of its size
      const up = -(0.16 * innerHeight - 0.012 * innerHeight) * dock;
      const sc = 1 - 0.66 * dock;
      el.style.transform = `translateY(${up.toFixed(1)}px) scale(${sc.toFixed(3)})`;
      el.style.setProperty("--plate", String((1 - dock).toFixed(3)));
      // dark indigo ink on the paper plate; cream once it sits in the black bar
      el.style.setProperty("--ink", `rgb(${Math.round(43 + 203 * dock)},${Math.round(53 + 184 * dock)},${Math.round(88 + 132 * dock)})`);
      el.style.setProperty("--halo", String((0.9 * (1 - dock)).toFixed(3)));
      el.firstChild.style.opacity = String(1 - dock);
    },
    hide() {
      layer.style.display = "none";
    },
    dispose() {
      layer.remove();
      style.remove();
    },
  };
}
