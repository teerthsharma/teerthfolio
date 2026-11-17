// The comic-print layer of p-aether-lang, DOM over the picture and drawn as the site draws its bubbles (components/world/ui/Bubbles.jsx): the same
// boxes, inks, tails, halftone fringe and pop-in. Lengths are CSS px of a 1280 x 720 frame; the clock is read on twos.
import { Vector3 } from "three";
import { DOCK, GOJO, HIT, LINE, T, TL, onTwos, realOf } from "../clock.js";
import { PAL } from "../palette.js";

const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Shantell+Sans:ital,wght,BNCE,INFM@0,300..800,-100..100,0..100&display=swap";
const CSS = `
.ae { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; --cream: ${PAL.cream}; --cyan: #2ec5ff; --accent: ${PAL.accent}; --deep: ${PAL.deep}; --dots: ${PAL.dots}; font-family: var(--font-comic, "Shantell Sans"), var(--font, "Instrument Sans"), system-ui, sans-serif; }
.ae * { box-sizing: border-box; }
.ae-impact { position: absolute; inset: 0; background: radial-gradient(circle, color-mix(in srgb, var(--dots) 50%, transparent) 0 1.7px, transparent 2.2px) 0 0 / 9px 9px, var(--deep); }
.ae-impact i { position: absolute; width: 26vmin; height: 26vmin; margin: -13vmin 0 0 -13vmin; border-radius: 50%; border: 1.4vmin solid var(--cream); }
.ae-impact i:nth-child(1) { border-color: var(--cyan); translate: -6px 3px; opacity: 0.8; }
.ae-impact i:nth-child(2) { border-color: var(--accent); translate: 5px -3px; opacity: 0.8; }
.ae-sfx { position: absolute; left: 4%; top: 6%; font-variation-settings: "BNCE" 100, "INFM" 100; font-weight: 800; line-height: 1; color: var(--accent); -webkit-text-stroke: 6px var(--cream); paint-order: stroke fill; rotate: -9deg; white-space: nowrap; }
.ae-bubble { position: absolute; padding: 1.15em 2em 1.3em; color: ${PAL.text}; transform-origin: 50% 0; filter: drop-shadow(0 10px 18px rgba(12, 8, 30, 0.28)); }
.ae-bubble[data-kind="burst"] { padding: 1.6em 2.4em 1.7em; }
.ae-bubble svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.ae-bubble .ink { fill: var(--cream); stroke: ${PAL.text}; stroke-width: 3; stroke-linejoin: round; }
.ae-bubble .tail.ink { stroke-width: 5; }
.ae-bubble .fill { fill: var(--cream); }
.ae-bubble pattern circle { fill: var(--dots); opacity: 0.42; }
.ae-bubble p { position: relative; margin: 0; text-align: center; line-height: 1.22; font-weight: 500; font-variation-settings: "BNCE" 45, "INFM" 70; }
.ae-bubble p b { font-weight: 800; font-variation-settings: "BNCE" 70, "INFM" 90; }
.ae-bubble[data-kind="burst"] p { rotate: -1.5deg; }
.ae-credit { position: absolute; left: 50%; display: grid; gap: 0.2em; width: max-content; padding: 0.7em 1.1em; text-align: center; background: var(--cream); color: ${PAL.text}; border: 1.5px solid ${PAL.text}; border-radius: 14px; box-shadow: 0 10px 24px rgba(12, 8, 30, 0.28); font-family: var(--font, "Instrument Sans"), system-ui, sans-serif; transform-origin: 50% 0; }
.ae-credit strong { font-weight: 700; line-height: 1.25; }
.ae-credit span { opacity: 0.72; }`;

const TEXT = {
  a: { kind: "oval", text: "Are you the strongest because you are Gojeal Satarou?", bold: ["strongest", "Gojeal Satarou"] },
  b: { kind: "burst", text: "Or are you Gojeal Fishtarou because you are the strongest?", bold: ["Gojeal Fishtarou", "strongest"] },
  c: { kind: "burst", text: "HOLLOW PURPLE!", bold: ["HOLLOW PURPLE!"] },
};
const CARD = { title: "teerthsharma/Aether-Lang · persistent homology as a language primitive", sub: "Loops stop when their shape stops changing.", ret: "Hollow Purple erases the void; the seal stands upright at its dock." };
const HEAD = new Vector3(DOCK[0] + GOJO.at[0], GOJO.at[1] + 2.9, DOCK[2] + GOJO.at[2]);
const VOID = [realOf(TL.impact[1]), realOf(TL.enter)];
const HUD = 3 / 24, COLLAPSE_HUD = 0.4;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; parent?.appendChild(e); return e; };
const pop = (age) => (age < 0.08 ? [0.62, 18] : age < 0.16 ? [1.08, -4] : age < 0.24 ? [0.98, 0] : [1, 0]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hit = (a, r) => a && r[0] < a[2] && r[2] > a[0] && r[1] < a[3] && r[3] > a[1];
const V = new Vector3(), V2 = new Vector3();
const screen = (cam, p, W, H) => { if (!cam) return null; V.copy(p).project(cam); return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H]; };

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
  let l = document.getElementById("ae-font");
  if (!own && !l) { l = el("link", "", document.head); l.id = "ae-font"; l.rel = "stylesheet"; l.href = FONTS; }
  if (then) own || l.sheet ? then() : l.addEventListener("load", then, { once: true });
  return own || '"Shantell Sans", sans-serif';
}

