// FX layer for home (Vinland Saga, "You have no enemies"): the comic-print layer with balloons A, B and C and the credit card on the live
// clock (page.js), the banner (banner.js), the pigment events (events.js) and the return veil. Flat to the lens: nothing shakes or flashes.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { DOCK, LINE, TEXT, THORS_MOUTH, smooth } from "../clock.js";
import { PAPER, toned } from "../tone.js";
import { Comic } from "./page.js";
import { mountBanner } from "./banner.js";
import { buildEvents } from "./events.js";

const AT = new Vector3(...DOCK), THORS = new Vector3(...THORS_MOUTH).add(AT);
const LINES = { a: TEXT.A, b: TEXT.B, c: TEXT.C };
// each balloon's window on the live clock: A ends 0.35 s before B
const WIN = { a: [LINE.A, 12.45], b: [LINE.B, 18.4], c: [LINE.C, 24.6] };
const PAPER_C = toned(PAPER);

export default function build(ctx) {
  const group = new Group(), V = new Vector3();
  let events = null;
  try { events = buildEvents(ctx); group.add(...events.groups); } catch (e) { console.warn("[home/fx] events muted:", e); }
  const banner = mountBanner();
  const veil = makeCel(ctx.engine, { max: 4, order: 1250, draw(B, ts, A) {
    if (ts < LINE.collapse[0]) return;
    const a = 0.97 * (1 - smooth(LINE.collapse[0], 30.2, ts));
    if (a > 0.003) B.rect(0, 0, A, 1, PAPER_C, a);
  } });
  group.add(veil.group);
  let comic = null;
  const px = (p, W, H) => {
    const c = ctx.player?.camera;
    if (!c) return null;
    V.copy(p).project(c);
    return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H];
  };
  return {
    group,
    update(t, dt, cue) {
      events?.update(t, cue);
      veil.update(t, cue);
      if (t < LINE.collapse[0]) banner.set(t, false); else banner.hide();
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720;
      const mouthP = ctx.seal.named?.()?.mouth, box = ctx.player?.box;
      const mouth = (mouthP && px(mouthP, W, H)) || [0.6 * W, 0.4 * H], thors = px(THORS, W, H) || [0.3 * W, 0.4 * H];
      const lines = [];
      for (const slot of ["a", "b", "c"]) {
        const [t0, t1] = WIN[slot];
        if (t >= t0 && t < t1) lines.push({ slot, ...LINES[slot], age: t - t0, at: slot === "a" ? thors : mouth });
      }
      const bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      comic.frame({
        warm: [{ slot: "b", ...LINES.b, age: 1, at: mouth }],
        card: TEXT.credit,
        lines,
        avoid: box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, box[3] * H + 2] : null,
        credit: t >= LINE.credit && t < LINE.collapse[0] ? { ...TEXT.credit, age: t - LINE.credit } : null,
      });
    },
    dispose() { events?.dispose(); veil.dispose(); banner.dispose(); comic?.dispose(); },
  };
}
