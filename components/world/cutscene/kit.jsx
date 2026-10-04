"use client";

// THE CUTSCENE KIT: what a dock's move (moves/<id>.jsx) builds from.
//
//   <Stage {...cut} />    the bloom: night in the place's colour, stars, the
//                         world switched off (the landform kept if it speaks)
//   <Speaker {...cut} />  the ink figure from the card (nothing for "land")
//   useCutFrame(fn)       fn(t, state, dt) every frame of the scene, t in s
//                         from its start, before the pup is posed: write
//                         live.pose here
//   live.pose             the pup's pose hooks, 0..1 each, zeroed every
//                         frame: sign, fist, raise, crouch, sit, point, spin
//                         (spin: 1 is one full turn). seal/variants/D.jsx.
//   signAt, moveAt, smooth, onTwos   the timeline's ramps (timeline.js)
//
// `cut` is the move's props: { card, place, tl (the beats), mode ("full" |
// "still": reduced motion, where nothing should move) }. The bubbles, the
// impact frames and the onomatopoeia are drawn by the HUD from the card
// (ui/Bubbles.jsx), so a move is 3D only. Keep it cheap by construction: a
// few meshes, instanced particles, halftone in the material, no post pass.

import { useFrame } from "@react-three/fiber";
import { moveAt, signAt, smooth } from "../../../lib/world/cutscene/timeline";
export { POSES } from "../../../lib/world/cutscene/timeline";
import { live } from "../../../lib/world/store";
import Speaker from "./Speaker";
import Stage from "./Stage";

export { Speaker, Stage };
export { moveAt, onTwos, signAt, smooth } from "../../../lib/world/cutscene/timeline";

// Runs after the host zeroes live.pose (-1.3) and before the pup reads it (Seal.jsx -1, D.jsx 0).
export function useCutFrame(fn) {
  useFrame((state, dt) => {
    const a = live.arrival;
    if (a.id) fn(state.clock.elapsedTime - a.start, state, dt);
  }, -1.2);
}

// THE DEFAULT MOVE: the stage in the place's colour, its speaker, and the
// pup in the card's pose: `move.pose` rises with the opening sign and, if
// the card has one, turns into `move.then` on the move beat.
export function DefaultMove(cut) {
  const { card, tl, mode } = cut;
  useCutFrame((t) => {
    const { pose, then } = card.move ?? {};
    if (mode !== "full") return;
    const turn = then ? moveAt(tl, t) : 0;
    // a spin turns once and stays turned; every other hook rises and falls
    if (pose) live.pose[pose] = pose === "spin" ? smooth(tl.sign[0], tl.sign[1], t) : signAt(tl, t) * (1 - turn);
    if (then) live.pose[then] = then === "spin" ? smooth(tl.move[0], tl.move[1], t) : Math.max(live.pose[then], turn);
  });
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
    </>
  );
}
