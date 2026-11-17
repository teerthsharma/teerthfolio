// The comic page of pr-topograph-432: DOM over the picture, drawn from the live site's CSS (LIVE.md section 1, banner.jsx).
// frame(s) is a pure function of its state, so a seek draws what a play draws. Lengths are CSS px of a 1280 x 720 frame.
export const TEXT = {
  a: { kind: "oval", text: "Ainz Ooal Gown is legend.", bold: "legend." },
  b: { kind: "box", text: "Rejoice!", bold: "Rejoice!" },
  c: { kind: "oval", text: "145 lines changed across 4 files. pods, nodes and daemonsets access no longer granted cluster wide.", bold: "145 lines changed across 4 files." },
};
export const CARD = { title: "dsx-ai-factory/topograph #432", sub: "145 lines gated" };
export const CAPTION = { title: "The Throne Room of Nazarick", sub: "dsx-ai-factory/topograph #432" };

const FONTS = "https://fonts.googleapis.com/css2?family=Shantell+Sans:ital,wght,BNCE,INFM@0,300..800,-100..100,0..100&display=swap";
const CSS = `
.tg432 { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; font-family: var(--font-comic, "Shantell Sans"), system-ui, sans-serif; }
.tg432 * { box-sizing: border-box; }
.tg432-frame { position: absolute; inset: 0; box-shadow: inset 0 0 0 clamp(8px, 1.4vw, 16px) #05020a, inset 0 0 0 clamp(11px, 1.8vw, 20px) #f0b429, inset 0 0 90px 30px rgba(5, 2, 10, 0.75); }
.tg432-speed { position: absolute; inset: -10%; opacity: 0.5; background: repeating-conic-gradient(from 0deg at 50% 55%, #05020a 0deg 0.7deg, transparent 0.7deg 5deg);
  -webkit-mask-image: radial-gradient(circle, transparent 38%, #000 82%); mask-image: radial-gradient(circle, transparent 38%, #000 82%); }
.tg432-impact { position: absolute; inset: 0; background: radial-gradient(circle, rgba(206, 186, 255, 0.5) 0 1.7px, transparent 2.2px) 0 0 / 9px 9px, #1d1240; }
.tg432-impact i { position: absolute; width: 26vmin; height: 26vmin; margin: -13vmin 0 0 -13vmin; border-radius: 50%; border: 1.4vmin solid #fbfaf7; }
.tg432-impact i:nth-child(1) { border-color: #2ec5ff; translate: -6px 3px; opacity: 0.8; }
.tg432-impact i:nth-child(2) { border-color: #a23cff; translate: 5px -3px; opacity: 0.8; }
.tg432-sfx { position: absolute; left: 7%; top: 15%; font-size: 11vw; font-variation-settings: "BNCE" 100, "INFM" 100; font-weight: 800; line-height: 1; letter-spacing: 0.02em;
  color: #a23cff; -webkit-text-stroke: 0.06em #fbfaf7; paint-order: stroke fill; rotate: -9deg; white-space: nowrap; }
.tg432-sfx b { position: absolute; inset: 0; font-weight: 800; -webkit-text-stroke: 0; opacity: 0.85; }
.tg432-sfx b:nth-child(1) { color: #05020a; translate: 0.05em 0.06em; z-index: -2; }
.tg432-sfx b:nth-child(2) { color: #2ec5ff; z-index: -1; }
.tg432-bub { position: absolute; padding: 1.15em 2em 1.3em; color: #05020a; transform-origin: 50% 0; }
.tg432-bub svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.tg432-bub .body, .tg432-bub .tail { fill: #ffffff; stroke: #05020a; stroke-width: 5; stroke-linejoin: round; }
.tg432-bub .tail { stroke-width: 8; }
.tg432-bub p { position: relative; margin: 0; text-align: center; line-height: 1.22; font-weight: 800; font-variation-settings: "BNCE" 45, "INFM" 70; }
.tg432-bub b { font-weight: 800; font-variation-settings: "BNCE" 70, "INFM" 90; }
.tg432-box { position: absolute; padding: 0.5em 1em; color: #f0b429; background: #05020a; border: 6px solid #f0b429; box-shadow: 6px 6px 0 #05020a; transform-origin: 50% 0;
  font-family: Impact, "Arial Narrow", sans-serif; font-weight: 400; text-transform: uppercase; letter-spacing: 0.08em; text-align: center; line-height: 1.15; }
.tg432-cap { position: absolute; left: clamp(14px, 3vw, 36px); top: clamp(56px, 11vh, 88px); padding: 0.45em 0.8em; color: #05020a; background: #ffd23a; border: 4px solid #05020a;
  box-shadow: 5px 5px 0 #05020a; rotate: -1.2deg; transform-origin: 0 0; }
.tg432-cap strong { display: block; font-family: Impact, "Arial Narrow", sans-serif; font-weight: 400; text-transform: uppercase; letter-spacing: 0.1em; font-size: clamp(16px, 2.2vw, 26px); line-height: 1.1; }
.tg432-cap span { display: block; font-family: ui-monospace, Consolas, monospace; font-weight: 700; font-size: clamp(11px, 1.3vw, 15px); }
.tg432-card { position: absolute; left: 50%; display: grid; gap: 0.2em; width: max-content; max-width: 92%; padding: 0.7em 1.1em; text-align: center; color: #05020a; background: #fbfaf7;
  border: 1.5px solid #05020a; border-radius: 14px; font-family: system-ui, "Segoe UI", sans-serif; transform-origin: 50% 0; }
.tg432-card strong { font-weight: 700; font-size: clamp(16px, 2.2vw, 24px); line-height: 1.25; }
.tg432-card span { font-size: clamp(13px, 1.6vw, 18px); opacity: 0.72; }`;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; parent?.appendChild(e); return e; };
const svgEl = (tag, parent, cls) => { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); if (cls) e.setAttribute("class", cls); parent.appendChild(e); return e; };
const pop = (age) => (age < 0.08 ? [0.62, 18] : age < 0.16 ? [1.08, -4] : age < 0.24 ? [0.98, 0] : [1, 0]);
const hit = (a, r) => a && r[0] < a[2] && r[2] > a[0] && r[1] < a[3] && r[3] > a[1];
const ownFace = () => getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim();