export class Comic {
  constructor(ctx) { this.ctx = ctx; this.root = null; this.bubbles = {}; this.box = undefined; this.n = 0; this.born = 0; }

  // the seal's box to keep balloons off (frame fractions, y down); null clears it, and until it is called the player's box is used
  avoid(box) { this.box = box; }

  mount(host) {
    if (!document.getElementById("ae-css")) { el("style", "", document.head).id = "ae-css"; document.getElementById("ae-css").textContent = CSS; comicFace(); }
    this.root = el("div", "ae", host);
    this.impact = el("div", "ae-impact", this.root, "<i></i><i></i><i></i>");
    this.sfx = el("div", "ae-sfx", this.root);
    this.credit = el("div", "ae-credit", this.root);
    this.born = performance.now();
  }

  bubble(slot, kind, text, bold) {
    const b = el("div", "ae-bubble", this.root);
    b.dataset.kind = kind;
    const dots = kind === "burst" ? `<path class="body dots" fill="url(#ae-ht-${slot})" mask="url(#ae-m-${slot})"/>` : "";
    b.innerHTML = `<svg aria-hidden="true"><defs><pattern id="ae-ht-${slot}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.7"/></pattern>
      <linearGradient id="ae-fade-${slot}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="ae-m-${slot}"><rect width="100%" height="100%" fill="url(#ae-fade-${slot})"/></mask></defs>
      <path class="tail ink"/><path class="body ink"/><path class="tail fill"/>${dots}</svg><p></p>`;
    const p = b.querySelector("p"), parts = bold.length ? text.split(new RegExp(`(${bold.map(esc).join("|")})`)) : [text];
    for (const part of parts) (bold.includes(part) ? el("b", "", p) : p).append(part);
    return b;
  }

