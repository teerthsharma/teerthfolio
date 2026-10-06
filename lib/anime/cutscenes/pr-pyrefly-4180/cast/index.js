// CAST layer for pr-pyrefly-4180 (CAST agent): the villain's small-seal victims and extras, props the seal wields, the opponent.
// Layer 1 (redrawn every step). Law L6b: NO silhouettes; victims are costumed SEALS (costumed-seal-kit), in the opponent's costume.
//   const v = ctx.kit.costumedSeal(ctx.engine, { ...ctx.kit.COSTUMES.shinigami, scale: 0.55 });
//   v.place(x, 0, z, yaw); group.add(v.group);          each frame:  v.react("recoil", k); v.update(t, dt);
// The hero seal is ctx.seal (locked, never restyled); attach costume parts to it with ctx.seal.attach(obj). The hero is never covered.
// STUB: no cast yet.
export default function build(ctx) {
  const group = new ctx.THREE.Group();
  return { group, update() {} /* (t, dt, cue) */, dispose() {} };
}
