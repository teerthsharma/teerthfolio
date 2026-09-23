"use client";

// Input -> motion -> "which building is the seal at". Owns no visuals.

import { useFrame } from "@react-three/fiber";
import { stepSeal, nearestPlace } from "../../lib/world/motion";
import { ISLAND_RADIUS, PLACES } from "../../lib/world/places";
import { getUi, live, setUi } from "../../lib/world/store";

const COLLIDERS = PLACES.map(({ x, z, radius }) => ({ x, z, radius }));

function keyInput(keys) {
  let x = 0;
  let z = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) z -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) z += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  return x || z ? { x, z } : null;
}

export default function Controller() {
  useFrame((_, delta) => {
    const ui = getUi();
    const input = ui.open || ui.list ? null : keyInput(live.keys) || live.stick;
    if (input) live.target = null;

    // Fixed small steps so a slow frame cannot tunnel the seal through a wall.
    let remaining = Math.min(delta, 0.1);
    const world = { colliders: COLLIDERS, radius: ISLAND_RADIUS, props: live.props };
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 120);
      stepSeal(live.seal, { input, target: live.target, boost: live.boost }, dt, world);
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
  });
  return null;
}
