// BUILD AHEAD: the landscape's geometry and shader programs are made while the seal walks (idle, once the
// canvas exists), so the first frames of the scene never stall. The Move takes the prebuilt world, or builds one
// if it has to; whichever it takes, the Move disposes on exit.

import { Scene } from "three";
import { APPROVED } from "../../../../../lib/world/cutscene/timeline";
import { buildWorld } from "./world";

let PRE = null;

export const takeWorld = () => {
  const w = PRE ?? buildWorld();
  PRE = null;
  return w;
};

export function prewarm() {
  if (typeof window === "undefined" || !APPROVED.has("p-faraday")) return;
  let tries = 0;
  const go = () => {
    const W = window.__world;
    if (!W?.gl || !W.camera) {
      if (tries++ < 90) setTimeout(go, 1000);
      return;
    }
    const idle = window.requestIdleCallback ?? ((f) => setTimeout(f, 60));
    idle(async () => {
      if (PRE || tries < 0) return;
      const w = buildWorld();
      PRE = w;
      const sc = new Scene();
      sc.add(w.bg);
      const hidden = [w.coin, w.fields.sheath, w.fields.beamCore];
      for (const o of hidden) o.visible = true;
      try {
        if (W.gl.compileAsync) await W.gl.compileAsync(sc, W.camera);
        else W.gl.compile(sc, W.camera);
      } catch {
        /* a failed warm-up just means the first frame compiles them */
      }
      for (const o of hidden) o.visible = false;
      sc.remove(w.bg);
    });
  };
  setTimeout(go, 4000);
}
