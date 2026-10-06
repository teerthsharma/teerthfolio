// THE HERO SEAL IN GIORNO'S COSTUME. The locked pup (ctx.seal, pup.js) is never restyled: every piece below is a CHILD of the seal body (seal.attach),
// so it rides every pose. Costume (bible 4): pink coat #d985bd/#b8559a with gold hem #f0c860, three gold curls #f5c518/#e9c05a/#f8e08a across the
// forehead (the pompadour is gone), a short braid of 5 beads with ribbon #e3769f swaying at 5.2 rad/s, a ladybug brooch (gold, #2a1a24 spots),
// and the anime eye decal (green #3fbf8a iris, 2 highlights): front-facing awe 0-1.3, calm half-lid 1.3-5.8, a 2-frame wide starburst at the pierce 5.8,
// calm again, set teeth during the barrage 10.35-11.85. The costume dresses in 0.5-1.0 s with an overshoot of 1.16.
// Poses are NOT driven here (scene.seal.track owns them); HERO_TRACK is the bible's pose list for the direction layer to import.
import { Group, SphereGeometry, TorusGeometry } from "three";
import { GIORNO } from "./costumes.js";
import { CLK } from "./layout.js";
import { sm, win, pop, T, figProp, pivoted } from "./util.js";

export const HERO_TRACK = [
  { t: 0.0, pose: "awe", dur: 0.3, hold: 1.0 }, { t: 0.2, pose: "sign", dur: 0.5, hold: 0.2 }, { t: 4.05, pose: "crouch", dur: 0.3, hold: 1.4 },
  { t: 5.8, pose: "fist", dur: 0.2, hold: 0.4 }, { t: 6.7, pose: "spin", dur: 0.5, hold: 0 }, { t: 10.35, pose: "point", dur: 0.3, hold: 1.5 },
  { t: 12.0, pose: "raise", dur: 0.5, hold: 2.4 }, { t: 15.4, pose: "idle", dur: 0.4, hold: 1.2 },
];

export function buildHero(ctx) {
  const seal = ctx.seal, G = GIORNO, P = (geo, c, s, o) => figProp(ctx, geo, c, s, { lineMul: 0.7, ...o });
  const HEAD = { c: [0, 0.555, 0.03], r: [0.27, 0.245, 0.255] };
  const costume = new Group();
  // coat: borrow the cached shell geometry from a throwaway costumed seal (never added to the scene)
  const tmp = ctx.kit.costumedSeal(ctx.engine, { layers: G.layers, shadow: false, name: "giorno-coat" });
  if (tmp.shell) costume.add(tmp.shell);
  tmp.fig.userData.mat?.dispose?.(); tmp.fig.userData.hull?.dispose?.();
  const hair = ctx.kit.hairMesh(ctx.engine, G.hair, { pos: HEAD.c, fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 });
  costume.add(hair);
  // three curls on the forehead: arcs of a torus lying on the scalp, facing along the scalp normal
  for (let i = -1; i <= 1; i++) {
    const x = i * 0.1, ry = 0.8, z = HEAD.c[2] + HEAD.r[2] * Math.sqrt(Math.max(0, 1 - (x / HEAD.r[0]) ** 2 - ry * ry)), y = HEAD.c[1] + HEAD.r[1] * ry;
    const col = i === 0 ? [G.curl.base, G.curl.shade] : [G.curl.mid, G.curl.shade];
    const c = P(new TorusGeometry(0.046, 0.03, 8, 16, Math.PI * 1.75), col[0], col[1], { pos: [x, y + 0.01, z + 0.012], rot: [-0.93, 0, i * 0.5] });
    costume.add(c);
    costume.add(P(new SphereGeometry(0.016, 8, 6), G.curl.hi, G.curl.mid, { pos: [x + 0.012, y + 0.03, z + 0.05], line: 0, lineMul: 0.2 })); // the lit curl tip
  }
  // ladybug brooch on the left lapel: gold body, three #2a1a24 spots
  const brooch = new Group();
  brooch.add(P(new SphereGeometry(0.04, 12, 8).scale(1, 1.1, 0.5), G.brooch, "#b9803a", { lineMul: 0.5 }));
  for (const [dx, dy] of [[-0.016, 0.01], [0.016, 0.01], [0, -0.016]]) brooch.add(P(new SphereGeometry(0.009, 6, 5), G.spots, G.spots, { pos: [dx, dy, 0.019], line: 0, lineMul: 0.2 }));
  brooch.position.set(0.24, 0.37, 0.305); costume.add(brooch);
  // braid: 5 beads + ribbon, hanging behind the head; each bead lags the one above (sway)
  const beads = [];
  for (let i = 0; i < 5; i++) { const b = P(new SphereGeometry(0.034 - i * 0.003, 10, 8), i % 2 ? G.curl.mid : G.curl.base, G.curl.shade, { lineMul: 0.6 }); costume.add(b); beads.push(b); }
  const ribbon = P(new TorusGeometry(0.02, 0.01, 6, 12), G.ribbon, "#a04468", { lineMul: 0.5 }); costume.add(ribbon);
  const wrapped = pivoted(costume, [0, 0.3, 0]); // dresses in about the chest
  seal.attach(wrapped);
  const eyes = ctx.kit.eyePair(HEAD, G.eyes);
  seal.attach(eyes);
  const sway = (t) => {
    for (let i = 0; i < 5; i++) beads[i].position.set(0.014 * (i + 1) * Math.sin(5.2 * t - 0.6 * i), 0.55 - i * 0.052, -0.255 - i * 0.012); // braid sway, w = 5.2 rad/s
    ribbon.position.set(0.07 * Math.sin(5.2 * t - 3.1), 0.55 - 5 * 0.052, -0.32);
  };
  return {
    update(t, cue) {
      const t0 = T(cue, "dress", CLK.dress[0]), s = pop(t, t0, t0 + (CLK.dress[1] - CLK.dress[0]), 1.16);
      wrapped.scale.setScalar(Math.max(s, 1e-4)); wrapped.visible = s > 0.001;
      eyes.visible = t > t0 + 0.2;
      sway(t);
      const tPi = T(cue, "pierce", CLK.pierce), tB0 = T(cue, "barrage", CLK.barrage[0]), tLb = T(cue, "lastBlow", CLK.lastBlow), tE = T(cue, "enter", CLK.enter);
      const burst = win(t, tPi, tPi + 2 / 24, 0.01, 0.02), bar = win(t, tB0, tLb, 0.15, 0.1);
      if (burst > 0.5) eyes.userData.set("awe", 1);                                   // 5.8: eyes snap wide (2 frames, the green starburst)
      else if (t < tE) eyes.userData.set("awe", 0.85);                                // 0-1.3: front-facing awe
      else if (bar > 0.05) eyes.userData.set("rage", 0.55 * bar + 0.2);               // barrage: set jaw, narrowed
      else eyes.userData.set("calm", sm(tE, tE + 0.3, t));                            // 1.3-5.8 and after: calm half-lid
      engineSync(ctx);
    },
    dispose() { for (const o of [hair, ...beads, ribbon, brooch, eyes]) o.traverse?.((c) => { if (c.isMesh) { c.geometry?.dispose?.(); c.material?.dispose?.(); } }); eyes.userData.dispose?.(); },
  };
}
const engineSync = (ctx) => ctx.engine.syncFaces(ctx.seal.group);
