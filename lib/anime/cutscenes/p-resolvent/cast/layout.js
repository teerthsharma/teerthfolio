// p-resolvent CAST layout: ONE place for every stage coordinate this layer uses (metres, world space).
// The hero is at the origin facing +x (scene.seal.yaw = PI/2). Aura stands on the dais at +x facing the hero.
// WORLD/FX agents may mirror these numbers; the cast also publishes the live ones as ctx.castRefs (see index.js).
export const AURA_AT = [4.0, 0.55, 0];        // dais top is y 0.55
export const AURA_YAW = -Math.PI / 2;         // local +z -> world -x (toward the hero)
export const AURA_K = 1.15;                   // x hero height (bible 3.8)
export const SCALE_P0 = [2.5, 1.9, 0];        // fulcrum disc centre
export const SCALE_K = 0.75;                  // scale-local units -> metres
export const FLOOR_Y = 0;                     // ground the broken pieces land on
export const ARMY = { x0: 6.2, dx: 1.1, counts: [8, 9, 10], aisle: 0.9, dz: 0.8, k: 0.8, yaw: -Math.PI / 2, y: 0 };
export const FERN_AT = [-1.6, 0, 3.0];
export const STARK_AT = [-2.5, 0, 2.5];
// bible times (s). scene.js beats of the same name override them (see util.timeOf).
export const T = {
  aura_pop: 1.75, scale_up: 2.4, scale_tip: 3.0, pan_glow: 5.0, scale_tremble: 6.2, release: 7.7, scale_swing: 7.85,
  scale_break: 8.5, army_march: 2.0, army_rock: 7.7, army_kneel: 10.3, bystander_pop: 1.9, flex: 10.9, cracks: 11.4, bow: 16.6,
};
