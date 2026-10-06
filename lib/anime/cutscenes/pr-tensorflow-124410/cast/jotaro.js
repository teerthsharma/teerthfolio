// pr-tensorflow-124410 CAST: the Jotaro-dressed seal, the victim (bible 3 "Victim", 4). A 0.5 x S costumed seal on the dam in front of the hero
// (staged where the camera arc sees him beyond the hero; right of the axis so the sight line to the hero stays clear). He does NOT speak line A.
// Script (24 fps frames in the bible, here seconds on the stepped clock; pure functions of ts):
//   0 -> approach            stands, hands in pockets (the plain stand pose), cap brim level, eyes half-lidded: stoic
//   approach (3.0) + 0.42 s  steps forward 0.55 S (frames 0-10), then walks on 0.22 S/s with a step bob; he never panics
//   timestop (6.21)          FROZEN mid-step: every channel is evaluated at tEff = min(ts, timestop) so nothing moves for the whole stopped second;
//                            the cap brim tips down 0.22 rad over 0.2 s at the stop (it is the one thing that moves: his own held breath)
//   drown (7.6)              recoil 0.5 as the coral edge falls, a step back 0.3 S, eyes stay calm (stoic frown)
//   tear (9.54)              gone with the dam
// Stage override: ctx.scene.stage.tower = [x, y, z] in hero units (seal-local, start position) when the WORLD agent puts him on the tower top.
import { events, ramp, sm, stageFrame } from "./timing.js";
import { JOTARO, JOTARO_HAIR } from "./costumes.js";
import { propKit, L1, pivot, disposeTree } from "./props.js";
import { PUP_HEAD2 } from "../../../pup.js";

export default function buildJotaro(ctx, marks) {
  const { THREE, engine, kit } = ctx;
  const { Group, SphereGeometry, CylinderGeometry, TorusGeometry } = THREE;
  const P = propKit(ctx);
  const F = stageFrame(ctx, false), S = F.S();
  const spec = { ...JOTARO(), name: "jotaro-seal" };
  spec.scale = 0.5 * S;
  const v = kit.costumedSeal(engine, spec);
  v.group.name = "jotaro-seal";
  // the black clumps under the cap, 3 each side (a second and third mesh on the same head frame, riding the pose)
  const HEAD_RING = { pos: PUP_HEAD2.pos, fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 };
  for (const side of [1, -1]) v.body.add(L1(kit.hairMesh(engine, JOTARO_HAIR(kit, side), HEAD_RING, { ink: "#05020a" })));
  // the cap: a black dome #0a0a12 with a half-disc brim in front and the gold emblem #d0a020; the brim end tips on the stop (pivot at the brim root)
  const cap = new Group(), CP = [0, 0.64, 0.25];
  const dome = P.fig(new SphereGeometry(0.285, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1, 0.85, 1), "#1c1c30", "#0a0a12", { line: 1, ink: "#05020a", pos: [0, 0.62, 0.03] });
  const brim = P.fig(new CylinderGeometry(0.27, 0.27, 0.02, 24, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, 0.85), "#1c1c30", "#0a0a12", { line: 1, ink: "#05020a", pos: [0, 0.655, 0.2], rot: [-0.08, 0, 0] });
  const emblem = P.fig(new SphereGeometry(0.04, 12, 8).scale(1, 1, 0.35), "#e8b82c", "#7a5a10", { line: 0.6, pos: [0, 0.7, 0.31] });
  cap.add(dome, brim, emblem);
  const capP = pivot(THREE, cap, CP);                                   // tipping rotates about the brim root
  capP.position.set(...CP);
  v.props.add(L1(capP));
  // the gold chain #ffe27a at the throat (a flattened ring over the collar)
  v.props.add(L1(P.fig(new TorusGeometry(0.185, 0.011, 6, 28), "#ffe27a", "#b8902a", { line: 0.5, pos: [0, 0.405, 0.1], rot: [Math.PI / 2 + 0.25, 0, 0], scale: [1, 1.1, 1] })));

  const tower = ctx.scene.stage?.tower;
  const z0 = tower ? tower[2] : 5.5, x0 = tower ? tower[0] : 0.9, y0 = tower ? tower[1] : 0;
  const p0 = F.to(x0, y0, z0), sealP = F.to(0, 0, 0);
  const group = new Group(); group.name = "jotaro"; group.add(v.group);
  marks.jotaro = new THREE.Vector3(...p0);

  return {
    group,
    update(t, dt, cue) {
      const E = events(cue), ts = cue.ts ?? t;
      group.visible = ts < E.tear;
      if (!group.visible) return;
      const tE = Math.min(ts, E.timestop);                               // frozen in the stopped second: all walk channels read tE
      const tau = Math.max(0, tE - E.approach);
      // forward travel (hero units, toward the seal): a 0.55 S step in 0.42 s, then 0.22 S/s; the step back at the drown
      const adv = 0.55 * sm(tau / 0.42) + 0.22 * Math.max(0, tau - 0.42);
      const stepBack = 0.3 * ramp(ts, E.drown, 0.3);
      const walking = tau > 0;
      const bob = walking ? 0.02 * Math.abs(Math.sin(tau * 7.2)) : 0;
      const fx = F.to(x0, y0, z0 - adv + stepBack);
      v.place(fx[0], fx[1] + bob * S, fx[2]).lookAtPoint(sealP[0], sealP[2]);
      // stoic: calm half-lidded eyes; the brim tips at the stop; the coral edge falls -> a subdued recoil (pose only, the face stays calm)
      v.react("recoil", 0.5 * ramp(ts, E.drown, 0.25));
      v.setPose("bow", walking && ts < E.timestop ? 0.08 : 0);
      v.expression("calm", 0.9);
      capP.rotation.x = 0.22 * ramp(ts, E.timestop, 0.2);
      v.update(ts < E.timestop ? ts : ts < E.resume ? E.timestop : ts); // the frame-locked tremble also freezes in the stopped second
      marks.jotaro.set(fx[0], fx[1], fx[2]);
    },
    dispose() { v.dispose(); disposeTree(capP); },
  };
}
