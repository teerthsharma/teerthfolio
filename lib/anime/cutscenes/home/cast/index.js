// CAST for home: the pale playable pup opens the cutscene; at INTO the rig character (look home) takes its place and at BACK the pup
// comes back on screen. Every rig surface carries the watercolour print (wash.js); the poses and squashes follow the live clock.
import { BackSide, Group } from "three";
import { sitePup, halo } from "./pup.js";
import { WASH_U, printWash } from "./wash.js";
import { BACK, INTO, LINE, SEAL, T, smooth } from "../clock.js";

const ENTRY = [0.5, 1.16, 0.97], PUP_BACK = [0.6, 1.14, 1.14, 0.96, 0.96];
const plop = (t) => { const tau = t - T.plop; return tau >= 0 && tau <= 1.4 ? Math.exp(-5 * tau) * Math.cos(16 * tau) : 0; };
const squash = (g, s, k, e) => { const x = s * (1 + 0.5 * (1 - k)) * (1 + 0.12 * e); g.scale.set(x, s * k * (1 - 0.2 * e), x); };

export default function build(ctx) {
  const R = ctx.engine.renderer, S = SEAL.scale;
  const pup = sitePup({ yaw: SEAL.yaw, track: { sign: [0.45, 0.6, 0.3], blink: [4.8, LINE.B + 0.4, T.rain[0] + 0.5] } });
  const pupHalo = halo(), charHalo = halo(), seen = new Set();
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m) || m.side === BackSide) return;
    seen.add(m);
    printWash(m, WASH_U);
  });
  pup.head.add(pupHalo);
  ctx.seal.attach(charHalo, 1, "head");
  charHalo.position.set(0, 0.2, 0.02); charHalo.rotation.set(0, 0, 0);
  const group = new Group();
  group.add(pup.group);
  return {
    group,
    update(t) {
      const on = t >= INTO && t < BACK + 2 / 24, out = Math.floor((t - BACK) * 24 + 1e-6), into = Math.floor((t - INTO) * 12 + 1e-6);
      const sit = smooth(2.25, 2.6, t) * (1 - smooth(LINE.collapse[0], LINE.collapse[1], t));
      const bare = t >= T.run[1] + 0.05 && t < LINE.collapse[0];
      ctx.seal.group.visible = on; pup.group.visible = !on && !bare;
      pup.update(t, sit);
      squash(ctx.seal.group, S, ENTRY[into] ?? (out >= -4 && out < 0 ? 0.86 : 1), plop(t));
      squash(pup.group, 1, out >= 2 ? PUP_BACK[out - 2] ?? 1 : 1, plop(t));
      pupHalo.visible = charHalo.visible = (t >= 1.6 && t < T.run[1] - 0.2) || t >= LINE.collapse[0] + 0.1;
      WASH_U.uWashRun.value = smooth(T.run[0], T.run[1], t) * (1 - smooth(LINE.collapse[0], LINE.collapse[0] + 0.1, t));
      R.getDrawingBufferSize(WASH_U.uWashRes.value);
      WASH_U.uWashPx.value = R.getPixelRatio();
    },
    dispose() {
      pup.dispose();
      for (const h of [pupHalo, charHalo]) { h.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); h.removeFromParent(); }
      ctx.seal.group.visible = true;
    },
  };
}
