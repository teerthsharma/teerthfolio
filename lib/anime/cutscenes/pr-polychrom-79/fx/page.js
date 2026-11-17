// THE COMIC-PRINT LAYER of pr-polychrom-79: DOM over the picture, the site's own balloon boxes, inks, tails, halftone fringe and pop-in (components/world/ui/Bubbles.jsx,
// app/globals.css), driven by the clock on twos. Lengths are CSS px of a 1280 x 720 frame; a bold span is any string in the line's `bold` array.
import { PAL } from "../pal.js";

const NS = "http://www.w3.org/2000/svg";
const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Shantell+Sans:ital,wght,BNCE,INFM@0,300..800,-100..100,0..100&display=swap";
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SHADOW = `rgba(28, 6, 24, 0.28)`;
const CSS = `
.pg79 { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; --cream: ${PAL.cream}; --accent: ${PAL.red}; --dots: ${PAL.dots}; font-family: var(--font-comic, "Shantell Sans"), var(--font, "Instrument Sans"), system-ui, sans-serif; }
.pg79 * { box-sizing: border-box; }
.pg79-bubble { position: absolute; padding: 1.15em 2em 1.3em; color: ${PAL.ink}; transform-origin: 50% 0; filter: drop-shadow(0 10px 18px ${SHADOW}); }
.pg79-bubble[data-kind="burst"] { padding: 1.6em 2.4em 1.7em; }
.pg79-bubble svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.pg79-bubble .ink { fill: var(--cream); stroke: ${PAL.ink}; stroke-width: 3; stroke-linejoin: round; }
.pg79-bubble .tail.ink { stroke-width: 5; }
.pg79-bubble .fill { fill: var(--cream); }
.pg79-bubble pattern circle { fill: var(--accent); opacity: 0.42; }
.pg79-bubble p { position: relative; margin: 0; text-align: center; line-height: 1.22; font-weight: 500; font-variation-settings: "BNCE" 45, "INFM" 70; }
.pg79-bubble p b { font-weight: 800; font-variation-settings: "BNCE" 70, "INFM" 90; }
.pg79-bubble[data-kind="burst"] p { rotate: -1.5deg; }
.pg79-credit { position: absolute; left: 50%; display: grid; gap: 0.2em; width: max-content; padding: 0.7em 1.1em; text-align: center; background: var(--cream); color: ${PAL.ink}; border: 1.5px solid ${PAL.ink}; border-radius: 14px; box-shadow: 0 10px 24px ${SHADOW}; font-family: var(--font, "Instrument Sans"), system-ui, sans-serif; transform-origin: 50% 0; }
.pg79-credit strong { font-weight: 700; line-height: 1.25; }
.pg79-credit span { opacity: 0.72; }`;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; parent?.appendChild(e); return e; };
// the bubble's pop, on twos (the site's bubble-in keyframes under steps(1, end)): [scale, drop px]
// the live boxes (LIVE.md section 1, read off tiles 3 to 18): the left and bottom fractions of the frame, bottom measured from the top edge of the frame
const ANCHOR = { a: { left: 0.46, bottom: 0.86 }, b: { left: 0.04, bottom: 0.88 }, c: { left: 0.03, bottom: 0.88 } };
const pop = (age) => (age < 0.08 ? [0.62, 18] : age < 0.16 ? [1.08, -4] : age < 0.24 ? [0.98, 0] : [1, 0]);

function burst(w, h) {
  let d = "";
  for (let i = 0; i < 52; i++) {
    const a = (i / 52) * Math.PI * 2, r = i % 2 ? 1.0 : 0.88 + 0.05 * Math.sin(i * 2.3);
    d += `${i ? "L" : "M"}${(w / 2 + Math.cos(a) * (w / 2) * r * 1.04).toFixed(1)} ${(h / 2 + Math.sin(a) * (h / 2) * r * 1.12).toFixed(1)}`;
  }
  return `${d}Z`;
}

// the comic face: inside the site the page's own (--font-comic); a bare lab page fetches the same family. `then` runs once the face is known
export function comicFace(then) {
  const own = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim();
  let l = document.getElementById("pg79-font");
  if (!own && !l) { l = el("link", "", document.head); l.id = "pg79-font"; l.rel = "stylesheet"; l.href = FONTS; }
  if (then) own || l.sheet ? then() : l.addEventListener("load", then, { once: true });
  return own || '"Shantell Sans", sans-serif';
}

export class Comic {
  constructor(host) {
    this.host = host;
    if (!document.getElementById("pg79-css")) {
      el("style", "", document.head).id = "pg79-css";
      document.getElementById("pg79-css").textContent = CSS;
      comicFace();
    }
    this.root = el("div", "pg79", host);
    this.bubbles = {};
    this.credit = el("div", "pg79-credit", this.root);
    this.born = performance.now(); this.n = 0;
  }

