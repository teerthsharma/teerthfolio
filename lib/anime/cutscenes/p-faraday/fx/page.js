// THE COMIC-PRINT LAYER of Railgun: DOM balloons, banner, pill and credit card in the site's boxes and inks.
const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Shantell+Sans:ital,wght,BNCE,INFM@0,300..800,-100..100,0..100&display=swap";
const CSS = `
.fb { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; --cream: #fbfaf7; --cyan: #8fe6ff; --accent: #ffa927; --deep: #07182e; --dots: #8fe6ff; font-family: var(--font-comic, "Shantell Sans"), var(--font, "Instrument Sans"), system-ui, sans-serif; }
.fb * { box-sizing: border-box; }
.fb-impact { position: absolute; inset: 0; background: radial-gradient(circle, color-mix(in srgb, var(--dots) 50%, transparent) 0 1.7px, transparent 2.2px) 0 0 / 9px 9px, var(--deep); }
.fb-impact i { position: absolute; width: 26vmin; height: 26vmin; margin: -13vmin 0 0 -13vmin; border-radius: 50%; border: 1.4vmin solid var(--cream); }
.fb-impact i:nth-child(1) { border-color: var(--cyan); translate: -6px 3px; opacity: 0.8; }
.fb-impact i:nth-child(2) { border-color: var(--accent); translate: 5px -3px; opacity: 0.8; }
.fb-rays { position: absolute; left: 50%; top: 42%; width: 160vmin; height: 160vmin; translate: -50% -50%; border-radius: 50%; background: repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--accent) 34%, transparent) 0deg 7deg, transparent 7deg 20deg); mask-image: radial-gradient(closest-side, #000 8%, transparent 70%); }
.fb-big { position: absolute; left: 50%; top: 42%; translate: -50% -50%; display: grid; justify-items: center; gap: 0.3em; text-align: center; color: #1c1b19; }
.fb-pad { display: grid; justify-items: center; gap: 0.3em; padding: 0.3em 1.2em; background: radial-gradient(closest-side, var(--cream) 62%, transparent); }
.fb-band { display: block; width: 64px; height: 6px; background: var(--accent); }
.fb-word { font-weight: 800; text-transform: uppercase; font-size: clamp(40px, 7vw, 88px); line-height: 1; }
.fb-sub { font-size: clamp(14px, 1.6vw, 20px); }
.fb-bar { position: absolute; left: 0; right: 0; top: 0; height: 44px; display: flex; align-items: center; gap: 14px; padding: 0 18px; background: var(--deep); color: var(--cream); }
.fb-bar b { font-weight: 800; font-size: 18px; }
.fb-bar span { opacity: 0.7; font-size: 15px; }
.fb-return { position: absolute; left: 50%; top: 13vh; translate: -50% 0; max-width: min(86vw, 720px); padding: 0.8em 1.4em; background: #fff8e8; color: #07182e; border: 2px solid var(--accent); border-radius: 999px; text-align: center; font-size: clamp(14px, 1.6vw, 20px); line-height: 1.3; box-shadow: 0 10px 24px rgba(7, 24, 46, 0.22); transform-origin: 50% 0; }
.fb-bubble { position: absolute; padding: 1.15em 2em 1.3em; color: #07182e; transform-origin: 50% 0; filter: drop-shadow(0 10px 18px rgba(7, 24, 46, 0.28)); }
.fb-bubble[data-kind="burst"] { padding: 1.6em 2.4em 1.7em; }
.fb-bubble svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.fb-bubble .ink { fill: var(--cream); stroke: #07182e; stroke-width: 3; stroke-linejoin: round; }
.fb-bubble .tail.ink { stroke-width: 5; }
.fb-bubble .fill { fill: var(--cream); }
.fb-bubble pattern circle { fill: var(--cyan); }
.fb-bubble p { position: relative; margin: 0; text-align: center; line-height: 1.22; font-weight: 500; font-variation-settings: "BNCE" 45, "INFM" 70; }
.fb-bubble p b { font-weight: 800; font-variation-settings: "BNCE" 70, "INFM" 90; }
.fb-bubble[data-kind="burst"] p { rotate: -1.5deg; }
.fb-credit { position: absolute; left: 50%; display: grid; gap: 0.2em; width: max-content; padding: 0.7em 1.1em; text-align: center; background: var(--cream); color: #07182e; border: 1.5px solid #07182e; border-radius: 14px; box-shadow: 0 10px 24px rgba(7, 24, 46, 0.28); font-family: var(--font, "Instrument Sans"), system-ui, sans-serif; transform-origin: 50% 0; }
.fb-credit strong { font-weight: 700; line-height: 1.25; }
.fb-credit span { opacity: 0.72; }`;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; parent?.appendChild(e); return e; };
const pop = (age) => (age < 0.08 ? [0.62, 18] : age < 0.16 ? [1.08, -4] : age < 0.24 ? [0.98, 0] : [1, 0]);
const escapeRe = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  let l = document.getElementById("fb-font");
  if (!own && !l) { l = el("link", "", document.head); l.id = "fb-font"; l.rel = "stylesheet"; l.href = FONTS; }
  if (then) own || l.sheet ? then() : l.addEventListener("load", then, { once: true });
  return own || '"Shantell Sans", sans-serif';
}

