// BUILD for pr-polychrom-79: the three layers, stood at the dock and added to the root before the warm-up (the framework mounts the group only after build returns).
// Every program is linked once into a render target as the real draws go. The warm-up runs on the first update, once the player can seek: it draws the blast beam and the stage panes once each (19.45 and 22.1), then seeks back to 0.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";
import { DOCK } from "./clock.js";

const WARM_T = [19.45, 22.1];

export default function build(ctx) {
  const { THREE } = ctx;
  const L = composeLayers(ctx, { world, cast, fx });
  L.group.position.set(...DOCK);
  ctx.root.add(L.group);
  const warm = () => {
    if (!ctx.player?.camera) return false;
    try {
      for (const t of WARM_T) ctx.player.seek(t);
      ctx.player.seek(0);
      const hid = []; ctx.root.traverse((o) => { if (!o.visible) { hid.push(o); o.visible = true; } });
      const R = ctx.engine.renderer, cam = ctx.player.camera, mask = cam.layers.mask, prev = R.getRenderTarget(), rt = new THREE.WebGLRenderTarget(4, 4);
      cam.layers.enableAll(); R.setRenderTarget(rt);
      R.compile(ctx.root, cam);
      R.setRenderTarget(prev); rt.dispose(); cam.layers.mask = mask;
      for (const o of hid) o.visible = false;
    } catch (e) { console.warn("[pr-polychrom-79] precompile skipped:", e); }
    return true;
  };
  let warmed = false, busy = false;
  return {
    ...L,
    update(t, dt, cue) {
      if (!warmed && !busy) { busy = true; warmed = warm(); busy = false; }
      L.update(t, dt, cue);
    },
  };
}
