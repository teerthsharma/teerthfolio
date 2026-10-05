// THE CAMERA GRAMMAR: ZOOM OUT -> SWITCH -> ZOOM INTO THE SEAL -> SETTLE -> KILL -> HOME, for every dock but the
// Igloo. A card may declare (all optional; the rest derive from the place):
//   pull: { far, fov0, fov1 }  the camera backs off the real dock to `far` m, the lens opens fov0 -> fov1; never in
//         optional: rise (deg, the wide's pitch, default 14), look ([x, y, z] m off the seal's chest: where the wide
//         aims, default far/10 up), at ([start, out, in0, in1] scene s: the pull's own clock, default from the beats)
//   into: { from, elev, fov }  after the switch it comes onto the seal from azimuth `from` (rad off +z, + = west,
//                              never 0) at eye height `elev` m, lens `fov`
//   kill: { what, at }         `at`: a beat name (timeline.js BEAT) or a scene second; a third angle opens there
//   fog: { near, far }, camFar the drawing's own fog band and far plane while the stage is up
// Pure: CameraRig.jsx calls shot() every frame; the drawing's own `view` (cutView) still sets where the seal is framed.

export const PULL_FAR = 44; // m, the default wide: the dock, the island and the sky round it
const HOME = "home";
const WIDE_PITCH = (14 * Math.PI) / 180;
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, k) => a + (b - a) * k;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// The grammar for a card at a place, or null (the Igloo never switches dimension).
export function grammarFor(card, place) {
  if (!card || card.id === HOME) return null;
  const side = (place?.look?.x ?? place?.x ?? 0) >= (place?.x ?? 0) ? 1 : -1; // flank toward the landform
  const into = { from: 0.5 * side, elev: 1.5, fov: null, ...card.into };
  if (Math.abs(into.from) < 0.2) into.from = 0.5 * (into.from < 0 ? -1 : 1); // azimuth 0 is the old straight two-shot
  return {
    pull: { far: PULL_FAR, fov0: null, fov1: null, ...card.pull },
    into,
    kill: card.kill ?? null,
    fog: card.fog ?? { near: 700, far: 1400 },
    camFar: card.camFar ?? 1000,
  };
}

// The second the kill's third angle opens: a beat name from the timeline, or a scene second.
export function killAt(g, tl) {
  const at = g.kill?.at;
  if (typeof at === "number") return at;
  const b = at === "lineB" ? tl.lineB : at === "collapse" ? tl.collapse[0] : at === "lineA" ? tl.lineA : tl.move?.[1];
  return b ?? null;
}

// How long each beat runs, from the card's own clock: the pull ends just after the impact, the push lands on line A.
export const beats = (tl, at) =>
  at ? { start: at[0], out: at[1], in0: at[2], in1: at[3] } : { start: 0, out: tl.impact + 0.25, in0: tl.bloom[1], in1: Math.max(tl.lineA, tl.bloom[1] + 0.7) };

// The lens at scene second t.
// follow: { eye, look } the camera's own follow (arrays), view: { eye, look } the drawing's framing of the seal,
// seal: [x, groundY, z], base: the island lens. Writes { eye, look, fov } into `out` (arrays) and returns it.
export function shot(g, tl, t, follow, view, seal, base, out) {
  const b = beats(tl, g.pull.at);
  const chest = [seal[0], seal[1] + 0.9, seal[2]];
  // the wide: straight back along the follow's own line, never nearer than the follow
  const o = [follow.eye[0] - chest[0], follow.eye[1] - chest[1], follow.eye[2] - chest[2]];
  const d0 = Math.hypot(o[0], o[1], o[2]);
  const far = Math.max(g.pull.far, d0);
  // low and level: more island, more sky (the follow looks down at the snow, which names nothing)
  const h = Math.hypot(o[0], o[2]) || 1;
  const pitch = g.pull.rise == null ? WIDE_PITCH : (g.pull.rise * Math.PI) / 180;
  const wide = [chest[0] + (o[0] / h) * far * Math.cos(pitch), chest[1] + far * Math.sin(pitch), chest[2] + (o[2] / h) * far * Math.cos(pitch)];
  const lk = g.pull.look ?? [0, far * 0.1, 0];
  const wideLook = [chest[0] + lk[0], chest[1] + lk[1], chest[2] + lk[2]];
  const fov0 = g.pull.fov0 ?? base;
  const fov1 = g.pull.fov1 ?? base + 8;
  const fovIn = g.into.fov ?? base;

  const sOut = smooth(b.start, b.out, t);
  let eye = [0, 1, 2].map((i) => mix(follow.eye[i], wide[i], sOut));
  let look = [0, 1, 2].map((i) => mix(follow.look[i], wideLook[i], sOut));
  let fov = mix(fov0, fov1, sOut);

  const sIn = smooth(b.in0, b.in1, t);
  if (sIn > 0) {
    // zoom into the seal on an arc about the framed point: the azimuth bends from the wide's to `from`
    const vx = view.eye[0] - view.look[0];
    const vz = view.eye[2] - view.look[2];
    const aV = Math.atan2(vx, vz);
    const D1 = Math.hypot(vx, vz);
    const a0 = Math.atan2(wide[0] - chest[0], wide[2] - chest[2]);
    const D0 = Math.hypot(wide[0] - chest[0], wide[2] - chest[2]);
    let aT = aV + g.into.from;
    let yT = seal[1] + g.into.elev;
    const tk = g.kill ? killAt(g, tl) : null;
    const sK = tk == null ? 0 : smooth(tk, tk + 0.6, t);
    if (sK > 0) {
      aT = mix(aT, aV - g.into.from * 0.8, sK); // the death: the opposite flank, a touch higher
      yT += 0.5 * sK;
    }
    const a = a0 + wrap(aT - a0) * sIn;
    const D = mix(D0, D1, sIn);
    look = [0, 1, 2].map((i) => mix(wideLook[i], view.look[i], sIn));
    eye = [look[0] + Math.sin(a) * D, mix(wide[1], yT, sIn), look[2] + Math.cos(a) * D];
    fov = mix(fov1, fovIn, sIn);
  }

  // home: the wide, the lens and the follow come back as the stage collapses
  const w = 1 - smooth(tl.collapse[1], tl.duration, t);
  for (let i = 0; i < 3; i++) {
    out.eye[i] = mix(follow.eye[i], eye[i], w);
    out.look[i] = mix(follow.look[i], look[i], w);
  }
  out.fov = mix(base, fov, w);
  return out;
}
