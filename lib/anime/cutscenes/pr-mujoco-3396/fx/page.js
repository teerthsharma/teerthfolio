// The comic-print layer as the deployed build draws it (commit 460bafd: moves/pr-mujoco-3396/banner.js, app/globals.css .comic-impact,
// components/world/ui/Bubbles.jsx). DOM over the picture; every key is read from the clock, not WAAPI.
const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Shantell+Sans:ital,wght,BNCE,INFM@0,300..800,-100..100,0..100&display=swap";
const CSS = `
.mj { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; --cream: #fbfaf7; --accent: #ff8a3a; font-family: var(--font-comic, "Shantell Sans"), system-ui, sans-serif; }
.mj * { box-sizing: border-box; }
.mj-impact { position: absolute; inset: 0; display: none; background: radial-gradient(circle, rgba(255, 215, 186, 0.5) 0 1.7px, transparent 2.2px) 0 0 / 9px 9px, #402312; }
.mj-impact i { position: absolute; left: 50%; top: 55%; width: 26vmin; height: 26vmin; margin: -13vmin 0 0 -13vmin; border-radius: 50%; border: 1.4vmin solid #fbfaf7; }
.mj-impact i.c { border-color: #2ec5ff; translate: -6px 3px; opacity: 0.8; }
.mj-impact i.a { border-color: #ff8a3a; translate: 5px -3px; opacity: 0.8; }
.mj-plate { position: absolute; left: 50%; top: 16vh; width: min(820px, calc(100vw - 32px)); transform-origin: 50% 0; text-align: center; color: #1d1b18; }
.mj-bubble { position: absolute; padding: 1.15em 2em 1.3em; color: #1c1b19; transform-origin: 50% 0; filter: drop-shadow(0 10px 18px rgba(12, 8, 30, 0.28)); }
.mj-bubble[data-kind="burst"] { padding: 1.6em 2.4em 1.7em; }
.mj-bubble svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.mj-bubble .ink { fill: var(--cream); stroke: #1c1b19; stroke-width: 3; stroke-linejoin: round; }
.mj-bubble .tail.ink { stroke-width: 5; }
.mj-bubble .fill { fill: var(--cream); }
.mj-bubble pattern circle { fill: var(--accent); opacity: 0.42; }
.mj-bubble p { position: relative; margin: 0; text-align: center; line-height: 1.22; font-weight: 500; font-variation-settings: "BNCE" 45, "INFM" 70; }
.mj-bubble p b { font-weight: 800; font-variation-settings: "BNCE" 70, "INFM" 90; }
.mj-bubble[data-kind="burst"] p { rotate: -1.5deg; }
.mj-card { position: absolute; left: 50%; display: grid; gap: 0.2em; width: max-content; padding: 0.7em 1.1em; text-align: center; background: var(--cream); color: #1c1b19; border: 1.5px solid #1c1b19; border-radius: 14px; box-shadow: 0 10px 24px rgba(12, 8, 30, 0.28); font-family: var(--font, "Instrument Sans"), system-ui, sans-serif; transform-origin: 50% 0; }
.mj-card strong { font-weight: 700; line-height: 1.25; }
.mj-card span { opacity: 0.72; }`;

const TITLE = "THE WALLS WERE TITANS";
const ROW = "google-deepmind · mujoco #3396 · mujoco_warp #1541 · mujoco #3450";
const HOME = "The Wall is open. The drawing burns away, and the seal comes home.";
const PAPER = "radial-gradient(ellipse at 18% 80%, rgba(40,34,30,.28), transparent 45%), radial-gradient(ellipse at 88% 20%, rgba(40,34,30,.22), transparent 40%), repeating-linear-gradient(118deg, rgba(30,26,22,.07) 0 1px, transparent 1px 5px), radial-gradient(circle at 50% 50%, #d6cdbf, #c3b8a8 70%, #a99d8b)";
const SLAM = [[0, { s: 1.7, o: 0, x: 0, y: 0 }], [0.13, { s: 0.96, o: 1, x: 0, y: 0 }], [0.286, { s: 0.96, o: 1, x: 0, y: 0 }], [0.354, { s: 1, o: 1, x: 7, y: 3 }], [0.416, { s: 1, o: 1, x: -6, y: -2 }], [0.52, { s: 1, o: 1, x: 0, y: 0 }]];

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; parent?.appendChild(e); return e; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// the bubble's pop, on twos (the site's bubble-in keyframes under steps(1, end)): [scale, drop px]
const pop = (age) => (age < 0.08 ? [0.62, 18] : age < 0.16 ? [1.08, -4] : age < 0.24 ? [0.98, 0] : [1, 0]);
const hit = (a, r) => a && r[0] < a[2] && r[2] > a[0] && r[1] < a[3] && r[3] > a[1];
// linear keys between [offset, {value}] pairs; the last key holds
const keys = (frames, a) => {
  if (a <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) if (a <= frames[i][0]) {
    const [o0, v0] = frames[i - 1], [o1, v1] = frames[i], k = (a - o0) / (o1 - o0);
    return Object.fromEntries(Object.keys(v1).map((key) => [key, v0[key] + (v1[key] - v0[key]) * k]));
  }
  return frames[frames.length - 1][1];
};
// cubic-bezier(.2, .8, .2, 1): the plate's dock easing
const bez = (a, b, s) => 3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s;
const DOCK_EASE = (p) => { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (bez(0.2, 0.2, m) < p) lo = m; else hi = m; } return bez(0.8, 1, (lo + hi) / 2); };

