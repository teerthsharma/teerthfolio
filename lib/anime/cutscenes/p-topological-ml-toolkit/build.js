// BUILD for p-topological-ml-toolkit: the three layers at the dock; hidden objects are drawn once at build so every program is linked before frame 0.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";
import { BACK, DOCK } from "./clock.js";

const BOX_OFF = BACK + 6 / 24;
const seeBox = (c) => Object.create(c, { player: { value: Object.create(c.player, { box: { get: () => (c.player.cue.t >= BOX_OFF ? null : c.player.box) } }) } });

export default function build(ctx) {
  const comp = composeLayers(ctx, { world, cast, fx: (c) => fx(seeBox(c)) });
  comp.group.position.set(...DOCK);
  let warm = false;
  const warmUp = () => {
    try {
      const hid = [];
      comp.group.traverse((o) => { if (!o.visible) { hid.push(o); o.visible = true; } });
      const R = ctx.engine.renderer, cam = ctx.player.camera, mask = cam.layers.mask, prev = R.getRenderTarget(), rt = new ctx.THREE.WebGLRenderTarget(4, 4);
      cam.layers.enableAll();
      R.setRenderTarget(rt);
      R.compile(ctx.root, cam);
      R.setRenderTarget(prev);
      rt.dispose();
      cam.layers.mask = mask;
      for (const o of hid) o.visible = false;
    } catch (e) { console.warn("[p-topological-ml-toolkit] warm-up skipped", e); }
    return true;
  };
  ctx.root.add(comp.group);
  warmUp();
  return { ...comp, update(t, dt, cue) { if (!warm) warm = warmUp(); comp.update(t, dt, cue); } };
}
