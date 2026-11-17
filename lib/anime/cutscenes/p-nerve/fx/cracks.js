// A varnish crack: five points from (cx, cy) along ang, each step bent by hash(k, seed) and the width tapering to a fifth; 30 percent of
// the cracks throw one branch from point 2 at 0.6 rad. Drawn as ribbons into a cel builder B, in frame heights (x in [0, aspect]).
import { hash } from "../live/look.js";

export function crack(B, cx, cy, ang, len, w0, col, seed, alpha = 1) {
  const pts = [[cx, cy]], ws = [w0];
  let x = cx, y = cy;
  for (let k = 1; k <= 4; k++) {
    const a = ang + (hash(k, seed) - 0.5) * 1.4, d = len / 4;
    x += Math.cos(a) * d; y += Math.sin(a) * d;
    pts.push([x, y]); ws.push(w0 * (1 - (0.8 * k) / 4));
  }
  B.ribbon(pts, ws, col, alpha);
  if (hash(5, seed) < 0.3) {
    const [px, py] = pts[2], b = ang + (hash(6, seed) < 0.5 ? -0.6 : 0.6), L = len / 2;
    B.ribbon([[px, py], [px + (Math.cos(b) * L) / 2, py + (Math.sin(b) * L) / 2], [px + Math.cos(b) * L, py + Math.sin(b) * L]], [w0 * 0.5, w0 * 0.25, 0.0004], col, alpha);
  }
}
