// FX for pr-tensorflow-124410: balloons and the MUDA sticker (page.js), the hit panels, lettering, overlays and the flash veil. Words come from clock.js TEXT.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { HIT, LINE, STICKER, SWAP, TEXT, VEIL } from "../clock.js";
import { toned } from "../tone.js";
import { makeHits } from "./hits.js";
import { makeLetters } from "./lettering.js";
import { makeOverlays } from "./overlays.js";
import { makeClockCut } from "./clockcut.js";
import { makeCollapse } from "./collapse.js";
import { Comic } from "./page.js";

const FLASH = [HIT.rival, HIT.stop, HIT.resume, HIT.tick];
const CREAM = toned("#fff0d8"), PILL = "4 edges to 3";
const BUB = { a: { kind: "oval", text: TEXT.A, bold: TEXT.Ab }, b: { kind: "burst", text: TEXT.B, bold: TEXT.Bb } };
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export default function build(ctx) {
  const group = new Group(), V = new Vector3();
  const hits = makeHits(ctx), letters = makeLetters(ctx), overlays = makeOverlays(ctx), clock = makeClockCut(ctx), collapse = makeCollapse(ctx);
  const veil = makeCel(ctx.engine, {
    max: 4, order: 1250,
    draw(B, ts, A) {
      for (const f of FLASH) {
        const x = ts - f;
        if (x >= 0 && x < 1 / 24) B.rect(0, 0, A, 1, CREAM, VEIL[0]);
        else if (x >= 1 / 24 && x < 2 / 24) B.rect(0, 0, A, 1, CREAM, VEIL[1]);
      }
    },
  });
  group.add(hits.group, letters.group, overlays.group, clock.group, collapse.group, veil.group);
  let comic = null;
  const at = (p, W, H) => {
    const c = ctx.player?.camera;
    if (!c) return null;
    V.set(p[0], p[1], p[2]).applyMatrix4(group.matrixWorld).project(c);
    return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H];
  };
  // a world point (the pale pup's head, from cast) on screen; line B and the pill are placed on it
  const scr = (p, W, H) => {
    const c = ctx.player?.camera;
    if (!c || !p) return null;
    V.set(p[0], p[1], p[2]).project(c);
    return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H];
  };
  const headAt = (W, H) => { const p = scr(ctx.cutCast?.pupHead?.(), W, H); return p && [clamp(p[0], 0.12 * W, 0.88 * W), clamp(p[1], 0.35 * H, 0.62 * H)]; };
  const tail = (W, H) => {
    const m = ctx.seal.named?.()?.mouth, c = ctx.player?.camera;
    if (m && c) { V.copy(m).project(c); if (V.z <= 1) return [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H]; }
    return at([0, 1.2, 0], W, H) ?? [0.6 * W, 0.4 * H];
  };

  return {
    group,
    update(t, dt, cue) {
      group.updateWorldMatrix(true, false);
      hits.update(t, cue); letters.update(t, cue); overlays.update(t, cue); clock.update(t); collapse.update(t); veil.update(t, cue);
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720, box = ctx.player?.box, lines = [];
      if (t >= LINE.A && t < SWAP) lines.push({ slot: "a", ...BUB.a, age: t - LINE.A, at: tail(W, H) });
      else if (t >= LINE.B && t < LINE.credit) lines.push({ slot: "b", ...BUB.b, age: t - LINE.B, at: headAt(W, H) ?? [0.6 * W, 0.4 * H] });
      const bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      const hp = t < LINE.impact ? scr(ctx.cutCast?.pupHead?.(), W, H) : null;
      comic.frame({
        warm: [{ slot: "a", ...BUB.a, age: 1, at: [0.6 * W, 0.4 * H] }, { slot: "b", ...BUB.b, age: 1, at: [0.6 * W, 0.4 * H] }],
        card: { title: TEXT.title, sub: TEXT.sub, ret: TEXT.ret, age: 1 },
        lines,
        pill: hp ? { age: t, text: PILL, at: [hp[0], hp[1] - 0.09 * H] } : null,
        avoid: box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, box[3] * H + 2] : null,
        sfx: t >= STICKER[0] && t < STICKER[1] ? { text: TEXT.sticker, age: t - STICKER[0] } : null,
        credit: t >= LINE.credit && t < LINE.collapse[0] ? { title: TEXT.title, sub: TEXT.sub, ret: TEXT.ret, age: t - LINE.credit } : null,
      });
    },
    dispose() { hits.dispose(); letters.dispose(); overlays.dispose(); clock.dispose(); collapse.dispose(); veil.dispose(); comic?.dispose(); },
  };
}
