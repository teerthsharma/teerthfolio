// THE COMIC-PRINT LAYER as the site draws it (components/world/ui/Bubbles.jsx, app/globals.css): DOM over the picture with the site's
// boxes, inks, tails, halftone fringe, pop-in and places, driven by the clock. Lengths are CSS px of a 1280 x 720 frame.
const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Shantell+Sans:ital,wght,BNCE,INFM@0,300..800,-100..100,0..100&display=swap";
const CSS = `
.hm { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; --cream: #fbfaf7; --accent: #8d92a8; font-family: var(--font-comic, "Shantell Sans"), var(--font, "Instrument Sans"), system-ui, sans-serif; }
.hm * { box-sizing: border-box; }
.hm-bubble { position: absolute; padding: 1.15em 2em 1.3em; color: #1c1b19; transform-origin: 50% 0; filter: drop-shadow(0 10px 18px rgba(12, 8, 30, 0.28)); }
.hm-bubble[data-kind="burst"] { padding: 1.6em 2.4em 1.7em; }
.hm-bubble svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.hm-bubble .ink { fill: var(--cream); stroke: #1c1b19; stroke-width: 3; stroke-linejoin: round; }
.hm-bubble .tail.ink { stroke-width: 5; }
.hm-bubble .fill { fill: var(--cream); }
.hm-bubble pattern circle { fill: var(--accent); opacity: 0.42; }
.hm-bubble p { position: relative; margin: 0; text-align: center; line-height: 1.22; font-weight: 500; font-variation-settings: "BNCE" 45, "INFM" 70; }
.hm-bubble p b { font-weight: 800; font-variation-settings: "BNCE" 70, "INFM" 90; }
.hm-bubble[data-kind="burst"] p { rotate: -1.5deg; }
.hm-credit { position: absolute; left: 50%; display: grid; gap: 0.2em; width: max-content; padding: 0.7em 1.1em; text-align: center; background: var(--cream); color: #1c1b19; border: 1.5px solid #1c1b19; border-radius: 14px; box-shadow: 0 10px 24px rgba(12, 8, 30, 0.28); font-family: var(--font, "Instrument Sans"), system-ui, sans-serif; transform-origin: 50% 0; }
.hm-credit strong { font-weight: 700; line-height: 1.25; }
.hm-credit span { opacity: 0.72; }`;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; parent?.appendChild(e); return e; };
// the bubble's pop, on twos (the site's bubble-in keyframes under steps(1, end)): [scale, drop px]
const pop = (age) => (age < 0.08 ? [0.62, 18] : age < 0.16 ? [1.08, -4] : age < 0.24 ? [0.98, 0] : [1, 0]);

function burst(w, h) {
  let d = "";
  for (let i = 0; i < 52; i++) {
    const a = (i / 52) * Math.PI * 2, r = i % 2 ? 1.0 : 0.88 + 0.05 * Math.sin(i * 2.3);
    d += `${i ? "L" : "M"}${(w / 2 + Math.cos(a) * (w / 2) * r * 1.04).toFixed(1)} ${(h / 2 + Math.sin(a) * (h / 2) * r * 1.12).toFixed(1)}`;
  }
  return `${d}Z`;
}

// the comic face: the page's own (--font-comic) when it has one, else the same family from Google Fonts; `then` runs once it is known
export function comicFace(then) {
  const own = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim();
  let l = document.getElementById("hm-font");
  if (!own && !l) { l = el("link", "", document.head); l.id = "hm-font"; l.rel = "stylesheet"; l.href = FONTS; }
  if (then) { if (own || l.sheet) then(); else l.addEventListener("load", then, { once: true }); }
  return own || '"Shantell Sans", sans-serif';
}

export class Comic {
  constructor(host) {
    this.host = host;
    if (!document.getElementById("hm-css")) {
      el("style", "", document.head).id = "hm-css";
      document.getElementById("hm-css").textContent = CSS;
      comicFace();
    }
    this.root = el("div", "hm", host);
    this.bubbles = {};
    this.credit = el("div", "hm-credit", this.root);
    this.born = performance.now(); this.n = 0;
  }

