// The comic-print layer as the site draws it (components/world/ui/Bubbles.jsx, the banner.js CSS): DOM over the picture, the same boxes, inks,
// tails, halftone fringe and pop-in, on the layer's clock so a seek draws what a play draws. Lengths are CSS px of a 1280 x 720 frame.
import { ACCENT, CREAM, BALLOON_INK, INK, IVORY } from "../palette.js";

const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Shantell+Sans:ital,wght,BNCE,INFM@0,300..800,-100..100,0..100&display=swap";
// paletteFor({ id: "p-nerve", stage: { color: "#b3171f" } }): deep (the impact paper) and paperDots
const DEEP = "#401216", DOTS = "#ffbabc";
const CSS = `
.nv { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; --cream: ${CREAM}; --cyan: #2ec5ff; --accent: ${ACCENT}; --deep: ${DEEP}; --dots: ${DOTS}; font-family: var(--font-comic, "Shantell Sans"), var(--font, "Instrument Sans"), system-ui, sans-serif; }
.nv * { box-sizing: border-box; }
.nv-impact { position: absolute; inset: 0; background: radial-gradient(circle, color-mix(in srgb, var(--dots) 50%, transparent) 0 1.7px, transparent 2.2px) 0 0 / 9px 9px, var(--deep); }
.nv-impact i { position: absolute; width: 26vmin; height: 26vmin; margin: -13vmin 0 0 -13vmin; border-radius: 50%; border: 1.4vmin solid var(--cream); }
.nv-impact i:nth-child(1) { border-color: var(--cyan); translate: -6px 3px; opacity: 0.8; }
.nv-impact i:nth-child(2) { border-color: var(--accent); translate: 5px -3px; opacity: 0.8; }
.nv-banner { position: absolute; left: 50%; top: clamp(8px, 2vh, 22px); width: 80vw; min-height: 15vh; max-height: 31vh; box-sizing: border-box; background: #f6edd9; color: #1a1310; border-radius: 6px; box-shadow: 0 14px 34px rgba(0, 0, 0, 0.5), 0 0 0 3px #1a1310; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.6vh 2.4vw 2.4vh; text-align: center; overflow: hidden; animation: nv-banner 1.2s cubic-bezier(0.25, 0.7, 0.3, 1) both; animation-play-state: paused; font-family: var(--font-comic, "Shantell Sans"), system-ui, sans-serif; }
.nv-banner::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: max(6px, 1.1vh); background: #c4131d; }
.nv-banner b { display: block; font-weight: 800; font-size: clamp(25px, 5.4vw, 86px); line-height: 1.04; letter-spacing: -0.01em; }
.nv-banner i { display: block; font-style: normal; font-weight: 600; font-size: clamp(15px, 2.2vw, 32px); letter-spacing: 0.1em; margin-top: 0.5vh; color: #5a4a40; }
@keyframes nv-banner { 0% { clip-path: inset(0 0 100% 0); transform: translate(-50%, -6%); } 25% { clip-path: inset(0 0 -7% 0); transform: translate(-50%, 3%); } 32% { clip-path: inset(0 0 0 0); transform: translate(-50%, 0); } 80% { clip-path: inset(0 0 0 0); transform: translate(-50%, 0); } 100% { clip-path: inset(0 0 100% 0); transform: translate(-50%, -14%); } }
@media (max-width: 600px) { .nv-banner { width: calc(100vw - 32px); } }
.nv-bubble { position: absolute; padding: 1.15em 2em 1.3em; color: ${BALLOON_INK}; transform-origin: 50% 0; filter: drop-shadow(0 10px 18px rgba(12, 8, 30, 0.28)); }
.nv-bubble[data-kind="burst"] { padding: 1.6em 2.4em 1.7em; }
.nv-bubble svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.nv-bubble .ink { fill: var(--cream); stroke: ${BALLOON_INK}; stroke-width: 3; stroke-linejoin: round; }
.nv-bubble .tail.ink { stroke-width: 5; }
.nv-bubble .fill { fill: var(--cream); }
.nv-bubble pattern circle { fill: var(--accent); opacity: 0.42; }
.nv-bubble p { position: relative; margin: 0; text-align: center; line-height: 1.22; font-weight: 500; font-variation-settings: "BNCE" 45, "INFM" 70; }
.nv-bubble p b { font-weight: 800; font-variation-settings: "BNCE" 70, "INFM" 90; }
.nv-bubble[data-kind="burst"] p { rotate: -1.5deg; }
.nv-credit { position: absolute; left: 50%; display: grid; gap: 0.2em; width: max-content; padding: 0.7em 1.1em; text-align: center; background: var(--cream); color: ${BALLOON_INK}; border: 1.5px solid ${BALLOON_INK}; border-radius: 14px; box-shadow: 0 10px 24px rgba(12, 8, 30, 0.28); font-family: var(--font, "Instrument Sans"), system-ui, sans-serif; transform-origin: 50% 0; }
.nv-credit strong { font-weight: 700; line-height: 1.25; }
.nv-credit span { opacity: 0.72; }`;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; parent?.appendChild(e); return e; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pop = (age) => (age < 0.08 ? [0.62, 18] : age < 0.16 ? [1.08, -4] : age < 0.24 ? [0.98, 0] : [1, 0]);

