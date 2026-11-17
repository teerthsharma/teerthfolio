// The three tolls and the survivor, drawn in the style's own inks. A toll is one flat umber drawing with kinked varnish cracks over an amber
// misregistration and a ring; then the cracks stay behind the seal for six drawings, growing and fading. The survivor is a blue star (no
// shake, no freeze, no ring). The bell is placed by bellScreen: live where it is in the frame, else the upper-left point.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { DOCK, REAL, snap } from "../clock.js";
import { hash } from "../live/look.js";
import { GAUGE } from "../live/roof.js";
import { TOWER } from "../live/tower.js";
import { BEAD, PAGE_INK, SFX, SFX_OFF, UMBER } from "../palette.js";
import { toned } from "../tone.js";
import { crack } from "./cracks.js";

export const HITS = { toll: REAL.toll.map(snap), survive: snap(REAL.survive), cracks: [5, 7, 9] };
const BELL = [TOWER.x, TOWER.bell + TOWER.drop, TOWER.z], BEAD4 = [GAUGE.x[3], GAUGE.bead[3], GAUGE.z];
const CRACK_C = toned(PAGE_INK), SFX_C = toned(SFX), SFX_OFF_C = toned(SFX_OFF), UMBER_C = toned(UMBER), BEAD_C = toned(BEAD), CORE_C = toned("#d9efff");
const V = new Vector3();

// the bell on screen (NDC): live when it projects inside the picture, in front of the lens; else the nearest upper-left point
export function bellScreen(cam) {
  const w = new Vector3((cam.aspect < 1 ? -4.8 : TOWER.x) + DOCK[0], BELL[1], BELL[2] + DOCK[2]);
  const front = w.clone().applyMatrix4(cam.matrixWorldInverse).z < 0, p = w.project(cam);
  if (front && Math.abs(p.x) <= 0.9 && Math.abs(p.y) <= 0.9 && p.z <= 1) return { x: p.x, y: p.y, live: true };
  return { x: Math.min(-0.1, Math.max(-0.62, p.x)), y: Math.min(0.55, Math.max(0.2, p.y)), live: false };
}

// the cracks of toll i from a screen point: n kinked cracks, ivory over an amber copy offset as the lettering is; grow scales the length
function cracks(B, cx, cy, i, grow = 1, alpha = 1) {
  const n = HITS.cracks[i];
  for (let k = 0; k < n; k++) {
    const ang = ((k + 0.6 * hash(k, 17 + 101 * i)) / n) * Math.PI * 2, len = (0.1 + 0.1 * hash(k, 23)) * grow, seed = 31 * i + k;
    crack(B, cx - 0.004, cy + 0.003, ang, len, 0.0035, SFX_OFF_C, seed, alpha);
    crack(B, cx, cy, ang, len, 0.0035, CRACK_C, seed, alpha);
  }
}

function ring(B, cx, cy, r, th, col) {
  const pts = [], ws = [];
  for (let k = 0; k <= 48; k++) { const a = (k / 48) * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); ws.push(th / 2); }
  B.ribbon(pts, ws, col);
}

function flare(B, cx, cy, age) {
  const grow = Math.min(1, Math.floor(age * 24 + 1e-6) / 12), life = age < 1 ? 1 : Math.max(0, 1 - (age - 1) / 1.5);
  if (grow <= 0 || life <= 0) return;
  const star = (R, rin) => Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2 - Math.PI / 2, q = k % 2 ? rin : R; return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; });
  B.fan(cx, cy, star(0.5 * grow, 0.0057), BEAD_C, life);
  B.fan(cx, cy, star(0.06 * grow, 0.0025), CORE_C, life);
}

export function buildHits(ctx) {
  const group = new Group();
  const bell = (cam, A) => { const s = bellScreen(cam); return [(s.x * 0.5 + 0.5) * A, 0.5 - s.y * 0.5]; };
  const flat = makeCel(ctx.engine, {
    max: 2000, order: 1215,
    draw(B, ts, A) {
      const cam = ctx.player?.camera;
      if (!cam) return;
      HITS.toll.forEach((t0, i) => {
        const age = ts - t0;
        if (age < -1e-6 || Math.floor(age * 24 + 1e-6) !== 0) return;
        const [cx, cy] = bell(cam, A);
        B.rect(0, 0, A, 1, UMBER_C);
        cracks(B, cx, cy, i);
        ring(B, cx, cy, 0.06 + 0.24 * (age / 0.35), 0.004, SFX_C);
      });
    },
  });
  const cel = makeCel(ctx.engine, {
    max: 4000, order: 1210, behind: true,
    draw(B, ts, A) {
      const cam = ctx.player?.camera;
      if (!cam) return;
      HITS.toll.forEach((t0, i) => {
        const age = ts - t0;
        if (age < -1e-6) return;
        const f = Math.floor(age * 24 + 1e-6), [cx, cy] = bell(cam, A);
        if (f >= 1 && f < 7) cracks(B, cx, cy, i, 1.25, 1 - (f - 1) / 6);
        if (f >= 1 && age < 0.35) ring(B, cx, cy, 0.06 + 0.24 * (age / 0.35), 0.004, SFX_C);
      });
      const age = ts - HITS.survive;
      if (age >= -1e-6 && age < 2.5) {
        V.set(BEAD4[0] + DOCK[0], BEAD4[1], BEAD4[2] + DOCK[2]).project(cam);
        flare(B, (V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5, age);
      }
    },
  });
  group.add(flat.group, cel.group);
  return {
    group,
    update(t, cue) { flat.update(t, cue); cel.update(t, cue); },
    dispose() { flat.dispose(); cel.dispose(); },
  };
}
