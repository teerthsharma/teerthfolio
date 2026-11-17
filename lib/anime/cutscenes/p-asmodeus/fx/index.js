// FX layer for p-asmodeus: the kill (kill.js), the red eye flare as the fear motes land (tier 2 and up), and the growth sparks at the three horn drawings. Each cel is hidden outside its window, so it costs no draw calls the rest of the time.
import { AdditiveBlending, Group, Vector3 } from "three";
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import { bandOf } from "../cams.js";
import { kOf, moteQ } from "../clock.js";
import { layout } from "../layout.js";
import { makeKill } from "./kill.js";

const GROW = [78, 84, 90].map((f) => f / 12), SPARK_LIFE = 0.25;
const FLARE = "#ff4a5a", SPARK = "#ff2a3a";
const V = new Vector3();
const diamond = (x, y, s) => [[x, y - s * 1.6], [x + s, y], [x, y + s * 1.6], [x - s, y]];
const growing = (t) => GROW.some((g) => t - g >= 0 && t - g < SPARK_LIFE);

export default function build(ctx) {
  const group = new Group(), kill = makeKill(ctx), rnd = ctx.rng(47);
  const specks = GROW.map(() => Array.from({ length: 18 }, () => ({ dx: (rnd() - 0.5) * 0.5, y0: rnd(), up: 0.3 + 0.5 * rnd(), sz: 0.004 + 0.002 * rnd() })));

  const flare = makeCel(ctx.engine, {
    max: 40, order: 1220, behind: false,
    draw(B, ts, A) {
      if (!ctx.atTier(2) || ts < 5.5 || ts >= 10.5) return;
      const n = ctx.seal.named?.(), cam = ctx.player?.camera;
      if (!n?.eyeR || !cam) return;
      const a = 0.8 * moteQ(ts);
      for (const e of [n.eyeR, n.eyeL]) {
        V.copy(e).project(cam);
        if (V.z > 1) continue;
        const x = (V.x * 0.5 + 0.5) * A, y = 0.5 - V.y * 0.5, ring = [];
        for (let i = 0; i < 16; i++) { const an = (i / 16) * Math.PI * 2; ring.push([x + Math.cos(an) * 0.012, y + Math.sin(an) * 0.012]); }
        B.fan(x, y, ring, rgb(FLARE), a);
      }
    },
  });
  flare.mesh.material.blending = AdditiveBlending;

  const sparks = makeCel(ctx.engine, {
    max: 400, order: 1215, behind: false,
    draw(B, ts, A) {
      if (!ctx.atTier(2)) return;
      const r = layout(ts).hero, { bar, h } = bandOf(A);
      const cx = r.u * A, feet = bar + r.v * h, bodyH = r.hh * h;
      GROW.forEach((g, gi) => {
        const age = ts - g;
        if (age < 0 || age >= SPARK_LIFE) return;
        for (const s of specks[gi]) {
          const x = cx + s.dx * r.hh, y = feet - s.y0 * bodyH - s.up * age;
          B.fan(x, y, diamond(x, y, s.sz), rgb(SPARK));
        }
      });
    },
  });

  group.add(kill.group, flare.group, sparks.group);
  return {
    group,
    update(t, dt, cue) {
      const onKill = kOf(t) >= 0, onFlare = ctx.atTier(2) && t >= 5.5 && t < 10.5, onSpark = ctx.atTier(2) && growing(t);
      kill.group.visible = onKill;
      flare.group.visible = onFlare;
      sparks.group.visible = onSpark;
      if (onKill) kill.update(t, cue, layout(t));
      if (onFlare) flare.update(t, cue);
      if (onSpark) sparks.update(t, cue);
    },
    dispose() { kill.dispose(); flare.dispose(); sparks.dispose(); },
  };
}
