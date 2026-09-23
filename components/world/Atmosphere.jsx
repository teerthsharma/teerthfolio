"use client";

// The sky, as the camera sees it. The view always looks down on the island
// (the top of the frame is 24.5 degrees below the horizon when following,
// 34.5 in the overview: CameraRig.jsx), so the sky is what lives between the
// camera and the snow: gentle snowfall, seabirds wheeling over the seal, and
// the sky's anomaly, snow that falls up (sky/Upfall.jsx). Mounted by
// Scene.jsx; the background, fog and hemisphere light stay in Island.jsx.

import Gulls from "./sky/Gulls";
import Snowfall from "./sky/Snowfall";
import Upfall from "./sky/Upfall";

export default function Atmosphere() {
  return (
    <>
      <Snowfall />
      <Gulls />
      <Upfall />
    </>
  );
}
