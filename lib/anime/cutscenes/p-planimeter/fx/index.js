// FX layer for p-planimeter ("Checkmate, Reviewer"). Layer 1: everything animated is redrawn per step.
// The seal is never emissive and nothing translucent crosses it: every material carries the keep-clear fade (lib.js).
//
// Cue names (beats in scene.js; each falls back to the bible's frame time when the beat is absent, lib.js DEFAULT):
//   chalk      Reviewer's tally scrape, 3.5 s, 21 frames          chalkS2   hero writes "S^2 | VR", 7.55 s
//   glint      eye glint pop, 6.9 s                                cardframe green card frame, 7.1 s, 0.4 s
//   corpus     the S^2 Vietoris-Rips sphere, 6.9 s, 1.125 s        project   sphere projects onto the board, 7.67 s
//   flash      f193 white flash, 8.04 s                            board     chess overlay slams in, 8.04 s
//   pawn       pawn takes king (+ CLACK), 8.25 s                   checkmate CHECKMATE lettering pop, 8.33 s
//   bluekey    12 frames of blue key, 8.37 s                       boardOut  board draws away, 8.475 s
//   ghost50    the 8% chalk "50", 8.9 s                            bell      window glow chime pulse, 14.1 s
//   wipe       gold wash for the sky-shell collapse, 22.1 s
// Impact frames, radial speed lines (8, f198-f204), shock and trauma are reserved beats fired by scene.js.
// Files: light.js (glow, shafts, patches, motes, petals, bokeh), corpus.js (sphere, card frame, glint),
//        chess.js (board, pieces, lettering, ghost), chalk.js (trails), grade.js (veil, flash, blue key, wash).
import * as THREE from "three";
import { makeShared, timeline, layoutOf, sealFrame } from "./lib.js";
import light from "./light.js";
import corpus from "./corpus.js";
import chess from "./chess.js";
import chalk from "./chalk.js";
import grade from "./grade.js";

export default function build(ctx) {
  const group = new THREE.Group();
  const U = makeShared();
  const T = timeline(ctx);
  const L = layoutOf(ctx);
  const frame = sealFrame(ctx);        // local = the seal's own frame, so the set rides wherever the scene puts it
  group.add(frame.group);
  const parts = [light, corpus, chess, chalk].map((f) => f(ctx, U, T, L, frame));
  for (const p of parts) frame.group.add(p.group);
  // back quads are camera-placed in world space, so they live outside the seal frame
  const g = grade(ctx, U, T);
  group.add(g.group);
  const all = [...parts, g];

  function update(t, dt, cue) {
    frame.sync();
    frame.group.updateMatrixWorld(true);
    U.update(ctx, t);
    for (const p of all) p.update(t, dt, cue);
  }
  function dispose() { for (const p of all) p.dispose?.(); }
  return { group, update, dispose };
}
