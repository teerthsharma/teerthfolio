// CAST layer for pr-pyrefly-4180 (CAST agent). Layer 1, redrawn every step. Pierrot default (INDEX decision 9): real 3D, cel-shaded.
//   hero.js   the locked seal dressed as the Fourth (haori with flame hem, headband, yellow tuft, three kunai), never restyled
//   kurama.js the Nine-Tails (enemy): body, head + jaw, nine tails, red slit eyes, the dark orb, the Eight Trigrams on the chest
//   crowd.js  five masked shinobi seals on a branch, Kushina, the tiny Tobi mask
//   parts.js  kunai, masks, orb      layout.js stage layout + beat times
//
// CUE NAMES (scene.beats; each falls back to the bible time when the scene has no such beat):
//   mask 1.2   roar 2.6 (dur 1.3)   orb 4.0 (dur 2.6)   throw x3 (6.2 6.45 6.7)   flash x3 (7.25 7.5 7.75)   trigram 7.9
//   chain 7.92   hoop 8.4   surge 8.92 (dur 1.5)   burst 10.45   pin 11.3   cheer 9.0   dattebane 14.3   lower 23.2
//
// STAGE: one group fixed at the seal's START (seal.at, seal.yaw, seal.scale read once at build, so the hero's moves never drag the set); every
// position in layout.js is seal-local metres. The fox stands BEHIND the seal. `ctx.cast` publishes world-space anchors the other layers may read
// (they must never import this folder):
//   ctx.cast = { toWorld(v3|[x,y,z]) -> Vector3, kurama:{ at, size, head(), belly() }, kunai:[3 world Vector3], shinobi:[x,y,z], kushina:[x,y,z] }
// KUNAI FLIGHT: kunai i leaves the hero's grip at T.throw[i] and lands at LAYOUT.kunai[i] after 8 frames (1/3 s) on the arc
//   p(u) = lerp(hand, land, u) + (0, 1.1 sin(pi u), 0), u = (ts - throw) / (1/3); aimed along p'(u); it then sticks and wobbles
//   w(s) = 0.12 e^(-6 s) sin(30 s) about z (s = seconds since landing, stepped).
import { makeParts } from "./parts.js";
import { LAYOUT, timeline } from "./layout.js";
import { dressHero } from "./hero.js";
import { buildKurama } from "./kurama.js";
import { buildCrowd } from "./crowd.js";

export default function build(ctx) {
  const { THREE: Th, seal } = ctx;
  const sc = ctx.scene.stage ?? {};
  const L = { ...LAYOUT, ...sc, kurama: { ...LAYOUT.kurama, ...(sc.kurama ?? {}) } };
  const T = timeline(ctx.scene);
  const group = new Th.Group(), stage = new Th.Group(), crowdG = new Th.Group();
  group.name = "pyrefly-cast";
  stage.position.set(...seal.at); stage.rotation.y = seal.yaw; stage.scale.setScalar(seal.scale);
  group.add(stage); stage.add(crowdG);
  const parts = makeParts(ctx);

  const hero = dressHero(ctx, parts, T, L);

  // Kurama faces the hero: its local +z points at the stage origin
  const kur = buildKurama(ctx, parts, T);
  kur.group.position.set(...L.kurama.at);
  kur.group.rotation.y = Math.atan2(-L.kurama.at[0], -L.kurama.at[2]);
  kur.group.scale.setScalar(L.kurama.size / 5.5);
  crowdG.add(kur.group);

  const crowd = buildCrowd(ctx, parts, T, L);
  crowdG.add(crowd.group);

  // thrown kunai (hidden until their throw)
  const thrown = [0, 1, 2].map(() => { const k = parts.kunai(); k.visible = false; crowdG.add(k); return k; });
  const up = new Th.Vector3(0, 1, 0), a = new Th.Vector3(), b = new Th.Vector3(), v = new Th.Vector3();
  const flight = 1 / 3; // 8 frames
  function kunaiAt(i, ts) {
    const k = thrown[i], t0 = T.throw[i];
    k.visible = ts >= t0;
    if (!k.visible) return;
    a.set(...L.hand); b.set(...L.kunai[i]);
    const u = (ts - t0) / flight;
    if (u < 1) {
      k.position.lerpVectors(a, b, u); k.position.y += 1.1 * Math.sin(Math.PI * u);
      v.copy(b).sub(a); v.y += 1.1 * Math.PI * Math.cos(Math.PI * u); // the tangent: d/du of lerp + the arc
      k.quaternion.setFromUnitVectors(up, v.normalize());
    } else {
      const s = ts - t0 - flight; // landed: stuck at a lean toward the fox, a hand of blade in the ground
      k.position.set(b.x, b.y + 0.12, b.z);
      k.quaternion.setFromUnitVectors(up, v.set(0.18 * (i - 1), 1, -0.25).normalize());
      k.rotateZ(0.12 * Math.exp(-6 * s) * Math.sin(30 * s));
    }
  }

  // anchors for the other layers (world space)
  const toWorld = (p) => { stage.updateMatrixWorld(true); return stage.localToWorld(Array.isArray(p) ? new Th.Vector3(...p) : p.clone()); };
  ctx.cast = {
    toWorld,
    kurama: { at: L.kurama.at, size: L.kurama.size, head: () => { stage.updateMatrixWorld(true); return kur.head.getWorldPosition(new Th.Vector3()); }, belly: () => toWorld([L.kurama.at[0], 3.1 * (L.kurama.size / 5.5), L.kurama.at[2]]) },
    kunai: L.kunai.map((p) => toWorld(p)),
    shinobi: L.branch.a, kushina: L.kushina,
  };

  ctx.setLayer(group, 1);
  // the stage is lowered through the floor from T.lower: crowdG sinks 7.5 m over 1.6 s on an ease-in (d^2), then hides
  return {
    group,
    update(t) {
      const ts = t;
      kur.update(ts); crowd.update(ts); hero.update(ts);
      for (let i = 0; i < 3; i++) kunaiAt(i, ts);
      const d = Math.min(1, Math.max(0, (ts - T.lower) / 1.6));
      crowdG.position.y = -7.5 * d * d; crowdG.visible = d < 1;
    },
    dispose() { kur.dispose(); crowd.dispose(); hero.dispose(); parts.dispose(); },
  };
}
