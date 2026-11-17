// THE COMIC-PRINT LAYER of the live cutscene (components/world/cutscene/moves/pr-pyrefly-4180/overlay.jsx, components/world/ui/Bubbles.jsx): DOM over the
// picture with the same banner, dock bar, flash, boxes, inks, tails, halftone fringe and pop-in, driven by the scene clock on twos. Lengths are CSS px of the host.
const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Shantell+Sans:ital,wght,BNCE,INFM@0,300..800,-100..100,0..100&display=swap";
const TITLE = "The Night of the Nine Tails", REPO = "facebook/pyrefly #4180";
const CSS = `
.pf41 { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; --cream: #fbfaf7; --accent: #e0452a; --deep: #1d1240; --dots: #cebaff; font-family: var(--font-comic, "Shantell Sans"), var(--font, "Instrument Sans"), system-ui, sans-serif; }
.pf41 * { box-sizing: border-box; }
.pf41-impact { position: absolute; inset: 0; background: radial-gradient(circle, color-mix(in srgb, var(--dots) 50%, transparent) 0 1.7px, transparent 2.2px) 0 0 / 9px 9px, var(--deep); }
.pf41-impact i { position: absolute; width: 26vmin; height: 26vmin; margin: -13vmin 0 0 -13vmin; border-radius: 50%; border: 1.4vmin solid #e9dcc0; }
.pf41-impact i:nth-child(2) { border-color: #c9b8ee; translate: -6px 3px; opacity: 0.8; }
.pf41-impact i:nth-child(3) { border-color: var(--accent); translate: 5px -3px; opacity: 0.8; }
.pf41-impact[data-tile="1"] i { display: none; }
.pf41-impact[data-tile="1"] i:first-child { display: block; width: 30vmin; height: 30vmin; margin: -15vmin 0 0 -15vmin; border-color: #fbfaf7; }
.pf41-banner { display: none; position: absolute; left: 0; right: 0; top: 16vh; margin-inline: auto; width: min(1180px, calc(100% - 32px)); text-align: center; color: #120e08; transform-origin: 50% 0; }
.pf41-banner::before { content: ""; position: absolute; inset: -26px -44px; z-index: -1; border-radius: 26px; background: linear-gradient(180deg, rgba(232, 211, 164, 0.98), rgba(214, 186, 128, 0.98)); box-shadow: 0 0 0 3px rgba(29, 18, 64, 0.85), 0 12px 44px rgba(10, 5, 24, 0.6); }
.pf41-band { display: block; width: 64px; height: 6px; margin: 0 auto 12px; border-radius: 3px; background: #e0a82e; }
.pf41-banner h2 { margin: 0 auto; max-width: 9.5em; font-size: clamp(40px, 7vw, 88px); font-weight: 800; line-height: 1; letter-spacing: -0.02em; text-transform: uppercase; color: #120e08; text-wrap: balance; font-family: var(--font, "Instrument Sans"), system-ui, sans-serif; }
.pf41-repo { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 16px 0 0; }
.pf41-repo svg { width: 28px; height: 28px; flex: none; }
.pf41-repo span { font-family: var(--font-mono, ui-monospace, monospace); font-size: 15px; color: #2b2233; }
.pf41-flash { display: none; position: absolute; left: 50%; top: calc(16vh + 5vw); width: 0; height: 0; }
.pf41-flash i { position: absolute; left: -90px; top: -44px; width: 120px; height: 88px; border: 10px solid #e8b53c; border-radius: 44px; box-shadow: 0 0 36px #ffd36a, inset 0 0 18px #ffd36a; opacity: 0; }
.pf41-flash i + i { left: -30px; }
.pf41-dock { display: none; position: absolute; left: 0; right: 0; top: 1.2vh; flex-direction: column; align-items: center; gap: 2px; color: #fbfaf7; text-align: center; }
.pf41-dock strong { font-size: clamp(15px, 2.6vh, 28px); letter-spacing: 0.14em; text-transform: uppercase; }
.pf41-dock span { font-family: var(--font-mono, ui-monospace, monospace); font-size: clamp(10px, 1.5vh, 13px); opacity: 0.78; }
.pf41-bubble { position: absolute; padding: 1.15em 2em 1.3em; color: #1c1b19; transform-origin: 50% 0; filter: drop-shadow(0 10px 18px rgba(12, 8, 30, 0.28)); }
.pf41-bubble[data-kind="burst"] { padding: 1.6em 2.4em 1.7em; }
.pf41-bubble svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.pf41-bubble .ink { fill: var(--cream); stroke: #1c1b19; stroke-width: 3; stroke-linejoin: round; }
.pf41-bubble .tail.ink { stroke-width: 5; }
.pf41-bubble .fill { fill: var(--cream); }
.pf41-bubble pattern circle { fill: var(--accent); opacity: 0.42; }
.pf41-bubble p { position: relative; margin: 0; text-align: center; line-height: 1.22; font-weight: 500; font-variation-settings: "BNCE" 45, "INFM" 70; }
.pf41-bubble p b { font-weight: 800; font-variation-settings: "BNCE" 70, "INFM" 90; }
.pf41-bubble[data-kind="burst"] p { rotate: -1.5deg; }
.pf41-credit { position: absolute; left: 50%; display: grid; gap: 0.2em; width: max-content; padding: 0.7em 1.1em; text-align: center; background: var(--cream); color: #1c1b19; border: 1.5px solid #1c1b19; border-radius: 14px; box-shadow: 0 10px 24px rgba(12, 8, 30, 0.28); font-family: var(--font, "Instrument Sans"), system-ui, sans-serif; transform-origin: 50% 0; }
.pf41-credit strong { font-weight: 700; line-height: 1.25; }
.pf41-credit span { opacity: 0.72; }`;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; parent?.appendChild(e); return e; };
const pop = (age) => (age < 0.08 ? [0.62, 18] : age < 0.16 ? [1.08, -4] : age < 0.24 ? [0.98, 0] : [1, 0]);
const bolds = (bold) => (Array.isArray(bold) ? bold : bold ? [bold] : []).filter(Boolean);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const splitBold = (text, bold) => {
  const list = bolds(bold);
  return list.length ? text.split(new RegExp(`(${list.map(esc).join("|")})`)).filter((p) => p !== "") : [text];
};

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
  let l = document.getElementById("pf41-font");
  if (!own && !l) { l = el("link", "", document.head); l.id = "pf41-font"; l.rel = "stylesheet"; l.href = FONTS; }
  if (then) own || l.sheet ? then() : l.addEventListener("load", then, { once: true });
  return own || '"Shantell Sans", sans-serif';
}

