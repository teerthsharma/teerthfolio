// FX for pr-triton-kernels-22: the live slash strokes, flashes and DOMAIN CLOSED lettering, the comic-print layer (page.js), and each hit as a manga
// page draws it: focus lines closing in frame by frame (`gather`; `rev` bursts and fades), then impact panels (`panel`). All of it flat to the lens, BEHIND the seal.
import { CanvasTexture, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Vector3, Vector4 } from "three";
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import { hash } from "../live/ink.js";
import { BACK, BLOCK, DOCK, HIT, LINE, NB, ROWS, SHRINE_Z, T, TRI_AT, YAW, unwarp, warp } from "../clock.js";
import { Comic, comicFace } from "./page.js";
import { TONE, toned } from "../tone.js";

const INK = toned("#0e0b0d"), CREAM = toned("#f7f2e6"), BLOOD = toned("#cc0a17"), PAPER = toned("#ece5d2"), SNOW = rgb("#ffffff");
const SL = 240, UP = new Vector3(0, 1, 0), STAY = 7 / 24;
const LETTERS = [unwarp(T.letters[0]), unwarp(T.letters[1])];
const TEXT = {
  a: { kind: "oval", text: "Domain Expansion." },
  b: { kind: "burst", text: "Malevolent Shrine. Only the scheduled blocks survive.", bold: "Malevolent Shrine" },
  c: { kind: "burst", text: "Merged into triton-lang/kernels. 804 lines added, 17 tests passing.", bold: "804 lines added, 17 tests passing" },
  credit: { title: "triton-lang/kernels #22 · merged · 804 lines added · 17 tests passed", sub: "A topology-derived sparse attention kernel" },
};

// the live strokes: when, how long, where on the screen (half-heights from its centre, y up), the angle, the length, the weight
const SLASHES = Array.from({ length: SL }, (_, i) => {
  const cleave = i % 5 === 1, tri = i % 4 === 1;
  return {
    t0: tri ? T.cutTri + hash(i, 3) * 0.85 : T.barrage + (2.6 * (i + hash(i, 1) * 0.9)) / SL,
    life: i % 8 === 0 ? 0.85 : cleave ? 0.2 : 0.14, cx: (hash(i, 4) - 0.5) * 2.2, cy: (hash(i, 5) - 0.5) * 1.9,
    ang: (hash(i, 6) - 0.5) * 1.6 + (i % 2 ? 0.75 : -0.75), len: cleave ? 1.2 + 1.1 * hash(i, 7) : 0.55 + 1.1 * hash(i, 7),
    wid: cleave ? 0.026 + 0.03 * hash(i, 8) : 0.005 + 0.007 * hash(i, 8), tri, cleave,
  };
});

function lettering(text) {
  const c = document.createElement("canvas"), tex = new CanvasTexture(c);
  c.width = 1024; c.height = 320;
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    const g = c.getContext("2d");
    let px = 200;
    g.clearRect(0, 0, c.width, c.height);
    g.save();
    g.translate(c.width / 2, c.height / 2); g.rotate(-0.06);
    const fam = comicFace();
    g.font = `800 ${px}px ${fam}`;
    while (g.measureText(text).width > c.width * 0.92 && px > 60) g.font = `800 ${(px -= 10)}px ${fam}`;
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.fillStyle = "#c8081c"; g.fillText(text, px * 0.05, px * 0.04);
    g.lineWidth = px * 0.15; g.strokeStyle = "#f4efe2"; g.strokeText(text, 0, 0);
    g.fillStyle = "#0e0b0d"; g.fillText(text, 0, 0);
    g.restore();
    tex.needsUpdate = true;
  };
  draw();
  comicFace(() => document.fonts?.load?.(`800 100px ${comicFace()}`).then(draw, () => {}));
  document.fonts?.addEventListener?.("loadingdone", draw);
  const uAt = { value: new Vector4(0, 0, 0.5, 0.2) };
  const m = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
    uniforms: { tMap: { value: tex }, uAt },
    vertexShader: "uniform vec4 uAt; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(uAt.xy + position.xy * uAt.zw, 0.0, 1.0); }",
    fragmentShader: TONE + "uniform sampler2D tMap; varying vec2 vUv; void main() { vec4 c = texture2D(tMap, vUv); if (c.a < 0.004) discard; gl_FragColor = vec4(siteTone(c.rgb) * c.a, c.a); }",
    transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true, side: DoubleSide,
  }));
  m.frustumCulled = false; m.renderOrder = 1300; m.visible = false;
  return { mesh: m, uAt, dispose() { document.fonts?.removeEventListener?.("loadingdone", draw); tex.dispose(); m.material.dispose(); m.geometry.dispose(); } };
}