export class Comic {
  constructor(host) {
    this.host = host; this.n = 0; this.born = performance.now(); this.bubbles = {};
    if (!document.getElementById("fb-css")) { el("style", "", document.head).id = "fb-css"; document.getElementById("fb-css").textContent = CSS; comicFace(); }
    this.root = el("div", "fb", host);
    this.impact = el("div", "fb-impact", this.root, "<i></i><i></i><i></i>");
    this.rays = el("div", "fb-rays", this.root);
    this.big = el("div", "fb-big", this.root, '<div class="fb-pad"><b class="fb-band"></b><div class="fb-word">Railgun</div><div class="fb-sub"></div></div>');
    this.bar = el("div", "fb-bar", this.root, "<b>Railgun</b><span>faraday · lab</span>");
    this.pill = el("div", "fb-return", this.root);
    this.credit = el("div", "fb-credit", this.root);
  }

  bubble(slot, kind, text, bold) {
    const b = el("div", "fb-bubble", this.root);
    b.dataset.kind = kind;
    const dots = kind === "burst" ? `<path class="body dots" fill="url(#fb-ht-${slot})" mask="url(#fb-m-${slot})"/>` : "";
    b.innerHTML = `<svg aria-hidden="true"><defs><pattern id="fb-ht-${slot}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.7"/></pattern>
      <linearGradient id="fb-fade-${slot}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="fb-m-${slot}"><rect width="100%" height="100%" fill="url(#fb-fade-${slot})"/></mask></defs>
      <path class="tail ink"/><path class="body ink"/><path class="tail fill"/>${dots}</svg><p></p>`;
    const p = b.querySelector("p"), re = bold?.length ? new RegExp(`(${bold.map(escapeRe).join("|")})`) : null;
    for (const part of re ? text.split(re) : [text]) (re && bold.includes(part) ? el("b", "", p) : p).append(part);
    return b;
  }

  frame(s) {
    const W = this.host.clientWidth || 1280, H = this.host.clientHeight || 720, fs = clamp(0.011 * W + 12, 20, 27);
    const warming = ++this.n <= 6 || performance.now() - this.born < 500;
    this.impact.style.display = s.impact ? "block" : "none";
    if (s.impact) { for (const i of this.impact.children) { i.style.left = `${s.impact[0] * 100}%`; i.style.top = `${s.impact[1] * 100}%`; } this.impact.style.scale = s.impact[2]; }
    const bn = s.banner, dk = bn ? bn.dock : 1;
    if (bn) this.big.querySelector(".fb-sub").textContent = bn.sub;
    this.big.style.display = this.rays.style.display = dk < 1 ? "grid" : "none";
    this.big.style.opacity = this.rays.style.opacity = 1 - dk;
    this.big.style.translate = `-50% calc(-50% - ${dk * 38}vh)`; this.big.style.scale = `${1 - 0.5 * dk}`;
    this.bar.style.display = bn ? "flex" : "none"; this.bar.style.opacity = dk;
    this.pill.style.display = s.pill ? "block" : "none";
    if (s.pill) { this.pill.textContent = s.pill.text; const [k, dy] = pop(s.pill.age); this.pill.style.scale = k; this.pill.style.translate = `-50% ${dy}px`; }
    const live = new Set();
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
      if (av && hit(av, [left, top - 0.07 * H, left + w, top + h]) && low < bottom) { bottom = low; top = H - bottom - h; }
      else if (av && hit(av, [left, top, left + w, top + h])) {
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
    const cr = s.credit ?? (warming && s.warmCredit ? { ...s.warmCredit, age: 1 } : null), c = this.credit;
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

function hit(a, b) { return b[0] < a[2] && b[2] > a[0] && b[1] < a[3] && b[3] > a[1]; }
