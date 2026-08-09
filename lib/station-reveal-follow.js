/**
 * Follow-through for the one pose every station shares: its reveal scale.
 *
 * Reveal scale used to be assigned straight from a branch, so docking snapped a
 * station root from 1 to its hero scale — as much as 1.88 — in a single frame, and
 * undocking snapped it back. A building that changes size instantaneously has no
 * mass, and it was the largest motion defect the stations had.
 *
 * WHY THIS IS RENDER-SIDE AND NOT IN lib/polar-station-mechanisms.
 * The simulation decides WHICH phase a station is in, and its contracts assert those
 * transitions to the frame — 246 assertions in the northeast contract alone. Putting
 * a spring on `proximity`, which is what the simulation reads, was tried and is wrong
 * twice over: the contracts rejected it immediately, and it was wrong on its own terms,
 * because the spring's undershoot drove proximity below zero where it clamps, so a
 * station shut down FASTER than the seal left. Proximity is a semantic gate, not a
 * pose. Scale is consumed only by the mesh, so lagging it changes how a station
 * arrives at a pose and never changes which pose it is in.
 *
 * Damping below 1 is deliberate: the small overshoot past the target is what reads as
 * weight. Critically damped would remove the pop without adding the settle.
 */
export const REVEAL_SCALE_FOLLOW = Object.freeze({
  dampingRatio: 0.66,
  // Settling time is roughly 4/(zeta*omega): about 0.38s here. Slower than this and a
  // docked station is still growing well after the camera has composed on it.
  naturalFrequency: 16,
});

// A frame this long is a stall, not a frame. Integrating the real delta after a
// backgrounded tab launches the spring hard enough to visibly snap, which is the
// artefact this whole function exists to remove.
const MAX_FOLLOW_STEP_SECONDS = 1 / 30;

/**
 * Advances `follow` toward `target` and returns the new value.
 * `follow` is `{ value, velocity }` and is mutated in place.
 *
 * Semi-implicit Euler: stable at frame rates this runs at, two multiply-adds, and no
 * branch on the damping regime — unlike the analytic solution the dome lattice uses,
 * which is exact but pays a branch and several transcendentals per call.
 */
export function stepRevealScaleFollow(follow, target, deltaSeconds) {
  const dt = Math.min(Math.max(deltaSeconds, 0), MAX_FOLLOW_STEP_SECONDS);
  const omega = REVEAL_SCALE_FOLLOW.naturalFrequency;
  const zeta = REVEAL_SCALE_FOLLOW.dampingRatio;
  follow.velocity +=
    (-2 * zeta * omega * follow.velocity - omega * omega * (follow.value - target)) * dt;
  follow.value += follow.velocity * dt;
  return follow.value;
}

/**
 * Per-root spring state, keyed weakly so a disposed station root takes its spring
 * with it. Seeded at the target so a station's first visible frame is its pose
 * rather than a spring launching from somewhere else.
 */
const follows = new WeakMap();

export function followRevealScale(root, target, deltaSeconds, reducedMotion) {
  if (reducedMotion) {
    // Pinned, not frozen: the pose still resolves, it just arrives with no lag.
    follows.delete(root);
    return target;
  }
  let follow = follows.get(root);
  if (!follow) {
    follow = { value: target, velocity: 0 };
    follows.set(root, follow);
    return follow.value;
  }
  return stepRevealScaleFollow(follow, target, deltaSeconds);
}
