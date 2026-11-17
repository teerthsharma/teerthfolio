// THE COMIC-PRINT LAYER of p-separatrix: the balloons and the credit card as DOM over the picture, the site's boxes, inks, tails and pop-in, on twos.
// Text and timing are the live card's; the caller passes tail targets and the seal's box, in frame fractions of the page (y down, in px through frame()).
import { LINE } from "../clock.js";
import { CREAM, INK } from "../tone.js";

const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Shantell+Sans:ital,wght,BNCE,INFM@0,300..800,-100..100,0..100&display=swap";
const CSS = `
.sx22 { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; font-family: var(--font-comic, "Shantell Sans"), var(--font, "Instrument Sans"), system-ui, sans-serif; }
.sx22 * { box-sizing: border-box; }
.sx22-bubble { position: absolute; padding: 1.15em 2em 1.3em; color: ${INK}; transform-origin: 50% 0; filter: drop-shadow(0 10px 18px rgba(12, 8, 30, 0.28)); }
.sx22-bubble[data-kind="burst"] { padding: 1.6em 2.4em 1.7em; }
.sx22-bubble svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.sx22-bubble .ink { fill: ${CREAM}; stroke: ${INK}; stroke-width: 3; stroke-linejoin: round; }
.sx22-bubble .tail.ink { stroke-width: 5; }
.sx22-bubble .fill { fill: ${CREAM}; }
.sx22-bubble pattern circle { fill: #d9a441; opacity: 0.42; }
.sx22-bubble p { position: relative; margin: 0; text-align: center; line-height: 1.22; font-weight: 500; font-variation-settings: "BNCE" 45, "INFM" 70; }
.sx22-bubble p b { font-weight: 800; font-variation-settings: "BNCE" 70, "INFM" 90; }
.sx22-bubble[data-kind="burst"] p { rotate: -1.5deg; }
.sx22-card { position: absolute; left: 50%; display: grid; gap: 0.2em; width: max-content; padding: 0.7em 1.1em; text-align: center; background: ${CREAM}; color: ${INK}; border: 1.5px solid ${INK}; border-radius: 14px; box-shadow: 0 10px 24px rgba(12, 8, 30, 0.28); font-family: var(--font, "Instrument Sans"), system-ui, sans-serif; transform-origin: 50% 0; }
.sx22-card strong { font-weight: 700; line-height: 1.25; }
.sx22-card span, .sx22-card em { font-style: normal; line-height: 1.3; }
.sx22-card span { opacity: 0.72; }`;

export const LINES = {
  a: { kind: "oval", text: "King Crimson! Only the result remains!", bold: "result", from: LINE.A, to: LINE.B },
  b: { kind: "oval", text: "You will never arrive at the truth.", bold: "truth", from: LINE.B, to: LINE.C },
  c: { kind: "burst", text: "Top-k, argmin and threshold: certified or refused. Decided by the data, not by rounding.", bold: "certified or refused.",
    narrow: "Certified or refused. Decided by the data, not by rounding.", narrowBold: "Certified or refused.", from: LINE.C, to: LINE.credit },
};
export const CARD = { title: "separatrix", sub: "top-k, argmin and threshold · certified or refused", ret: "Returned to zero: the seal is back where it started.", from: LINE.credit, to: LINE.collapse[0] };

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; parent?.appendChild(e); return e; };
const hit = (a, r) => a && r[0] < a[2] && r[2] > a[0] && r[1] < a[3] && r[3] > a[1];
const pop = (age) => (age < 0.08 ? [0.62, 18] : age < 0.16 ? [1.08, -4] : age < 0.24 ? [0.98, 0] : [1, 0]);
const twos = (age) => Math.max(0, Math.floor(age * 12 + 1e-6) / 12);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function burst(w, h) {
  let d = "";
  for (let i = 0; i < 52; i++) {
    const a = (i / 52) * Math.PI * 2, r = i % 2 ? 1.0 : 0.88 + 0.05 * Math.sin(i * 2.3);
    d += `${i ? "L" : "M"}${(w / 2 + Math.cos(a) * (w / 2) * r * 1.04).toFixed(1)} ${(h / 2 + Math.sin(a) * (h / 2) * r * 1.12).toFixed(1)}`;
  }
  return `${d}Z`;
}

// the comic face: the page's own (--font-comic) inside the site; a bare lab page fetches the same family. `then` runs once the face is known
export function comicFace(then) {
  const own = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim();
  let l = document.getElementById("sx22-font");
  if (!own && !l) { l = el("link", "", document.head); l.id = "sx22-font"; l.rel = "stylesheet"; l.href = FONTS; }
  if (then) own || l.sheet ? then() : l.addEventListener("load", then, { once: true });
  return own || '"Shantell Sans", sans-serif';
}

export class Comic {
  constructor(host) {
    this.host = host;
    if (!document.getElementById("sx22-css")) {
      el("style", "", document.head).id = "sx22-css";
      document.getElementById("sx22-css").textContent = CSS;
      comicFace();
    }
    this.root = el("div", "sx22", host);
    this.bubbles = {};
    this.card = el("div", "sx22-card", this.root);
    this.born = performance.now(); this.n = 0;
  }

