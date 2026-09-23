"use client";

// The sky, as the camera sees it. The view always looks down on the island
// (the top of the frame is 24.5 degrees below the horizon when following,
// 34.5 in the overview: CameraRig.jsx), so most of the sky is what lives
// between the camera and the snow: gentle snowfall, seabirds wheeling over
// the seal, and the sky's anomaly, snow that falls up (sky/Upfall.jsx). Sun
// and dome (the background colour, fog and hemisphere light) stay in
// Island.jsx. No horizon: the camera never sees one, and a ring pulled into
// frame stood inside the island as a wall.
//
// No clouds, still. sky/Clouds.jsx exists (rebuilt to orbit the ground-focus
// point, sky/focus.js, instead of riding the raw camera) but stays
// unmounted: the follow camera's usable vertical band is only ~17.5 degrees,
// and across every spawn tried (?play, each Google range PR, Triton's foot,
// the ?zoom=2.4 overview) that whole band is already filled edge to edge by
// the nearest landform or building. Any puff far enough out to clear a
// mountain's footprint lands outside that band and is never seen; anything
// close enough to be seen sits in front of the mountain it was meant to
// clear. The owner prefers no clouds to clouds over the mountains, so
// Clouds.jsx is kept on disk (for a future camera that leaves real open sky)
// but not imported here.
// Mounted by Scene.jsx.

import Clouds from "./sky/Clouds";
import Gulls from "./sky/Gulls";
import Snowfall from "./sky/Snowfall";
import Upfall from "./sky/Upfall";

export default function Atmosphere() {
  return (
    <>
      <Snowfall />
      <Clouds />
      <Gulls />
      <Upfall />
    </>
  );
}
