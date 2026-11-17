// THE CORD WRAP: the live flipperWrap geometry (wrapParts) on a flipper, or on the character's wrist with the ring centred there.
// The hand is skinned 1.3 x 1.45 x 1.35 (kit/hero.js HAND_S): the 1/1.3 wrap scale is a guess to check at T8; the ring sits at x 0.43.
import { Mesh, Object3D } from "three";
import { T, smooth, warp } from "../clock.js";
import { wrapParts } from "../live/cord.js";

const HAND = { scale: 1 / 1.3, forearm: 0.04, ring: -0.43 };
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export function wrapScale(rt) {
  const t = warp(rt), k = smooth(T.wrap[0], T.wrap[1], t);
  return Math.max(k * (1 + 0.25 * Math.sin(Math.PI * clamp01((t - T.wrap[0]) / 0.5))), 0.0001);
}

// parent: a flipper (the pale pup) or null (the character: the caller attaches obj to ctx.seal.hero's handR)
export function tieWrap(parent) {
  const { g, m } = wrapParts();
  const obj = new Object3D(), inner = new Object3D(), knot = new Object3D(), mesh = new Mesh(g, m);
  const hand = !parent;
  mesh.castShadow = false;
  mesh.userData.tangleWrap = true;
  knot.position.set(0.5, 0.1, 0);
  inner.add(mesh, knot);
  obj.add(inner);
  obj.userData.knot = knot;
  obj.userData.tangleWrap = true;
  obj.scale.setScalar(0.0001);
  if (hand) {
    obj.rotation.z = Math.PI / 2;
    obj.position.y = HAND.forearm;
    inner.position.x = HAND.ring;
  } else {
    parent.add(obj);
    parent.userData.knot = knot;
  }
  return {
    obj,
    set(scale) { obj.scale.setScalar(Math.max(scale * (hand ? HAND.scale : 1), 0.0001)); },
    world(out) { return knot.getWorldPosition(out); },
    dispose() { obj.removeFromParent(); g.dispose(); m.dispose(); },
  };
}
