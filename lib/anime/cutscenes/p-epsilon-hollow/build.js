// BUILD for p-epsilon-hollow: the three layers. Every program links once into a 4x4 target as the real draws go, at build and on the first update.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  const comp = composeLayers(ctx, { world, cast, fx });
  let warm = false;
  const warmUp = () => {
    try {
      const hid = [];
      comp.group.traverse((o) => { if (!o.visible) { hid.push(o); o.visible = true; } });
      const R = ctx.engine.renderer, cam = ctx.player.camera, mask = cam.layers.mask, prev = R.getRenderTarget(), rt = new ctx.THREE.WebGLRenderTarget(4, 4);
      cam.layers.enableAll(); R.setRenderTarget(rt);
      R.compile(ctx.root, cam);
      R.setRenderTarget(prev); rt.dispose(); cam.layers.mask = mask;
      for (const o of hid) o.visible = false;
    } catch (e) { console.warn("[p-epsilon-hollow] warm-up skipped", e); }
    return true;
  };
  ctx.root.add(comp.group);
  warmUp();
  return { ...comp, update(t, dt, cue) { if (!warm) warm = warmUp(); comp.update(t, dt, cue); } };
}