  // bold: a list of words; each is set in the 800 weight wherever it appears in text
  bubble(slot, kind, text, bold) {
    const b = el("div", "hm-bubble", this.root);
    b.dataset.kind = kind;
    const dots = kind === "burst" ? `<path class="body dots" fill="url(#hm-ht-${slot})" mask="url(#hm-m-${slot})"/>` : "";
    b.innerHTML = `<svg aria-hidden="true"><defs><pattern id="hm-ht-${slot}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.7"/></pattern>
      <linearGradient id="hm-fade-${slot}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="hm-m-${slot}"><rect width="100%" height="100%" fill="url(#hm-fade-${slot})"/></mask></defs>
      <path class="tail ink"/><path class="body ink"/><path class="tail fill"/>${dots}</svg><p></p>`;
    const p = b.querySelector("p");
    for (const part of bold?.length ? text.split(new RegExp(`(${bold.join("|")})`)) : [text]) (bold?.includes(part) ? el("b", "", p) : p).append(part);
    return b;
  }

  // one frame. s: { lines: [{ slot, kind, text, bold: [words], age, at: [x, y] px the tail aims at, left }], credit: { title, sub, age },
  //   avoid: [x0, y0, x1, y1] px, warm: lines laid out unseen, card: credit laid out unseen }
  frame(s) {
    const W = this.host.clientWidth || 1280, H = this.host.clientHeight || 720, fs = clamp(0.011 * W + 12, 20, 27);
    const hit = (a, r) => a && r[0] < a[2] && r[2] > a[0] && r[1] < a[3] && r[3] > a[1];
    const live = new Set();
    // for its first half second the layer also lays the bursts and the card out, all but unseen, so a burst's halftone fringe is rasterised
    // before it pops; a fringe first shown on the pop costs a 100 ms frame
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
      // the site's place: beside or under the speaker, lower half; off the seal: under its feet, else the wider side narrowed to the room, else it waits
      let { w, h, bottom, top, fit } = place(full), left = fit(l.left != null ? l.left * W : l.at[0] - w * (l.slot === "a" ? 0.3 : 0.4));
      const low = av ? [0.08 * H, 0.045 * H, 6].map((gap) => H - av[3] - gap - h).find((y) => y >= 0.03 * H) : undefined;
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
      const rx = w / 2, ry = h / 2, bx = clamp(l.at[0] - left, w * 0.25, w * 0.75), by = ry - ry * Math.sqrt(1 - ((bx - rx) / rx) ** 2) + 14;
      const tx = l.at[0] - left, ty = l.at[1] - top, len = Math.hypot(tx - bx, ty - by) || 1, ux = (tx - bx) / len, uy = (ty - by) / len, L0 = clamp(0.1 * H, 56, 104) + 14;
      const tip = [left + bx + ux * L0, top + by + uy * L0];
      let L = av && uy < 0 && tip[1] < av[3] + 4 && tip[0] > av[0] && tip[0] < av[2] ? Math.max(0.04 * H, 24, (top + by - av[3] - 4) / -uy) : L0;
      if (uy >= 0 && L < 0.04 * H) L = 0.04 * H;
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
      c.style.bottom = `${0.17 * H}px`;
      c.style.minWidth = `${Math.min(560, 0.8 * W)}px`; c.style.maxWidth = `${Math.min(0.92 * W, 640)}px`;
      c.firstChild.style.fontSize = `${clamp(0.022 * W, 16, 24)}px`; c.lastChild.style.fontSize = `${clamp(0.016 * W, 13, 18)}px`;
      const [k, dy] = pop(cr.age);
      c.style.scale = k; c.style.translate = `-50% ${dy}px`;
    }
  }

  dispose() { this.root.remove(); }
}
