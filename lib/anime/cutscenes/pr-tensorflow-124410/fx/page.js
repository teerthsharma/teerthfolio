// THE COMIC-PRINT LAYER as the site draws it (components/world/ui/Bubbles.jsx, app/globals.css): DOM over the picture, the same boxes, inks, tails,
// halftone fringe, pop-in and places, driven by the clock on twos (a seek draws what a play draws). Lengths are CSS px of a 1280 x 720 frame.
const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Shantell+Sans:ital,wght,BNCE,INFM@0,300..800,-100..100,0..100&display=swap";
const CSS = `
.tf124 { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; --cream: #fbfaf7; --ink: #05020a; --accent: #c026d3; --dots: #05020a; font-family: var(--font-comic, "Shantell Sans"), var(--font, "Instrument Sans"), system-ui, sans-serif; }
.tf124 * { box-sizing: border-box; }
.tf124-sfx { position: absolute; left: 7%; top: 15%; font-variation-settings: "BNCE" 100, "INFM" 100; font-weight: 800; line-height: 1; letter-spacing: 0.02em; color: var(--accent); -webkit-text-stroke: 0.06em var(--cream); paint-order: stroke fill; rotate: -9deg; white-space: nowrap; }
.tf124-sfx b { position: absolute; inset: 0; font-weight: 800; -webkit-text-stroke: 0; color: var(--ink); opacity: 0.85; z-index: -1; }
.tf124-bubble { position: absolute; padding: 1.15em 2em 1.3em; color: var(--ink); transform-origin: 50% 0; filter: drop-shadow(0 10px 18px rgba(12, 8, 30, 0.28)); }
.tf124-bubble[data-kind="burst"] { padding: 1.6em 2.4em 1.7em; }
.tf124-bubble svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.tf124-bubble .ink { fill: var(--cream); stroke: var(--ink); stroke-width: 3; stroke-linejoin: round; }
.tf124-bubble .tail.ink { stroke-width: 5; }
.tf124-bubble .fill { fill: var(--cream); }
.tf124-bubble pattern circle { fill: var(--dots); opacity: 0.18; }
.tf124-bubble p { position: relative; margin: 0; text-align: center; line-height: 1.22; font-weight: 800; font-variation-settings: "BNCE" 45, "INFM" 70; }
.tf124-bubble p b { font-weight: 800; font-variation-settings: "BNCE" 70, "INFM" 90; }
.tf124-bubble[data-kind="burst"] p { rotate: -1.5deg; }
.tf124-credit { position: absolute; left: 50%; display: grid; gap: 0.2em; width: max-content; padding: 0.7em 1.1em; text-align: center; background: var(--cream); color: var(--ink); border: 1.5px solid var(--ink); border-radius: 14px; box-shadow: 0 10px 24px rgba(12, 8, 30, 0.28); font-family: var(--font, "Instrument Sans"), system-ui, sans-serif; transform-origin: 50% 0; }
.tf124-credit strong { font-weight: 700; line-height: 1.25; }
.tf124-credit span { opacity: 0.72; }
.tf124-pill { position: absolute; display: flex; align-items: center; gap: 0.45em; padding: 0.3em 0.9em 0.3em 0.6em; border: 2px solid #ff8f00; border-radius: 999px; background: #fff; color: var(--ink); font-family: var(--font, "Instrument Sans"), system-ui, sans-serif; font-weight: 700; white-space: nowrap; transform: translate(-50%, -100%); box-shadow: 0 6px 14px rgba(12, 8, 30, 0.22); }
.tf124-pill i { width: 0.9em; height: 0.9em; border-radius: 50%; background: #ff8f00; flex: none; }`;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; parent?.appendChild(e); return e; };
// the bubble's pop, on twos (the site's bubble-in keyframes under steps(1, end)): [scale, drop px]
const pop = (age) => (age < 0.08 ? [0.62, 18] : age < 0.16 ? [1.08, -4] : age < 0.24 ? [0.98, 0] : [1, 0]);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  let l = document.getElementById("tf124-font");
  if (!own && !l) { l = el("link", "", document.head); l.id = "tf124-font"; l.rel = "stylesheet"; l.href = FONTS; }
  if (then) own || l.sheet ? then() : l.addEventListener("load", then, { once: true });
  return own || '"Shantell Sans", sans-serif';
}

export class Comic {
  constructor(host) {
    this.host = host;
    if (!document.getElementById("tf124-css")) {
      el("style", "", document.head).id = "tf124-css";
      document.getElementById("tf124-css").textContent = CSS;
      comicFace();
    }
    this.root = el("div", "tf124", host);
    this.sfx = el("div", "tf124-sfx", this.root);
    this.bubbles = {};
    this.credit = el("div", "tf124-credit", this.root);
    this.pill = el("div", "tf124-pill", this.root);
    this.born = performance.now(); this.n = 0;
  }

  bubble(slot, kind, text, bold) {
    const b = el("div", "tf124-bubble", this.root);
    b.dataset.kind = kind;
    const dots = kind === "burst" ? `<path class="body dots" fill="url(#tf124-ht-${slot})" mask="url(#tf124-m-${slot})"/>` : "";
    b.innerHTML = `<svg aria-hidden="true"><defs><pattern id="tf124-ht-${slot}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.7"/></pattern>
      <linearGradient id="tf124-fade-${slot}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="tf124-m-${slot}"><rect width="100%" height="100%" fill="url(#tf124-fade-${slot})"/></mask></defs>
      <path class="tail ink"/><path class="body ink"/><path class="tail fill"/>${dots}</svg><p></p>`;
    const p = b.querySelector("p"), phrases = [].concat(bold ?? []);
    const parts = phrases.length ? text.split(new RegExp(`(${phrases.map(escape).join("|")})`)) : [text];
    for (const part of parts) (phrases.includes(part) ? el("b", "", p) : p).append(part);
    return b;
  }

