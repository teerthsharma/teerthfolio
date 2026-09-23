"use client";

// Sculpture for the "funnel" figure: google-deepmind/mujoco_warp #1541 (place id pr-mujoco-warp-1541).
// Tells the same story as that figure on teerthsharma.github.io, in 3D.
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { place, near }.

import Placeholder from "./Placeholder";

export default function Funnel({ place }) {
  return <Placeholder place={place} />;
}
