"use client";

// THE CUTSCENE HOST: mounts the arriving place's move (moves/<id>.jsx) for
// as long as its first arrival plays (Controller.jsx), and zeroes the pup's
// pose hooks every frame so a move only writes the ones it wants. Nothing
// here is per place: a dock's scene lives in its own card and move.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { CARDS } from "../../../lib/world/cutscene/cards";
import { POSES, cutFor, cutsceneMode } from "../../../lib/world/cutscene/timeline";
import { live, useUi } from "../../../lib/world/store";
import { MOVES } from "./moves";
import PupUpright from "./PupUpright";

export default function Cutscene() {
  const gl = useThree((s) => s.gl);
  const clock = useThree((s) => s.clock);
  const scene = useThree((s) => s.scene);
  // For capture probes: draw calls and triangles (gl.info) during the scene,
  // the cards (a probe may swap a card's move.pose to read each hook) and
  // the live state (where the seal is).
  useEffect(() => {
    window.__world = { ...(window.__world || {}), gl, clock, scene, cards: CARDS, live };
  }, [gl, clock, scene]);
  const id = useUi((s) => s.cutscene);
  const mode = cutsceneMode(id);
  const cut = mode ? cutFor(id) : null;
  useFrame(() => {
    for (const k of POSES) live.pose[k] = 0;
    live.stageOn = Boolean(live.arrival.id) && cutsceneMode(live.arrival.id) === "full";
  }, -1.3);
  const Move = cut ? MOVES[id] : null;
  return <group name="cutscene"><PupUpright id={id} />{Move ? <Move key={id} {...cut} mode={mode} /> : null}</group>;
}
