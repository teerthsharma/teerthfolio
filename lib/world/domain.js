// THE DOMAIN: Aether-Lang's first arrival (issue #7, the owner's recast). The
// pup raises a flipper in the hand sign and a Domain Expansion opens: a
// sphere of deep night with stars and a soft white-violet core blooms out of
// it and swallows the view, a tall ink silhouette (spiky upswept hair, a
// blindfold band, hands in pockets, no face) steps in beside it and speaks
// both lines in comic bubbles, then the domain collapses back into the
// island. Shape, colour and pose only.
//
// One clock: seconds since live.arrival.start. Pure; the 3D half is
// components/world/Domain.jsx, the bubbles components/world/ui/DomainBubbles.jsx,
// the pose seal/variants/D.jsx, the camera CameraRig.jsx, the beat Controller.jsx.

import { AWAKENING } from "./loop.js";
import { ARRIVAL } from "./moments.js";

export const DOMAIN_IDS = new Set(["p-aether-lang"]);

export const DOMAIN = {
  duration: 8.2, // s: two lines need reading time; any key still skips at once
  hold: 7.8,
  frame: 0.7, // the camera settles on the two-shot
  sign: [0.45, 1.05], // the flipper rises into the sign
  impact: 1.15, // the first impact frame; the bloom starts on it
  bloom: [1.15, 1.6],
  enter: 1.95, // the silhouette steps in, on twos
  lineA: 2.3,
  lineB: 5.0,
  collapse: [7.4, 7.8],
  radius: 16, // m: well past the camera
};

// The silhouette stands right of the pup and behind it; the camera frames
// both from the front, low (the pup faces +z, the follow camera looks -z),
// so the pair sits above the bubbles in the lower half. A portrait screen
// stands back a little further to keep both in.
export const FIGURE_AT = [1.7, 0, -3.2];
export const FIGURE_SCALE = 1.12;
const LOOK = [0.7, 0.6, -1.0];
const EYE = [-0.1, 0.85, 7.4];
const LOOK_TALL = [0.55, 0.6, -1.0];
const EYE_TALL = [-0.1, 0.95, 8.8];

let rm = null; // read once, like CameraRig
const reduced = () => (rm ??= typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
const hudOff = () => typeof document !== "undefined" && document.documentElement.dataset.hud === "off";

// "full": the domain plays; "still": reduced motion, the silhouette and both
// bubbles stand still over the plain world; null: no domain here (or ?hud=off).
export function domainMode(id) {
  if (!id || !DOMAIN_IDS.has(id) || hudOff()) return null;
  return reduced() ? "still" : "full";
}

export const arrivalLength = (id) => (id === AWAKENING.id ? AWAKENING.duration : domainMode(id) ? DOMAIN.duration : ARRIVAL.duration);
export const arrivalHold = (id) => (id === AWAKENING.id ? AWAKENING.hold : domainMode(id) ? DOMAIN.hold : ARRIVAL.hold);

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// Stepped animation, on twos: 12 drawings a second.
export const onTwos = (t) => Math.floor(t * 12) / 12;

// ui.beat: 0 off, 1 the sign, 2 impact, 3 the bloom ("VOID"), 4 the
// silhouette, 5 line A, 6 line B, 7 the collapse, 8 out.
export function domainBeat(t) {
  const D = DOMAIN;
  if (t < 0 || t >= D.duration) return 0;
  if (t < D.impact) return 1;
  if (t < D.impact + 0.12) return 2;
  if (t < D.enter) return 3;
  if (t < D.lineA) return 4;
  if (t < D.lineB) return 5;
  if (t < D.collapse[0]) return 6;
  if (t < D.collapse[1]) return 7;
  return 8;
}

// How far the hand sign is up (0..1).
export const signAt = (t) => smooth(DOMAIN.sign[0], DOMAIN.sign[1], t) * (1 - smooth(DOMAIN.collapse[1], DOMAIN.duration, t));

// The domain's radius (m): out from the pup on the impact, back in on the collapse.
export function radiusAt(t) {
  const D = DOMAIN;
  // smoothstep both ways: the swell is slow enough at the start to be seen
  // from outside before it passes the camera
  const k = smooth(D.bloom[0], D.bloom[1], t) * (1 - smooth(D.collapse[0], D.collapse[1], t));
  return k > 0 ? D.radius * k : 0;
}

// How far the camera has moved onto the two-shot (0..1).
export const viewAt = (t) => smooth(0, DOMAIN.frame, t) * (1 - smooth(DOMAIN.collapse[1], DOMAIN.duration, t));

// The two-shot for a pup at (x, z) on a screen of this aspect: writes the
// eye and the look-at point.
export function domainView(x, z, aspect, eye, look) {
  const [L, E] = aspect < 1 ? [LOOK_TALL, EYE_TALL] : [LOOK, EYE];
  look.set(x + L[0], L[1], z + L[2]);
  eye.set(look.x + E[0], look.y + E[1], look.z + E[2]);
}
