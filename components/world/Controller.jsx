"use client";

// Input -> motion -> "which building is the seal at". Owns no visuals.

import { useFrame } from "@react-three/fiber";
import { MOTION, stepSeal, nearestPlace } from "../../lib/world/motion";
import { GEYSER, LAND_COLLIDERS } from "../../lib/world/land";
import { arrivalHold, arrivalLength, beatAt, cutFor, cutsceneMode } from "../../lib/world/cutscene/timeline";
import { ISLAND_RADIUS, PLACES, districtAt } from "../../lib/world/places";
import { AWAKENING } from "../../lib/world/loop";
import { awakeBeat, awakeMode } from "../../lib/world/awakening";
import { WHIRLPOOL } from "../../lib/world/river";
import { getUi, live, setUi } from "../../lib/world/store";

const COLLIDERS = [...PLACES.map(({ x, z, radius }) => ({ x, z, radius })), ...LAND_COLLIDERS];
// live.props is created once and never reassigned (store.js), so the world
// object can be built once too instead of every frame.
export const WORLD = { colliders: COLLIDERS, radius: ISLAND_RADIUS, props: live.props, whirlpool: WHIRLPOOL, geyser: GEYSER, places: PLACES, time: 0 };
let seenBursts = 0;
let seenWins = 0;
// THE LOOP's hidden win (lib/world/loop.js AWAKENING): once per session, and
// never on a still (?play, ?spawn, ?hud=off), so a capture never ends up inside it.
const WIN_KEY = "seal:loopwin";
function loopWinAllowed() {
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.has("play") || q.has("spawn") || document.documentElement.dataset.hud === "off") return false;
    return !sessionStorage.getItem(WIN_KEY);
  } catch {
    return true; // no storage: once per page load (seenWins only moves forward)
  }
}
// m of open snow between the seal and a place at which its arrival fires
// (nearestPlace's dock reach is 3.2): the cutscene starts on the approach.
const APPROACH_REACH = 7;

// The nearest place within APPROACH_REACH whose arrival has not played yet: a
// seen neighbour must not mask the next one. No allocation (runs every frame).
function nearestUnseen(seal) {
  let best = null;
  let bestGap = APPROACH_REACH;
  for (const place of PLACES) {
    if (live.seen.has(place.id)) continue;
    const gap = Math.hypot(seal.x - place.x, seal.z - place.z) - place.radius - MOTION.sealRadius;
    if (gap < bestGap) {
      bestGap = gap;
      best = place;
    }
  }
  return best;
}

// Places whose arrival cutscene already played this session (lib/world/cutscene/). Storage can be missing or blocked (private windows): then every
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

// A key pressed after the showcase began (not one still held from before it),
// or the HUD's Skip chip, skips it. Taps and drags on the world do not: on a
// touch screen they are how the visitor walks, so they would end every
// arrival a moment after it began.
function freshInput(arrival) {
  for (const k of live.keys) if (!arrival.keys.has(k)) return true;
  return arrival.skip;
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
    // THE ARRIVAL (lib/world/cutscene/): for its first `hold` seconds the
    // seal takes no input and no click target, so it stops for the scene.
    const arrival = live.arrival;
    if (arrival.id && (t - arrival.start >= arrivalLength(arrival.id) || ui.open || freshInput(arrival))) {
      arrival.id = null;
      setUi({ cutscene: null, beat: 0 });
    }
    if (arrival.id) {
      // the cutscene's beat (timeline.js); a skip above clears it in the same frame
      const beat = cutsceneMode(arrival.id) ? beatAt(cutFor(arrival.id)?.tl, t - arrival.start) : awakeMode(arrival.id) ? awakeBeat(t - arrival.start) : 0;
      if (beat !== ui.beat) setUi({ beat });
    }
    const holding = arrival.id && t - arrival.start < arrivalHold(arrival.id);
    const input = ui.open || ui.list || holding ? null : keyInput(live.keys) || live.stick;
    if (input) {
      live.target = null;
      live.pendingOpen = null;
    }

    // THE AWAKENING: the pup coasts to a stop at the loop's exit and stays
    // there while the scene plays round it.
    if (arrival.id === AWAKENING.id) {
      const k = Math.exp(-5 * Math.min(delta, 0.1));
      live.seal.vx *= k;
      live.seal.vz *= k;
    }

    CONTROLS.input = input;
    CONTROLS.target = holding ? null : live.target;
    CONTROLS.boost = live.boost;

    WORLD.time = t;
    WORLD.hold = Boolean(holding); // an arrival hold: penguin bumps and bites wait (snack.js)
    WORLD.arriving = Boolean(arrival.id); // the whole arrival: TNT fuses wait (lib/world/toys.js)
    // While a cutscene holds the seal it stays put: no river current or
    // leftover momentum carrying it away from the scene staged around it
    // (the owner: the awakening's aura drifted off the seal in the river).
    if (holding) {
      live.seal.vx = 0;
      live.seal.vz = 0;
      live.seal.speed = 0;
    }
    // Fixed small steps so a slow frame cannot tunnel the seal through a wall.
    let remaining = holding ? 0 : Math.min(delta, 0.1);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 120);
      stepSeal(live.seal, CONTROLS, dt, WORLD);
      remaining -= dt;
    }

    const seal = live.seal;
    if (seal.bursts !== seenBursts) {
      seenBursts = seal.bursts;
      live.geyser.burstAt = t; // the geyser erupts as it throws the seal
    }
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

    // THE LOOP's win: held back while an arrival plays or a panel is open, then raised.
    if (seal.wins !== seenWins && ui.started && !ui.open && !ui.list && !arrival.id) {
      seenWins = seal.wins;
      if (loopWinAllowed()) {
        try {
          sessionStorage.setItem(WIN_KEY, "1");
        } catch {
          /* no storage */
        }
        live.loopWin.at = t;
        arrival.id = AWAKENING.id;
        arrival.start = t;
        arrival.keys = new Set(live.keys);
        arrival.target = live.target;
        arrival.stick = live.stick;
        arrival.skip = false;
        setUi({ cutscene: AWAKENING.id });
      }
    }

    const near = nearestPlace(seal, PLACES)?.id ?? null;
    if (near !== ui.near) setUi({ near });
    // The arrival is a proximity event: it fires as the seal comes within
    // APPROACH_REACH of a place, before the dock and before a tapped
    // building's panel opens. The place the seal spawns beside (the first
    // 1.5 s, ?spawn= stills) is marked seen without playing; after that a
    // place only counts as seen once its arrival has actually started, so an
    // open panel or another arrival never burns it. With no cutscene to play
    // (?hud=off, for captures) nothing fires and nothing is burnt.
    const near0 = nearestUnseen(seal)?.id ?? null;
    const approach = near0 && cutsceneMode(near0) ? near0 : null;
    if (approach && ui.started && !live.seen.has(approach) && t <= 1.5) {
      live.seen.add(approach);
      saveSeen();
    } else if (approach && ui.started && !live.seen.has(approach) && !ui.open && !arrival.id) {
      live.seen.add(approach);
      saveSeen();
      arrival.id = approach;
      arrival.start = t;
      arrival.keys = new Set(live.keys);
      arrival.target = live.target;
      arrival.stick = live.stick;
      arrival.skip = false;
      setUi({ cutscene: approach });
    }

    // A building that was clicked opens itself once the seal has arrived,
    // after its arrival has played.
    if (live.pendingOpen && !arrival.id && near === live.pendingOpen && seal.speed < 1.2) {
      setUi({ open: near });
      live.pendingOpen = null;
    }
  }, -1.5);
  return null;
}
