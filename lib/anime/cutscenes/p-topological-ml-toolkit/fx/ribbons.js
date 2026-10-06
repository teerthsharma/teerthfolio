// WIND RIBBONS (bible 3.9, 6): 72 streamlines of air spiralling into the orb, 5.7 - 9.7 s.
// Drawn as camera-facing strips (util.makeStrips "ribbon"): body #7fe8ff, hatch #e8f8ff scrolling on threes, ink edge #1d3f9a, ends tapered 80%.
// Maths. Ribbon i has a spiral path about the vertical axis through the orb centre B:
//   w in [0,1] (outer -> centre):  angle(w) = th0 + dir * turns * 2 pi * w,   rho(w) = R0 (1 - w)^1.25 + 0.18,   y(w) = lerp(y0, B.y, w^0.9)
// A snake of path length 0.45 rides it. Generation g starts at ts = 5.7 + 0.9 hash + 2.1 g and takes dur = 1.7 + 0.7 hash:
//   p = (t - ts) / dur,  head = clamp(p),  tail = clamp(p - 0.45),  visible for p in (0, 1.45)
// Width along the snake q in [0,1]:  w(q) = w0 (1 - 0.8 (2q - 1)^2)  (80% taper at both ends); w0 = 0.10 - 0.18 m.
// The dash hatch is step(0.5, fract(u * 9 - t * 8)) in the fragment shader with t stepped to threes (uT below).
// 14 of the 72 carry an arrow head (cyan, from the arrow pool in arrows.js) that rides the head of the snake: env.heads.
import { HEX, rgb, hash, smooth, clamp, lerp } from "./util.js";
import { makeStrips } from "./util.js";

const N = 72, SEG = 14, GENS = 4;

export default function build(ctx, env) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const strips = makeStrips(THREE, N * SEG * 2 + 64, { mode: "ribbon", order: 6, uniforms: { uHatch: { value: new THREE.Color(HEX.hatch) } } });
  group.add(strips.mesh);
  const body = rgb(THREE, HEX.ribbon);
  const rib = [];
  for (let i = 0; i < N; i++) rib.push({ th0: hash(i * 2.9) * Math.PI * 2, R0: 7 + hash(i * 4.1) * 9, y0: 1.8 + hash(i * 6.7) * 4.2, dir: i % 5 === 0 ? -1 : 1, turns: 1.6 + hash(i * 8.3) * 1.2, w0: 0.10 + hash(i * 3.3) * 0.08, carry: i < 14 });
  const P = new THREE.Vector3(), Q = new THREE.Vector3();
  function pathAt(r, w, B, sc, ground, out) {
    const ang = r.th0 + r.dir * r.turns * Math.PI * 2 * w;
    const rho = (r.R0 * Math.pow(1 - w, 1.25) + 0.18) * sc;
    const y = lerp(ground + r.y0 * sc, B.y, Math.pow(w, 0.9));
    return out.set(B.x + rho * Math.cos(ang), y, B.z + rho * Math.sin(ang));
  }
  function update(t) {
    const T = env.T, sc = env.F.sc(), B = env.B, ground = env.F.at()[1];
    strips.begin(); env.heads.length = 0;
    strips.uniforms.uT.value = Math.floor(t * 8) / 8;                  // hatch on threes
    const t0 = T.ribbons, t1 = t0 + 4.0;                              // 5.7 - 9.7
    if (t >= t0 && t <= t1 + 1.6) {
      for (let i = 0; i < N; i++) {
        const r = rib[i];
        for (let g = 0; g < GENS; g++) {
          const ts = t0 + hash(i * 2.9 + 17) * 0.9 + g * 2.1;
          if (ts > t1) continue;
          const dur = 1.7 + 0.7 * hash(i * 5.5 + g);
          const p = (t - ts) / dur;
          if (p <= 0 || p >= 1.45) continue;
          const head = clamp(p), tail = clamp(p - 0.45);
          if (head - tail < 0.01) continue;
          let prev = pathAt(r, tail, B, sc, ground, P).clone(), qp = 0;
          for (let s = 1; s <= SEG; s++) {
            const q = s / SEG, w = lerp(tail, head, q);
            pathAt(r, w, B, sc, ground, Q);
            const wid = (q0) => r.w0 * sc * (1 - 0.8 * Math.pow(2 * q0 - 1, 2)) + 0.012;
            strips.seg(prev.x, prev.y, prev.z, Q.x, Q.y, Q.z, wid(qp), wid(q), lerp(tail, head, qp) * 14, w * 14, 0.97, body[0], body[1], body[2]);
            prev.copy(Q); qp = q;
          }
          if (r.carry && env.heads.length < 38) {                       // the arrow head riding the front of the snake
            pathAt(r, head, B, sc, ground, P); pathAt(r, clamp(head - 0.03), B, sc, ground, Q);
            const dx = P.x - Q.x, dy = P.y - Q.y, dz = P.z - Q.z, l = Math.hypot(dx, dy, dz) + 1e-6;
            const len = 0.5 * sc * (1 - smooth(1.0, 1.45, p));
            env.heads.push({ px: P.x - dx / l * len, py: P.y - dy / l * len, pz: P.z - dz / l * len, dx: dx / l, dy: dy / l, dz: dz / l, len, th: 0.04 * sc });
          }
        }
      }
    }
    strips.end();
  }
  return { group, update, dispose() { strips.dispose(); } };
}
