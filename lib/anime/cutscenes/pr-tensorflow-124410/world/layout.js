// LAYOUT + TIMELINE for the WORLD layer of pr-tensorflow-124410. One place for every coordinate and every time.
// Frame: the seal's yaw-0 frame, seal at the origin ON THE DAM CREST (y = 0), the lens out along +z, the reservoir behind
// the seal down -z. Metres, bible scale (seal read as ~1.8 m, The World 3.4 m).
// Beat names this layer listens for (scene.beats entries, any extra fields ignored; each has a bible default so the
// layer is correct even if the direction layer names none):
//   "timestop" (t = ZA WARUDO, dur = hold)   "resume"   "muda" (t = first fist)   "crack"   "drown"   "tear"
//   "palette" ({ t, pal: "violet"|"citrus"|"yv"|"cyan"|"snow" })   "clock" (t = the clock appears)
export const L = {
  WATER_Y: -4,
  CREST: { len: 40, wid: 4 },
  TOWER: { x: 5.5, z: -16, top: 8.5, r: 2.4 },      // the Jotaro seal stands at (x, top, z)
  PYL: { x: 11, z: -10, top: 10 },                   // two fluted pylons, 14 m above the water
  MINT_Y: [3.2, 4.8, 6.4], CORAL_Y: 8.4, EDGE_LEN: 22,
  CLOCK: { x: 0, y: 30, z: -100, r: 9 },             // 18 m face in the sky, on the bullseye centre
  BULL: [0, 0.3, -1],                                // the bullseye's centre direction
  ROLLER: { x: -8, z: 0.4 },
  BANANA: { x: -3.5, z: -6.0 },
};

// the three coral pieces: fractions of the 22 m beam
export const PIECES = [0.36, 0.34, 0.3];
export const pieceCentres = () => {
  let a = -L.EDGE_LEN / 2; const out = [];
  for (const f of PIECES) { const w = f * L.EDGE_LEN; out.push({ x: a + w / 2, w, x0: a }); a += w; }
  return out;
};

const G = 36; // the fall is a cartoon gravity (m/s2): 12 m in 0.8 s
export function timeline(scene) {
  const bs = scene?.beats ?? [];
  const get = (n) => bs.find((b) => b.name === n);
  const stopB = get("timestop"), resB = get("resume");
  const stop = stopB?.t ?? 6.21;
  const resume = resB?.t ?? (stopB?.dur ? stop + stopB.dur : 7.46);
  const muda = get("muda")?.t ?? 5.0;
  const crack = get("crack")?.t ?? muda;
  const T = { stop, resume, muda, crack, crackDone: crack + 1.0, tear: get("tear")?.t ?? 9.54, clockOn: get("clock")?.t ?? stop, handDrop: (get("drown")?.t ?? 8.0) + 0.4, fall: resume };
  // landing time and place of each piece: delay + sqrt(2h / g)
  const h = L.CORAL_Y - L.WATER_Y;
  T.pieces = pieceCentres().map((p, i) => ({ ...p, t0: resume + 0.1 * i, hit: resume + 0.1 * i + Math.sqrt((2 * h) / G) }));
  T.G = G;
  T.palettes = bs.filter((b) => b.name === "palette" && b.pal).map((b) => [b.t, b.pal]).sort((a, b) => a[0] - b[0]);
  if (!T.palettes.length) T.palettes = [[0, "violet"], [1.5, "citrus"], [5.0, "yv"], [7.46, "cyan"], [9.54, "snow"]];
  return T;
}
// the world clock: stops dead inside the stopped second (character and Stand keep moving on t; the world does not)
export const worldT = (t, T) => (t < T.stop ? t : t < T.resume ? T.stop : t - (T.resume - T.stop));
export const hash1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
