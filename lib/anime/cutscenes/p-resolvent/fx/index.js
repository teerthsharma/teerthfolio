// FX for p-resolvent: the court's pools (mana.js: flame, soul-light, column, stones, leaves, the gold flash), the drawn hits (hits.js), the gold
// star of the turn back (swap.js), PAKIIN! and VERDICT VOID (letters.js), the sun and the haze (light.js), and the comic layer (page.js: the
// balloons, ZUUUN, the impact frame, the caption pill and the credit card). Lines, pill and card come from the live clock (clock.js).
import { Group, Vector3 } from "three";
import { BOLD, CREDIT, DOCK, IMPACT_FRAME, LINES, PILL, SFX, WIPE, beatT } from "../clock.js";
import { buildLight } from "./light.js";
import { buildLetters } from "./letters.js";
import { buildMana } from "./mana.js";
import { hitCel } from "./hits.js";
import { buildSwap } from "./swap.js";
import { Comic } from "./page.js";

const AT = new Vector3(...DOCK);
const WORLD = (p) => new Vector3(p[0], p[1], p[2]).add(AT);

export default function build(ctx) {
  const group = new Group(), V = new Vector3();
  const mana = buildMana(ctx), letters = buildLetters(), swap = buildSwap(ctx), hits = hitCel(ctx), light = buildLight(ctx);
  group.add(light.group, mana.group, hits.group, swap.group, letters.group);
  const px = (p, W, H) => {
    const c = ctx.player?.camera;
    if (!c) return null;
    V.copy(p).project(c);
    return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H];
  };
  const tailA = WORLD(LINES[0].tail), chest = new Vector3();
  let comic = null;
  return {
    group,
    update(t, dt, cue) {
      mana.update(t, cue);
      hits.update(t, cue);
      swap.update(t, cue);
      letters.update(t);
      light.update(t, cue);
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720, box = ctx.player?.box;
      const lines = [], say = px(ctx.seal.chest(chest), W, H) ?? [W / 2, H / 2];
      if (!cue?.on?.("panel")) {
        for (const l of LINES) {
          if (t < l.t[0] || t >= l.t[1]) continue;
          const at = l.who === "aura" ? px(tailA, W, H) : say;
          lines.push({ slot: l.id.toLowerCase(), kind: l.kind, text: l.text, bold: BOLD, age: t - l.t[0], at: at ?? [0.6 * W, 0.4 * H] });
        }
      }
      const bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      const warm = LINES.filter((l) => l.kind === "burst").map((l) => ({ slot: l.id.toLowerCase(), kind: l.kind, text: l.text, bold: BOLD, age: 1, at: [0.6 * W, 0.4 * H] }));
      comic.frame({
        warm,
        warmPill: { text: PILL.text },
        wipe: WIPE(beatT(t)),
        card: { title: CREDIT.title, sub: CREDIT.sub },
        lines,
        avoid: box ? [box[0] * W - 0.04 * bw - 4, box[1] * H - 0.25 * bh, box[2] * W + 0.04 * bw + 4, box[3] * H + 2] : null,
        impact: t >= IMPACT_FRAME.t[0] && t < IMPACT_FRAME.t[1] ? [0.5, 0.5, 1] : null,
        sfx: t >= SFX.t[0] && t < SFX.t[1] ? { text: SFX.text, age: t - SFX.t[0] } : null,
        pill: t >= PILL.t[0] && t < PILL.t[1] ? { text: PILL.text, age: t - PILL.t[0] } : null,
        credit: t >= CREDIT.t[0] && t < CREDIT.t[1] ? { title: CREDIT.title, sub: CREDIT.sub, age: t - CREDIT.t[0] } : null,
      });
    },
    dispose() {
      mana.dispose();
      hits.dispose();
      swap.dispose();
      letters.dispose();
      light.dispose();
      comic?.dispose();
    },
  };
}
