"use client";

// The sky, as the camera sees it. The view always looks down on the island
// (the top of the frame is 24.5 degrees below the horizon when following,
// 34.5 in the overview: CameraRig.jsx), so most of the sky is what lives
// between the camera and the snow: gentle snowfall, seabirds wheeling over
// the seal, soft clouds drifting past, and the sky's anomaly, snow that
// falls up (sky/Upfall.jsx). Sun and dome (the background colour, fog and
// hemisphere light) stay in Island.jsx. No horizon: the camera never sees
// one, and a ring pulled into frame stood inside the island as a wall.
// Mounted by Scene.jsx.

import Clouds from "./sky/Clouds";
import Gulls from "./sky/Gulls";
import Snowfall from "./sky/Snowfall";
import Upfall from "./sky/Upfall";

export default function Atmosphere() {
  return (
    <>
      <Clouds />
      <Snowfall />
      <Gulls />
      <Upfall />
    </>
  );
}