  bubble(slot, kind, text, bold) {
    const b = el("div", "pg79-bubble", this.root);
    b.dataset.kind = kind;
    const dots = kind === "burst" ? `<path class="body dots" fill="url(#pg79-ht-${slot})" mask="url(#pg79-m-${slot})"/>` : "";
    b.innerHTML = `<svg aria-hidden="true"><defs><pattern id="pg79-ht-${slot}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.7"/></pattern>
      <linearGradient id="pg79-fade-${slot}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="pg79-m-${slot}"><rect width="100%" height="100%" fill="url(#pg79-fade-${slot})"/></mask></defs>
      <path class="tail ink"/><path class="body ink"/><path class="tail fill"/>${dots}</svg><p></p>`;
    const p = b.querySelector("p");
    if (bold.length) {
      const parts = text.split(new RegExp(`(${bold.map(esc).join("|")})`));
      parts.forEach((part, i) => (i % 2 ? el("b", "", p) : p).append(part));
    } else p.append(text);
    return b;
  }

  frame(s) {
    const W = this.host.clientWidth || 1280, H = this.host.clientHeight || 720, fs = clamp(0.011 * W + 12, 20, 27);
    const hit = (a, r) => a && r[0] < a[2] && r[2] > a[0] && r[1] < a[3] && r[3] > a[1];
    const live = new Set();
    // for its first half second the layer also lays the bursts and the card out (`warm`, `card`), all but unseen and wherever the seal stands, so a burst's fringe
    const warming = ++this.n <= 6 || performance.now() - this.born < 500;
    const ghosts = warming ? (s.warm ?? []).filter((w) => !s.lines.some((l) => l.slot === w.slot)).map((w) => ({ ...w, ghost: true })) : [];
    for (const l of [...s.lines, ...ghosts]) {
      const bold = l.bold ?? [];
      const b = (this.bubbles[l.slot] ??= this.bubble(l.slot, l.kind, l.text, bold));
      live.add(l.slot);
      const av = l.ghost ? null : s.avoid;
      b.style.display = "block"; b.style.opacity = l.ghost ? "0.004" : "";
      b.style.fontSize = `${fs}px`;
      const an = ANCHOR[l.slot] ?? ANCHOR.c, full = (l.slot === "a" ? 0.5 : 0.52) * W, drift = l.slot === "b" ? 0.12 * Math.max(0, 1 - l.age / 0.4) : 0;
      const place = (width) => {
        b.style.width = `${width}px`;
        const w = b.offsetWidth, h = b.offsetHeight, bottom = Math.min(Math.max(0.08 * H, (1 - an.bottom) * H), 0.5 * H - h);
        return { w, h, bottom, top: H - bottom - h, fit: (x) => clamp(x, 0.03 * W, W - 0.03 * W - w) };
      };
      // the live's box (beside or under the speaker, lower half); off the face: lowered when that clears it, else it stays over the body
      let { w, h, bottom, top, fit } = place(full), left = fit((an.left + drift) * W);
      const low = av ? [0.08 * H, 0.045 * H, 6].map((gap) => H - av[3] - gap - h).find((v) => v >= 0.03 * H) : undefined;
      if (hit(av, [left, top - 0.07 * H, left + w, top + h]) && low < bottom) bottom = low;
      bottom = Math.min(bottom, H - h - 0.02 * H); top = H - bottom - h;
      b.style.left = `${left}px`; b.style.bottom = `${bottom}px`;
      const [k, dy] = pop(l.age);
      b.style.scale = k; b.style.translate = `0 ${dy}px`;
      const aimAt = l.tail === "ur" ? [left + 0.92 * w, top - 0.1 * H] : l.tail === "ul" ? [left + 0.08 * w, top - 0.1 * H] : l.at;
      const rx = w / 2, ry = h / 2, bx = clamp(aimAt[0] - left, w * 0.25, w * 0.75), by = ry - ry * Math.sqrt(1 - ((bx - rx) / rx) ** 2) + 14;
      const tx = aimAt[0] - left, ty = aimAt[1] - top, len = Math.hypot(tx - bx, ty - by) || 1, ux = (tx - bx) / len, uy = (ty - by) / len, L0 = clamp(0.1 * H, 56, 104) + 14;
      const tip = [left + bx + ux * L0, top + by + uy * L0], L = av && uy < 0 && tip[1] < av[3] + 4 && tip[0] > av[0] && tip[0] < av[2] ? Math.max(24, (top + by - av[3] - 4) / -uy) : L0;
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
      if (!c.firstChild) { el("strong", "", c).textContent = cr.title; el("span", "", c).textContent = cr.sub; }
      c.style.bottom = `${0.1 * H}px`;
      c.style.minWidth = c.style.maxWidth = `${0.36 * W}px`;
      c.firstChild.style.fontSize = `${clamp(0.022 * W, 16, 24)}px`; c.lastChild.style.fontSize = `${clamp(0.016 * W, 13, 18)}px`;
      const [k, dy] = pop(cr.age);
      c.style.scale = k * (1 - (cr.fold ?? 0)); c.style.translate = `-50% ${dy}px`;
    }
  }

  dispose() { this.root.remove(); }
}
