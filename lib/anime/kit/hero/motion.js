// HERO MOTION: channels, poses and expressions as pure functions of (k, t). Body channels add (scales
// multiply) as in framework/seal.js; arm, wrist and brow channels ease toward each pose's target by k, in
// insertion order; a hand shape switches at k >= 0.5. Arm channels (radians, mirrored for the left arm):
// sx swings the arm forward and up, sz lifts it out to the side, sy twists it (< 0 turns the forearm in),
// elbow bends the forearm forward. Arm targets were solved by IK (wrist position, finger and palm direction,
// clear of the torso field), so a hand lands where the name says. Head: rx nods, ry turns, rz tilts.
// Eye channels: `look` [x, y] steers both irises, `eyeAdj` {open, lid, slant, pupil} offsets the eye expression.
// Body extras: `yaw` (about world up, outside rx: a prone seal can head anywhere), `sx`/`sz` squash, `tail` {rx lift, ry wag}.
const D2 = Math.PI / 180;
const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });
const both = (a, w, hand) => ({ armR: a, armL: a, wristR: w, wristL: w, ...(hand ? { handR: hand, handL: hand } : {}) });
export const REST_ARM = arm(0.11, 0.64, 0.86, -0.63), REST_WRIST = wr(0.47, 0.97, -0.19);
const sw = (t, f, p = 0) => Math.sin(t * f + p);

const BODY = [[[0, 0.19, 0.035], [0.3, 0.19, 0.26]], [[0, 0.075, 0], [0.31, 0.085, 0.265]], [[0, 0.33, 0], [0.33, 0.15, 0.2]], [[0, 0.3, -0.09], [0.25, 0.22, 0.17]],
  [[0, 0.66, 0.01], [0.21, 0.2, 0.2]], [[0, 0.62, 0.17], [0.07, 0.05, 0.06]]];
const COM = 0.3;
const trig = (c) => [Math.cos(c.rx ?? 0), Math.sin(c.rx ?? 0), Math.cos(c.ry ?? 0), Math.sin(c.ry ?? 0), Math.cos(c.rz ?? 0), Math.sin(c.rz ?? 0)];
// the lift that rests the body (ellipsoids [centre, radii], pose frame) on the ground at any orientation and squash; 0 when upright
export function groundLift(c) {
  const [cx, sx, cy, sy, cz, sz] = trig(c), R = [cx * sz + sx * sy * cz, cx * cz - sx * sy * sz, -sx * cy];
  const S = [(c.sxz ?? 1) * (c.sx ?? 1), c.sy ?? 1, (c.sxz ?? 1) * (c.sz ?? 1)];
  let lo = 1e9;
  for (const [p, r] of BODY) lo = Math.min(lo, R[0] * S[0] * p[0] + R[1] * S[1] * p[1] + R[2] * S[2] * p[2] - Math.hypot(R[0] * S[0] * r[0], R[1] * S[1] * r[1], R[2] * S[2] * r[2]));
  return -lo - 0.01;
}
// the ground offset [x, z] that keeps the centre of mass over one spot while the body tips: a round belly rolls, it does not hinge
export function comShift(c) {
  const [cx, sx, cy, sy, cz, sz] = trig(c), h = COM * (c.sy ?? 1), vx = -cy * sz, vz = sx * cz + cx * sy * sz, a = c.yaw ?? 0;
  return [-(vx * Math.cos(a) + vz * Math.sin(a)) * h, -(-vx * Math.sin(a) + vz * Math.cos(a)) * h];
}
const lay = (c, air = 0) => { const [x, z] = comShift(c); return { ...c, x, z, y: groundLift(c) + air }; };

export function walkCycle(p, k = 1) {
  const s = Math.sin(2 * Math.PI * p), b = 0.5 - 0.5 * Math.cos(4 * Math.PI * p);
  return { rz: 0.09 * k * s, ry: 0.11 * k * s, rx: 0.05 * k, y: 0.02 * k * b, sy: 1 - 0.02 * k * (1 - b), head: { rz: -0.07 * k * s, ry: -0.07 * k * s }, tail: { ry: 0.35 * k * s },
    armR: arm(0.11 + 0.5 * s, 0.5, 0.7, -0.63), armL: arm(0.11 - 0.5 * s, 0.5, 0.7, -0.63) };
}
export function lopeCycle(p, k = 1) {
  const a = Math.sin(2 * Math.PI * p), up = Math.max(0, Math.sin(2 * Math.PI * p + 0.7)), g = 0.5 + 0.5 * a, mix = (u, v) => u + (v - u) * g;
  const c = lay({ rx: (0.34 + 0.3 * a) * k, sy: 1 + 0.1 * k * a, sxz: 1 - 0.05 * k * a }, 0.08 * k * up);
  return { ...c, head: { rx: -(0.3 + 0.28 * a) * k }, tail: { rx: 0.5 * k * (1 - g) },
    ...both(arm(mix(0.65, 1.2), mix(0.31, 0.25), mix(1.39, 0.5), mix(-1.14, -0.2)), wr(mix(0.09, 0.3), mix(0.39, -0.6), mix(-0.25, 0.5))) };
}