function burst(w, h) {
  let d = "";
  for (let i = 0; i < 52; i++) {
    const a = (i / 52) * Math.PI * 2, r = i % 2 ? 1.0 : 0.88 + 0.05 * Math.sin(i * 2.3);
    d += `${i ? "L" : "M"}${(w / 2 + Math.cos(a) * (w / 2) * r * 1.04).toFixed(1)} ${(h / 2 + Math.sin(a) * (h / 2) * r * 1.12).toFixed(1)}`;
  }
  return `${d}Z`;
}

export function comicFace(then) {
  const own = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim();
  let l = document.getElementById("nv-font");
  if (!own && !l) { l = el("link", "", document.head); l.id = "nv-font"; l.rel = "stylesheet"; l.href = FONTS; }
  if (then) own || l.sheet ? then() : l.addEventListener("load", then, { once: true });
  return own || '"Shantell Sans", sans-serif';
}

export class Comic {
  constructor(host) {
    this.host = host;
    if (!document.getElementById("nv-css")) {
      el("style", "", document.head).id = "nv-css";
      document.getElementById("nv-css").textContent = CSS;
      comicFace();
    }
    this.root = el("div", "nv", host);
    this.impact = el("div", "nv-impact", this.root, "<i></i><i></i><i></i>");
    this.banner = el("div", "nv-banner", this.root, "<b>Death Note: The Bells Are Loud</b><i>nerve</i>");
    this.bubbles = {};
    this.credit = el("div", "nv-credit", this.root);
    this.born = performance.now(); this.n = 0;
  }

  bubble(slot, kind, text, bold) {
    const b = el("div", "nv-bubble", this.root);
    b.dataset.kind = kind;
    const dots = kind === "burst" ? `<path class="body dots" fill="url(#nv-ht-${slot})" mask="url(#nv-m-${slot})"/>` : "";
    b.innerHTML = `<svg aria-hidden="true"><defs><pattern id="nv-ht-${slot}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.7"/></pattern>
      <linearGradient id="nv-fade-${slot}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="nv-m-${slot}"><rect width="100%" height="100%" fill="url(#nv-fade-${slot})"/></mask></defs>
      <path class="tail ink"/><path class="body ink"/><path class="tail fill"/>${dots}</svg><p></p>`;
    const p = b.querySelector("p"), marks = new Set([].concat(bold ?? []));
    const parts = marks.size ? text.split(new RegExp(`(${[...marks].map(esc).join("|")})`)) : [text];
    for (const part of parts) (marks.has(part) ? el("b", "", p) : p).append(part);
    return b;
  }