const JOKES = [
  "You can't hold me forever!",
  "No seal can hold the Nine-Tails!",
  "I'll tear this village apart, chains and all!",
  "You think a little seal can cage me?",
  "Chains won't stop me. Nothing stops me!",
  "That flash again… who are you?!",
  "Release me! I am the strongest of the tailed beasts!",
  "Your kunai are everywhere. Where are you?!",
  "Hatred like mine can't be sealed!",
  "I was here before your village. I'll outlast it!",
  "You're too fast… what kind of seal are you?",
  "No jutsu holds me for long. Not one!",
  "I'll break loose the moment you blink!",
  "Seal me, and I'll be waiting at the end!",
  "Fool! Every chain breaks eventually!",
];
let picked = null;
export function jokeIndex() {
  if (picked !== null) return picked;
  const q = new URLSearchParams(globalThis.location?.search ?? "").get("joke");
  if (q !== null && q !== "") return (picked = clamp(Number.parseInt(q, 10) || 0, 0, JOKES.length - 1));
  let last = -1;
  try { const raw = sessionStorage.getItem("pf41-joke"); last = raw === null ? -1 : Number(raw); } catch { last = -1; }
  let i = Math.floor(Math.random() * JOKES.length);
  if (i === last) i = (i + 1 + Math.floor(Math.random() * (JOKES.length - 1))) % JOKES.length;
  try { sessionStorage.setItem("pf41-joke", String(i)); } catch { /* private window: the joke still shows */ }
  return (picked = i);
}

export const TEXT = {
  a: { kind: "burst", get text() { return JOKES[jokeIndex()]; } },
  b: { kind: "oval", text: "Flying Thunder God.", bold: ["Flying Thunder God"] },
  k: { kind: "burst", text: "…dattebane!", bold: ["dattebane!"], stack: true },
  c: { kind: "burst", text: "208 two-module SCCs chained in one Rust test. The failure is pinned at the end with should_panic.", bold: ["208 two-module SCCs chained in one Rust test.", "pinned"] },
  credit: { title: "facebook/pyrefly #4180", sub: "208 SCCs pinned · the paper stage folds and the island is behind it" },
};
export { JOKES };

const BANNER_OUT = 1.2;