export function restChannels(spec) {
  return {
    x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sy: 1, sxz: 1, smear: 0,
    yaw: 0, sx: 1, sz: 1, tail: { rx: 0, ry: 0 }, smearDir: [0, 0, -1], whisker: 0, pinpoint: 0, noBlink: false,
    catch: spec.eyes?.catchlight ? { ...spec.eyes.catchlight } : null,
    head: { rx: 0, ry: 0, rz: 0 },
    armR: { ...REST_ARM }, armL: { ...REST_ARM }, wristR: { ...REST_WRIST }, wristL: { ...REST_WRIST },
    handR: "flat", handL: "flat",
    brow: { angle: 0, drop: 0, tilt: 0, raise: 0 },
    mouth: spec.mouth.rest, mouthAmt: 0, eyes: "calmCut", eyesAmt: 0.5, look: [0, 0], blink: 0,
    eyeAdj: { open: 0, lid: 0, slant: 0, pupil: 0 },
  };
}

export const HERO_POSES = {
  idle: (k, t) => ({ y: 0.006 * sw(t, 3.8), sy: 1 + 0.012 * sw(t, 3.8, 1.2), sxz: 1 - 0.006 * sw(t, 3.8, 1.2),
    head: { rz: 0.012 * sw(t, 0.9), ry: 0.02 * sw(t, 0.6, 1) },
    armR: arm(0.11, 0.64 + 0.025 * sw(t, 1.9), 0.86, -0.63), armL: arm(0.11, 0.64 + 0.025 * sw(t, 1.9, 0.7), 0.86, -0.63) }),
  sign: (k) => ({ rz: -6 * D2 * k, rx: -4 * D2 * k, y: 0.01 * k, head: { rx: 0.06 * k, rz: 0.05 * k }, armR: arm(1.75, -0.35, 0.35, -1.06), wristR: wr(-0.76, 0.08, 1), handR: "two" }),
  fist: (k) => ({ z: 0.12 * k, rx: 6 * D2 * k, sy: 1 - 0.03 * k, sxz: 1 + 0.03 * k, head: { rx: 0.08 * k },
    armR: arm(1.51, -0.16, 0.23, -1.05), wristR: wr(-0.05, 1, 0.4), handR: "fist", armL: arm(-0.67, 0.75, 1.73, -0.02), wristL: wr(-0.34, 0.67, 0.34), handL: "fist" }),
  raise: (k) => ({ y: 0.25 * Math.sin(Math.PI * Math.min(1, k)) + 0.05 * k, rx: -12 * D2 * k, sy: 1 + 0.06 * k, sxz: 1 - 0.03 * k, head: { rx: -0.18 * k }, ...both(arm(3.11, 0.19, 0.1, -0.31), wr(-0.15, -1.2, -0.21), "open") }),
  crouch: (k) => ({ y: -0.02 * k, sy: 1 - 0.16 * k, sxz: 1 + 0.08 * k, head: { rx: 0.1 * k }, ...both(arm(1.3, -0.1, 0, 0.06), wr(-0.65, -0.11, 0.05), "fist") }),
  sit: (k) => ({ y: -0.06 * k, rx: -18 * D2 * k, sy: 1 - 0.04 * k, sxz: 1 + 0.02 * k, head: { rx: 0.22 * k }, ...both(arm(0.89, 0.21, 0.19, -1.9), wr(-0.18, 0.82, 0.48)) }),
  point: (k) => ({ rx: 10 * D2 * k, ry: 15 * D2 * k, z: 0.05 * k, head: { ry: -0.1 * k }, armR: arm(1.26, 0.11, 0.72, -0.03), wristR: wr(0.36, 0.07, 0.03), handR: "point" }),
  spin: (k) => ({ ry: Math.PI * 2 * k, ...both(arm(0.75, 1.44, 0.01, -0.37), wr(0.11, -0.37, 0.07), "open") }),
  blown: (k) => ({ y: 0.18 * Math.sin(Math.PI * k) + 0.04 * k, z: -0.5 * k, rx: -40 * D2 * k, smear: 0.35 * Math.sin(Math.PI * k), head: { rx: -0.25 * k }, ...both(arm(2.18, 0.36, 0, -0.6), wr(-0.34, -0.76, 0.49), "open") }),
  blink: (k) => ({ blink: Math.sin(Math.PI * Math.min(1, k)) }),
  awe: (k) => ({ y: 0.08 * k, head: { rx: -0.14 * k }, eyesWide: k, ...both(arm(0.86, 0.61, 0.97, 0.14), wr(-0.41, -0.64, 0.73), "open") }),
  // IK-solved below: pray and cross sit on the chest, reach, guard and cast are in front, salute is at the temple
  pray: (k) => ({ head: { rx: 0.07 * k }, rx: 2 * D2 * k, ...both(arm(0.97, -0.32, 0.4, -1.33), wr(-1.07, -0.38, 1.04), "flat") }),
  cross: (k) => ({ head: { rx: -0.04 * k }, rx: -3 * D2 * k, armR: arm(1.45, -0.59, 0.66, -2.03), wristR: wr(0.35, 0.2, 0.78), armL: arm(1.49, -0.6, 0.51, -1.97), wristL: wr(0.06, 0.03, 0.67), handR: "fist", handL: "fist" }),
  reach: (k) => ({ rx: 8 * D2 * k, z: 0.05 * k, head: { rx: -0.08 * k, ry: -0.08 * k }, armR: arm(1.4, -0.09, 0.92, 0.06), wristR: wr(0.09, 0.01, 0.12), handR: "open" }),
  guard: (k) => ({ y: -0.012 * k, rx: 5 * D2 * k, head: { rx: 0.12 * k }, ...both(arm(1.52, -0.4, 0.64, -0.16), wr(-0.68, -0.36, 0.29), "fist") }),
  cast: (k) => ({ z: 0.05 * k, rx: 4 * D2 * k, ry: -10 * D2 * k, armR: arm(1.6, -0.03, 0.5, -1.38), wristR: wr(0.52, -0.19, 1), handR: "open", armL: arm(-0.77, 0.88, 1.82, -0.18), wristL: wr(-0.44, 0.68, 0.61), handL: "fist" }),
  salute: (k) => ({ rz: -3 * D2 * k, head: { rx: -0.03 * k, rz: 0.04 * k }, armR: arm(1.87, 0.99, 1.82, -0.44), wristR: wr(-0.08, -0.64, -0.11), handR: "flat" }),
  "point-up": (k) => ({ rx: -6 * D2 * k, y: 0.02 * k, head: { rx: -0.14 * k, ry: -0.06 * k }, armR: arm(2.4, -0.08, 0.23, -0.37), wristR: wr(-0.24, -0.51, 0.39), handR: "point" }),
  "hold-out": (k) => ({ rx: 5 * D2 * k, z: 0.04 * k, head: { rx: 0.06 * k }, ...both(arm(1.14, -0.23, 0.01, 0.76), wr(-0.31, 0.78, -0.16), "open") }),
  // hand-shape-only poses (human hands): the shape a track entry holds on both hands, nothing else moves
  "hand-open": () => ({ handR: "open", handL: "open" }), "hand-fist": () => ({ handR: "fist", handL: "fist" }), "hand-point": () => ({ handR: "point", handL: "point" }),
  "hand-two": () => ({ handR: "two", handL: "two" }), "hand-flat": () => ({ handR: "flat", handL: "flat" }),
  "hands-in-pockets": (k) => ({ rx: -3 * D2 * k, head: { rx: 0.03 * k, rz: -0.03 * k }, ...both(arm(0.27, 0.06, 0.65, -0.01), wr(0.05, 0.05, -0.2), "fist") }),
  "hand-claw": () => ({ handR: "claw", handL: "claw" }), "hand-hold": () => ({ handR: "hold", handL: "hold" }),
  fallen: (k) => ({ ...lay({ rz: -1.5 * k, rx: -0.3 * k }), head: { rz: 0.3 * k, rx: -0.12 * k }, armR: arm(2.5, 0.35, 0.3, -0.3), wristR: wr(-0.1, -0.6, 0), armL: arm(0.97, -0.32, 0.4, -1.33), wristL: wr(-0.2, 0.3, 0.4), handR: "open", handL: "open" }),
  kneel: (k) => ({ y: -0.03 * k, rx: 20 * D2 * k, sy: 1 - 0.14 * k, sxz: 1 + 0.07 * k, head: { rx: 0.32 * k }, armR: arm(0.78, -0.1, 0, -0.6), wristR: wr(0.38, 0.61, -0.15), handR: "fist",
    armL: arm(1.49, -0.6, 0.51, -1.97), wristL: wr(0.06, 0.03, 0.67), handL: "fist" }),
  stagger: (k, t) => ({ rz: (0.2 + 0.05 * sw(t, 5)) * k, rx: -0.16 * k, ry: -0.25 * k, x: 0.05 * k, head: { rz: -0.22 * k, rx: -0.18 * k, ry: 0.2 * k },
    armR: arm(0.08, 1.7, 1.01, 1.56), wristR: wr(0.13, -0.03, 0.07), handR: "open", armL: arm(0.9, 0.9, 0.6, 0.2), wristL: wr(-0.3, -0.4, 0.5), handL: "open" }),
  cower: (k, t) => ({ y: -0.02 * k, sy: 1 - 0.17 * k, sxz: 1 + 0.08 * k, rx: -9 * D2 * k, x: 0.006 * k * Math.sign(sw(t, 38)), head: { rx: 0.3 * k, ry: 0.28 * k, rz: 0.1 * k },
    ...both(arm(2.42, -0.36, 0.41, -0.13), wr(-0.39, -0.51, -0.75), "open") }),
  flight: (k, t) => ({ ...lay({ rx: 1.4 * k }, (0.45 + 0.02 * sw(t, 4)) * k), head: { rx: -0.95 * k }, tail: { rx: (0.25 + 0.12 * sw(t, 9)) * k }, ...both(arm(2.95, -0.15, 0.21, -2.25), wr(0.2, 0.7, 0.03), "flat") }),
  walk: (k, t, o) => walkCycle(o?.phase ?? t * 1.8, k),
  lope: (k, t, o) => lopeCycle(o?.phase ?? t * 2.2, k),
  "head-low": (k) => ({ rx: 5 * D2 * k, head: { rx: 0.3 * k }, look: [0, 0.3 * k] }),
  "look-up": (k) => ({ rx: -4 * D2 * k, head: { rx: -0.32 * k }, look: [0, 0.2 * k] }),
  "look-back": (k) => ({ ry: 2.5 * k, head: { ry: -1.2 * k, rz: 0.06 * k, rx: -0.04 * k }, look: [-0.5 * k, 0] }),
  "arms-folded": (k) => ({ rx: -4 * D2 * k, head: { rx: -0.06 * k }, armR: arm(1.45, -0.59, 0.66, -2.03), wristR: wr(0.35, 0.2, 0.78), armL: arm(1.49, -0.6, 0.51, -1.97), wristL: wr(0.06, 0.03, 0.67), handR: "flat", handL: "flat" }),
  clap: (k) => ({ head: { rx: -0.05 * k }, ...both(arm(1.27, -0.63, 0.03, -0.11), wr(-0.61, -0.35, 0.21), "flat") }),
  // the Malevolent Shrine sign: palms pressed together at the breastbone, fingers up (tuned in the hero shot, human hands)
  shrine: (k) => ({ head: { rx: 0.03 * k }, ...both(arm(1.2, -0.3, 0.7, -1.3), wr(-1, -0.4, 1), "flat") }),
  "sign-ram": (k) => ({ head: { rx: 0.05 * k }, ...both(arm(0.97, -0.32, 0.4, -1.33), wr(-1.07, -0.38, 1.04), "two") }),
  "sign-claw": (k) => ({ rx: 6 * D2 * k, z: 0.04 * k, head: { rx: 0.06 * k }, armR: arm(1.4, -0.09, 0.92, 0.06), wristR: wr(0.09, 0.01, 0.12), handR: "claw" }),
};

