// FX of p-topological-ml-toolkit: the comic layer (page.js) with the three balloons, the impact frame, REVERSE and the credit card (the card's first
// joke is the one shown, as the capture drew it); the hit panels, the return, the glints, the island's snow and the tinted flashes.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { hash } from "../live/city.js";
import { DOCK, FLASH, HIT, LINE, SEAL } from "../clock.js";
import { PAL, toned } from "../tone.js";
import { Comic } from "./page.js";
import hitCel from "./hits.js";
import swapCel from "./swap.js";
import glints from "./glints.js";

const TEXT = {
  a: { kind: "oval", text: "That much power, from a seal?" },
  b: { kind: "burst", text: "I just changed the direction. The shape was always there.", bold: ["changed the direction", "shape was always there"] },
  c: { kind: "burst", text: "The shape of data, as an ordinary feature.", bold: ["ordinary feature"] },
  credit: { title: "teerthsharma/topological-ml-toolkit", sub: "persistent homology and Betti-curve features · Rust core, Python API", ret: "Vectors reversed, the seal is sent back along its own path." },
};
const PALE = toned(PAL.pale), STAGE = toned(PAL.stage), WHITE = toned(PAL.white);
const UP = new Vector3(0, 1, 0);

export default function build(ctx) {
  const group = new Group(), V = new Vector3(), CHEST = new Vector3(), BELLY = new Vector3(), AT = new Vector3(...DOCK);
  const PUP_MOUTH = new Vector3(0.05, 0.45, 0.5).applyAxisAngle(UP, SEAL.yaw).add(AT);
  const hits = (ctx.scene.beats ?? []).filter((b) => b.name === "gather" || b.name === "panel");
  const hit = hitCel(ctx, hits), swap = swapCel(ctx), gl = glints(ctx);
  const snow = makeCel(ctx.engine, {
    max: 260, order: 1190, behind: true,
    draw(B, ts, A) {
      if (ts >= LINE.impact && ts < 16) return;
      for (let i = 0; i < 90; i++) {
        const z = 0.35 + 0.65 * hash(i, 21), x = ((1 + hash(i, 22) + ts * 0.011 * z + 0.012 * Math.sin(ts * 0.9 + i)) % 1) * A, y = (hash(i, 23) + ts * 0.034 * z) % 1, r = 0.0016 + 0.0026 * z * z;
        B.tri(x, y - r, x + r, y, x, y + r, WHITE); B.tri(x, y - r, x, y + r, x - r, y, WHITE);
      }
    },
  });
  const veil = makeCel(ctx.engine, {
    max: 8, order: 1250,
    draw(B, ts, A) {
      if (hits.some((b) => b.name === "panel" && ts - b.t > -1e-6 && ts - b.t < b.dur - 1e-6)) return;
      const p = ts - HIT.pop, a = p >= 0 && p < 0.2 ? 0.32 * (1 - p / 0.2) : 0;
      if (a > 0.003) B.rect(0, 0, A, 1, PALE, a);
      const f = ts - FLASH.at;
      if (f >= 0 && f < FLASH.width) B.rect(0, 0, A, 1, STAGE, FLASH.peak);
    },
  });
  group.add(hit.group, swap.group, gl.group, snow.group, veil.group);

  let comic = null;
  const px = (w, W, H) => {
    const c = ctx.player?.camera;
    if (!c || !w) return null;
    V.copy(w).project(c);
    return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H];
  };

  return {
    group,
    update(t, dt, cue) {
      hit.update(t, cue); swap.update(t, cue); gl.update(t); snow.update(t, cue); veil.update(t, cue);
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720, box = ctx.player?.box, lines = [];
      const seal = ctx.seal.named?.();
      ctx.seal.chest(CHEST);
      BELLY.copy(CHEST).setY(CHEST.y - 0.4);
      const chest = px(CHEST, W, H) ?? [W / 2, H / 2];
      const add = (slot, [t0, t1], at, left) => { if (t >= t0 && t < t1) lines.push({ slot, ...TEXT[slot], age: t - t0, at: at ?? [0.6 * W, 0.4 * H], left }); };
      if (!(cue?.shot?.data?.quiet || cue?.on?.("panel"))) {
        add("a", LINE.A, px(BELLY, W, H), 0.55);
        add("b", LINE.B, px(seal?.mouth, W, H), 0.55);
        add("c", LINE.C, px(PUP_MOUTH, W, H));
      }
      const ring = t - LINE.impact, bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      comic.frame({
        warm: Object.entries(TEXT).filter(([, v]) => v.kind === "burst").map(([slot, v]) => ({ slot, ...v, age: 1, at: [0.6 * W, 0.4 * H] })),
        card: TEXT.credit,
        lines,
        avoid: box ? [box[0] * W - 0.12 * bw, box[1] * H - 0.12 * bh, box[2] * W + 0.12 * bw, box[3] * H + 0.12 * bh] : null,
        impact: ring >= 0 && ring < 0.12 ? [chest[0] / W, chest[1] / H, ring < 1 / 12 ? 1 : 1.06] : null,
        sfx: t >= LINE.sfx[0] && t < LINE.sfx[1] ? { text: "REVERSE", age: t - LINE.sfx[0] } : null,
        credit: t >= LINE.credit[0] && t < LINE.credit[1] ? { ...TEXT.credit, age: t - LINE.credit[0] } : null,
      });
    },
    dispose() { hit.dispose(); swap.dispose(); gl.dispose(); snow.dispose(); veil.dispose(); comic?.dispose(); },
  };
}
