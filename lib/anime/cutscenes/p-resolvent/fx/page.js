// THE COMIC-PRINT LAYER as the site draws it (components/world/ui/Bubbles.jsx, app/globals.css): DOM over the picture, the same boxes, inks, tails,
// halftone fringe, pop-in and places, driven by the clock on twos. Lengths are CSS px of a 1280 x 720 frame.
const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Shantell+Sans:ital,wght,BNCE,INFM@0,300..800,-100..100,0..100&display=swap";
const CSS = `
.rv { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; --cream: #fbfaf7; --cyan: #2ec5ff; --accent: #e0a043; --deep: #402c12; --dots: #ffe4ba; font-family: var(--font-comic, "Shantell Sans"), var(--font, "Instrument Sans"), system-ui, sans-serif; }
.rv * { box-sizing: border-box; }
.rv-wipe { position: absolute; inset: 0; background: #e0a043; opacity: 0; display: none; }
.rv-impact { position: absolute; inset: 0; background: radial-gradient(circle, color-mix(in srgb, var(--dots) 50%, transparent) 0 1.7px, transparent 2.2px) 0 0 / 9px 9px, var(--deep); }
.rv-impact i { position: absolute; width: 26vmin; height: 26vmin; margin: -13vmin 0 0 -13vmin; border-radius: 50%; border: 1.4vmin solid var(--cream); }
.rv-impact i:nth-child(1) { border-color: var(--cyan); translate: -6px 3px; opacity: 0.8; }
.rv-impact i:nth-child(2) { border-color: var(--accent); translate: 5px -3px; opacity: 0.8; }
.rv-sfx { position: absolute; left: 7%; top: 15%; font-variation-settings: "BNCE" 100, "INFM" 100; font-weight: 800; line-height: 1; letter-spacing: 0.02em; color: var(--accent); -webkit-text-stroke: 0.06em var(--cream); paint-order: stroke fill; rotate: -9deg; white-space: nowrap; }
.rv-sfx b { position: absolute; inset: 0; font-weight: 800; -webkit-text-stroke: 0; opacity: 0.85; }
.rv-sfx b:nth-child(1) { color: #1c1b19; translate: 0.05em 0.06em; z-index: -2; }
.rv-sfx b:nth-child(2) { color: var(--cyan); z-index: -1; }
.rv-bubble { position: absolute; padding: 1.15em 2em 1.3em; color: #1c1b19; transform-origin: 50% 0; filter: drop-shadow(0 10px 18px rgba(12, 8, 30, 0.28)); }
.rv-bubble[data-kind="burst"] { padding: 1.6em 2.4em 1.7em; }
.rv-bubble svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.rv-bubble .ink { fill: var(--cream); stroke: #1c1b19; stroke-width: 3; stroke-linejoin: round; }
.rv-bubble .tail.ink { stroke-width: 5; }
.rv-bubble .fill { fill: var(--cream); }
.rv-bubble pattern circle { fill: var(--accent); opacity: 0.42; }
.rv-bubble p { position: relative; margin: 0; text-align: center; line-height: 1.22; font-weight: 500; font-variation-settings: "BNCE" 45, "INFM" 70; }
.rv-bubble p b { font-weight: 800; font-variation-settings: "BNCE" 70, "INFM" 90; }
.rv-bubble[data-kind="burst"] p { rotate: -1.5deg; }
.rv-pill { position: absolute; left: 50%; top: 13%; translate: -50% 0; padding: 8px 18px; border-radius: 999px; background: #fff4d6; color: #4a2a08; border: 2px solid #e0a043; font: 700 clamp(13px, 2vh, 18px) system-ui, sans-serif; text-align: center; max-width: calc(100% - 32px); transform-origin: 50% 0; }
.rv-credit { position: absolute; left: 50%; display: grid; gap: 0.2em; width: max-content; padding: 0.7em 1.1em; text-align: center; background: var(--cream); color: #1c1b19; border: 1.5px solid #1c1b19; border-radius: 14px; box-shadow: 0 10px 24px rgba(12, 8, 30, 0.28); font-family: var(--font, "Instrument Sans"), system-ui, sans-serif; transform-origin: 50% 0; }
.rv-credit strong { font-weight: 700; line-height: 1.25; }
.rv-credit span { opacity: 0.72; }`;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; parent?.appendChild(e); return e; };
const pop = (age) => (age < 0.08 ? [0.62, 18] : age < 0.16 ? [1.08, -4] : age < 0.24 ? [0.98, 0] : [1, 0]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  let l = document.getElementById("rv-font");
  if (!own && !l) { l = el("link", "", document.head); l.id = "rv-font"; l.rel = "stylesheet"; l.href = FONTS; }
  if (then) own || l.sheet ? then() : l.addEventListener("load", then, { once: true });
  return own || '"Shantell Sans", sans-serif';
}

export class Comic {
  constructor(host) {
    this.host = host;
    if (!document.getElementById("rv-css")) {
      el("style", "", document.head).id = "rv-css";
      document.getElementById("rv-css").textContent = CSS;
      comicFace();
    }
    this.root = el("div", "rv", host);
    this.wipe = el("div", "rv-wipe", this.root);
    this.impact = el("div", "rv-impact", this.root, "<i></i><i></i><i></i>");
    this.sfx = el("div", "rv-sfx", this.root);
    this.bubbles = {};
    this.pill = el("div", "rv-pill", this.root);
    this.credit = el("div", "rv-credit", this.root);
    this.born = performance.now(); this.n = 0;
  }