// eyes: an anime-eye-decal expression; brow [angle, drop]; mouth [state, amount]; adj: eye offsets; look: iris steer
export const HERO_EXPRESSIONS = {
  neutral: { eyes: "calmCut", eyesK: 0.5, brow: [0.04, 0.002], mouth: ["rest", 0] },
  calm: { eyes: "calmCut", brow: [0.1, 0.004], mouth: ["closed", 0.1] },
  smirk: { eyes: "smirk", brow: [0.2, 0.004], tilt: -0.1, mouth: ["smirk", 1], head: { rz: 0.07, rx: -0.07, ry: -0.06 } },
  smug: { eyes: "smirk", brow: [0.18, 0.003], tilt: -0.3, raise: 0.006, mouth: ["smirk", 0.85], head: { rz: 0.06, rx: -0.06 } },
  grin: { eyes: "glare", eyesK: 0.8, brow: [0.34, 0.005], mouth: ["grit", 1], head: { rx: -0.05 } },
  glare: { eyes: "glare", brow: [0.5, 0.008], mouth: ["closed", 0.0], head: { rx: -0.06 } },
  menace: { eyes: "menace", brow: [0.6, 0.01], mouth: ["grit", 0.7], head: { rx: -0.08 } },
  "eyes-lit": { eyes: "eyesLit", brow: [0.3, 0.005], mouth: ["closed", 0.05], head: { rx: -0.04 } },
  rage: { eyes: "menace", eyesK: 0.9, brow: [0.62, 0.011], mouth: ["snarl", 1], head: { rx: 0.06 } },
  terror: { eyes: "terror", brow: [-0.45, -0.008], mouth: ["open", 0.55], head: { rx: -0.04 } },
  awe: { eyes: "awe", brow: [-0.16, -0.012], mouth: ["open", 0.3], head: { rx: -0.08 } },
  sad: { eyes: "sad", brow: [-0.5, -0.003], mouth: ["closed", -0.8], head: { rx: 0.1 } },
  shout: { eyes: "glare", eyesK: 0.9, brow: [0.5, 0.007], mouth: ["open", 1], head: { rx: -0.1 } },
  bored: { eyes: "calmCut", brow: [0.02, 0.008], mouth: ["closed", -0.3], adj: { lid: 0.1, open: -0.1 }, look: [0.4, -0.16], head: { rz: 0.08, rx: 0.06, ry: 0.12 } },
  determined: { eyes: "glare", eyesK: 0.6, brow: [0.42, 0.007], mouth: ["closed", -0.12], adj: { pupil: -0.12 }, look: [0, 0.04], head: { rx: 0.05 } },
  shut: { eyes: "shut", brow: [-0.1, 0.006], mouth: ["closed", 0] },
  yell: { eyes: "shut", brow: [0.45, 0.008], mouth: ["open", 1], head: { rx: -0.14 } },
};

