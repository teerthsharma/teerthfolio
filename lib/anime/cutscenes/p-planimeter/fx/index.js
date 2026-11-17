// FX for p-planimeter: the screen-held planes (banner, glint, chessboard, CHECKMATE., the amber wipe), each hit as a panel, the things that break,
// and the comic-print layer (page.js) with the live balloons, the CHECK lettering, the impact frames and the credit card. Times follow clock.js.
import { Group, Vector3 } from "three";
import { BACK, ENTER, R, TAILS, W as rigToWorld, beatT } from "../clock.js";
import { buildBreak } from "./break.js";
import { buildHits, panelOn } from "./hits.js";
import { Comic, TEXT, comicFace } from "./page.js";
import { buildScreen } from "./screen.js";

const SFX0 = 3.868;
const FLASH = 1 / 6;

export default function build(ctx) {
  const group = new Group(), V = new Vector3();
  let screen;
  comicFace(() => screen?.refont());
  screen = buildScreen(ctx);
  const hits = buildHits(ctx), breaks = buildBreak(ctx);
  group.add(screen.group, hits.group, breaks.group);
  let comic = null;

  const place = (p, W, H, fb) => {
    const c = ctx.player?.camera;
    if (!c) return fb;
    if (Array.isArray(p)) V.set(p[0], p[1], p[2]); else V.copy(p);
    V.project(c);
    return V.z > 1 ? fb : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H];
  };

  return {
    group,
    update(t, dt, cue) {
      const S = beatT(t), cam = ctx.player?.camera;
      screen.step(t, S, cam);
      hits.update(t, cue);
      breaks.update(t, cue);

      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720, box = ctx.player?.box;
      const fb = [0.6 * W, 0.4 * H], tail = place(rigToWorld(TAILS.chab), W, H, fb);
      const chest = ctx.seal.chest(new Vector3());
      const speaker = t >= ENTER && t < BACK ? place(chest.add(new Vector3(0, 0.4, 0)), W, H, fb) : place(rigToWorld([0, 0.5, 0]), W, H, fb);
      const burst = { ...TEXT.b, text: W <= 600 ? TEXT.b.short : TEXT.b.text };

      const lines = [];
      if (t >= R.lineA && t < R.lineAoff) lines.push({ slot: "a", ...TEXT.a, age: t - R.lineA, at: tail });
      if (t >= R.lineB && t < R.lineC) lines.push({ slot: "b", ...burst, age: t - R.lineB, at: speaker });
      if (t >= R.lineC && t < R.credit) lines.push({ slot: "c", ...TEXT.c, age: t - R.lineC, at: tail });
      if (panelOn(t)) lines.length = 0;

      const bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      const avoid = box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, box[3] * H + 2] : null;
      const flash = (t >= R.impact && t < R.impact + FLASH) || (t >= R.collapse[0] && t < R.collapse[0] + FLASH);

      comic.frame({
        warm: [{ slot: "b", ...burst, age: 1, at: [0.6 * W, 0.4 * H] }],
        card: TEXT.credit,
        lines,
        avoid,
        impact: flash ? [0.5, 0.55, 1] : null,
        sfx: t >= SFX0 && t < R.enter ? { text: TEXT.sfx, age: t - SFX0 } : null,
        credit: t >= R.credit && t < R.collapse[0] ? { ...TEXT.credit, age: t - R.credit } : null,
      });
    },
    dispose() {
      screen.dispose();
      hits.dispose();
      breaks.dispose();
      comic?.dispose();
    },
  };
}
