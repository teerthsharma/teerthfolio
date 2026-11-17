// The transform as pure functions of real time: the Giorno hero from the turn to the return, the pale pup otherwise.
import { BACK, TURN } from "../clock.js";

export function swapAt(t) {
  const hero = t >= TURN && t < BACK + 2 / 24, pale = !hero;
  const into = Math.floor((t - TURN - 0.12) * 12 + 1e-6), out = Math.floor((t - BACK) * 24 + 1e-6);
  const sqHero = hero ? ([0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1)) : 1;
  const sqPale = pale && out >= 2 ? ([0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1) : 1;
  return { hero, pale, sqHero, sqPale, into, out };
}

export function flash(t) {
  return (t >= TURN && t < TURN + 3 / 24) || (t >= BACK && t < BACK + 2 / 24) ? 1 : 0;
}