const lerp = (a, b, k) => a + (b - a) * k;
export function applyPose(ch, d, k) {
  for (const c of ["x", "y", "z", "rx", "ry", "rz", "smear", "blink", "yaw", "whisker"]) ch[c] += d[c] ?? 0;
  for (const c of ["sy", "sxz", "sx", "sz"]) ch[c] *= d[c] ?? 1;
  if (d.head) for (const a of ["rx", "ry", "rz"]) ch.head[a] += d.head[a] ?? 0;
  if (d.tail) for (const a of ["rx", "ry"]) ch.tail[a] += d.tail[a] ?? 0;
  if (d.look) ch.look = [ch.look[0] + d.look[0], ch.look[1] + d.look[1]];
  if (d.smearDir) ch.smearDir = d.smearDir;
  for (const part of ["armR", "armL", "wristR", "wristL"]) if (d[part]) for (const [c, v] of Object.entries(d[part])) ch[part][c] = lerp(ch[part][c], v, k);
  if (k >= 0.5) { if (d.handR) ch.handR = d.handR; if (d.handL) ch.handL = d.handL; }
  if (d.eyesWide && ch.eyes === "neutral") { ch.eyes = "awe"; ch.eyesAmt = d.eyesWide; }
}

export function applyExpression(ch, name, k, rest) {
  const e = HERO_EXPRESSIONS[name];
  if (!e || k <= 0) return;
  ch.eyes = e.eyes; ch.eyesAmt = k * (e.eyesK ?? 1);
  ch.brow.angle = lerp(ch.brow.angle, e.brow[0], k); ch.brow.drop = lerp(ch.brow.drop, e.brow[1], k);
  ch.brow.tilt = lerp(ch.brow.tilt, e.tilt ?? 0, k); ch.brow.raise = lerp(ch.brow.raise, e.raise ?? 0, k);
  if (k >= 0.2) { ch.mouth = e.mouth[0] === "rest" ? rest : e.mouth[0]; ch.mouthAmt = e.mouth[1] * k; }
  if (e.head) for (const a of ["rx", "ry", "rz"]) ch.head[a] += (e.head[a] ?? 0) * k;
  for (const a in e.adj ?? {}) ch.eyeAdj[a] += e.adj[a] * k;
  if (e.look) { ch.look = [ch.look[0] + e.look[0] * k, ch.look[1] + e.look[1] * k]; }
}

