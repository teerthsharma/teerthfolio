// BUILD for p-nerve: the three layers. ctx.nerve is made before the cast and fx read it. Every program is linked at the build, into a
// render target, so a play from the first frame needs no shader link (the page's programs are the same ones the set uses).
import { Vector3 } from "three";
import { composeLayers } from "../framework.js";
import { DOCK } from "./clock.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  ctx.nerve = { tip: new Vector3(), cuff: new Vector3(), mouth: new Vector3(), mouthOpen: 0 };
  const comp = composeLayers(ctx, { world, cast, fx });
  comp.group.position.set(...DOCK); // the layers are built in the rig frame (the seal at the origin) and stand at the site's dock
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
    } catch (e) { console.warn("[p-nerve] warm-up skipped", e); }
    return true;
  };
  ctx.root.add(comp.group);
  warmUp();
  return { ...comp, update(t, dt, cue) { if (!warm) warm = warmUp(); comp.update(t, dt, cue); } };
}
