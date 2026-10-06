// FX layer for p-monodromy (FX agent): energy, beams, shockwaves, particles, magic circles, impact flashes. Layer 1.
// Impact frames and speed lines are NOT built here: fire them from scene.js beats or ctx.sakuga (see CONTRACT.md).
// An fx object that belongs to the static plate (a far glow card) sets userData.layer = 0. The seal stays out of bloom (never emissive).
// STUB: nothing yet.
export default function build(ctx) {
  const group = new ctx.THREE.Group();
  return { group, update() {} /* (t, dt, cue) */, dispose() {} };
}
