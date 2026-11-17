// BUILD for pr-highway-3244: the three layers, built in the rig frame (the dock at the origin, the pup facing +z) and stood at the site's dock point.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";
import { DOCK, TURN } from "./clock.js";

export default function build(ctx) {
  const comp = composeLayers(ctx, { world, cast, fx });
  comp.group.position.set(...DOCK);
  comp.group.rotation.y = TURN;
  let warm = false;
  const warmUp = () => {
    try {
      const hid = []; comp.group.traverse((o) => { if (!o.visible) { hid.push(o); o.visible = true; } });
      const R = ctx.engine.renderer, cam = ctx.player.camera, mask = cam.layers.mask, prev = R.getRenderTarget(), rt = new ctx.THREE.WebGLRenderTarget(4, 4);
      cam.layers.enableAll(); R.setRenderTarget(rt);
      R.compile(ctx.root, cam);
      R.setRenderTarget(prev); rt.dispose(); cam.layers.mask = mask;
      for (const o of hid) o.visible = false;
    } catch (e) { console.warn("[pr-highway-3244] warm-up skipped", e); }
    return true;
  };
  ctx.root.add(comp.group); warmUp();
  return { ...comp, update(t, dt, cue) { if (!warm) warm = warmUp(); comp.update(t, dt, cue); } };
}
