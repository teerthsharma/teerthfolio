"use client";

// Input -> motion -> "which building is the seal at". Owns no visuals.

import { useFrame } from "@react-three/fiber";
import { stepSeal, nearestPlace } from "../../lib/world/motion";
import { ISLAND_RADIUS, PLACES } from "../../lib/world/places";
import { getUi, live, setUi } from "../../lib/world/store";

const COLLIDERS = PLACES.map(({ x, z, radius }) => ({ x, z, radius }));
// live.props is created once and never reassigned (store.js), so the world
// object can be built once too instead of every frame.
const WORLD = { colliders: COLLIDERS, radius: ISLAND_RADIUS, props: live.props };

// Reused across every frame and substep so Controller allocates nothing in
// useFrame: keyInput writes into KEY_INPUT, and stepSeal reads CONTROLS.
const KEY_INPUT = { x: 0, z: 0 };
const CONTROLS = { input: null, target: null, boost: false };

function keyInput(keys) {
  let x = 0;
  let z = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) z -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) z += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  if (!x && !z) return null;
  KEY_INPUT.x = x;
  KEY_INPUT.z = z;
  return KEY_INPUT;
}

export default function Controller() {
  // Priority -1.5: physics steps before CameraRig and Seal, which subscribe
  // at 0 and -1. -1 alone left the order dependent on subscribe order (Seal
  // only ran after Controller because its Suspense boundary delayed mount);
  // -1.5 wins outright.
  useFrame((_, delta) => {
    const ui = getUi();
    const input = ui.open || ui.list ? null : keyInput(live.keys) || live.stick;
    if (input) {
      live.target = null;
      live.pendingOpen = null;
    }

    CONTROLS.input = input;
    CONTROLS.target = live.target;
    CONTROLS.boost = live.boost;

    // Fixed small steps so a slow frame cannot tunnel the seal through a wall.
    let remaining = Math.min(delta, 0.1);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 120);
      stepSeal(live.seal, CONTROLS, dt, WORLD);
      remaining -= dt;
    }

    const seal = live.seal;
    if (live.target && Math.hypot(live.target.x - seal.x, live.target.z - seal.z) < 0.3 && seal.speed < 0.3) {
      live.target = null;
    }

    const near = nearestPlace(seal, PLACES)?.id ?? null;
    if (near !== ui.near) setUi({ near });

    // A building that was clicked opens itself once the seal has arrived.
    if (live.pendingOpen && near === live.pendingOpen && seal.speed < 1.2) {
      setUi({ open: near });
      live.pendingOpen = null;
    }
  }, -1.5);
  return null;
}
