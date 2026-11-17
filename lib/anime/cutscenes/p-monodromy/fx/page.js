// The comic-print layer of p-monodromy: DOM over the picture in the page's own forms (oval and burst balloons, ZZAAP, the
// gold-and-crimson manuscript frame, the teal dotted field and its ring, the credit card), on the scene's clock. Lengths are CSS px.
const FONTS = "https://fonts.googleapis.com/css2?family=Shantell+Sans:ital,wght,BNCE,INFM@0,300..800,-100..100,0..100&display=swap";
const STAR = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 20 : 50; return `${(50 + Math.cos(a) * r).toFixed(1)}% ${(50 + Math.sin(a) * r).toFixed(1)}%`; }).join(",");
const CSS = `
.mn { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; --cream: #fbfaf7; --accent: #1fbdb4; --ink: #1c1b19; font-family: var(--font-comic, "Shantell Sans"), system-ui, sans-serif; }
.mn * { box-sizing: border-box; }
.mn-field { position: absolute; inset: 0; opacity: 0; background: radial-gradient(circle, #2a7f78 0 1.2px, transparent 1.7px) 0 0 / 7px 7px, #1a4a46; }
.mn-field i { position: absolute; left: 50%; top: 50%; translate: -50% -50%; border-style: solid; border-color: #e6fffb; border-radius: 50%; box-shadow: 0 0 22px #2ad0c8; }
.mn-frame { position: absolute; inset: 0; border: 14px solid #e9b23a; box-shadow: inset 0 0 0 4px #b3123a; opacity: 0; z-index: 5; }
.mn-frame s { position: absolute; width: 38px; height: 38px; background: #e9b23a; clip-path: polygon(${STAR}); }
.mn-frame s:nth-child(1) { left: -14px; top: -14px; }
.mn-frame s:nth-child(2) { right: -14px; top: -14px; }
.mn-frame s:nth-child(3) { left: -14px; bottom: -14px; }
.mn-frame s:nth-child(4) { right: -14px; bottom: -14px; }
.mn-sfx { position: absolute; left: 7%; top: 12%; display: none; font-weight: 800; line-height: 1; letter-spacing: 0.02em; color: #1fbdb4; -webkit-text-stroke: 0.06em var(--cream); paint-order: stroke fill; rotate: -9deg; white-space: nowrap; }
.mn-sfx b { position: absolute; inset: 0; font-weight: 800; -webkit-text-stroke: 0; color: #140f3a; translate: 0.05em 0.05em; z-index: -1; }
.mn-bubble { position: absolute; padding: 1.15em 2em 1.3em; color: var(--ink); transform-origin: 50% 0; filter: drop-shadow(0 10px 18px rgba(12, 8, 30, 0.28)); }
.mn-bubble[data-kind="burst"] { padding: 1.6em 2.4em 1.7em; }
.mn-bubble svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.mn-bubble .ink { fill: var(--cream); stroke: var(--ink); stroke-width: 3; stroke-linejoin: round; }
.mn-bubble .tail.ink { stroke-width: 5; }
.mn-bubble .fill { fill: var(--cream); }
.mn-bubble pattern circle { fill: var(--accent); opacity: 0.42; }
.mn-bubble p { position: relative; margin: 0; text-align: center; line-height: 1.22; font-weight: 500; font-variation-settings: "BNCE" 45, "INFM" 70; }
.mn-bubble p b { font-weight: 800; font-variation-settings: "BNCE" 70, "INFM" 90; }
.mn-bubble[data-kind="burst"] p { rotate: -1.5deg; }
.mn-credit { position: absolute; left: 50%; display: none; gap: 0.2em; width: max-content; padding: 0.7em 1.1em; text-align: center; background: var(--cream); color: var(--ink); border: 1.5px solid var(--ink); border-radius: 14px; box-shadow: 0 10px 24px rgba(12, 8, 30, 0.28); transform-origin: 50% 0; }
.mn-credit strong { font-weight: 700; line-height: 1.25; }
.mn-credit span, .mn-credit small { opacity: 0.72; }`;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; parent?.appendChild(e); return e; };
// the balloon's pop, on twos: [scale, drop px]
const pop = (age) => (age < 0.08 ? [0.62, 18] : age < 0.16 ? [1.08, -4] : age < 0.24 ? [0.98, 0] : [1, 0]);

