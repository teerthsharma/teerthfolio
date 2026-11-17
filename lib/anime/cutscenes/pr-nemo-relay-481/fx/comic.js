// comic: the comic-print layer of this cut, DOM over the picture in the site's inks (Bubbles.jsx and the page.js of the Sukuna cut, prefix tk481).
import { Vector3 } from "three";
import { DOCK, LINE, R, TEXT } from "../clock.js";

const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Shantell+Sans:ital,wght,BNCE,INFM@0,300..800,-100..100,0..100&display=swap";
const CSS = `
.tk481 { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; --cream: #fbfaf7; --cyan: #2ec5ff; --accent: #6f7fe0; --deep: #121640; --dots: #babdff; font-family: var(--font-comic, "Shantell Sans"), var(--font, "Instrument Sans"), system-ui, sans-serif; }
.tk481 * { box-sizing: border-box; }
.tk481-impact { position: absolute; inset: 0; background: radial-gradient(circle, color-mix(in srgb, var(--dots) 50%, transparent) 0 1.7px, transparent 2.2px) 0 0 / 9px 9px, var(--deep); }
.tk481-impact i { position: absolute; width: 26vmin; height: 26vmin; margin: -13vmin 0 0 -13vmin; border-radius: 50%; border: 1.4vmin solid var(--cream); }
.tk481-impact i:nth-child(1) { border-color: var(--cyan); translate: -6px 3px; opacity: 0.8; }
.tk481-impact i:nth-child(2) { border-color: var(--accent); translate: 5px -3px; opacity: 0.8; }
.tk481-sfx { position: absolute; left: 7%; top: 15%; font-variation-settings: "BNCE" 100, "INFM" 100; font-weight: 800; line-height: 1; letter-spacing: 0.02em; color: var(--accent); -webkit-text-stroke: 0.06em var(--cream); paint-order: stroke fill; rotate: -9deg; white-space: nowrap; }
.tk481-sfx.k { left: auto; right: 12%; top: 12%; color: #e5363a; rotate: -8deg; }
.tk481-sfx b { position: absolute; inset: 0; font-weight: 800; -webkit-text-stroke: 0; opacity: 0.85; }
.tk481-sfx b:nth-child(1) { color: #1c1b19; translate: 0.05em 0.06em; z-index: -2; }
.tk481-sfx b:nth-child(2) { color: var(--cyan); z-index: -1; }
.tk481-bubble { position: absolute; padding: 1.15em 2em 1.3em; color: #1c1b19; transform-origin: 50% 0; filter: drop-shadow(0 10px 18px rgba(12, 8, 30, 0.28)); }
.tk481-bubble[data-kind="burst"] { padding: 1.6em 2.4em 1.7em; }
.tk481-bubble svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.tk481-bubble .ink { fill: var(--cream); stroke: #1c1b19; stroke-width: 3; stroke-linejoin: round; }
.tk481-bubble .tail.ink { stroke-width: 5; }
.tk481-bubble .fill { fill: var(--cream); }
.tk481-bubble pattern circle { fill: var(--accent); opacity: 0.42; }
.tk481-bubble p { position: relative; margin: 0; text-align: center; line-height: 1.22; font-weight: 500; font-variation-settings: "BNCE" 45, "INFM" 70; }
.tk481-bubble p b { font-weight: 800; font-variation-settings: "BNCE" 70, "INFM" 90; }
.tk481-bubble[data-kind="burst"] p { rotate: -1.5deg; }
.tk481-credit { position: absolute; left: 50%; display: grid; gap: 0.2em; width: max-content; padding: 0.7em 1.1em; text-align: center; background: var(--cream); color: #1c1b19; border: 1.5px solid #1c1b19; border-radius: 14px; box-shadow: 0 10px 24px rgba(12, 8, 30, 0.28); font-family: var(--font, "Instrument Sans"), system-ui, sans-serif; transform-origin: 50% 0; }
.tk481-credit strong { font-weight: 700; line-height: 1.25; }
.tk481-credit span { opacity: 0.72; }`;

