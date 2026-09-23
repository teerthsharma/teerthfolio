"use client";

// Sculpture for the "hull" figure: google-deepmind/mujoco #3450 (place id pr-mujoco-3450).
// Tells the same story as that figure on teerthsharma.github.io, in 3D.
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { place, near }.

import Placeholder from "./Placeholder";

export default function Hull({ place }) {
  return <Placeholder place={place} />;
}
