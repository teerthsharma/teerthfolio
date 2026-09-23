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
  ready: false, // first WebGL frame has rendered
  near: null, // id of the building the seal is at
  open: null, // id of the building whose panel is open
  list: false, // the all-projects list is open
  sound: true,
  failed: false, // WebGL could not start; the overlay shows the list instead
};

export const live = {
  seal: createSeal(SPAWN.x, SPAWN.z, SPAWN.heading),
  keys: new Set(),
  stick: null, // { x, z } from a touch drag, or null
  target: null, // { x, z } from a click or tap on the ground, or null
  pendingOpen: null, // building id to open once the seal arrives there
  boost: false,
  props: [],
};

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
