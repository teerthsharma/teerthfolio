// The hidden rule: the third time the seal bumps a penguin it turns into a
// snack; the next touch eats it; it comes back as a plain penguin elsewhere.
// Pure (no React, no Three): Penguins.jsx calls tickSnack once per penguin per
// frame, scripts/check-world.mjs drives it headless. Bump counting and the
// "touch eats it" contact live in lib/world/motion.js stepProps.

export const BUMPS_TO_SNACK = 3;
const POP_GRACE = 0.7; // s after turning edible before a touch can eat it
const RESPAWN_AFTER = 8; // s gone before a penguin may return
const RESPAWN_FAR = 18; // m from the seal its return spot must be

// L = { seal, props, gulp, squeak, eat: { n, x, z } } (the store's `live`).
export function tickSnack(p, t, flock, L) {
  if (p.gone) {
    if (t - p.goneAt < RESPAWN_AFTER) return;
    let best = null;
    let bestD = RESPAWN_FAR;
    for (const q of flock) {
      const d = Math.hypot(q.homeX - L.seal.x, q.homeZ - L.seal.z);
      if (d > bestD) { bestD = d; best = q; }
    }
    if (!best) return;
    p.x = best.homeX + (p.rand() - 0.5) * 2;
    p.z = best.homeZ + (p.rand() - 0.5) * 2;
    p.vx = p.vz = 0;
    p.homeX = best.homeX;
    p.homeZ = best.homeZ;
    p.bumps = 0;
    p.edible = p.eaten = p.gone = false;
    p.state = "wander";
    p.hasTarget = false;
    p.hit = p.prevHit = 0;
    p.respawnAt = t;
    L.props.push(p);
  } else if (p.eaten) {
    if (t - p.edibleAt < POP_GRACE) { p.eaten = false; return; } // let the transform be seen
    p.gone = true;
    p.goneAt = t;
    const i = L.props.indexOf(p);
    if (i !== -1) L.props.splice(i, 1);
    L.gulp = (L.gulp ?? 0) + 1; // the fish gulp: sound, heart and puffs already hook this
    L.seal.impact = Math.max(L.seal.impact, 0.35); // the happy squash on the pup
    L.eat = { n: (L.eat?.n ?? 0) + 1, x: p.x, z: p.z };
  } else if (!p.edible && p.bumps >= BUMPS_TO_SNACK) {
    p.edible = true;
    p.edibleAt = t; // it keeps its slide; the prop friction stops it
    p.state = "wander";
    L.squeak = (L.squeak ?? 0) + 1; // the pop's chirp
  }
}