  frame(s) {
    const W = this.host.clientWidth || 1280, H = this.host.clientHeight || 720, fs = clamp(0.011 * W + 12, 20, 27);
    this.sfx.style.display = s.sfx ? "block" : "none";
    if (s.sfx) {
      const a = s.sfx.age, k = a < 0.08 ? 0.45 : a < 0.16 ? 1.18 : a < 0.24 ? 0.96 : a < 0.5 ? 1 : 1.04, m = a < 0.16 ? [-0.09, 0.05] : a < 0.33 ? [-0.045, 0.03] : [-0.025, 0.015];
      if (!this.sfx.firstChild) { el("b", "", this.sfx).textContent = s.sfx.text; this.sfx.append(s.sfx.text); }
      this.sfx.style.fontSize = `${clamp(0.11 * W, 64, 168)}px`;
      this.sfx.style.scale = k;
      this.sfx.children[0].style.translate = `${m[0]}em ${m[1]}em`;
    }
    const hit = (a, r) => a && r[0] < a[2] && r[2] > a[0] && r[1] < a[3] && r[3] > a[1];
    const live = new Set();
    // for its first half second the layer also lays the bursts and the card out (`warm`, `card`), all but unseen and wherever the seal stands, so a burst's fringe
    // (an SVG pattern under a mask) is rasterised before it pops; shown for one frame only it is never painted, and the pop then costs a 100 ms frame
    const warming = ++this.n <= 6 || performance.now() - this.born < 500;
    const ghosts = warming ? (s.warm ?? []).filter((w) => !s.lines.some((l) => l.slot === w.slot)).map((w) => ({ ...w, ghost: true })) : [];
    for (const l of [...s.lines, ...ghosts]) {
      const b = (this.bubbles[l.slot] ??= this.bubble(l.slot, l.kind, l.text, l.bold));
      live.add(l.slot);
      const av = l.ghost ? null : s.avoid;
      b.style.display = "block"; b.style.opacity = l.ghost ? "0.004" : "";
      b.style.fontSize = `${fs}px`;
      const full = Math.min(0.92 * W, (l.slot === "a" ? 11.5 : 25) * fs), place = (width) => {
        b.style.width = `${width}px`;
        const w = b.offsetWidth, h = b.offsetHeight, bottom = Math.min(0.12 * H, 0.5 * H - h);
        return { w, h, bottom, top: H - bottom - h, fit: (x) => clamp(x, 0.03 * W, W - 0.03 * W - w) };
      };
      // the site's place (beside or under the speaker, lower half); off the seal: under its feet, else the wider side narrowed to the room, else it waits
      let { w, h, bottom, top, fit } = place(full), left = fit(l.left != null ? l.left * W : l.at[0] - w * 0.4);
      const low = av ? [0.08 * H, 0.045 * H, 6].map((gap) => H - av[3] - gap - h).find((v) => v >= 0.03 * H) : undefined;
      if (hit(av, [left, top - 0.07 * H, left + w, top + h]) && low < bottom) { bottom = low; top = H - bottom - h; }
      else if (hit(av, [left, top, left + w, top + h])) {
        const roomR = 0.97 * W - av[2], roomL = av[0] - 0.03 * W, right = roomR >= roomL, room = Math.max(roomR, roomL);
        if (room < 13 * fs) { b.style.display = "none"; live.delete(l.slot); continue; }
        ({ w, h, bottom, top, fit } = place(Math.min(full, room)));
        left = right ? W - 0.03 * W - w : 0.03 * W;
      }
      b.style.left = `${left}px`; b.style.bottom = `${bottom}px`;
      const [k, dy] = l.slot === "a" ? [1, 0] : pop(l.age); // line A starts at full size; the site pops balloon B
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
    const pl = s.pill;
    this.pill.style.display = pl ? "flex" : "none";
    if (pl) {
      if (!this.pill.firstChild) { el("i", "", this.pill); el("span", "", this.pill).textContent = pl.text; }
      this.pill.style.fontSize = `${fs}px`; this.pill.style.left = `${pl.at[0]}px`; this.pill.style.top = `${pl.at[1]}px`;
    }
    const c = this.credit, cr = s.credit ?? (warming && s.card ? { ...s.card, age: 1 } : null);
    c.style.display = cr ? "grid" : "none"; c.style.opacity = s.credit ? "" : "0.004";
    if (cr) {
      if (!c.firstChild) { el("strong", "", c).textContent = cr.title; el("span", "", c).textContent = cr.sub; el("strong", "", c).textContent = cr.ret; }
      c.style.bottom = `${0.17 * H}px`;
      c.style.minWidth = `${Math.min(560, 0.8 * W)}px`; c.style.maxWidth = `${Math.min(0.92 * W, 640)}px`;
      [...c.children].forEach((e, i) => { e.style.fontSize = i === 1 ? `${clamp(0.016 * W, 13, 18)}px` : `${clamp(0.022 * W, 16, 24)}px`; });
      c.style.scale = 1; c.style.translate = "-50% 0px"; // the card starts at full size
    }
  }

  dispose() { this.root.remove(); }
}
