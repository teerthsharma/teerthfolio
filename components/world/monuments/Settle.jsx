"use client";

// Sculpture for the "settle" figure: openxla/xla #46539 (place id pr-openxla-46539).
// Tells the same story as that figure on teerthsharma.github.io, in 3D.
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { place, near }.

import Placeholder from "./Placeholder";

export default function Settle({ place }) {
  return <Placeholder place={place} />;
}