// an entrance move's channels (kit/hero/moves.js) under the poses: body channels add, arms are offsets from the rest arm
export function applyMove(ch, m) {
  applyPose(ch, { ...m, armR: undefined, armL: undefined, wristR: undefined, wristL: undefined, handR: undefined, handL: undefined }, 1);
  for (const [part, rest] of [["armR", REST_ARM], ["armL", REST_ARM], ["wristR", REST_WRIST], ["wristL", REST_WRIST]]) if (m[part]) for (const c in rest) ch[part][c] += m[part][c] - rest[c];
  if (m.handR) ch.handR = m.handR;
  if (m.handL) ch.handL = m.handL;
}

const ADD = ["x", "y", "z", "rx", "ry", "rz", "smear", "yaw"];
function applyOver(ch, over) {
  for (const [c, v] of Object.entries(over ?? {})) {
    if (v === undefined || c === "phase") continue;
    if (c === "head") for (const a in v) ch.head[a] += v[a];
    else if (ADD.includes(c)) ch[c] += v;
    else if (c === "look") ch.look = [ch.look[0] + v[0], ch.look[1] + v[1]];
    else if (typeof v === "object" && !Array.isArray(v) && ch[c]) Object.assign(ch[c], v);
    else ch[c] = v;
  }
}

// pure function of the pose/expression weights, the overrides (one or a list), the move ((ts) -> channels or null) and the stepped time
export function channelsAt(spec, poses, exprs, over, ts, move) {
  const ch = restChannels(spec), overs = Array.isArray(over) ? over : [over], phase = overs.reduce((p, o) => o?.phase ?? p, undefined);
  applyPose(ch, HERO_POSES.idle(1, ts), 1);
  const m = move?.(ts);
  if (m) applyMove(ch, m);
  for (const [n, k] of Object.entries(poses)) if (HERO_POSES[n] && n !== "idle") applyPose(ch, HERO_POSES[n](k, ts, { phase }), k);
  for (const [n, k] of Object.entries(exprs)) applyExpression(ch, n, k, spec.mouth.rest);
  for (const o of overs) applyOver(ch, o);
  // the tail flippers are soft: they stay on the ground when the body tips back and trail up and back when it lies prone
  const tip = ch.rx - 2 * Math.PI * Math.round(ch.rx / (2 * Math.PI));
  ch.tail.rx += tip < 0 ? Math.min(1.4, -tip) : -0.5 * Math.min(tip, 1.6);
  if (spec.blinkEvery > 0 && !ch.noBlink) { const p = (ts + 1.3) % spec.blinkEvery; if (p < 0.14) ch.blink = Math.max(ch.blink, Math.sin(Math.PI * p / 0.14)); }
  return ch;
}

