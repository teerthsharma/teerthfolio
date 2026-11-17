// CAST for p-resolvent: the pale playable seal that opens and closes the cutscene and swaps to the Frieren character under the impact frame,
// and the court's cast (Aura on her dais, the headless ranks, Fern and Stark on the walls, the Scale of Obedience).
import { Group } from "three";
import { heroSwap } from "./hero.js";
import { buildCourtCast } from "./court.js";

export default function build(ctx) {
  const hero = heroSwap(ctx), court = buildCourtCast();
  const group = new Group();
  group.add(hero.group, court.group);
  return {
    group,
    update(t, dt, cue) {
      hero.update(t);
      court.update(t, cue);
    },
    dispose() {
      hero.dispose();
      court.dispose();
    },
  };
}
