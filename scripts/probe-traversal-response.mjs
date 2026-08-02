/**
 * Measures how the piloted character answers the stick, straight from the
 * traversal module. No browser, no renderer: movement feel is a property of
 * lib/polar-traversal.js and a screenshot cannot show a turn rate.
 *
 * Reports, for a run brought to cruise and then given a 90-degree input change:
 * how far the velocity actually turned, how much speed the corner cost, and the
 * slip angle between velocity and input through it.
 *
 * Not a gate. Run it when changing the manual movement constants:
 *   node scripts/probe-traversal-response.mjs
 */
import {
  MANUAL_ACCELERATION,
  MANUAL_BRAKING,
  MANUAL_MAX_SPEED,
  MANUAL_TURN_RATE,
  advanceTraversalFrame,
  createTraversalState,
} from "../lib/polar-traversal.js";

const FRAME = 1 / 60;
const degrees = (radians) => (radians * 180) / Math.PI;
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

function bringToCruise(state, seconds = 3) {
  for (let frame = 0; frame < seconds / FRAME; frame += 1) {
    advanceTraversalFrame(state, { colliders: [], dt: FRAME, input: { x: 1, z: 0 } });
  }
  return Math.hypot(state.vx, state.vz);
}

function cornerResponse(seconds = 0.67) {
  const state = createTraversalState({ x: 0, z: 0 });
  const cruise = bringToCruise(state);
  const inputAngle = Math.PI / 2;
  const samples = [];
  for (let frame = 0; frame < seconds / FRAME; frame += 1) {
    advanceTraversalFrame(state, { colliders: [], dt: FRAME, input: { x: 0, z: 1 } });
    const velocityAngle = Math.atan2(state.vz, state.vx);
    samples.push({
      slip: Math.abs(degrees(wrap(inputAngle - velocityAngle))),
      speed: Math.hypot(state.vx, state.vz),
    });
  }
  const last = samples[samples.length - 1];
  return {
    cruise,
    turned: 90 - last.slip,
    exitSpeed: last.speed,
    scrub: cruise - last.speed,
  };
}

function coastDistance() {
  const state = createTraversalState({ x: 0, z: 0 });
  bringToCruise(state);
  const startX = state.x;
  let frames = 0;
  while (Math.hypot(state.vx, state.vz) > 0.05 && frames < 600) {
    advanceTraversalFrame(state, { colliders: [], dt: FRAME, input: { x: 0, z: 0 } });
    frames += 1;
  }
  return { distance: state.x - startX, seconds: frames * FRAME };
}

const corner = cornerResponse();
const coast = coastDistance();

console.log("traversal response");
console.log(
  `  constants        accel ${MANUAL_ACCELERATION} brake ${MANUAL_BRAKING} cap ${MANUAL_MAX_SPEED} turn ${MANUAL_TURN_RATE}`,
);
console.log(`  cruise speed     ${corner.cruise.toFixed(2)} m/s`);
console.log(`  turn in 0.67s    ${corner.turned.toFixed(1)} deg`);
console.log(
  `  corner cost      ${corner.scrub.toFixed(2)} m/s (exit ${corner.exitSpeed.toFixed(2)})`,
);
console.log(
  `  coast to rest    ${coast.distance.toFixed(2)} m over ${coast.seconds.toFixed(2)}s`,
);
