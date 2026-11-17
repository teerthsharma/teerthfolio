// BUILD for p-monodromy: the three layers in the dock's place, the gold sun of the live move, and every program linked once before play.
// The hidden objects (the island, Sindria, the character, the pup) are shown into a 4 x 4 target at build and on the first step, so no
// shader links during playback. The rim and the light are restored on dispose.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";
import { DOCK } from "./clock.js";

export default function build(ctx) {
  const comp = composeLayers(ctx, { world, cast, fx });
  comp.group.position.set(...DOCK);
  const light = ctx.engine.shared.uLightDir.value, prevLight = light.clone();
  light.set(-0.55, 0.58, 0.6).normalize();
  let warm = false;
  const warmUp = () => {
    try {
      const hid = [];
      for (const root of [comp.group, ctx.seal.group]) root.traverse((o) => { if (!o.visible) { hid.push(o); o.visible = true; } });
      const R = ctx.engine.renderer, cam = ctx.player.camera, mask = cam.layers.mask, prev = R.getRenderTarget(), rt = new ctx.THREE.WebGLRenderTarget(4, 4);
      cam.layers.enableAll(); R.setRenderTarget(rt);
      R.compile(ctx.root, cam);
      R.setRenderTarget(prev); rt.dispose(); cam.layers.mask = mask;
      for (const o of hid) o.visible = false;
    } catch (e) { console.warn("[p-monodromy] warm-up skipped", e); }
    return true;
  };
  ctx.root.add(comp.group);
  warmUp();
  return {
    group: comp.group,
    errors: comp.errors,
    update(t, dt, cue) { if (!warm) warm = warmUp(); comp.update(t, dt, cue); },
    dispose() { comp.dispose(); light.copy(prevLight); },
  };
}
