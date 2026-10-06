// THE BUBBLE AND SFX-LETTERING OVERLAY: DOM, over the canvas, driven by scene.js. Owner laws:
//   L9   bubbles sit in the LOWER HALF of the frame, ONE at a time; the skip button sits bottom-left.
//   L2   nothing covers the seal: a bubble or lettering that would overlap the seal's projected box
//        slides to the other side of the frame (and, if still overlapping, drops lower).
//   L4   lines and the credit play INSIDE the pocket: the overlay lives in the pocket's own canvas.
//   L10  show, don't tell: there is no caption, plaque or explanatory text; lettering is SFX only.
//
// scene.js data (times in seconds of the cutscene clock):
//   bubbles: [{ t:[t0,t1], text, who:"seal"|"foe"|"narr", side:"l"|"r"|"c", tone:"say"|"think"|"shout", pool? }]
//     `pool:"lines"` takes a seeded random line from scene.lines (the 15-line character-voiced pool)
//   sfx:     [{ t:[t0,t1], text, at:[u,v], size, rot, col, ink, font }]   u,v in 0..1 of the frame (v = 0 top)
//   credit:  { t:[t0,t1], text }                                         the credit card, lower centre
// Layout maths (all in CSS px of the frame, W x H):
//   a bubble is anchored at y = 0.58 H .. 0.93 H (the lower half, below the horizon line y = 0.5 H);
//   width <= min(0.46 W, 560); it is centred at x = {l: 0.27, c: 0.5, r: 0.73} W;
//   the seal box (from `project`) is inflated by 14 px; on overlap x flips to 1 - x, then y moves down by
//   the overlap height, clamped to 0.96 H.
// Type: bold, rounded, an ink outline by text-shadow; no frame-rate dependence: shown on `t`, never on dt.
const FONT = 'var(--font, "Trebuchet MS", "Segoe UI", system-ui, sans-serif)';
const el = (tag, css, parent) => { const e = document.createElement(tag); Object.assign(e.style, css); if (parent) parent.appendChild(e); return e; };

const rngSeed = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

