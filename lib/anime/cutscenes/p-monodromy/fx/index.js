// The fx layer of p-monodromy: the sky, the hits, the shards and the comic page, each built once and updated every step.
// The balloon text is the owner's (LIVE.md section 4) and the ZZAAP lettering is the card's stage sfx; nothing else is written here.
import { Group, Vector3 } from "three";
import { HIT, LINES, R } from "../clock.js";
import { Comic } from "./page.js";
import makeSky from "./sky.js";
import makeHits from "./hits.js";
import makeShards from "./shards.js";

const TEXT = {
  ja: { kind: "oval", text: "My king, you can't fire that inside a portfolio!", bold: ["inside a portfolio"] },
  a: { kind: "oval", text: "Relax. The loop closes. It always closes below.", bold: ["always closes below"] },
  b: { kind: "burst", text: "...Oops. Wrong dimension. Hold on.", bold: ["Wrong dimension"] },
  c: { kind: "burst", text: "Can it be undone? Topology answers: it closed below, not above. 5 dependencies, torch not required.", bold: ["closed below, not above", "5 dependencies"] },
};
const CREDIT = {
  title: "teerthsharma/monodromy · 5 dependencies · torch not required",
  sub: "No Jacobian required: the loop closes below, not above.",
  ret: "The crack closes the loop: the seal steps back out exactly where it left.",
};
const ZAP = [1.58, 2.3];

// the frame's shudder (px): the strike and the lens crack each knock it for about 0.6 s
const shudder = (t) => {
  let dx = 0, dy = 0;
  for (const [t0, amp] of [[HIT.strike, 1], [HIT.crack, 0.8]]) {
    const a = t - t0;
    if (a < 0 || a > 0.6) continue;
    const e = amp * Math.exp(-a / 0.12);
    dx += e * Math.cos(2 * Math.PI * 14 * a) * 7; dy += e * Math.sin(2 * Math.PI * 11 * a) * 7;
  }
  return [dx, dy];
};
const fieldAt = (t) => (t >= R.field[0] && t < R.field[1] ? { k: (t - R.field[0]) / (R.field[1] - R.field[0]) }
  : t >= R.collapse[0] && t < R.collapse[1] ? { k: (t - R.collapse[0]) / (R.collapse[1] - R.collapse[0]) } : null);
const asV = (p) => (p && Array.isArray(p) ? new Vector3(...p) : p ?? null);

export default function build(ctx) {
  const group = new Group(), V = new Vector3();
  const sky = makeSky(ctx), hits = makeHits(ctx), shards = makeShards(ctx, group);
  group.add(sky.group, hits.group, shards.group);
  let comic = null;
  const px = (p, W, H) => {
    const c = ctx.player?.camera, v = asV(p);
    if (!c || !v) return null;
    V.copy(v).project(c);
    return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H];
  };

  return {
    group,
    update(t, dt, cue) {
      sky.update(t, cue);
      hits.update(t, cue);
      shards.update(t, cue);
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720, box = ctx.player?.box;
      const mouth = px(ctx.seal.named?.()?.mouth ?? ctx.seal.chest(new Vector3()), W, H) ?? [0.6 * W, 0.4 * H];
      const head = px(ctx.seal.group?.userData?.jaHead, W, H) ?? [0.8 * W, 0.4 * H];
      const lines = [];
      if (t >= LINES.ja[0] && t < LINES.ja[1]) lines.push({ slot: "ja", ...TEXT.ja, age: t - LINES.ja[0], at: head });
      else if (t >= LINES.A && t < LINES.B) lines.push({ slot: "a", ...TEXT.a, age: t - LINES.A, at: mouth });
      else if (t >= LINES.B && t < LINES.C) lines.push({ slot: "b", ...TEXT.b, age: t - LINES.B, at: mouth });
      else if (t >= LINES.C && t < LINES.credit) lines.push({ slot: "c", ...TEXT.c, age: t - LINES.C, at: mouth });
      comic.frame({
        lines,
        avoid: box ? [box[0] * W, box[1] * H, box[2] * W, box[3] * H] : null,
        warm: Object.entries(TEXT).map(([slot, v]) => ({ slot, ...v, age: 1, at: [0.6 * W, 0.4 * H] })),
        card: CREDIT,
        credit: t >= LINES.credit && t < LINES.collapse ? { ...CREDIT, age: t - LINES.credit } : null,
        sfx: t >= ZAP[0] && t < ZAP[1] ? { text: "ZZAAP", age: t - ZAP[0] } : null,
        field: fieldAt(t),
        frame: { on: t >= R.frameOn && t < R.fall, shudder: shudder(t) },
      });
    },
    dispose() {
      sky.dispose();
      hits.dispose();
      shards.dispose();
      comic?.dispose();
    },
  };
}
