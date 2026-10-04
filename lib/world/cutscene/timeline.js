// THE CUTSCENE CLOCK: every place's first arrival (Controller.jsx) plays one
// timeline, read from seconds since live.arrival.start:
//
//   sign -> impact -> stage bloom -> speaker in -> line A -> move -> line B -> collapse
//
// The beats come from the place's card (cards/<id>.js): `length` stretches
// the two lines, `beats` overrides any beat outright. Aether-Lang's approved
// Domain Expansion is the default at 8.2 s. Pure: the 3D half is
// components/world/cutscene/, the comic half components/world/ui/Bubbles.jsx,
// the pup's poses seal/variants/D.jsx, the camera CameraRig.jsx.

import { PLACE_BY_ID } from "../places.js";
import { cardFor } from "./cards/index.js";

// The pup's pose hooks a move may write into live.pose (seal/variants/D.jsx).
export const POSES = ["sign", "fist", "raise", "crouch", "sit", "point", "spin"];

export const LENGTH = 8.2; // s: two lines need reading time; any key still skips at once
export const READ = 2.4; // s: the least a line is up

// The beats for a card. The opening (sign to line A) is fixed; line B gets
// READ before the collapse and line A the rest; the move leads into line B.
const TIMELINES = new Map();
export function timelineFor(card) {
  if (!card) return null;
  let tl = TIMELINES.get(card);
  if (!tl) {
    const L = card.length ?? LENGTH;
    const ms = (x) => Math.round(x * 1000) / 1000; // 8.2 - 0.8 is 7.3999...
    const lineB = ms(L - 0.8 - READ);
    tl = {
      duration: L,
      hold: ms(L - 0.4), // input waits this long (any fresh key still skips)
      frame: 0.7, // the camera settles on the two-shot
      sign: [0.45, 1.05], // the pup's opening gesture
      impact: 1.15, // the first impact frame; the stage blooms on it
      bloom: [1.15, 1.6],
      enter: 1.95, // the speaker steps in, on twos
      lineA: 2.3,
      move: [ms(lineB - 0.6), lineB],
      lineB,
      collapse: [ms(L - 0.8), ms(L - 0.4)],
      radius: 16, // m: the stage's sphere, well past the camera
      ...card.beats,
    };
    TIMELINES.set(card, tl);
  }
  return tl;
}