  bubble(slot, kind, text, bold) {
    const b = el("div", "rv-bubble", this.root);
    b.dataset.kind = kind;
    const dots = kind === "burst" ? `<path class="body dots" fill="url(#rv-ht-${slot})" mask="url(#rv-m-${slot})"/>` : "";
    b.innerHTML = `<svg aria-hidden="true"><defs><pattern id="rv-ht-${slot}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.7"/></pattern>
      <linearGradient id="rv-fade-${slot}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="rv-m-${slot}"><rect width="100%" height="100%" fill="url(#rv-fade-${slot})"/></mask></defs>
      <path class="tail ink"/><path class="body ink"/><path class="tail fill"/>${dots}</svg><p></p>`;
    const p = b.querySelector("p");
    const re = bold?.length ? new RegExp(`(${bold.map(esc).join("|")})`) : null;
    for (const part of re ? text.split(re) : [text]) (bold?.includes(part) ? el("b", "", p) : p).append(part);
    return b;
  }

  // one frame. s: { sfx: {text, age}, impact: [u, v, scale] | null, lines: [{ slot, kind, text, bold: string[], age, at: [x, y] px, left }],
  // pill: { text, age } | null, warmPill: { text } (laid out, unseen, in the first half second), credit: { title, sub, age } | null,
  // card: credit text for the warm-up, avoid: [x0, y0, x1, y1] px | null, warm: lines laid out unseen, wipe: 0..1 gold return quad }
  frame(s) {
    const W = this.host.clientWidth || 1280, H = this.host.clientHeight || 720, fs = clamp(0.011 * W + 12, 20, 27);
    this.impact.style.display = s.impact ? "block" : "none";
    if (s.impact) { for (const i of this.impact.children) { i.style.left = `${s.impact[0] * 100}%`; i.style.top = `${s.impact[1] * 100}%`; } this.impact.style.scale = s.impact[2]; }
    this.sfx.style.display = s.sfx ? "block" : "none";
    if (s.sfx) {
      const a = s.sfx.age, k = a < 0.08 ? 0.45 : a < 0.16 ? 1.18 : a < 0.24 ? 0.96 : a < 0.5 ? 1 : 1.04, m = a < 0.16 ? [-0.09, 0.05] : a < 0.33 ? [-0.045, 0.03] : [-0.025, 0.015];
      if (!this.sfx.firstChild) { for (let i = 0; i < 2; i++) el("b", "", this.sfx).textContent = s.sfx.text; this.sfx.append(s.sfx.text); }
      this.sfx.style.fontSize = `${clamp(0.11 * W, 64, 168)}px`;
      this.sfx.style.scale = k;
      this.sfx.children[1].style.translate = `${m[0]}em ${m[1]}em`;
    }
    const hit = (a, r) => a && r[0] < a[2] && r[2] > a[0] && r[1] < a[3] && r[3] > a[1];
    const live = new Set();
    // for its first half second the layer also lays the bursts and the card out (`warm`), all but unseen, so a burst's halftone fringe is rasterised before it pops
    const warming = ++this.n <= 6 || performance.now() - this.born < 500;
    const wipe = s.wipe ?? 0;
    this.wipe.style.display = wipe > 0.004 || warming ? "block" : "none";
    this.wipe.style.opacity = wipe > 0.004 ? String(Math.min(1, wipe)) : "0.004";
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
        const roomR = 0.97 * W - av[2], roomL = av[0] - 0.03 * W, side = Math.max(roomR, roomL);
        if (side >= 0.4 * W) { ({ w, h, bottom, top, fit } = place(Math.min(full, side))); left = roomR >= roomL ? W - 0.03 * W - w : 0.03 * W; }
        else if (side >= 0.17 * W) { ({ w, h, bottom, top, fit } = place(Math.min(full, side))); left = roomR >= roomL ? W - 0.03 * W - w : 0.03 * W; }
        else if (low >= 0.03 * H) { bottom = low; top = H - bottom - h; }
        else { b.style.display = "none"; live.delete(l.slot); continue; }
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
    for (const [slot, b] of Object.entries(this.bubbles)) if (!live.has(slot)) b.style.display = "none";
    const pl = s.pill ?? (warming && s.warmPill ? { ...s.warmPill, age: 1 } : null);
    this.pill.style.display = pl ? "block" : "none";
    this.pill.style.opacity = s.pill ? "" : "0.004";
    if (pl) {
      this.pill.textContent = pl.text;
      this.pill.style.fontSize = `${clamp(0.016 * W, 13, 18)}px`;
      const [k, dy] = pop(pl.age);
      this.pill.style.scale = k; this.pill.style.translate = `-50% ${dy}px`;
    }
    const c = this.credit, cr = s.credit ?? (warming && s.card ? { ...s.card, age: 1 } : null);
    c.style.display = cr ? "grid" : "none"; c.style.opacity = s.credit ? "" : "0.004";
    if (cr) {
      if (!c.firstChild) { el("strong", "", c).textContent = cr.title; el("span", "", c).textContent = cr.sub; }
      c.style.bottom = `${0.17 * H}px`;
      c.style.minWidth = `${Math.min(560, 0.8 * W)}px`; c.style.maxWidth = `${Math.min(0.92 * W, 640)}px`;
      c.firstChild.style.fontSize = `${clamp(0.022 * W, 16, 24)}px`; c.lastChild.style.fontSize = `${clamp(0.016 * W, 13, 18)}px`;
      const [k, dy] = pop(cr.age);
      c.style.scale = k; c.style.translate = `-50% ${dy}px`;
    }
  }

  dispose() { this.root.remove(); }
}