export class Overlay {
  // host: the element that holds the canvas (position: relative or fixed)
  constructor(host, scene, o = {}) {
    this.scene = scene;
    this.host = host;
    this.skip = o.onSkip ?? null;
    this.rand = rngSeed(o.seed ?? Date.now() & 0xffff);
    this.root = el("div", { position: "absolute", inset: "0", pointerEvents: "none", overflow: "hidden", fontFamily: FONT, zIndex: 5 }, host);
    this.bubble = el("div", {
      position: "absolute", display: "none", padding: "12px 18px", borderRadius: "22px", background: "#fffdf4", color: "#17141f",
      border: "3px solid #17141f", fontWeight: 800, fontSize: "clamp(15px, 2.1vw, 24px)", lineHeight: 1.22, textAlign: "center",
      boxShadow: "4px 5px 0 rgba(10,8,20,.55)", maxWidth: "min(46vw, 560px)", transform: "translate(-50%, 0)",
    }, this.root);
    this.tail = el("div", { position: "absolute", width: "0", height: "0", borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "16px solid #17141f", bottom: "-17px", left: "50%", transform: "translateX(-50%)" }, this.bubble);
    this.credit = el("div", {
      position: "absolute", left: "50%", bottom: "9%", transform: "translateX(-50%)", display: "none", padding: "8px 22px",
      color: "#fff7e6", fontWeight: 700, letterSpacing: "0.06em", fontSize: "clamp(13px, 1.7vw, 20px)", textShadow: "0 2px 0 #17141f, 0 0 8px #17141f, 2px 0 0 #17141f, -2px 0 0 #17141f",
      whiteSpace: "nowrap",
    }, this.root);
    this.sfxPool = [];
    this.lines = new Map(); // bubble index -> chosen text (one random draw per play)
    if (this.skip) {
      this.skipBtn = el("button", {
        position: "absolute", left: "12px", bottom: "12px", pointerEvents: "auto", padding: "6px 14px", borderRadius: "999px", border: "2px solid #17141f",
        background: "rgba(255,253,244,.92)", color: "#17141f", fontWeight: 800, fontSize: "13px", cursor: "pointer", fontFamily: FONT,
      }, this.root);
      this.skipBtn.textContent = "Skip";
      this.skipBtn.onclick = () => this.skip();
    }
    this.rect = [0, 0, 1, 1];
  }
  pickLine(i) {
    if (!this.lines.has(i)) { const pool = this.scene.lines ?? []; this.lines.set(i, pool.length ? pool[Math.floor(this.rand() * pool.length)] : ""); }
    return this.lines.get(i);
  }
  // active bubble: the first whose window holds t (one at a time, law L9)
  activeBubble(t) {
    const B = this.scene.bubbles ?? [];
    for (let i = 0; i < B.length; i++) if (t >= B[i].t[0] && t < B[i].t[1]) return [B[i], i];
    return [null, -1];
  }
  // t: cutscene seconds. box: seal box in frame fractions [x0,y0,x1,y1] (y down) or null.
  update(t, box = null) {
    const W = this.host.clientWidth || 1, H = this.host.clientHeight || 1;
    const pad = 14;
    const sealPx = box ? [box[0] * W - pad, box[1] * H - pad, box[2] * W + pad, box[3] * H + pad] : null;
    const hit = (r) => sealPx && r[0] < sealPx[2] && r[2] > sealPx[0] && r[1] < sealPx[3] && r[3] > sealPx[1];

    // ---- the bubble ----
    const [b, bi] = this.activeBubble(t);
    if (!b) this.bubble.style.display = "none";
    else {
      const text = b.pool ? this.pickLine(bi) : b.text;
      if (this.bubble.firstChild?.nodeValue !== text) { if (this.bubble.firstChild !== this.tail) this.bubble.firstChild?.remove?.(); this.bubble.insertBefore(document.createTextNode(text), this.tail); }
      this.bubble.style.display = "block";
      const tone = b.tone ?? "say";
      this.bubble.style.borderStyle = tone === "think" ? "dashed" : "solid";
      this.bubble.style.background = b.who === "foe" ? "#17141f" : "#fffdf4";
      this.bubble.style.color = b.who === "foe" ? "#fffdf4" : "#17141f";
      this.tail.style.borderTopColor = "#17141f";
      this.bubble.style.fontSize = tone === "shout" ? "clamp(18px, 2.7vw, 32px)" : "clamp(15px, 2.1vw, 24px)";
      // pop-in: 0.12 s scale on the bubble's own clock (twos: 2 frames)
      const age = t - b.t[0], pop = Math.min(1, age / 0.12);
      let x = { l: 0.27, c: 0.5, r: 0.73 }[b.side ?? "c"] * W, y = (b.y ?? 0.62) * H;
      const bw = Math.min(this.bubble.offsetWidth || 300, 0.46 * W), bh = this.bubble.offsetHeight || 60;
      const rectAt = (cx, cy) => [cx - bw / 2, cy, cx + bw / 2, cy + bh];
      if (hit(rectAt(x, y))) x = W - x;
      if (hit(rectAt(x, y))) y = Math.min(0.96 * H - bh, sealPx[3] + 8);
      y = Math.max(0.52 * H, Math.min(y, 0.97 * H - bh)); // never above the horizon line: L9
      this.bubble.style.left = `${x}px`; this.bubble.style.top = `${y}px`;
      this.bubble.style.transform = `translate(-50%, 0) scale(${0.85 + 0.15 * pop})`;
      this.bubble.style.opacity = String(Math.min(1, age / 0.08));
      // the tail points at the speaker: the seal for who:"seal", else the opposite side
      this.tail.style.left = b.who === "foe" ? "30%" : "70%";
    }

    // ---- the credit ----
    const c = this.scene.credit;
    if (c && t >= c.t[0] && t < c.t[1]) {
      this.credit.style.display = "block"; this.credit.textContent = c.text;
      this.credit.style.opacity = String(Math.min(1, (t - c.t[0]) / 0.25) * Math.min(1, (c.t[1] - t) / 0.25));
      const r = this.credit.getBoundingClientRect(), hr = this.host.getBoundingClientRect();
      const rr = [r.left - hr.left, r.top - hr.top, r.right - hr.left, r.bottom - hr.top];
      this.credit.style.bottom = hit(rr) ? "3%" : "9%";
    } else this.credit.style.display = "none";

    // ---- SFX lettering (any number, each placed off the seal) ----
    const S = (this.scene.sfx ?? []).filter((s) => t >= s.t[0] && t < s.t[1]);
    while (this.sfxPool.length < S.length) this.sfxPool.push(el("div", { position: "absolute", fontWeight: 900, whiteSpace: "nowrap", transform: "translate(-50%,-50%)", lineHeight: 1 }, this.root));
    this.sfxPool.forEach((d, i) => {
      const s = S[i];
      if (!s) { d.style.display = "none"; return; }
      const age = t - s.t[0], life = s.t[1] - s.t[0];
      const k = Math.min(1, age / 0.1), out = Math.min(1, (life - age) / 0.15);
      d.style.display = "block"; d.textContent = s.text;
      const size = (s.size ?? 0.09) * H * (0.7 + 0.3 * k + (age < 0.1 ? 0.25 : 0));
      d.style.fontSize = `${size}px`;
      d.style.color = s.col ?? "#fff7e6";
      d.style.fontFamily = s.font ?? FONT;
      const ink = s.ink ?? "#17141f", w = Math.max(2, size * 0.06);
      d.style.textShadow = `${w}px 0 0 ${ink}, -${w}px 0 0 ${ink}, 0 ${w}px 0 ${ink}, 0 -${w}px 0 ${ink}, ${w}px ${w}px 0 ${ink}, -${w}px -${w}px 0 ${ink}, ${w}px -${w}px 0 ${ink}, -${w}px ${w}px 0 ${ink}, ${w * 2}px ${w * 2}px 0 rgba(0,0,0,.35)`;
      let u = (s.at?.[0] ?? 0.5) * W, v = (s.at?.[1] ?? 0.3) * H;
      const tw = d.offsetWidth || size * (s.text.length * 0.6), th = size;
      const r = [u - tw / 2, v - th / 2, u + tw / 2, v + th / 2];
      if (hit(r)) { u = W - u; if (hit([u - tw / 2, v - th / 2, u + tw / 2, v + th / 2])) v = Math.max(th, sealPx[1] - th); }
      d.style.left = `${u}px`; d.style.top = `${v}px`;
      d.style.transform = `translate(-50%,-50%) rotate(${s.rot ?? -6}deg)`;
      d.style.opacity = String(Math.max(0, out));
    });
  }
  dispose() { this.root.remove(); }
}