let rm = null; // read once, like CameraRig
const reduced = () => (rm ??= typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
const hudOff = () => typeof document !== "undefined" && document.documentElement.dataset.hud === "off";

// "full": the cutscene plays; "still": reduced motion, the speaker and both
// bubbles stand still over the plain world; null: no cutscene (no card, or
// ?hud=off, which is for captures and never fires one).
export function cutsceneMode(id) {
  if (!id || !cardFor(id) || hudOff()) return null;
  return reduced() ? "still" : "full";
}

export const arrivalLength = (id) => timelineFor(cardFor(id))?.duration ?? 0;
export const arrivalHold = (id) => timelineFor(cardFor(id))?.hold ?? 0;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export { smooth };
// Stepped animation, on twos: 12 drawings a second.
export const onTwos = (t) => Math.floor(t * 12) / 12;

// ui.beat: 0 off, 1 the sign, 2 impact, 3 the bloom (the onomatopoeia),
// 4 the speaker, 5 line A, 6 the move (line A still up), 7 line B,
// 8 the collapse, 9 out.
export const BEAT = { off: 0, sign: 1, impact: 2, bloom: 3, speaker: 4, lineA: 5, move: 6, lineB: 7, collapse: 8, out: 9 };
export function beatAt(tl, t) {
  if (!tl || t < 0 || t >= tl.duration) return 0;
  if (t < tl.impact) return 1;
  if (t < tl.impact + 0.12) return 2;
  if (t < tl.enter) return 3;
  if (t < tl.lineA) return 4;
  if (t < tl.move[0]) return 5;
  if (t < tl.lineB) return 6;
  if (t < tl.collapse[0]) return 7;
  if (t < tl.collapse[1]) return 8;
  return 9;
}

// How far the opening gesture is up (0..1): rises over `sign`, down after the collapse.
export const signAt = (tl, t) => smooth(tl.sign[0], tl.sign[1], t) * (1 - smooth(tl.collapse[1], tl.duration, t));
// How far the move is in (0..1): rises over `move`, held to the collapse.
export const moveAt = (tl, t) => smooth(tl.move[0], tl.move[1], t) * (1 - smooth(tl.collapse[1], tl.duration, t));

// The stage's radius (m): out from the pup on the impact, back in on the collapse.
export function radiusAt(tl, t) {
  // smoothstep both ways: the swell is slow enough at the start to be seen
  // from outside before it passes the camera
  const k = smooth(tl.bloom[0], tl.bloom[1], t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
  return k > 0 ? tl.radius * k : 0;
}

// How far the camera has moved onto the two-shot (0..1).
export const viewAt = (tl, t) => smooth(0, tl.frame, t) * (1 - smooth(tl.collapse[1], tl.duration, t));

// THE TWO-SHOT. A figure speaker stands right of the pup and behind it; the
// camera frames both from the front, low (the pup faces +z, the follow
// camera looks -z), so the pair sits above the bubbles in the lower half. A
// portrait screen stands back a little further to keep both in. When the
// land speaks, the whole rig turns about the pup so the place stands where
// the figure would.
export const FIGURE_AT = [1.7, 0, -3.2];
export const FIGURE_SCALE = 1.12;
export const MOUTH_Y = 1.78; // m above a tall figure's feet, before its scale
const LOOK = [0.7, 0.6, -1.0];
const EYE = [-0.1, 0.85, 7.4];
const LOOK_TALL = [0.55, 0.6, -1.0];
const EYE_TALL = [-0.1, 0.95, 8.8];
export const PUP_YAW = 0.6; // three-quarters to the lens, facing the speaker

// Where the land speaks from: the card's `landAt`, else the place's look point.
export function landPoint(card, place) {
  const at = card.landAt ?? place.look;
  return at ? { x: at.x, y: at.y ?? 2, z: at.z } : { x: place.x, y: 2, z: place.z };
}

// The rig's turn (rad) about the pup at (x, z): 0 for a figure.
export function turnFor(card, place, x, z) {
  if (card.speaker !== "land") return 0;
  const at = landPoint(card, place);
  return Math.atan2(at.x - x, at.z - z) - Math.atan2(FIGURE_AT[0], FIGURE_AT[2]);
}

// The two-shot for a pup at (x, z) on a screen of this aspect: writes the
// eye and the look-at point (Vector3s).
// When the land speaks the same two-shot stands back about the pup, so the
// pup keeps its place on screen (above the bubbles) and the landform, where
// the figure would stand but further off, fills the right of the frame.
const LAND = [[0, 0, 0], [0, 0, 0]]; // reused: CameraRig asks every frame
function landRig(card, place, x, z, aspect) {
  const at = landPoint(card, place);
  const d = Math.hypot(at.x - x, at.z - z);
  const k = Math.min(1.8, Math.max(1, (0.6 * d) / Math.hypot(FIGURE_AT[0], FIGURE_AT[2])));
  const [L0, E0] = aspect < 1 ? [LOOK_TALL, EYE_TALL] : [LOOK, EYE];
  for (let i = 0; i < 3; i++) {
    LAND[0][i] = L0[i] * k;
    LAND[1][i] = E0[i] * k;
  }
  return LAND;
}

export function cutView(card, place, x, z, aspect, eye, look) {
  const [L, E] = card.view ?? (card.speaker === "land" ? landRig(card, place, x, z, aspect) : aspect < 1 ? [LOOK_TALL, EYE_TALL] : [LOOK, EYE]);
  const a = turnFor(card, place, x, z);
  const c = Math.cos(a);
  const s = Math.sin(a);
  // a turn of a about +y: (x, z) -> (x cos a + z sin a, z cos a - x sin a)
  look.set(x + L[0] * c + L[2] * s, L[1], z + L[2] * c - L[0] * s);
  eye.set(look.x + E[0] * c + E[2] * s, look.y + E[1], look.z + E[2] * c - E[0] * s);
}

// Everything a frame of the cutscene needs, for the place now arriving.
export function cutFor(id) {
  const card = cardFor(id);
  const place = PLACE_BY_ID[id];
  return card && place ? { card, place, tl: timelineFor(card) } : null;
}

// A figure speaker's proportions: width, height and head size against the
// tall one (Aether-Lang's). Speaker.jsx builds from these; the bubbles aim
// their tails at the mouth from them.
export const BUILDS = {
  tall: { w: 1, h: 1, head: 1 },
  broad: { w: 1.28, h: 0.96, head: 0.95 },
  small: { w: 0.85, h: 0.6, head: 1.35 },
};
export const figureAt = (card) => card.speaker?.at ?? FIGURE_AT;
export const figureScale = (card) => FIGURE_SCALE * (card.speaker?.scale ?? 1);
const mouthY = (card) => {
  const b = BUILDS[card.speaker?.build] ?? BUILDS.tall;
  return b === BUILDS.tall ? MOUTH_Y : 1.9 * b.h - 0.12 * b.head;
};

// Where a line's bubble points its tail (world space) for a pup at (x, z):
// the figure's mouth, the landform, or the pup's own head.
export function anchorFor(who, card, place, x, z, out, slot, pupAt) {
  // a card may aim a tail outright: `tail: { a: [x, y, z] in the figure frame, b: "pup" }`
  const tail = slot && card.tail?.[slot];
  if (tail === "pup" && pupAt) return out.set(pupAt.x, pupAt.y, pupAt.z);
  if (Array.isArray(tail)) {
    const a = landPoint(card, place);
    const k = card.view ? 1 : Math.min(1.8, Math.max(1, (0.6 * Math.hypot(a.x - x, a.z - z)) / Math.hypot(FIGURE_AT[0], FIGURE_AT[2])));
    const turn = turnFor(card, place, x, z);
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    return out.set(x + (tail[0] * c + tail[2] * s) * k, tail[1] * k, z + (tail[2] * c - tail[0] * s) * k);
  }
  if (who === "seal") return out.set(x, 1.0, z);
  if (who === "land") {
    const a = landPoint(card, place);
    return out.set(a.x, a.y, a.z);
  }
  const at = figureAt(card);
  return out.set(x + at[0], at[1] + mouthY(card) * figureScale(card), z + at[2]);
}