export class Comic {
  constructor(host) {
    this.host = host;
    if (!document.getElementById("pf41-css")) {
      el("style", "", document.head).id = "pf41-css";
      document.getElementById("pf41-css").textContent = CSS;
      comicFace();
    }
    this.root = el("div", "pf41", host);
    this.impact = el("div", "pf41-impact", this.root, "<i></i><i></i><i></i>");
    this.banner = el("div", "pf41-banner", this.root, `<span class="pf41-band" aria-hidden="true"></span><h2>${TITLE}</h2><p class="pf41-repo"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 14C10 8 3 8 3 14s7 6 11 0 8-6 11 0-7 6-11 0Z" fill="none" stroke="#2b2233" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${REPO}</span></p>`);
    this.flash = el("div", "pf41-flash", this.root, "<i></i><i></i>");
    this.dock = el("div", "pf41-dock", this.root, `<strong>${TITLE}</strong><span>${REPO}</span>`);
    this.bubbles = {};
    this.credit = el("div", "pf41-credit", this.root);
    this.born = performance.now(); this.n = 0;
  }

  bubble(slot, kind, text, bold) {
    const b = el("div", "pf41-bubble", this.root);
    b.dataset.kind = kind;
    const dots = kind === "burst" ? `<path class="body dots" fill="url(#pf41-ht-${slot})" mask="url(#pf41-m-${slot})"/>` : "";
    b.innerHTML = `<svg aria-hidden="true"><defs><pattern id="pf41-ht-${slot}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.7"/></pattern>
      <linearGradient id="pf41-fade-${slot}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="pf41-m-${slot}"><rect width="100%" height="100%" fill="url(#pf41-fade-${slot})"/></mask></defs>
      <path class="tail ink"/><path class="body ink"/><path class="tail fill"/>${dots}</svg><p></p>`;
    const p = b.querySelector("p"), list = bolds(bold);
    for (const part of splitBold(text, bold)) (list.includes(part) ? el("b", "", p) : p).append(part);
    return b;
  }

  frameBanner(t, H) {
    const b = this.banner;
    if (t == null || t < 0 || t >= BANNER_OUT) { b.style.display = "none"; return; }
    let o = 1, sc = 1, y = 0;
    if (t < 0.096) { const k = t / 0.096; o = k; sc = 0.96 + 0.075 * k; }
    else if (t < 0.24) sc = 1.035;
    else if (t < 0.744) sc = 1;
    else if (t < 1.008) { const k = (t - 0.744) / 0.264, e = k * k; o = 1 - 0.1 * e; sc = 1 - 0.38 * e; y = -0.06 * H * e; }
    else { const k = (t - 1.008) / 0.192, e = k * (2 - k); o = 0.9 * (1 - e); sc = 0.62 - 0.34 * e; y = -0.06 * H - 0.07 * H * e; }
    b.style.display = "block";
    b.style.opacity = o.toFixed(3);
    b.style.transform = `translateY(${y.toFixed(1)}px) scale(${sc.toFixed(3)})`;
  }

  frameFlash(t) {
    const f = this.flash, on = t != null && t >= 0 && t < 0.58;
    f.style.display = on ? "block" : "none";
    if (!on) return;
    [...f.children].forEach((i, k) => {
      const q = (t - 0.06 * k) / 0.52;
      if (q < 0 || q >= 1) { i.style.opacity = "0"; return; }
      const e = 1 - (1 - q) * (1 - q);
      i.style.opacity = (q < 0.6 ? 1 - 0.1 * (q / 0.6) : 0.9 * (1 - (q - 0.6) / 0.4)).toFixed(3);
      i.style.transform = `scale(${(0.5 + 2.1 * e).toFixed(3)})`;
    });
  }

  frameDock(t) {
    const d = this.dock;
    if (t == null || t < 1.75 || t >= 27.6) { d.style.display = "none"; return; }
    d.style.display = "flex";
    d.style.opacity = Math.min(1, (t - 1.75) / 0.42).toFixed(3);
  }