// hair and cloth secondary motion: a lag behind the head and body (the channels a moment ago) plus a slow
// drift, quantised to twos at 24 fps. Returns rotations [rx, ry, rz] for the hair (at most 0.14 rad) and for hanging cloth (0.3).
export function secondary(spec, poses, exprs, over, ts, move) {
  const t2 = Math.floor(ts * 12) / 12, c0 = channelsAt(spec, poses, exprs, over, t2, move), c1 = channelsAt(spec, poses, exprs, over, t2 - 0.17, move);
  const dh = (a) => c0.head[a] - c1.head[a], d = (a) => { const v = c0[a] - c1[a]; return v - 2 * Math.PI * Math.round(v / (2 * Math.PI)); }, cl = (v, m) => Math.max(-m, Math.min(m, v));
  const lag = [-0.7 * dh("rx") - 6 * d("y") - 0.12 * d("rx"), -0.5 * dh("ry") - 0.12 * (d("ry") + d("yaw")), -0.8 * dh("rz") - 0.4 * d("rz")];
  const hair = [cl(lag[0], 0.14) + 0.016 * sw(t2, 2.1), cl(lag[1], 0.14) + 0.01 * sw(t2, 1.3, 2), cl(lag[2], 0.14) + 0.02 * sw(t2, 1.7, 1)];
  const cloth = [cl(1.6 * lag[0], 0.3), cl(1.6 * lag[1], 0.3), cl(1.6 * lag[2], 0.3)];
  return { hair, cloth, t2 };
}
