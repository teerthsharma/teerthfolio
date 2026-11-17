// THE SET'S ANIMATION: the deployed move's useCutFrame (460bafd), ported body by body. `s` is the scene clock (clock.js T); the kit stands at the
// rig origin and the seal walks across it. Stateless: every frame is a pure function of s, so a seek equals a play.
import { Vector3 } from "three";
import { DOCK, SEAL, T, pupScale, smooth } from "../clock.js";
import { N, put } from "../live/kit.js";
import { BLOCK, BLUE_AT, CELLS, FACES, PLATES, hash, zF } from "../live/world.js";

const SPLIT = [T.split[1], T.split[0], T.split[2]]; // FACES order: horned, crowned, capped
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const onTwos = (x) => Math.floor(x * 12 + 1e-6) / 12;
const footfall = (s) => {
  if (s < T.beat0) return [9, 0];
  const n = Math.min(Math.floor((s - T.beat0) / T.beat), Math.floor((T.beatEnd - T.beat0) / T.beat));
  return [s - (T.beat0 + n * T.beat), n + 1];
};
const B = new Vector3(), A = new Vector3();
// a seal anchor (world) in the kit's frame
function anchor(ctx, name, out) {
  const a = ctx.seal.named?.()?.[name];
  if (a) return out.set(a.x - DOCK[0], a.y - DOCK[1], a.z - DOCK[2]);
  const at = ctx.seal.at;
  return out.set(at[0] - DOCK[0], at[1] + 1.2, at[2] - DOCK[2]);
}

