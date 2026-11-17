// FX for pr-polychrom-79: the comic balloons and credit card (page.js, DOM over the canvas) on the raw clock, the hits layer, the stage panes, the shards and the lettering.
// Balloons stay up through the hits (the live has no panels); only a full-frame plate hides them. Line C keeps its lower-left anchor from the return to the credit.
import { Group, Vector3 } from "three";
import { LINE, TEXT } from "../clock.js";
import { buildHits } from "./hits.js";
import { buildPanes } from "./panes.js";
import { buildShards } from "./shards.js";
import { Comic } from "./page.js";
import { buildWord, placeWord } from "./word.js";

export default function build(ctx) {
  const group = new Group(), V = new Vector3(), hits = buildHits(ctx), panes = buildPanes(ctx), shards = buildShards(ctx), word = buildWord("Enuma Elish!");
  group.add(hits.group, shards.mesh, panes.group, word.mesh);
  const px = (p, W, H) => { const c = ctx.player?.camera; if (!c) return null; V.copy(p).project(c); return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H]; };
  const feet = new Vector3(), mouth = new Vector3();
  let comic = null;
  return {
    group,
    update(t, dt, cue) {
      hits.update(t, cue);
      panes.update(t, cue);
      shards.update(t, ctx.player?.camera);
      const box = ctx.player?.box ?? null, A = ctx.aspect();
      const p = placeWord(t, A, box);
      word.mesh.visible = !!p;
      if (p) word.uAt.value.set(p.cx, p.cy, p.hw, p.hh);

      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720;
      const seal = ctx.seal.named?.();
      const ground = px(feet.set(ctx.seal.at[0] + 1.1, ctx.seal.at[1], ctx.seal.at[2] + 0.2), W, H) ?? [0.6 * W, 0.8 * H];
      const say = (seal?.mouth && px(mouth.copy(seal.mouth), W, H)) || ground;
      const quiet = hits.plateUp(t), tr = cue?.t ?? t;
      const lines = [];
      const line = (slot, key, t0, aim, tail) => lines.push({ slot, ...TEXT[key], age: tr - t0, at: aim, tail });
      if (!quiet) {
        if (tr >= LINE.A && tr < LINE.B) line("a", "A", LINE.A, ground, "ur");
        else if (tr >= LINE.B && tr < LINE.C) line("b", "B", LINE.B, say, "ul");
        if (tr >= LINE.C && tr < LINE.credit) line("c", "C", LINE.C, say, "ul");
      }
      const bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      comic.frame({
        lines,
        warm: [{ slot: "b", ...TEXT.B, age: 1, at: [0.6 * W, 0.4 * H] }, { slot: "c", ...TEXT.C, age: 1, at: [0.6 * W, 0.4 * H] }],
        card: TEXT.credit,
        avoid: box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, (box[1] + 0.45 * (box[3] - box[1])) * H] : null,
        credit: t >= LINE.credit && t < LINE.collapse[1] ? { ...TEXT.credit, age: t - LINE.credit, fold: Math.min(1, Math.max(0, (t - LINE.collapse[0]) / (LINE.collapse[1] - LINE.collapse[0]))) } : null,
      });
    },
    dispose() { hits.dispose(); panes.dispose(); shards.dispose(); word.dispose(); comic?.dispose?.(); },
  };
}