  bubble(slot, kind, text, bold) {
    const b = el("div", "sx22-bubble", this.root);
    b.dataset.kind = kind;
    const dots = kind === "burst" ? `<path class="body dots" fill="url(#sx22-ht-${slot})" mask="url(#sx22-m-${slot})"/>` : "";
    b.innerHTML = `<svg aria-hidden="true"><defs><pattern id="sx22-ht-${slot}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.7"/></pattern>
      <linearGradient id="sx22-fade-${slot}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="sx22-m-${slot}"><rect width="100%" height="100%" fill="url(#sx22-fade-${slot})"/></mask></defs>
      <path class="tail ink"/><path class="body ink"/><path class="tail fill"/>${dots}</svg><p></p>`;
    const p = b.querySelector("p");
    for (const part of bold ? text.split(new RegExp(`(${escape(bold)})`)) : [text]) (part === bold ? el("b", "", p) : p).append(part);
    return b;
  }

  // one frame at real time t. s: { anchors: { a, b, c } tail targets in px, avoid: [x0, y0, x1, y1] px or null, hidden: bool (an impact panel is on) }
  frame(t, s = {}) {
    const W = this.host.clientWidth || 1280, H = this.host.clientHeight || 720, fs = clamp(0.011 * W + 12, 20, 27);
    const warming = ++this.n <= 6 || performance.now() - this.born < 500;
    const at = (slot) => s.anchors?.[slot] ?? [0.6 * W, 0.4 * H];
    const live = [];
    if (!s.hidden) for (const [slot, v] of Object.entries(LINES)) {
      if (t < v.from || t >= v.to) continue;
      const narrow = W <= 600 && v.narrow;
      live.push({ slot, kind: v.kind, text: narrow ? v.narrow : v.text, bold: narrow ? v.narrowBold : v.bold, at: at(slot), age: twos(t - v.from), ghost: false });
    }
    const ghosts = warming ? Object.entries(LINES).filter(([slot]) => !live.some((l) => l.slot === slot))
      .map(([slot, v]) => ({ slot, kind: v.kind, text: v.text, bold: v.bold, at: at(slot), age: 1, ghost: true })) : [];
    const shown = new Set();
    for (const l of [...live, ...ghosts]) {
      const b = (this.bubbles[l.slot] ??= this.bubble(l.slot, l.kind, l.text, l.bold));
      shown.add(l.slot);
      const av = l.ghost ? null : s.avoid;
      b.style.display = "block"; b.style.opacity = l.ghost ? "0.004" : "";
      b.style.fontSize = `${fs}px`;
      const full = Math.min(0.92 * W, 25 * fs), place = (width) => {
        b.style.width = `${width}px`;
        const w = b.offsetWidth, h = b.offsetHeight, bottom = Math.min(0.12 * H, 0.5 * H - h);
        return { w, h, bottom, top: H - bottom - h, fit: (x) => clamp(x, 0.03 * W, W - 0.03 * W - w) };
      };
      let { w, h, bottom, top, fit } = place(full), left = fit(l.at[0] - w * 0.4);
      const low = av ? [0.08 * H, 0.045 * H, 6].map((gap) => H - av[3] - gap - h).find((y) => y >= 0.03 * H) : undefined;
      if (hit(av, [left, top - 0.07 * H, left + w, top + h]) && low < bottom) { bottom = low; top = H - bottom - h; }
      else if (hit(av, [left, top, left + w, top + h])) {
        const roomR = 0.97 * W - av[2], roomL = av[0] - 0.03 * W, right = roomR >= roomL, room = Math.max(roomR, roomL);
        if (room < 13 * fs) { b.style.display = "none"; shown.delete(l.slot); continue; }
        ({ w, h, bottom, top, fit } = place(Math.min(full, room)));
        left = right ? W - 0.03 * W - w : 0.03 * W;
      }
      b.style.left = `${left}px`; b.style.bottom = `${bottom}px`;
      const [k, dy] = pop(l.age);
      b.style.scale = k; b.style.translate = `0 ${dy}px`;
      const rx = w / 2, ry = h / 2, bx = clamp(l.at[0] - left, w * 0.25, w * 0.75), by = ry - ry * Math.sqrt(1 - ((bx - rx) / rx) ** 2) + 14;
      const tx = l.at[0] - left, ty = l.at[1] - top, len = Math.hypot(tx - bx, ty - by) || 1, ux = (tx - bx) / len, uy = (ty - by) / len, L0 = clamp(0.1 * H, 56, 104) + 14;
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
    for (const [slot, b] of Object.entries(this.bubbles)) if (!shown.has(slot)) b.style.display = "none";
    const c = this.card, on = t >= CARD.from && t < CARD.to, cr = on ? { age: twos(t - CARD.from) } : warming ? { age: 1 } : null;
    c.style.display = cr ? "grid" : "none"; c.style.opacity = on ? "" : "0.004";
    if (!cr) return;
    if (!c.firstChild) { el("strong", "", c).textContent = CARD.title; el("span", "", c).textContent = CARD.sub; el("em", "", c).textContent = CARD.ret; }
    c.style.bottom = `${0.17 * H}px`;
    c.style.minWidth = `${Math.min(560, 0.8 * W)}px`; c.style.maxWidth = `${Math.min(0.92 * W, 640)}px`;
    c.children[0].style.fontSize = `${clamp(0.022 * W, 16, 24)}px`;
    c.children[1].style.fontSize = c.children[2].style.fontSize = `${clamp(0.016 * W, 13, 18)}px`;
    const [k, dy] = pop(cr.age);
    c.style.scale = k; c.style.translate = `-50% ${dy}px`;
  }

  dispose() { this.root.remove(); }
}

export default Comic;
