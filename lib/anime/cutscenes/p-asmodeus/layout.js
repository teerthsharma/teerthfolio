// LAYOUT for p-asmodeus: where the hero, Lucifer and the pins stand per drawing, in band units (u across, v DOWN, hh = band-height share of the whole silhouette).
import { K, formAt, moteQ } from "./clock.js";
import { shotAt } from "./cams.js";

const ramp = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));
const easeOut3 = (p) => 1 - (1 - p) ** 3;
export const up = (p) => ({ u: p.u, up: 1 - p.v });

function heroAt(t, n, shot) {
  switch (n) {
    case 1: return { u: 0.5, v: 0.9, hh: 0.24 };
    case 2: return { u: 0.5, v: 0.93, hh: 0.38 };
    case 3: return { u: 0.22, v: 0.86, hh: 0.3 };
    case 4: { const q = moteQ(t); return { u: 0.26 + 0.04 * q, v: 0.9, hh: 0.24 + 0.08 * q }; }
    case 5: return { u: 0.5, v: 1.62, hh: 1.6 };
    case 6: return { u: 0.3, v: 0.92, hh: 0.55 };
    case 7: { const f = Math.floor(t * 12 + 0.02); return { u: 0.5, v: 0.98, hh: 0.6 + (0.24 * Math.floor(6 * ramp(78, 90, f))) / 6 }; }
    case 8: return { u: 0.5, v: 0.98, hh: 0.84 };
    case 9: return { u: 0.36, v: 0.97, hh: 0.52 };
    case 10: return { u: 0.27, v: 0.94, hh: 0.48 + (0.42 - 0.48) * ramp(shot.t[0], shot.t[1], t) };
    default: return { u: 0.5, v: 0.95, hh: 0.5 };
  }
}

function foeAt(t) {
  if (t < 7 || t >= 8.5) return null;
  const k4 = K(4), k9 = K(9), k11 = K(11);
  return {
    u: t < k9 ? 1.1 + (0.8 - 1.1) * easeOut3(ramp(7, 7.25, t)) : 0.8 + (1.3 - 0.8) * ramp(k9, k11, t),
    v: t < k4 ? 0.46 + 0.01 * Math.sin(6 * t) : 0.46,
    hh: 0.34,
  };
}

export function layout(t) {
  const shot = shotAt(t);
  const hero = heroAt(t, shot.n, shot), foe = foeAt(t);
  return {
    shot: shot.n,
    form: formAt(t),
    hero,
    foe,
    feet: up(hero),
    chest: { u: hero.u, up: 1 - hero.v + 0.5 * hero.hh },
    palm: { u: hero.u + 0.13 * hero.hh, up: 1 - hero.v + 0.62 * hero.hh },
    foeChest: foe ? up(foe) : null,
  };
}
