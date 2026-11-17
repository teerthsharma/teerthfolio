import { BoxGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, TorusGeometry } from "three";
import { getUi } from "../../../../../lib/world/store.js";
import { merge, part, R } from "./ink.js";
export const CLOCK = { x: -3.2, y: 17.5, z: -46, r: 8 };
export function clockGeometry() {
  const p = [];
  p.push(part(new CylinderGeometry(CLOCK.r, CLOCK.r, 0.4, 40).rotateX(Math.PI / 2), R.cream, { z: -0.25 }));
  p.push(part(new TorusGeometry(CLOCK.r + 0.15, 0.55, 6, 48), R.ink));
  p.push(part(new TorusGeometry(CLOCK.r - 1.1, 0.12, 4, 48), R.ink, { z: 0.05 }));
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const big = k % 3 === 0;
    p.push(part(new BoxGeometry(big ? 0.55 : 0.3, big ? 1.7 : 1.0, 0.3), R.ink, { x: Math.sin(a) * (CLOCK.r - 1.1 - (big ? 0.8 : 0.5)), y: Math.cos(a) * (CLOCK.r - 1.1 - (big ? 0.8 : 0.5)), z: 0.1, rz: -a }));
  }
  p.push(part(new CylinderGeometry(0.6, 0.6, 0.5, 12).rotateX(Math.PI / 2), R.coral, { z: 0.5 }));
  return merge(p);
}
export const handGeometry = (L, w, role) => merge([part(new BoxGeometry(w, L, 0.28), role, { y: L / 2 - 0.4, z: 0.3 }), part(new BoxGeometry(w * 2.2, 0.9, 0.28), role, { y: -0.7, z: 0.3 })]);
export const dropGeometry = () => part(new IcosahedronGeometry(0.11, 1), R.cream, { sy: 1.5 });
export function ticker() {
  let ctx = null;
  const click = (when, f, g) => {
    const o = ctx.createOscillator();
    const a = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(f, when);
    o.frequency.exponentialRampToValueAtTime(f * 0.45, when + 0.05);
    a.gain.setValueAtTime(g, when);
    a.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
    o.connect(a).connect(ctx.destination);
    o.start(when);
    o.stop(when + 0.09);
  };
  return {
    tick(low = false) {
      try {
        if (!getUi().sound) return;
        ctx ??= new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
        const t = ctx.currentTime;
        click(t, low ? 900 : 1700, 0.09);
      } catch {
      }
    },
    dispose() {
      try {
        ctx?.close();
      } catch {
      }
      ctx = null;
    },
  };
}
export { DoubleSide };