function burst(w, h) {
  let d = "";
  for (let i = 0; i < 52; i++) {
    const a = (i / 52) * Math.PI * 2, r = i % 2 ? 1.0 : 0.88 + 0.05 * Math.sin(i * 2.3);
    d += `${i ? "L" : "M"}${(w / 2 + Math.cos(a) * (w / 2) * r * 1.04).toFixed(1)} ${(h / 2 + Math.sin(a) * (h / 2) * r * 1.12).toFixed(1)}`;
  }
  return `${d}Z`;
}

// the comic face: the page's own (--font-comic) inside the site, a bare lab page loads the same family. `then` runs once it is known
export function comicFace(then) {
  const own = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim();
  let l = document.getElementById("mn-font");
  if (!own && !l) { l = el("link", "", document.head); l.id = "mn-font"; l.rel = "stylesheet"; l.href = FONTS; }
  if (then) (own || l.sheet) ? then() : l.addEventListener("load", then, { once: true });
  return own || '"Shantell Sans", sans-serif';
}

export class Comic {
  constructor(host) {
    this.host = host; this.n = 0; this.born = performance.now(); this.bubbles = {};
    if (!document.getElementById("mn-css")) { const st = el("style", "", document.head); st.id = "mn-css"; st.textContent = CSS; document.head.appendChild(st); }
    comicFace();
    this.root = el("div", "mn", host);
    this.field = el("div", "mn-field", this.root);
    this.ring = el("i", "", this.field);
    this.sfx = el("div", "mn-sfx", this.root);
    this.credit = el("div", "mn-credit", this.root);
    this.frameEl = el("div", "mn-frame", this.root);
    for (let i = 0; i < 4; i++) el("s", "", this.frameEl);
  }

  bubble(l) {
    const b = el("div", "mn-bubble", this.root), id = l.slot;
    b.dataset.kind = l.kind;
    const ht = l.kind === "burst" ? `<path class="body" fill="url(#mn-ht-${id})" mask="url(#mn-m-${id})"/>` : "";
    b.innerHTML = `<svg aria-hidden="true"><defs><pattern id="mn-ht-${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.7"/></pattern>
      <linearGradient id="mn-fade-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="mn-m-${id}"><rect width="100%" height="100%" fill="url(#mn-fade-${id})"/></mask></defs>
      <path class="tail ink"/><path class="body ink"/><path class="tail fill"/>${ht}</svg><p></p>`;
    const p = b.querySelector("p"), bolds = [].concat(l.bold ?? []), re = bolds.length ? new RegExp(`(${bolds.map(esc).join("|")})`) : null;
    for (const part of re ? l.text.split(re) : [l.text]) {
      if (!part) continue;
      if (bolds.includes(part)) el("b", "", p).textContent = part; else p.append(part);
    }
    return b;
  }

