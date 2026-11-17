// FX for p-tangle: the drawn hits (hits.js), the sun and flare cross as light (flare.js), the wash and the return star (swap.js), and the comic-print layer (page.js):
// the three balloons on the live clock, the flat impact frame, MUSUBI and the credit card. The lettering is the live's own and sits in the lower half.
import { Group, Vector3 } from "three";
import { makeFlare } from "./flare.js";
import { makeHits } from "./hits.js";
import { makeSwap } from "./swap.js";
import { Comic, TEXT } from "./page.js";
import { BACK, DOCK, LINE, REST, SFX, TAIL_A } from "../clock.js";

const V = new Vector3(), V2 = new Vector3(), HEAD = new Vector3(DOCK[0], DOCK[1] + 0.62, DOCK[2]), TAIL = new Vector3(TAIL_A[0] + DOCK[0], TAIL_A[1] + DOCK[1], TAIL_A[2] + DOCK[2]);
const LOOPS = new Vector3(REST.CL[0] + DOCK[0], REST.CL[1] + DOCK[1], REST.CL[2] + DOCK[2]);

export default function build(ctx) {
  const flare = makeFlare(ctx), hits = makeHits(ctx), swap = makeSwap(ctx);
  const group = new Group();
  group.add(flare.group, hits.group, swap.group);
  let comic = null;
  const px = (w, W, H) => { const c = ctx.player?.camera; if (!c) return null; V.copy(w).project(c); return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H]; };
  return {
    group,
    update(t, dt, cue) {
      flare.update(t);
      hits.update(t, dt, cue);
      swap.update(t, dt, cue);
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720, box = ctx.player?.box;
      const on = t >= LINE.impact && t < BACK + 2 / 24, mouth = on ? ctx.seal.named?.()?.mouth : null, say = px(mouth ?? HEAD, W, H), tailA = px(TAIL, W, H);
      const face = !!(cue?.shot?.data?.faceAvoid ?? cue?.shot?.faceAvoid), loops = px(LOOPS, W, H), away = loops ? (loops[0] > 0.5 * W ? 0.03 : 0.97) : undefined;
      const lines = [];
      const line = (slot, t0, at, left) => lines.push({ slot, ...TEXT[slot], age: t - t0, at: at ?? [0.6 * W, 0.4 * H], left });
      if (cue?.on?.("panel")) lines.length = 0;
      else if (t >= LINE.A && t < LINE.B) line("a", LINE.A, tailA, 0.55);
      else if (t >= LINE.B && t < LINE.C) line("b", LINE.B, say, away);
      else if (t >= LINE.C && t < LINE.credit) line("c", LINE.C, say, away);
      const ring = t >= LINE.impact && t < LINE.impact + 0.12 ? t - LINE.impact : t >= LINE.collapse[0] && t < LINE.collapse[0] + 2 / 12 ? t - LINE.collapse[0] : -1;
      const chest = on ? ctx.seal.chest?.(V2) ?? HEAD : HEAD, cp = px(chest, W, H) ?? [W / 2, H / 2];
      const bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      const low = box ? (face ? box[1] + 0.55 * (box[3] - box[1]) : box[3]) : 0;
      comic.frame({
        warm: Object.entries(TEXT).filter(([, v]) => v.kind === "burst").map(([slot, v]) => ({ slot, ...v, age: 1, at: [0.6 * W, 0.4 * H] })), card: TEXT.credit,
        lines, avoid: box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, low * H + (face ? 0 : 2)] : null,
        impact: ring >= 0 ? [cp[0] / W, cp[1] / H, ring < 1 / 12 ? 1 : 1.06] : null,
        sfx: SFX && t >= SFX[0] && t < SFX[1] ? { text: "MUSUBI", age: t - SFX[0] } : null,
        credit: t >= LINE.credit && t < LINE.collapse[0] ? { ...TEXT.credit, age: t - LINE.credit } : null,
      });
    },
    dispose() { flare.dispose(); hits.dispose(); swap.dispose(); comic?.dispose(); },
  };
}
