// BUILD for the-loop: the three layers, composed at the dock. Every program is linked once at build, into a render target,
// so the first impact does not stall on a shader link (a program keyed for the screen would not be reused).
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";
import { DOCK } from "./clock.js";

export default function build(ctx) {
  const comp = composeLayers(ctx, { world, cast, fx });
  comp.group.position.set(DOCK[0], 0, DOCK[2]); // y stays 0: the island's heights are absolute and the seal and pup stand at y 0
  let warm = false;
  const warmUp = () => {
    try {
      const hid = []; comp.group.traverse((o) => { if (!o.visible) { hid.push(o); o.visible = true; } });
      const R = ctx.engine.renderer, cam = ctx.player.camera, mask = cam.layers.mask, prev = R.getRenderTarget(), rt = new ctx.THREE.WebGLRenderTarget(4, 4);
      cam.layers.enableAll(); R.setRenderTarget(rt);
      R.compile(ctx.root, cam);
      R.setRenderTarget(prev); rt.dispose(); cam.layers.mask = mask;
      for (const o of hid) o.visible = false;
    } catch (e) { console.warn("[the-loop] warm-up skipped", e); }
    return true;
  };
  ctx.root.add(comp.group); warmUp();
  return { ...comp, update(t, dt, cue) { if (!warm) warm = warmUp(); comp.update(t, dt, cue); } };
}
