// THE 27 KNIGHT SEALS (bible 3.9, 4.2): small seals x0.8 hero in plate armour, no human heads (the locked seal head sits in the gorget).
// Plates #cfc8c0 / #8a7d86 (shadow #231621 in the ink), gold rim strip #ffb040 on the sun-side pauldrons, halberd #6b5a4a + blade #bfc3d4,
// 1 in 9 wears a red cape #7a1a1a / #260a0f. Ranks of 8, 9, 10 with a clear central aisle (the hero and Aura are never covered).
//   march       in by ranks from 2.0 s + 0.15 s/rank (rigid, a stepped bob)
//   controlled  blank pale-wash eyes (expression "petrified": no highlights, stone-pale) from the march to the kneel
//   rock        7.7 s: every rank rocks back 0.35 rad over 0.25 s, 0.08 s per rank (a wave from the front rank)
//   kneel       10.3 s: rank by rank, 0.12 s apart: legs fold (kit kneel) and the torso bows 0.38 rad; the wash clears = freed ("sad")
import { clamp, smooth, makeFig } from "./util.js";
import { ARMY } from "./layout.js";

export function buildArmy(ctx, time) {
  const { THREE, engine, kit } = ctx;
  const fig = makeFig(ctx);
  const group = new THREE.Group();
  const rng = ctx.rng("army");
  const costume = (cape) => ({
    scale: ARMY.k * (ctx.seal.scale ?? 1),
    layers: [
      ...(cape ? [{ type: "cape", col: "#7a1a1a", shade: "#260a0f", trim: "#ffb040" }] : []),
      { type: "armour", col: "#cfc8c0", shade: "#8a7d86", trim: "#ffb040" },
    ],
    weapon: { kind: "spear", hand: "r", col: "#6b5a4a", trim: "#bfc3d4" },
    eyes: { style: "blank", iris: "#d8d4dc", irisLo: "#a8a4b4" },
    shadowTint: "#5a3c8a",
  });
  const soldiers = [];
  let n = 0;
  ARMY.counts.forEach((cnt, rank) => {
    for (let i = 0; i < cnt; i++) {
      const h = kit.costumedSeal(engine, costume(n % 9 === 4));
      // gorget (the empty collar ring the head rises from) and 3 rivets on the breastplate
      h.body.add(fig(new THREE.TorusGeometry(0.235, 0.03, 8, 28).rotateX(Math.PI / 2), "#cfc8c0", "#8a7d86", { pos: [0, 0.455, 0.02], lineMul: 0.6 }));
      for (let r = 0; r < 3; r++) h.body.add(fig(new THREE.SphereGeometry(0.013, 6, 5), "#e8e2dc", "#8a7d86", { pos: [(r - 1) * 0.07, 0.34, 0.325 - Math.abs(r - 1) * 0.02], lineMul: 0.2 }));
      // the aisle: ranks split left and right of z = 0
      const side = i % 2 ? 1 : -1, j = i >> 1;
      const z = side * (ARMY.aisle + ARMY.dz * j);
      const x = ARMY.x0 + ARMY.dx * rank + (rng() - 0.5) * 0.12;
      h.place(x, ARMY.y, z, ARMY.yaw);
      h.expression("petrified", 1);
      group.add(h.group);
      soldiers.push({ h, rank, x, z, phase: rng() * 6.28 });
      n++;
    }
  });

  return {
    group,
    soldiers,
    update(t, dt) {
      const tm = time("army_march"), tr = time("army_rock"), tk = time("army_kneel");
      for (const s of soldiers) {
        const t0 = tm + 0.15 * s.rank;
        const walk = clamp((t - t0) / 1.4); // 0 to 1 over 1.4 s: a 3.5 m walk-in
        s.h.group.visible = t >= t0;
        if (!s.h.group.visible) continue;
        const dx = (1 - smooth(walk)) * 3.5;
        const stepY = walk < 1 ? Math.abs(Math.sin(walk * 18 + s.phase)) * 0.025 : 0; // stepped bob while marching
        s.h.group.position.set(s.x + dx, ARMY.y + stepY, s.z);
        // kneel progress: rank by rank, 0.12 s apart
        const kk = smooth((t - (tk + 0.12 * s.rank)) / 0.45);
        s.h.react("kneel", kk);
        if (kk < 0.6) s.h.expression("petrified", 1 - kk); // controlled: blank pale-wash eyes
        else s.h.expression("sad", kk); // the wash clears at the kneel
        s.h.update(t, dt);
        // rigid rank, chin slightly raised until the kneel
        s.h.body.rotation.x += -0.04 * (1 - kk);
        // rock-back wave at the release: out in 0.25 s, then settles to 40%
        const ru = (t - (tr + 0.08 * s.rank)) / 0.25;
        const rock = ru < 0 ? 0 : ru < 1 ? smooth(ru) : 1 - 0.6 * smooth(ru - 1);
        s.h.body.rotation.x += -0.35 * rock * (1 - kk);
        // torso bows 0.38 rad as the legs fold (the kit kneel already supplies 0.14)
        s.h.body.rotation.x += 0.24 * kk;
      }
    },
    dispose() { for (const s of soldiers) s.h.dispose(); },
  };
}
