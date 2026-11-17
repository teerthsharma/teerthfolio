// FX layer for pr-openxla-46539 (All Might's UNITED STATES OF SMASH, the site's comic page). Layer 1, drawn in front of the world.
// The balloons, KA-BOOM, the impact rings and the credit are the DOM comic layer (page.js) on the live clock; the screen drawings
// (screen.js: the punch's SMASH!, the crack, the panel border, RIIIP!) and the page's own drawings (draw.js: the bolts, the rain
// depth, the burst, the shards, the paper star at the turn back) are cel and quad layers the same clock drives.
import { Group, Vector3 } from "three";
import { Comic } from "./page.js";
import { buildScreen } from "./screen.js";
import { buildDraw } from "./draw.js";
import { BEAK, DOCK, LAW } from "../clock.js";

const TEXT = {
  a: { kind: "oval", text: "Two runs. Two answers. Prove which one is real, little seal.", bold: "Two runs" },
  b: { kind: "burst", text: "I am here!", bold: "I am here!" },
  c: { kind: "burst", text: "UNITED STATES OF SMASH!", bold: "UNITED STATES OF SMASH!" },
  credit: { title: "openxla/xla #46539 · 5 lines, deterministic", sub: "Same program, two outputs before, one stable output after." },
};
const BEAK_W = new Vector3(BEAK[0] + DOCK[0], BEAK[1] + DOCK[1], BEAK[2] + DOCK[2]);
const KA = [1.27, 1.95], RING = [[1.15, 1.27], [LAW.collapse[0], LAW.collapse[0] + 2 / 12]];

export default function build(ctx) {
  const group = new Group(), V = new Vector3();
  const cam = () => ctx.player?.camera;
  const px = (p, W, H) => {
    const c = cam();
    if (!c || !p) return null;
    V.copy(p).project(c);
    return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H];
  };
  const screen = buildScreen(ctx), draw = buildDraw(ctx);
  group.add(screen.group, draw.group);
  let comic = null;
  return {
    group,
    update(t, dt, cue) {
      screen.update(t, cue);
      draw.update(t, cue);
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720;
      const say = px(ctx.seal.group.userData.say, W, H) ?? [W / 2, H / 2];
      const lines = [];
      const line = (slot, t0, at, left) => lines.push({ slot, ...TEXT[slot], age: t - t0, at: at ?? [0.6 * W, 0.4 * H], left });
      if (t >= LAW.lineA && t < LAW.move[1]) line("a", LAW.lineA, px(BEAK_W, W, H), 0.55);
      else if (t >= LAW.lineB && t < LAW.lineC) line("b", LAW.lineB, say, 0.55);
      else if (t >= LAW.lineC && t < LAW.credit) line("c", LAW.lineC, say);
      const chest = px(ctx.seal.chest(new Vector3()), W, H) ?? [W / 2, H / 2];
      const ringOn = RING.some(([a, b]) => t >= a && t < b);
      const box = ctx.player?.box, bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      comic.frame({
        warm: Object.entries(TEXT).filter(([, v]) => v.kind === "burst").map(([slot, v]) => ({ slot, ...v, age: 1, at: [0.6 * W, 0.4 * H] })),
        card: TEXT.credit,
        lines,
        avoid: box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, box[3] * H + 2] : null,
        impact: ringOn ? [chest[0] / W, chest[1] / H, 1.06] : null,
        sfx: t >= KA[0] && t < KA[1] ? { text: "KA-BOOM", age: t - KA[0] } : null,
        credit: t >= LAW.credit && t < LAW.collapse[0] ? { ...TEXT.credit, age: t - LAW.credit } : null,
      });
    },
    dispose() {
      screen.dispose?.();
      draw.dispose?.();
      comic?.dispose();
    },
  };
}
