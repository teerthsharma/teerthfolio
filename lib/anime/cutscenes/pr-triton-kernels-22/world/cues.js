// CUE TIMELINE for pr-triton-kernels-22 (world layer). Every time is read from scene.beats by NAME when the DIRECTION agent
// wrote one, else it falls back to the bible's clock (seconds). All of it is a pure function of t, so scrubbing == playing.
//   beat name   default   what the world does
//   draw        2.00      crossing drawn in around the pup (radius grows 0 -> 150 m over `dur` 2.2 s); the pool spreads with it
//   bleed       2.00      the veined sky bleeds red (0 -> 0.55 over 2.5 s)
//   rise        2.70      the shrine rises out of the pool, back.out over 24 frames (1.0 s)
//   jaw         3.25 3.85 (one beat per word of line A) the lower jaw drops, then half-closes between words
//   slash       8.10 ...  18 Dismantle slashes, gap 0.25 s easing to 0.5 s; each cuts one building (delay 0.15 s); signs flicker out
//   cleave      10.40     the Cleave: every unscheduled ice block splits on its diagonal; the scheduled path glows
//   close       16.30     the jaws snap shut
//   dissolve    16.50     the shrine dissolves (scale and jitter; the FX layer owns the ink flakes)
//   drain       16.30     sky drains to paper from the horizon up (2.2 s)
//   rub         18.00     the drawing is rubbed out from the horizon inward (2.6 s); the island returns
//   pulse       18.00     the scheduled blocks pulse row by row (0.45 s per row)
//   halo        2.70      the tiny Mahoraga halo flickers in a distant window (easter egg 5)
export function makeCues(scene) {
  const B = scene.beats ?? [];
  const all = (n, d) => { const t = B.filter((b) => b.name === n).map((b) => b.t).sort((a, b) => a - b); return t.length ? t : d; };
  const one = (n, d) => all(n, [d])[0];
  const dur = (n, d) => B.find((b) => b.name === n)?.dur ?? d;
  const gaps = []; let t = 8.1;
  for (let i = 0; i < 18; i++) { gaps.push(t); t += 0.25 + 0.25 * (i / 17) ** 1.2; }
  return {
    draw: one("draw", 2.0), drawDur: dur("draw", 2.2),
    bleed: one("bleed", 2.0), bleedDur: dur("bleed", 2.5),
    rise: one("rise", 2.7), riseDur: dur("rise", 1.0),
    jaw: all("jaw", [3.25, 3.85]),
    slash: all("slash", gaps),
    cleave: one("cleave", 10.4),
    close: one("close", 16.3),
    dissolve: one("dissolve", 16.5), dissolveDur: dur("dissolve", 1.3),
    drain: one("drain", 16.3), drainDur: dur("drain", 2.2),
    rub: one("rub", 18.0), rubDur: dur("rub", 2.6),
    pulse: one("pulse", 18.0),
    halo: one("halo", 2.7),
  };
}
