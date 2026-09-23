"use client";

// Sculpture for the "units" figure: google-deepmind/mujoco #3396 (place id pr-mujoco-3396).
// Tells the same story as that figure on teerthsharma.github.io, in 3D.
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { place, near }.

import Placeholder from "./Placeholder";

export default function Units({ place }) {
  return <Placeholder place={place} />;
}
