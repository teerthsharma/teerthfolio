// CAST choreography for pr-xnnpack-10801: every actor is a PURE FUNCTION of the (stepped) clock, so scrubbing equals playing.
// An actor state is { vis, off:[r,y,f] (seal-frame offset from its mark; +f is AWAY from the throne), lean (rx about the feet), roll (rz),
// poses:{name:k} (kit VICTIM_POSES), expr:[name,k], prop:{...} (prop pitches the index applies) }.
// Bible frames are 24 fps: f(n) = n / 24 seconds.
const f = (n) => n / 24;
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
const seg = (t, a, b) => cl((t - a) / Math.max(1e-6, b - a));
const pulse = (t, a, b, c, d) => sm(seg(t, a, b)) * (1 - sm(seg(t, c, d))); // up over a..b, down over c..d
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const FALL_G = 9; // m/s^2: the dimension falls like glass

// bible times (s). index.js lets scene.js beats of the same name override these (tOf).
export const T = {
  speak: 3.0,            // shot 2 line A: Aizen-seal raises a hand
  popA: 3.2, popB: 3.7, popC: 4.2, // the colony pops in a pair at a time at the throne's foot (the throne rises 3.0-5.4)
  slash: 4.85,           // SLASH sfx 4.85 / 5.35: Ichigo's windup begins
  crack: 5.42,           // the glass cracks once (shot 3, frame 130): the arc's end
  line: 6.4,             // Ichigo: 'Where did that space even come from?'
  gap: 8.4,              // the gap lights along the dais foot
  gin: 215 / 24,         // Gin steps back 1 m on the second crack (frame 215)
  break: 9.55,           // IMPACT: the dimension breaks
  snap: 230 / 24,        // Kyoka Suigetsu's tip snaps (frame 230)
  hat: 232 / 24,         // Urahara tips the hat
  gone: 11.0,            // every dimension actor has fallen out of frame
};

const blank = (vis) => ({ vis, off: [0, 0, 0], lean: 0, roll: 0, poses: {}, expr: ["neutral", 0], prop: {} });
const drop = (br, delay) => -0.5 * FALL_G * Math.pow(Math.max(0, br - delay), 2);

// the victims' shared break: gasp, tumble back, fall away with the shards. kind 0 Ichigo, 1 Gin (smile holds), 2 Urahara (brim holds)
function breakFall(s, t, T_, kind) {
  const br = t - T_.break;
  if (br <= 0) return s;
  const gasp = pulse(t, T_.break, T_.break + 0.05, T_.break + f(6), T_.break + f(6) + 0.05);
  const tumble = sm(seg(br, f(6), f(16)));
  s.poses.stagger = 0.7 * (1 - tumble) * sm(seg(br, 0, 0.05));
  s.poses.blown = 0.85 * tumble * (kind === 1 ? 0.7 : 1);
  s.poses.fallen = 0.7 * sm(seg(br, f(16) + 0.15, f(16) + 0.55));
  if (kind === 0) s.expr = ["terror", 1];
  s.off[1] += 0.14 * gasp + drop(br, 0.95 + 0.05 * kind);
  return s;
}

// ---- Aizen-seal: the illusion's voice
export function aizen(t, T_) {
  const s = blank(t >= T_.speak - 0.4 && t < T_.gone);
  s.expr = ["calm", 0.8];
  s.off[1] = -1.2 * (1 - sm(seg(t, T_.speak - 0.4, T_.speak + 0.1))); // steps up out of the sand with the throne
  // line A (3.0-5.0): a raised hand. The kit has no arm rig, so the read is `salute`, a lean, and the blade lifting.
  const hand = pulse(t, T_.speak, T_.speak + 0.3, T_.speak + 1.8, T_.speak + 2.4);
  s.poses.salute = hand;
  s.lean = -0.06 * hand;
  s.expr = ["smug", 0.6 + 0.3 * hand];
  s.prop.blade = { rx: 1.9 - 1.1 * hand }; // 1.9 = held low (forward-down)
  // the illusion cracks (5.42): a small stagger, the smile stays
  s.poses.stagger = 0.35 * pulse(t, T_.crack, T_.crack + 0.1, T_.crack + 0.3, T_.crack + 0.6);
  // the truth: the tip snaps (frame 230); he looks at it
  const snap = sm(seg(t, T_.snap, T_.snap + 0.25));
  if (snap > 0) s.expr = ["terror", 0.5 * snap];
  s.lean += 0.12 * snap;
  s.prop.snapAge = t >= T_.snap ? t - T_.snap : -1; // seconds since the snap
  const br = t - T_.break;
  if (br > 0) {
    s.poses.stagger = 0.9 * pulse(t, T_.break, T_.break + 0.1, T_.break + 0.35, T_.break + 0.5);
    s.poses.kneel = 0.8 * sm(seg(br, 0.2, 0.6));
    s.poses.fallen = 0.9 * sm(seg(br, 0.7, 1.1));
    s.off[1] += drop(br, 0.9);
  }
  return s;
}