function burst(w, h) {
  let d = "";
  for (let i = 0; i < 52; i++) {
    const a = (i / 52) * Math.PI * 2, r = i % 2 ? 1.0 : 0.88 + 0.05 * Math.sin(i * 2.3);
    d += `${i ? "L" : "M"}${(w / 2 + Math.cos(a) * (w / 2) * r * 1.04).toFixed(1)} ${(h / 2 + Math.sin(a) * (h / 2) * r * 1.12).toFixed(1)}`;
  }
  return `${d}Z`;
}

function comicFace() {
  const own = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim();
  if (!own && !document.getElementById("mj-font")) { const l = el("link", "", document.head); l.id = "mj-font"; l.rel = "stylesheet"; l.href = FONTS; }
  return own || '"Shantell Sans", sans-serif';
}

// the torn plate: a polygon round the box with ragged steps (percent), as the live banner
function torn(seed, inset) {
  const r = (i) => (((Math.sin(i * 127.1 + seed * 311.7) * 43758.5453) % 1) + 1) % 1, pts = [], n = 26;
  for (let i = 0; i <= n; i++) pts.push([(i / n) * 100, inset + r(i) * 3.2]);
  for (let i = 0; i <= 8; i++) pts.push([100 - inset - r(i + 40) * 1.6, (i / 8) * 100]);
  for (let i = n; i >= 0; i--) pts.push([(i / n) * 100, 100 - inset - r(i + 80) * 4]);
  for (let i = 8; i >= 0; i--) pts.push([inset + r(i + 120) * 1.6, (i / 8) * 100]);
  return `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(",")})`;
}

// THE BANNER: "slam" (in with the boom, a hit-stop, the shake, nine dust puffs) to "dock" (up under the top bar, scale 0.36), "home" (the return line
// fades in on the docked plate), "out" (300 ms fade). age: seconds since the state began.
export class Banner {
  constructor(host) {
    const plate = el("div", "mj-plate", host);
    const edge = el("div", "", plate), paper = el("div", "", plate), body = el("div", "", plate), dust = el("div", "", plate);
    Object.assign(edge.style, { position: "absolute", inset: "-14px -22px", background: "#26221e", clipPath: torn(3, 0), filter: "blur(0.6px)" });
    Object.assign(paper.style, { position: "absolute", inset: "-8px -16px", clipPath: torn(5, 0.6), background: PAPER });
    Object.assign(body.style, { position: "relative", padding: "22px 20px 18px" });
    Object.assign(dust.style, { position: "absolute", left: "0", right: "0", bottom: "-18px", height: "40px" });
    const name = el("h2", "", body);
    name.textContent = TITLE;
    Object.assign(name.style, { margin: "0", fontSize: "clamp(40px, 7vw, 88px)", lineHeight: "0.95", fontWeight: "800", letterSpacing: "-0.02em", color: "#1d1b18", textShadow: "1px 1px 0 rgba(29,27,24,.35), -1px 0 2px rgba(29,27,24,.3), 0 0 10px rgba(29,27,24,.18)" });
    const row = el("p", "", body);
    row.textContent = ROW;
    Object.assign(row.style, { margin: "14px 0 0", fontFamily: "var(--mono, monospace)", fontSize: "clamp(13px, 1.6vw, 17px)", fontWeight: "700" });
    this.home = el("p", "", body);
    this.home.textContent = HOME;
    Object.assign(this.home.style, { margin: "0", maxHeight: "0", overflow: "hidden", opacity: "0", fontFamily: "var(--font-bubble, 'Shantell Sans', cursive)", fontWeight: "700", fontSize: "clamp(36px, 4.6vw, 48px)", lineHeight: "1.1", color: "#2a1d14" });
    this.puffs = Array.from({ length: 9 }, (_, i) => {
      const p = el("i", "", dust);
      Object.assign(p.style, { position: "absolute", left: `${6 + i * 11}%`, bottom: "0", width: "54px", height: "34px", borderRadius: "50%", background: "radial-gradient(circle, rgba(60,52,46,.55), rgba(60,52,46,0) 70%)", opacity: "0" });
      return p;
    });
    this.plate = plate;
  }

