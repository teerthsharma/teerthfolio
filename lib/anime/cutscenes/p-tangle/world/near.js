// Near framing removed: the live set has no near-plane cards, so the layer is an empty group until the composer drops its call.
import { Group } from "three";

export function buildNear() {
  const group = new Group();
  return { group, update() {}, dispose() {} };
}
