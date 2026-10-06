// pr-tensorflow-124410 CAST: the road roller parked on the dam crest (easter egg 1, "Road roller da!", visible from 0 to the poster tear).
// Yellow body #f2c820 / #8a6a10, a grey drum #9a9aa8 / #4a4a5a, a cab with a roof slab, a dark chimney. Hero units (scaled by S), back right of the hero
// at (3.4, -2.4) so it is behind the arc cameras' sight line and off the home camera axis: it never sits between a lens and the seal.
import { events, stageFrame } from "./timing.js";
import { propKit, disposeTree } from "./props.js";

export default function buildRoller(ctx) {
  const { THREE } = ctx;
  const { Group, BoxGeometry, CylinderGeometry } = THREE;
  const P = propKit(ctx), F = stageFrame(ctx, false), S = F.S();
  const g = new Group(); g.name = "road-roller";
  const Y = ["#f2c820", "#8a6a10"], G = ["#9a9aa8", "#4a4a5a"], K = ["#2a2a34", "#0a0a12"];
  g.add(
    P.fig(new CylinderGeometry(0.38, 0.38, 0.72, 26).rotateZ(Math.PI / 2), G[0], G[1], { line: 1.1, pos: [0, 0.38, 0.55] }),                  // the drum
    P.fig(new CylinderGeometry(0.3, 0.3, 0.12, 20).rotateZ(Math.PI / 2), Y[0], Y[1], { line: 1.1, pos: [0.34, 0.3, -0.45] }),               // rear wheels
    P.fig(new CylinderGeometry(0.3, 0.3, 0.12, 20).rotateZ(Math.PI / 2), Y[0], Y[1], { line: 1.1, pos: [-0.34, 0.3, -0.45] }),
    P.fig(new BoxGeometry(0.5, 0.28, 0.9), Y[0], Y[1], { line: 1.1, pos: [0, 0.62, -0.05] }),                                               // body
    P.fig(new BoxGeometry(0.4, 0.4, 0.4), Y[0], Y[1], { line: 1.1, pos: [0, 0.96, -0.3] }),                                                 // cab
    P.fig(new BoxGeometry(0.52, 0.05, 0.52), Y[0], Y[1], { line: 1.1, pos: [0, 1.2, -0.3] }),                                               // roof
    P.fig(new CylinderGeometry(0.04, 0.05, 0.3, 8), K[0], K[1], { line: 0.9, pos: [0.12, 0.96, 0.22] }),                                   // chimney
    P.fig(new BoxGeometry(0.05, 0.07, 0.5), Y[0], Y[1], { line: 0.9, pos: [0.34, 0.5, 0.4] }),                                              // drum frame arms
    P.fig(new BoxGeometry(0.05, 0.07, 0.5), Y[0], Y[1], { line: 0.9, pos: [-0.34, 0.5, 0.4] }),
  );
  g.traverse((o) => o.layers.set(1));
  const p = F.to(3.4, 0, -2.4);
  g.position.set(p[0], p[1], p[2]); g.rotation.y = F.yaw() - 0.5; g.scale.setScalar(S);
  return {
    group: g,
    update(t, dt, cue) { g.visible = (cue.ts ?? t) < events(cue).tear; },
    dispose() { disposeTree(g); },
  };
}