  set({ state, age }) {
    const a = Math.max(0, age ?? 0);
    let top = 9.6, s = 0.36, o = 1, x = 0, y = 0, home = 0;
    if (state === "slam") ({ s, o, x, y } = keys(SLAM, a)), top = 16;
    else if (state === "dock") { const e = DOCK_EASE(Math.min(1, a / 0.42)); top = 16 + (9.6 - 16) * e; s = 1 + (0.36 - 1) * e; }
    else if (state === "home") home = Math.min(1, a / 0.5);
    else if (state === "out") o = 1 - Math.min(1, a / 0.3);
    this.plate.style.top = `${top}vh`;
    this.plate.style.transform = `translateX(calc(-50% + ${x}px)) translateY(${y}px) scale(${s})`;
    this.plate.style.opacity = o;
    this.home.style.maxHeight = home ? "4em" : "0";
    this.home.style.opacity = home;
    this.home.style.transform = `translateY(${-8 * (1 - home)}px)`;
    this.home.style.marginTop = home ? "14px" : "0";
    this.puffs.forEach((p, i) => {
      const pa = a - 0.14, q = keys([[0, { o: 0, s: 0.4, x: 0, y: 0 }], [0.18, { o: 0.9, s: 1, x: (i - 4) * 4, y: 2 }], [0.9, { o: 0, s: 2.2, x: (i - 4) * 14, y: 10 }]], Math.max(0, pa));
      p.style.opacity = state === "slam" && pa >= 0 ? q.o : 0;
      p.style.transform = `translate(${q.x}px, ${q.y}px) scale(${q.s})`;
    });
  }

  dispose() { this.plate.remove(); }
}

// THE COMIC PRINT: the impact flash, balloons (oval or burst, bold words, halftone fringe, tail to the speaker), the credit card, the banner
export class Comic {
  constructor(host) {
    this.host = host;
    if (!document.getElementById("mj-css")) { const s = el("style", "", document.head); s.id = "mj-css"; s.textContent = CSS; comicFace(); }
    this.root = el("div", "mj", host);
    this.impact = el("div", "mj-impact", this.root);
    el("i", "c", this.impact); el("i", "a", this.impact); el("i", "", this.impact);
    this.banner = new Banner(this.root);
    this.bubbles = {};
    this.card = el("div", "mj-card", this.root);
  }

  bubble(slot, kind, text, bold) {
    const b = el("div", "mj-bubble", this.root), id = `mj-${slot}`;
    b.dataset.kind = kind;
    b.innerHTML = `<svg aria-hidden="true"><defs><pattern id="${id}-ht" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.7"/></pattern>
      <linearGradient id="${id}-fade" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="${id}-m"><rect width="100%" height="100%" fill="url(#${id}-fade)"/></mask></defs>
      <path class="tail ink"/><path class="body ink"/><path class="tail fill"/>${kind === "burst" ? `<path class="body dots" fill="url(#${id}-ht)" mask="url(#${id}-m)"/>` : ""}</svg><p></p>`;
    const p = b.querySelector("p"), parts = bold?.length ? text.split(new RegExp(`(${bold.map(esc).join("|")})`)) : [text];
    for (const part of parts) {
      if (!part) continue;
      if (bold?.includes(part)) el("b", "", p).textContent = part;
      else p.append(part);
    }
    return b;
  }

  // the impact flash: a 167 ms drawing, on 24 fps steps; the field and the three rings scale 1.06 on its middle two drawings
  flash(f) {
    const k = f ? Math.floor(f.age * 24 + 1e-6) : 4;
    this.impact.style.display = k < 4 ? "block" : "none";
    this.impact.style.scale = k >= 2 && k < 4 ? "1.06" : "1";
  }