  // one frame. s: { banner: clock t | null, dock: clock t | null, flash: bool, impact: [u, v, scale] | null, lines: [{ slot, kind, text, bold, age, at: [x, y] px, left?, stack? }],
  //   credit: { title, sub, age, opacity? } | null, card: credit to lay out at opacity 0.004, warm: lines to lay out at opacity 0.004, avoid: [x0, y0, x1, y1] px }
  frame(s) {
    const W = this.host.clientWidth || 1280, H = this.host.clientHeight || 720, fs = clamp(0.011 * W + 12, 20, 27);
    this.impact.style.display = s.impact ? "block" : "none";
    if (s.impact) { this.impact.dataset.tile = s.impact[3] === "collapse" ? "1" : ""; for (const i of this.impact.children) { i.style.left = `${s.impact[0] * 100}%`; i.style.top = `${s.impact[1] * 100}%`; } this.impact.style.scale = s.impact[2]; }
    this.frameBanner(s.banner, H);
    this.frameFlash(s.banner);
    this.frameDock(s.dock);
    const hit = (a, r) => a && r[0] < a[2] && r[2] > a[0] && r[1] < a[3] && r[3] > a[1];
    const live = new Set(), placed = [];
    const warming = ++this.n <= 6 || performance.now() - this.born < 500;
    const ghosts = warming ? (s.warm ?? []).filter((w) => !s.lines.some((l) => l.slot === w.slot)).map((w) => ({ ...w, ghost: true })) : [];
    const order = [...s.lines, ...ghosts].sort((a, b) => Number(Boolean(a.stack)) - Number(Boolean(b.stack)));
    for (const l of order) {
      const b = (this.bubbles[l.slot] ??= this.bubble(l.slot, l.kind, l.text, l.bold));
      live.add(l.slot);
      const av = l.ghost ? null : s.avoid, at = l.at ?? [0.6 * W, 0.4 * H];
      b.style.display = "block"; b.style.opacity = l.ghost ? "0.004" : "";
      b.style.fontSize = `${fs}px`;
      const full = Math.min(0.92 * W, 25 * fs), place = (width) => {
        b.style.width = `${width}px`;
        const w = b.offsetWidth, h = b.offsetHeight, bottom = Math.min(0.12 * H, 0.5 * H - h);
        return { w, h, bottom, top: H - bottom - h, fit: (x) => clamp(x, 0.03 * W, W - 0.03 * W - w) };
      };
      let { w, h, bottom, top, fit } = place(full), left = fit(l.left != null ? l.left * W : at[0] - w * 0.4);
      const low = av ? [0.08 * H, 0.045 * H, 6].map((gap) => H - av[3] - gap - h).find((v) => v >= 0.03 * H) : undefined;
      if (hit(av, [left, top - 0.07 * H, left + w, top + h]) && low < bottom) { bottom = low; top = H - bottom - h; }
      else if (hit(av, [left, top, left + w, top + h])) {
        const roomR = 0.97 * W - av[2], roomL = av[0] - 0.03 * W, right = roomR >= roomL, room = Math.max(roomR, roomL);
        const narrow = room < 13 * fs;
        ({ w, h, bottom, top, fit } = place(Math.min(full, narrow ? Math.max(room, 11 * fs) : room)));
        if (narrow) { bottom = Math.min(bottom, 0.04 * H); top = H - bottom - h; }
        left = right ? W - 0.03 * W - w : 0.03 * W;
      }
      if (l.stack && !l.ghost) {
        let raise = bottom;
        for (const q of placed) if (q.left < left + w + 8 && q.left + q.w > left - 8) raise = Math.max(raise, q.bottom + q.h + 0.02 * H);
        if (raise > bottom && raise + h <= 0.5 * H) { bottom = raise; top = H - bottom - h; }
      }
      if (!l.ghost) placed.push({ left, w, h, bottom });
      b.style.left = `${left}px`; b.style.bottom = `${bottom}px`;
      const [k, dy] = pop(l.age ?? 1);
      b.style.scale = k; b.style.translate = `0 ${dy}px`;
      const rx = w / 2, ry = h / 2, bx = clamp(at[0] - left, w * 0.25, w * 0.75), by = ry - ry * Math.sqrt(1 - ((bx - rx) / rx) ** 2) + 14;
      const tx = at[0] - left, ty = at[1] - top, len = Math.hypot(tx - bx, ty - by) || 1, ux = (tx - bx) / len, uy = (ty - by) / len, L0 = clamp(0.1 * H, 56, 104) + 14;
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
    const c = this.credit, cr = s.credit ?? (warming && s.card ? { ...s.card, age: 1, opacity: 0.004 } : null);
    c.style.display = cr ? "grid" : "none";
    c.style.opacity = cr ? (cr.opacity ?? "") : "0.004";
    if (cr) {
      if (!c.firstChild) { el("strong", "", c).textContent = cr.title; el("span", "", c).textContent = cr.sub; }
      c.style.bottom = `${0.17 * H}px`;
      c.style.minWidth = `${Math.min(560, 0.8 * W)}px`; c.style.maxWidth = `${Math.min(0.92 * W, 640)}px`;
      c.firstChild.style.fontSize = `${clamp(0.022 * W, 16, 24)}px`; c.lastChild.style.fontSize = `${clamp(0.016 * W, 13, 18)}px`;
      const [k, dy] = pop(cr.age ?? 1);
      c.style.scale = k; c.style.translate = `-50% ${dy}px`;
    }
  }

  dispose() { this.root.remove(); }
}