function ensureStyles() {
  if (!document.getElementById("tg432-css")) el("style", "", document.head).id = "tg432-css";
  document.getElementById("tg432-css").textContent = CSS;
  if (!ownFace() && !document.getElementById("tg432-font")) el("link", "", document.head).id = "tg432-font";
  const f = document.getElementById("tg432-font");
  if (f && !f.href) { f.rel = "stylesheet"; f.href = FONTS; }
}

export class Page {
  constructor(host) {
    this.host = host;
    ensureStyles();
    this.root = el("div", "tg432", host);
    this.frameEl = el("div", "tg432-frame", this.root);
    this.speedEl = el("div", "tg432-speed", this.root);
    this.caption = el("div", "tg432-cap", this.root);
    el("strong", "", this.caption).textContent = CAPTION.title;
    el("span", "", this.caption).textContent = CAPTION.sub;
    this.impact = el("div", "tg432-impact", this.root);
    for (let i = 0; i < 3; i++) el("i", "", this.impact);
    this.sfx = el("div", "tg432-sfx", this.root);
    this.bubbles = {};
    this.card = el("div", "tg432-card", this.root);
    el("strong", "", this.card); el("span", "", this.card);
  }

  bubble(slot, kind, text, bold) {
    const box = kind === "box", b = el("div", box ? "tg432-box" : "tg432-bub", this.root);
    if (box) { b.textContent = text; return b; }
    const svg = svgEl("svg", b), tail = svgEl("path", svg, "tail"), body = svgEl("path", svg, "body");
    svg.setAttribute("aria-hidden", "true"); svg.append(tail, body);
    const p = el("p", "", b), i = bold ? text.indexOf(bold) : -1;
    if (i < 0) p.textContent = text;
    else { p.append(text.slice(0, i)); el("b", "", p).textContent = bold; p.append(text.slice(i + bold.length)); }
    return b;
  }

