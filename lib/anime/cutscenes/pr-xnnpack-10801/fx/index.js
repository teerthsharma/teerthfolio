// FX for pr-xnnpack-10801: the comic layer (page.js), the two lettering words and the flash veil, the three hits as ink, paper and cold-blue
// impact panels behind the seal, the glass star and gather (glass.js), and the turn-back poof. Every drawing is flat to the lens.
import { CanvasTexture, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Vector3, Vector4 } from "three";
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import CARD from "../../../../world/cutscene/cards/pr-xnnpack-10801.js";
import { BACK, F, HIT, LINE, W, unwarp } from "../clock.js";
import { TONE } from "../tone.js";
import { makeGlass } from "./glass.js";
import { Comic, comicFace } from "./page.js";

const INK = rgb("#080a0f"), PAPER = rgb("#f4f4f0"), BLUE = rgb("#5fb6ff"), FLASH = rgb("#d8ecff");
const STAY = 7 / 24, A_END = 9.394; // line A ends at scene 6.05
const WORDS = [
  { text: "KYOKA SUIGETSU", t0: HIT.crack, t1: unwarp(6.3), tilt: -0.05, scale: 1 },
  { text: "ILLUSION BROKEN", t0: HIT.brk, t1: unwarp(11.0), tilt: 0.06, scale: 1.15 },
];
const FLASHES = [[HIT.crack, 0.14], [HIT.snap, 0.2], [HIT.brk, 0.3]];
const IMPACTS = [LINE.impact];
const TEXT = { a: { kind: "oval", text: CARD.a.text }, b: { kind: "burst", text: CARD.b.text }, c: { kind: "burst", text: CARD.c.text } };
const hash = (i, s) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };

function lettering(text, tilt) {
  const c = document.createElement("canvas"), tex = new CanvasTexture(c);
  c.width = 1024; c.height = 320;
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    const g = c.getContext("2d");
    let px = 200;
    g.clearRect(0, 0, c.width, c.height);
    g.save();
    g.translate(c.width / 2, c.height / 2); g.rotate(tilt);
    const fam = comicFace();
    g.font = `800 ${px}px ${fam}`;
    while (g.measureText(text).width > c.width * 0.92 && px > 60) g.font = `800 ${(px -= 10)}px ${fam}`;
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.fillStyle = "#22d3ee"; g.fillText(text, px * 0.05, px * 0.04);
    g.lineWidth = px * 0.15; g.strokeStyle = "#fbfaf7"; g.strokeText(text, 0, 0);
    g.fillStyle = "#080a0f"; g.fillText(text, 0, 0);
    g.restore();
    tex.needsUpdate = true;
  };
  draw();
  comicFace(() => document.fonts?.load?.(`800 100px ${comicFace()}`).then(draw, () => {}));
  document.fonts?.addEventListener?.("loadingdone", draw);
  const uAt = { value: new Vector4(0, 0.56, 0.5, 0.2) };
  const m = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
    uniforms: { tMap: { value: tex }, uAt },
    vertexShader: "uniform vec4 uAt; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(uAt.xy + position.xy * uAt.zw, 0.0, 1.0); }",
    fragmentShader: TONE + "uniform sampler2D tMap; varying vec2 vUv; void main() { vec4 c = texture2D(tMap, vUv); if (c.a < 0.004) discard; gl_FragColor = vec4(siteTone(c.rgb) * c.a, c.a); }",
    transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true, side: DoubleSide,
  }));
  m.frustumCulled = false; m.renderOrder = 1300; m.visible = false;
  return { mesh: m, uAt, dispose() { document.fonts?.removeEventListener?.("loadingdone", draw); tex.dispose(); m.material.dispose(); m.geometry.dispose(); } };
}