  // one frame. s: { lines: [{ slot, kind, text, bold, age, at: [x, y] px the tail aims at }], avoid: [x0, y0, x1, y1] px,
  // warm: lines laid out unseen for the first half second, card, credit: { title, sub, ret, age } | null, sfx: { text, age } | null,
  // field: { k } | null (the teal field, k 0..1 grows the ring), frame: { on, shudder: [dx, dy] px } }
  frame(s) {
    const W = this.host.clientWidth || 1280, H = this.host.clientHeight || 720, fs = clamp(0.011 * W + 12, 20, 27);
    this.frameEl.style.opacity = s.frame?.on ? 1 : 0;
    this.frameEl.style.translate = `${s.frame?.shudder?.[0] ?? 0}px ${s.frame?.shudder?.[1] ?? 0}px`;
    this.field.style.opacity = s.field ? 1 : 0;
    if (s.field) {
      const k = s.field.k, e = k * k * (3 - 2 * k), d = 2 * e * 0.3 * H + 0.12 * H;
      this.ring.style.width = this.ring.style.height = `${d}px`; this.ring.style.borderWidth = `${0.012 * H}px`;
    }
    this.sfx.style.display = s.sfx ? "block" : "none";
    if (s.sfx) {
      const a = s.sfx.age, k = a < 0.08 ? 0.45 : a < 0.16 ? 1.18 : a < 0.24 ? 0.96 : 1;
      if (this.sfx.dataset.text !== s.sfx.text) { this.sfx.dataset.text = s.sfx.text; this.sfx.replaceChildren(el("b", "", null), s.sfx.text); this.sfx.firstChild.textContent = s.sfx.text; }
      this.sfx.style.fontSize = `${clamp(0.11 * W, 64, 168)}px`; this.sfx.style.scale = k;
    }
    const hit = (a, r) => a && r[0] < a[2] && r[2] > a[0] && r[1] < a[3] && r[3] > a[1];
    const warming = ++this.n <= 6 || performance.now() - this.born < 500;
    const ghosts = warming ? (s.warm ?? []).filter((w) => !s.lines.some((l) => l.slot === w.slot)).map((w) => ({ ...w, ghost: true })) : [];
    const live = new Set();
    for (const l of [...s.lines, ...ghosts]) {
      const b = (this.bubbles[l.slot] ??= this.bubble(l)), av = l.ghost ? null : s.avoid;
      live.add(l.slot);
      b.style.display = "block"; b.style.opacity = l.ghost ? "0.004" : ""; b.style.fontSize = `${fs}px`;
      const place = (width) => {
        b.style.width = `${width}px`;
        const w = b.offsetWidth, h = b.offsetHeight, bottom = Math.min(0.12 * H, 0.5 * H - h);
        return { w, h, bottom, top: H - bottom - h };
      };
      let { w, h, bottom, top } = place(Math.min(0.92 * W, 25 * fs));
      let left = clamp(l.at[0] - w * 0.4, 0.03 * W, W - 0.03 * W - w);
      if (hit(av, [left, top, left + w, top + h])) {
        const roomR = W - av[2], roomL = av[0], room = Math.max(roomR, roomL);
        if (room < 13 * fs) { b.style.display = "none"; live.delete(l.slot); continue; }
        ({ w, h, bottom, top } = place(Math.min(0.92 * W, 25 * fs, room - 0.06 * W)));
        left = roomR >= roomL ? W - 0.03 * W - w : 0.03 * W;
      }
      b.style.left = `${left}px`; b.style.bottom = `${bottom}px`;
      const [k, dy] = pop(l.age);
      b.style.scale = k; b.style.translate = `0 ${dy}px`;
      const rx = w / 2, ry = h / 2, bx = clamp(l.at[0] - left, w * 0.25, w * 0.75), by = ry - ry * Math.sqrt(Math.max(0, 1 - ((bx - rx) / rx) ** 2)) + 14;
      const tx = l.at[0] - left, ty = l.at[1] - top, len = Math.hypot(tx - bx, ty - by) || 1, ux = (tx - bx) / len, uy = (ty - by) / len, L = clamp(0.1 * H, 56, 104) + 14;
      const px = bx + ux * L, py = by + uy * L, half = Math.min(24, w * 0.05), bow = (ux > 0 ? -1 : 1) * 0.28 * L, cx = (bx + px) / 2 - uy * bow, cy = (by + py) / 2 + ux * bow;
      const key = `${w}|${h}|${Math.round(bx)}|${Math.round(px)}|${Math.round(py)}|${l.kind}`;
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
      if (c.dataset.title !== cr.title) { c.dataset.title = cr.title; c.replaceChildren(); el("strong", "", c).textContent = cr.title; el("span", "", c).textContent = cr.sub; el("small", "", c).textContent = cr.ret; }
      c.style.bottom = `${0.17 * H}px`; c.style.minWidth = `${Math.min(560, 0.8 * W)}px`; c.style.maxWidth = `${Math.min(0.92 * W, 640)}px`;
      c.firstChild.style.fontSize = `${clamp(0.022 * W, 16, 24)}px`; c.children[1].style.fontSize = `${clamp(0.016 * W, 13, 18)}px`; c.lastChild.style.fontSize = `${clamp(0.014 * W, 12, 16)}px`;
      const [k, dy] = pop(cr.age);
      c.style.scale = k; c.style.translate = `-50% ${dy}px`;
    }
  }

  dispose() { this.root.remove(); }
}
