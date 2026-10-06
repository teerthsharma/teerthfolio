// The uniforms every world material shares by reference: one write in update() drives the whole stage.
//   uLamp 0..1 back-lamp strength, uLampPos the lamp's world position, uT stepped clock, uIsland 0..1 end wipe to the island.
import { Vector3 } from "three";
export function sharedUniformSet() {
  return { uLamp: { value: 0 }, uLampPos: { value: new Vector3(0, 0, -42) }, uT: { value: 0 }, uIsland: { value: 0 } };
}
