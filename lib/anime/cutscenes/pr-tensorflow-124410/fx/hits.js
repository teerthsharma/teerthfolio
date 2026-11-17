// FX HITS: each hit of the live cut drawn as a manga panel in the page's own inks (the ink, cream and coral of the palette at the hit's tick),
// on twos, with the focus lines that close on it for 0.25 s before. The panels never cover the seal's face: the cut-out round the seal is the hole.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { PALETTES, R, hash } from "../live/ink.js";
import { HIT, K, LINE, P, PUP, SEAL, SWAP, palAt } from "../clock.js";
import { toned } from "../tone.js";

const hex = (v) => `#${[v.x, v.y, v.z].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")}`;
const COL = PALETTES.map((p) => [R.ink, R.cream, R.coral].map((s) => toned(hex(p[s]))));
const STAND = [P.standBase[0], 2.6 * K, P.standBase[2]];
const RING = toned("#c026d3");
const PANEL = 0.26; // the clock cut-in's side in frame heights (clockcut.js SIZE)
const HITS = [
  { t: HIT.bloom, n: 3, at: [0, 0.6, 0], kind: "bloom" },
  { t: HIT.rival, n: 3, at: P.tower, kind: "rival" },
  ...HIT.barrage.map((t) => ({ t, n: 2, at: P.coral, from: STAND, kind: "barrage" })),
  { t: HIT.crack, n: 3, at: P.coral, kind: "crack" },
  { t: HIT.stop, n: 4, at: [0, 1.0, 0], kind: "stop" },
  { t: HIT.tock, n: 2, at: P.clock, kind: "tock" },
  { t: HIT.resume, n: 3, at: P.coral, kind: "resume" },
  { t: HIT.drown, n: 3, at: P.coral, kind: "drown" },
  { t: HIT.tick, n: 2, at: P.clock, kind: "tick" },
  { t: HIT.swap, n: 2, at: [0, 0.9, 0], kind: "swap" },
];

const ring = (B, cx, cy, r, w, c) => {
  const pts = [], ws = [];
  for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); ws.push(w / 2); }
  B.ribbon(pts, ws, c);
};
// spikes toward the centre's rim: each a wedge from radius r0 out past the frame, jittered by hash
const spikes = (B, cx, cy, n, r0, seed, c, k = 1, a0 = 0, span = Math.PI * 2) => {
  for (let i = 0; i < n; i++) {
    const a = a0 + ((i + 0.8 * hash(i, seed)) / n) * span, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k;
    const dx = Math.cos(a), dy = Math.sin(a);
    B.tri(cx + dx * r, cy + dy * r, cx + dx * 2.6 - dy * (w / 2), cy + dy * 2.6 + dx * (w / 2), cx + dx * 2.6 + dy * (w / 2), cy + dy * 2.6 - dx * (w / 2), c);
  }
};
const star = (B, cx, cy, r, c) => B.fan(cx, cy, Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2, q = r * (i % 2 ? 0.5 : 1); return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; }), c);
const ticks = (B, cx, cy, r, n, len, c) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.1 * hash(i, 51), r0 = r + 0.03, r1 = r0 + len * (0.7 + 0.6 * hash(i, 53));
    B.ribbon([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], [0.006, 0.002], c);
  }
};

// the focus lines: from a ring that shrinks onto the point (p 0, 1/3, 2/3 on the 12 fps drawings)
const gather = (B, c, p, ink) => {
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + 0.05 * hash(i, 91), r0 = 1.1 - 0.9 * p, r1 = 1.6, w = 0.002 + 0.003 * hash(i, 93);
    B.ribbon([[c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0], [c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1]], [w, 0.0005], ink);
  }
};

