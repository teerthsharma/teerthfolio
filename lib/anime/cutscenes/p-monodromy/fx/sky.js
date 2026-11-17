// The sky of p-monodromy's fx: the mega bolt, the storm column, the floor and sky sigils, the cold flash, the diamond motes and
// the tile debris of the strike. Overlays (premultiplied, drawn over the picture); the bolt and sigils are the live's own.
import { Group, Mesh, Vector3 } from "three";
import { makeCel, makeDebris } from "../../../kit/fx/cel.js";
import { megaBoltGeometry, boltMaterial } from "../live/bolt.js";
import { sigil, stormColumn } from "../live/hero.js";
import { DOCK, FLASHES, HIT, R, T, smooth, warp } from "../clock.js";
import { PAL, toned } from "../tone.js";

const hash = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const wrap = (v, n) => ((((v + n / 2) % n) + n) % n) - n / 2;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
// the flash of the sky (scene s): six short cold flashes, the equip's and the strike's, capped at 0.5 ("cold, never a white-out")
const flashAt = (tt) => {
  let f = 0;
  for (const s of FLASHES) if (tt >= s && tt < s + 0.17) f = Math.max(f, 0.22);
  return Math.min(0.5, f + Math.max(0, 1 - Math.abs(tt - 1.9) / 0.18) * 0.3 + (tt >= 6.4 ? Math.max(0, 1 - (tt - 6.4) / 0.1) * 0.5 : 0));
};
const MOTES = Array.from({ length: 150 }, (_, i) => ({ x: hash(i, 1) * 30, y: hash(i, 2) * 10, z: hash(i, 3) * 30, c: toned(["#f2b52e", "#e4566a", "#1fbdb4", "#fff3d6"][i % 4]) }));
const DRIFT = [0.5 * 0.2, 0.3 * 0.2, 0.1 * 0.2];

export default function makeSky(ctx) {
  const group = new Group(), V = new Vector3(), cam = () => ctx.player?.camera;
  const bolt = new Mesh(megaBoltGeometry(), boltMaterial());
  bolt.renderOrder = 6; bolt.frustumCulled = false; bolt.visible = false;
  bolt.material.uniforms.uJit.value = 0; bolt.material.uniforms.uCore.value = 0.35;
  const storm = stormColumn(), floor = sigil(1.6, true), skySig = sigil(2.2, false);
  skySig.g.position.set(0, 9, 0);
  group.add(bolt, storm.g, floor.g, skySig.g);

  const flash = makeCel(ctx.engine, { max: 8, order: 1100, draw(B, ts, A) {
    const a = flashAt(warp(ts));
    if (a > 0.003) B.rect(0, 0, A, 1, toned("#cfe6ff"), a);
  } });

  const motes = makeCel(ctx.engine, { max: 150 * 2, order: 1150, draw(B, ts, A) {
    const c = cam();
    if (!c || ts < R.dusk[1] || ts >= R.back) return;
    const tq = Math.floor(ts * 12) / 12;
    for (const m of MOTES) {
      const p = new Vector3(DOCK[0] + wrap(m.x + DRIFT[0] * tq, 30), DOCK[1] + wrap(m.y + DRIFT[1] * tq, 10), DOCK[2] - 8 + wrap(m.z + DRIFT[2] * tq, 30));
      const depth = -p.clone().applyMatrix4(c.matrixWorldInverse).z;
      if (depth < 0.3) continue;
      const q = p.clone().project(c), sx = (q.x * 0.5 + 0.5) * A, sy = 0.5 - q.y * 0.5, s = 0.09 / (2 * depth * Math.tan((c.fov * Math.PI) / 360));
      B.tri(sx, sy - s, sx + s * 0.6, sy, sx, sy + s, m.c);
      B.tri(sx, sy - s, sx - s * 0.6, sy, sx, sy + s, m.c);
    }
  } });

  const debris = [["#e9b23a", 14], ["#1fbdb4", 13], ["#fff3d6", 13]].map(([tone, count]) => makeDebris(ctx.engine, {
    events: [{ at: HIT.strike, where: [0.5, 0.7] }], count, tone, lit: "#fff3d6", ink: "#140f3a", life: 1.0, smear: 0.7,
  }));
  let placed = false;
  for (const d of debris) group.add(d.group);
  group.add(flash.group, motes.group);

  return {
    group,
    update(t, cue) {
      const tt = warp(t), struck = tt - 6.4, u = bolt.material.uniforms;
      bolt.visible = struck >= 0 && t < R.back;
      u.uGrow.value = clamp01(struck / 0.2);
      u.uFade.value = 1 - smooth(0.5, 0.9, struck);
      u.uStep.value = Math.floor(t * 12);
      u.uTime.value = t;
      const equipK = smooth(T.equip[0], T.equip[1], tt), flare = Math.max(0, 1 - Math.abs(struck - 0.1) / 0.5);
      storm.tick(t, Math.min(equipK * 0.7 + smooth(T.charge[0], T.charge[1], tt) * 0.5 + flare * 0.6, 1.2));
      floor.tick(t, smooth(1.9, 2.4, tt));
      skySig.tick(t, smooth(4.9, 5.4, tt));
      for (const o of [storm.g, floor.g, skySig.g]) o.visible = o.visible && t < R.back;
      flash.update(t, cue);
      motes.update(t, cue);
      const c = cam();
      if (!placed && c) {
        const q = new Vector3(DOCK[0] + 0.4, DOCK[1], DOCK[2] + 1.5).project(c);
        const where = [q.x * 0.5 + 0.5, 0.5 - q.y * 0.5];
        for (const d of debris) d.set({ events: [{ at: HIT.strike, where }] });
        placed = true;
      }
      for (const d of debris) d.update(t, cue);
    },
    dispose() {
      bolt.geometry.dispose();
      bolt.material.dispose();
      storm.dispose();
      floor.dispose();
      skySig.dispose();
      flash.dispose();
      motes.dispose();
      for (const d of debris) d.dispose();
    },
  };
}