export function drive(k, ctx, s) {
  const tt = onTwos(s), [since, falls] = footfall(s), quake = since < 0.25 ? 1 - since / 0.25 : 0;

  // THE PHASES: a set that is empty at this second is not drawn (the draw-call budget); nothing is moved or restyled
  k.rubble.visible = s >= T.skin;
  k.eyes.visible = s >= T.split[0] + 0.1;
  k.gulls.visible = s >= T.gulls;
  k.penguins.visible = s >= T.beat0 - 0.4 && s < 18;
  k.steam.visible = s >= T.swell[0] - 0.1 && s < T.shrink[1] + 1.5;
  k.block.visible = s < T.eat[1] + 1.4;
  // THE PHASES: a set that is empty at this second is not drawn (the draw-call budget); nothing is moved or restyled

  // THE GROUND: the crack races to the Wall, the ice cracks on each footfall, the gap opens and the sea comes in blue
  const gu = k.ground.material.uniforms;
  gu.uCrack.value = smooth(T.crack[0], T.crack[1], s);
  gu.uIce.value = Math.min(1, falls * 0.09 + (s > T.swell[1] ? 0.35 : 0));
  gu.uSea.value = smooth(T.shrink[0], T.gulls + 0.6, s);
  gu.uQuake.value = quake;

  // THE FACES tremble and glow, the skin splits off them, their eyes open ember
  k.faces.forEach((f, i) => {
    const tr = smooth(T.tremble[0], T.tremble[1], s) * (s < SPLIT[i] ? 1 : 0);
    f.position.set(tr * 0.08 * Math.sin(tt * 90 + i), tr * 0.05 * Math.cos(tt * 70 + i), 0);
    const u = f.material.uniforms;
    u.uBreak.value = Math.max(0, s - SPLIT[i]);
    u.uGlow.value.setRGB(1, 0.5, 0.18);
    u.uGlowK.value = tr * 0.3;
  });
  FACES.forEach((f, i) => {
    const open = smooth(SPLIT[i] + 0.1, SPLIT[i] + 0.4, tt), y = f.x === 0 ? 15.37 : 15.19;
    for (const sg of [-1, 1]) put(k.eyes, i * 2 + (sg + 1) / 2, f.x + sg * 1.27, y, zF(f.x) - 1.05, 0.95, Math.max(0.001, 0.62 * open * (0.85 + 0.15 * Math.sin(s * 9 + i))), 0.25);
  });
  k.eyes.instanceMatrix.needsUpdate = true;
  k.titanMat.uniforms.uRib.value = 0.75 * smooth(4.3, 5.2, s) + 0.25 * Math.exp(-since * 9);

  // THE SKIN: plate by plate from the crowned face outward; each tips out, falls and lies as rubble
  let moved = false;
  PLATES.forEach((p, i) => {
    const d = s - T.skin - p.delay;
    if (d < 0) return;
    moved = true;
    const y = p.y - 4.9 * d * d;
    if (y < 0.6) {
      put(k.plates, i, 0, -60, 0, 0.001);
      const zl = p.z + 2.2 + 2 * p.seed;
      put(k.rubble, i * 2, p.x - 0.6, 0.35, zl, 0.55 + 0.4 * p.seed, 0.4, 0.6, p.seed * 3, p.seed * 5, 0);
      put(k.rubble, i * 2 + 1, p.x + 0.7, 0.3, zl + 0.8 * p.seed, 0.45, 0.35, 0.5, p.seed * 7, p.seed * 2, 0);
      return;
    }
    put(k.plates, i, p.x + (p.seed - 0.5) * d * 2, y, p.z + 1.8 * d, 2.96, 2.46, 0.8, -d * (1.2 + p.seed), p.yaw, (p.seed - 0.5) * d);
  });
  if (moved) k.plates.instanceMatrix.needsUpdate = k.rubble.instanceMatrix.needsUpdate = true;

  // THE MARCH crests the horizon and comes on stepping to the beat; once the copies are eaten it sinks into its own steam
  const rise = smooth(T.rise[0], T.rise[1], s), gone = smooth(T.gulls - 1.6, T.gulls - 0.2, s); // the live gap is clear by the flex
  for (const m of [k.marchNear, k.marchFar]) {
    m.position.set(0, -170 * (1 - rise) - 260 * gone, Math.max(0, s - T.rise[0]) * 4);
    m.visible = rise > 0 && gone < 1;
  }
  for (const m of k.marchMats) m.uniforms.uStep.value = Math.max(0, (s - T.beat0) / T.beat);

  k.coat.rotation.set(-(0.45 + 0.3 * Math.abs(Math.sin(tt * 7))), 0, 0.08 * Math.sin(tt * 11));
  k.bell.rotation.z = 0.45 * Math.exp(-since * 1.4) * Math.sin(since * 7) * (falls > 0 ? 1 : 0);
  k.colonyAt.forEach((c, i) => {
    const cheer = s > T.gulls ? Math.abs(Math.sin(tt * 9 + c.seed * 6)) * 0.5 : 0;
    put(k.colony, i, c.x, c.y + cheer, c.z, 0.85, 0.85 * (1 - 0.45 * quake), 0.85, 0, c.yaw + (cheer > 0 ? Math.sin(tt * 5 + i) * 0.6 : 0), 0);
  });
  k.colony.instanceMatrix.needsUpdate = true;

  // THE PENGUINS stampede across the square, waddling and belly-sliding; a footfall tosses a few
  k.penguin.forEach((pg, i) => {
    const age = tt - pg.t0, x = pg.x0 - pg.v * (pg.slide ? 1.6 : 1) * age;
    if (age < 0 || x < -70) { put(k.penguins, i, 0, -60, 0, 0.001); return; }
    let y = 0, spin = 0;
    if (pg.toss && since < 1.1 && falls > 2) { y = Math.max(0, 7 * since - 9 * since * since) * 1.3; spin = since * 9; }
    const wob = Math.sin(age * 14 + pg.seed * 9);
    if (pg.slide) put(k.penguins, i, x, y + 0.18, pg.lane, 1.25, 1.25, 1.25, -Math.PI / 2 + 0.15 + spin, -Math.PI / 2, 0);
    else put(k.penguins, i, x, y + Math.abs(wob) * 0.06, pg.lane, 1.25, 1.25, 1.25, spin, -Math.PI / 2, wob * 0.28);
  });
  k.penguins.instanceMatrix.needsUpdate = true;

  // THE SEAL'S PLACE: the strike, the steam off the shoulders, the ash and the coral, all read the seal's own position
  const S = ctx.seal.at, sx = S[0] - DOCK[0], sz = S[2] - DOCK[2];
  const bolt = s >= T.bolt[0] && s < T.bolt[1] && Math.floor(s * 24) % 3 !== 1;
  k.bolt.visible = k.boltGlow.visible = bolt;
  if (bolt) {
    const cam = ctx.player.camera, yaw = Math.atan2(cam.position.x - S[0], cam.position.z - S[2]);
    k.bolt.position.set(sx + 0.2, 0.6, sz);
    k.bolt.scale.set(16, 75, 1);
    k.bolt.rotation.set(0, yaw, 0);
    k.boltGlow.position.copy(k.bolt.position);
    k.boltGlow.scale.set(24, 75, 1);
    k.boltGlow.rotation.copy(k.bolt.rotation);
  }
  const sm = k.steam.material.uniforms;
  sm.uClock.value = s;
  sm.uPup.value.set(sx, 0, sz);
  sm.uPupK.value = SEAL.scale * pupScale(s);
  k.ash.material.uniforms.uClock.value = tt;
  k.cols.material.uniforms.uClock.value = s;

  // THE BLOCK: eaten top course first, each cube spiralling into the open mouth; before and after, each cube rests in place or is gone
  const ea = s - T.eat[0], span = T.eat[1] - T.eat[0] + 1.2;
  anchor(ctx, "mouth", B);
  const per = (T.eat[1] - T.eat[0] - 0.9) / BLOCK.ny;
  CELLS.forEach(([x, y, z, c], i) => {
    const u = (ea - (BLOCK.ny - 1 - c) * per - hash(i, 7) * per * 0.9) / 0.9;
    if (u <= 0 || ea <= 0) return put(k.block, i, x, y, z, 0.7);
    if (u >= 1 || ea >= span) return put(k.block, i, 0, -60, 0, 0.001);
    const e = u * u * (3 - 2 * u), th = u * Math.PI * 4 + hash(i, 2) * 6, r = 3.2 * Math.sin(Math.PI * u) * (0.6 + 0.4 * hash(i, 3)), sz2 = 0.7 * (1 - 0.8 * e);
    put(k.block, i, x + (B.x - x) * e + Math.cos(th) * r, y + (B.y - y) * e + Math.sin(th) * r, z + (B.z - z) * e, sz2, sz2, sz2, th, th * 0.7, 0);
  });
  k.block.instanceMatrix.needsUpdate = true;
  if (k.crownHead) k.crownHead.visible = s < T.eat[1]; // the titan head behind the block fills the gap until it is eaten

  // THE BLUE CUBE: on the cobbles at the block's foot, then onto the head; flipped and caught on the flex
  const fly = smooth(T.shrink[0], T.shrink[1], s), fl = clamp01((s - T.flip[0]) / (T.flip[1] - T.flip[0]));
  anchor(ctx, "top", A);
  A.y += 0.08;
  const hop = 0.7 * Math.sin(Math.PI * fl), size = 0.72 + (0.24 - 0.72) * fly;
  k.blue.position.set(BLUE_AT[0] + (A.x - BLUE_AT[0]) * fly, BLUE_AT[1] + (A.y + size / 2 + hop - BLUE_AT[1]) * fly + 2.5 * Math.sin(Math.PI * fly), BLUE_AT[2] + (A.z - BLUE_AT[2]) * fly);
  k.blue.rotation.set(fl * Math.PI * 4, ctx.seal.yaw, 0);
  k.blue.scale.setScalar(size);

  // THE GULLS burst off the cliff on the last word of line B and wheel out over the sea
  const ga = s - T.gulls;
  for (let i = 0; i < N.gulls; i++) {
    if (ga < 0) { put(k.gulls, i, 0, -60, 0, 0.001); continue; }
    const wheel = hash(i, 1) * Math.PI * 2 + ga * (0.6 + 0.3 * hash(i, 2));
    const x = (hash(i, 3) - 0.5) * 14 + Math.cos(wheel) * (4 + ga * 1.2);
    const z = -29 - ga * (4 + 3 * hash(i, 4)) + Math.sin(wheel) * (4 + ga * 1.2);
    const y = 12 + 6 * hash(i, 5) + ga * 0.8 + Math.sin(ga * 2 + i) * 1.5;
    const flap = Math.floor(s * 12 + i) % 2 ? 1 : -0.6;
    put(k.gulls, i, x, y, z, 2.2, 2.2 * flap, 2.2, 0.15 * Math.sin(wheel), wheel + Math.PI / 2, -0.4);
  }
  k.gulls.instanceMatrix.needsUpdate = true;
}