const HOLD = [11.9, 13.5];
const TAIL = { a: new Vector3(2.5, 4.2, -8.3), c: new Vector3(5.6, 3.2, -7.9) };
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; parent?.appendChild(e); return e; };
const pop = (age) => (age < 0.08 ? [0.62, 18] : age < 0.16 ? [1.08, -4] : age < 0.24 ? [0.98, 0] : [1, 0]);

function burst(w, h) {
  let d = "";
  for (let i = 0; i < 52; i++) {
    const a = (i / 52) * Math.PI * 2, r = i % 2 ? 1.0 : 0.88 + 0.05 * Math.sin(i * 2.3);
    d += `${i ? "L" : "M"}${(w / 2 + Math.cos(a) * (w / 2) * r * 1.04).toFixed(1)} ${(h / 2 + Math.sin(a) * (h / 2) * r * 1.12).toFixed(1)}`;
  }
  return `${d}Z`;
}

function comicFace(then) {
  const own = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim();
  let l = document.getElementById("tk481-font");
  if (!own && !l) { l = el("link", "", document.head); l.id = "tk481-font"; l.rel = "stylesheet"; l.href = FONTS; }
  if (then) own || l.sheet ? then() : l.addEventListener("load", then, { once: true });
  return own || '"Shantell Sans", sans-serif';
}

class Comic {
  constructor(host) {
    this.host = host;
    if (!document.getElementById("tk481-css")) {
      el("style", "", document.head).id = "tk481-css";
      document.getElementById("tk481-css").textContent = CSS;
      comicFace();
    }
    this.root = el("div", "tk481", host);
    this.impact = el("div", "tk481-impact", this.root, "<i></i><i></i><i></i>");
    this.sfx = el("div", "tk481-sfx", this.root);
    this.krrrk = el("div", "tk481-sfx k", this.root);
    this.bubbles = {};
    this.credit = el("div", "tk481-credit", this.root);
    this.born = performance.now(); this.n = 0;
  }

  bubble(slot, kind, text, bold) {
    const b = el("div", "tk481-bubble", this.root);
    b.dataset.kind = kind;
    const dots = kind === "burst" ? `<path class="body dots" fill="url(#tk481-ht-${slot})" mask="url(#tk481-m-${slot})"/>` : "";
    b.innerHTML = `<svg aria-hidden="true"><defs><pattern id="tk481-ht-${slot}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.7"/></pattern>
      <linearGradient id="tk481-fade-${slot}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="tk481-m-${slot}"><rect width="100%" height="100%" fill="url(#tk481-fade-${slot})"/></mask></defs>
      <path class="tail ink"/><path class="body ink"/><path class="tail fill"/>${dots}</svg><p></p>`;
    const p = b.querySelector("p");
    for (const part of bold ? text.split(new RegExp(`(${bold})`)) : [text]) (part === bold ? el("b", "", p) : p).append(part);
    return b;
  }

  sfxFrame(node, s, W) {
    node.style.display = s ? "block" : "none";
    if (!s) return;
    if (!node.firstChild) { for (let i = 0; i < 2; i++) el("b", "", node).textContent = s.text; node.append(s.text); }
    node.style.fontSize = `${clamp(0.11 * W, 64, 168)}px`;
    const a = s.age;
    if (s.krrrk) {
      node.style.scale = Math.min(1, a / 0.08) * (1 + 0.2 * Math.max(0, 1 - a / 0.2));
      node.style.translate = `${s.shiver}px 0`;
      node.children[1].style.translate = "0.03em 0.03em";
      return;
    }
    const k = a < 0.08 ? 0.45 : a < 0.16 ? 1.18 : a < 0.24 ? 0.96 : a < 0.5 ? 1 : 1.04, m = a < 0.16 ? [-0.09, 0.05] : a < 0.33 ? [-0.045, 0.03] : [-0.025, 0.015];
    node.style.scale = k;
    node.children[1].style.translate = `${m[0]}em ${m[1]}em`;
  }

