// BUILD for pr-topograph-432: the three layers. The page, the hall, Ainz and the star are hidden when it opens, so every program is linked
// once first, into a render target as the real draws go (a program keyed for the screen would not be reused).
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";
import { DOCK } from "./clock.js";

export default function build(ctx) {
  const comp = composeLayers(ctx, { world, cast, fx });
  comp.group.position.set(...DOCK); // the layers are built in the rig frame (the dock at the origin) and stand at the site's dock
  let warm = false;
  const warmUp = () => {
    try {
      const hid = []; comp.group.traverse((o) => { if (!o.visible) { hid.push(o); o.visible = true; } });
      const R = ctx.engine.renderer, cam = ctx.player.camera, mask = cam.layers.mask, prev = R.getRenderTarget(), rt = new ctx.THREE.WebGLRenderTarget(4, 4);
      cam.layers.enableAll(); R.setRenderTarget(rt);
      R.compile(ctx.root, cam);
      R.setRenderTarget(prev); rt.dispose(); cam.layers.mask = mask;
      for (const o of hid) o.visible = false;
    } catch (e) { console.warn("[pr-topograph-432] warm-up skipped", e); }
    return true;
  };
  ctx.root.add(comp.group); warmUp(); // linking starts at the build: a mount that builds ahead of its clock has the page's programs by the impact
  return { ...comp, update(t, dt, cue) { if (!warm) warm = warmUp(); comp.update(t, dt, cue); } };
}