  // one frame. s: { banner: { state, age }, lines: [{ slot, kind, text, bold, age, at: [px, py], left, hold }], credit: { title, sub, age } | null,
  // avoid: [x0, y0, x1, y1] px | null, flash: { age } | null }. A hold line sits in the lower left, off the seal, and is never hidden.
  frame(s) {
    const W = this.host.clientWidth || 1280, H = this.host.clientHeight || 720, fs = clamp(0.011 * W + 12, 20, 27);
    this.banner.set(s.banner);
    this.flash(s.flash);
    const live = new Set(), av = s.avoid, full = Math.min(0.92 * W, 25 * fs);
    for (const l of s.lines) {
      const b = (this.bubbles[l.slot] ??= this.bubble(l.slot, l.kind, l.text, l.bold));
      live.add(l.slot);
      b.style.display = "block";
      b.style.fontSize = `${fs}px`;
      const place = (width) => {
        b.style.width = `${width}px`;
        const w = b.offsetWidth, h = b.offsetHeight, bottom = Math.min(0.12 * H, 0.5 * H - h);
        return { w, h, bottom, top: H - bottom - h, fit: (x) => clamp(x, 0.03 * W, W - 0.03 * W - w) };
      };
      let { w, h, bottom, top, fit } = place(full), left;
      if (l.hold) {
        ({ w, h, bottom, top, fit } = place(0.3 * W));
        left = 0.03 * W;
        bottom = 0.03 * H;
        top = H - bottom - h;
      } else {
        left = fit(l.left != null ? l.left * W : l.at[0] - w * 0.4);
        // off the seal: just under its box if that fits, else the wider side of it, else the balloon waits
        const low = av ? [0.08 * H, 0.045 * H, 6].map((g) => H - av[3] - g - h).find((y) => y >= 0.03 * H) : undefined;
        if (hit(av, [left, top - 0.07 * H, left + w, top + h]) && low < bottom) { bottom = low; top = H - bottom - h; }
        else if (hit(av, [left, top, left + w, top + h])) {
          const roomR = 0.97 * W - av[2], roomL = av[0] - 0.03 * W, right = roomR >= roomL, room = Math.max(roomR, roomL);
          const above = H - av[1] + 0.03 * H;
          // too little room beside the seal: rise above its box at full width; narrow only when that does not fit either
          if (room < 0.5 * full && H - above - h >= 0.03 * H) { bottom = above; top = H - bottom - h; }
          else {
            if (room < 13 * fs) { b.style.display = "none"; live.delete(l.slot); continue; }
            ({ w, h, bottom, top, fit } = place(Math.min(full, room)));
            left = right ? W - 0.03 * W - w : 0.03 * W;
          }
        }
      }
      b.style.left = `${left}px`;
      b.style.bottom = `${bottom}px`;
      const [k, dy] = pop(l.age);
      b.style.scale = l.hold ? k * 0.9 : k;
      b.style.translate = `0 ${dy}px`;
      const rx = w / 2, ry = h / 2, bx = clamp(l.at[0] - left, w * 0.25, w * 0.75), by = ry - ry * Math.sqrt(Math.max(0, 1 - ((bx - rx) / rx) ** 2)) + 14;
      const tx = l.at[0] - left, ty = l.at[1] - top, len = Math.hypot(tx - bx, ty - by) || 1, ux = (tx - bx) / len, uy = (ty - by) / len, L0 = clamp(0.1 * H, 56, 104) + 14;
      const tip = [left + bx + ux * L0, top + by + uy * L0];
      const L = av && uy < 0 && tip[1] < av[3] + 4 && tip[0] > av[0] && tip[0] < av[2] ? Math.max(24, (top + by - av[3] - 4) / -uy) : L0;
      const px = bx + ux * L, py = by + uy * L, half = Math.min(24, w * 0.05), bow = (ux > 0 ? -1 : 1) * 0.28 * L, cx = (bx + px) / 2 - uy * bow, cy = (by + py) / 2 + ux * bow;
      const key = `${w}|${h}|${Math.round(bx)}|${Math.round(px)}|${Math.round(py)}`;
      if (b.dataset.key !== key) {
        b.dataset.key = key;
        b.querySelector("svg").setAttribute("viewBox", `0 0 ${w} ${h}`);
        for (const p of b.querySelectorAll(".tail")) p.setAttribute("d", `M${bx - half} ${by} Q${cx - half * 0.3} ${cy} ${px} ${py} Q${cx + half * 0.5} ${cy} ${bx + half} ${by}Z`);
        for (const p of b.querySelectorAll(".body")) p.setAttribute("d", l.kind === "burst" ? burst(w, h) : `M0 ${ry}A${rx} ${ry} 0 1 0 ${w} ${ry}A${rx} ${ry} 0 1 0 0 ${ry}Z`);
      }
    }
    for (const [slot, b] of Object.entries(this.bubbles)) if (!live.has(slot)) b.style.display = "none";
    const c = this.card;
    c.style.display = s.credit ? "grid" : "none";
    if (s.credit) {
      if (!c.firstChild) { el("strong", "", c).textContent = s.credit.title; el("span", "", c).textContent = s.credit.sub; }
      c.style.bottom = `${0.17 * H}px`;
      c.style.minWidth = `${Math.min(560, 0.8 * W)}px`;
      c.style.maxWidth = `${Math.min(0.92 * W, 640)}px`;
      c.firstChild.style.fontSize = `${clamp(0.022 * W, 16, 24)}px`;
      c.lastChild.style.fontSize = `${clamp(0.016 * W, 13, 18)}px`;
      const [k, dy] = pop(s.credit.age);
      c.style.scale = k;
      c.style.translate = `-50% ${dy}px`;
    }
  }

  dispose() { this.root.remove(); }
}
