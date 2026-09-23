"use client";

// Sculpture for the "arena" figure: google/XNNPACK #10801 (place id pr-xnnpack-10801).
// Tells the same story as that figure on teerthsharma.github.io, in 3D.
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { place, near }.

import Placeholder from "./Placeholder";

export default function Arena({ place }) {
  return <Placeholder place={place} />;
}
