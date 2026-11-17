// FX for pr-topograph-432: the hits (hits.js), the eye flare and the return star (poof.js), the black gutters of the hall's cuts (a veil), and the
// comic page in DOM (page.js): the impact frame, DOOM, the caption, the panel frame, the balloons and the credit card. The lettering is the page's.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { makeHits } from "./hits.js";
import { makePoof } from "./poof.js";
import { CARD, Page, TEXT } from "./page.js";
import { T } from "../clock.js";
import { toned } from "../tone.js";

const INK = toned("#05020a"), CUTS = [2.9, 4.4, 7.4, 8.5, 12.2, 15.3], V = new Vector3();

export default function build(ctx) {
  const group = new Group(), hits = makeHits(ctx), poof = makePoof(ctx);
  const veil = makeCel(ctx.engine, {
    max: 4, order: 1250,
    draw(B, ts, A) {
      if (ts >= T.impact && ts < T.turn) B.rect(0, 0, A, 1, INK);
      for (const c of CUTS) if (ts >= c - T.gutter / 2 && ts < c + T.gutter / 2) B.rect(0, 0, A, 1, INK);
    },
  });
  group.add(hits.group, veil.group, poof.group);
  const host = () => ctx.engine.renderer.domElement.parentElement;
  // a point at height dy above the seal's chest, as frame fractions (x right, y down)
  const chestAt = (dy) => {
    const p = ctx.seal.chest(V); p.y += dy;
    const c = ctx.player?.camera; if (!c) return [0.5, 0.5];
    p.project(c); return [p.x * 0.5 + 0.5, 0.5 - p.y * 0.5];
  };
  let page = null;
  return {
    group,
    update(t, dt, cue) {
      hits.update(t, dt, cue); poof.update(t, dt, cue); veil.update(t, cue);
      const el = host(); if (!el) return;
      page ??= new Page(el);
      const W = el.clientWidth || 1280, H = el.clientHeight || 720, panelUp = (cue?.active ?? []).some((b) => b.name === "panel");
      const lines = [];
      if (!panelUp) { // no balloon over a panel frame; the lines sit in the lower half (the page places them)
        const m = chestAt(0.2);
        if (t >= T.lineA[0] && t < T.lineA[1]) lines.push({ slot: "a", ...TEXT.a, age: t - T.lineA[0], left: 0.55, at: [m[0] * W, m[1] * H] });
        if (t >= T.lineB[0] && t < T.lineB[1]) lines.push({ slot: "b", ...TEXT.b, age: t - T.lineB[0], left: 0.7, at: [0.7 * W, 0.8 * H] });
        if (t >= T.lineC[0] && t < T.lineC[1]) lines.push({ slot: "c", ...TEXT.c, age: t - T.lineC[0], left: 0.3, at: [0.5 * W, 0.8 * H] });
      }
      const impact = t >= T.impact && t < T.impactEnd ? [...chestAt(0), t - T.impact < 1 / 12 ? 1 : 1.06] : null;
      const sfx = t >= T.doom[0] && t < T.doom[1] ? { text: "DOOM", age: t - T.doom[0] } : null;
      const card = t >= T.credit[0] && t < T.credit[1] ? { ...CARD, age: t - T.credit[0] } : null;
      const b = ctx.player?.box, avoid = b ? [b[0] * W, b[1] * H, b[2] * W, b[3] * H] : null;
      page.frame({ frame: t >= T.turn && t < T.back, caption: t >= 1.3 && t < T.back + 0.3, speed: Math.floor(t * 6) % 2, impact, sfx, lines, card, avoid });
    },
    dispose() { hits.dispose(); poof.dispose(); veil.dispose(); page?.dispose(); },
  };
}