  // one frame at real seconds `now`, drawn on twos
  frame(now) {
    const host = this.ctx.engine?.renderer?.domElement?.parentElement;
    if (!host) return;
    if (!this.root) this.mount(host);
    const t = onTwos(now), W = host.clientWidth || 1280, H = host.clientHeight || 720, fs = clamp(0.011 * W + 12, 20, 27);
    const cam = this.ctx.player?.camera, box = this.box !== undefined ? this.box : this.ctx.player?.box ?? null;
    const seal = this.ctx.seal, head = screen(cam, HEAD, W, H) ?? [0.25 * W, 0.4 * H];
    const mouth = screen(cam, seal.named?.()?.mouth ?? seal.chest(V2), W, H) ?? [0.6 * W, 0.4 * H];
    const chest = screen(cam, seal.chest(V2), W, H) ?? [W / 2, H / 2];

    const lines = [], line = (slot, t0, at, left) => lines.push({ ...TEXT[slot], slot, age: t - t0, at, left });
    if (t >= LINE.A && t < LINE.B) line("a", LINE.A, head, 0.1);
    else if (t >= LINE.B && t < LINE.C) line("b", LINE.B, head, 0.1);
    else if (t >= LINE.C && t < realOf(T.rv)) line("c", LINE.C, mouth);

    const hud = [[HIT.impact, HUD], [HIT.collapse, COLLAPSE_HUD]].find(([a, d]) => now >= a && now < a + d);
    this.impact.style.display = hud ? "block" : "none";
    if (hud) { for (const i of this.impact.children) { i.style.left = `${(chest[0] / W) * 100}%`; i.style.top = `${(chest[1] / H) * 100}%`; } this.impact.style.scale = t - hud[0] < 1 / 12 ? 1 : 1.06; }

    const v = t - VOID[0], sfx = t >= VOID[0] && t < VOID[1];
    this.sfx.style.display = sfx ? "block" : "none";
    if (sfx) { if (this.sfx.textContent !== "VOID") this.sfx.textContent = "VOID"; this.sfx.style.fontSize = `${clamp(0.15 * W, 90, 230)}px`; this.sfx.style.scale = v < 1 / 12 ? 0.5 : v < 2 / 12 ? 1.12 : 1; }

    const warming = ++this.n <= 6 || performance.now() - this.born < 500;
    const ghosts = warming ? Object.keys(TEXT).filter((s) => !lines.some((l) => l.slot === s)).map((s) => ({ ...TEXT[s], slot: s, age: 1, at: [0.6 * W, 0.4 * H], ghost: true })) : [];
    const bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
    const av = box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, box[3] * H + 2] : null;
    const live = new Set();
    for (const l of [...lines, ...ghosts]) {
      const b = (this.bubbles[l.slot] ??= this.bubble(l.slot, l.kind, l.text, l.bold));
      live.add(l.slot);
      const bav = l.ghost ? null : av;
      b.style.display = "block"; b.style.opacity = l.ghost ? "0.004" : "";
      b.style.fontSize = `${fs}px`;
      const full = Math.min(0.92 * W, 25 * fs), place = (width) => {
        b.style.width = `${width}px`;
        const w = b.offsetWidth, h = b.offsetHeight, bottom = Math.min(0.12 * H, 0.5 * H - h);
        return { w, h, bottom, top: H - bottom - h, fit: (x) => clamp(x, 0.03 * W, W - 0.03 * W - w) };
      };
      let { w, h, bottom, top, fit } = place(full), left = fit(l.left != null ? l.left * W : l.at[0] - w * 0.4);
      const low = bav ? [0.08 * H, 0.045 * H, 6].map((gap) => H - bav[3] - gap - h).find((x) => x >= 0.03 * H) : undefined;
      if (hit(bav, [left, top - 0.07 * H, left + w, top + h]) && low < bottom) { bottom = low; top = H - bottom - h; }
      else if (hit(bav, [left, top, left + w, top + h])) {
        const roomR = 0.97 * W - bav[2], roomL = bav[0] - 0.03 * W, right = roomR >= roomL, room = Math.max(roomR, roomL);
        ({ w, h, bottom, top, fit } = place(Math.max(Math.min(full, room), 0.3 * W, 9 * fs)));
        left = right ? W - 0.03 * W - w : 0.03 * W;
        bottom = clamp(bottom, 0.06 * H, 0.12 * H); top = H - bottom - h;
      }
      b.style.left = `${left}px`; b.style.bottom = `${bottom}px`;
      const [k, dy] = pop(l.age);
      b.style.scale = k; b.style.translate = `0 ${dy}px`;
      const rx = w / 2, ry = h / 2, bx = clamp(l.at[0] - left, w * 0.25, w * 0.75), by = ry - ry * Math.sqrt(1 - ((bx - rx) / rx) ** 2) + 14;
      const tx = l.at[0] - left, ty = l.at[1] - top, len = Math.hypot(tx - bx, ty - by) || 1, ux = (tx - bx) / len, uy = (ty - by) / len, L0 = clamp(0.1 * H, 56, 104) + 14;
      const tip = [left + bx + ux * L0, top + by + uy * L0], L = bav && uy < 0 && tip[1] < bav[3] + 4 && tip[0] > bav[0] && tip[0] < bav[2] ? Math.max(24, (top + by - bav[3] - 4) / -uy) : L0;
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

    const c = this.credit, cardOn = t >= LINE.credit && t < realOf(TL.collapse[0]), cr = cardOn ? t - LINE.credit : warming ? 1 : null;
    c.style.display = cr === null ? "none" : "grid"; c.style.opacity = cardOn ? "" : "0.004";
    if (cr !== null) {
      if (!c.firstChild) { el("strong", "", c).textContent = CARD.title; el("span", "", c).textContent = CARD.sub; el("strong", "", c).textContent = CARD.ret; }
      c.style.bottom = `${0.17 * H}px`;
      c.style.minWidth = `${Math.min(560, 0.8 * W)}px`; c.style.maxWidth = `${Math.min(0.92 * W, 640)}px`;
      c.children[0].style.fontSize = `${clamp(0.022 * W, 16, 24)}px`;
      c.children[1].style.fontSize = c.children[2].style.fontSize = `${clamp(0.016 * W, 13, 18)}px`;
      const [k, dy] = pop(cr);
      c.style.scale = k; c.style.translate = `-50% ${dy}px`;
    }
  }

  dispose() { this.root?.remove(); }
}
