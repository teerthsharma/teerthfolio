// The hero seal's beat poses for pr-highway-3244 (bible section 4 key list, 24 fps frames -> seconds). The locked pup is never restyled:
// only pose channels (seal.setPose) are driven, and the eye radius via the `awe` / `blink` poses. Poses combine by max with whatever
// scene.seal.track already set this frame, then the seal is re-applied. Beat names read: lineA move launch kachow lineB credit collapse,
// each falling back to the bible's frame time when the direction layer does not name it.
//   f0..f58   stands on the dock mark; hops race 1.6..2.1 s (raise)      f58..f173  sits (the throne pose), eyes forward
//   f173..187 the war cry: crouch + wide-eyed hold (awe)                 f187..264  leans forward into the wind (point), crouch on the launch
//   f264..367 arms up on the Ka-chow (raise held)                        f367..504  fist and smile
//   f504..600 calm (idle)                                                f600..610  hop down, 3 spins
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const win = (t, a, b, c, d) => sm((t - a) / Math.max(1e-6, b - a)) * (1 - sm((t - c) / Math.max(1e-6, d - c))); // ramp a..b, hold, release c..d
const bump = (t, a, d) => (t > a && t < a + d ? Math.sin(Math.PI * ((t - a) / d)) : 0);

export function heroUpdate(ctx) {
  const seal = ctx.seal;
  return (t, cue) => {
    const T = (n, def) => cue.beat?.(n)?.t ?? def;
    const lineA = T("lineA", 58 / 24), move = T("move", 173 / 24), launch = T("launch", 198 / 24), kachow = T("kachow", 266 / 24),
      lineB = T("lineB", 367 / 24), credit = T("credit", 504 / 24), collapse = T("collapse", 600 / 24), end = collapse + 10 / 24;
    const k = {};
    k.raise = Math.max(sm((t - 1.6) / 0.5) * (1 - sm((t - 2.1) / 0.05)), // the hop up onto the shoulder
      win(t, kachow - 0.1, kachow + 0.5, lineB, lineB + 0.3), // arms up through the Ka-chow to the stop
      bump(t, collapse, 0.4)); // the hop down
    k.sit = win(t, lineA - 0.5, lineA - 0.2, move + 0.1, move + 0.4) * 1; // the throne pose until the war cry
    k.crouch = Math.max(win(t, move, move + 0.15, move + 0.6, move + 0.8) * 0.9, bump(t, launch - 0.1, 0.5) * 0.7); // the cry, then the launch
    k.awe = win(t, move - 0.05, move + 0.2, move + 0.7, move + 1.1); // wide-eyed hold on the cry
    k.point = win(t, move + 0.7, launch + 0.3, kachow - 0.1, kachow + 0.3) * 0.55; // leaning into the wind
    k.fist = win(t, lineB, lineB + 0.3, credit - 0.3, credit); // fist and smile at the stop
    k.spin = t >= collapse && t <= end ? 3 * sm((t - collapse) / (end - collapse)) : 0; // 3 spins down
    // a blink every 3.3 s, never during the awe hold
    const bt = (t + 0.7) % 3.3; k.blink = bt < 0.2 && k.awe < 0.05 ? bt / 0.2 : 0;
    for (const [n, v] of Object.entries(k)) if (v > 0.001) seal.setPose(n, Math.max(seal.pose?.[n] ?? 0, v));
    seal.apply?.(t);
  };
}
