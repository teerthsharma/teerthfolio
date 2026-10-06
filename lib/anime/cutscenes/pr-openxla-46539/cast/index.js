// CAST layer for pr-openxla-46539 (My Hero Academia, the United States of Smash). Layer 1, redrawn every step.
// Hero: the locked seal wears the All Might outfit (cape, V of light, cyan eyes). Victims are all costumed seals (law L6b):
// the Nomu (one big seal), Shigaraki, Kurogiri, 4 League goons, 6 rooftop civilians. Props: the two answer cards, merged to a gold card.
// Cues read (bible defaults in brackets, so the cast plays even if scene.js omits one):
//   nomuRise [1.0 s]   the Nomu climbs out of the crater over 1.5 s
//   cards    [3.4 s]   the Nomu throws the two answer cards
//   dash     [8.58 s]  the seal's Detroit Smash dash begins (hero eyes slit)
//   smash    [9.42 s]  the strike: the dome reaches each seal at distance/66.7 m/s; villains tumble, Nomu recoils, civilians duck
//   skyOpen  [9.42 s]  the sky clears (cheer follows 1.2 s later unless a "cheer" beat is given)
//   cheer    [skyOpen + 1.2 s]  civilians cheer on twos
//   punch    [14.4 s]  the screen punch: the two cards smash into the gold card
import { makeFrame } from "./common.js";
import hero from "./hero.js";
import nomu from "./nomu.js";
import league from "./league.js";
import crowd from "./crowd.js";
import cards from "./cards.js";

export default function build(ctx) {
  const group = new ctx.THREE.Group(), frame = makeFrame(ctx);
  const parts = [hero(ctx), nomu(ctx, frame), league(ctx, frame), crowd(ctx, frame), cards(ctx, frame)];
  for (const p of parts) if (p.group) group.add(p.group); // the hero's parts are attached to the seal itself
  ctx.setLayer(group, 1);
  return {
    group,
    update(t, dt, cue) { for (const p of parts) p.update(t, dt, cue); },
    dispose() { for (const p of parts) p.dispose?.(); },
  };
}
