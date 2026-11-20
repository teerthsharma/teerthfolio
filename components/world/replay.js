// The seen-set and the replay of a place's arrival cutscene. Data and store
// access only (no three, no r3f), so the HUD can import it without the scene chunk.

import { CARDS, cardFor } from "../../lib/world/cutscene/cards";
import { cutsceneMode } from "../../lib/world/cutscene/timeline";
import { live, setUi } from "../../lib/world/store";

// ONE SCENE FOR A GROUP (a card's `plays`): a dock whose card says
// plays: "<id>" arrives as that place's cutscene, and the whole group (the
// id and every card that plays it) is seen at once, so Mount MujoRush's three
// docks share one cinematic, once a session. Built once, at load.
const PLAYS = new Map(CARDS.filter((c) => c.plays).map((c) => [c.id, c.plays]));
export const GROUP = new Map();
for (const c of CARDS) GROUP.set(c.id, [c.id, ...CARDS.filter((o) => o.plays === c.id).map((o) => o.id)]);
export const playsAs = (id) => (id && cardFor(PLAYS.get(id)) ? PLAYS.get(id) : id);
export function seeAll(id) {
  for (const g of GROUP.get(id) ?? [id]) live.seen.add(g);
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
export function saveSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...live.seen]));
  } catch {
    /* no storage */
  }
}
if (typeof window !== "undefined") loadSeen();

// Controller writes the world clock here every frame; replayArrival starts from it.
export const arrivalClock = { t: 0 };

// The panel's "Replay cutscene": forget the place (and its group), close the
// panel, start its arrival as a proximity arrival would.
export function replayArrival(id) {
  const as = playsAs(id);
  if (!as || !cutsceneMode(as) || live.arrival.id) return false;
  for (const g of GROUP.get(as) ?? [as]) live.seen.delete(g);
  saveSeen();
  seeAll(as);
  saveSeen();
  const arrival = live.arrival;
  arrival.id = as;
  arrival.start = arrivalClock.t;
  arrival.keys = new Set(live.keys);
  arrival.target = live.target;
  arrival.stick = live.stick;
  arrival.skip = false;
  setUi({ open: null, cutscene: as });
  return true;
}
