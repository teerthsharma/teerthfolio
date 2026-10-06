// THE ICE-BLOCK TRIANGLE (bible: Ice-block triangle (the kernel)). The causal triangle of the PR: row q holds blocks c = 0..q,
// 10 rows, sum_{q=0}^{9} (q + 1) = 55 cubes of 1.2 m (pitch 1.3 m), standing as a wall on the island, faced toward the seal.
//
// SCHEDULE (the sparse pattern the kernel keeps): block (q, c) is scheduled iff  c = q  (the diagonal)  or  c = 0  (the first
// column)  or  (q >= 4 and c = floor(q / 2))  : 10 + 9 + 6 = 25 scheduled, 30 unscheduled.
// MOTION:
//   rise     block (q, c) rises from 1.6 m under the island:  y -= 1.6 (1 - bo(k)), k = (t - rise - 0.4 - 0.1 q)/0.6
//   Cleave   every UNSCHEDULED block is two right-triangle prisms from the start (they read as the cube, a hairline crack on the
//            diagonal); at t_c = cleave + 0.03 q they slide apart along the diagonal normal n = (1, -1)/sqrt 2:
//            dist = 0.9 sm((t - t_c)/0.3), halves tilt +-0.4 sm, fall y -= 0.4 x^2, then sink 2.2 m under the island by t_c + 1.2
//   glow     scheduled blocks glow red:  emit = (0.9, 0.08, 0.12) (0.5 sm((t - cleave)/0.4) + 1.2 boost)
//   pulse    from `pulse`: boost = exp(-1.6 (q - pos)^2), pos = ((t - pulse)/0.45) mod 12   a wave that walks the rows
// MATERIAL: faceted ice, ink #0e0b0d hull, hard specular streak by gloss (0.9, 40), light grunge cracks (stone mode 3).
import { ExtrudeGeometry, Group, Shape, BoxGeometry } from "three";
import { bo, sm, surf } from "./util.js";

const S = 1.2, P = 1.3;
export const scheduled = (q, c) => c === q || c === 0 || (q >= 4 && c === Math.floor(q / 2));

export function buildIce(ctx, T) {
  const { engine } = ctx;
  const cfg = ctx.scene.triangle ?? {};
  const at = cfg.at ?? [-7.5, 8.5], yaw = cfg.yaw ?? Math.atan2(-at[0], -at[1]);
  const root = new Group(); root.position.set(at[0], 0, at[1]); root.rotation.y = yaw;
  const h = S / 2, f = { gloss: [0.9, 40, 0.3, 0], stone: [3, 1.2, 0.18, 0.08], ink: 0.8 };
  const tri = (pts) => { const sh = new Shape(); sh.moveTo(...pts[0]); sh.lineTo(...pts[1]); sh.lineTo(...pts[2]); sh.lineTo(...pts[0]);
    return new ExtrudeGeometry(sh, { depth: S, bevelEnabled: false }).translate(0, 0, -h); };
  const geoCube = new BoxGeometry(S, S, S), geoA = tri([[-h, -h], [h, -h], [h, h]]), geoB = tri([[-h, -h], [h, h], [-h, h]]);
  const blocks = [], meshes = [];
  for (let q = 0; q < 10; q++) for (let c = 0; c <= q; c++) {
    const g = new Group(), x = (c - q / 2) * P, y = (9 - q) * P + S / 2, sch = scheduled(q, c);
    g.position.set(x, y, 0); root.add(g);
    const b = { q, c, sch, g, y };
    if (sch) { b.m = surf(engine, geoCube, "#f4efe2", "#b9b2a0", 0.62, f); g.add(b.m); meshes.push(b.m); }
    else { b.a = surf(engine, geoA, "#f4efe2", "#b9b2a0", 0.62, f); b.b = surf(engine, geoB, "#f4efe2", "#b9b2a0", 0.62, f); g.add(b.a, b.b); meshes.push(b.a, b.b); }
    blocks.push(b);
  }
  const n = Math.SQRT1_2;
  return {
    object: root, count: blocks.length,   // 55
    update(t) {
      const pos = t >= T.pulse ? ((t - T.pulse) / 0.45) % 12 : -9;
      for (const b of blocks) {
        const k = (t - (T.rise + 0.4 + 0.1 * b.q)) / 0.6;
        b.g.visible = k > 0;
        if (k <= 0) continue;
        let dy = -1.6 * (1 - (k >= 1 ? 1 : bo(k)));
        if (b.sch) {
          const g = 0.5 * sm((t - T.cleave) / 0.4), w = Math.min(Math.abs(b.q - pos), Math.abs(b.q - pos + 12), Math.abs(b.q - pos - 12));
          const e = g + 1.2 * Math.exp(-1.6 * w * w);
          b.m.material.uniforms.uEmit.value.setRGB(0.9 * e, 0.08 * e, 0.12 * e);
        } else {
          const tc = T.cleave + 0.03 * b.q, x = (t - tc) / 0.3, xs = Math.min(1, Math.max(0, x)), d = 0.9 * sm(x);
          const sink = 2.2 * sm((t - tc - 0.5) / 0.7);
          dy -= 0.4 * xs * xs + sink;
          b.a.position.set(n * d, -n * d, 0); b.b.position.set(-n * d, n * d, 0);
          b.a.rotation.z = -0.4 * sm(x); b.b.rotation.z = 0.4 * sm(x);
          if (t > tc + 1.3) b.g.visible = false;
        }
        b.g.position.y = b.y + dy;
      }
    },
    dispose() { for (const m of meshes) m.material.dispose(); geoCube.dispose(); geoA.dispose(); geoB.dispose(); },
  };
}