  // one frame. s: { frame, caption, speed (0|1, the judder phase), impact: [u, v, k] | null, sfx: { text, age } | null,
  //   lines: [{ slot, kind: "oval" | "box", text, bold, age, at: [px, py] the tail aims at, left? (frame fraction) }], card: { title, sub, age } | null, avoid: [x0, y0, x1, y1] px | null }
  frame(s) {
    const W = this.host.clientWidth || 1280, H = this.host.clientHeight || 720, fs = clamp(0.011 * W + 12, 20, 27);
    this.frameEl.style.display = s.frame ? "block" : "none";
    this.speedEl.style.display = s.frame ? "block" : "none";
    this.speedEl.style.transform = s.speed ? "rotate(1.6deg) scale(1.06)" : "rotate(0deg) scale(1.04)";
    this.caption.style.display = s.caption ? "block" : "none";
    this.impact.style.display = s.impact ? "block" : "none";
    if (s.impact) { for (const i of this.impact.children) { i.style.left = `${s.impact[0] * 100}%`; i.style.top = `${s.impact[1] * 100}%`; } this.impact.style.scale = s.impact[2]; }
    this.sfx.style.display = s.sfx ? "block" : "none";
    if (s.sfx) {
      if (!this.sfx.firstChild) { for (let i = 0; i < 2; i++) el("b", "", this.sfx).textContent = s.sfx.text; this.sfx.append(s.sfx.text); }
      const step = Math.floor(s.sfx.age * 12 + 1e-6), m = step < 2 ? [-0.09, 0.05] : step < 4 ? [-0.045, 0.03] : [-0.025, 0.015];
      this.sfx.style.scale = [0.45, 1.18, 0.96, 1][Math.min(3, step)];
      this.sfx.children[1].style.translate = `${m[0]}em ${m[1]}em`;
    }
    const live = new Set();
    for (const l of s.lines) {
      const b = (this.bubbles[l.slot] ??= this.bubble(l.slot, l.kind, l.text, l.bold));
      live.add(l.slot);
      b.style.display = "block";
      b.style.fontSize = `${fs}px`;
      const full = Math.min(0.92 * W, 25 * fs), av = s.avoid;
      const place = (width) => {
        b.style.width = `${width}px`;
        const w = b.offsetWidth, h = b.offsetHeight, bottom = Math.min(0.12 * H, 0.5 * H - h);
        return { w, h, bottom, top: H - bottom - h, fit: (x) => clamp(x, 0.03 * W, W - 0.03 * W - w) };
      };
      let { w, h, bottom, top, fit } = place(full), left = fit(l.left != null ? l.left * W : l.at[0] - w * 0.4);
      const low = av ? [0.08 * H, 0.045 * H, 6].map((gap) => H - av[3] - gap - h).find((x) => x >= 0.03 * H) : undefined;
      if (hit(av, [left, top - 0.07 * H, left + w, top + h]) && low < bottom) { bottom = low; top = H - bottom - h; }
      else if (hit(av, [left, top, left + w, top + h])) {
        const roomR = 0.97 * W - av[2], roomL = av[0] - 0.03 * W, right = roomR >= roomL, room = Math.max(roomR, roomL);
        if (room < 13 * fs) { b.style.display = "none"; live.delete(l.slot); continue; }
        ({ w, h, bottom, top, fit } = place(Math.min(full, room)));
        left = right ? W - 0.03 * W - w : 0.03 * W;
      }
      b.style.left = `${left}px`; b.style.bottom = `${bottom}px`;
      const [k, dy] = pop(l.age);
      b.style.scale = k; b.style.translate = `0 ${dy}px`;
      if (l.kind !== "box") this.shape(b, l, w, h, left, top, H);
    }
    for (const [slot, b] of Object.entries(this.bubbles)) if (!live.has(slot)) b.style.display = "none";
    const c = this.card, cr = s.card;
    c.style.display = cr ? "grid" : "none";
    if (cr) {
      if (c.dataset.t !== cr.title) { c.firstChild.textContent = cr.title; c.lastChild.textContent = cr.sub; c.dataset.t = cr.title; }
      c.style.bottom = `${0.17 * H}px`;
      const [k, dy] = pop(cr.age);
      c.style.scale = k; c.style.translate = `-50% ${dy}px`;
    }
  }

  shape(b, l, w, h, left, top, H) {
    const rx = w / 2, ry = h / 2, bx = clamp(l.at[0] - left, w * 0.25, w * 0.75), by = ry - ry * Math.sqrt(1 - ((bx - rx) / rx) ** 2) + 14;
    const tx = l.at[0] - left, ty = l.at[1] - top, len = Math.hypot(tx - bx, ty - by) || 1, ux = (tx - bx) / len, uy = (ty - by) / len;
    const L = clamp(0.1 * H, 56, 104) + 14, px = bx + ux * L, py = by + uy * L, half = Math.min(24, w * 0.05);
    const bow = (ux > 0 ? -1 : 1) * 0.28 * L, cx = (bx + px) / 2 - uy * bow, cy = (by + py) / 2 + ux * bow;
    const key = `${l.slot}|${w}|${h}|${Math.round(bx)}|${Math.round(px)}|${Math.round(py)}`;
    if (b.dataset.key === key) return;
    b.dataset.key = key;
    b.querySelector("svg").setAttribute("viewBox", `0 0 ${w} ${h}`);
    b.querySelector(".tail").setAttribute("d", `M${bx - half} ${by} Q${cx - half * 0.3} ${cy} ${px} ${py} Q${cx + half * 0.5} ${cy} ${bx + half} ${by}Z`);
    b.querySelector(".body").setAttribute("d", `M0 ${ry}A${rx} ${ry} 0 1 0 ${w} ${ry}A${rx} ${ry} 0 1 0 0 ${ry}Z`);
  }

  dispose() { this.root.remove(); }
}
