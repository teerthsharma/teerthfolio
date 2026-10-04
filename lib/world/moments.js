// The two "jump in" moments, as one shared clock so the camera, the seal,
// the snow puff and the sound all land on the same beat. Every consumer
// watches the ui store itself (useUi) and times itself from the transition.
//
// JUMP_IN plays when ui.started turns true because the visitor pressed a
// button (Start sliding, a list row, a keypress on the intro). It does NOT
// play when started is already true within SKIP_WINDOW of page load (?play,
// ?spawn=): those URLs exist for screenshots and deep links and must open
// straight into the follow camera.
//
// ZOOM_IN plays when ui.open goes from null to a place id (E, Enter, a tap on
// the prompt, arriving at a clicked building); ZOOM_OUT when it returns to
// null.

export const SKIP_WINDOW = 0.5; // s after load during which started=true snaps

export const JUMP_IN = {
  duration: 1.7, // s: camera travels from the overview to the follow framing
  hopAt: 1.05, // s: the seal leaves the snow (anticipation squash before it)
  landAt: 1.55, // s: the seal lands: snow puff, landing thump, camera settles
  whooshAt: 0, // s: the big rising whoosh starts with the button press
};

export const ZOOM_IN = {
  duration: 0.6, // s: camera pushes toward the building as the panel slides in
  whooshAt: 0,
};

export const ZOOM_OUT = {
  duration: 0.45, // s: camera eases back to the follow framing
  whooshAt: 0,
};

// RADIATION plays when the seal crosses into a radioactive area (live.rad,
// Controller.jsx): the view warps and floods with the area's colour, then at
// mutateAt the halo flashes, the seal mutates and a shockwave rings out, and
// by mutateAt + clear the view is clean again (Look.jsx, Outfit.jsx, D.jsx,
// CameraRig.jsx each time themselves from live.rad.start).
export const RADIATION = {
  mutateAt: 0.9, // s
  clear: 1.1, // s after the mutation until the view is clean
  ring: 0.9, // s the shockwave takes to cross the screen
};

// ARRIVAL plays the first time in a session the seal reaches a place
// (live.arrival, Controller.jsx; seen places persist in sessionStorage): the
// place's showcase. The camera leans onto the place, swings round it and
// eases in while it plays its animation, the seal stops and looks round with
// the visitor, the letterbox slides over the view. Input waits `hold`
// seconds; any fresh key, tap or click skips it (the owner: "cutscenes once
// per session help them explore; after exploring they can play").
export const ARRIVAL = {
  hold: 5.0, // s: the seal takes no click target until the 2D scene is over (any key skips)
  duration: 5.4, // s
};

// POP_2D is nested in ARRIVAL: the same cutscene's last half (issue #7,
// "two-voice cutscenes"). Seconds from arrival.start. The 3D hero move owns
// 0-2.2. The camera pushes toward the seal (push, fixed azimuth) and the view
// smash-cuts to a flat 2D frame (smash; the ortho slam lands at the end of the
// push), the other speaker enters, line A, the seal's move, line B, then the
// view unflattens and eases back out (out) to the follow camera.
// The Controller writes ui.pop and clears it with the arrival, so any skip
// ends the pop in one frame. ?play / ?spawn= / SKIP_WINDOW never start an
// arrival, so they never pop.
export const POP_2D = { push: 2.0, smash: 2.2, enter: 2.45, lineA: 2.7, move: 3.55, lineB: 4.55, out: 5.0 };

// ui.pop: 0 off, 1 push, 2 smash, 3 speaker enters, 4 line A, 5 the move,
// 6 line B, 7 out (2D gone from the HUD; the camera is still easing back).
export function popPhase(t) {
  const p = POP_2D;
  return t < p.push || t >= ARRIVAL.duration ? 0 : t < p.smash ? 1 : t < p.enter ? 2 : t < p.lineA ? 3 : t < p.move ? 4 : t < p.lineB ? 5 : t < p.out ? 6 : 7;
}
