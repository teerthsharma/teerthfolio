"use client";

// Input -> motion -> "which building is the seal at". Owns no visuals.

import { useFrame } from "@react-three/fiber";
import { stepSeal, nearestPlace } from "../../lib/world/motion";
import { LAND_COLLIDERS } from "../../lib/world/land";
import { ARRIVAL } from "../../lib/world/moments";
import { ISLAND_RADIUS, PLACES, districtAt } from "../../lib/world/places";
import { WHIRLPOOL } from "../../lib/world/river";
import { getUi, live, setUi } from "../../lib/world/store";

const COLLIDERS = [...PLACES.map(({ x, z, radius }) => ({ x, z, radius })), ...LAND_COLLIDERS];
// live.props is created once and never reassigned (store.js), so the world
// object can be built once too instead of every frame.
const WORLD = { colliders: COLLIDERS, radius: ISLAND_RADIUS, props: live.props, whirlpool: WHIRLPOOL, places: PLACES };

// Places whose arrival showcase already played this session (moments.js
// ARRIVAL). Storage can be missing or blocked (private windows): then every
// place plays once per page load instead.
const SEEN_KEY = "seal:seen";
function loadSeen() {
  try {
    for (const id of JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]")) live.seen.add(id);
  } catch {
    /* no storage: once per page load */
  }
}
function saveSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...live.seen]));
  } catch {
    /* no storage */
  }
}
if (typeof window !== "undefined") loadSeen();

// A key, tap or click the visitor made after the showcase began (not one
// still held from before it) skips it.
function freshInput(arrival) {
  for (const k of live.keys) if (!arrival.keys.has(k)) return true;
  return (live.target && live.target !== arrival.target) || (live.stick && !arrival.stick);
}

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
  useFrame((state, delta) => {
    const ui = getUi();
    const t = state.clock.elapsedTime;
    // THE ARRIVAL (moments.js): for its first `hold` seconds the seal takes
    // no input and no click target, so it stops to look round.
    const arrival = live.arrival;
    if (arrival.id && (t - arrival.start >= ARRIVAL.duration || ui.open || freshInput(arrival))) {
      arrival.id = null;
      setUi({ cutscene: null });
    }
    const holding = arrival.id && t - arrival.start < ARRIVAL.hold;
    const input = ui.open || ui.list || holding ? null : keyInput(live.keys) || live.stick;
    if (input) {
      live.target = null;
      live.pendingOpen = null;
    }

    CONTROLS.input = input;
    CONTROLS.target = holding ? null : live.target;
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

    // The radiation clock: which area the seal is in and when it crossed.
    // Spawning straight into one (?spawn=, the first second) mutates
    // without the show.
    const district = districtAt(seal.x, seal.z);
    const radId = district?.radiation ? district.id : null; // the igloo is neutral
    if (radId !== live.rad.id) {
      live.rad.id = radId;
      if (district) live.rad.color = district.radiation;
      live.rad.start = t < 1.5 ? -100 : t;
    }

    const near = nearestPlace(seal, PLACES)?.id ?? null;
    if (near !== ui.near) setUi({ near });
    if (near && ui.started && !live.seen.has(near)) {
      live.seen.add(near);
      saveSeen();
      if (t > 1.5 && !ui.open && !arrival.id) {
        arrival.id = near;
        arrival.start = t;
        arrival.keys = new Set(live.keys);
        arrival.target = live.target;
        arrival.stick = live.stick;
        setUi({ cutscene: near });
      }
    }

    // A building that was clicked opens itself once the seal has arrived.
    if (live.pendingOpen && near === live.pendingOpen && seal.speed < 1.2) {
      setUi({ open: near });
      live.pendingOpen = null;
    }
  }, -1.5);
  return null;
}