// the panel painters: even frames are paper with ink marks, odd frames ink with paper marks (the hit reads ink and cold blue)
const flip = (f) => (f % 2 ? [INK, PAPER] : [PAPER, INK]);
function spikes(B, cx, cy, n, r0, seed, col, edge, k = 1) {
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.8 * hash(i, seed)) / n) * Math.PI * 2, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k, dx = Math.cos(a), dy = Math.sin(a);
    for (const [c, g] of edge ? [[edge, 0.014], [col, 0]] : [[col, 0]]) B.tri(cx + dx * (r - g), cy + dy * (r - g), cx + dx * 2.6 - dy * (w / 2 + g), cy + dy * 2.6 + dx * (w / 2 + g), cx + dx * 2.6 + dy * (w / 2 + g), cy + dy * 2.6 - dx * (w / 2 + g), c);
  }
}
function stroke(B, A, hx, hy, ang, len, wid, col) {
  const n = 14, pts = [], we = [], wc = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, d = (u - 0.5) * len, w = Math.pow(Math.sin(Math.PI * u), 0.55) * wid * 0.25;
    pts.push([A / 2 + (hx + Math.cos(ang) * d) * 0.5, 0.5 - (hy + Math.sin(ang) * d) * 0.5]);
    we.push(w); wc.push(w * 0.46);
  }
  B.ribbon(pts, we, col);
  B.ribbon(pts, wc, PAPER);
}
function bar(B, p, q, w0, w1, col) {
  const pts = [], ws = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]); ws.push(w0 + (w1 - w0) * u); }
  B.ribbon(pts, ws, col);
}
// nine blue cracks from the hit, each a few kinked lengths
function web(B, cx, cy, seed) {
  for (let i = 0; i < 9; i++) {
    const base = (i / 9) * Math.PI * 2 + 0.5 * hash(i, seed), pts = [[cx, cy]], ws = [0.001];
    let x = cx, y = cy, step = 0.05;
    for (let j = 1; j <= 4; j++) { const a = base + (hash(i, seed + j) - 0.5) * 0.8; step *= 1.7; x += Math.cos(a) * step; y += Math.sin(a) * step; pts.push([x, y]); ws.push(0.004 * (1 - j / 5)); }
    B.ribbon(pts, ws, BLUE);
  }
}
// the blade from the hand: two ink ribbons, the break gap in cold blue, the tip flying up-left
function blade(B, cx, cy, f, ink, field) {
  const d = [0.72, 0.69], dl = Math.hypot(d[0], d[1]), u = [d[0] / dl, d[1] / dl];
  const H = [cx, cy], G1 = [cx + u[0] * 0.36, cy + u[1] * 0.36], k = 0.05 + 0.07 * f;
  const G2 = [G1[0] - 0.6 * k, G1[1] - 0.8 * k], T = [G2[0] + u[0] * 0.3, G2[1] + u[1] * 0.3];
  for (const [p, q, w0, w1] of [[H, G1, 0.02, 0.012], [G2, T, 0.012, 0.002]]) { bar(B, p, q, w0, w1, ink); bar(B, p, q, w0 * 0.46, w1 * 0.46, field); }
  bar(B, G1, G2, 0.006, 0.006, BLUE);
}
// the break's 24 shards, flying out from the centre; each has a cold-blue edge
function shards(B, cx, cy, seed, age, col, edge) {
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + 0.5 * hash(i, seed), r = 0.05 + 0.45 * hash(i, seed + 1) + 0.6 * age;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, s = 0.04 + 0.1 * hash(i, seed + 2), b0 = hash(i, seed + 3) * Math.PI * 2;
    const v = [0, 1, 2].map((k) => [x + Math.cos(b0 + (k * 2 * Math.PI) / 3) * s, y + Math.sin(b0 + (k * 2 * Math.PI) / 3) * s]);
    const e = v.map(([px, py]) => [x + (px - x) * 1.12, y + (py - y) * 1.12]);
    B.tri(e[0][0], e[0][1], e[1][0], e[1][1], e[2][0], e[2][1], edge);
    B.tri(v[0][0], v[0][1], v[1][0], v[1][1], v[2][0], v[2][1], col);
  }
}
const PAINT = {
  crack(B, o) { const [field, ink] = flip(o.f); B.rect(0, 0, o.A, 1, field); spikes(B, o.cx, o.cy, 18, 0.12 + 0.04 * o.f, o.seed + o.f * 7, ink, field, 0.35); web(B, o.cx, o.cy, o.seed + o.f * 5); },
  snap(B, o) { const [field, ink] = flip(o.f); B.rect(0, 0, o.A, 1, field); spikes(B, o.cx, o.cy, 28, 0.2 + 0.05 * o.f, o.seed + o.f * 9, ink, field, 0.22); blade(B, o.cx, o.cy, o.f, ink, field); },
  break(B, o) { const [field, ink] = o.f % 2 ? [PAPER, INK] : [INK, PAPER]; B.rect(0, 0, o.A, 1, field); shards(B, o.cx, o.cy, o.seed + o.f * 11, o.age, ink, BLUE); },
};
const GLASS_N = { crack: 18, snap: 26, break: 34 };
const star = (B, cx, cy, r, seed, col) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31)); return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; }), col);
const flashAt = (t) => {
  let a = 0;
  for (const [t0, k] of FLASHES) { const x = t - t0; if (x >= -1e-6) a = Math.max(a, k * (x < 2 / 24 ? 1 : Math.max(0, 1 - (x - 2 / 24) / 0.25))); }
  return a;
};
const wordAt = (w, t, A, box) => {
  const k = Math.floor((t - w.t0) * 12 + 1e-6), pop = [0.7, 1.12, 1][Math.min(k, 2)] * w.scale, odd = Math.floor(t * 12) % 2 ? 1 : -1;
  const wH = Math.min(1.9, A * 1.7) * pop, hw = wH / (2 * A), hh = 0.3125 * wH * 0.5;
  let cx = (0.03 * odd) / A;
  if (box) { const s0 = box[0] * 2 - 1, s1 = box[2] * 2 - 1, top = 1 - box[1] * 2; if (top > 0.56 - hh && s1 > cx - hw && s0 < cx + hw) cx = s0 + s1 > 0 ? Math.max(-0.96 + hw, s0 - hw - 0.04) : Math.min(0.96 - hw, s1 + hw + 0.04); }
  return [cx, 0.56, hw, hh];
};

