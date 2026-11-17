// FX for p-separatrix: the impact panels and the return poof, the breaking plaster, the foreground ruins and the step glow, and the comic-print layer (balloons, credit card).
import { Group, Vector3 } from "three";
import buildPanels from "./panels.js";
import buildBreaks from "./breaks.js";
import buildNear from "./near.js";
import { Comic } from "./balloons.js";
import { DOCK, PT } from "../clock.js";

const V = new Vector3();
const world = (p) => [p[0] + DOCK[0], p[1] + DOCK[1], p[2] + DOCK[2]];
const MOUTH = [PT.dv[0], PT.dv[1] + 1.8, PT.dv[2]];

export default function build(ctx) {
  const parts = [buildPanels(ctx), buildBreaks(ctx), buildNear(ctx)];
  const group = new Group();
  for (const p of parts) group.add(p.group);
  let comic = null;
  const px = (w, W, H) => {
    const cam = ctx.player?.camera;
    if (!cam || !w) return null;
    V.set(w[0], w[1], w[2]).project(cam);
    return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H];
  };
  return {
    group,
    update(t, dt, cue) {
      for (const p of parts) p.update(t, dt, cue);
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const W = host.clientWidth || 1280, H = host.clientHeight || 720, box = ctx.player?.box;
      comic.frame(t, {
        anchors: { a: px(world(MOUTH), W, H), b: px(ctx.seal.anchors()[1], W, H), c: px(world(PT.dv), W, H) },
        avoid: box ? [box[0] * W, box[1] * H, box[2] * W, box[3] * H] : null,
        hidden: !!cue?.on?.("panel") || !!cue?.shot?.data?.quiet,
      });
    },
    dispose() { for (const p of parts) p.dispose(); comic?.dispose(); },
  };
}
