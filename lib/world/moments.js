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