export default function build(ctx) {
  const group = new Group(), V = new Vector3(), letters = lettering("DOMAIN CLOSED"), AT = new Vector3(...DOCK);
  const triW = new Vector3(TRI_AT[0], NB * 0.375 * 0.5, TRI_AT[2]).applyAxisAngle(UP, YAW).add(AT);
  const mouthW = new Vector3(0, 7.4, SHRINE_Z + 0.9 * 9.2).applyAxisAngle(UP, YAW).add(AT);
  const cam = () => ctx.player?.camera;
  const proj = (p, asp) => { const c = cam(); if (!c) return null; V.copy(p).project(c); return V.z > 1 ? null : [V.x * asp, V.y]; };
  let tri = [0.6, 0];
  const hits = (ctx.scene.beats ?? []).filter((b) => b.name === "panel" || b.name === "gather");
  // a hit's centre in the batch's units (x 0..A, y 0..1 down): the triangle, the seal's hand or chest, or a frame point [u, v]
  const centre = (at, A) => {
    const c = cam(), w = at === "tri" ? triW : at === "mouth" ? mouthW : at === "hand" ? ctx.seal.named?.().handR : at === "seal" ? ctx.seal.chest(new Vector3()) : null;
    if (!w || !c) return Array.isArray(at) ? [at[0] * A, at[1]] : [A / 2, 0.5];
    V.copy(w).project(c);
    return [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5];
  };
  // spikes toward (cx, cy): each a wedge, its point `r0` short of the centre (jittered), its foot past the frame; k scales the weight
  const spikes = (B, cx, cy, n, r0, seed, col, edge, k = 1) => {
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.8 * hash(i, seed)) / n) * Math.PI * 2, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k, dx = Math.cos(a), dy = Math.sin(a);
      for (const [c, g] of edge ? [[edge, 0.014], [col, 0]] : [[col, 0]]) B.tri(cx + dx * (r - g), cy + dy * (r - g), cx + dx * 2.6 - dy * (w / 2 + g), cy + dy * 2.6 + dx * (w / 2 + g), cx + dx * 2.6 + dy * (w / 2 + g), cy + dy * 2.6 - dx * (w / 2 + g), c);
    }
  };
  // the triangle's blocks as flat squares: the scheduled ones whole; the others split along the diagonal, the halves `open` apart
  const cell = (x, y, A) => { V.set(TRI_AT[0] + x, y, TRI_AT[2]).applyAxisAngle(UP, YAW).add(AT).project(cam()); return [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5]; };
  const blocks = (B, A, col, open) => {
    const h = BLOCK.C / 2, S = BLOCK.C + BLOCK.GAP;
    for (let q = 0; q < NB; q++) for (let k = 0; k <= q; k++) {
      const x = (k - q / 2) * S, y = (NB - 1 - q) * S + h, on = ROWS[q].includes(k), d = on ? 0 : open * h;
      const a = cell(x - h - d, y - h - d, A), b = cell(x + h - d, y - h - d, A), c = cell(x - h - d, y + h - d, A), e = cell(x + h + d, y - h + d, A), f = cell(x + h + d, y + h + d, A), g = cell(x - h + d, y + h + d, A);
      B.tri(a[0], a[1], b[0], b[1], c[0], c[1], col);
      B.tri(e[0], e[1], f[0], f[1], g[0], g[1], col);
    }
  };

  const stroke = (B, A, hx, hy, ang, len, wid, edge) => {
    const n = 14, pts = [], we = [], wc = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, d = (u - 0.5) * len, w = Math.pow(Math.sin(Math.PI * u), 0.55) * wid * 0.25;
      pts.push([A / 2 + (hx + Math.cos(ang) * d) * 0.5, 0.5 - (hy + Math.sin(ang) * d) * 0.5]);
      we.push(w); wc.push(w * 0.46);
    }
    B.ribbon(pts, we, edge);
    B.ribbon(pts, wc, CREAM);
  };

  const cel = makeCel(ctx.engine, {
    max: 60000, order: 1200, behind: true,
    draw(B, ts, A) {
      const tt = warp(ts);
      tri = proj(triW, A) ?? tri;
      // the seal's place in stroke units, when it is small in the frame: as on the site, no stroke of the barrage runs through it
      const box = ctx.player?.box, bh = box ? box[3] - box[1] : 1, R = box && bh < 0.45 ? 1.25 * Math.max(bh, (box[2] - box[0]) * A) : 0;
      const px = box ? (box[0] + box[2] - 1) * A : 0, py = box ? 1 - box[1] - box[3] + 0.16 * bh : 0;
      // the pool takes the seal's weight: paper rings run out from its feet and thin, as long as the pool lies under it
      const cm = cam(), at = ctx.seal.at;
      if (cm && tt > 3.3 && tt < T.erase[0]) for (let k = 0; k < 4; k++) {
        const u = (ts * 0.5 + k / 4) % 1, r = 0.75 + 3.4 * u, pts = [];
        for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; V.set(at[0] + Math.cos(a) * r, 0.03, at[2] + Math.sin(a) * r).project(cm); if (V.z > 1) { pts.length = 0; break; } pts.push([(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5]); }
        if (pts.length) B.ribbon(pts, pts.map(() => 0.0022 * (1 - u)), PAPER);
      }
      for (let i = 0; i < SL; i++) {
        const q = SLASHES[i], tau = tt - q.t0, fin = i === 0;
        if (fin ? tt < T.final || tt > T.final + 0.34 : tau < 0 || tau > q.life || tt > T.barrageEnd + 0.4) continue;
        let hx = fin ? 0 : q.tri ? tri[0] + (hash(i, 9) - 0.5) * 0.9 : q.cx * A * 0.95, hy = fin ? 0.04 : q.tri ? tri[1] + (hash(i, 10) - 0.5) * 0.8 : q.cy * 0.95;
        if (R && !fin) {
          const c = Math.cos(q.ang), s = Math.sin(q.ang), along = (px - hx) * c + (py - hy) * s, side = (py - hy) * c - (px - hx) * s;
          if (Math.abs(along) < q.len / 2 + R / 2 && Math.abs(side) < R) { const d = (side < 0 ? 1 : -1) * (R - Math.abs(side)); hx -= s * d; hy += c * d; }
        }
        const grow = fin ? Math.min(1, (tt - T.final) / 0.06) : Math.min(1, tau / 0.05);
        stroke(B, A, hx, hy, fin ? -0.55 : q.ang, (fin ? 3.9 : q.len) * grow, fin ? 0.12 : q.wid, q.cleave || fin ? BLOOD : INK);
      }
      for (const b of hits) {
        const age = ts - b.t, panel = b.name === "panel", stay = panel && b.kind !== "last" ? STAY : 0;
        if (age < -1e-6 || age >= b.dur + stay - 1e-6) continue;
        const [cx, cy] = centre(b.at, A), seed = Math.round(b.t * 10), hx = (cx - A / 2) * 2, hy = (0.5 - cy) * 2;
        // a hit's own strokes stay on the picture for a few drawings after its panels, thinning
        if (age >= b.dur - 1e-6) { const k = 1 - (age - b.dur) / stay; for (const [dx, dy, ang, len, wid] of b.strokes ?? []) stroke(B, A, hx + dx, hy + dy, ang + 0.02, len, wid * (0.25 + 0.3 * k), BLOOD); continue; }
        if (!panel) {
          const k = b.rev ? 1 - age / b.dur : age / b.dur, f = Math.floor(age * 12 + 1e-6);
          // the shrine lands: thin lines scratched out of the tone round its mouth, starting clear of it (broad wedges there read as light, and the page has none)
          if (b.at === "mouth") spikes(B, cx, cy, Math.round(20 + 26 * k), 0.44, seed + f * 13, PAPER, INK, 0.05 + 0.09 * k);
          else spikes(B, cx, cy, Math.round(12 + 44 * k * k), 0.62 - 0.36 * k, seed + f * 13, PAPER, INK, 0.18 + 0.45 * k);
          continue;
        }
        const f = Math.floor(age * 24 + 1e-6), dark = f === 0, field = dark ? INK : PAPER, line = dark ? PAPER : INK;
        B.rect(0, 0, A, 1, field);
        spikes(B, cx, cy, 44, 0.24 + 0.05 * f, seed + f * 7, line, null);
        if (b.kind === "cleave") blocks(B, A, line, [0, 0.35, 0.8, 1.2][f] ?? 1.2);
        for (const [dx, dy, ang, len, wid] of b.strokes ?? []) stroke(B, A, hx + dx, hy + dy, ang + (f - 1) * 0.02, len * (dark ? 0.8 : 1), wid * (dark ? 0.7 : 1), BLOOD);
      }
    },
  });
  // the tinted flash (never a white-out): after the last cut and the release (an impact panel is its own flash), a little at the page turn
  const veil = makeCel(ctx.engine, { max: 4, order: 1250, draw(B, ts, A) {
    if (hits.some((b) => b.name === "panel" && ts - b.t > -1e-6 && ts - b.t < b.dur - 1e-6)) return;
    const tt = warp(ts), after = (x, w) => (x < 0 ? 0 : Math.max(0, 1 - x / w));
    const a = after(tt - T.final - 0.06, 0.1) * 0.5 + after(tt - T.barrage, 0.1) * 0.16 + Math.max(0, 1 - Math.abs(tt - LINE.impact - 0.05) / 0.08) * 0.2;
    if (a > 0.003) B.rect(0, 0, A, 1, PAPER, Math.min(1, a));
  } });
  // the turn back: two frames of a paper star over the seal (the swap is under it), then its flecks fly off
  const star = (B, cx, cy, r, seed, col) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31)); return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; }), col);
  const poof = makeCel(ctx.engine, { max: 400, order: 1260, draw(B, ts, A) {
    const f = Math.floor((ts - BACK) * 24 + 1e-6), box = ctx.player?.box;
    if (f < 0 || f > 5 || !box) return;
    const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * f);
    if (f < 2) { for (const [k, c] of [[1, INK], [0.965, PAPER], [0.6, INK], [0.56, PAPER]]) star(B, cx, cy, r * k, f * 0.4 + (k < 0.7 ? 0.14 : 0), c); return; }
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)), w = 0.03 * (6 - f) / 4, x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q; B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, i % 3 ? INK : PAPER); }
  } });
  // the island's own weather, whenever the island is the picture: slow snow, seen against the ice (the site's island is never still)
  const snow = makeCel(ctx.engine, { max: 260, order: 1190, behind: true, draw(B, ts, A) {
    const n = Math.round(120 * (ts < LINE.impact ? 1 : Math.min(1, Math.max(0, (ts - 17.6) / 0.8))));
    for (let i = 0; i < n; i++) {
      const z = 0.35 + 0.65 * hash(i, 21), x = ((hash(i, 22) + ts * 0.011 * z + 0.012 * Math.sin(ts * 0.9 + i)) % 1) * A, y = (hash(i, 23) + ts * 0.034 * z) % 1, r = 0.0016 + 0.0026 * z * z;
      B.tri(x, y - r, x + r, y, x, y + r, SNOW); B.tri(x, y - r, x, y + r, x - r, y, SNOW);
    }
  } });
  group.add(snow.group, cel.group, veil.group, letters.mesh, poof.group);

  let comic = null;
  const V2 = new Vector3();
  const px = (p, W, H) => { const c = cam(); if (!c) return null; V.copy(p).project(c); return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H]; };

  return {
    group,
    update(t, dt, cue) {
      const tt = warp(t), R = ctx.engine.shared.uRes.value, A = R.x / R.y, box = ctx.player?.box;
      snow.update(t, cue);
      cel.update(t, cue);
      veil.update(t, cue);
      poof.update(t, cue);
      const tr = cue?.t ?? t; // the lettering pops on the site's own clock, every frame, and judders on twos
      letters.mesh.visible = tr >= LETTERS[0] && t < LETTERS[1];
      if (letters.mesh.visible) {
        const lt = warp(tr) - T.letters[0], pop = Math.min(1, lt / 0.1) * (1 + 0.22 * Math.max(0, 1 - lt / 0.2)), odd = Math.floor(t * 12) % 2 ? 1 : -1;
        const wH = Math.min(1.9, A * 1.7) * pop, hw = wH / (2 * A), hh = 0.3125 * wH * 0.5;
        let cx = (0.03 * odd) / A;
        if (box) { const s0 = box[0] * 2 - 1, s1 = box[2] * 2 - 1, top = 1 - box[1] * 2; if (top > 0.56 - hh && s1 > cx - hw && s0 < cx + hw) cx = s0 + s1 > 0 ? Math.max(-0.96 + hw, s0 - hw - 0.04) : Math.min(0.96 - hw, s1 + hw + 0.04); }
        letters.uAt.value.set(cx, 0.56, hw, hh);
      }
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720, lines = [], seal = ctx.seal.named?.(), say = t >= BACK ? px(V2.set(0.5, 0.26, 0.74).add(AT), W, H) : seal ? px(seal.mouth, W, H) : null, chest = px(ctx.seal.chest(new Vector3()), W, H) ?? [W / 2, H / 2];
      const line = (slot, t0, at, left) => lines.push({ slot, ...TEXT[slot], age: t - t0, at: at ?? [0.6 * W, 0.4 * H], left });
      if (cue?.shot?.data?.quiet || cue?.on?.("panel")) lines.length = 0;
      else if (t >= LINE.A && t < HIT.rel) line("a", LINE.A, px(mouthW, W, H), 0.55);
      else if (t >= LINE.B && t < LINE.C) line("b", LINE.B, say, 0.55);
      else if (t >= LINE.C && t < LINE.credit) line("c", LINE.C, say);
      const ring = t >= LINE.impact && t < LINE.impact + 0.12 ? t - LINE.impact : t >= 28.5 && t < 28.5 + 2 / 12 ? t - 28.5 : -1;
      const bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      comic.frame({
        warm: Object.entries(TEXT).filter(([, v]) => v.kind === "burst").map(([slot, v]) => ({ slot, ...v, age: 1, at: [0.6 * W, 0.4 * H] })), card: TEXT.credit,
        lines, avoid: box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, box[3] * H + 2] : null,
        impact: ring >= 0 ? [chest[0] / W, chest[1] / H, ring < 1 / 12 ? 1 : 1.06] : null,
        sfx: t >= LINE.impact + 0.12 && t < 1.95 ? { text: "SHING", age: t - LINE.impact - 0.12 } : null,
        credit: t >= LINE.credit && t < 28.5 ? { ...TEXT.credit, age: t - LINE.credit } : null,
      });
    },
    dispose() { snow.dispose(); cel.dispose(); veil.dispose(); poof.dispose(); letters.dispose(); comic?.dispose(); },
  };
}
