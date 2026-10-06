// SPARKLES (bible 3.13, 6): the firefly petal pool, the water glints, and the three 64-sparkle link bursts.
//   fireflies  90 irregular petal blobs #f0ffc0, 4 to 40 px, drifting; alpha (.5 + .5 sin)^3  (the specks of frame 06)
//   glints     170 four-point stars on the lake plane, #fff6e6, each holds a three (8 fps), hash gate .78 (fine glitter, ~2 px core)
//   bursts     64 sparkles #ffd6a0 at the link (10.2 s), the bow pop (15.2 s) and the girl's hand (16.4 s), life 1.6 s
// Density keys: fireflies breathe with the colour script (shot 2 and the frightened shot 5 fullest, thinning to dusk).
// Every pool fades to zero where it would sit between the lens and the seal (see lib.js, seal fade).
import { pool, sstep, clamp01, lerp } from "./lib.js";

export default function makeSparkles(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "sparkles";
  const rng = ctx.rng("tangle-sparkles");
  const sc = L.sc;
  const mid = L.lerpP ? L.lerpP([L.at[0], L.at[1], L.at[2]], L.hand, 0.5) : [L.at[0], L.at[1], L.at[2]];
  const mid3 = [(L.at[0] + L.hand[0]) / 2, L.lakeY + 1.4 * sc, (L.at[2] + L.hand[2]) / 2];

  const flies = pool(THREE, sh, rng, { count: 90, mode: 0, origin: mid3, area: [26 * sc, 5 * sc, 26 * sc], col: "#f0ffc0", col2: "#ffffff", hdr: 1.15, sizeK: 1 });
  const lakeMid = L.at3(48 * sc, 0, 0.02);
  const glints = pool(THREE, sh, rng, { count: 170, mode: 2, origin: [lakeMid[0], L.lakeY + 0.03, lakeMid[2]], area: [70 * sc, 0, 80 * sc], col: "#fff6e6", col2: "#ffffff", hdr: 1.25, sizeK: 1 });
  const mkBurst = (at, col, col2) => pool(THREE, sh, rng, { count: 64, mode: 1, origin: at, life: 1.6, speed: 6 * sc, col, col2, hdr: 1.3, sizeK: 1, order: 7 });
  const bursts = [
    { name: "link", p: mkBurst(L.loops, "#ffd6a0", "#fff6e6") },
    { name: "bowPop", p: mkBurst(L.flip, "#ffb27a", "#ffe9c2") },
    { name: "girlBurst", p: mkBurst(L.hand, "#ffd6a0", "#ffffff") },
  ];
  group.add(flies, glints, ...bursts.map((b) => b.p));

  return {
    group,
    update(t) {
      const TS = T.sc;
      // fireflies: in from 2.4 s, strongest in shots 2 and 5 (frightened), thinning towards the dusk drain
      const f = sstep(2.4 * TS, 3.4 * TS, t) * (1 - 0.55 * sstep(11 * TS, 12 * TS, t) * (1 - sstep(13.5 * TS, 14.4 * TS, t))) * (1 - sstep(19 * TS, 23 * TS, t));
      flies.userData.u.uTime.value = t; flies.userData.u.uOn.value = f; flies.visible = f > 0.01;
      // glints: while the sun is low over the lake (shots 2-7), then gone as the water goes to night
      const g = sstep(2.6 * TS, 3.6 * TS, t) * (1 - sstep(19.4 * TS, 22.4 * TS, t));
      glints.userData.u.uTime.value = t; glints.userData.u.uOn.value = g; glints.visible = g > 0.01;
      for (const b of bursts) {
        const age = t - T[b.name], u = b.p.userData.u;
        u.uTime.value = age; b.p.visible = age > 0 && age < 1.8;
      }
    },
    dispose() { group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); },
  };
}