const panel = (B, h, c, f, A, pal, from) => {
  const [ink, cream, coral] = pal, [cx, cy] = c;
  switch (h.kind) {
    case "bloom":
      if (f === 0) { B.rect(0, 0, A, 1, ink); spikes(B, cx, cy, 56, 0.16, 11, cream, 0.6); return; }
      spikes(B, cx, cy, 48, 0.24 + 0.05 * f, 11, cream, 0.5);
      for (const r of [0.26, 0.2, 0.14]) ring(B, cx, cy, r, 0.012, RING);
      return;
    case "rival":
      spikes(B, cx, cy, 18, 0.24 + 0.05 * f, 21, ink, 0.5);
      B.rect(cx - 0.05, cy - 0.5, cx + 0.05, cy + 0.5, ink);
      B.ribbon([[0, 0.92], [A, 0.08]], [0.009, 0.009], coral);
      return;
    case "barrage": {
      if (!from) return;
      const line = f === 0 ? ink : cream, dx = cx - from[0], dy = cy - from[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      for (let i = 0; i < 14; i++) {
        const u = 0.1 + 0.7 * hash(i, 41 + f), v = (hash(i, 43) - 0.5) * 0.3, l = 0.15 + 0.5 * hash(i, 45);
        const x0 = from[0] + dx * u - uy * v, y0 = from[1] + dy * u + ux * v;
        B.ribbon([[x0, y0], [x0 + ux * l, y0 + uy * l]], [0.004 + 0.006 * hash(i, 47), 0.0005], line);
      }
      star(B, cx, cy, 0.03, cream);
      return;
    }
    case "crack":
      for (let i = 0; i < 10; i++) {
        const a = hash(i, 27) * Math.PI * 2, r = 0.06 + 0.2 * hash(i, 29) + 0.1 * f, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, s = 0.025 + 0.02 * hash(i, 31);
        B.tri(x, y, x + Math.cos(a + 0.5) * s, y + Math.sin(a + 0.5) * s, x + Math.cos(a - 0.5) * s, y + Math.sin(a - 0.5) * s, ink);
      }
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.2 * hash(i, 33), pts = [], ws = [];
        for (let s = 0; s <= 8; s++) {
          const r = 0.04 + 0.03 * s;
          pts.push([cx + Math.cos(a) * r + (hash(s, i + 35) - 0.5) * 0.03 * s, cy + Math.sin(a) * r + (hash(s, i + 37) - 0.5) * 0.03 * s]);
          ws.push(0.012 * (1 - s / 9) + 0.001);
        }
        B.ribbon(pts, ws.map((w) => w * 2), ink);
        B.ribbon(pts, ws, coral);
      }
      return;
    case "stop":
      spikes(B, cx, cy, 24, 0.22 + 0.04 * f, 51, f % 2 ? cream : ink, 0.5);
      return;
    case "tock":
      ring(B, cx, cy, 0.13 + 0.05 * f, 0.008, cream);
      ticks(B, cx, cy, 0.13 + 0.05 * f, 8, 0.06, ink);
      return;
    case "tick": {
      const x0 = 0.98 * A - PANEL, y0 = 0.02, s = PANEL; // the clock panel's top-left corner (clockcut.js), the slash across it
      B.ribbon([[x0 + 0.58 * s, y0 + 0.05 * s], [x0 + 0.98 * s, y0 + 0.34 * s]], [0.012, 0.012], coral);
      spikes(B, x0, y0, 6, 0.02, 83, ink, 0.4);
      return;
    }
    case "resume":
      spikes(B, cx, cy, 14, 0.24 + 0.05 * f, 61, coral, 0.5);
      return;
    case "drown":
      ring(B, cx, cy, 0.1 + 0.14 * f, 0.012, coral); spikes(B, cx, cy, 20, 0.1 + 0.1 * f, 71, coral, 0.8, Math.PI, Math.PI);
      return;
    case "swap":
      spikes(B, cx, cy, 22, 0.3, 81, cream, 0.5);
      return;
  }
};

export function makeHits(ctx) {
  const group = new Group(), V = new Vector3(), S = new Vector3();
  const proj = (p, A) => {
    const cam = ctx.player?.camera;
    if (!cam) return null;
    V.set(p[0], p[1], p[2]).applyMatrix4(group.matrixWorld).project(cam);
    return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5];
  };
  // a world point (the pale pup's head, from cast) is already in world axes
  const projWorld = (p, A) => {
    const cam = ctx.player?.camera;
    if (!cam || !p) return null;
    V.set(p[0], p[1], p[2]).project(cam);
    return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5];
  };
  const cel = makeCel(ctx.engine, {
    max: 60000, order: 1200,
    draw(B, ts, A) {
      for (const h of HITS) {
        const c = h.kind === "swap" ? projWorld(ctx.cutCast?.pupHead?.(), A) : proj(h.at, A);
        if (!c) continue;
        const g0 = h.t - 0.25;
        if (ts >= g0 - 1e-6 && ts < h.t - 1e-6) gather(B, c, Math.floor((ts - g0) * 12 + 1e-6) / 3, COL[palAt(ts)][0]);
        const age = ts - h.t;
        if (age < -1e-6 || age >= h.n / 24 - 1e-6) continue;
        panel(B, h, c, Math.floor(age * 24 + 1e-6), A, COL[palAt(h.t)], h.from ? proj(h.from, A) : null);
      }
      const tc = ctx.cutCast?.crossedAt?.(), dt = ts - tc;
      if (typeof tc === "number" && dt >= -1e-6 && dt < 3 / 24 - 1e-6) {
        const hc = projWorld(ctx.cutCast.pupHead?.(), A);
        if (hc) spikes(B, hc[0], hc[1], 16, 0.1 + 0.04 * Math.floor(dt * 24 + 1e-6), 85, COL[palAt(ts)][1], 0.5);
      }
    },
  });
  group.add(cel.group);
  return {
    group,
    update(t, cue) {
      group.updateWorldMatrix(true, false);
      // the hole follows the wielder: the DIO seal between the impact and the tear, the pale pup otherwise
      const head = ctx.cutCast?.pupHead?.(), seal = ctx.seal?.group;
      let hole = [0, 0, 0, 0];
      if (t >= LINE.impact && t < SWAP && seal) { seal.getWorldPosition(S).add(V.set(0, 0.9, 0)); hole = [S.x, S.y, S.z, 1.1 * SEAL.scale / PUP]; }
      else if (head) hole = [head[0], head[1], head[2], 0.9];
      cel.mesh.material.uniforms.uHole.value.set(...hole);
      cel.update(t, cue);
    },
    dispose() { cel.dispose(); },
  };
}
