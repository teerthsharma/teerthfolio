"use client";

// The sky, as the camera sees it. The view always looks down on the island
// (the top of the frame is 24.5 degrees below the horizon when following,
// 34.5 in the overview: CameraRig.jsx), so most of the sky is what lives
// between the camera and the snow: gentle snowfall, seabirds wheeling over
// the seal, soft clouds drifting past, and the sky's anomaly, snow that
// falls up (sky/Upfall.jsx). Sun and dome (the background colour, fog and
// hemisphere light) stay in Island.jsx; the one piece of true distance this
// file adds is the far horizon, a ring of ice ranges beyond the coast that
// only the fog fades. Mounted by Scene.jsx.

import Clouds from "./sky/Clouds";
import Gulls from "./sky/Gulls";
import Horizon from "./sky/Horizon";
import Snowfall from "./sky/Snowfall";
import Upfall from "./sky/Upfall";

export default function Atmosphere() {
  return (
    <>
      <Horizon />
      <Clouds />
      <Snowfall />
      <Gulls />
      <Upfall />
    </>
  );
}
