// FX for pr-pyrefly-4180: the live lettering (fx/page.js: the banner, the dock bar, the balloons, the impact frame, the credit card) on the site's
// clock, and the drawn marks in the page's own ink (fx/hits.js). Balloon tails are the live's: the jaws, Kushina's mouth, the seal, the pup.
import { Group, Vector3 } from "three";
import { BACK, DOCK, K, LINE, TURN } from "../clock.js";
import { Comic, TEXT } from "./page.js";
import { buildHits } from "./hits.js";

const C = Math.cos(TURN), S = Math.sin(TURN), V = new Vector3();
const toWorld = (p) => new Vector3(C * p[0] + S * p[2] + DOCK[0], p[1] + DOCK[1], -S * p[0] + C * p[2] + DOCK[2]);

export default function build(ctx) {
  const hits = buildHits(ctx);
  let comic = null;
  const px = (p, W, H) => {
    const c = ctx.player?.camera;
    if (!c || !p) return null;
    V.copy(p).project(c);
    return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H];
  };
  return {
    group: hits.group,
    update(t, dt, cue) {
      hits.update(t, cue);
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const tr = cue?.t ?? t, W = host.clientWidth || 1280, H = host.clientHeight || 720, st = ctx.pf;
      const box = ctx.player?.box, bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      const seal = ctx.seal.named?.();
      const say = tr >= BACK ? px(toWorld([0, 0.75, 0.2]), W, H) : px(seal?.mouth ?? ctx.seal.chest(new Vector3()), W, H);
      const lines = [];
      const line = (slot, t0, at) => lines.push({ slot, ...TEXT[slot], age: tr - t0, at: at ?? [0.6 * W, 0.4 * H] });
      if (tr >= LINE.A && tr < LINE.B) line("a", LINE.A, px(toWorld(st.jaw), W, H));
      else if (tr >= LINE.B && tr < LINE.C) line("b", LINE.B, say);
      if (tr >= K[0] && tr < K[1]) line("k", K[0], px(toWorld(st.kush), W, H));
      if (tr >= LINE.C && tr < LINE.credit) line("c", LINE.C, say);
      const ring = tr >= LINE.impact && tr < LINE.impact + 0.12 ? tr - LINE.impact : -1;
      const tile = tr >= LINE.collapse[0] && tr < LINE.collapse[1];
      const chest = px(toWorld([0, 0.6, 0]), W, H) ?? [W / 2, H / 2];
      const credit = tr >= LINE.credit && tr < 26.3 ? { ...TEXT.credit, age: tr - LINE.credit, opacity: tr < 26.0 ? 1 : Math.max(0, 1 - (tr - 26.0) / 0.3) } : null;
      comic.frame({
        banner: tr, dock: tr, impact: tile ? [0.5, 0.5, 1, "collapse"] : ring >= 0 ? [chest[0] / W, chest[1] / H, ring < 1 / 12 ? 1 : 1.06] : null,
        lines, credit, card: TEXT.credit,
        warm: Object.entries(TEXT).filter(([, v]) => v.kind === "burst").map(([slot, v]) => ({ slot, ...v, age: 1, at: [0.6 * W, 0.4 * H] })),
        avoid: box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, box[3] * H + 2] : null,
      });
    },
    dispose() { hits.dispose(); comic?.dispose(); },
  };
}
