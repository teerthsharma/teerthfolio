// FX COLLAPSE: from 16.6 s the live island breaks into snowflakes and the free island takes over (live sheet frame 13). 90 six-arm flakes in the
// live's orange and ice blue fall behind the pup, on twos, and are gone by 17.4 s.
import { makeCel } from "../../../kit/fx/cel.js";
import { hash } from "../live/ink.js";
import { toned } from "../tone.js";

const N = 90, BORN = [16.6, 16.9], END = 17.4, COL = [toned("#ff8f00"), toned("#9fcfeb")];

const flake = (B, i, ts, A) => {
  const born = BORN[0] + (BORN[1] - BORN[0]) * hash(i, 3);
  if (ts < born || ts >= END) return;
  const age = ts - born, fall = 0.15 + 0.25 * hash(i, 5), r = (0.025 + 0.035 * hash(i, 7)) * (Math.floor(ts * 12 + 1e-6) % 2 ? 0.8 : 1);
  const cx = hash(i, 9) * A, cy = -0.1 + 0.8 * hash(i, 11) + fall * age, a0 = hash(i, 13) * Math.PI / 6, c = COL[i % 2];
  for (let k = 0; k < 6; k++) {
    const a = a0 + (k / 6) * Math.PI * 2, ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r;
    B.ribbon([[cx, cy], [ex, ey]], [0.1 * r, 0.03 * r], c);
    const mx = cx + Math.cos(a) * r * 0.55, my = cy + Math.sin(a) * r * 0.55;
    for (const d of [-0.7, 0.7]) B.ribbon([[mx, my], [mx + Math.cos(a + d) * r * 0.35, my + Math.sin(a + d) * r * 0.35]], [0.06 * r, 0.02 * r], c);
  }
};

export function makeCollapse(ctx) {
  const cel = makeCel(ctx.engine, {
    max: N * 24 * 6, order: 1100, behind: true,
    draw(B, ts, A) { for (let i = 0; i < N; i++) flake(B, i, ts, A); },
  });
  return { group: cel.group, update(t) { cel.update(t); }, dispose() { cel.dispose(); } };
}
