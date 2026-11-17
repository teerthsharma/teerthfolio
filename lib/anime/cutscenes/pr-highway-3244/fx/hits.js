// Hits of pr-highway-3244 drawn as flat cel marks in the style's ink and accent: the war cry, the launch, the five flings with the struck rival's shards, the Ka-chow glint and the line.
import { Group, Vector3 } from "three";
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import { BETA, CAR_S, heroState, rivalState } from "../race.js";
import { C, FLING, W, rotY } from "../clock.js";
import { hash } from "../live/shade.js";

const GOLD = rgb("#ffc926"), CREAM = rgb("#fff1d0"), INDIGO = rgb("#291480"), SAND = rgb("#ffd8a8"), SHADE = rgb("#c08060");
const SNOW = rgb("#f0e6e2"), SNOWSHADE = rgb("#c4c0d8");
const RIVAL_HEX = ["#1fb8b0", "#8a4fe0", "#9ad62f", "#ff8a1f", "#3d8cf0", "#e0409a", "#ffd21f", "#3fd49a", "#2850d8", "#f4efe4", "#ff6f5a", "#3aa85a"];
const RIVAL = [7, 3, 0, 6, 2].map((i) => rgb(RIVAL_HEX[i]));
const HITS = [
  { t: C.cry, n: 3, kind: "cry", at: "chest" },
  { t: C.go, n: 2, kind: "launch", at: "tyre" },
  ...FLING.map((t, i) => ({ t, n: i === 4 ? 4 : 2, kind: "fling", at: i })),
  { t: C.kachow, n: 5, kind: "glint", at: "nose" },
  { t: C.cross, n: 4, kind: "line", at: "nose" },
  { t: C.stop, n: 6, kind: "stop", at: "tyre" },
];

const circle = (x, y, rx, ry, n = 14) => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * rx, y + Math.sin((i / n) * Math.PI * 2) * ry]);
const disc = (B, x, y, r, c) => B.fan(x, y, circle(x, y, r, r, 12), c);
const burst = (B, x, y, r, n, c, inner = 0.8) => {
  const ring = [];
  for (let i = 0; i < 2 * n; i++) { const a = (i / (2 * n)) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r * inner : r; ring.push([x + Math.cos(a) * q, y + Math.sin(a) * q]); }
  B.fan(x, y, ring, c);
};
const hoop = (B, x, y, r, w) => { const pts = circle(x, y, r, r, 40); pts.push(pts[0]); B.ribbon(pts, pts.map(() => w), CREAM); };
const dust = (B, x, y, r, k, col = SAND, shade = SHADE) => {
  for (let j = 0; j < 5; j++) {
    const a = (j / 5) * Math.PI * 2 + 0.7, px = x + Math.cos(a) * r * 1.1, py = y + Math.sin(a) * r * 0.35, q = 0.016 + 0.006 * hash(j, 41) + 0.01 * k;
    disc(B, px, py, q + 0.005, shade);
    disc(B, px, py, q, col);
  }
};
const shards = (B, x, y, age, col) => {
  for (let k = 0; k < 8; k++) {
    const a = hash(k, 61) * 6.28, d = 0.02 + 0.2 * Math.min(1, age * 5) * (0.5 + hash(k, 62)), s = 0.016 + 0.01 * hash(k, 63);
    B.tri(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, x + Math.cos(a + 2) * s + Math.cos(a) * d, y + Math.sin(a + 2) * s + Math.sin(a) * d * 0.7, x + Math.cos(a - 2) * s + Math.cos(a) * d, y + Math.sin(a - 2) * s + Math.sin(a) * d * 0.7, col);
  }
};

export default function build(ctx) {
  const group = new Group(), V = new Vector3();
  const centre = (hit, cam, A) => {
    let p;
    if (hit.at === "chest") { const v = ctx.seal?.chest?.(new Vector3()); p = v ? [v.x, v.y, v.z] : W([0, 0.5, 0]); }
    else if (hit.at === "tyre") { const h = heroState(hit.t); p = W([h.x, h.y, h.z]); }
    else if (hit.at === "nose") { const h = heroState(hit.t); p = W([h.x + 2.15 * CAR_S * Math.cos(h.yaw), h.y + 0.62 * CAR_S, h.z - 2.15 * CAR_S * Math.sin(h.yaw)]); }
    else {
      const h = heroState(hit.t), r = rivalState(hit.at, hit.t), q = rotY(BETA, [r.x, r.y, r.z]);
      p = W([q[0] + h.trackX, q[1] + h.trackY, q[2] + h.trackZ]);
    }
    V.set(p[0], p[1], p[2]).project(cam);
    return [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5];
  };

  const cel = makeCel(ctx.engine, {
    max: 20000, order: 1200, behind: false,
    draw(B, ts, A) {
      const cam = ctx.player?.camera;
      if (!cam) return;
      for (const hit of HITS) {
        const age = ts - hit.t, f = Math.floor(age * 24 + 1e-6);
        if (f < 0 || f >= hit.n) continue;
        const [x, y] = centre(hit, cam, A), r = hit.kind === "cry" ? 0.12 + 0.1 * Math.min(1, age * 8) : 0.1 + 0.6 * Math.min(1, age * 4);
        if (hit.kind !== "stop") hoop(B, x, y, r, 0.006);
        if (hit.kind === "cry") {
          burst(B, x, y, r * 1.4, 9, GOLD, 0.5);
        } else if (hit.kind === "launch") {
          dust(B, x, y + 0.02, 0.05 + 0.1 * age * 4, age * 4);
        } else if (hit.kind === "fling") {
          if (f < 2) {
            burst(B, x, y, 0.14, 7, GOLD, 0.6);
            hoop(B, x, y, 0.16, 0.01);
            B.fan(x, y, circle(x, y, 0.13, 0.03, 14), CREAM);
            burst(B, x + 0.1, y - 0.05, 0.045, 4, GOLD, 0.35);
            burst(B, x - 0.075, y + 0.045, 0.03, 4, GOLD, 0.35);
            dust(B, x, y, 0.07 + 0.12 * age * 4, age * 4);
          } else {
            for (let k = 0; k < 7; k++) {
              const a = (k / 7) * Math.PI * 2 + hash(k, 51) * 0.5, L = 0.24 + 0.08 * hash(k, 52);
              B.tri(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, x + Math.cos(a + 0.12) * 0.012, y + Math.sin(a + 0.12) * 0.012, INDIGO);
            }
          }
          shards(B, x, y, age, RIVAL[hit.at]);
        } else if (hit.kind === "glint") {
          burst(B, x, y, 0.07 + 0.012 * f, 4, CREAM, 0.3);
          burst(B, x, y, 0.05 + 0.01 * f, 4, GOLD, 0.3);
        } else if (hit.kind === "stop") {
          dust(B, x, y + 0.02, 0.07 + 0.1 * age * 4, age * 4, SNOW, SNOWSHADE);
        } else {
          burst(B, x, y, 0.06 + 0.012 * f, 4, CREAM, 0.3);
          burst(B, x, y, 0.05 + 0.01 * f, 4, GOLD, 0.3);
        }
      }
    },
  });
  group.add(cel.group);
  return {
    group,
    update(t) {
      cel.update(t);
    },
    dispose() {
      cel.dispose();
    },
  };
}
