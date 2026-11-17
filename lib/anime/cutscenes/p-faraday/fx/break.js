// THE BREAK of Railgun on the cel layer, behind the seal: girder and glass shards thrown off the beam line, the scorch along the deck,
// and the sonic ring from the flipper. Bridge-frame metres are turned by PHI and moved to DOCK, then projected by the camera.
import { Vector3 } from "three";
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import { BEAM_LINE, DOCK, PHI, R } from "../clock.js";
import { AMBER, CHAR, CREAM, NAVY } from "../palette.js";

const UP = new Vector3(0, 1, 0), D = new Vector3(...DOCK), N = 64, LIFE = 1.2, G = 9.8, SCORCH_V = 55, SCORCH_T = 0.8, RING_T = 0.42;
const C = { AMBER: rgb(AMBER), CHAR: rgb(CHAR), CREAM: rgb(CREAM), NAVY: rgb(NAVY) };
const world = (x, y, z) => new Vector3(x, y, z).applyAxisAngle(UP, PHI).add(D);

export function breakCel(ctx) {
  const rnd = ctx.rng(51);
  const SH = Array.from({ length: N }, (_, i) => {
    const s = 4 + 5 * rnd();
    return { x0: 0.4 + 0.2 * i, v: [s * (0.4 + 0.6 * rnd()), s * (0.6 + 0.4 * rnd()), (rnd() - 0.5) * 2], w: 3 + 6 * rnd(), sz: 0.12 + 0.12 * rnd(), rim: i % 5 === 0, th: rnd() * 6.283 };
  });
  const V = new Vector3();
  const proj = (p) => { V.copy(p).project(ctx.player.camera); return [V.x * 0.5 + 0.5, 0.5 - V.y * 0.5, V.z]; };
  const fl = (c, d) => (1 / Math.tan((c.fov * Math.PI) / 360)) / (2 * d);
  const tri = (B, cx, cy, r, th, col) => {
    const a = [0, 1, 2].map((k) => th + (k * 2 * Math.PI) / 3);
    B.tri(cx + Math.cos(a[0]) * r, cy + Math.sin(a[0]) * r, cx + Math.cos(a[1]) * r, cy + Math.sin(a[1]) * r, cx + Math.cos(a[2]) * r, cy + Math.sin(a[2]) * r, col);
  };
  const shards = (B, A, c, tau) => {
    for (const s of SH) {
      const p = world(s.x0, BEAM_LINE.y, BEAM_LINE.z);
      p.x += s.v[0] * tau; p.y += s.v[1] * tau - 0.5 * G * tau * tau; p.z += s.v[2] * tau;
      const q = proj(p);
      if (q[2] > 1) continue;
      const r = s.sz * fl(c, p.distanceTo(c.position)), th = s.th + s.w * tau, cx = q[0] * A, cy = q[1];
      tri(B, cx, cy, r * 1.12, th, s.rim ? C.AMBER : C.CREAM);
      tri(B, cx, cy, r, th, C.NAVY);
    }
  };
  const scorch = (B, A, tau) => {
    const len = Math.min(tau, SCORCH_T) * SCORCH_V;
    for (const dy of [0, -0.12, 0.1]) {
      const pts = Array.from({ length: 13 }, (_, i) => { const q = proj(world(0.4 + (len * i) / 12, BEAM_LINE.y + dy, BEAM_LINE.z)); return [q[0] * A, q[1]]; });
      B.ribbon(pts, pts.map(() => 0.012), C.AMBER);
      B.ribbon(pts, pts.map(() => 0.006), C.CHAR);
    }
  };
  const sonic = (B, A, c, tau, hand) => {
    const m = 0.6 + (4 - 0.6) * (tau / RING_T), r = m * fl(c, hand.distanceTo(c.position)), q = proj(hand), cx = q[0] * A, cy = q[1];
    const pts = Array.from({ length: 57 }, (_, i) => { const a = (i / 56) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
    B.ribbon(pts, pts.map(() => 0.002), C.CREAM);
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + tau * 9; tri(B, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.01, a, C.AMBER); }
  };
  const cel = makeCel(ctx.engine, {
    max: 20000, order: 1200, behind: true,
    draw(B, ts, A) {
      const c = ctx.player?.camera, tau = ts - R.shot;
      if (!c || tau < 0) return;
      if (tau <= LIFE) shards(B, A, c, tau);
      if (tau < R.island - R.shot) scorch(B, A, tau);
      const hand = ctx.seal.named?.()?.handR;
      if (hand && tau < RING_T) sonic(B, A, c, tau, new Vector3().copy(hand));
    },
  });
  return { group: cel.group, update: (t, cue) => cel.update(t, cue), dispose: () => cel.dispose() };
}