export default function build(ctx) {
  const group = new Group(), V = new Vector3(), beats = ctx.scene.beats ?? [];
  const panels = beats.filter((b) => b.name === "panel"), gathers = beats.filter((b) => b.name === "gather");
  const cam = () => ctx.player?.camera;
  const pxAt = (p, FW, FH) => {
    const c = cam();
    if (!c || !p) return null;
    if (Array.isArray(p)) V.set(...p); else V.copy(p);
    V.project(c);
    return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * FW, (0.5 - V.y * 0.5) * FH];
  };
  // a hit's centre in frame units: [x in 0..A, y in 0..1 down], from a frame point [u, v] or the seal's hand
  const centre = (at, A) => {
    if (Array.isArray(at)) return [at[0] * A, at[1]];
    const c = cam(), w = at === "hand" ? ctx.seal.named?.()?.handR : null;
    if (!w || !c) return [A / 2, 0.5];
    V.copy(w).project(c);
    return [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5];
  };

  const cel = makeCel(ctx.engine, { max: 60000, order: 1200, behind: true, draw(B, ts, A) {
    for (const b of panels) {
      const age = ts - b.t, paint = PAINT[b.kind];
      if (!paint || age < -1e-6 || age >= b.dur + STAY - 1e-6) continue;
      const [cx, cy] = centre(b.at, A), hx = (cx - A / 2) * 2, hy = (0.5 - cy) * 2, strokes = b.strokes ?? [];
      if (age >= b.dur - 1e-6) {
        const k = 1 - (age - b.dur) / STAY;
        for (const [dx, dy, ang, len, wid] of strokes) stroke(B, A, hx + dx, hy + dy, ang + 0.02, len, wid * (0.25 + 0.3 * k), BLUE);
        continue;
      }
      const f = Math.floor(age * 24 + 1e-6);
      paint(B, { A, cx, cy, f, age, seed: Math.round(b.t * 10) });
      for (const [dx, dy, ang, len, wid] of strokes) stroke(B, A, hx + dx, hy + dy, ang + (f - 1) * 0.02, len * (f ? 1 : 0.8), wid * (f ? 1 : 0.7), BLUE);
    }
  } });
  // under the panels: each hit's own frames stay clean, and the veil shows as they end
  const veil = makeCel(ctx.engine, { max: 4, order: 1150, draw(B, ts, A) { const a = flashAt(ts); if (a > 0.003) B.rect(0, 0, A, 1, FLASH, a); } });
  const POOF_T = 2 / 24 + 0.4;
  // the turn back: two frames of a paper and ink star with a blue thread, then 14 ink flecks for 0.4 s
  const poof = makeCel(ctx.engine, { max: 400, order: 1260, draw(B, ts, A) {
    const age = ts - BACK, box = ctx.player?.box;
    if (age < 0 || age >= POOF_T || !box) return;
    const f = Math.floor(age * 24 + 1e-6), bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * Math.min(f, 1));
    if (f < 2) { for (const [k, c] of [[1, INK], [0.965, PAPER], [0.6, INK], [0.56, PAPER], [0.3, BLUE]]) star(B, cx, cy, r * k, f * 0.4 + (k < 0.7 ? 0.14 : 0), c); return; }
    const w = 0.03 * Math.max(0.2, 1 - (age - 2 / 24) / 0.4);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)), x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q; B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, INK); }
  } });
  const glass = makeGlass(ctx);
  const words = WORDS.map((w) => ({ ...w, L: lettering(w.text, w.tilt) }));
  group.add(cel.group, veil.group, poof.group, glass.mesh, ...words.map((w) => w.L.mesh));

  let comic = null;
  const line = (slot, t0, t, at, left) => ({ slot, ...TEXT[slot], bold: CARD.bold, age: t - t0, at, left });

  return {
    group,
    update(t, dt, cue) {
      const R = ctx.engine.shared.uRes.value, A = R.x / R.y, box = ctx.player?.box;
      cel.update(t, cue); veil.update(t, cue); poof.update(t, cue);
      const pan = panels.find((b) => t >= b.t - 1e-6 && t < b.t + b.dur - 1e-6), gat = gathers.find((b) => t >= b.t && t < b.t + b.dur);
      if (pan && PAINT[pan.kind]) { const [cx, cy] = centre(pan.at, A); glass.set(1, [cx / A, 1 - cy], 1, GLASS_N[pan.kind]); }
      else if (gat) { const [cx, cy] = centre(gat.at, A); glass.set(2, [cx / A, 1 - cy], 0.6 - 0.44 * ((t - gat.t) / gat.dur), Math.floor(t * 12)); }
      else glass.set(0, null, 0, 0);
      for (const w of words) { const on = t >= w.t0 && t < w.t1; w.L.mesh.visible = on; if (on) w.L.uAt.value.set(...wordAt(w, t, A, box)); }

      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const FW = host.clientWidth || 1280, FH = host.clientHeight || 720, mouth = ctx.seal.named?.()?.mouth;
      const at = {
        a: pxAt(mouth, FW, FH) ?? pxAt(W(CARD.tail.a), FW, FH) ?? [0.6 * FW, 0.4 * FH],
        b: pxAt(W(CARD.tail.b), FW, FH) ?? [0.6 * FW, 0.4 * FH],
        c: pxAt(mouth, FW, FH) ?? pxAt(W(CARD.tail.c), FW, FH) ?? [0.6 * FW, 0.4 * FH],
      };
      const lines = [], hidden = panels.some((b) => t >= b.t && t < b.t + b.dur);
      if (!hidden) {
        if (t >= LINE.A && t < A_END) lines.push(line("a", LINE.A, t, at.a, 0.55));
        if (t >= LINE.B && t < LINE.C) lines.push(line("b", LINE.B, t, at.b, 0.55));
        if (t >= LINE.C && t < LINE.credit) lines.push(line("c", LINE.C, t, at.c));
      }
      const bw = box ? (box[2] - box[0]) * FW : 0, bh = box ? (box[3] - box[1]) * FH : 0;
      const chest = pxAt(ctx.seal.chest?.(new Vector3()), FW, FH) ?? [FW / 2, FH / 2];
      const impact = IMPACTS.some(([a, b]) => t >= a && t < b);
      comic.frame({
        warm: Object.entries(TEXT).filter(([, v]) => v.kind === "burst").map(([slot, v]) => ({ slot, ...v, bold: CARD.bold, age: 1, at: [0.6 * FW, 0.4 * FH] })),
        card: CARD.credit,
        lines,
        avoid: box ? [box[0] * FW - 0.04 * bw - 2, box[1] * FH - 0.25 * bh, box[2] * FW + 0.04 * bw + 2, box[3] * FH + 2] : null,
        impact: impact ? [chest[0] / FW, chest[1] / FH, t >= LINE.impact[0] + F(2) ? 1.06 : 1] : null,
        sfx: t >= LINE.shing[0] && t < LINE.shing[1] ? { text: "SHING", age: t - LINE.shing[0] } : null,
        credit: t >= LINE.credit && t < LINE.collapse[0] ? { title: CARD.credit.title, sub: CARD.credit.sub, age: t - LINE.credit } : null,
      });
    },
    dispose() {
      cel.dispose(); veil.dispose(); poof.dispose(); glass.dispose();
      for (const w of words) w.L.dispose();
      comic?.dispose();
    },
  };
}