  frame(s) {
    const W = this.host.clientWidth || 1280, H = this.host.clientHeight || 720, fs = clamp(0.011 * W + 12, 20, 27);
    this.impact.style.display = s.impact ? "block" : "none";
    if (s.impact) { for (const i of this.impact.children) { i.style.left = `${s.impact[0] * 100}%`; i.style.top = `${s.impact[1] * 100}%`; } this.impact.style.scale = s.impact[2]; }
    this.sfxFrame(this.sfx, s.sfx, W);
    this.sfxFrame(this.krrrk, s.krrrk, W);
    const hit = (a, r) => a && r[0] < a[2] && r[2] > a[0] && r[1] < a[3] && r[3] > a[1];
    const live = new Set();
    const warming = ++this.n <= 6 || performance.now() - this.born < 500;
    const ghosts = warming ? (s.warm ?? []).filter((w) => !s.lines.some((l) => l.slot === w.slot)).map((w) => ({ ...w, ghost: true })) : [];
    for (const l of [...s.lines, ...ghosts]) {
      const b = (this.bubbles[l.slot] ??= this.bubble(l.slot, l.kind, l.text, l.bold));
      live.add(l.slot);
      const av = l.ghost || l.bottom != null ? null : s.avoid;
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
        const roomR = 0.97 * W - av[2], roomL = av[0] - 0.03 * W, right = roomR >= roomL, room = Math.max(roomR, roomL);
        if (room < 13 * fs) { b.style.display = "none"; live.delete(l.slot); continue; }
        ({ w, h, bottom, top, fit } = place(Math.min(full, room)));
        left = right ? W - 0.03 * W - w : 0.03 * W;
      }
      if (l.bottom != null) { left = fit(l.left * W); bottom = l.bottom * H; top = H - bottom - h; }
      b.style.left = `${left}px`; b.style.bottom = `${bottom}px`;
      const [k0, dy] = pop(l.age);
      b.style.scale = k0 * (l.scale ?? 1); b.style.translate = `0 ${dy}px`;
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

export function buildComic(ctx) {
  const V = new Vector3(), AT = new Vector3(...DOCK), W0 = new Vector3();
  let comic = null;
  const px = (p, W, H, rig = true) => { const c = ctx.player?.camera; if (!c) return null; V.copy(p); if (rig) V.add(AT); V.project(c); return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H]; };
  return {
    update(t) {
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720, box = ctx.player?.box;
      const chest = px(ctx.seal.chest(W0), W, H, false) ?? [W / 2, H / 2];
      const mouth = ctx.seal.named?.()?.mouth, seal = mouth ? px(mouth, W, H, false) ?? chest : chest;
      const lines = [];
      if (t >= LINE.A && t < LINE.B) lines.push({ slot: "a", ...TEXT.a, age: t - LINE.A, at: px(TAIL.a, W, H) ?? [0.6 * W, 0.4 * H], left: 0.55 });
      if (t >= LINE.B && t < LINE.C) {
        const hold = t >= HOLD[0] && t < HOLD[1];
        lines.push({ slot: "b", ...TEXT.b, age: t - LINE.B, at: seal, ...(hold ? { left: 0.62, bottom: 0.04, scale: 0.8 } : {}) });
      }
      if (t >= LINE.C && t < LINE.credit) lines.push({ slot: "c", ...TEXT.c, age: t - LINE.C, at: px(TAIL.c, W, H) ?? [0.6 * W, 0.4 * H] });
      const bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      const ring = t >= R.impact && t < R.impact + 0.12 ? t - R.impact : -1;
      const shhn = t >= R.impact + 0.12 && t < R.enter ? { text: TEXT.sfx, age: t - R.impact - 0.12 } : null;
      const krrrk = t >= R.crack && t < R.crack + 0.8 ? { text: TEXT.crack, age: t - R.crack, krrrk: true, shiver: Math.floor(t * 12 + 1e-6) % 2 ? 2 : -2 } : null;
      const credit = t >= LINE.credit && t < LINE.collapse[0] ? { ...TEXT.credit, age: t - LINE.credit } : null;
      comic.frame({
        warm: Object.entries(TEXT).filter(([, v]) => v.kind === "burst").map(([slot, v]) => ({ slot, ...v, age: 1, at: [0.6 * W, 0.4 * H] })),
        card: TEXT.credit, lines,
        avoid: box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, box[3] * H + 2] : null,
        impact: ring >= 0 ? [chest[0] / W, chest[1] / H, ring < 1 / 12 ? 1 : 1.06] : null,
        sfx: shhn, krrrk, credit,
      });
    },
    dispose() { comic?.dispose(); },
  };
}
