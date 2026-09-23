"use client";

// Sculpture for the "schedule" figure: triton-lang/kernels #22 (place id pr-triton-kernels-22).
// Tells the same story as that figure on teerthsharma.github.io, in 3D.
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { place, near }.

import Placeholder from "./Placeholder";

export default function Schedule({ place }) {
  return <Placeholder place={place} />;
}