  // one frame. s: { banner: age s | null, impact: [u, v, scale] | null, lines: [{ slot, kind, text, bold, age, at: [px, py] the tail aims at, left }],
  // credit: { title, sub, ret, age } | null, warm: line templates laid out unseen for the first half second, card: credit template, avoid: [x0, y0, x1, y1] px }
  frame(s) {
    const W = this.host.clientWidth || 1280, H = this.host.clientHeight || 720, fs = clamp(0.011 * W + 12, 20, 27);
    this.banner.style.display = s.banner != null ? "block" : "none";
    if (s.banner != null) this.banner.style.animationDelay = `${-s.banner}s`;
    this.impact.style.display = s.impact ? "block" : "none";
    if (s.impact) { for (const i of this.impact.children) { i.style.left = `${s.impact[0] * 100}%`; i.style.top = `${s.impact[1] * 100}%`; } this.impact.style.scale = s.impact[2]; }
    const hit = (a, r) => a && r[0] < a[2] && r[2] > a[0] && r[1] < a[3] && r[3] > a[1];
    const live = new Set();
    // the first half second also lays the warm bursts and the card out, unseen, so a burst's fringe (an SVG pattern under a mask) is rasterised before it pops
    const warming = ++this.n <= 6 || performance.now() - this.born < 500;
    const ghosts = warming ? (s.warm ?? []).filter((w) => !s.lines.some((l) => l.slot === w.slot)).map((w) => ({ ...w, ghost: true })) : [];
    for (const l of [...s.lines, ...ghosts]) {
      const b = (this.bubbles[l.slot] ??= this.bubble(l.slot, l.kind, l.text, l.bold));
      live.add(l.slot);
      const av = l.ghost ? null : s.avoid;
      b.style.display = "block"; b.style.opacity = l.ghost ? "0.004" : "";
      b.style.fontSize = `${fs}px`;
      const full = Math.min(0.92 * W, 25 * fs), place = (width) => {
        b.style.width = `${width}px`;
        const w = b.offsetWidth, h = b.offsetHeight, bottom = Math.min(0.12 * H, 0.5 * H - h);
        return { w, h, bottom, top: H - bottom - h, fit: (x) => clamp(x, 0.03 * W, W - 0.03 * W - w) };
      };
      let { w, h, bottom, top, fit } = place(full), left = fit(l.left != null ? l.left * W : l.at[0] - w * 0.4);
      const low = av ? [0.08 * H, 0.045 * H, 6].map((gap) => H - av[3] - gap - h).find((v) => v >= 0.03 * H) : undefined;
      if (hit(av, [left, top - 0.07 * H, left + w, top + h]) && low < bottom) { bottom = low; top = H - bottom - h; }
      else if (hit(av, [left, top, left + w, top + h])) {
        const roomR = 0.97 * W - av[2], roomL = av[0] - 0.03 * W, right = roomR >= roomL, room = Math.max(roomR, roomL);
        if (room >= 0.3 * W) {
          ({ w, h, bottom, top, fit } = place(Math.min(full, room)));
          left = right ? W - 0.03 * W - w : 0.03 * W;
        } else {
          // never narrower than 0.30 W (no column of words): keep the width, drop to 12 percent of the height, lift clear of the avoid box
          ({ w, h, bottom, top, fit } = place(0.3 * W));
          left = fit(l.left != null ? l.left * W : l.at[0] - w * 0.4);
          bottom = 0.12 * H; top = H - bottom - h;
          if (hit(av, [left, top, left + w, top + h])) bottom = Math.min(0.5 * H - h, bottom + (top + h - av[1]) + 0.02 * H);
          top = H - bottom - h;
        }
      }
      b.style.left = `${left}px`; b.style.bottom = `${bottom}px`;
      const [k, dy] = pop(l.age);
      b.style.scale = k; b.style.translate = `0 ${dy}px`;
      const rx = w / 2, ry = h / 2, bx = clamp(l.at[0] - left, w * 0.25, w * 0.75), by = ry - ry * Math.sqrt(1 - ((bx - rx) / rx) ** 2) + 14;
      const tx = l.at[0] - left, ty = l.at[1] - top, len = Math.hypot(tx - bx, ty - by) || 1, ux = (tx - bx) / len, uy = (ty - by) / len, L0 = clamp(0.1 * H, 56, 104) + 14;
      const tip = [left + bx + ux * L0, top + by + uy * L0], L = av && uy < 0 && tip[1] < av[3] + 4 && tip[0] > av[0] && tip[0] < av[2] ? Math.max(24, (top + by - av[3] - 4) / -uy) : clamp(len - 0.03 * H, L0, 0.5 * H);
      const px = bx + ux * L, py = by + uy * L, half = Math.min(24, w * 0.05), bow = (ux > 0 ? -1 : 1) * 0.28 * L, cx = (bx + px) / 2 - uy * bow, cy = (by + py) / 2 + ux * bow;
      const key = `${l.slot}|${w}|${h}|${Math.round(bx)}|${Math.round(px)}|${Math.round(py)}`;
      if (b.dataset.key !== key) {
        b.dataset.key = key;
        b.querySelector("svg").setAttribute("viewBox", `0 0 ${w} ${h}`);
        for (const p of b.querySelectorAll(".tail")) p.setAttribute("d", `M${bx - half} ${by} Q${cx - half * 0.3} ${cy} ${px} ${py} Q${cx + half * 0.5} ${cy} ${bx + half} ${by}Z`);
        for (const p of b.querySelectorAll(".body")) p.setAttribute("d", l.kind === "burst" ? burst(w, h) : `M0 ${ry}A${rx} ${ry} 0 1 0 ${w} ${ry}A${rx} ${ry} 0 1 0 0 ${ry}Z`);
      }
    }
    for (const [slot, b] of Object.entries(this.bubbles)) if (!live.has(slot)) b.style.display = "none";
    const c = this.credit, cr = s.credit ?? (warming && s.card ? { ...s.card, age: 1 } : null);
    c.style.display = cr ? "grid" : "none"; c.style.opacity = s.credit ? "" : "0.004";
    if (cr) {
      if (!c.childElementCount) { el("strong", "", c).textContent = cr.title; el("span", "", c).textContent = cr.sub; el("span", "", c).textContent = cr.ret; }
      c.style.bottom = `${0.17 * H}px`;
      c.style.minWidth = `${Math.min(560, 0.8 * W)}px`; c.style.maxWidth = `${Math.min(0.92 * W, 640)}px`;
      c.firstChild.style.fontSize = `${clamp(0.022 * W, 16, 24)}px`;
      for (const sp of [c.children[1], c.children[2]]) sp.style.fontSize = `${clamp(0.016 * W, 13, 18)}px`;
      const [k, dy] = pop(cr.age);
      c.style.scale = k; c.style.translate = `-50% ${dy}px`;
    }
  }

  dispose() { this.root.remove(); }
}