// ---- Ichigo-seal: frown, lean back, the arc (frames 0-8) ending on the crack, the recoil (8-14), stands stunned, speaks, falls
export function ichigo(t, T_) {
  const s = blank(t >= T_.popA - 0.1 && t < T_.gone);
  const pop = sm(seg(t, T_.popA - 0.1, T_.popA + 0.2));
  s.off[1] = pop < 1 ? 0.3 * Math.sin(Math.PI * pop) : 0; // a hop as he pops in
  const swingA = T_.crack - f(8), swingB = T_.crack;
  const wind = sm(seg(t, T_.slash - 0.1, swingA));        // beat 1: lean back, cleaver cocked over the shoulder
  const swing = sm(seg(t, swingA, swingB));               // the arc
  const recoil = pulse(t, swingB, swingB + 0.1, swingB + f(6), swingB + f(14)); // frames 8-14
  s.lean = -0.32 * wind + 0.78 * swing * (1 - 0.6 * recoil);
  s.off[2] = 0.35 * wind - 0.75 * swing + 0.25 * recoil; // + = away from the throne
  // cleaver pitch: rests on the shoulder (0.2), cocks back (-1.2), swings down through (2.6)
  const rx = wind < 1 || swing <= 0 ? 0.2 + (-1.2 - 0.2) * wind : -1.2 + (2.6 + 1.2) * swing;
  s.prop.sword = { rx, rz: -0.55 * (1 - swing) };
  s.poses.recoil = 0.6 * recoil;
  s.expr = recoil > 0.05 ? ["terror", 0.7 * recoil] : ["rage", 0.35 + 0.45 * wind];
  if (t > swingB + f(14)) {              // beat 3: stands stunned, the cleaver low
    const stun = sm(seg(t, swingB + f(14), swingB + 0.8));
    s.expr = ["awe", 0.4 + 0.5 * stun];
    s.prop.sword = { rx: 2.4 + 0.05 * Math.sin(t * 2), rz: 0.1 };
    s.poses.terror = t < T_.break ? 0.25 * stun : 0;
    const talk = pulse(t, T_.line, T_.line + 0.1, T_.line + 2.4, T_.line + 2.6);
    if (talk > 0) s.expr = ["awe", 0.55 * talk + 0.2 * stun];
  }
  return breakFall(s, t, T_, 0);
}

// ---- Gin-seal: hands in sleeves, permanent smile, steps back 1 m on the second crack (frame 215)
export function gin(t, T_) {
  const s = blank(t >= T_.popB - 0.1 && t < T_.gone);
  const back = sm(seg(t, T_.gin, T_.gin + 0.3));
  s.expr = ["shut", 0.55];       // the narrow smile: lids drawn to arcs
  s.off[2] = 1.0 * back;         // + = away from the throne: one metre back
  s.poses.salute = 0.35 - 0.2 * back;
  return breakFall(s, t, T_, 1);
}

// ---- Urahara-seal: cane forward, hat shadows the eyes, tips the hat on the break (frame 232)
export function urahara(t, T_) {
  const s = blank(t >= T_.popC - 0.1 && t < T_.gone);
  const tip = sm(seg(t, T_.hat, T_.hat + 0.2));
  s.expr = ["calm", 0.9];
  s.poses.salute = 0.2;
  s.prop.hat = { rx: 0.5 * tip, lift: 0.03 * tip };      // the brim dips and the hat rides up a touch
  s.prop.cane = { rx: 0.35 - 0.2 * tip };
  s.lean = 0.07 * tip;
  s.poses.bow = 0.25 * tip;
  return breakFall(s, t, T_, 2);
}

// ---- six colony / Soul Reaper extras: pop in pairs at the throne's foot, cheer on twos, then on the break frames 0-6 gasp, 6-16 tumble
export function extra(i, t, T_) {
  const t0 = [T_.popA, T_.popB, T_.popC][i >> 1] + (i & 1) * 0.12; // a pair at a time
  const s = blank(t >= t0 && t < T_.gone);
  const pop = sm(seg(t, t0, t0 + 0.18));
  s.off[1] = pop < 1 ? 0.35 * Math.sin(Math.PI * pop) : 0;
  const cheering = t < T_.break ? 1 : 0;
  const up = Math.floor((t - t0) * 6 + hash(i) * 3) & 1;  // a hop every 1/6 s: twos, since t is already stepped
  s.off[1] += cheering * pop * (up ? 0.09 : 0);
  s.roll = cheering * (up ? 0.07 : -0.07) * (hash(i + 9) > 0.5 ? 1 : -1);
  s.poses.salute = cheering * (up ? 1 : 0.4);
  s.expr = ["awe", 0.5 + 0.4 * up];                       // open-eyed, open-mouthed read
  const br = t - T_.break;
  if (br > 0) {
    const gasp = pulse(t, T_.break, T_.break + 0.06, T_.break + f(6), T_.break + f(6) + 0.05);
    const tumble = sm(seg(br, f(6), f(16)));
    s.poses.salute = 0;
    s.poses.terror = 1 - tumble;
    s.poses.blown = 0.9 * tumble;
    s.poses.fallen = 0.8 * sm(seg(br, f(16) + 0.1, f(16) + 0.5));
    s.expr = ["terror", 1];
    s.off[1] += 0.18 * gasp + drop(br, 0.9 + 0.05 * i);
  }
  return s;
}

// ---- the hero seal's beats (used ONLY when scene.seal.track is empty: the direction's track wins otherwise).
// bible 4: beat 1 reclined chin-on-flipper (sit, half-lidded); beat 2 flipper across the chest (sign); beat 3 both flippers up on the
// truth (raise + awe: eyes open wide); beat 4 blown low at the break; fist on the flex after the landing.
export function heroPoses(t, T_) {
  return {
    sit: pulse(t, 2.9, 3.4, T_.line, T_.line + 0.4),
    sign: 0.8 * pulse(t, T_.speak, T_.speak + 0.4, T_.speak + 2.2, T_.speak + 2.6),
    raise: pulse(t, T_.line + 0.2, T_.line + 0.8, T_.break - 0.15, T_.break),
    awe: pulse(t, T_.line + 0.2, T_.line + 0.8, T_.break - 0.15, T_.break),
    blown: pulse(t, T_.break, T_.break + 0.2, T_.break + 0.7, T_.break + 1.2),
    fist: pulse(t, 11.9, 12.3, 12.9, 13.2),
  };
}
export const util = { f, cl, sm, seg, pulse, hash };
