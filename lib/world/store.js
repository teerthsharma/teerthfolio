// One tiny store shared by the 3D scene and the HTML overlay.
//
// `ui` is React state (what the overlay renders): which building the seal is
// near, which one is open, whether the intro is showing. It changes a few
// times a minute, so it goes through useSyncExternalStore.
//
// `live` is per-frame state (seal position, input, click target). It changes
// 60 times a second and must never trigger a React render, so it is a plain
// mutable object read inside useFrame.

import { useSyncExternalStore } from "react";
import { createSeal } from "./motion";
import { SPAWN } from "./places";

const listeners = new Set();

let ui = {
  started: false, // the visitor has dismissed the intro card
  ready: false, // the world has drawn and the loading screen measured its rung
  tier: null, // quality.js rung (Look.jsx picks it, FirstFrame and the monitor move it)
  tierCap: 4, // the highest rung still worth trying: a rung that fails lowers it
  tierFrom: null, // "pin" (?look=), "recall" (localStorage) or "guess" (renderer string)
  display: undefined, // Display picker: "auto" | "low" | "medium" | "high"; null while ?look= pins; undefined until Look.jsx reads storage
  gpu: "", // short GPU name for the picker's "Auto" line
  settings: false, // the Display popover in the top bar is open
  near: null, // id of the building the seal is at
  open: null, // id of the building whose panel is open
  list: false, // the all-projects list is open
  sound: true,
  failed: false, // WebGL could not start; the overlay shows the list instead
  beat: 0, // lib/world/cutscene/timeline.js beatAt: 0 off .. 9 out (Controller.jsx writes it)
  cutscene: null, // id of the place whose first-arrival cutscene is playing (lib/world/cutscene/)
};

export const live = {
  seal: createSeal(SPAWN.x, SPAWN.z, SPAWN.heading),
  keys: new Set(),
  stick: null, // { x, z } from a touch drag, or null
  target: null, // { x, z } from a click or tap on the ground, or null
  pendingOpen: null, // building id to open once the seal arrives there
  boost: false,
  props: [], // created once; seeders push and splice their own entries, never reassign
  stroke: 0, // Seal.jsx increments it once per galumph push
  gulp: 0, // Props.jsx: the seal ate a fish
  squeak: 0, // Penguins.jsx: a penguin was shoved
  eat: { n: 0, x: 0, z: 0 }, // life/snack.js: where the seal last ate a penguin
  boom: { n: 0, x: 0, z: 0, q: [] }, // lib/world/toys.js: a TNT blast went off (q: blasts Blast.jsx has yet to draw)
  cheer: { n: 0, x: 0, z: 0 }, // lib/world/toys.js: a bowling strike
  fizz: 0, // lib/world/toys.js: a TNT fuse was lit
  zoom: 1, // wheel / pinch camera distance factor: SealGame.jsx writes it, CameraRig.jsx reads it
  // The radioactive area the seal is in and when it crossed in (or out),
  // on the clock of useFrame's state.clock: Controller.jsx writes it,
  // every radiation moment times itself from it (moments.js RADIATION).
  rad: { id: null, color: "#ffffff", start: -100 },
  inStage: false, // the camera is inside a cutscene's stage (cutscene/Stage.jsx): the radiation shimmer rests
  stageOn: false, // a cutscene is playing (cutscene/Cutscene.jsx): the radiation flood waits, so the sign opens on a clear view
  // FrameGuard (cutscene/FrameGuard.jsx) <-> the bubbles (ui/Bubbles.jsx place()): each laid-out bubble's px rect [x0,top,x1,bottom] by slot (a,b,c, then the credit card) with its performance.now() stamp, and flip=1 mirrors the bubbles to the other lower side.
  frame: { r: new Float32Array(16), at: new Float64Array(4), flip: 0 },
  // The pup's cutscene pose hooks, 0..1 (cutscene/kit.jsx; seal/variants/D.jsx reads them).
  pose: { sign: 0, fist: 0, raise: 0, crouch: 0, sit: 0, point: 0, pray: 0, spin: 0, mouth: 0, ring: 0, demon: 0, eyes: 0, blink: 0 },
  // The first-arrival cutscene (lib/world/cutscene/) and the places seen this
  // session (Controller.jsx loads and saves them in sessionStorage).
  arrival: { id: null, start: -100, keys: null, target: null, stick: null, skip: false },
  lastArrivalEnd: -100, // clock when the last arrival ended (Controller.jsx): a 4 s cooldown before the next fires
  movedSinceArrival: true, // the seal has walked since that arrival ended: a pup set back at its dock cannot chain into a neighbour
  // The geyser's off-beat eruption: set to the clock when it throws the seal
  // (Controller.jsx), so its visual erupts then too (components/world/land/IceDam.jsx).
  geyser: { burstAt: -100 },
  // THE LOOP's hidden win (lib/world/loop.js, Controller.jsx): { at } the clock
  // when three clean loops in a row raised the `loop-awakening` cutscene; the
  // scene that plays it times itself from live.arrival.start.
  loopWin: { at: -100 },
  // While the awakening plays (LoopAwakening.jsx): where the pup's mouth is
  // drawn, for the bubble's tail (ui/AwakeningLayer.jsx).
  awake: { on: false, x: 0, y: 0, z: 0 },
  seen: new Set(),
};
// 0..1, how deep into the Buddha-seal meditation pose the seal is: Seal.jsx
// (D.jsx) sets it from drive.idle; other tracks may read it (motes drifting
// in, a Geiger-to-chime cue) without owning the seal's own pose.
live.seal.calm = 0;
// A radiation mote touched the seal: components/world/life/Radiation.jsx
// sets both on every contact (elapsedTime, that district's radiation hex),
// so Seal.jsx can mutate/flash and Sound.jsx can play the absorb chime
// without either owning the mote system.
live.seal.absorbAt = 0;
live.seal.absorbColor = null;

export function getUi() {
  return ui;
}

export function setUi(patch) {
  const next = { ...ui, ...(typeof patch === "function" ? patch(ui) : patch) };
  for (const key in next) {
    if (next[key] !== ui[key]) {
      ui = next;
      listeners.forEach((fn) => fn());
      return;
    }
  }
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useUi(select = (s) => s) {
  return useSyncExternalStore(subscribe, () => select(ui), () => select(ui));
}

// Send the seal to a point (click-to-move, or "take me there" from the list).
export function travelTo(x, z) {
  live.target = { x, z };
}
